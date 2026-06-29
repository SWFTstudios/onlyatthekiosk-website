#!/usr/bin/env node
/**
 * Generate unique product and lifestyle images via OpenAI (ChatGPT / gpt-image-1).
 *
 * Requires OPENAI_API_KEY locally, in .dev.vars, or on Cloudflare (use --remote).
 *
 * Usage:
 *   node scripts/generate-product-images.js --openai [--force]
 *   node scripts/generate-product-images.js --openai --remote [--force]
 *   node scripts/generate-product-images.js --collection chains --openai --remote
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { loadDevVars } = require('./load-dev-vars');

loadDevVars();

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data/product-image-manifest.json');
const RAW_DIR = path.join(ROOT, 'images/products/raw');
const OUT_DIR = path.join(ROOT, 'images/products');
const SIZE = 1200;
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://onlyatthekiosk.com';
const RATE_LIMIT_MS = parseInt(process.env.OPENAI_RATE_LIMIT_MS || '1500', 10);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    collection: null,
    status: null,
    dryRun: false,
    limit: null,
    remote: false,
    force: false,
    openai: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--collection') opts.collection = args[++i];
    else if (args[i] === '--status') opts.status = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10);
    else if (args[i] === '--remote') opts.remote = true;
    else if (args[i] === '--force') opts.force = true;
    else if (args[i] === '--openai') opts.openai = true;
  }

  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

async function optimizeToWebp(rawPath, webpPath) {
  await sharp(rawPath)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(webpPath);
}

async function generateOpenAILocal(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].b64_json;
}

async function generateOpenAIRemote(handle, kind) {
  const url = `${SITE_ORIGIN}/api/generate-product-image`;
  const headers = { 'Content-Type': 'application/json' };

  if (process.env.IMAGE_SYNC_SECRET) {
    headers.Authorization = `Bearer ${process.env.IMAGE_SYNC_SECRET}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ handle, kind }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.details || body.error || `Remote generation failed: ${response.status}`);
  }

  return body.b64;
}

async function generateImageB64(handle, kind, prompt, apiKey, remote) {
  if (remote) {
    return generateOpenAIRemote(handle, kind);
  }
  return generateOpenAILocal(prompt, apiKey);
}

async function processProduct(handle, entry, opts, apiKey) {
  const rawProduct = path.join(RAW_DIR, `${handle}-product.png`);
  const rawLifestyle = path.join(RAW_DIR, `${handle}-lifestyle.png`);
  const webpProduct = path.join(OUT_DIR, `${handle}-product.webp`);
  const webpLifestyle = path.join(OUT_DIR, `${handle}-lifestyle.webp`);

  if (!opts.force && fs.existsSync(webpProduct) && fs.existsSync(webpLifestyle)) {
    console.log(`  ⏭️  ${handle} (already exists, use --force to regenerate)`);
    entry.status = 'optimized';
    return;
  }

  if (opts.dryRun) {
    console.log(`  [dry-run] ${handle}: product + lifestyle`);
    return;
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const productB64 = await generateImageB64(handle, 'product', entry.productPrompt, apiKey, opts.remote);
  fs.writeFileSync(rawProduct, Buffer.from(productB64, 'base64'));
  await sleep(RATE_LIMIT_MS);

  const lifestyleB64 = await generateImageB64(handle, 'lifestyle', entry.lifestylePrompt, apiKey, opts.remote);
  fs.writeFileSync(rawLifestyle, Buffer.from(lifestyleB64, 'base64'));

  await optimizeToWebp(rawProduct, webpProduct);
  await optimizeToWebp(rawLifestyle, webpLifestyle);

  entry.status = 'optimized';
  console.log(`  ✅ ${handle}`);
}

async function main() {
  const opts = parseArgs();

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found. Run: npm run build:manifest');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  if (opts.force) {
    for (const handle of Object.keys(manifest)) {
      manifest[handle].status = 'pending';
    }
    saveManifest(manifest);
  }

  const statusFilter = opts.status || (opts.force ? 'pending' : 'optimized');
  let handles = Object.keys(manifest).filter((h) => manifest[h].status === statusFilter);

  if (opts.force && !opts.status) {
    handles = Object.keys(manifest);
  }

  if (opts.collection) {
    handles = handles.filter((h) => manifest[h].collection === opts.collection);
  }

  if (opts.limit) {
    handles = handles.slice(0, opts.limit);
  }

  handles.sort();

  const apiKey = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY || null;

  if (opts.openai && !apiKey && !opts.remote) {
    console.error('❌ --openai requires OPENAI_API_KEY locally or --remote with key on Cloudflare.');
    process.exit(1);
  }

  if (opts.openai && !apiKey && opts.remote) {
    console.log('Using remote OpenAI via Cloudflare secrets');
  }

  const mode = opts.remote
    ? `OpenAI ${OPENAI_MODEL} (remote via Cloudflare)`
    : apiKey
      ? `OpenAI ${OPENAI_MODEL} (local)`
      : 'procedural fallback disabled — use --openai';

  if (opts.openai && !apiKey && !opts.remote) {
    process.exit(1);
  }

  if (!opts.openai) {
    console.error('❌ ChatGPT/OpenAI generation required. Re-run with --openai [--remote].');
    process.exit(1);
  }

  console.log(`\n🖼️  Generating ${handles.length} products (${handles.length * 2} images) via ${mode}`);
  if (opts.collection) console.log(`   Collection: ${opts.collection}`);
  if (opts.force) console.log('   Force regenerate: yes');

  let completed = 0;
  let failed = 0;

  for (const handle of handles) {
    const entry = manifest[handle];
    try {
      await processProduct(handle, entry, opts, apiKey);
      if (!opts.dryRun) saveManifest(manifest);
      completed++;
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error(`  ❌ ${handle}: ${err.message}`);
      entry.status = 'error';
      saveManifest(manifest);
      failed++;
      await sleep(RATE_LIMIT_MS * 2);
    }
  }

  console.log(`\nDone. ${completed} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
