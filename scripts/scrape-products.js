#!/usr/bin/env node
'use strict';

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
  sleep,
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

  const attributeList = [preferredAttribute, ...(fallbackAttributes || [])].filter(Boolean);
  for (const attribute of attributeList) {
    const raw = normalizeWhitespace(element.attr(attribute));
    if (!raw) {
      continue;
    }

    if (attribute.toLowerCase().includes('srcset')) {
      return raw.split(',')[0].trim().split(' ')[0];
    }

    return raw;
  }

  return '';
}

function createProductRecord(fields) {
  return {
    name: fields.name || '',
    brand: fields.brand || null,
    price: fields.price || '',
    priceValue: fields.priceValue ?? null,
    currency: fields.currency || '',
    image: fields.image || '',
    localImage: fields.localImage || null,
    productUrl: fields.productUrl || '',
    category: fields.category || null,
    availability: fields.availability || null,
    description: fields.description || null,
    ingredients: fields.ingredients || null,
  };
}

function parseProductCard($card, pageUrl, config) {
  const selectors = config.selectors || {};
  const name = pickFirstValue([
    extractText($card, selectors.productName),
    normalizeWhitespace($card.find(selectors.productImage || '').first().attr('alt')),
    normalizeWhitespace($card.find(selectors.productLink || '').first().attr('title')),
  ]);
  const brand = extractText($card, selectors.productBrand);
  const priceDetails = parsePrice(extractText($card, selectors.productPrice));
  const rawImage = extractAttribute(
    $card,
    selectors.productImage,
    selectors.productImageAttribute || 'src',
    selectors.productImageFallbackAttributes || ['data-src', 'data-srcset', 'srcset', 'data-original']
  );
  const rawUrl = extractAttribute(
    $card,
    selectors.productLink,
    selectors.productLinkAttribute || 'href',
    []
  );
  const category = pickFirstValue([
    extractText($card, selectors.productCategory),
    config.listing.fallbackCategory,
  ]);
  const availability = extractText($card, selectors.productAvailability);
  const description = extractText($card, selectors.productDescription);
  const ingredients = extractText($card, selectors.productIngredients);

  return createProductRecord({
    name,
    brand,
    price: priceDetails.price,
    priceValue: priceDetails.priceValue,
    currency: priceDetails.currency,
    image: resolveUrl(pageUrl, rawImage),
    productUrl: resolveUrl(pageUrl, rawUrl),
    category,
    availability,
    description,
    ingredients,
  });
}

function parseListingPage(html, pageUrl, config) {
  const $ = cheerio.load(html);
  const products = [];
  const productCardSelector = config.selectors.productCard;

  $(productCardSelector).each((_, element) => {
    const product = parseProductCard($(element), pageUrl, config);

    if (!product.name && !product.productUrl && !product.image) {
      return;
    }

    products.push(product);
  });

  return {
    products,
    nextPageUrl: getNextPageUrl($, pageUrl, config),
  };
}

function parseDetailPage(html, pageUrl, config) {
  const $ = cheerio.load(html);
  const detailSelectors = (config.selectors && config.selectors.detail) || {};
  const priceDetails = parsePrice(extractText($.root(), detailSelectors.price));

  const rawImage = extractAttribute(
    $.root(),
    detailSelectors.image,
    detailSelectors.imageAttribute || config.selectors.productImageAttribute || 'src',
    detailSelectors.imageFallbackAttributes ||
      config.selectors.productImageFallbackAttributes ||
      ['data-src', 'data-srcset', 'srcset', 'data-original']
  );

  return createProductRecord({
    name: extractText($.root(), detailSelectors.name),
    brand: extractText($.root(), detailSelectors.brand),
    price: priceDetails.price,
    priceValue: priceDetails.priceValue,
    currency: priceDetails.currency,
    image: resolveUrl(pageUrl, rawImage),
    productUrl: pageUrl,
    category: extractText($.root(), detailSelectors.category),
    availability: extractText($.root(), detailSelectors.availability),
    description: extractText($.root(), detailSelectors.description),
    ingredients: extractText($.root(), detailSelectors.ingredients),
  });
}

