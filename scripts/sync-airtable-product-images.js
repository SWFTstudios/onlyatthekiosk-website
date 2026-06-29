#!/usr/bin/env node
/**
 * Sync product image URLs to Airtable Products table.
 *
 * Requires env:
 *   AIRTABLE_ACCESS_TOKEN
 *   AIRTABLE_BASE_ID
 *   AIRTABLE_PRODUCTS_TABLE (optional, default: Products)
 *
 * Usage:
 *   node scripts/sync-airtable-product-images.js [--collection chains] [--dry-run]
 *   node scripts/sync-airtable-product-images.js --remote   # call deployed /api/sync-product-images
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const DEV_VARS_PATH = path.join(ROOT, '.dev.vars');

/**
 * Load key=value pairs from .dev.vars (Wrangler local secrets format).
 */
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

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    collection: args.includes('--collection') ? args[args.indexOf('--collection') + 1] : null,
    dryRun: args.includes('--dry-run'),
    remote: args.includes('--remote'),
  };
}

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

async function updateRecord(recordId, fields, dryRun) {
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

function absoluteUrl(relativePath) {
  if (relativePath.startsWith('http')) return relativePath;
  return `${SITE_ORIGIN}${relativePath}`;
}

async function syncRemote(opts) {
  const siteOrigin = process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com';
  const url = `${siteOrigin}/api/sync-product-images`;
  const headers = { 'Content-Type': 'application/json' };

  if (process.env.IMAGE_SYNC_SECRET) {
    headers.Authorization = `Bearer ${process.env.IMAGE_SYNC_SECRET}`;
  }

  console.log(`\n📤 Calling remote sync: ${url}`);
  const response = await fetch(url, { method: 'POST', headers, body: '{}' });

  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = { raw: body };
  }

  if (!response.ok) {
    console.error('❌ Remote sync failed:', response.status, data);
    process.exit(1);
  }

  console.log('✅ Remote sync complete:', data);

  if (!opts.dryRun && data.synced) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    for (const handle of Object.keys(manifest)) {
      if (manifest[handle].status === 'optimized' || manifest[handle].status === 'pending') {
        manifest[handle].status = 'synced';
      }
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }
}

async function main() {
  const opts = parseArgs();

  if (opts.remote) {
    await syncRemote(opts);
    return;
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn('⚠️  AIRTABLE_ACCESS_TOKEN or AIRTABLE_BASE_ID not set locally.');
    console.warn('   Secrets are available on Cloudflare Pages. Run:');
    console.warn('   npm run sync:airtable-images -- --remote');
    process.exit(0);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let handles = Object.keys(manifest).filter((h) => manifest[h].status === 'optimized' || manifest[h].status === 'synced');

  if (opts.collection) {
    handles = handles.filter((h) => manifest[h].collection === opts.collection);
  }

  console.log(`\n📤 Syncing ${handles.length} products to Airtable...`);

  const records = await fetchAllRecords();
  const byHandle = new Map();

  for (const record of records) {
    const handle = record.fields?.Handle || record.fields?.handle;
    if (handle) byHandle.set(handle, record);
  }

  let synced = 0;
  let missing = 0;

  for (const handle of handles) {
    const entry = manifest[handle];
    const record = byHandle.get(handle);

    if (!record) {
      console.warn(`  ⚠️  No Airtable record for handle: ${handle}`);
      missing++;
      continue;
    }

    const imageUrls = [
      absoluteUrl(entry.productPath),
      absoluteUrl(entry.lifestylePath),
    ];

    await updateRecord(record.id, { 'Image URLs': JSON.stringify(imageUrls) }, opts.dryRun);
    entry.status = 'synced';
    synced++;

    await sleep(220);
  }

  if (!opts.dryRun) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`\n✅ Synced ${synced} records (${missing} handles not found in Airtable)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
