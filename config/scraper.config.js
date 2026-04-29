'use strict';

module.exports = {
  siteName: 'Authorized Product Website',
  baseUrl: 'https://example.com',
  listing: {
    startUrls: [
      'https://example.com/collections/all',
    ],
    maxPages: 10,
    fallbackCategory: '',
    pagination: {
      mode: 'next-link',
      nextPageSelector: 'a[rel="next"]',
      pageParam: 'page',
      startPage: 1,
    },
  },
  selectors: {
    productCard: '.product-card',
    productName: '.product-title',
    productBrand: '.product-brand',
    productPrice: '.price',
    productImage: 'img',
    productImageAttribute: 'src',
    productImageFallbackAttributes: ['data-src', 'data-srcset', 'srcset', 'data-original'],
    productLink: 'a',
    productLinkAttribute: 'href',
    productCategory: '.product-category',
    productAvailability: '.product-availability',
    productDescription: '.product-description',
    productIngredients: '.product-ingredients',
    detail: {
      enabled: true,
      waitForSelector: 'main',
      name: 'h1',
      brand: '[data-brand], .product-brand, .brand-name',
      price: '.price, .product-price',
      image: '.product-gallery img, .product-media img, img',
      imageAttribute: 'src',
      imageFallbackAttributes: ['data-src', 'data-srcset', 'srcset', 'data-original'],
      category: '.breadcrumb .category, .product-category',
      availability: '.availability, .stock-status, .product-availability',
      description: '.product-description, [data-product-description]',
      ingredients: '.ingredients, [data-ingredients]',
    },
  },
  scraper: {
    engine: 'auto',
    timeoutMs: 30000,
    delayMs: 700,
    detailDelayMs: 400,
    autoDetectMinimumProducts: 1,
    respectRobotsTxt: true,
    robotsUserAgent: '*',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  },
  playwright: {
    headless: true,
    waitUntil: 'networkidle',
    waitForSelector: '.product-card',
    postLoadDelayMs: 1200,
    viewport: {
      width: 1440,
      height: 1024,
    },
  },
  output: {
    productsJsonPath: 'data/products.json',
    imageDownloadDir: 'downloads/images',
    imageFilePrefix: 'product',
  },
};
