#!/usr/bin/env node
/**
 * Patch collection pages: link shared carousel assets, strip inline carousel CSS/JS.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PAGES = [
  { file: 'collections/t-shirts.html', assetBase: '../', defaultHandle: 't-shirts' },
  { file: 'collections/hoodies.html', assetBase: '../', defaultHandle: 'hoodies' },
  { file: 'collections/chains.html', assetBase: '../', defaultHandle: 'chains' },
  { file: 'collections/bracelets.html', assetBase: '../', defaultHandle: 'bracelets' },
  { file: 'carousel-template.html', assetBase: '', defaultHandle: 't-shirts' },
];

const CAROUSEL_CSS_START = '/* Fade-up elements start hidden */';
const CAROUSEL_CSS_END = '/*\n    ========================================\n    DEBUG BORDER SYSTEM';
const CAROUSEL_SCRIPT_START = '<!-- 3D Carousel Script -->';
const CAROUSEL_SCRIPT_END = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>';

function patchPage(page) {
  const filePath = path.join(ROOT, page.file);
  let html = fs.readFileSync(filePath, 'utf8');
  const isCollection = page.file.startsWith('collections/');

  // Add carousel-3d.css if missing
  if (!html.includes('carousel-3d.css')) {
    html = html.replace(
      /(<link[^>]+underlay-nav\.css"[^>]*>)/,
      `$1\n  <link href="${page.assetBase}css/carousel-3d.css" rel="stylesheet" type="text/css">`
    );
  }

  // Strip carousel CSS block inside <style>
  const styleRe = /(<style>)([\s\S]*?)(<\/style>)/;
  const styleMatch = html.match(styleRe);
  if (styleMatch) {
    let inner = styleMatch[2];
    const startIdx = inner.indexOf(CAROUSEL_CSS_START);
    const endIdx = inner.indexOf(CAROUSEL_CSS_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      inner = inner.slice(0, startIdx) + inner.slice(endIdx);
      html = html.replace(styleRe, `$1${inner}$3`);
    }
  }

  // Add touch layer inside carousel component
  if (!html.includes('carousel-3d__touch')) {
    html = html.replace(
      /(<div carousel="component" class="carousel_component">\s*)/,
      '$1<div class="carousel-3d__touch" aria-hidden="true"></div>\n    '
    );
  }

  // Remove old GSAP 3.12.2 duplicate
  html = html.replace(/\s*<!-- GSAP -->\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.2\/gsap\.min\.js"><\/script>\s*/g, '\n');

  // Replace inline carousel script block
  const scriptStart = html.indexOf(CAROUSEL_SCRIPT_START);
  const scriptEnd = html.indexOf(CAROUSEL_SCRIPT_END);
  const gsapBlock = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>\n`;
  const config = `  <script>
    window.KioskCarousel3DConfig = { assetBase: '${page.assetBase}', collectionHandle: '${page.defaultHandle}' };
  </script>
  <script src="${page.assetBase}js/carousel-3d.js" type="text/javascript"></script>
  `;
  if (scriptStart !== -1 && scriptEnd !== -1 && scriptEnd > scriptStart) {
    html = html.slice(0, scriptStart) + gsapBlock + config + html.slice(scriptEnd);
  } else if (!html.includes('carousel-3d.js')) {
    html = html.replace(
      /(<script src="[^"]*airtable\.js"[^>]*><\/script>|<script src="[^"]*cart\.js"[^>]*><\/script>)/,
      `$1\n  ${gsapBlock}  <script>
    window.KioskCarousel3DConfig = { assetBase: '${page.assetBase}', collectionHandle: '${page.defaultHandle}' };
  </script>
  <script src="${page.assetBase}js/carousel-3d.js" type="text/javascript"></script>`
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Patched: ${page.file}`);
}

PAGES.forEach(patchPage);
console.log('Collection carousel patch complete.');
