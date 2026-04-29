'use strict';

const { normalizeWhitespace, parsePrice, slugify } = require('./product-scraper-utils');

const BRAND_RULES = [
  { brand: 'Estée Lauder', patterns: [/est(?:ée|ee)\s+lauder/i] },
  { brand: 'MAC', patterns: [/\bm\.?a\.?c\b/i, /\bmac\b/i] },
  { brand: 'NARS', patterns: [/\bnars\b/i] },
  { brand: 'IT Cosmetics', patterns: [/\bit cosmetics\b/i] },
  { brand: 'Tarte', patterns: [/\btarte\b/i] },
  { brand: 'KYLIE COSMETICS', patterns: [/\bkylie cosmetics\b/i] },
  { brand: "L'Oréal", patterns: [/l['’]or[ée]al/i] },
  { brand: 'HOURGLASS', patterns: [/\bhourglass\b/i] },
  { brand: 'Lancôme', patterns: [/lanc[ôo]me/i] },
  { brand: 'Clinique', patterns: [/\bclinique\b/i] },
  { brand: 'Urban Decay', patterns: [/urban decay/i] },
  { brand: 'bareMinerals', patterns: [/bareminerals/i] },
  { brand: 'ILIA', patterns: [/\bilia\b/i] },
  { brand: 'Supergoop!', patterns: [/supergoop!?/i] },
  { brand: 'Benefit Cosmetics', patterns: [/benefit cosmetics/i, /\bbenefit\b/i] },
  { brand: 'Too Faced', patterns: [/too faced/i] },
  { brand: 'FENTY BEAUTY by Rihanna', patterns: [/fenty beauty/i] },
  { brand: 'Maybelline', patterns: [/\bmaybelline\b/i] },
  { brand: 'NYX Professional Makeup', patterns: [/\bnyx professional makeup\b/i, /\bnyx\b/i] },
  { brand: 'Anastasia Beverly Hills', patterns: [/anastasia beverly hills/i] },
  { brand: 'Laura Mercier', patterns: [/laura mercier/i] },
  { brand: 'Grande Cosmetics', patterns: [/grande cosmetics/i, /\bgrande(?:lash|brow)\b/i] },
  { brand: 'BOBBI BROWN', patterns: [/bobbi brown/i] },
  { brand: 'Stila', patterns: [/\bstila\b/i] },
  { brand: 'OLEHENRIKSEN', patterns: [/olehenriksen/i] },
  { brand: 'SACHEU', patterns: [/\bsacheu\b/i] },
  { brand: 'Buxom', patterns: [/\bbuxom\b/i] },
  { brand: "Juvia's Place", patterns: [/juvia'?s place/i] },
  { brand: 'DIBS Beauty', patterns: [/\bdibs beauty\b/i] },
  { brand: 'Live Tinted', patterns: [/live tinted/i] },
  { brand: 'cocokind', patterns: [/\bcocokind\b/i] },
  { brand: 'MILK MAKEUP', patterns: [/\bmilk makeup\b/i] },
  { brand: 'Essence', patterns: [/\bessence\b/i] },
  { brand: 'The Ordinary', patterns: [/the ordinary/i] },
  { brand: 'ULTA Beauty Collection', patterns: [/ulta beauty collection/i] },
  { brand: 'Charlotte Tilbury', patterns: [/charlotte tilbury/i] },
  { brand: 'Glow Recipe', patterns: [/glow recipe/i] },
  { brand: 'OBJET By Kundal', patterns: [/objet by kundal/i, /\bkundal\b/i] },
  { brand: 'Sol de Janeiro', patterns: [/sol de janeiro/i] },
  { brand: 'Rosy The Panda', patterns: [/rosy the panda/i] },
  { brand: 'Rela By Mi', patterns: [/rela by mi/i] },
  { brand: 'Sephora Favorites', patterns: [/sephora favorites/i, /^sephora\b/i] },
  { brand: 'Morphe', patterns: [/\bmorphe\b/i] },
  { brand: 'BIZU Cosmetics', patterns: [/bizu cosmetics/i] },
  { brand: 'AXIS-Y', patterns: [/axis-y/i] },
  { brand: 'Huda Beauty', patterns: [/huda beauty/i] },
  { brand: 'Royal Cosmetics', patterns: [/royal cosmetics/i] },
  { brand: 'Lama Perfume', patterns: [/lama perfume/i] },
  { brand: 'Juicy Beauty', patterns: [/juicy beauty/i] },
  { brand: 'Laki Beauty', patterns: [/laki beauty/i] },
  { brand: "Serena's Bodyline", patterns: [/serena'?s bodyline/i, /serena'\s*s bodyline/i] },
  { brand: 'Lattafa', patterns: [/\blattafa\b/i] },
  { brand: 'Rituals', patterns: [/\brituals\b/i] },
  { brand: 'Tinkle', patterns: [/\btinkle\b/i] },
  { brand: 'Velvet Sand', patterns: [/velvet sand/i] },
  { brand: 'Velvet Burgundy', patterns: [/velvet burgundy/i] },
  { brand: 'Velvet Hands', patterns: [/velvet hands/i] },
  { brand: 'Lily Bag', patterns: [/lily bag/i] },
  { brand: 'Olaplex', patterns: [/\bolaplex\b/i] },
  { brand: 'Morfose', patterns: [/\bmorfose\b/i] },
  { brand: 'Rare Beauty', patterns: [/rare beauty/i] },
  { brand: 'Bassam Fattouh', patterns: [/bassam fattouh/i] },
  { brand: 'Beauty Spot', patterns: [/gift card/i, /gift voucher/i] },
];

const CATEGORY_RULES = [
  { category: 'gifts', keywords: ['gift card', 'gift voucher'] },
  { category: 'accessories', keywords: ['makeup bag', 'lily bag', ' bag'] },
  { category: 'tools', keywords: ['brush set', 'brush collection', 'makeup brush', 'spoolie', 'razor'] },
  { category: 'bodycare', keywords: ['body lotion', 'body butter', 'body scrub', 'body cream', 'body essentials', 'body your way', 'bodyline', 'body mist', 'hand cream', 'pedicure', 'bum bum', 'ritual'] },
  { category: 'haircare', keywords: ['shampoo', 'conditioner', 'leave-in', 'hair mask', 'hair perfume', 'hair mousse', 'hair and body', 'hair&body', 'hair', 'olaplex', 'morfose'] },
  { category: 'fragrance', keywords: ['perfume', 'parfum', 'fragrance', 'cologne', 'eau de', 'musk', 'cheirosa'] },
  {
    category: 'makeup',
    keywords: [
      'foundation',
      'concealer',
      'powder',
      'blush',
      'bronzer',
      'primer',
      'setting spray',
      'setting mist',
      'skin tint',
      'tinted moisturizer',
      'face balm',
      'face trio',
      'liquid filter',
      'lip',
      'gloss',
      'lipstick',
      'liner',
      'balm',
      'stain',
      'mascara',
      'eyeliner',
      'brow',
      'eyeshadow',
      'eye shadow',
      'shadow stick',
      'palette',
      'cheek',
      'contour',
      'cc+',
      'bb',
      'lash',
    ],
  },
  {
    category: 'skincare',
    keywords: [
      'cleanser',
      'cleansing',
      'skincare',
      'sheet mask',
      'hydration',
      'moisturizer',
      'moisturising',
      'moisturizing',
      'serum',
      'sunscreen',
      'sun protection',
      'remover',
      'hyaluronic',
      'peptide',
      'ceramide',
      'face base',
      'cream',
    ],
  },
];

const CATEGORY_LABELS = {
  accessories: 'Accessories',
  bodycare: 'Body Care',
  fragrance: 'Fragrance',
  gifts: 'Gifts',
  haircare: 'Hair Care',
  makeup: 'Makeup',
  skincare: 'Skincare',
  tools: 'Tools',
};

function toRoundedNumber(value) {
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

function derivePriceValue(product) {
  const explicitValue = Number(product.priceValue);
  if (Number.isFinite(explicitValue)) {
    return toRoundedNumber(explicitValue);
  }

  const parsed = parsePrice(product.price);
  return Number.isFinite(parsed.priceValue) ? parsed.priceValue : 0;
}

function deriveCurrency(product) {
  const parsed = parsePrice(product.price);
  const currency = normalizeWhitespace(product.currency || parsed.currency).toUpperCase();
  return currency || 'USD';
}

function applyDisplayReplacements(value) {
  return value
    .replace(/Serena'\s+S/gi, "Serena's")
    .replace(/\bSerena'S\b/g, "Serena's")
    .replace(/\sOf\s/g, ' of ')
    .replace(/\sAnd\s/g, ' and ')
    .replace(/\sFor\s/g, ' for ')
    .replace(/\sIn\s/g, ' in ')
    .replace(/\sTo\s/g, ' to ')
    .replace(/\sX\s/g, ' x ')
    .replace(/\bSpf\b/g, 'SPF')
    .replace(/\bCc\b/g, 'CC')
    .replace(/\bBb\b/g, 'BB')
    .replace(/\bHr\b/g, 'HR')
    .replace(/\bMac\b/g, 'MAC')
    .replace(/M·a·c/g, 'M·A·C')
    .replace(/\bNars\b/g, 'NARS')
    .replace(/\bNyx\b/g, 'NYX')
    .replace(/\bIlia\b/g, 'ILIA')
    .replace(/\bIt Cosmetics\b/g, 'IT Cosmetics')
    .replace(/\bHourglass\b/g, 'HOURGLASS')
    .replace(/\bBobbi Brown\b/g, 'BOBBI BROWN')
    .replace(/\bOlehenriksen\b/g, 'OLEHENRIKSEN')
    .replace(/\bMilk Makeup\b/g, 'MILK MAKEUP')
    .replace(/\bBareminerals\b/g, 'bareMinerals')
    .replace(/\bKylie Cosmetics\b/g, 'KYLIE COSMETICS')
    .replace(/\bFenty Beauty By Rihanna\b/g, 'FENTY BEAUTY by Rihanna')
    .replace(/\bL'oréal\b/g, "L'Oréal")
    .replace(/\bAxis-Y\b/g, 'AXIS-Y')
    .replace(/\bObjet By Kundal\b/g, 'OBJET By Kundal')
    .replace(/\bSol De Janeiro\b/g, 'Sol de Janeiro')
    .replace(/\bSephora Favorites\b/g, 'Sephora Favorites')
    .replace(/\bHuda Beauty\b/g, 'Huda Beauty')
    .replace(/\bRare Beauty\b/g, 'Rare Beauty')
    .replace(/\bRela By Mi\b/g, 'Rela By Mi')
    .replace(/\bRosy The Panda\b/g, 'Rosy The Panda')
    .replace(/\bBizu Cosmetics\b/g, 'BIZU Cosmetics')
    .replace(/\bBassam Fattouh\b/g, 'Bassam Fattouh')
    .replace(/\bLaki Beauty\b/g, 'Laki Beauty')
    .replace(/\bJuicy Beauty\b/g, 'Juicy Beauty')
    .replace(/\bLama Perfume\b/g, 'Lama Perfume')
    .replace(/\bNº(\d+)\b/gi, 'Nº$1')
    .replace(/(\d+)\s*ml\b/gi, '$1ML')
    .replace(/(\d+)\s*kg\b/gi, '$1KG');
}

function toDisplayName(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  const titleCased = normalized
    .toLowerCase()
    .replace(/\b([a-z\u00c0-\u024f])/g, (character) => character.toUpperCase());

  return applyDisplayReplacements(titleCased);
}

function deriveBrand(productName, rawBrand) {
  const explicitBrand = normalizeWhitespace(rawBrand);
  if (explicitBrand) {
    return toDisplayName(explicitBrand);
  }

  for (const rule of BRAND_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(productName))) {
      return rule.brand;
    }
  }

  return 'Beauty Spot';
}

function deriveCategory(productName, rawCategory) {
  const explicitCategory = normalizeWhitespace(rawCategory).toLowerCase();
  if (explicitCategory) {
    return explicitCategory;
  }

  const normalizedName = normalizeWhitespace(productName).toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalizedName.includes(keyword))) {
      return rule.category;
    }
  }

  return 'beauty';
}

function deriveDescription(name, brand, category) {
  const brandLead = brand && brand !== 'Beauty Spot' ? `${brand} ` : '';
  const descriptions = {
    accessories: `${brandLead}accessory picked to make the beauty routine feel more polished and giftable.`,
    bodycare: `${brandLead}body care pick selected for a more indulgent daily ritual and shelf appeal.`,
    fragrance: `${brandLead}fragrance designed to bring a memorable scent moment into the collection.`,
    gifts: `${brandLead}giftable beauty pick curated for easy gifting and stronger catalogue storytelling.`,
    haircare: `${brandLead}hair care essential chosen to support a smoother, shinier routine.`,
    makeup: `${brandLead}makeup pick built to add color, finish, and confidence to the beauty edit.`,
    skincare: `${brandLead}skincare essential chosen to support comfort, glow, and everyday ritual value.`,
    tools: `${brandLead}beauty tool selected to make application and prep feel easier and more precise.`,
    beauty: `${brandLead}${name.toLowerCase()} selected for the Beauty Spot catalogue.`,
  };

  return descriptions[category] || descriptions.beauty;
}

function deriveBadge(name, priceValue, index) {
  const normalizedName = normalizeWhitespace(name).toLowerCase();

  if (/\b(gift|set|kit|ritual|voucher|card|bundle)\b/.test(normalizedName)) {
    return 'Gift Edit';
  }

  if (priceValue > 0 && priceValue <= 20) {
    return 'Under $20';
  }

  if (index < 6) {
    return 'Trending';
  }

  return null;
}

function deriveStock(product) {
  const explicitStock = Number(product.stock);
  if (Number.isFinite(explicitStock)) {
    return Math.max(0, Math.trunc(explicitStock));
  }

  const availability = normalizeWhitespace(product.availability).toLowerCase();
  if (/indisponible|rupture|epuise|épuisé|out of stock/.test(availability)) {
    return 0;
  }

  return 12;
}

function deriveSlug(product) {
  const explicitSlug = normalizeWhitespace(product.slug);
  if (explicitSlug) {
    return explicitSlug;
  }

  try {
    const pathname = new URL(product.productUrl || product.url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return slugify(lastSegment);
    }
  } catch (error) {
    // Ignore URL parsing errors and fall back to name-based slugs.
  }

  return slugify(product.name || product.title || 'product');
}

function deriveFrontendImage(product) {
  const remoteCandidates = [product.imageUrl, product.image];
  for (const candidate of remoteCandidates) {
    const normalized = normalizeWhitespace(candidate);
    if (/^https?:\/\//i.test(normalized) || normalized.startsWith('/')) {
      return normalized;
    }
  }

  const localImage = normalizeWhitespace(product.localImage);
  if (localImage.includes('/public/') || localImage.startsWith('public/')) {
    return `/${localImage.replace(/\\/g, '/').split('public/').pop()}`;
  }

  return '';
}

function normalizeCatalogProduct(product, index = 0) {
  const rawName = normalizeWhitespace(product.name || product.title || '');
  const name = toDisplayName(rawName);
  const brand = deriveBrand(rawName || name, product.brand);
  const category = deriveCategory(rawName || name, product.category);
  const priceValue = derivePriceValue(product);
  const currency = deriveCurrency(product);
  const image = deriveFrontendImage(product);
  const stock = deriveStock(product);

  return {
    id: Number.isFinite(Number(product.id)) ? Number(product.id) : index + 1,
    slug: deriveSlug({ ...product, name: rawName }),
    name,
    brand,
    price: priceValue,
    priceLabel: normalizeWhitespace(product.price) || String(priceValue),
    priceValue,
    currency,
    category,
    image,
    imageUrl: normalizeWhitespace(product.imageUrl || product.image || ''),
    images: image ? [image] : [],
    featured: typeof product.featured === 'boolean' ? product.featured : index < 8,
    badge: typeof product.badge === 'string' ? product.badge : deriveBadge(rawName || name, priceValue, index),
    stock,
    description: normalizeWhitespace(product.description) || deriveDescription(name, brand, category),
    availability: normalizeWhitespace(product.availability) || (stock > 0 ? 'In stock' : 'Out of stock'),
    productUrl: normalizeWhitespace(product.productUrl || product.url),
    source: 'catalog-data',
  };
}

function mapCatalogProductToProjectDocument(product, index = 0) {
  const normalized = normalizeCatalogProduct(product, index);

  return {
    name: normalized.name,
    description: normalized.description,
    price: normalized.priceValue,
    category: CATEGORY_LABELS[normalized.category] || 'Beauty',
    brand: normalized.brand,
    images: [normalizeWhitespace(product.localImage), normalizeWhitespace(product.imageUrl || product.image), normalized.image].filter(Boolean),
    stock: normalized.stock,
  };
}

module.exports = {
  mapCatalogProductToProjectDocument,
  normalizeCatalogProduct,
};
