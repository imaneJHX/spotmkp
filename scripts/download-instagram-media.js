#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

if (typeof fetch !== 'function') {
  throw new Error('Node.js 18+ is required because this script uses the built-in fetch API.');
}

const ROOT_DIR = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const DEFAULT_USERNAME = '_beauty_spot_____';
const DEFAULT_PREFIX = 'beautyspot';
const DEFAULT_LIMIT = 24;
const DEFAULT_SCROLL_PASSES = 8;
const DEFAULT_WAIT_MS = 1500;
const DEFAULT_API_BASE_URL = 'https://graph.facebook.com';
const DEFAULT_GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');
const IMAGES_DIR = path.join(DOWNLOADS_DIR, 'images');
const VIDEOS_DIR = path.join(DOWNLOADS_DIR, 'videos');
const THUMBNAILS_DIR = path.join(DOWNLOADS_DIR, 'thumbnails');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MEDIA_JSON_PATH = path.join(DATA_DIR, 'media.json');

const CATEGORYLESS_MESSAGE =
  'Only use this script for public Instagram content you own or have explicit permission to reuse.';

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function logWarn(message) {
  console.warn(`[WARN] ${message}`);
}

function logError(message) {
  console.error(`[ERROR] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function sanitizePrefix(value) {
  const sanitized = String(value || DEFAULT_PREFIX)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || DEFAULT_PREFIX;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeProfileUrl(profileUrl, username) {
  if (profileUrl) {
    return String(profileUrl).trim().replace(/\/?$/, '/');
  }

  const cleanUsername = String(username || DEFAULT_USERNAME).replace(/^@/, '').trim();
  return `https://www.instagram.com/${cleanUsername}/`;
}

function normalizeSourceKey(sourceUrl) {
  if (!sourceUrl) {
    return '';
  }

  try {
    const parsed = new URL(sourceUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch (error) {
    return sourceUrl;
  }
}

function extractShortcodeFromLink(link) {
  const match = String(link || '').match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBalancedJsonAfterMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  let cursor = markerIndex + marker.length;
  while (cursor < source.length && source[cursor] !== '{') {
    cursor += 1;
  }

  if (source[cursor] !== '{') {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = cursor; index < source.length; index += 1) {
    const character = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(cursor, index + 1);
      }
    }
  }

  return null;
}

function detectExtensionFromUrl(sourceUrl, fallbackExtension) {
  try {
    const parsed = new URL(sourceUrl);
    const extension = path.extname(parsed.pathname).toLowerCase();
    if (extension && extension.length <= 5) {
      return extension;
    }
  } catch (error) {
    const extension = path.extname(String(sourceUrl || '')).toLowerCase();
    if (extension && extension.length <= 5) {
      return extension;
    }
  }

  return fallbackExtension;
}

function getMediaFallbackExtension(type) {
  return type === 'image' ? '.jpg' : '.mp4';
}

function normalizeCaptionFromOgDescription(value) {
  const text = normalizeWhitespace(value);
  if (!text) {
    return '';
  }

  const quotedMatch = text.match(/"([^"]+)"/);
  return quotedMatch ? normalizeWhitespace(quotedMatch[1]) : text;
}

