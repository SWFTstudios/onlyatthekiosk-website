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
  const imageUrls = new Set();

  for (const handle of handles) {
    const entry = manifest[handle];
    const expected = [
      { file: `${handle}-product.webp`, path: entry.productPath },
      { file: `${handle}-lifestyle.webp`, path: entry.lifestylePath },
      { file: `${handle}-lifestyle-2.webp`, path: entry.lifestyle2Path },
    ];

    if (expected.some(({ file, path: imagePath }) => !imagePath || !fs.existsSync(path.join(PRODUCTS_DIR, file)))) {
      console.error(`❌ Missing files for ${handle}`);
      missing++;
      continue;
    }

    if (entry.status === 'optimized' || entry.status === 'synced') optimized++;
    expected.forEach(({ path: imagePath }) => imageUrls.add(imagePath));
  }

  const webpCount = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.webp')).length;

  console.log('\n📊 Product Image Verification');
  console.log('='.repeat(40));
  console.log(`Products in manifest: ${handles.length}`);
  console.log(`WebP files on disk:   ${webpCount}`);
  console.log(`Unique image URLs:    ${imageUrls.size}`);
  console.log(`Status optimized+:    ${optimized}`);
  console.log(`Incomplete image sets:${missing}`);

  const pass = handles.length === 80 && webpCount === 240 && imageUrls.size === 240 && missing === 0;
  console.log(pass ? '\n✅ All checks passed' : '\n❌ Some checks failed');
  process.exit(pass ? 0 : 1);
}

main();
