const MAD_SUFFIX = 'DH';
const USD_TO_MAD_RATE = 10;
const INLINE_PRICE_PATTERN = /(\$)\s?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s?(\$|USD|MAD|DH)/gi;
const PRICE_PART_PATTERN = /\d+(?:[.,]\d+)?/g;
const MOJIBAKE_PATTERN = /[\u00C3\u00C2\u00E2\u00C5]/;
const CATEGORY_LABELS = {
  'shop all': { fr: 'Tout voir', en: 'Shop all', ar: 'عرض الكل' },
  makeup: { fr: 'Maquillage', en: 'Makeup', ar: 'مكياج' },
  skincare: { fr: 'Soin', en: 'Skincare', ar: 'عناية' },
  perfumes: { fr: 'Parfums', en: 'Perfumes', ar: 'عطور' },
  perfume: { fr: 'Parfum', en: 'Perfume', ar: 'عطر' },
  fragrance: { fr: 'Parfums', en: 'Perfumes', ar: 'عطور' },
  parfum: { fr: 'Parfum', en: 'Perfume', ar: 'عطر' },
  'mini size': { fr: 'Mini formats', en: 'Mini sizes', ar: 'أحجام صغيرة' },
  beauty: { fr: 'Beauté', en: 'Beauty', ar: 'جمال' },
  bodycare: { fr: 'Corps', en: 'Body', ar: 'الجسم' },
  'body care': { fr: 'Corps', en: 'Body', ar: 'الجسم' },
  haircare: { fr: 'Cheveux', en: 'Hair', ar: 'الشعر' },
  'hair care': { fr: 'Cheveux', en: 'Hair', ar: 'الشعر' },
  tools: { fr: 'Accessoires', en: 'Accessories', ar: 'إكسسوارات' },
  accessories: { fr: 'Accessoires', en: 'Accessories', ar: 'إكسسوارات' },
  gifts: { fr: 'Cadeaux', en: 'Gifts', ar: 'هدايا' },
};
const PRODUCT_TEXT_REPLACEMENTS = {
  fr: [
    {
      pattern: /\bmakeup pick built to add color, finish, and confidence to the beauty edit\./gi,
      replacement: 'selection maquillage pensee pour apporter couleur, fini et assurance a la selection beaute.',
    },
    {
      pattern: /\bTrending\b/gi,
      replacement: 'Tendance',
    },
    {
      pattern: /\bFeatured\b/gi,
      replacement: 'Selection',
    },
    {
      pattern: /\bFoundation\b/gi,
      replacement: 'Fond de teint',
    },
  ],
  en: [],
  ar: [
    {
      pattern: /\bTrending\b/gi,
      replacement: 'رائج',
    },
    {
      pattern: /\bFeatured\b/gi,
      replacement: 'مختار',
    },
  ],
};

function repairEncodedText(value) {
  const text = String(value ?? '');

  if (!text || !MOJIBAKE_PATTERN.test(text) || typeof TextDecoder === 'undefined') {
    return text;
  }

  try {
    const bytes = Uint8Array.from(Array.from(text, (character) => character.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return text;
  }
}

function localizeProductText(value, language = 'fr') {
  const replacements = PRODUCT_TEXT_REPLACEMENTS[language] || PRODUCT_TEXT_REPLACEMENTS.fr;
  return replacements.reduce(
    (currentValue, entry) => currentValue.replace(entry.pattern, entry.replacement),
    value
  );
}

export function formatDisplayText(value) {
  return repairEncodedText(value).replace(/\s+/g, ' ').trim();
}

function normalizeCurrencyToken(token) {
  const normalizedToken = String(token || '').trim().toUpperCase();

  if (normalizedToken === '$' || normalizedToken === 'USD') {
    return 'USD';
  }

  if (normalizedToken === 'DH' || normalizedToken === 'MAD') {
    return 'MAD';
  }

  return normalizedToken;
}

function parseNumericPrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : NaN;
  }

  const sanitizedValue = value.replace(/[^\d.,-]/g, '').trim();
  if (!sanitizedValue) {
    return NaN;
  }

  const normalizedValue =
    sanitizedValue.includes(',') && sanitizedValue.includes('.')
      ? sanitizedValue.replace(/,/g, '')
      : sanitizedValue.replace(',', '.');
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : NaN;
}

function formatMADNumber(value) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} ${MAD_SUFFIX}`;
}

function formatPriceRangeMAD(value, currency = 'USD') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue || !/[-\u2013]/.test(normalizedValue)) {
    return '';
  }

  const matches = normalizedValue.match(PRICE_PART_PATTERN) || [];
  if (matches.length < 2) {
    return '';
  }

  const converted = matches
    .slice(0, 2)
    .map((part) => convertToMAD(part, currency))
    .filter((part) => Number.isFinite(part));

  if (converted.length < 2) {
    return '';
  }

  return converted.map((part) => formatMADNumber(part)).join(' - ');
}

function convertToMAD(value, currency = 'USD') {
  const numericValue = parseNumericPrice(value);
  if (!Number.isFinite(numericValue)) {
    return NaN;
  }

  const normalizedCurrency = normalizeCurrencyToken(currency);
  if (normalizedCurrency === 'MAD') {
    return Math.round(numericValue);
  }

  return Math.round(numericValue * USD_TO_MAD_RATE);
}

export function getPriceValue(product) {
  return parseNumericPrice(product?.priceValue ?? product?.price);
}

export function getPriceValueMAD(product) {
  return convertToMAD(getPriceValue(product), product?.currency || 'MAD');
}

export function formatPriceMAD(product) {
  const rangeLabel = formatPriceRangeMAD(product?.priceLabel ?? product?.price, product?.currency || 'MAD');
  if (rangeLabel) {
    return rangeLabel;
  }

  const priceInMAD = getPriceValueMAD(product);

  if (!Number.isFinite(priceInMAD)) {
    return String(product?.price ?? '');
  }

  return formatMADNumber(priceInMAD);
}

export function formatPriceText(value, fallbackCurrency = 'USD', language = 'fr') {
  return localizeProductText(formatDisplayText(String(value || '')), language).replace(
    INLINE_PRICE_PATTERN,
    (match, prefixSymbol, prefixAmount, suffixAmount, suffixSymbol) => {
      const amount = prefixAmount || suffixAmount;
      const currency = normalizeCurrencyToken(prefixSymbol || suffixSymbol || fallbackCurrency);
      const priceInMAD = convertToMAD(amount, currency);

      if (!Number.isFinite(priceInMAD)) {
        return match;
      }

      return formatMADNumber(priceInMAD);
    }
  );
}

export function formatCategoryLabel(category, language = 'fr') {
  const normalizedLabel = formatDisplayText(String(category || 'beauty')).replace(/[-_]+/g, ' ').toLowerCase();

  if (CATEGORY_LABELS[normalizedLabel]) {
    return CATEGORY_LABELS[normalizedLabel][language] || CATEGORY_LABELS[normalizedLabel].fr;
  }

  return normalizedLabel.replace(/\b\w/g, (character) => character.toUpperCase());
}
