#!/usr/bin/env node
/**
 * Generate unique product and lifestyle placeholder images.
 *
 * Uses OpenAI DALL-E 3 when IMAGE_GEN_API_KEY or OPENAI_API_KEY is set.
 * Otherwise generates brand-aligned procedural placeholders via sharp + SVG.
 *
 * Usage:
 *   node scripts/generate-product-images.js [--collection chains] [--status pending] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { buildPrompts } = require('./product-image-prompts');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const RAW_DIR = path.join(ROOT, 'images', 'products', 'raw');
const OUT_DIR = path.join(ROOT, 'images', 'products');

const SIZE = 1200;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { collection: null, status: 'pending', dryRun: false, limit: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--collection') opts.collection = args[++i];
    else if (args[i] === '--status') opts.status = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10);
  }
  return opts;
}

function hashSeed(handle, kind) {
  return crypto.createHash('sha256').update(`${handle}:${kind}`).digest('hex');
}

function seedToFloat(seed, index) {
  return parseInt(seed.slice(index * 2, index * 2 + 2), 16) / 255;
}

const VARIANT_COLORS = {
  gold: '#C9A227',
  silver: '#B8B8B8',
  black: '#1A1A1A',
  white: '#E8E8E8',
};

const TYPE_LABELS = {
  chain: 'CHAIN',
  bracelet: 'BRACELET',
  hoodie: 'HOODIE',
  tshirt: 'T-SHIRT',
};

function productSvg(handle, entry, kind) {
  const seed = hashSeed(handle, kind);
  const accent = VARIANT_COLORS[entry.variant] || '#888888';
  const bg = kind === 'lifestyle' ? '#0a0a0a' : '#111111';
  const fg = kind === 'lifestyle' ? '#333333' : '#222222';
  const num = entry.number;
  const label = TYPE_LABELS[entry.type] || entry.type.toUpperCase();
  const x1 = 200 + Math.floor(seedToFloat(seed, 0) * 100);
  const y1 = 300 + Math.floor(seedToFloat(seed, 1) * 80);

  let productShape = '';
  if (entry.type === 'chain') {
    productShape = `
      <ellipse cx="600" cy="520" rx="180" ry="220" fill="none" stroke="${accent}" stroke-width="6"/>
      <path d="M420 520 Q600 320 780 520" fill="none" stroke="${accent}" stroke-width="8"/>
      <circle cx="600" cy="340" r="24" fill="${accent}"/>
    `;
  } else if (entry.type === 'bracelet') {
    productShape = `
      <ellipse cx="600" cy="600" rx="160" ry="120" fill="none" stroke="${accent}" stroke-width="10"/>
      <ellipse cx="600" cy="600" rx="120" ry="90" fill="none" stroke="${fg}" stroke-width="2" opacity="0.5"/>
    `;
  } else if (entry.type === 'hoodie') {
    productShape = `
      <path d="M380 780 L380 420 L520 360 L600 400 L680 360 L820 420 L820 780 Z" fill="${fg}" stroke="${accent}" stroke-width="4"/>
      <path d="M520 360 L520 480 L680 480 L680 360" fill="${bg}"/>
      <ellipse cx="600" cy="400" rx="90" ry="50" fill="${bg}" stroke="${accent}" stroke-width="3"/>
    `;
  } else {
    productShape = `
      <path d="M400 780 L400 380 L520 320 L680 320 L800 380 L800 780 Z" fill="${fg}" stroke="${accent}" stroke-width="4"/>
      <path d="M520 320 L520 420 L680 420 L680 320" fill="${bg}"/>
    `;
  }

  const lifestyleOverlay = kind === 'lifestyle'
    ? `<rect x="0" y="900" width="1200" height="300" fill="#000" opacity="0.4"/>
       <text x="600" y="1050" text-anchor="middle" fill="#666" font-family="Arial,sans-serif" font-size="28" letter-spacing="8">LIFESTYLE</text>`
    : `<text x="600" y="980" text-anchor="middle" fill="#555" font-family="Arial,sans-serif" font-size="24" letter-spacing="6">PRODUCT</text>`;

  const grainOpacity = 0.03 + seedToFloat(seed, 2) * 0.04;

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="${kind === 'lifestyle' ? '#1a1a1a' : '#2a2a2a'}"/>
        <stop offset="100%" stop-color="${bg}"/>
      </radialGradient>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="${parseInt(seed.slice(0, 4), 16)}"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    <rect width="${SIZE}" height="${SIZE}" filter="url(#noise)" opacity="${grainOpacity}"/>
    ${productShape}
    <text x="600" y="180" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="48" font-weight="300" letter-spacing="4">#${num}</text>
    <text x="600" y="240" text-anchor="middle" fill="#888" font-family="Arial,sans-serif" font-size="22" letter-spacing="6">${label}</text>
    <text x="600" y="280" text-anchor="middle" fill="#666" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">${entry.variant.toUpperCase()}</text>
    ${lifestyleOverlay}
    <line x1="${x1}" y1="100" x2="${x1 + 200}" y2="100" stroke="#333" stroke-width="1"/>
  </svg>`;
}

async function generateProceduralImage(handle, entry, kind, outPath) {
  const svg = productSvg(handle, entry, kind);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath);
}

async function generateOpenAIImage(prompt, outPath, apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const b64 = data.data[0].b64_json;
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
}

async function optimizeToWebp(rawPath, webpPath) {
  await sharp(rawPath)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(webpPath);
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

async function processProduct(handle, entry, apiKey, dryRun) {
  const rawProduct = path.join(RAW_DIR, `${handle}-product.png`);
  const rawLifestyle = path.join(RAW_DIR, `${handle}-lifestyle.png`);
  const webpProduct = path.join(OUT_DIR, `${handle}-product.webp`);
  const webpLifestyle = path.join(OUT_DIR, `${handle}-lifestyle.webp`);

  if (dryRun) {
    console.log(`  [dry-run] ${handle}: product + lifestyle`);
    return;
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (apiKey) {
    await generateOpenAIImage(entry.productPrompt, rawProduct, apiKey);
    await generateOpenAIImage(entry.lifestylePrompt, rawLifestyle, apiKey);
  } else {
    await generateProceduralImage(handle, entry, 'product', rawProduct);
    await generateProceduralImage(handle, entry, 'lifestyle', rawLifestyle);
  }

  await optimizeToWebp(rawProduct, webpProduct);
  await optimizeToWebp(rawLifestyle, webpLifestyle);

  const productStats = fs.statSync(webpProduct);
  const lifestyleStats = fs.statSync(webpLifestyle);

  if (productStats.size > 500 * 1024 || lifestyleStats.size > 500 * 1024) {
    console.warn(`  ⚠️  ${handle}: file size > 500KB (product: ${Math.round(productStats.size / 1024)}KB, lifestyle: ${Math.round(lifestyleStats.size / 1024)}KB)`);
  }

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
  let handles = Object.keys(manifest).filter((h) => manifest[h].status === opts.status);

  if (opts.collection) {
    handles = handles.filter((h) => manifest[h].collection === opts.collection);
  }

  if (opts.limit) {
    handles = handles.slice(0, opts.limit);
  }

  handles.sort();

  const apiKey = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY || null;
  const mode = apiKey ? 'OpenAI DALL-E 3' : 'procedural (sharp/SVG)';

  console.log(`\n🖼️  Generating ${handles.length} products (${handles.length * 2} images) via ${mode}`);
  if (opts.collection) console.log(`   Collection filter: ${opts.collection}`);

  for (const handle of handles) {
    const entry = manifest[handle];
    try {
      await processProduct(handle, entry, apiKey, opts.dryRun);
      if (!opts.dryRun) saveManifest(manifest);
    } catch (err) {
      console.error(`  ❌ ${handle}: ${err.message}`);
      entry.status = 'error';
      saveManifest(manifest);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
