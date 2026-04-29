#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'media.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'site-media.json');
const FEATURED_LIMIT = Number.parseInt(process.env.SITE_MEDIA_FEATURED_LIMIT || '6', 10);

const CATEGORY_KEYWORDS = {
  skincare: [
    'skincare',
    'skin care',
    'soin',
    'soins',
    'peau',
    'serum',
    'serums',
    'sérum',
    'cleanser',
    'cleanse',
    'nettoyant',
    'toner',
    'tonique',
    'moisturizer',
    'moisturiser',
    'hydrating',
    'hydratant',
    'mask',
    'masque',
    'cream',
    'creme',
    'crème',
    'spf',
    'sunscreen',
    'sun care',
    'protection solaire',
  ],
  makeup: [
    'makeup',
    'maquillage',
    'lipstick',
    'rouge a levres',
    'rouge à lèvres',
    'foundation',
    'fond de teint',
    'concealer',
    'correcteur',
    'mascara',
    'eyeliner',
    'blush',
    'highlighter',
    'palette',
    'powder',
    'poudre',
    'brush',
    'pinceau',
    'gloss',
  ],
  fragrance: [
    'fragrance',
    'perfume',
    'parfum',
    'eau de parfum',
    'eau de toilette',
    'cologne',
    'scent',
    'oud',
    'musk',
    'musc',
  ],
  promo: [
    'promo',
    'promotion',
    'offre',
    'deal',
    'discount',
    'sale',
    'soldes',
    'nouveau',
    'nouveaute',
    'nouveauté',
    'launch',
    'new arrival',
    'arrivage',
    'collection',
    'limited',
    'edition',
  ],
  store: [
    'store',
    'shop',
    'boutique',
    'magasin',
    'adresse',
    'visit us',
    'come visit',
    'open',
    'beauty spot',
    'en magasin',
    'in store',
  ],
};

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toSentenceCase(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function truncate(value, maxLength) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function detectCategory(text, item) {
  const haystack = normalizeWhitespace(
    [
      text,
      item.type,
      item.postType,
      item.permalink,
      item.localPath,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  );

  let bestCategory = 'promo';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((total, keyword) => (haystack.includes(keyword) ? total + 1 : total), 0);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  if (bestScore > 0) {
    return bestCategory;
  }

  if (item.postType === 'reel' || item.type === 'video' || item.type === 'reel') {
    return 'promo';
  }

  return 'store';
}

function buildTitle(item, category, order) {
  const caption = normalizeWhitespace(item.caption);
  if (caption) {
    return truncate(toSentenceCase(caption), 72);
  }

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const mediaLabel = item.type === 'reel' ? 'Reel' : item.type === 'video' ? 'Video' : 'Image';
  return `Beauty Spot ${categoryLabel} ${mediaLabel} ${String(order).padStart(2, '0')}`;
}

function buildAlt(item, title, category) {
  const caption = normalizeWhitespace(item.caption);
  if (caption) {
    return truncate(caption, 120);
  }

  return `${title} for Beauty Spot (${category})`;
}

function buildFrontendRecord(item, index) {
  const order = index + 1;
  const category = detectCategory(item.caption, item);
  const title = buildTitle(item, category, order);
  const alt = buildAlt(item, title, category);

  return {
    id: item.id,
    postId: item.postId || item.id,
    type: item.type,
    postType: item.postType || item.type,
    title,
    category,
    featured: order <= FEATURED_LIMIT,
    alt,
    caption: normalizeWhitespace(item.caption),
    localPath: item.localPath,
    sourceUrl: item.sourceUrl,
    thumbnail: item.thumbnail || null,
    permalink: item.permalink || null,
    carouselIndex: item.carouselIndex || null,
    carouselSize: item.carouselSize || null,
    timestamp: item.timestamp || null,
    order,
  };
}

async function readInputRecords() {
  try {
    const raw = await fs.readFile(INPUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function main() {
  const rawRecords = await readInputRecords();
  const siteRecords = rawRecords.map((item, index) => buildFrontendRecord(item, index));
  const categoryBreakdown = siteRecords.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + 1;
    return accumulator;
  }, {});

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(siteRecords, null, 2)}\n`, 'utf8');

  logInfo(`Input records: ${rawRecords.length}`);
  logInfo(`Category breakdown: ${JSON.stringify(categoryBreakdown)}`);
  logOk(`Frontend-ready JSON saved to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message || String(error)}`);
  process.exitCode = 1;
});