function buildHelpText() {
  return [
    'Instagram Media Downloader',
    '',
    CATEGORYLESS_MESSAGE,
    '',
    'Usage:',
    '  node scripts/download-instagram-media.js [options]',
    '',
    'Options:',
    '  --mode auto|api|scrape     Prefer official API, scraper fallback, or force one mode',
    '  --username <value>         Instagram username (default: _beauty_spot_____ )',
    '  --profile-url <value>      Full profile URL if you do not want username-based URL generation',
    '  --limit <number>           Maximum number of visible posts to inspect',
    '  --prefix <value>           File prefix (default: beautyspot)',
    '  --headful                  Launch Chromium with a visible window for debugging',
    '  --scroll-passes <number>   Scroll count for scraper mode (default: 8)',
    '  --wait-ms <number>         Delay between scraper steps in milliseconds (default: 1500)',
    '  --help                     Show this help',
    '',
    'Environment variables for API mode:',
    '  INSTAGRAM_ACCESS_TOKEN',
    '  INSTAGRAM_USER_ID',
    '  INSTAGRAM_API_BASE_URL      Optional, defaults to https://graph.facebook.com',
    '  INSTAGRAM_GRAPH_VERSION     Optional, defaults to v23.0',
    '',
    'Examples:',
    '  node scripts/download-instagram-media.js --mode scrape --username _beauty_spot_____',
    '  node scripts/download-instagram-media.js --mode api --limit 30',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    mode: process.env.INSTAGRAM_MODE || 'auto',
    username: process.env.INSTAGRAM_USERNAME || DEFAULT_USERNAME,
    profileUrl: process.env.INSTAGRAM_PROFILE_URL || '',
    limit: parsePositiveInteger(process.env.INSTAGRAM_LIMIT, DEFAULT_LIMIT),
    prefix: sanitizePrefix(process.env.INSTAGRAM_FILE_PREFIX || DEFAULT_PREFIX),
    headless: process.env.INSTAGRAM_HEADLESS !== 'false',
    scrollPasses: parsePositiveInteger(process.env.INSTAGRAM_SCROLL_PASSES, DEFAULT_SCROLL_PASSES),
    waitMs: parsePositiveInteger(process.env.INSTAGRAM_WAIT_MS, DEFAULT_WAIT_MS),
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    userId: process.env.INSTAGRAM_USER_ID || '',
    apiBaseUrl: process.env.INSTAGRAM_API_BASE_URL || DEFAULT_API_BASE_URL,
    graphVersion: process.env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--headful') {
      options.headless = false;
      continue;
    }

    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1];
      continue;
    }

    if (arg === '--mode' && next) {
      options.mode = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--username=')) {
      options.username = arg.split('=')[1];
      continue;
    }

    if (arg === '--username' && next) {
      options.username = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--profile-url=')) {
      options.profileUrl = arg.split('=')[1];
      continue;
    }

    if (arg === '--profile-url' && next) {
      options.profileUrl = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInteger(arg.split('=')[1], options.limit);
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = parsePositiveInteger(next, options.limit);
      index += 1;
      continue;
    }

    if (arg.startsWith('--prefix=')) {
      options.prefix = sanitizePrefix(arg.split('=')[1]);
      continue;
    }

    if (arg === '--prefix' && next) {
      options.prefix = sanitizePrefix(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--scroll-passes=')) {
      options.scrollPasses = parsePositiveInteger(arg.split('=')[1], options.scrollPasses);
      continue;
    }

    if (arg === '--scroll-passes' && next) {
      options.scrollPasses = parsePositiveInteger(next, options.scrollPasses);
      index += 1;
      continue;
    }

    if (arg.startsWith('--wait-ms=')) {
      options.waitMs = parsePositiveInteger(arg.split('=')[1], options.waitMs);
      continue;
    }

    if (arg === '--wait-ms' && next) {
      options.waitMs = parsePositiveInteger(next, options.waitMs);
      index += 1;
      continue;
    }
  }

  options.mode = String(options.mode || 'auto').trim().toLowerCase();
  options.username = String(options.username || DEFAULT_USERNAME).replace(/^@/, '').trim() || DEFAULT_USERNAME;
  options.profileUrl = normalizeProfileUrl(options.profileUrl, options.username);

  return options;
}

