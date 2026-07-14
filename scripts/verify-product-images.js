#!/usr/bin/env node
/**
 * Verify unique product images are in place.
 * Usage: node scripts/verify-product-images.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const PRODUCTS_DIR = path.join(ROOT, 'images', 'products');

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const handles = Object.keys(manifest);
  let missing = 0;
  let optimized = 0;
  const productUrls = new Set();

  for (const handle of handles) {
    const entry = manifest[handle];
    const productFile = path.join(PRODUCTS_DIR, `${handle}-product.webp`);
    const lifestyleFile = path.join(PRODUCTS_DIR, `${handle}-lifestyle.webp`);

    if (!fs.existsSync(productFile) || !fs.existsSync(lifestyleFile)) {
      console.error(`❌ Missing files for ${handle}`);
      missing++;
      continue;
    }

    if (entry.status === 'optimized' || entry.status === 'synced') optimized++;
    productUrls.add(entry.productPath);
  }

  const webpCount = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.webp')).length;

  console.log('\n📊 Product Image Verification');
  console.log('='.repeat(40));
  console.log(`Products in manifest: ${handles.length}`);
  console.log(`WebP files on disk:   ${webpCount}`);
  console.log(`Unique product URLs:  ${productUrls.size}`);
  console.log(`Status optimized+:    ${optimized}`);
  console.log(`Missing file pairs:   ${missing}`);

  const pass = handles.length === 80 && webpCount === 160 && productUrls.size === 80 && missing === 0;
  console.log(pass ? '\n✅ All checks passed' : '\n❌ Some checks failed');
  process.exit(pass ? 0 : 1);
}

main();
