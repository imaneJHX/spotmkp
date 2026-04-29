import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const brandsFilePath = path.join(projectRoot, 'src', 'data', 'brands.js');
const envFilePath = path.join(projectRoot, '.env');
const publicBrandsDir = path.join(projectRoot, 'public', 'brands');

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const skipDownload = args.has('--skip-download');
const requestDelayMs = 250;
const supportedExtensions = ['svg', 'png', 'webp', 'jpg', 'jpeg'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeValue(value, depth = 0) {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]';
    }

    return `[\n${value.map((item) => `${childIndent}${serializeValue(item, depth + 1)}`).join(',\n')}\n${indent}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    return `{\n${entries
      .map(([key, entryValue]) => `${childIndent}${key}: ${serializeValue(entryValue, depth + 1)}`)
      .join(',\n')}\n${indent}}`;
  }

  return JSON.stringify(value);
}

function serializeBrandsFile(brands) {
  return `// Local overrides:
// - Put optional logo files in frontend/public/brands/ using the brand \`id\`
//   (example: public/brands/olaplex.svg or public/brands/olaplex.png).
// - Brandfetch support is prepared via \`domain\` + \`logoSource: 'brandfetch'\`.
//   Brandfetch's public Logo API is intended for hotlinking, so local caching
//   should only be used with logos you are allowed to store locally.
const brands = ${serializeValue(brands, 0)};

export default brands;
`;
}

async function readEnvFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const entries = {};

    for (const rawLine of fileContent.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      entries[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }

    return entries;
  } catch {
    return {};
  }
}

function getBrandfetchClientId(envValues) {
  return (
    process.env.BRANDFETCH_CLIENT_ID ||
    process.env.VITE_BRANDFETCH_CLIENT_ID ||
    envValues.BRANDFETCH_CLIENT_ID ||
    envValues.VITE_BRANDFETCH_CLIENT_ID ||
    ''
  ).trim();
}

function buildBrandfetchLogoCandidates(domain, clientId) {
  if (!domain || !clientId) {
    return [];
  }

  const normalizedDomain = encodeURIComponent(String(domain).trim());
  const horizontalQuery = new URLSearchParams({
    c: clientId,
    w: '400',
    h: '200',
  }).toString();
  const iconQuery = new URLSearchParams({
    c: clientId,
    w: '180',
    h: '180',
  }).toString();

  return [
    `https://cdn.brandfetch.io/${normalizedDomain}/theme/light/fallback/404/logo?${horizontalQuery}`,
    `https://cdn.brandfetch.io/${normalizedDomain}/fallback/404/icon.png?${iconQuery}`,
  ];
}

async function loadBrands() {
  const moduleUrl = `${pathToFileURL(brandsFilePath).href}?ts=${Date.now()}`;
  const importedModule = await import(moduleUrl);
  return Array.isArray(importedModule.default) ? importedModule.default : [];
}

async function findLocalLogoFile(brandId) {
  for (const extension of supportedExtensions) {
    const candidatePath = path.join(publicBrandsDir, `${brandId}.${extension}`);

    try {
      const stats = await fs.stat(candidatePath);
      if (stats.isFile()) {
        return {
          publicPath: `/brands/${brandId}.${extension}`,
          absolutePath: candidatePath,
          extension,
        };
      }
    } catch {
      // ignore missing file
    }
  }

  return null;
}

function getExtensionFromContentType(contentType) {
  const normalized = String(contentType || '').toLowerCase();

  if (normalized.includes('image/svg')) {
    return 'svg';
  }

  if (normalized.includes('image/png')) {
    return 'png';
  }

  if (normalized.includes('image/webp')) {
    return 'webp';
  }

  if (normalized.includes('image/jpeg') || normalized.includes('image/jpg')) {
    return 'jpg';
  }

  return null;
}

async function removeOtherLocalVariants(brandId, keepExtension) {
  for (const extension of supportedExtensions) {
    if (extension === keepExtension) {
      continue;
    }

    const candidatePath = path.join(publicBrandsDir, `${brandId}.${extension}`);

    try {
      await fs.unlink(candidatePath);
    } catch {
      // ignore
    }
  }
}

