#!/usr/bin/env node
'use strict';

const path = require('path');
const dotenv = require('dotenv');
const {
  logError,
  logInfo,
  logOk,
  logWarn,
  readJsonArray,
} = require('./lib/product-scraper-utils');
const { mapCatalogProductToProjectDocument } = require('./lib/catalog-normalizer.cjs');

function parseArg(flagName) {
  const index = process.argv.indexOf(flagName);
  return index !== -1 ? process.argv[index + 1] : '';
}

async function main() {
  const rootDir = process.cwd();
  const backendEnvPath = path.resolve(rootDir, 'backend/.env');
  const productsJsonPath = path.resolve(
    rootDir,
    parseArg('--json') || 'data/products.json'
  );

  dotenv.config({ path: backendEnvPath, override: false });

  let mongoose;
  let Product;

  try {
    mongoose = require(path.resolve(rootDir, 'backend/node_modules/mongoose'));
    Product = require(path.resolve(rootDir, 'backend/models/Product'));
  } catch (error) {
    throw new Error(
      'MongoDB import requires backend dependencies. Run "npm --prefix backend install" first.'
    );
  }

  const scrapedProducts = await readJsonArray(productsJsonPath);
  if (scrapedProducts.length === 0) {
    logWarn(`No scraped products found in ${productsJsonPath}. Run the Zwine scraper first.`);
    return;
  }

  const mongoUri = parseArg('--mongo-uri') || process.env.MONGO_URI || 'mongodb://localhost:27017/beautyspot';
  logInfo(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    // Upsert keeps reruns idempotent while preserving the existing project collection.
    const operations = scrapedProducts
      .filter((product) => product.name)
      .map((product, index) => {
        const mappedProduct = mapCatalogProductToProjectDocument(product, index);

        return {
          updateOne: {
            filter: {
              name: mappedProduct.name,
              brand: mappedProduct.brand || '',
            },
            update: {
              $set: mappedProduct,
            },
            upsert: true,
          },
        };
      });

    if (operations.length === 0) {
      logWarn('No valid product documents were available to import.');
      return;
    }

    const result = await Product.bulkWrite(operations, { ordered: false });
    logOk(
      `MongoDB import complete. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount}.`
    );
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    logError(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}
