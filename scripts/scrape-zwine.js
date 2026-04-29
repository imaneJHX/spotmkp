#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const {
  buildProductKey,
  ensureDirectory,
  isUrlAllowedByRobots,
  loadConfig,
  logError,
  logInfo,
  logOk,
  logWarn,
  normalizeWhitespace,
  parsePrice,
  pickFirstValue,
  readJsonArray,
  resolveUrl,
  slugify,
  sleep,
  stripHtml,
  writeJson,
} = require('./lib/product-scraper-utils');

function getHeaders(config) {
  return {
    'User-Agent': config.scraper.userAgent,
    ...config.scraper.headers,
  };
}

function extractText($root, selector) {
  if (!selector) {
    return '';
  }

  return normalizeWhitespace($root.find(selector).first().text());
}

function extractAttribute($root, selector, preferredAttribute, fallbackAttributes) {
  if (!selector) {
    return '';
  }

  const element = $root.find(selector).first();
  if (!element.length) {
    return '';
  }

  const attributes = [preferredAttribute, ...(fallbackAttributes || [])].filter(Boolean);
  for (const attribute of attributes) {
    const rawValue = normalizeWhitespace(element.attr(attribute));
    if (!rawValue) {
      continue;
    }

    if (attribute.toLowerCase().includes('srcset')) {
      return normalizeWhitespace(rawValue.split(',')[0].split(' ')[0]);
    }

    return rawValue;
  }

  return '';
}

function createProductRecord(fields) {
  const imageUrl = normalizeWhitespace(fields.imageUrl || fields.image);
  const productUrl = normalizeWhitespace(fields.productUrl || fields.url);
  const name = normalizeWhitespace(fields.name);

  return {
    slug: fields.slug || slugify(name || productUrl),
    name,
    brand: normalizeWhitespace(fields.brand) || null,
    price: normalizeWhitespace(fields.price),
    priceValue: fields.priceValue ?? null,
    currency: normalizeWhitespace(fields.currency) || '',
    productUrl,
    imageUrl,
    image: imageUrl,
    localImage: fields.localImage || null,
    availability: normalizeWhitespace(fields.availability) || null,
    category: normalizeWhitespace(fields.category) || null,
    description: normalizeWhitespace(fields.description) || null,
    ingredients: normalizeWhitespace(fields.ingredients) || null,
  };
}

function formatMadPrice(priceValue) {
  if (!Number.isFinite(priceValue)) {
    return '';
  }

  return `${priceValue.toFixed(2)} dh`;
}

function deriveBrand(name, vendor, config) {
  const ignoredVendorNames = new Set(
    (((config.selectors || {}).detail || {}).structured || {}).ignoreVendorNames?.map((value) =>
      normalizeWhitespace(value).toLowerCase()
    ) || []
  );
  const normalizedVendor = normalizeWhitespace(vendor);
  if (normalizedVendor && !ignoredVendorNames.has(normalizedVendor.toLowerCase())) {
    return normalizedVendor;
  }

  const normalizedName = normalizeWhitespace(name);
  const separatorMatch = normalizedName.match(/^(.+?)\s[-–—]\s+/);
  if (separatorMatch) {
    return normalizeWhitespace(separatorMatch[1]);
  }

  const firstWord = normalizedName.split(/\s+/)[0];
  return normalizeWhitespace(firstWord) || null;
}

function pickCategoryFromCollections(collections, brand, config) {
  const structuredConfig = (((config.selectors || {}).detail || {}).structured || {});
  const ignoredHandles = new Set((structuredConfig.ignoreCollectionHandles || []).map((value) => normalizeWhitespace(value).toLowerCase()));
  const ignoredTitles = new Set((structuredConfig.ignoreCollectionTitles || []).map((value) => normalizeWhitespace(value).toLowerCase()));
  const brandSlug = slugify(brand || '');

  for (const collection of collections || []) {
    const title = normalizeWhitespace(collection && collection.title);
    const normalizedTitle = title.toLowerCase();
    const handle = normalizeWhitespace(collection && collection.handle).toLowerCase();
    if (!title) {
      continue;
    }

    if (ignoredHandles.has(handle) || ignoredTitles.has(normalizedTitle)) {
      continue;
    }

    if (brandSlug && slugify(title) === brandSlug) {
      continue;
    }

    return title;
  }

  return normalizeWhitespace(config.listing.fallbackCategory) || null;
}

