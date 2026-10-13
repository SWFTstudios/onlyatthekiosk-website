#!/usr/bin/env node
/**
 * Extract studio and lifestyle frames from generated 2x2 photo sheets.
 *
 * Usage:
 *   node scripts/extract-product-photo-sheets.js --source /path/to/sheets
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data/product-image-manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'images', 'products');
const OUTPUT_SIZE = 1200;

function getSourceDir() {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex === -1 || !args[sourceIndex + 1]) {
    throw new Error('Provide a photo-sheet directory with --source');
  }
  return path.resolve(args[sourceIndex + 1]);
}

async function extractFrame(sheet, region, output) {
  await sharp(sheet)
    .extract(region)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86, effort: 5 })
    .toFile(output);
}

async function main() {
  const sourceDir = getSourceDir();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let extracted = 0;
  const missing = [];

  for (const handle of Object.keys(manifest).sort()) {
    const sheet = path.join(sourceDir, `${handle}-sheet.jpg`);
    if (!fs.existsSync(sheet)) {
      missing.push(handle);
      continue;
    }

    const metadata = await sharp(sheet).metadata();
    const halfWidth = Math.floor(metadata.width / 2);
    const halfHeight = Math.floor(metadata.height / 2);
    // Generated sheets use a narrow central gutter. A small inset removes it
    // without materially changing the framing.
    // Inset each quadrant enough to remove the sheet gutter and any tiny
    // generator contact-mark artifacts at the extreme corners.
    const inset = Math.max(16, Math.round(Math.min(metadata.width, metadata.height) * 0.03125));
    const frameWidth = halfWidth - inset * 2;
    const frameHeight = halfHeight - inset * 2;
    const frames = [
      {
        suffix: 'product',
        region: { left: inset, top: inset, width: frameWidth, height: frameHeight },
      },
      {
        suffix: 'lifestyle',
        region: { left: halfWidth + inset, top: inset, width: frameWidth, height: frameHeight },
      },
      {
        suffix: 'lifestyle-2',
        region: { left: inset, top: halfHeight + inset, width: frameWidth, height: frameHeight },
      },
    ];

    for (const frame of frames) {
      await extractFrame(
        sheet,
        frame.region,
        path.join(OUTPUT_DIR, `${handle}-${frame.suffix}.webp`)
      );
      extracted++;
    }
    manifest[handle].status = 'optimized';
  }

  if (missing.length) {
    throw new Error(`Missing ${missing.length} sheets: ${missing.join(', ')}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Extracted ${extracted} product photos from ${Object.keys(manifest).length} sheets.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