async function downloadBrandLogo(brand, clientId) {
  const candidates = buildBrandfetchLogoCandidates(brand.domain, clientId);
  const failures = [];

  for (const [index, candidateUrl] of candidates.entries()) {
    const candidateLabel = `source-${index + 1}`;

    try {
      const response = await fetch(candidateUrl, {
        method: 'GET',
        headers: {
          Accept: 'image/*',
          Referer: 'http://localhost:5173/',
        },
      });

      if (!response.ok) {
        failures.push(`${candidateLabel} -> HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      const extension = getExtensionFromContentType(contentType);

      if (!extension) {
        failures.push(`${candidateLabel} -> unsupported content-type ${contentType || 'unknown'}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const absolutePath = path.join(publicBrandsDir, `${brand.id}.${extension}`);
      const publicPath = `/brands/${brand.id}.${extension}`;

      await fs.writeFile(absolutePath, buffer);
      await removeOtherLocalVariants(brand.id, extension);

      return {
        publicPath,
        absolutePath,
        extension,
        candidateLabel,
      };
    } catch (error) {
      failures.push(`${candidateLabel} -> ${error.message}`);
    }

    await sleep(requestDelayMs);
  }

  throw new Error(failures.join(' | '));
}

async function main() {
  await fs.mkdir(publicBrandsDir, { recursive: true });

  const envValues = await readEnvFile(envFilePath);
  const clientId = getBrandfetchClientId(envValues);
  const brands = await loadBrands();
  const nextBrands = [];
  const summary = {
    local: 0,
    downloaded: 0,
    missing: 0,
    failed: 0,
  };

  console.log(`[brands] Loaded ${brands.length} brand entries from ${brandsFilePath}`);
  console.log(`[brands] Brandfetch client configured: ${clientId ? 'yes' : 'no'}`);

  for (const brand of brands) {
    const localLogo = await findLocalLogoFile(brand.id);

    if (localLogo) {
      summary.local += 1;
      nextBrands.push({ ...brand, logo: localLogo.publicPath });
      console.log(`[brands] ${brand.name}: local logo ${localLogo.publicPath}`);
      continue;
    }

    if (!brand.domain || brand.logoSource !== 'brandfetch') {
      summary.missing += 1;
      nextBrands.push({ ...brand, logo: null });
      console.log(`[brands] ${brand.name}: missing domain or unsupported logo source`);
      continue;
    }

    if (!clientId) {
      summary.failed += 1;
      nextBrands.push({ ...brand, logo: null });
      console.log(`[brands] ${brand.name}: Brandfetch client ID missing`);
      continue;
    }

    if (skipDownload) {
      summary.failed += 1;
      nextBrands.push({ ...brand, logo: null });
      console.log(`[brands] ${brand.name}: download skipped by flag`);
      continue;
    }

    try {
      if (isDryRun) {
        const candidates = buildBrandfetchLogoCandidates(brand.domain, clientId);
        console.log(`[brands] ${brand.name}: dry run, would try ${candidates[0]}`);
        nextBrands.push({ ...brand, logo: null });
      } else {
        const downloadedLogo = await downloadBrandLogo(brand, clientId);
        summary.downloaded += 1;
        nextBrands.push({ ...brand, logo: downloadedLogo.publicPath });
        console.log(`[brands] ${brand.name}: downloaded ${downloadedLogo.publicPath}`);
      }
    } catch (error) {
      summary.failed += 1;
      nextBrands.push({ ...brand, logo: null });
      console.log(`[brands] ${brand.name}: Brandfetch download failed (${error.message})`);
    }

    await sleep(requestDelayMs);
  }

  if (isDryRun) {
    console.log('[brands] Dry run only, no file written.');
  } else {
    await fs.writeFile(brandsFilePath, serializeBrandsFile(nextBrands), 'utf8');
    console.log(`[brands] Updated ${brandsFilePath}`);
  }

  console.log(
    `[brands] Summary: ${summary.local} local, ${summary.downloaded} downloaded, ${summary.failed} failed, ${summary.missing} missing`,
  );
}

main().catch((error) => {
  console.error('[brands] Sync failed:', error);
  process.exitCode = 1;
});