function extractBalancedJsonAfterMarker(content, marker, openingCharacter, closingCharacter) {
  // Zwine exposes Shopify product data directly inside public inline scripts.
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  const startIndex = content.indexOf(openingCharacter, markerIndex + marker.length);
  if (startIndex === -1) {
    return '';
  }

  let depth = 0;
  let inString = false;
  let activeQuote = '';
  let escaping = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const character = content[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (inString) {
      if (character === '\\') {
        escaping = true;
      } else if (character === activeQuote) {
        inString = false;
        activeQuote = '';
      }
      continue;
    }

    if (character === '"' || character === "'") {
      inString = true;
      activeQuote = character;
      continue;
    }

    if (character === openingCharacter) {
      depth += 1;
    } else if (character === closingCharacter) {
      depth -= 1;
      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return '';
}

function parseJsonFragment(fragment) {
  if (!fragment) {
    return null;
  }

  try {
    return JSON.parse(fragment);
  } catch (error) {
    return null;
  }
}

function extractMetaContent($, selector) {
  return normalizeWhitespace($(selector).first().attr('content'));
}

function extractAvailabilityFromHtml(html) {
  const $ = cheerio.load(String(html || ''));
  $('script, style, noscript').remove();
  const pageText = normalizeWhitespace($.root().text());

  if (/Plus de stock bientôt disponible/i.test(pageText)) {
    return 'Plus de stock bientôt disponible';
  }

  if (/Indisponible|Épuisé|Epuise/i.test(pageText)) {
    return 'Indisponible';
  }

  if (/En stock/i.test(pageText)) {
    return 'En stock';
  }

  return '';
}

function extractIngredientsFromHtml($) {
  const candidateSelectors = [
    '[class*="ingredient"]',
    '[id*="ingredient"]',
    'details',
    '.accordion',
    '.cc-accordion',
    '.rte',
  ];

  for (const selector of candidateSelectors) {
    const matches = $(selector).toArray();
    for (const element of matches) {
      const text = normalizeWhitespace($(element).text());
      if (!/ingr[ée]dients?/i.test(text)) {
        continue;
      }

      const cleaned = normalizeWhitespace(
        text
          .replace(/^.*?ingr[ée]dients?\s*:?\s*/i, '')
          .replace(/Customer Reviews[\s\S]*$/i, '')
          .replace(/Avis Clients[\s\S]*$/i, '')
      );

      if (cleaned) {
        return cleaned;
      }
    }
  }

  return '';
}

function parseListingCard($card, pageUrl, config) {
  const selectors = config.selectors || {};
  const rawImage = extractAttribute(
    $card,
    selectors.productImage,
    selectors.productImageAttribute || 'src',
    selectors.productImageFallbackAttributes || ['data-src', 'data-srcset', 'srcset']
  );
  const rawUrl = extractAttribute($card, selectors.productLink, selectors.productLinkAttribute || 'href', []);
  const rawPrice = extractText($card, selectors.productPrice);
  const priceDetails = parsePrice(rawPrice);

  return createProductRecord({
    name: pickFirstValue([
      extractText($card, selectors.productName),
      normalizeWhitespace($card.find(selectors.productImage || '').first().attr('alt')),
      normalizeWhitespace($card.find(selectors.productLink || '').first().attr('title')),
    ]),
    brand: extractText($card, selectors.productBrand),
    price: priceDetails.price,
    priceValue: priceDetails.priceValue,
    currency: priceDetails.currency || 'MAD',
    imageUrl: resolveUrl(pageUrl, rawImage),
    productUrl: resolveUrl(pageUrl, rawUrl),
    availability: extractText($card, selectors.productAvailability),
    category: extractText($card, selectors.productCategory),
  });
}

function parseListingPage(html, pageUrl, config) {
  const $ = cheerio.load(html);
  const products = [];

  $(config.selectors.productCard).each((_, element) => {
    const product = parseListingCard($(element), pageUrl, config);
    if (!product.productUrl && !product.name) {
      return;
    }

    products.push(product);
  });

  return products;
}

function buildDetailProductFromStructuredData(html, pageUrl, config) {
  const detailConfig = (((config.selectors || {}).detail || {}).structured || {});
  if (!detailConfig.enabled) {
    return createProductRecord({});
  }

  const $ = cheerio.load(html);
  const productJson = parseJsonFragment(
    extractBalancedJsonAfterMarker(html, detailConfig.productMarker, '{', '}')
  );
  const collections = parseJsonFragment(
    extractBalancedJsonAfterMarker(html, detailConfig.collectionsMarker, '[', ']')
  ) || [];

  if (!productJson || typeof productJson !== 'object') {
    return createProductRecord({});
  }

  const inventoryRegex = detailConfig.inventoryQuantityRegex
    ? new RegExp(detailConfig.inventoryQuantityRegex, 'i')
    : null;
  const inventoryMatch = inventoryRegex ? html.match(inventoryRegex) : null;
  const inventoryQuantity = inventoryMatch ? Number.parseInt(inventoryMatch[1], 10) : null;
  const priceValue = Number.isFinite(productJson.price) ? Number(productJson.price) / 100 : null;
  const brand = deriveBrand(productJson.title, productJson.vendor, config);
  const description = pickFirstValue([
    stripHtml(productJson.content),
    extractText($.root(), config.selectors.detail.description),
    extractMetaContent($, 'meta[name="description"]'),
    extractMetaContent($, 'meta[property="og:description"]'),
  ]);
  const imageUrl = resolveUrl(
    pageUrl,
    productJson.featured_image ||
      (Array.isArray(productJson.images) ? productJson.images[0] : '') ||
      (Array.isArray(productJson.media) && productJson.media[0] ? productJson.media[0].src : '')
  );

  let availability = extractAvailabilityFromHtml(html);
  if (!availability) {
    if (productJson.available === false || inventoryQuantity === 0) {
      availability = 'Indisponible';
    } else if (productJson.available === true || (Number.isFinite(inventoryQuantity) && inventoryQuantity > 0)) {
      availability = 'En stock';
    }
  }

  return createProductRecord({
    slug: productJson.handle || slugify(productJson.title || pageUrl),
    name: productJson.title,
    brand,
    price: formatMadPrice(priceValue),
    priceValue,
    currency: 'MAD',
    productUrl: pageUrl,
    imageUrl,
    availability,
    category: pickCategoryFromCollections(collections, brand, config),
    description,
    ingredients: extractIngredientsFromHtml($),
  });
}

function mergeProductData(baseProduct, detailProduct) {
  return createProductRecord({
    slug: detailProduct.slug || baseProduct.slug,
    name: detailProduct.name || baseProduct.name,
    brand: detailProduct.brand || baseProduct.brand,
    price: detailProduct.price || baseProduct.price,
    priceValue: detailProduct.priceValue ?? baseProduct.priceValue,
    currency: detailProduct.currency || baseProduct.currency,
    productUrl: detailProduct.productUrl || baseProduct.productUrl,
    imageUrl: detailProduct.imageUrl || detailProduct.image || baseProduct.imageUrl || baseProduct.image,
    localImage: baseProduct.localImage || detailProduct.localImage || null,
    availability: detailProduct.availability || baseProduct.availability,
    category: detailProduct.category || baseProduct.category,
    description: detailProduct.description || baseProduct.description,
    ingredients: detailProduct.ingredients || baseProduct.ingredients,
  });
}

async function fetchStaticHtml(url, config) {
  const response = await axios.get(url, {
    headers: getHeaders(config),
    timeout: config.scraper.timeoutMs,
    responseType: 'text',
    maxRedirects: 5,
  });

  return response.data;
}

async function fetchRenderedHtml(page, url, config) {
  await page.goto(url, {
    waitUntil: config.playwright.waitUntil || 'networkidle',
    timeout: config.scraper.timeoutMs,
  });

  if (config.playwright.waitForSelector) {
    try {
      await page.waitForSelector(config.playwright.waitForSelector, {
        timeout: config.scraper.timeoutMs,
      });
    } catch (error) {
      logWarn(`Playwright waitForSelector timed out on ${url}. Continuing with the current DOM.`);
    }
  }

  if (config.playwright.postLoadDelayMs) {
    await page.waitForTimeout(config.playwright.postLoadDelayMs);
  }

  return page.content();
}

async function loadRobotsTxt(config) {
  if (config.scraper.respectRobotsTxt === false) {
    return '';
  }

  const robotsUrl = resolveUrl(config.baseUrl, '/robots.txt');
  logInfo(`Checking robots.txt: ${robotsUrl}`);

  try {
    const response = await axios.get(robotsUrl, {
      headers: getHeaders(config),
      timeout: config.scraper.timeoutMs,
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      logWarn(`robots.txt returned status ${response.status}. Proceeding cautiously.`);
      return '';
    }

    return String(response.data || '');
  } catch (error) {
    logWarn(`robots.txt check failed: ${error.message}`);
    return '';
  }
}

function assertRobotsAllowed(robotsTxt, targetUrl, config) {
  if (config.scraper.respectRobotsTxt === false) {
    return;
  }

  const allowed = isUrlAllowedByRobots(robotsTxt, targetUrl, config.scraper.robotsUserAgent || '*');
  if (!allowed) {
    throw new Error(`Blocked by robots.txt for ${targetUrl}`);
  }
}

async function detectEngine(config) {
  if (String(config.scraper.engine || 'auto').toLowerCase() !== 'auto') {
    return String(config.scraper.engine).toLowerCase();
  }

  const firstUrl = resolveUrl(config.baseUrl, config.listing.startUrls[0]);
  logInfo(`Detecting the best scraping engine from ${firstUrl}`);

  try {
    const html = await fetchStaticHtml(firstUrl, config);
    const detectedProducts = parseListingPage(html, firstUrl, config);
    if (detectedProducts.length >= (config.scraper.autoDetectMinimumProducts || 1)) {
      logOk(`Static scraping looks sufficient (${detectedProducts.length} product card(s) detected).`);
      return 'static';
    }
  } catch (error) {
    logWarn(`Static detection failed: ${error.message}`);
  }

  logWarn('Static HTML did not expose enough product cards. Falling back to Playwright.');
  return 'playwright';
}

function mergeWithExistingProducts(scrapedProducts, existingProducts) {
  const existingMap = new Map(existingProducts.map((product) => [buildProductKey(product), product]));

  return scrapedProducts.map((product) => {
    const existing = existingMap.get(buildProductKey(product));
    if (!existing) {
      return product;
    }

    return {
      ...product,
      localImage: existing.localImage || product.localImage || null,
    };
  });
}

async function appendFailureLog(logPath, type, targetUrl, message) {
  if (!logPath) {
    return;
  }

  await ensureDirectory(path.dirname(logPath));
  const line = `[${new Date().toISOString()}] ${type} | ${targetUrl} | ${message}\n`;
  await fs.appendFile(logPath, line, 'utf8');
}

async function runScraper(configPathArg) {
  const { configPath, config } = loadConfig(configPathArg);
  const rootDir = process.cwd();
  const productsJsonPath = path.resolve(rootDir, config.output.productsJsonPath);
  const failedPagesLogPath = config.output.failedPagesLogPath
    ? path.resolve(rootDir, config.output.failedPagesLogPath)
    : '';
  const existingProducts = await readJsonArray(productsJsonPath);
  const robotsTxt = await loadRobotsTxt(config);
  const engine = await detectEngine(config);
  const queue = (config.listing.startUrls || []).map((startUrl) => ({
    url: resolveUrl(config.baseUrl, startUrl),
    pageNumber: config.listing.pagination.startPage || 1,
  }));
  const visitedPages = new Set();
  const dedupeMap = new Map();

  logInfo(`Loaded config: ${configPath}`);
  logInfo(`Site name: ${config.siteName}`);
  logInfo(`Using engine: ${engine}`);

  let browser = null;
  let page = null;

  try {
    if (engine === 'playwright') {
      browser = await chromium.launch({ headless: config.playwright.headless !== false });
      page = await browser.newPage({
        userAgent: config.scraper.userAgent,
        viewport: config.playwright.viewport,
      });
      await page.setExtraHTTPHeaders(config.scraper.headers || {});
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visitedPages.has(current.url) || current.pageNumber > config.listing.maxPages) {
        continue;
      }

      visitedPages.add(current.url);
      logInfo(`Scraping listing page ${current.pageNumber}/${config.listing.maxPages}: ${current.url}`);

      let listingHtml = '';
      try {
        assertRobotsAllowed(robotsTxt, current.url, config);
        listingHtml =
          engine === 'playwright'
            ? await fetchRenderedHtml(page, current.url, config)
            : await fetchStaticHtml(current.url, config);
      } catch (error) {
        logWarn(`Skipping listing page ${current.url}: ${error.message}`);
        await appendFailureLog(failedPagesLogPath, 'listing', current.url, error.message);
        continue;
      }

      const listingProducts = parseListingPage(listingHtml, current.url, config);
      if (listingProducts.length === 0) {
        logInfo(`No products found on ${current.url}. Pagination will stop here.`);
        continue;
      }

      let newProductsFromPage = 0;

      for (const listingProduct of listingProducts) {
        let detailProduct = createProductRecord({});

        if (listingProduct.productUrl) {
          try {
            assertRobotsAllowed(robotsTxt, listingProduct.productUrl, config);
            const detailHtml =
              engine === 'playwright'
                ? await fetchRenderedHtml(page, listingProduct.productUrl, config)
                : await fetchStaticHtml(listingProduct.productUrl, config);

            detailProduct = buildDetailProductFromStructuredData(
              detailHtml,
              listingProduct.productUrl,
              config
            );
          } catch (error) {
            logWarn(`Detail page scrape failed for ${listingProduct.productUrl}: ${error.message}`);
            await appendFailureLog(failedPagesLogPath, 'detail', listingProduct.productUrl, error.message);
          }
        }

        const merged = mergeProductData(listingProduct, detailProduct);
        const key = buildProductKey(merged);
        if (!dedupeMap.has(key)) {
          dedupeMap.set(key, merged);
          newProductsFromPage += 1;
        }

        if (config.scraper.detailDelayMs) {
          await sleep(config.scraper.detailDelayMs);
        }
      }

      const nextPageNumber = current.pageNumber + 1;
      if (nextPageNumber <= config.listing.maxPages && newProductsFromPage > 0) {
        const nextPageUrl = new URL(current.url);
        nextPageUrl.searchParams.set(config.listing.pagination.pageParam || 'page', String(nextPageNumber));
        queue.push({
          url: nextPageUrl.toString(),
          pageNumber: nextPageNumber,
        });
      } else if (newProductsFromPage === 0) {
        logInfo(`No new products were found on ${current.url}. Pagination will stop here.`);
      }

      if (config.scraper.delayMs) {
        await sleep(config.scraper.delayMs);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const mergedProducts = mergeWithExistingProducts(Array.from(dedupeMap.values()), existingProducts);
  await ensureDirectory(path.dirname(productsJsonPath));
  await writeJson(productsJsonPath, mergedProducts);

  logOk(`Saved ${mergedProducts.length} unique product(s) to ${productsJsonPath}`);
}

async function main() {
  const configArgIndex = process.argv.indexOf('--config');
  const configPathArg =
    configArgIndex !== -1 ? process.argv[configArgIndex + 1] : 'config/zwine.config.js';
  await runScraper(configPathArg);
}

module.exports = {
  runScraper,
};

if (require.main === module) {
  main().catch((error) => {
    logError(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}
