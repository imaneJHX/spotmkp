import brands from '../data/brands';

const LOCAL_LOGO_EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
export const LOCAL_BRAND_LOGO_IDS = new Set([
  'anastasia-beverly-hills',
  'benefit-cosmetics',
  'clinique',
  'elf-cosmetics',
  'fenty-beauty',
  'lancome',
  'mac',
  'nyx',
  'rare-beauty',
  'tarte',
]);

function normalizeValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`"]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function getBrandAliases(brand) {
  return [brand?.id, brand?.name, ...(Array.isArray(brand?.aliases) ? brand.aliases : [])].filter(Boolean);
}

export function normalizeBrandKey(value) {
  return normalizeValue(value).replace(/\s+/g, '-');
}

export function getBrandById(brandId) {
  const target = normalizeBrandKey(brandId);
  return brands.find((brand) => normalizeBrandKey(brand.id) === target) || null;
}

export function getBrandInitials(name) {
  const parts = String(name || '')
    .split(/\s+/)
    .filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function getLocalBrandLogoCandidates(brandId) {
  if (!brandId) {
    return [];
  }

  return LOCAL_LOGO_EXTENSIONS.map((extension) => `/brands/${brandId}.${extension}`);
}

export function hasLocalBrandLogo(brandOrId) {
  const brandId = typeof brandOrId === 'string' ? brandOrId : brandOrId?.id;
  return LOCAL_BRAND_LOGO_IDS.has(normalizeBrandKey(brandId));
}

export function getBrandfetchLogoCandidates(domain, clientId) {
  const normalizedDomain = String(domain || '').trim();
  const normalizedClientId = String(clientId || '').trim();

  if (!normalizedDomain || !normalizedClientId) {
    return [];
  }

  const horizontalQuery = new URLSearchParams({
    c: normalizedClientId,
    w: '400',
    h: '200',
  }).toString();

  const iconQuery = new URLSearchParams({
    c: normalizedClientId,
    w: '180',
    h: '180',
  }).toString();

  return [
    `https://cdn.brandfetch.io/${encodeURIComponent(normalizedDomain)}/theme/light/fallback/404/logo?${horizontalQuery}`,
    `https://cdn.brandfetch.io/${encodeURIComponent(normalizedDomain)}/fallback/404/icon.png?${iconQuery}`,
  ];
}

export function getBrandLogoCandidates(brand, clientId) {
  const explicitLogo = brand?.logo ? [brand.logo] : [];
  const localCandidates = getLocalBrandLogoCandidates(brand?.id);
  const brandfetchCandidates =
    brand?.logoSource === 'brandfetch' ? getBrandfetchLogoCandidates(brand?.domain, clientId) : [];

  return [...new Set([...explicitLogo, ...localCandidates, ...brandfetchCandidates].filter(Boolean))];
}

export function resolveBrandLogo(brand, clientId) {
  return getBrandLogoCandidates(brand, clientId)[0] || null;
}

export function matchesBrand(product, brandOrId) {
  const productBrand = normalizeValue(product?.brand);

  if (!productBrand) {
    return false;
  }

  const brand = typeof brandOrId === 'string' ? getBrandById(brandOrId) : brandOrId;
  const aliases = brand ? getBrandAliases(brand) : [brandOrId];

  return aliases.some((alias) => {
    const normalizedAlias = normalizeValue(alias);
    return normalizedAlias && productBrand === normalizedAlias;
  });
}

export function filterProductsByBrand(products, brandId) {
  if (!brandId) {
    return Array.isArray(products) ? products : [];
  }

  return (Array.isArray(products) ? products : []).filter((product) => matchesBrand(product, brandId));
}

export function getBrandProductCount(products, brandId) {
  return filterProductsByBrand(products, brandId).length;
}

export function getBrandShopHref(brandId) {
  return `/shop?brand=${encodeURIComponent(brandId)}`;
}

export function getBrandPageHref() {
  return '/marques';
}

export function sortBrandsAlphabetically(items) {
  return [...items].sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')));
}

export default brands;