function mergeProductData(baseProduct, detailProduct) {
  const mergedPrice = detailProduct.price || baseProduct.price;
  const parsedDetailPrice = parsePrice(mergedPrice);

  return createProductRecord({
    ...baseProduct,
    ...detailProduct,
    name: detailProduct.name || baseProduct.name,
    brand: detailProduct.brand || baseProduct.brand,
    price: mergedPrice,
    priceValue: detailProduct.priceValue ?? baseProduct.priceValue ?? parsedDetailPrice.priceValue,
    currency: detailProduct.currency || baseProduct.currency || parsedDetailPrice.currency,
    image: detailProduct.image || baseProduct.image,
    productUrl: detailProduct.productUrl || baseProduct.productUrl,
    category: detailProduct.category || baseProduct.category,
    availability: detailProduct.availability || baseProduct.availability,
    description: detailProduct.description || baseProduct.description,
    ingredients: detailProduct.ingredients || baseProduct.ingredients,
    localImage: baseProduct.localImage || null,
  });
}

function getNextPageUrl($, pageUrl, config) {
  const pagination = config.listing.pagination || {};
  const mode = pagination.mode || 'none';

  if (mode === 'next-link') {
    const href = normalizeWhitespace($(pagination.nextPageSelector || '').first().attr('href'));
    return href ? resolveUrl(pageUrl, href) : '';
  }

  return '';
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

async function fetchRenderedHtml(page, url, config, waitForSelectorOverride) {
  await page.goto(url, {
    waitUntil: config.playwright.waitUntil || 'networkidle',
    timeout: config.scraper.timeoutMs,
  });

  const waitForSelector = waitForSelectorOverride || config.playwright.waitForSelector;
  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, {
        timeout: config.scraper.timeoutMs,
      });
    } catch (error) {
      logWarn(`Playwright waitForSelector timed out on ${url}. Continuing with current DOM.`);
    }
  }

  if (config.playwright.postLoadDelayMs) {
    await page.waitForTimeout(config.playwright.postLoadDelayMs);
  }

  return page.content();
}

