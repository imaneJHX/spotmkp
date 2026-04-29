'use strict';

module.exports = {
  siteName: 'Zwine',
  baseUrl: 'https://zwine.ma',
  listing: {
    // Start from the public catalog and paginate with ?page=N.
    startUrls: ['/collections/all'],
    maxPages: 120,
    fallbackCategory: '',
    pagination: {
      mode: 'page-param',
      pageParam: 'page',
      startPage: 1,
    },
  },
  selectors: {
    // Zwine uses Shopify + Symmetry product blocks on collection pages.
    productCard: 'product-block.product-block',
    productName: '.product-block__title',
    productPrice: '.price__current',
    productImage: '.product-block__image--primary img',
    productImageAttribute: 'src',
    productImageFallbackAttributes: ['data-src', 'data-srcset', 'srcset'],
    productLink: 'a.product-link',
    productLinkAttribute: 'href',
    productAvailability: '.product-label--sold-out, .product-label--preorder',
    detail: {
      enabled: true,
      description: '.description-content, .product-description, .rte',
      structured: {
        enabled: true,
        // Product detail data exposed in the public HTML.
        productMarker: 'window.SwymProductInfo.product =',
        collectionsMarker: '_SIConfig.product.collections =',
        inventoryQuantityRegex: "_SIConfig\\.product\\.variants\\[\\d+\\]\\['inventory_quantity'\\]\\s*=\\s*(\\d+)",
        ignoreVendorNames: ['Zwine Store'],
        ignoreCollectionHandles: ['all', 'page-1', 'promos', 'nouveautes', 'offres-du-mois'],
        ignoreCollectionTitles: ['Produits', 'Bestsellers', 'Promos', 'Nouveautes', 'Nouveautés', 'Offres du mois'],
      },
    },
  },
  scraper: {
    engine: 'auto',
    timeoutMs: 30000,
    delayMs: 900,
    detailDelayMs: 500,
    autoDetectMinimumProducts: 3,
    respectRobotsTxt: true,
    robotsUserAgent: '*',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    headers: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  },
  playwright: {
    headless: true,
    waitUntil: 'networkidle',
    waitForSelector: 'product-block.product-block',
    postLoadDelayMs: 1200,
    viewport: {
      width: 1440,
      height: 1024,
    },
  },
  output: {
    productsJsonPath: 'data/products.json',
    imageDownloadDir: 'downloads/images',
    imageFilePrefix: 'zwine-product',
    failedPagesLogPath: 'data/zwine-failed-pages.log',
    failedImagesLogPath: 'data/zwine-failed-images.log',
  },
};
