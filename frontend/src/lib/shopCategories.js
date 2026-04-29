export const DEFAULT_SHOP_CATEGORY = 'shop-all';

const SHOP_CATEGORY_LABELS = [
  { id: DEFAULT_SHOP_CATEGORY, labels: { fr: 'Tout voir', en: 'Shop all', ar: 'عرض الكل' } },
  { id: 'makeup', labels: { fr: 'Maquillage', en: 'Makeup', ar: 'مكياج' } },
  { id: 'skincare', labels: { fr: 'Soin', en: 'Skincare', ar: 'عناية' } },
  { id: 'perfumes', labels: { fr: 'Parfums', en: 'Perfumes', ar: 'عطور' } },
  { id: 'mini-size', labels: { fr: 'Mini formats', en: 'Mini sizes', ar: 'أحجام صغيرة' } },
];

export const SHOP_CATEGORIES = SHOP_CATEGORY_LABELS.map((category) => ({
  id: category.id,
  label: category.labels.fr,
}));

const MINI_SIZE_PATTERN = /\b(mini|travel|trial|sample|miniature)\b/i;
const PERFUME_PATTERN = /\b(perfume|perfumes|parfum|fragrance|cologne|eau de|rollerball)\b/i;
const MAKEUP_PATTERN =
  /\b(makeup|foundation|concealer|primer|powder|blush|bronzer|highlighter|contour|lip|mascara|eyeliner|brow|palette|gloss|corrector|liner|tint|setting spray|setting mist|pencil|brush|blender)\b/i;
const SKINCARE_PATTERN =
  /\b(skincare|skin care|cleanser|serum|moisturizer|moisturiser|cream|balm|sunscreen|essence|toner|mask|treatment|hydrating|hydration|spf)\b/i;

function getProductText(product) {
  return [
    product?.name,
    product?.slug,
    product?.brand,
    product?.category,
    product?.description,
    product?.productUrl,
  ]
    .filter(Boolean)
    .join(' ');
}

function getBaseCategory(product) {
  return String(product?.category || '')
    .trim()
    .toLowerCase();
}

export function getShopCategories(language = 'fr') {
  return SHOP_CATEGORY_LABELS.map((category) => ({
    id: category.id,
    label: category.labels[language] || category.labels.fr,
  }));
}

export function getShopCategoryLabel(categoryId, language = 'fr') {
  return getShopCategories(language).find((category) => category.id === categoryId)?.label || getShopCategories(language)[0].label;
}

export function matchesShopCategory(product, categoryId) {
  const baseCategory = getBaseCategory(product);
  const productText = getProductText(product);

  if (categoryId === DEFAULT_SHOP_CATEGORY) {
    return true;
  }

  if (categoryId === 'mini-size') {
    return MINI_SIZE_PATTERN.test(productText);
  }

  if (categoryId === 'perfumes') {
    return ['perfume', 'perfumes', 'fragrance', 'parfum'].includes(baseCategory) || PERFUME_PATTERN.test(productText);
  }

  if (categoryId === 'skincare') {
    return baseCategory === 'skincare' || (!['makeup', 'beauty', 'tools'].includes(baseCategory) && SKINCARE_PATTERN.test(productText));
  }

  if (categoryId === 'makeup') {
    return ['makeup', 'beauty', 'tools'].includes(baseCategory) || (!baseCategory && MAKEUP_PATTERN.test(productText));
  }

  return false;
}

export function filterProductsByShopCategory(products, categoryId) {
  return (Array.isArray(products) ? products : []).filter((product) => matchesShopCategory(product, categoryId));
}
