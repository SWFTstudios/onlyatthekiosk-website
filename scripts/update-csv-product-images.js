#!/usr/bin/env node
/**
 * Update kiosk-shopify-products.csv with unique product image URLs.
 * Adds lifestyle image rows (Image Position 2) per handle.
 *
 * Usage: node scripts/update-csv-product-images.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'kiosk-shopify-products.csv');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com';

function absoluteUrl(relativePath) {
  if (relativePath.startsWith('http')) return relativePath;
  return `${SITE_ORIGIN}${relativePath}`;
}

/**
 * Simple CSV line parser for rows starting with a product handle.
 */
function parseCsvRows(content) {
  const rows = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Handle multiline quoted fields
    while ((line.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += '\n' + lines[i];
    }

    rows.push(line);
    i++;
  }

  return rows;
}

function getHandleFromRow(row) {
  const match = row.match(/^(\d{3}-(?:gold|silver|black|white)-(?:chain|bracelet|hoodie|tshirt))/);
  return match ? match[1] : null;
}

function isFirstVariantRow(row) {
  return /^(\d{3}-(?:gold|silver|black|white)-(?:chain|bracelet|hoodie|tshirt)),([^,]+),/.test(row);
}

function parseCsvRow(row) {
  row = row.replace(/\r$/, '');
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

function serializeCsvRow(cols) {
  return cols.map((col) => {
    if (col.includes(',') || col.includes('"') || col.includes('\n')) {
      return `"${col.replace(/"/g, '""')}"`;
    }
    return col;
  }).join(',');
}

function updateImageSrc(row, imageUrl, position, altText) {
  const cols = parseCsvRow(row);

  // Shopify CSV columns (0-indexed).
  const IMAGE_SRC_IDX = 31;
  const IMAGE_POS_IDX = 32;
  const IMAGE_ALT_IDX = 33;

  if (cols.length > IMAGE_SRC_IDX) cols[IMAGE_SRC_IDX] = imageUrl;
  if (cols.length > IMAGE_POS_IDX) cols[IMAGE_POS_IDX] = String(position);
  if (cols.length > IMAGE_ALT_IDX && altText) cols[IMAGE_ALT_IDX] = altText;

  return serializeCsvRow(cols);
}

function buildGalleryRow(firstRow, handle, imageUrl, position, altText) {
  const cols = parseCsvRow(firstRow);
  // Clear variant-specific fields, keep handle
  const IMAGE_SRC_IDX = 31;
  const IMAGE_POS_IDX = 32;
  const IMAGE_ALT_IDX = 33;

  cols[0] = handle;
  for (let i = 1; i < cols.length; i++) {
    if (i === IMAGE_SRC_IDX) cols[i] = imageUrl;
    else if (i === IMAGE_POS_IDX) cols[i] = String(position);
    else if (i === IMAGE_ALT_IDX) cols[i] = altText;
    else cols[i] = '';
  }

  return serializeCsvRow(cols);
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsvRows(content);

  const header = rows[0];
  const dataRows = rows.slice(1);
  const galleryRowsByHandle = new Map();
  const outputRows = [header];
  const updatedHandles = new Set();

  for (const row of dataRows) {
    const handle = getHandleFromRow(row);
    if (!handle || !manifest[handle]) {
      outputRows.push(row);
      continue;
    }

    const entry = manifest[handle];
    const productUrl = absoluteUrl(entry.productPath);

    // Remove previously generated image-only rows so the update is idempotent.
    if (!isFirstVariantRow(row) && parseCsvRow(row)[31]) {
      continue;
    }

    if (isFirstVariantRow(row) && !updatedHandles.has(handle)) {
      const updated = updateImageSrc(row, productUrl, 1, entry.productAlt);
      outputRows.push(updated);
      updatedHandles.add(handle);

      if (!galleryRowsByHandle.has(handle)) {
        galleryRowsByHandle.set(handle, [
          buildGalleryRow(row, handle, absoluteUrl(entry.lifestylePath), 2, entry.lifestyleAlt),
          buildGalleryRow(row, handle, absoluteUrl(entry.lifestyle2Path), 3, entry.lifestyle2Alt),
        ]);
      }
    } else {
      outputRows.push(row);
    }
  }

  // Insert lifestyle rows after each handle's last variant row
  const finalRows = [header];
  let i = 1;
  while (i < outputRows.length) {
    finalRows.push(outputRows[i]);
    const handle = getHandleFromRow(outputRows[i]);

    if (handle && galleryRowsByHandle.has(handle)) {
      const nextHandle = i + 1 < outputRows.length ? getHandleFromRow(outputRows[i + 1]) : null;
      if (nextHandle !== handle) {
        finalRows.push(...galleryRowsByHandle.get(handle));
        galleryRowsByHandle.delete(handle);
      }
    }
    i++;
  }

  // Append any remaining lifestyle rows
  for (const rowsForHandle of galleryRowsByHandle.values()) {
    finalRows.push(...rowsForHandle);
  }

  if (dryRun) {
    console.log(`[dry-run] Would update ${updatedHandles.size} product image URLs and add ${updatedHandles.size * 2} lifestyle rows`);
    return;
  }

  fs.writeFileSync(CSV_PATH, finalRows.join('\n') + '\n');
  console.log(`✅ Updated ${CSV_PATH}`);
  console.log(`   ${updatedHandles.size} product URLs updated, ${updatedHandles.size * 2} lifestyle rows added`);
}

main();
