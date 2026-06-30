#!/usr/bin/env node
/**
 * Mark store-page featured products in Airtable and set Category Display.
 *
 * Requires: AIRTABLE_ACCESS_TOKEN, AIRTABLE_BASE_ID
 *
 * Usage:
 *   node scripts/sync-store-featured-airtable.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'data', 'store-featured-config.json');
const DEV_VARS_PATH = path.join(ROOT, '.dev.vars');

function loadDevVars() {
  if (!fs.existsSync(DEV_VARS_PATH)) return;
  const lines = fs.readFileSync(DEV_VARS_PATH, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDevVars();

const AIRTABLE_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = process.env.AIRTABLE_PRODUCTS_TABLE || 'Products';
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com';

const dryRun = process.argv.includes('--dry-run');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllRecords() {
  const records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);

  return records;
}

async function updateRecord(recordId, fields) {
  if (dryRun) {
    console.log(`  [dry-run] PATCH ${recordId}:`, JSON.stringify(fields));
    return;
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Airtable update failed: ${response.status} ${await response.text()}`);
  }
}

function inferCollection(handle) {
  if (handle.includes('-tshirt')) return 't-shirts';
  if (handle.includes('-hoodie')) return 'hoodies';
  if (handle.includes('-bracelet')) return 'bracelets';
  if (handle.includes('-chain')) return 'chains';
  return '';
}

function imageUrlsForHandle(handle) {
  return JSON.stringify([
    `${SITE_ORIGIN}/images/products/${handle}-product.webp`,
    `${SITE_ORIGIN}/images/products/${handle}-lifestyle.webp`,
  ]);
}

async function main() {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('Missing AIRTABLE_ACCESS_TOKEN or AIRTABLE_BASE_ID');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const featuredByHandle = new Map();

  for (const [categoryDisplay, section] of Object.entries(config.featuredSections)) {
    for (const handle of section.handles) {
      featuredByHandle.set(handle, {
        categoryDisplay,
        collection: inferCollection(handle),
        price: section.fallbackPrices[handle],
      });
    }
  }

  const records = await fetchAllRecords();
  const byHandle = new Map();

  for (const record of records) {
    const handle = record.fields?.Handle;
    if (!handle) continue;
    if (!byHandle.has(handle)) byHandle.set(handle, record);
  }

  let updated = 0;

  for (const [handle, meta] of featuredByHandle) {
    const record = byHandle.get(handle);
    if (!record) {
      console.warn(`⚠️ No Airtable record for handle: ${handle}`);
      continue;
    }

    const fields = {
      Featured: true,
      'Category Display': meta.categoryDisplay,
      Collection: meta.collection,
      'Image URLs': imageUrlsForHandle(handle),
    };

    if (meta.price != null) {
      fields['Variant Price'] = meta.price;
    }

    console.log(`✏️  ${handle} → Featured, ${meta.categoryDisplay}`);
    await updateRecord(record.id, fields);
    updated++;
    await sleep(220);
  }

  // Clear Featured on other handles (one record per handle)
  for (const [handle, record] of byHandle) {
    if (featuredByHandle.has(handle)) continue;
    if (record.fields?.Featured !== true) continue;

    console.log(`🧹 ${handle} → clear Featured`);
    await updateRecord(record.id, { Featured: false });
    updated++;
    await sleep(220);
  }

  console.log(`\n✅ Done. ${updated} record(s) updated${dryRun ? ' (dry-run)' : ''}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
