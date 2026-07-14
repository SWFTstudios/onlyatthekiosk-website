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
  const lines = content.split('\n');
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

function updateImageSrc(row, imageUrl, position, altText) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);

  // Image Src = col 31, Image Position = 32, Image Alt Text = 33 (0-indexed: 30, 31, 32)
  const IMAGE_SRC_IDX = 30;
  const IMAGE_POS_IDX = 31;
  const IMAGE_ALT_IDX = 32;

  if (cols.length > IMAGE_SRC_IDX) cols[IMAGE_SRC_IDX] = imageUrl;
  if (cols.length > IMAGE_POS_IDX) cols[IMAGE_POS_IDX] = String(position);
  if (cols.length > IMAGE_ALT_IDX && altText) cols[IMAGE_ALT_IDX] = altText;

  return cols.map((col) => {
    if (col.includes(',') || col.includes('"') || col.includes('\n')) {
      return `"${col.replace(/"/g, '""')}"`;
    }
    return col;
  }).join(',');
}

function buildLifestyleRow(firstRow, handle, entry, imageUrl) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < firstRow.length; i++) {
    const ch = firstRow[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);

  // Clear variant-specific fields, keep handle
  const IMAGE_SRC_IDX = 30;
  const IMAGE_POS_IDX = 31;
  const IMAGE_ALT_IDX = 32;

  cols[0] = handle;
  for (let i = 1; i < cols.length; i++) {
    if (i === IMAGE_SRC_IDX) cols[i] = imageUrl;
    else if (i === IMAGE_POS_IDX) cols[i] = '2';
    else if (i === IMAGE_ALT_IDX) cols[i] = entry.lifestyleAlt;
    else if (i >= 1 && i <= 29) cols[i] = '';
  }

  return cols.map((col) => {
    if (!col) return '';
    if (col.includes(',') || col.includes('"') || col.includes('\n')) {
      return `"${col.replace(/"/g, '""')}"`;
    }
    return col;
  }).join(',');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsvRows(content);

  const header = rows[0];
  const dataRows = rows.slice(1);
  const lifestyleRowsByHandle = new Map();
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

    if (isFirstVariantRow(row) && !updatedHandles.has(handle)) {
      const updated = updateImageSrc(row, productUrl, 1, entry.productAlt);
      outputRows.push(updated);
      updatedHandles.add(handle);

      if (!lifestyleRowsByHandle.has(handle)) {
        const lifestyleUrl = absoluteUrl(entry.lifestylePath);
        lifestyleRowsByHandle.set(handle, buildLifestyleRow(row, handle, entry, lifestyleUrl));
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

    if (handle && lifestyleRowsByHandle.has(handle)) {
      const nextHandle = i + 1 < outputRows.length ? getHandleFromRow(outputRows[i + 1]) : null;
      if (nextHandle !== handle) {
        finalRows.push(lifestyleRowsByHandle.get(handle));
        lifestyleRowsByHandle.delete(handle);
      }
    }
    i++;
  }

  // Append any remaining lifestyle rows
  for (const row of lifestyleRowsByHandle.values()) {
    finalRows.push(row);
  }

  if (dryRun) {
    console.log(`[dry-run] Would update ${updatedHandles.size} product image URLs and add ${updatedHandles.size} lifestyle rows`);
    return;
  }

  fs.writeFileSync(CSV_PATH, finalRows.join('\n') + '\n');
  console.log(`✅ Updated ${CSV_PATH}`);
  console.log(`   ${updatedHandles.size} product URLs updated, ${updatedHandles.size} lifestyle rows added`);
}

main();
