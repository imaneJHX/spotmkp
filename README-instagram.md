# Instagram Media Tooling

## Method Chosen

This implementation uses a hybrid approach:

1. Official Meta/Instagram API first
   This is the cleanest and most maintainable path for long-term use. If you have a valid access token and Instagram user ID, the downloader uses the official API.

2. Public scraping fallback
   If you do not have API credentials yet, the downloader can fall back to a lightweight scraper that only reads public, visible content from the profile page and post pages. This fallback is intentionally limited and may break if Instagram changes its public markup.

Why this choice:

- The official API is the preferred solution for production-style workflows.
- A local public fallback is still useful for one-off exports when the content is public and you own it or have explicit permission.
- The script does not try to access private content, bypass authentication, or defeat protections.

## Files

The tooling writes to the structure below:

```text
spotmkp/
  scripts/
    download-instagram-media.js
    transform-media-for-site.js
  downloads/
    images/
    videos/
    thumbnails/
  data/
    media.json
    site-media.json
```

## Dependencies

Installed from the root `package.json`:

- `puppeteer`
- `dotenv`

Node.js 18+ is required.

## Installation

From PowerShell in VS Code:

```powershell
cd c:\Users\imane\Desktop\spotmkp
npm install
```

## Commands

Simple local version, public scraping fallback:

```powershell
npm run ig:download:simple
npm run ig:transform
```

Official API version, preferred when credentials are available:

```powershell
$env:INSTAGRAM_ACCESS_TOKEN="YOUR_LONG_LIVED_ACCESS_TOKEN"
$env:INSTAGRAM_USER_ID="YOUR_INSTAGRAM_USER_ID"
$env:INSTAGRAM_PROFILE_URL="https://www.instagram.com/_beauty_spot_____/"
npm run ig:download:api
npm run ig:transform
```

Automatic mode:

- If `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` are present, the downloader uses the API.
- Otherwise, it uses the public scraper.

```powershell
npm run ig:download
npm run ig:transform
```

One-command sync:

```powershell
npm run ig:sync
```

## Exact Direct Script Commands

Simple version:

```powershell
node scripts/download-instagram-media.js --mode scrape --username _beauty_spot_____
node scripts/transform-media-for-site.js
```

More robust version with the official API:

```powershell
node scripts/download-instagram-media.js --mode api --limit 30
node scripts/transform-media-for-site.js
```

## Downloader Output

`data/media.json` contains one record per downloaded media file. For carousel posts, each slide becomes its own record while keeping `postType: "carousel"` and `carouselIndex`.

Example:

```json
[
  {
    "id": "1234567890",
    "postId": "1234567890",
    "type": "image",
    "postType": "image",
    "caption": "Hydrating skincare routine",
    "localPath": "downloads/images/beautyspot-001.jpg",
    "sourceUrl": "https://...",
    "thumbnail": null,
    "permalink": "https://www.instagram.com/p/ABC123/",
    "carouselIndex": null,
    "carouselSize": null,
    "timestamp": "2026-04-19T19:00:00+0000"
  }
]
```

## Frontend Transform Output

`data/site-media.json` adds:

- `title`
- `category`
- `featured`
- `alt`
- `order`

Automatic categories:

- `skincare`
- `makeup`
- `fragrance`
- `promo`
- `store`

The classification is keyword-based and easy to adjust in `scripts/transform-media-for-site.js`.

## Useful Options

```powershell
node scripts/download-instagram-media.js --help
```

Available options:

- `--mode auto|api|scrape`
- `--username <instagram_username>`
- `--profile-url <full_profile_url>`
- `--limit <number_of_posts>`
- `--prefix <file_prefix>`
- `--headful`
- `--scroll-passes <number>`
- `--wait-ms <number>`

## Notes and Limitations

- Only use this with public content you own or have explicit permission to reuse.
- The official API path is more stable and maintainable.
- The scraping fallback is intentionally conservative and limited to public, visible content.
- Instagram can change its public HTML at any time, which can break scraper mode.