async function ensureBaseDirectories() {
  await Promise.all([
    fs.mkdir(IMAGES_DIR, { recursive: true }),
    fs.mkdir(VIDEOS_DIR, { recursive: true }),
    fs.mkdir(THUMBNAILS_DIR, { recursive: true }),
    fs.mkdir(DATA_DIR, { recursive: true }),
  ]);
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function findHighestExistingIndex(prefix) {
  const directories = [IMAGES_DIR, VIDEOS_DIR, THUMBNAILS_DIR];
  const prefixPattern = new RegExp(`${escapeRegex(prefix)}-(\\d+)`, 'i');
  let maxIndex = 0;

  for (const directory of directories) {
    let entries = [];

    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const match = entry.name.match(prefixPattern);
      if (!match) {
        continue;
      }

      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxIndex) {
        maxIndex = parsed;
      }
    }
  }

  return maxIndex;
}

async function fetchJson(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...extraHeaders,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details = payload && payload.error ? JSON.stringify(payload.error) : response.statusText;
    throw new Error(`Request failed (${response.status}): ${details}`);
  }

  return payload;
}

async function downloadFile(sourceUrl, destinationPath, referer) {
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: referer || 'https://www.instagram.com/',
      Accept: '*/*',
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${sourceUrl} (${response.status} ${response.statusText})`);
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destinationPath));
}

class InstagramMediaDownloader {
  constructor(options) {
    this.options = options;
    this.mode = this.resolveMode();
    this.browser = null;
    this.existingRecords = [];
    this.knownIds = new Set();
    this.knownSourceKeys = new Set();
    this.nextIndex = 1;
  }

  resolveMode() {
    if (this.options.mode === 'auto') {
      return this.hasApiCredentials() ? 'api' : 'scrape';
    }

    if (!['api', 'scrape'].includes(this.options.mode)) {
      throw new Error(`Unsupported mode "${this.options.mode}". Use auto, api or scrape.`);
    }

    if (this.options.mode === 'api' && !this.hasApiCredentials()) {
      throw new Error('API mode requires INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID.');
    }

    return this.options.mode;
  }

  hasApiCredentials() {
    return Boolean(this.options.accessToken && this.options.userId);
  }

  async initialize() {
    await ensureBaseDirectories();
    this.existingRecords = await readJsonArray(MEDIA_JSON_PATH);

    for (const record of this.existingRecords) {
      if (record.id) {
        this.knownIds.add(record.id);
      }

      if (record.sourceUrl) {
        this.knownSourceKeys.add(normalizeSourceKey(record.sourceUrl));
      }
    }

    const highestExistingIndex = await findHighestExistingIndex(this.options.prefix);
    this.nextIndex = highestExistingIndex + 1;
  }

  buildApiUrl(nextPageUrl) {
    if (nextPageUrl) {
      return nextPageUrl;
    }

    const trimmedBaseUrl = String(this.options.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    const versionedBase = /\/v\d+\.\d+$/i.test(trimmedBaseUrl)
      ? trimmedBaseUrl
      : `${trimmedBaseUrl}/${this.options.graphVersion}`;

    const url = new URL(`${versionedBase}/${this.options.userId}/media`);
    url.searchParams.set(
      'fields',
      [
        'id',
        'caption',
        'media_type',
        'media_product_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'timestamp',
        'children{id,media_type,media_product_type,media_url,thumbnail_url,permalink}',
      ].join(',')
    );
    url.searchParams.set('limit', '25');
    url.searchParams.set('access_token', this.options.accessToken);
    return url.toString();
  }

  normalizeApiPost(post) {
    const caption = normalizeWhitespace(post.caption);
    const timestamp = post.timestamp || null;
    const permalink = post.permalink || null;
    const postId = String(post.id || extractShortcodeFromLink(permalink) || '').trim();
    const isReel = String(post.media_product_type || '').toUpperCase() === 'REELS';

    if (post.media_type === 'CAROUSEL_ALBUM' && Array.isArray(post.children && post.children.data)) {
      return post.children.data
        .map((child, index) => {
          const childType = child.media_type === 'VIDEO' ? 'video' : 'image';
          return {
            id: String(child.id || `${postId}-${index + 1}`),
            postId,
            type: childType,
            postType: 'carousel',
            caption,
            sourceUrl: child.media_url || '',
            thumbnailUrl: child.thumbnail_url || null,
            permalink,
            carouselIndex: index + 1,
            carouselSize: post.children.data.length,
            timestamp,
          };
        })
        .filter((item) => item.sourceUrl);
    }

    return [
      {
        id: postId,
        postId,
        type: isReel ? 'reel' : post.media_type === 'VIDEO' ? 'video' : 'image',
        postType: isReel ? 'reel' : post.media_type === 'VIDEO' ? 'video' : 'image',
        caption,
        sourceUrl: post.media_url || '',
        thumbnailUrl: post.thumbnail_url || null,
        permalink,
        carouselIndex: null,
        carouselSize: null,
        timestamp,
      },
    ].filter((item) => item.sourceUrl);
  }

  async collectPostsViaApi() {
    logInfo('Mode selected: official Meta/Instagram API.');
    let nextPageUrl = this.buildApiUrl();
    let processedPosts = 0;
    const assets = [];

    while (nextPageUrl && processedPosts < this.options.limit) {
      const payload = await fetchJson(nextPageUrl);
      const posts = Array.isArray(payload && payload.data) ? payload.data : [];

      if (posts.length === 0) {
        break;
      }

      const remainingPosts = this.options.limit - processedPosts;
      const pagePosts = posts.slice(0, remainingPosts);

      for (const post of pagePosts) {
        processedPosts += 1;
        assets.push(...this.normalizeApiPost(post));
      }

      nextPageUrl = payload && payload.paging ? payload.paging.next || null : null;
    }

    logInfo(`API inspection finished: ${processedPosts} post(s) inspected, ${assets.length} media asset(s) found.`);
    return assets;
  }

  async createBrowserPage() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
    });
    return page;
  }

  async dismissCookieBanner(page) {
    const labels = [
      'Allow all cookies',
      'Allow essential and optional cookies',
      'Only allow essential cookies',
      'Autoriser tous les cookies',
      'Autoriser uniquement les cookies essentiels',
      'Accepter',
      'Tout autoriser',
    ];

    await page.evaluate((texts) => {
      const elements = Array.from(document.querySelectorAll('button, [role="button"]'));
      const label = texts.find((text) =>
        elements.some((element) => element.textContent && element.textContent.includes(text))
      );

      if (!label) {
        return;
      }

      const target = elements.find((element) => element.textContent && element.textContent.includes(label));
      if (target) {
        target.click();
      }
    }, labels).catch(() => {});
  }

  async collectProfileLinksViaScrape() {
    const page = await this.createBrowserPage();
    logInfo(`Mode selected: public scraping fallback.`);
    logInfo(`Opening profile page: ${this.options.profileUrl}`);

    await page.goto(this.options.profileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await sleep(this.options.waitMs);
    await this.dismissCookieBanner(page);
    await sleep(500);

    const links = new Set();

    for (let pass = 0; pass < this.options.scrollPasses; pass += 1) {
      const discovered = await page.$$eval('a[href]', (anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute('href'))
          .filter(Boolean)
          .filter((href) => /^\/(p|reel)\//.test(href))
      );

      for (const href of discovered) {
        links.add(`https://www.instagram.com${href}`.split('?')[0]);
      }

      if (links.size >= this.options.limit) {
        break;
      }

      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 1.2);
      });
      await sleep(this.options.waitMs);
    }

    await page.close();
    const limitedLinks = Array.from(links).slice(0, this.options.limit);
    logInfo(`Scraper collected ${limitedLinks.length} visible post link(s).`);
    return limitedLinks;
  }

  extractMediaNodeFromHtml(html) {
    const markers = ['"xdt_shortcode_media":', '"shortcode_media":'];

    for (const marker of markers) {
      const jsonText = extractBalancedJsonAfterMarker(html, marker);
      if (!jsonText) {
        continue;
      }

      try {
        return JSON.parse(jsonText);
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  normalizeScrapedMediaNode(node, postUrl) {
    const caption =
      normalizeWhitespace(
        node &&
          node.edge_media_to_caption &&
          Array.isArray(node.edge_media_to_caption.edges) &&
          node.edge_media_to_caption.edges[0] &&
          node.edge_media_to_caption.edges[0].node &&
          node.edge_media_to_caption.edges[0].node.text
      ) || '';

    const postId = String(node.id || extractShortcodeFromLink(postUrl) || '').trim();
    const permalink = node.shortcode
      ? `https://www.instagram.com/${node.product_type === 'clips' ? 'reel' : 'p'}/${node.shortcode}/`
      : postUrl;
    const timestamp = node.taken_at_timestamp
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : null;

    const sidecarEdges =
      node && node.edge_sidecar_to_children && Array.isArray(node.edge_sidecar_to_children.edges)
        ? node.edge_sidecar_to_children.edges
        : [];

    if (sidecarEdges.length > 0) {
      return sidecarEdges
        .map((edge, index) => edge && edge.node)
        .filter(Boolean)
        .map((child, index) => ({
          id: String(child.id || `${postId}-${index + 1}`),
          postId,
          type: child.is_video ? 'video' : 'image',
          postType: 'carousel',
          caption,
          sourceUrl:
            child.video_url ||
            child.display_url ||
            (Array.isArray(child.display_resources) && child.display_resources.length > 0
              ? child.display_resources[child.display_resources.length - 1].src
              : ''),
          thumbnailUrl: child.is_video ? child.display_url || child.thumbnail_src || null : null,
          permalink,
          carouselIndex: index + 1,
          carouselSize: sidecarEdges.length,
          timestamp,
        }))
        .filter((item) => item.sourceUrl);
    }

    const isReel = postUrl.includes('/reel/') || node.product_type === 'clips';
    const imageSource =
      node.display_url ||
      node.thumbnail_src ||
      (Array.isArray(node.display_resources) && node.display_resources.length > 0
        ? node.display_resources[node.display_resources.length - 1].src
        : '');

    return [
      {
        id: postId,
        postId,
        type: isReel ? 'reel' : node.is_video ? 'video' : 'image',
        postType: isReel ? 'reel' : node.is_video ? 'video' : 'image',
        caption,
        sourceUrl: node.is_video ? node.video_url || '' : imageSource,
        thumbnailUrl: node.is_video ? imageSource || null : null,
        permalink,
        carouselIndex: null,
        carouselSize: null,
        timestamp,
      },
    ].filter((item) => item.sourceUrl);
  }

  async normalizeScrapedDom(page, postUrl) {
    const fallbackPayload = await page.evaluate(() => {
      const unique = (values) => Array.from(new Set(values.filter(Boolean)));
      const ogDescription =
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const ogVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content') || '';
      const canonical =
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') || window.location.href;
      const images = unique(
        Array.from(document.querySelectorAll('article img'))
          .map((element) => element.currentSrc || element.getAttribute('src'))
          .filter(Boolean)
      );
      const videos = unique(
        Array.from(document.querySelectorAll('article video'))
          .map((element) => element.currentSrc || element.getAttribute('src'))
          .filter(Boolean)
      );

      return {
        caption: ogDescription,
        permalink: canonical,
        images,
        videos,
        ogImage,
        ogVideo,
      };
    });

    const postId = extractShortcodeFromLink(fallbackPayload.permalink || postUrl) || extractShortcodeFromLink(postUrl);
    const caption = normalizeCaptionFromOgDescription(fallbackPayload.caption);
    const isReel = postUrl.includes('/reel/');
    const mediaItems = [];
    const imageSources = fallbackPayload.images.length > 0 ? fallbackPayload.images : [fallbackPayload.ogImage];
    const videoSources = fallbackPayload.videos.length > 0 ? fallbackPayload.videos : [fallbackPayload.ogVideo];

    if (imageSources.length > 1 || videoSources.length > 1 || (imageSources.length > 0 && videoSources.length > 0)) {
      const merged = [
        ...imageSources.map((sourceUrl) => ({ type: 'image', sourceUrl, thumbnailUrl: null })),
        ...videoSources.map((sourceUrl) => ({
          type: 'video',
          sourceUrl,
          thumbnailUrl: fallbackPayload.ogImage || null,
        })),
      ].filter((item) => item.sourceUrl);

      return merged.map((item, index) => ({
        id: `${postId}-${index + 1}`,
        postId,
        type: item.type,
        postType: 'carousel',
        caption,
        sourceUrl: item.sourceUrl,
        thumbnailUrl: item.thumbnailUrl,
        permalink: fallbackPayload.permalink || postUrl,
        carouselIndex: index + 1,
        carouselSize: merged.length,
        timestamp: null,
      }));
    }

    if (videoSources[0]) {
      mediaItems.push({
        id: postId,
        postId,
        type: isReel ? 'reel' : 'video',
        postType: isReel ? 'reel' : 'video',
        caption,
        sourceUrl: videoSources[0],
        thumbnailUrl: fallbackPayload.ogImage || null,
        permalink: fallbackPayload.permalink || postUrl,
        carouselIndex: null,
        carouselSize: null,
        timestamp: null,
      });
    } else if (imageSources[0]) {
      mediaItems.push({
        id: postId,
        postId,
        type: 'image',
        postType: 'image',
        caption,
        sourceUrl: imageSources[0],
        thumbnailUrl: null,
        permalink: fallbackPayload.permalink || postUrl,
        carouselIndex: null,
        carouselSize: null,
        timestamp: null,
      });
    }

    return mediaItems;
  }

  async collectPostAssetsViaScrape(postUrl) {
    const page = await this.createBrowserPage();

    try {
      await page.goto(postUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await sleep(this.options.waitMs);

      const html = await page.content();
      const mediaNode = this.extractMediaNodeFromHtml(html);
      if (mediaNode) {
        const normalizedAssets = this.normalizeScrapedMediaNode(mediaNode, postUrl);
        if (normalizedAssets.length > 0) {
          return normalizedAssets;
        }
      }

      return await this.normalizeScrapedDom(page, postUrl);
    } finally {
      await page.close();
    }
  }

  async collectPostsViaScrape() {
    const postLinks = await this.collectProfileLinksViaScrape();
    const assets = [];

    for (const [index, postUrl] of postLinks.entries()) {
      logInfo(`Inspecting visible post ${index + 1}/${postLinks.length}: ${postUrl}`);
      const postAssets = await this.collectPostAssetsViaScrape(postUrl);
      assets.push(...postAssets);
    }

    logInfo(`Scraper inspection finished: ${postLinks.length} post(s) inspected, ${assets.length} media asset(s) found.`);
    return assets;
  }

  isDuplicate(asset) {
    return this.knownIds.has(asset.id) || this.knownSourceKeys.has(normalizeSourceKey(asset.sourceUrl));
  }

  async downloadAsset(asset) {
    const index = this.nextIndex;
    const paddedIndex = String(index).padStart(3, '0');
    const mediaDirectory = asset.type === 'image' ? IMAGES_DIR : VIDEOS_DIR;
    const mediaExtension = detectExtensionFromUrl(asset.sourceUrl, getMediaFallbackExtension(asset.type));
    const mediaFileName = `${this.options.prefix}-${paddedIndex}${mediaExtension}`;
    const mediaAbsolutePath = path.join(mediaDirectory, mediaFileName);
    const mediaRelativePath = toPosixPath(path.relative(ROOT_DIR, mediaAbsolutePath));

    logInfo(`Downloading ${asset.type} -> ${mediaRelativePath}`);
    await downloadFile(asset.sourceUrl, mediaAbsolutePath, asset.permalink || this.options.profileUrl);

    let thumbnailRelativePath = null;
    if (asset.thumbnailUrl) {
      const thumbnailExtension = detectExtensionFromUrl(asset.thumbnailUrl, '.jpg');
      const thumbnailFileName = `${this.options.prefix}-${paddedIndex}-thumb${thumbnailExtension}`;
      const thumbnailAbsolutePath = path.join(THUMBNAILS_DIR, thumbnailFileName);
      thumbnailRelativePath = toPosixPath(path.relative(ROOT_DIR, thumbnailAbsolutePath));

      try {
        logInfo(`Downloading thumbnail -> ${thumbnailRelativePath}`);
        await downloadFile(asset.thumbnailUrl, thumbnailAbsolutePath, asset.permalink || this.options.profileUrl);
      } catch (error) {
        thumbnailRelativePath = null;
        logWarn(`Thumbnail skipped for ${asset.id}: ${error.message}`);
      }
    }

    this.nextIndex += 1;
    this.knownIds.add(asset.id);
    this.knownSourceKeys.add(normalizeSourceKey(asset.sourceUrl));

    return {
      id: asset.id,
      postId: asset.postId || asset.id,
      type: asset.type,
      postType: asset.postType,
      caption: asset.caption || '',
      localPath: mediaRelativePath,
      sourceUrl: asset.sourceUrl,
      thumbnail: thumbnailRelativePath,
      permalink: asset.permalink || null,
      carouselIndex: asset.carouselIndex || null,
      carouselSize: asset.carouselSize || null,
      timestamp: asset.timestamp || null,
    };
  }

  async saveRecords(records) {
    await fs.writeFile(MEDIA_JSON_PATH, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }

  sortRecords(records) {
    const prefixPattern = new RegExp(`${escapeRegex(this.options.prefix)}-(\\d+)`, 'i');

    return [...records].sort((left, right) => {
      const leftMatch = String(left.localPath || '').match(prefixPattern);
      const rightMatch = String(right.localPath || '').match(prefixPattern);
      const leftIndex = leftMatch ? Number.parseInt(leftMatch[1], 10) : Number.MAX_SAFE_INTEGER;
      const rightIndex = rightMatch ? Number.parseInt(rightMatch[1], 10) : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }

  async run() {
    logInfo(CATEGORYLESS_MESSAGE);
    await this.initialize();

    const discoveredAssets =
      this.mode === 'api' ? await this.collectPostsViaApi() : await this.collectPostsViaScrape();

    let downloadedCount = 0;
    const newRecords = [];

    for (const asset of discoveredAssets) {
      if (!asset.id || !asset.sourceUrl) {
        logWarn(`Skipping an incomplete asset: ${JSON.stringify(asset)}`);
        continue;
      }

      if (this.isDuplicate(asset)) {
        logWarn(`Duplicate ignored for asset ${asset.id}`);
        continue;
      }

      try {
        const record = await this.downloadAsset(asset);
        newRecords.push(record);
        downloadedCount += 1;
      } catch (error) {
        logError(`Failed to download asset ${asset.id}: ${error.message}`);
      }
    }

    const mergedRecords = this.sortRecords([...this.existingRecords, ...newRecords]);
    await this.saveRecords(mergedRecords);

    logOk(`media.json updated: ${MEDIA_JSON_PATH}`);
    logOk(
      `Run completed in ${this.mode} mode. ${downloadedCount} new file(s) downloaded, ${mergedRecords.length} total record(s) available.`
    );
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(buildHelpText());
    return;
  }

  const downloader = new InstagramMediaDownloader(options);

  try {
    await downloader.run();
  } finally {
    await downloader.close();
  }
}

main().catch((error) => {
  logError(error.message || String(error));
  process.exitCode = 1;
});
