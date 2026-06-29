#!/usr/bin/env node
/**
 * Build product-image-manifest.json from kiosk-shopify-products.csv
 * Usage: node scripts/build-product-image-manifest.js
 */

const fs = require('fs');
const path = require('path');
const { buildPrompts } = require('./product-image-prompts');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'kiosk-shopify-products.csv');
const OUT_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');

/**
 * Extract unique products from CSV (first row per handle with title).
 */
function parseProductsFromCsv(csvContent) {
  const products = new Map();
  const lines = csvContent.split('\n');

  for (const line of lines) {
    const handleMatch = line.match(/^(\d{3}-(?:gold|silver|black|white)-(?:chain|bracelet|hoodie|tshirt)),([^,]+)/);
    if (!handleMatch) continue;

    const [, handle, title] = handleMatch;
    if (products.has(handle)) continue;

    products.set(handle, { handle, title: title.trim() });
  }

  return products;
}

function buildManifestEntry(handle, title) {
  const prompts = buildPrompts(handle, title);
  const productFilename = `${handle}-product.webp`;
  const lifestyleFilename = `${handle}-lifestyle.webp`;

  return {
    title,
    type: prompts.type,
    variant: prompts.variant,
    number: prompts.number,
    collection: prompts.collection,
    productPrompt: prompts.productPrompt,
    lifestylePrompt: prompts.lifestylePrompt,
    productPath: `/images/products/${productFilename}`,
    lifestylePath: `/images/products/${lifestyleFilename}`,
    productAlt: `${title} product shot`,
    lifestyleAlt: `${title} lifestyle`,
    status: 'pending',
  };
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const products = parseProductsFromCsv(csvContent);

  if (products.size === 0) {
    console.error('No products found in CSV');
    process.exit(1);
  }

  const manifest = {};
  for (const [handle, { title }] of products) {
    manifest[handle] = buildManifestEntry(handle, title);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + '\n');

  const byCollection = {};
  for (const entry of Object.values(manifest)) {
    byCollection[entry.collection] = (byCollection[entry.collection] || 0) + 1;
  }

  console.log(`✅ Wrote ${Object.keys(manifest).length} products to ${OUT_PATH}`);
  console.log('   By collection:', byCollection);
}

main();
