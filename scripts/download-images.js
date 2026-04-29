#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const {
  buildProductKey,
  ensureDirectory,
  fileExists,
  isUrlAllowedByRobots,
  loadConfig,
  logError,
  logInfo,
  logOk,
  logWarn,
  normalizeWhitespace,
  readJsonArray,
  sleep,
  toRelativePosix,
  writeJson,
} = require('./lib/product-scraper-utils');

function getHeaders(config) {
  return {
    'User-Agent': config.scraper.userAgent,
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    Referer: config.baseUrl,
    ...config.scraper.headers,
  };
}

function extensionFromContentType(contentType) {
  const normalized = normalizeWhitespace(contentType).toLowerCase();
  const map = new Map([
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/avif', '.avif'],
    ['image/gif', '.gif'],
    ['image/svg+xml', '.svg'],
  ]);

  return map.get(normalized) || '';
}

function extensionFromUrl(imageUrl) {
  try {
    const parsed = new URL(imageUrl);
    const extension = path.extname(parsed.pathname).toLowerCase();
    return extension && extension.length <= 5 ? extension : '';
  } catch (error) {
    const extension = path.extname(String(imageUrl || '')).toLowerCase();
    return extension && extension.length <= 5 ? extension : '';
  }
}

async function findNextImageIndex(directory, prefix) {
  let maxIndex = 0;

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const pattern = new RegExp(`^${prefix}-(\\d+)`, 'i');

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const match = entry.name.match(pattern);
      if (!match) {
        continue;
      }

      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value) && value > maxIndex) {
        maxIndex = value;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return maxIndex + 1;
}

async function loadRobotsTxt(config) {
  if (config.scraper.respectRobotsTxt === false) {
    return '';
  }

  const robotsUrl = new URL('/robots.txt', config.baseUrl).toString();

  try {
    const response = await axios.get(robotsUrl, {
      headers: getHeaders(config),
      timeout: config.scraper.timeoutMs,
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      return '';
    }

    return String(response.data || '');
  } catch (error) {
    logWarn(`robots.txt check failed for image download: ${error.message}`);
    return '';
  }
}

function assertRobotsAllowed(robotsTxt, targetUrl, config) {
  if (config.scraper.respectRobotsTxt === false) {
    return;
  }

  const robotsUserAgent = config.scraper.robotsUserAgent || '*';
  const allowed = isUrlAllowedByRobots(robotsTxt, targetUrl, robotsUserAgent);
  if (!allowed) {
    throw new Error(`Blocked by robots.txt for ${targetUrl}`);
  }
}

async function downloadImage(imageUrl, targetPath, config, robotsTxt) {
  assertRobotsAllowed(robotsTxt, imageUrl, config);

  const response = await axios.get(imageUrl, {
    headers: getHeaders(config),
    timeout: config.scraper.timeoutMs,
    responseType: 'stream',
    maxRedirects: 5,
  });

  await pipeline(response.data, createWriteStream(targetPath));
  return response.headers['content-type'] || '';
}

async function appendFailureLog(logPath, message) {
  if (!logPath) {
    return;
  }

  await ensureDirectory(path.dirname(logPath));
  await fs.appendFile(logPath, `${message}\n`, 'utf8');
}

async function runImageDownloader(configPathArg) {
  const { configPath, config } = loadConfig(configPathArg);
  const rootDir = process.cwd();
  const productsJsonPath = path.resolve(rootDir, config.output.productsJsonPath);
  const imageDirectory = path.resolve(rootDir, config.output.imageDownloadDir);
  const imagePrefix = config.output.imageFilePrefix || 'product';
  const failedImagesLogPath = config.output.failedImagesLogPath
    ? path.resolve(rootDir, config.output.failedImagesLogPath)
    : '';
  const products = await readJsonArray(productsJsonPath);
  const robotsTxt = await loadRobotsTxt(config);

  logInfo(`Loaded config: ${configPath}`);
  logInfo(`Downloading images into ${imageDirectory}`);

  if (products.length === 0) {
    logWarn('No products found in products.json. Run the scraper first.');
    return;
  }

  await ensureDirectory(imageDirectory);

  let nextIndex = await findNextImageIndex(imageDirectory, imagePrefix);
  const imageReuseMap = new Map();
  let downloadCount = 0;

  for (const product of products) {
    const imageUrl = normalizeWhitespace(product.imageUrl || product.image);
    if (!imageUrl) {
      logWarn(`Skipping image download for "${product.name || buildProductKey(product)}" because image URL is missing.`);
      continue;
    }

    const existingLocalPath = product.localImage ? path.resolve(rootDir, product.localImage) : '';
    if (existingLocalPath && (await fileExists(existingLocalPath))) {
      imageReuseMap.set(imageUrl, product.localImage);
      continue;
    }

    if (imageReuseMap.has(imageUrl)) {
      product.localImage = imageReuseMap.get(imageUrl);
      continue;
    }

    const paddedIndex = String(nextIndex).padStart(3, '0');
    const baseFileName = `${imagePrefix}-${paddedIndex}`;
    let provisionalExtension = extensionFromUrl(imageUrl) || '.jpg';
    let absolutePath = path.join(imageDirectory, `${baseFileName}${provisionalExtension}`);

    try {
      logInfo(`Downloading image for "${product.name || baseFileName}"`);
      const contentType = await downloadImage(imageUrl, absolutePath, config, robotsTxt);
      const contentTypeExtension = extensionFromContentType(contentType);

      if (contentTypeExtension && contentTypeExtension !== provisionalExtension) {
        const correctedPath = path.join(imageDirectory, `${baseFileName}${contentTypeExtension}`);
        await fs.rename(absolutePath, correctedPath);
        absolutePath = correctedPath;
      }

      product.localImage = toRelativePosix(rootDir, absolutePath);
      imageReuseMap.set(imageUrl, product.localImage);
      downloadCount += 1;
      nextIndex += 1;
    } catch (error) {
      logWarn(`Failed to download "${imageUrl}": ${error.message}`);
      await appendFailureLog(
        failedImagesLogPath,
        `[${new Date().toISOString()}] ${imageUrl} | ${error.message}`
      );
      product.localImage = null;
      try {
        await fs.unlink(absolutePath);
      } catch (unlinkError) {
        // Ignore cleanup errors.
      }
    }

    if (config.scraper.delayMs) {
      await sleep(config.scraper.delayMs);
    }
  }

  await writeJson(productsJsonPath, products);
  logOk(`Updated ${productsJsonPath} with localImage paths.`);
  logOk(`Downloaded ${downloadCount} new image(s).`);
}

async function main() {
  const configArgIndex = process.argv.indexOf('--config');
  const configPathArg = configArgIndex !== -1 ? process.argv[configArgIndex + 1] : undefined;
  await runImageDownloader(configPathArg);
}

module.exports = {
  runImageDownloader,
};

if (require.main === module) {
  main().catch((error) => {
    logError(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}
