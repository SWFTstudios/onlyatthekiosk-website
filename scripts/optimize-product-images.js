#!/usr/bin/env node
/**
 * Optimize raw product images to final WebP output.
 * Usage: node scripts/optimize-product-images.js [--collection chains]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const RAW_DIR = path.join(ROOT, 'images', 'products', 'raw');
const OUT_DIR = path.join(ROOT, 'images', 'products');
const SIZE = 1200;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { collection: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--collection') opts.collection = args[++i];
  }
  return opts;
}

async function optimizeFile(rawPath, webpPath) {
  await sharp(rawPath)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(webpPath);

  const stats = fs.statSync(webpPath);
  return stats.size;
}

async function main() {
  const opts = parseArgs();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  let handles = Object.keys(manifest);
  if (opts.collection) {
    handles = handles.filter((h) => manifest[h].collection === opts.collection);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let optimized = 0;
  const oversized = [];

  for (const handle of handles) {
    for (const kind of ['product', 'lifestyle']) {
      const rawPath = path.join(RAW_DIR, `${handle}-${kind}.png`);
      const webpPath = path.join(OUT_DIR, `${handle}-${kind}.webp`);

      if (!fs.existsSync(rawPath)) continue;

      const size = await optimizeFile(rawPath, webpPath);
      optimized++;

      if (size > 500 * 1024) {
        oversized.push({ file: path.basename(webpPath), kb: Math.round(size / 1024) });
      }
    }

    if (fs.existsSync(path.join(OUT_DIR, `${handle}-product.webp`))) {
      manifest[handle].status = 'optimized';
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✅ Optimized ${optimized} images`);
  if (oversized.length) {
    console.warn('⚠️  Files exceeding 500KB:');
    oversized.forEach(({ file, kb }) => console.warn(`   ${file}: ${kb}KB`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
