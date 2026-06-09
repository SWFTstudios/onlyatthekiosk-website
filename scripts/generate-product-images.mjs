#!/usr/bin/env node
/**
 * Generate AI product photos for every Only at The Kiosk product.
 *
 * - Reads the unique products from the Airtable Products table.
 * - Builds a brand-aligned prompt per product (colorway + category).
 * - Calls OpenAI Images (gpt-image-1) and saves a PNG to images/products/<handle>.png.
 * - Writes images/products/manifest.json mapping handle -> { file, url }.
 * - Resumable: skips products whose image already exists (use --force to redo).
 *
 * Required env vars:
 *   OPENAI_API_KEY          your OpenAI key (sk-...)
 *   AIRTABLE_ACCESS_TOKEN   read access to the Kiosk Insights base
 *   AIRTABLE_BASE_ID        appA3qQw0NAqz8ru3
 * Optional:
 *   SITE_ORIGIN             public origin for image URLs (default https://onlyatthekiosk.com)
 *   IMAGE_QUALITY           low | medium | high  (default medium)
 *   ONLY_HANDLES            comma-separated handles to (re)generate a subset
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... AIRTABLE_ACCESS_TOKEN=pat... AIRTABLE_BASE_ID=appA3qQw0NAqz8ru3 \
 *     node scripts/generate-product-images.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'images', 'products');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com').replace(/\/$/, '');
const QUALITY = process.env.IMAGE_QUALITY || 'medium';
const FORCE = process.argv.includes('--force');
const ONLY = (process.env.ONLY_HANDLES || '').split(',').map((s) => s.trim()).filter(Boolean);

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const PRODUCTS_TABLE = process.env.AIRTABLE_PRODUCTS_TABLE || 'Products';

// ---- Brand-aligned prompt construction ---------------------------------

const SHARED_STYLE =
  'High-end e-commerce product photography, single product centered, seamless soft ' +
  'neutral light-grey studio background, soft diffused lighting with gentle shadow, ' +
  'crisp focus, true-to-life color, premium streetwear catalog aesthetic, square 1:1 ' +
  'framing, no text, no logos, no watermark, no people, no props.';

const CATEGORY_PROMPTS = {
  tshirt: (color) =>
    `A neatly folded ${color} short-sleeve crisp cotton t-shirt, premium heavyweight fabric, clean minimal streetwear basic.`,
  hoodie: (color) =>
    `A neatly folded ${color} heavyweight cotton pullover hoodie, cozy premium streetwear, visible soft fleece texture and drawstrings.`,
  chain: (metal) =>
    `A ${metal} stainless steel cuban-link chain necklace, elegantly coiled, polished reflective links, luxury minimalist jewelry, macro detail.`,
  bracelet: (metal) =>
    `A ${metal} stainless steel link bracelet, polished reflective finish, luxury minimalist jewelry laid in a gentle curve, macro detail.`,
};

const COLOR_WORD = {
  white: 'bright clean white',
  black: 'deep matte black',
  gold: 'warm polished gold-tone',
  silver: 'bright polished silver-tone',
};

// Derive {category, descriptor} from a handle like "001-white-tshirt".
export function describe(handle, typeField) {
  const m = String(handle).match(/^\d+-(white|black|gold|silver)-(tshirt|t-shirt|hoodie|chain|bracelet)$/);
  let category;
  let color;
  if (m) {
    color = m[1];
    category = m[2].replace('t-shirt', 'tshirt');
  } else {
    // Fall back to the Airtable Type field.
    const t = String(typeField || '').toLowerCase();
    if (t.includes('hood')) category = 'hoodie';
    else if (t.includes('chain')) category = 'chain';
    else if (t.includes('bracelet')) category = 'bracelet';
    else category = 'tshirt';
    color = /gold/.test(handle) ? 'gold' : /silver/.test(handle) ? 'silver' : /black/.test(handle) ? 'black' : 'white';
  }
  const word = COLOR_WORD[color] || color;
  const subject = (CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.tshirt)(word);
  return `${subject} ${SHARED_STYLE}`;
}

// ---- Airtable: unique product list -------------------------------------

async function fetchProducts() {
  const seen = new Map();
  let offset = null;
  const base = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(PRODUCTS_TABLE)}`;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const res = await fetch(`${base}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const r of data.records || []) {
      const handle = String(r.fields?.Handle || '').trim();
      if (handle && !seen.has(handle)) {
        seen.set(handle, { handle, type: r.fields?.Type || '', title: r.fields?.Title || handle });
      }
    }
    offset = data.offset || null;
  } while (offset);
  return [...seen.values()].sort((a, b) => a.handle.localeCompare(b.handle));
}

// ---- OpenAI image generation -------------------------------------------

async function generateImage(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: QUALITY, n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned');
  return Buffer.from(b64, 'base64');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  need('OPENAI_API_KEY');
  need('AIRTABLE_ACCESS_TOKEN');
  need('AIRTABLE_BASE_ID');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

  let products = await fetchProducts();
  if (ONLY.length) products = products.filter((p) => ONLY.includes(p.handle));
  console.log(`Found ${products.length} products. Quality=${QUALITY}. Output -> ${OUT_DIR}`);

  let done = 0;
  let failed = 0;
  for (const p of products) {
    const file = `${p.handle}.png`;
    const dest = path.join(OUT_DIR, file);
    if (fs.existsSync(dest) && !FORCE) {
      manifest[p.handle] = { file, url: `${SITE_ORIGIN}/images/products/${file}` };
      console.log(`• skip ${p.handle} (exists)`);
      continue;
    }
    const prompt = describe(p.handle, p.type);
    try {
      process.stdout.write(`• gen  ${p.handle} … `);
      const buf = await generateImage(prompt);
      fs.writeFileSync(dest, buf);
      manifest[p.handle] = { file, url: `${SITE_ORIGIN}/images/products/${file}` };
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
      done++;
      console.log(`saved (${Math.round(buf.length / 1024)} KB)`);
      await sleep(1200); // be gentle with rate limits
    } catch (e) {
      failed++;
      console.log(`FAILED: ${e.message}`);
      await sleep(3000);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. Generated ${done}, skipped existing, ${failed} failed.`);
  console.log(`Manifest: ${path.relative(path.join(__dirname, '..'), MANIFEST)}`);
  console.log('Next: commit images/products/, then update Airtable Image Src from the manifest.');
}

// Only run when invoked directly (so the prompt builder can be imported in tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
