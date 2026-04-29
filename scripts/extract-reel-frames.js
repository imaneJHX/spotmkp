#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const {
  ensureDirectory,
  fileExists,
  logError,
  logInfo,
  logOk,
  logWarn,
  normalizeWhitespace,
  slugify,
  toRelativePosix,
  writeJson,
} = require('./lib/product-scraper-utils');

const DEFAULT_CONFIG = {
  inputDir: 'reels',
  outputDir: 'output/images',
  jsonPath: 'data/reels-images.json',
  intervalSeconds: 2,
  quality: 2,
  squareSize: null,
  mode: 'frames',
  supportedExtensions: new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv']),
};

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const options = {
    inputDir: DEFAULT_CONFIG.inputDir,
    outputDir: DEFAULT_CONFIG.outputDir,
    jsonPath: DEFAULT_CONFIG.jsonPath,
    intervalSeconds: DEFAULT_CONFIG.intervalSeconds,
    quality: DEFAULT_CONFIG.quality,
    squareSize: DEFAULT_CONFIG.squareSize,
    mode: DEFAULT_CONFIG.mode,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const current = rawArgs[index];
    const nextValue = rawArgs[index + 1];

    if (current === '--input' && nextValue) {
      options.inputDir = nextValue;
      index += 1;
      continue;
    }

    if (current === '--output' && nextValue) {
      options.outputDir = nextValue;
      index += 1;
      continue;
    }

    if (current === '--json' && nextValue) {
      options.jsonPath = nextValue;
      index += 1;
      continue;
    }

    if (current === '--interval' && nextValue) {
      const parsed = Number.parseFloat(nextValue);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.intervalSeconds = parsed;
      }
      index += 1;
      continue;
    }

    if (current === '--quality' && nextValue) {
      const parsed = Number.parseInt(nextValue, 10);
      if (Number.isInteger(parsed) && parsed >= 2 && parsed <= 31) {
        options.quality = parsed;
      }
      index += 1;
      continue;
    }

    if (current === '--square') {
      if (nextValue && !nextValue.startsWith('--')) {
        const parsed = Number.parseInt(nextValue, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          options.squareSize = parsed;
        }
        index += 1;
      } else {
        options.squareSize = 1080;
      }
      continue;
    }

    if (current === '--mode' && nextValue) {
      options.mode = normalizeMode(nextValue);
      index += 1;
      continue;
    }

    if (current === '--thumbnail-middle') {
      options.mode = 'thumbnail';
    }
  }

  return options;
}

function normalizeMode(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (normalized === 'thumbnail' || normalized === 'both') {
    return normalized;
  }

  return 'frames';
}

function sanitizeBaseName(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return slugify(baseName);
}

function createSquareFilter(size) {
  if (!size) {
    return '';
  }

  return `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},setsar=1`;
}

function buildFrameFilter(intervalSeconds, squareSize) {
  const filters = [`fps=1/${intervalSeconds}`];
  const squareFilter = createSquareFilter(squareSize);
  if (squareFilter) {
    filters.push(squareFilter);
  }

  return filters.join(',');
}

