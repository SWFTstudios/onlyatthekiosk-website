#!/usr/bin/env node
/**
 * Build In-flight Radio plane-window assets into images/radio/.
 *
 * Preferred sources (licensed Adobe Stock files, if present in
 * assets/radio-source/):
 *   window-frame.png  — oval frame with black interior (keyed to alpha)
 *   clouds.jpg        — sky / cloud carpet through the window
 *   below.jpg         — wing over landscape (dimmed under fog)
 *
 * When sources are missing, this script generates lightweight procedural
 * stand-ins so the page still works in CI / cloud agents. Drop the real
 * licensed files into assets/radio-source/ and re-run to replace them.
 *
 *   node scripts/build-radio-window.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'radio-source');
const OUT = path.join(ROOT, 'images', 'radio');
const MAX_KB = 150;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SRC, { recursive: true });

function findSource(names) {
  for (const n of names) {
    const p = path.join(SRC, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function assertSize(file, label) {
  const kb = fs.statSync(file).size / 1024;
  if (kb > MAX_KB) throw new Error(`${label} is ${kb.toFixed(0)}KB (limit ${MAX_KB}KB)`);
  console.log(`  ${path.basename(file)}  ${kb.toFixed(1)}KB`);
}

/** Transparent oval window frame (plastic bezel + shade lip). */
async function buildFrame() {
  const src = findSource(['window-frame.png', 'window-frame.webp', 'AdobeStock_647282758.png']);
  const out = path.join(OUT, 'window-frame.webp');
  if (src) {
    // Key near-black interior/exterior to transparent, keep the light bezel.
    const img = sharp(src).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
      const lum = (r + g + b) / 3;
      // Black cutout (glass) and dark outer field → transparent
      if (lum < 28) data[i + 3] = 0;
      else if (lum < 48) data[i + 3] = Math.round(((lum - 28) / 20) * 255);
    }
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(out);
  } else {
    // Procedural SVG frame — vertical rounded rect with depth rings.
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f2f1ee"/>
      <stop offset="45%" stop-color="#d8d6d1"/>
      <stop offset="100%" stop-color="#b8b5ae"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>
  </defs>
  <!-- outer cabin wall (transparent outside via no fill on root) -->
  <rect x="70" y="40" width="760" height="1120" rx="280" ry="280" fill="url(#bezel)"/>
  <rect x="95" y="70" width="710" height="1060" rx="250" ry="250" fill="#c9c6bf"/>
  <rect x="125" y="105" width="650" height="990" rx="220" ry="220" fill="#a8a59e"/>
  <!-- shade lip -->
  <path d="M220 145 h460 a40 24 0 0 1 0 48 h-460 a40 24 0 0 1 0 -48z" fill="#e8e6e1" filter="url(#soft)"/>
  <!-- glass cutout -->
  <rect x="155" y="175" width="590" height="870" rx="200" ry="200" fill="#000"/>
</svg>`;
    await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(async ({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < 18) data[i + 3] = 0;
        }
        await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
          .webp({ quality: 84, alphaQuality: 92 })
          .toFile(out);
      });
  }
  await assertSize(out, 'window-frame');
}

async function writeClouds(width, name, darken = 1) {
  const out = path.join(OUT, name);
  const src = findSource(['clouds.jpg', 'clouds.webp', 'AdobeStock_477558982.jpg', 'AdobeStock_477558982.jpeg']);
  if (src) {
    let pipeline = sharp(src).rotate().resize({ width, withoutEnlargement: true });
    if (darken !== 1) pipeline = pipeline.modulate({ brightness: darken });
    await pipeline.webp({ quality: 78 }).toFile(out);
  } else {
    // Soft procedural sky + cloud carpet (no external download needed).
    const h = Math.round(width * 1.25);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6eb6ff"/>
      <stop offset="42%" stop-color="#9ecfff"/>
      <stop offset="58%" stop-color="#e8eef6"/>
      <stop offset="100%" stop-color="#f7f9fc"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${Math.round(width * 0.018)}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  <g filter="url(#blur)" fill="#ffffff" opacity="0.92">
    <ellipse cx="${width * 0.2}" cy="${h * 0.62}" rx="${width * 0.35}" ry="${h * 0.1}"/>
    <ellipse cx="${width * 0.55}" cy="${h * 0.68}" rx="${width * 0.42}" ry="${h * 0.12}"/>
    <ellipse cx="${width * 0.85}" cy="${h * 0.58}" rx="${width * 0.3}" ry="${h * 0.09}"/>
    <ellipse cx="${width * 0.35}" cy="${h * 0.78}" rx="${width * 0.5}" ry="${h * 0.14}"/>
    <ellipse cx="${width * 0.75}" cy="${h * 0.84}" rx="${width * 0.4}" ry="${h * 0.11}"/>
  </g>
  <g fill="#ffffff" opacity="0.55" filter="url(#blur)">
    <ellipse cx="${width * 0.15}" cy="${h * 0.28}" rx="${width * 0.12}" ry="${h * 0.03}"/>
    <ellipse cx="${width * 0.7}" cy="${h * 0.22}" rx="${width * 0.18}" ry="${h * 0.035}"/>
  </g>
</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 76 }).toFile(out);
  }
  await assertSize(out, name);
}

async function writeBelow(width, name) {
  const out = path.join(OUT, name);
  const src = findSource(['below.jpg', 'below.webp', 'AdobeStock_2003133876.jpg', 'AdobeStock_2003133876.jpeg']);
  if (src) {
    await sharp(src).rotate().resize({ width, withoutEnlargement: true })
      .modulate({ brightness: 0.72, saturation: 0.85 })
      .webp({ quality: 74 }).toFile(out);
  } else {
    const h = Math.round(width * 0.7);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9bb4c8"/>
      <stop offset="35%" stop-color="#c5cdd4"/>
      <stop offset="100%" stop-color="#6a7368"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g stroke="#4a5248" stroke-width="1" opacity="0.35">
    ${Array.from({ length: 18 }, (_, i) => {
      const x = (i / 17) * width;
      return `<line x1="${x}" y1="${h * 0.45}" x2="${x + width * 0.08}" y2="${h}"/>`;
    }).join('')}
    ${Array.from({ length: 10 }, (_, i) => {
      const y = h * 0.5 + (i / 9) * h * 0.45;
      return `<line x1="0" y1="${y}" x2="${width}" y2="${y - 8}"/>`;
    }).join('')}
  </g>
  <path d="M0 ${h * 0.2} L${width * 0.55} ${h * 0.28} L${width} ${h * 0.18} L${width} 0 L0 0 Z" fill="#b8c0c8" opacity="0.55"/>
</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 72 }).toFile(out);
  }
  await assertSize(out, name);
}

(async () => {
  console.log('Building radio window assets → images/radio/');
  await buildFrame();
  await writeClouds(1600, 'clouds.webp');
  await writeClouds(900, 'clouds-900.webp');
  await writeBelow(1400, 'below.webp');
  await writeBelow(900, 'below-900.webp');
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
