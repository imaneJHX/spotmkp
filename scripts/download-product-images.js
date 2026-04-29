#!/usr/bin/env node
'use strict';

const { runImageDownloader } = require('./download-images');

runImageDownloader().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