function buildThumbnailFilter(squareSize) {
  const filters = [];
  const squareFilter = createSquareFilter(squareSize);
  if (squareFilter) {
    filters.push(squareFilter);
  }

  return filters.join(',');
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed (${command} ${args.join(' ')}): ${normalizeWhitespace(stderr || stdout)}`
        )
      );
    });
  });
}

async function assertFfmpegAvailable() {
  try {
    await runCommand('ffmpeg', ['-version']);
    await runCommand('ffprobe', ['-version']);
  } catch (error) {
    throw new Error(
      'FFmpeg / ffprobe introuvable dans le PATH. Installez FFmpeg puis relancez le script.'
    );
  }
}

async function getVideoFiles(inputDirectory, supportedExtensions) {
  const entries = await fs.readdir(inputDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));
}

async function clearGeneratedFiles(outputDirectory, baseName) {
  try {
    const entries = await fs.readdir(outputDirectory, { withFileTypes: true });
    const matcher = new RegExp(`^${baseName}-(frame-\\d{3}|thumb)\\.jpg$`, 'i');

    for (const entry of entries) {
      if (!entry.isFile() || !matcher.test(entry.name)) {
        continue;
      }

      await fs.unlink(path.join(outputDirectory, entry.name));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function collectGeneratedFrames(outputDirectory, baseName, rootDir) {
  const entries = await fs.readdir(outputDirectory, { withFileTypes: true });
  const matcher = new RegExp(`^${baseName}-frame-(\\d{3})\\.jpg$`, 'i');

  return entries
    .filter((entry) => entry.isFile() && matcher.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => toRelativePosix(rootDir, path.join(outputDirectory, entry.name)));
}

async function getDurationInSeconds(videoPath) {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]);

  const duration = Number.parseFloat(normalizeWhitespace(stdout));
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

async function extractFrames(videoPath, outputDirectory, baseName, options) {
  const outputPattern = path.join(outputDirectory, `${baseName}-frame-%03d.jpg`);
  const filter = buildFrameFilter(options.intervalSeconds, options.squareSize);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', videoPath, '-vf', filter, '-q:v', String(options.quality), outputPattern];

  await runCommand('ffmpeg', args);
}

async function extractMiddleThumbnail(videoPath, outputDirectory, baseName, options) {
  const duration = await getDurationInSeconds(videoPath);
  if (!duration) {
    logWarn(`Impossible de lire la durée de ${path.basename(videoPath)}. Thumbnail ignorée.`);
    return null;
  }

  const thumbnailPath = path.join(outputDirectory, `${baseName}-thumb.jpg`);
  const middleSecond = Math.max(duration / 2, 0);
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    middleSecond.toFixed(2),
    '-i',
    videoPath,
    '-frames:v',
    '1',
  ];

  const thumbnailFilter = buildThumbnailFilter(options.squareSize);
  if (thumbnailFilter) {
    args.push('-vf', thumbnailFilter);
  }

  args.push('-q:v', String(options.quality), thumbnailPath);
  await runCommand('ffmpeg', args);

  return thumbnailPath;
}

async function main() {
  const cliOptions = parseArgs();
  const rootDir = process.cwd();
  const inputDirectory = path.resolve(rootDir, cliOptions.inputDir);
  const outputDirectory = path.resolve(rootDir, cliOptions.outputDir);
  const jsonPath = path.resolve(rootDir, cliOptions.jsonPath);

  logInfo(`Input directory: ${inputDirectory}`);
  logInfo(`Output directory: ${outputDirectory}`);
  logInfo(`JSON output: ${jsonPath}`);
  logInfo(`Mode: ${cliOptions.mode}`);

  await assertFfmpegAvailable();
  await ensureDirectory(inputDirectory);
  await ensureDirectory(outputDirectory);
  await ensureDirectory(path.dirname(jsonPath));

  const videoFiles = await getVideoFiles(inputDirectory, DEFAULT_CONFIG.supportedExtensions);
  if (videoFiles.length === 0) {
    logWarn('Aucune vidéo trouvée dans le dossier reels. Ajoutez vos fichiers puis relancez.');
    await writeJson(jsonPath, []);
    return;
  }

  const manifest = [];

  for (const videoFile of videoFiles) {
    const absoluteVideoPath = path.join(inputDirectory, videoFile);
    const baseName = sanitizeBaseName(videoFile);

    logInfo(`Processing video: ${videoFile}`);
    await clearGeneratedFiles(outputDirectory, baseName);

    const entry = {
      video: videoFile,
      frames: [],
    };

    if (cliOptions.mode === 'frames' || cliOptions.mode === 'both') {
      await extractFrames(absoluteVideoPath, outputDirectory, baseName, cliOptions);
      entry.frames = await collectGeneratedFrames(outputDirectory, baseName, rootDir);
      logOk(`Extracted ${entry.frames.length} frame(s) from ${videoFile}`);
    }

    if (cliOptions.mode === 'thumbnail' || cliOptions.mode === 'both') {
      const thumbnailPath = await extractMiddleThumbnail(
        absoluteVideoPath,
        outputDirectory,
        baseName,
        cliOptions
      );

      if (thumbnailPath && (await fileExists(thumbnailPath))) {
        entry.thumbnail = toRelativePosix(rootDir, thumbnailPath);
        logOk(`Extracted thumbnail for ${videoFile}`);
      }
    }

    manifest.push(entry);
  }

  await writeJson(jsonPath, manifest);
  logOk(`Saved manifest: ${jsonPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    logError(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}
