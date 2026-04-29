'use strict';

const fs = require('fs/promises');
const path = require('path');

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

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveUrl(baseUrl, target) {
  if (!target) {
    return '';
  }

  try {
    return new URL(target, baseUrl).toString();
  } catch (error) {
    return String(target || '').trim();
  }
}

function extractUrlFromSrcset(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  const firstEntry = normalized.split(',')[0];
  return normalizeWhitespace(firstEntry.split(' ')[0]);
}

function parseCurrency(text) {
  const normalized = normalizeWhitespace(text);
  const currencyPatterns = [
    { match: /MAD|Dhs|DH/i, currency: 'MAD' },
    { match: /USD|\$/i, currency: 'USD' },
    { match: /EUR|€/i, currency: 'EUR' },
    { match: /GBP|£/i, currency: 'GBP' },
    { match: /AED/i, currency: 'AED' },
    { match: /SAR/i, currency: 'SAR' },
  ];

  for (const pattern of currencyPatterns) {
    if (pattern.match.test(normalized)) {
      return pattern.currency;
    }
  }

  return '';
}

function parsePriceValue(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return null;
  }

  let numeric = normalized.replace(/[^\d,.\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!numeric) {
    return null;
  }

  const lastComma = numeric.lastIndexOf(',');
  const lastDot = numeric.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else {
      numeric = numeric.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const decimalPart = numeric.split(',').pop() || '';
    numeric = decimalPart.length <= 2 ? numeric.replace(/\./g, '').replace(',', '.') : numeric.replace(/,/g, '');
  } else {
    numeric = numeric.replace(/,/g, '');
  }

  numeric = numeric.replace(/\s/g, '');
  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number.isInteger(parsed) ? parsed : Number(parsed.toFixed(2));
}

function parsePrice(text) {
  return {
    price: normalizeWhitespace(text),
    priceValue: parsePriceValue(text),
    currency: parseCurrency(text),
  };
}

function slugify(value) {
  const normalized = normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'product';
}

function buildProductKey(product) {
  const urlKey = normalizeWhitespace(product.productUrl || product.url).toLowerCase();
  if (urlKey) {
    return `url:${urlKey}`;
  }

  const imageKey = normalizeWhitespace(product.imageUrl || product.image).toLowerCase();
  if (imageKey) {
    return `image:${imageKey}`;
  }

  return `name:${slugify(`${product.name}-${product.brand}-${product.price}-${product.category}`)}`;
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  );
}

function toRelativePosix(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).replace(/\\/g, '/');
}

async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
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

async function writeJson(filePath, value) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function loadConfig(configPathArg) {
  const configPath = path.resolve(process.cwd(), configPathArg || 'config/scraper.config.js');
  delete require.cache[configPath];
  const config = require(configPath);
  return { configPath, config };
}

function pickFirstValue(values) {
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function stripComment(value) {
  return String(value || '').split('#')[0].trim();
}

function parseRobotsTxt(robotsTxt) {
  const groups = [];
  const lines = String(robotsTxt || '').split(/\r?\n/);
  let currentGroup = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line) {
      currentGroup = null;
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'user-agent') {
      if (!currentGroup || currentGroup.hasRules) {
        currentGroup = {
          userAgents: [],
          rules: [],
          hasRules: false,
        };
        groups.push(currentGroup);
      }

      currentGroup.userAgents.push(value.toLowerCase());
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    if (key === 'allow' || key === 'disallow') {
      currentGroup.rules.push({
        type: key,
        path: value || '/',
      });
      currentGroup.hasRules = true;
    }
  }

  return groups;
}

function findMatchingRobotsGroups(groups, userAgent) {
  const requestedAgent = String(userAgent || '*').toLowerCase();
  const exactMatches = groups.filter((group) => group.userAgents.includes(requestedAgent));
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return groups.filter((group) => group.userAgents.includes('*'));
}

function getRobotsDecisionForPath(groups, userAgent, targetPath) {
  const matchingGroups = findMatchingRobotsGroups(groups, userAgent);
  if (matchingGroups.length === 0) {
    return true;
  }

  const combinedRules = matchingGroups.flatMap((group) => group.rules);
  const normalizedPath = targetPath || '/';
  let winningRule = null;

  for (const rule of combinedRules) {
    const rulePath = rule.path || '/';
    if (!rulePath) {
      continue;
    }

    if (!normalizedPath.startsWith(rulePath)) {
      continue;
    }

    if (!winningRule || rulePath.length > winningRule.path.length) {
      winningRule = rule;
      continue;
    }

    if (winningRule && rulePath.length === winningRule.path.length && rule.type === 'allow') {
      winningRule = rule;
    }
  }

  if (!winningRule) {
    return true;
  }

  return winningRule.type !== 'disallow';
}

function isUrlAllowedByRobots(robotsTxt, targetUrl, userAgent = '*') {
  if (!normalizeWhitespace(robotsTxt)) {
    return true;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (error) {
    return true;
  }

  const groups = parseRobotsTxt(robotsTxt);
  const targetPath = `${parsedUrl.pathname || '/'}${parsedUrl.search || ''}`;
  return getRobotsDecisionForPath(groups, userAgent, targetPath);
}

module.exports = {
  buildProductKey,
  ensureDirectory,
  extractUrlFromSrcset,
  fileExists,
  isUrlAllowedByRobots,
  loadConfig,
  logError,
  logInfo,
  logOk,
  logWarn,
  normalizeWhitespace,
  parsePrice,
  pickFirstValue,
  readJsonArray,
  resolveUrl,
  slugify,
  sleep,
  stripHtml,
  toRelativePosix,
  writeJson,
};
