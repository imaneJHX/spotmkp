import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const productsDirectory = path.join(frontendRoot, 'public', 'images', 'products');
const outputPath = path.join(frontendRoot, 'src', 'data', 'products.generated.js');
const catalogJsonPath = path.resolve(frontendRoot, '..', 'data', 'products.json');
const require = createRequire(import.meta.url);
const { normalizeCatalogProduct } = require('../../scripts/lib/catalog-normalizer.cjs');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const SKIPPED_FILES = new Set(['product-fallback.svg']);

const TITLE_CASE_EXCEPTIONS = new Map([
  ['ysl', 'YSL'],
  ['bb', 'BB'],
  ['cc', 'CC'],
  ['spf', 'SPF'],
  ['uv', 'UV'],
  ['xl', 'XL'],
]);

const CATEGORY_RULES = [
  {
    category: 'skincare',
    keywords: ['serum', 'cream', 'moisture', 'moisturizer', 'cleanser', 'mask', 'toner', 'essence', 'clinic', 'clinique'],
    basePrice: 499,
  },
  {
    category: 'makeup',
    keywords: ['lipstick', 'blush', 'mascara', 'foundation', 'concealer', 'palette', 'powder', 'gloss', 'liner'],
    basePrice: 349,
  },
  {
    category: 'fragrance',
    keywords: ['perfume', 'parfum', 'fragrance', 'mist', 'eau', 'cologne'],
    basePrice: 799,
  },
  {
    category: 'haircare',
    keywords: ['hair', 'shampoo', 'conditioner', 'mask', 'kerastase', 'olaplex', 'repair', 'curl'],
    basePrice: 459,
  },
];

const BRAND_RULES = [
  { brand: 'Clinique', keywords: ['clinique'] },
  { brand: 'Rare Beauty', keywords: ['rare-beauty', 'rare'] },
  { brand: 'Charlotte Tilbury', keywords: ['charlotte-tilbury', 'tilbury'] },
  { brand: 'Dior', keywords: ['dior'] },
  { brand: 'YSL Beauty', keywords: ['ysl', 'saint-laurent'] },
  { brand: 'Keratase', keywords: ['kerastase'] },
  { brand: 'Olaplex', keywords: ['olaplex'] },
  { brand: 'Laneige', keywords: ['laneige'] },
];

function toTitleCase(value) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((chunk) => TITLE_CASE_EXCEPTIONS.get(chunk) || `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
}

function slugToName(slug) {
  return toTitleCase(slug.replace(/[_-]+/g, ' ').trim().toLowerCase());
}

function detectCategory(slug) {
  const normalized = slug.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule;
    }
  }

  return {
    category: 'beauty',
    basePrice: 399,
  };
}

function createBadge(index) {
  if (index < 2) {
    return 'New';
  }

  if (index < 5) {
    return 'Best Seller';
  }

  return null;
}

function createDescription(name, category) {
  const descriptionByCategory = {
    skincare: `A premium ${name.toLowerCase()} curated for a refined daily skincare routine.`,
    makeup: `A polished ${name.toLowerCase()} designed to elevate your beauty look with ease.`,
    fragrance: `A statement ${name.toLowerCase()} for a more luxurious and memorable beauty ritual.`,
    haircare: `A salon-inspired ${name.toLowerCase()} created to care for your hair with a premium feel.`,
    beauty: `A curated ${name.toLowerCase()} selected to fit the Beauty Spot premium catalogue.`,
  };

  return descriptionByCategory[category] || descriptionByCategory.beauty;
}

function detectBrand(slug) {
  const normalized = slug.toLowerCase();

  for (const rule of BRAND_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.brand;
    }
  }

  return 'Beauty Spot';
}

function toPublicImagePath(relativePath) {
  return `/images/products/${relativePath.replace(/\\/g, '/')}`;
}

function createGeneratedProduct(relativePath, index) {
  const extension = path.extname(relativePath).toLowerCase();
  const slug = path.basename(relativePath, extension).toLowerCase();
  const categoryRule = detectCategory(slug);
  const name = slugToName(slug);
  const image = toPublicImagePath(relativePath);
  const badge = createBadge(index);
  const price = categoryRule.basePrice + index * 20;

  return {
    id: index + 1,
    slug,
    name,
    brand: detectBrand(slug),
    price,
    priceValue: price,
    currency: 'MAD',
    category: categoryRule.category,
    image,
    imageUrl: image,
    images: [image],
    featured: index < 4,
    badge,
    stock: 12 + index * 3,
    description: createDescription(name, categoryRule.category),
    availability: 'In stock',
    productUrl: '',
    source: 'image-directory',
  };
}

async function ensureProductsDirectory() {
  await fs.mkdir(productsDirectory, { recursive: true });
}

async function getProductImageFiles() {
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await walk(entryPath)));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension) || SKIPPED_FILES.has(entry.name)) {
        continue;
      }

      files.push(path.relative(productsDirectory, entryPath));
    }

    return files;
  }

  const files = await walk(productsDirectory);
  return files.sort((left, right) => left.localeCompare(right));
}

async function writeGeneratedFile(products) {
  const fileContents = `// This file is auto-generated from data/products.json or frontend/public/images/products.\n// Do not edit it manually. Use src/data/products.js for overrides.\n\nconst generatedProducts = ${JSON.stringify(products, null, 2)};\n\nexport default generatedProducts;\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, fileContents, 'utf8');
}

async function readCatalogProducts() {
  try {
    const raw = await fs.readFile(catalogJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    return parsed.map((product, index) => normalizeCatalogProduct(product, index));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function main() {
  await ensureProductsDirectory();
  const catalogProducts = await readCatalogProducts();
  const generatedProducts =
    catalogProducts.length > 0
      ? catalogProducts
      : (await getProductImageFiles()).map((fileName, index) => createGeneratedProduct(fileName, index));

  await writeGeneratedFile(generatedProducts);

  console.log(
    `[products] Generated ${generatedProducts.length} product entr${generatedProducts.length === 1 ? 'y' : 'ies'} from ${
      catalogProducts.length > 0 ? catalogJsonPath : productsDirectory
    }`
  );
}

main().catch((error) => {
  console.error('[products] Failed to generate product data:', error);
  process.exitCode = 1;
});