async function detectEngine(config) {
  const configuredEngine = String(config.scraper.engine || 'auto').toLowerCase();
  if (configuredEngine === 'static' || configuredEngine === 'playwright') {
    return configuredEngine;
  }

  const firstUrl = resolveUrl(config.baseUrl, config.listing.startUrls[0]);
  logInfo(`Detecting best scraping engine from ${firstUrl}`);

  try {
    const html = await fetchStaticHtml(firstUrl, config);
    const parsed = parseListingPage(html, firstUrl, config);
    const usableProducts = parsed.products.filter((product) => product.name || product.productUrl || product.image);

    if (usableProducts.length >= (config.scraper.autoDetectMinimumProducts || 1)) {
      logOk(`Static scraping looks sufficient (${usableProducts.length} product card(s) detected).`);
      return 'static';
    }
  } catch (error) {
    logWarn(`Static detection failed: ${error.message}`);
  }

  logWarn('Static scraping did not return enough products. Falling back to Playwright.');
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

function getInitialQueue(config) {
  const pagination = config.listing.pagination || {};
  const startPage = pagination.startPage || 1;

  return (config.listing.startUrls || []).map((startUrl) => ({
    url: resolveUrl(config.baseUrl, startUrl),
    pageNumber: startPage,
  }));
}

function getPageParamUrl(currentUrl, config, nextPageNumber) {
  const pageUrl = new URL(currentUrl);
  const pageParam = (config.listing.pagination && config.listing.pagination.pageParam) || 'page';
  pageUrl.searchParams.set(pageParam, String(nextPageNumber));
  return pageUrl.toString();
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

  const robotsUserAgent = config.scraper.robotsUserAgent || '*';
  const allowed = isUrlAllowedByRobots(robotsTxt, targetUrl, robotsUserAgent);
  if (!allowed) {
    throw new Error(`Blocked by robots.txt for ${targetUrl}`);
  }
}

async function fetchHtmlWithEngine(engine, resources, url, config, waitForSelectorOverride) {
  assertRobotsAllowed(resources.robotsTxt, url, config);

  if (engine === 'static') {
    return fetchStaticHtml(url, config);
  }

  return fetchRenderedHtml(resources.page, url, config, waitForSelectorOverride);
}

async function enrichProductsWithDetails(products, engine, resources, config) {
  const detailSelectors = (config.selectors && config.selectors.detail) || {};
  if (!detailSelectors.enabled) {
    return products;
  }

  const enriched = [];
  const detailWaitSelector = detailSelectors.waitForSelector || detailSelectors.name || detailSelectors.description || null;

  for (const product of products) {
    if (!product.productUrl) {
      enriched.push(product);
      continue;
    }

    try {
      logInfo(`Scraping product detail: ${product.productUrl}`);
      const html = await fetchHtmlWithEngine(engine, resources, product.productUrl, config, detailWaitSelector);
      const detailProduct = parseDetailPage(html, product.productUrl, config);
      enriched.push(mergeProductData(product, detailProduct));
    } catch (error) {
      logWarn(`Detail page scrape failed for ${product.productUrl}: ${error.message}`);
      enriched.push(product);
    }

    if (config.scraper.detailDelayMs) {
      await sleep(config.scraper.detailDelayMs);
    }
  }

  return enriched;
}

async function main() {
  const configArgIndex = process.argv.indexOf('--config');
  const configPathArg = configArgIndex !== -1 ? process.argv[configArgIndex + 1] : undefined;
  const { configPath, config } = loadConfig(configPathArg);
  const productsJsonPath = path.resolve(process.cwd(), config.output.productsJsonPath);
  const existingProducts = await readJsonArray(productsJsonPath);

  logInfo(`Loaded config: ${configPath}`);
  logInfo(`Site name: ${config.siteName}`);

  const robotsTxt = await loadRobotsTxt(config);
  const engine = await detectEngine(config);
  const queue = getInitialQueue(config);
  const visitedPages = new Set();
  const dedupeMap = new Map();
  const paginationMode = (config.listing.pagination && config.listing.pagination.mode) || 'none';
  const maxPages = config.listing.maxPages || 1;

  const resources = {
    robotsTxt,
    browser: null,
    page: null,
  };

  let processedPages = 0;

  try {
    if (engine === 'playwright') {
      resources.browser = await chromium.launch({ headless: config.playwright.headless !== false });
      resources.page = await resources.browser.newPage({
        userAgent: config.scraper.userAgent,
        viewport: config.playwright.viewport,
      });
      await resources.page.setExtraHTTPHeaders(config.scraper.headers || {});
    }

    while (queue.length > 0 && processedPages < maxPages) {
      const current = queue.shift();
      if (!current || visitedPages.has(current.url)) {
        continue;
      }

      visitedPages.add(current.url);
      processedPages += 1;
      logInfo(`Scraping listing page ${processedPages}/${maxPages}: ${current.url}`);

      let html;
      try {
        html = await fetchHtmlWithEngine(engine, resources, current.url, config);
      } catch (error) {
        logWarn(`Skipping page ${current.url}: ${error.message}`);
        continue;
      }

      const parsed = parseListingPage(html, current.url, config);
      const detailReadyProducts = await enrichProductsWithDetails(parsed.products, engine, resources, config);

      for (const product of detailReadyProducts) {
        const key = buildProductKey(product);
        if (!dedupeMap.has(key)) {
          dedupeMap.set(key, product);
        }
      }

      logInfo(`Collected ${detailReadyProducts.length} product(s) from this listing page.`);

      if (paginationMode === 'next-link' && parsed.nextPageUrl && !visitedPages.has(parsed.nextPageUrl)) {
        queue.push({
          url: parsed.nextPageUrl,
          pageNumber: current.pageNumber + 1,
        });
      }

      if (paginationMode === 'page-param' && current.pageNumber < maxPages && detailReadyProducts.length > 0) {
        const nextPageUrl = getPageParamUrl(current.url, config, current.pageNumber + 1);
        if (!visitedPages.has(nextPageUrl)) {
          queue.push({
            url: nextPageUrl,
            pageNumber: current.pageNumber + 1,
          });
        }
      }

      if (config.scraper.delayMs) {
        await sleep(config.scraper.delayMs);
      }
    }
  } finally {
    if (resources.browser) {
      await resources.browser.close();
    }
  }

  const scrapedProducts = Array.from(dedupeMap.values());
  const mergedProducts = mergeWithExistingProducts(scrapedProducts, existingProducts);

  await ensureDirectory(path.dirname(productsJsonPath));
  await writeJson(productsJsonPath, mergedProducts);

  logOk(`Saved ${mergedProducts.length} unique product(s) to ${productsJsonPath}`);
}

main().catch((error) => {
  logError(error.stack || error.message || String(error));
  process.exitCode = 1;
});
