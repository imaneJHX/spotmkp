Brand logo overrides live in this folder.

Recommended naming:
- `olaplex.svg`
- `gucci.png`
- `givenchy.webp`

The app checks `public/brands/<brand-id>.(svg|png|webp|jpg|jpeg)` first.
If no local file exists, the brand card can fall back to Brandfetch hotlinked
logos when `VITE_BRANDFETCH_CLIENT_ID` is configured.

Note:
- Do not store third-party logos locally unless you are allowed to do so.
- Brandfetch's public Logo API is intended for hotlinking rather than forced
  local caching.
