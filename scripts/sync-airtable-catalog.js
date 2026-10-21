#!/usr/bin/env node
/**
 * Copy the shop's products into the Airtable "Catalog" table (Kiosk Insights).
 *
 * One row per product that has lifestyle photography; its Images field gets
 * the lifestyle shots first (the gallery cover), then studio shots and 3D
 * renders, up to 10. Rows are matched on "Product ID", so running it again
 * updates prices, status and photos without touching your Notes. Products
 * without lifestyle photos are left out (rows already there are kept).
 *
 * Requires AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID (env or .dev.vars).
 * Images are fetched by Airtable from SITE_ORIGIN (default the live site),
 * so deploy new photos before syncing.
 *
 * Usage:
 *   node scripts/sync-airtable-catalog.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { loadDevVars } = require('./load-dev-vars');

loadDevVars();

const ROOT = path.resolve(__dirname, '..');
const TOKEN = process.env.AIRTABLE_ACCESS_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_CATALOG_TABLE || 'Catalog';
const ORIGIN = (process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com').replace(/\/$/, '');
const DRY = process.argv.includes('--dry-run');
const MAX_IMAGES = 10;

const CATEGORY = {
  apparel: 'Apparel', quotes: 'Words to wear', headwear: 'Headwear', skate: 'Skate', accessories: 'Accessories',
  travel: 'Travel', hunt: 'Lost & Found', films: 'Films', luts: 'LUT packs',
};
const DIGITAL = ['films', 'luts', 'mixes'];

function loadCatalog() {
  globalThis.window = globalThis;
  require(path.join(ROOT, 'js', 'kiosk-content.js'));
  return (globalThis.window.KIOSK_CONTENT || {}).products || [];
}

const exists = (p) => p && fs.existsSync(path.join(ROOT, p));

function imagesOf(p) {
  const ways = p.colorways || [];
  const out = [];
  const add = (p2) => { if (exists(p2) && !out.includes(p2)) out.push(p2); };
  ways.forEach((w) => (w.lifestyle || []).forEach(add));
  (p.lifestyle || []).forEach(add);
  const lifestyle = out.length;
  [p.shopifyHandle, ...ways.map((w) => w.shopifyHandle)].filter(Boolean).forEach((h) => add(`images/products/${h}-product.webp`));
  add(p.image);
  ways.forEach((w) => add(w.image));
  const renders = path.join(ROOT, 'images', 'shop', '3d');
  if (fs.existsSync(renders)) fs.readdirSync(renders).filter((f) => f.startsWith(`${p.id}-`)).sort().forEach((f) => add(`images/shop/3d/${f}`));
  return { lifestyle, urls: out.slice(0, MAX_IMAGES).map((u) => `${ORIGIN}/${u}`) };
}

function fieldsOf(p, urls) {
  const ways = p.colorways || [];
  const status = p.pickup ? 'Pickup only' : p.status === 'available' ? 'Available' : 'Coming soon';
  const digital = DIGITAL.includes(p.category);
  return {
    Product: p.title,
    'Product ID': p.id,
    Status: status,
    Category: CATEGORY[p.category] || p.category,
    Price: p.price,
    Type: digital ? 'Digital' : 'Physical',
    Colourways: digital ? '' : ways.map((w) => `${w.name}${w.status && w.status !== p.status ? ` (${w.status})` : ''}`).join('\n'),
    Sizes: (p.sizes || []).map((s) => (s === 'OS' ? 'One size' : s)),
    Details: p.detail || '',
    Quote: p.quote || '',
    Badge: p.badge || '',
    Added: p.added || null,
    'Shopify Handles': [...new Set([p.shopifyHandle, ...ways.map((w) => w.shopifyHandle)].filter(Boolean))].join('\n'),
    Store: p.store || 'kiosk',
    'Site Link': `${ORIGIN}/vault?p=${encodeURIComponent(p.id)}`,
    Images: urls.map((url) => ({ url })),
  };
}

async function upsert(records) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['Product ID'] }, typecast: true, records }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
  return data;
}

async function main() {
  const rows = [];
  let skipped = 0;
  for (const p of loadCatalog()) {
    const { lifestyle, urls } = imagesOf(p);
    if (!lifestyle) { skipped += 1; continue; }
    rows.push({ fields: fieldsOf(p, urls) });
  }
  console.log(`${rows.length} products with lifestyle photos; ${skipped} without (left out).`);
  if (DRY) {
    rows.forEach((r) => console.log(`  ${r.fields['Product ID']}: ${r.fields.Status}, $${r.fields.Price}, ${r.fields.Images.length} images`));
    return;
  }
  if (!TOKEN || !BASE) throw new Error('Set AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID (env or .dev.vars).');
  for (let i = 0; i < rows.length; i += 10) {
    const res = await upsert(rows.slice(i, i + 10));
    console.log(`  synced ${Math.min(i + 10, rows.length)}/${rows.length} (${(res.createdRecords || []).length} new)`);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
