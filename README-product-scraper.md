# Product Scraper

This toolkit scrapes public product catalog pages that you are authorized to scrape.

It supports:

- static scraping with `axios + cheerio`
- automatic fallback to `Playwright` for JavaScript-rendered pages
- pagination
- duplicate protection
- image downloading
- configurable selectors

## Files

```text
scripts/
  scrape-products.js
  download-images.js
  lib/
    product-scraper-utils.js
config/
  scraper.config.js
data/
  products.json
downloads/
  images/
```

## Installation

From the project root:

```powershell
cd c:\Users\imane\Desktop\spotmkp
npm install
```

If the website requires JavaScript rendering and Playwright has no browser installed yet:

```powershell
npx playwright install chromium
```

## Run

Scrape product data:

```powershell
npm run scrape:products
```

Download product images:

```powershell
npm run scrape:products:images
```

Do both:

```powershell
npm run scrape:products:all
```

## Customize For Another Website

Edit:

- `baseUrl`
- `listing.startUrls`
- `listing.maxPages`
- `listing.pagination`
- `selectors.productCard`
- `selectors.productName`
- `selectors.productBrand`
- `selectors.productPrice`
- `selectors.productImage`
- `selectors.productLink`
- `selectors.productCategory`
- `selectors.productAvailability`
- `selectors.productDescription`
- `selectors.productIngredients`
- `selectors.detail.*`

Example:

```js
module.exports = {
  baseUrl: 'https://shop.example.com',
  listing: {
    startUrls: ['https://shop.example.com/collections/skincare'],
    maxPages: 8,
    pagination: {
      mode: 'next-link',
      nextPageSelector: 'a.pagination__next',
    },
  },
  selectors: {
    productCard: '.product-card',
    productName: '.product-card__title',
    productBrand: '.product-card__brand',
    productPrice: '.product-card__price',
    productImage: '.product-card img',
    productLink: '.product-card a',
    productCategory: '.product-card__category',
    productAvailability: '.product-card__availability',
    detail: {
      enabled: true,
      name: 'h1',
      brand: '.brand-name',
      description: '.product-description',
      ingredients: '.ingredients',
    },
  },
};
```

## Pagination Modes

### `next-link`

Use when the listing has a visible next page link:

```js
pagination: {
  mode: 'next-link',
  nextPageSelector: 'a[rel="next"]',
}
```

### `page-param`

Use when the listing changes with a query parameter like `?page=2`:

```js
pagination: {
  mode: 'page-param',
  pageParam: 'page',
  startPage: 1,
}
```

## Output Shape

`data/products.json`:

```json
[
  {
    "name": "Product name",
    "brand": "Brand name",
    "price": "299 MAD",
    "priceValue": 299,
    "currency": "MAD",
    "image": "https://example.com/image.jpg",
    "localImage": "downloads/images/product-001.jpg",
    "productUrl": "https://example.com/product/slug",
    "category": "Skincare",
    "availability": "In stock",
    "description": "Product description",
    "ingredients": "Ingredient list"
  }
]
```

## Notes

- Only scrape public pages you are allowed to access.
- Do not use this against private, authenticated, or protected content.
- If static scraping finds no usable products, the scraper automatically retries with Playwright.
- The scraper checks `robots.txt` before crawling when `respectRobotsTxt` is enabled.
