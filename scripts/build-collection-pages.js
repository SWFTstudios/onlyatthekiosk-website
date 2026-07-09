#!/usr/bin/env node
/**
 * Generate slim collection pages from partials/collection-page-shell.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(ROOT, 'partials', 'collection-page-shell.html');
const OUT_DIR = path.join(ROOT, 'collections');

const COLLECTIONS = [
  { handle: 'chains', title: 'Chains', description: 'Browse KIOSK chains. Gold plated and stainless steel.', slots: 12 },
  { handle: 'bracelets', title: 'Bracelets', description: 'Browse KIOSK bracelets. Gold plated and stainless steel.', slots: 12 },
  { handle: 'tops', title: 'Tops', description: 'Hoodies and essential tees. Premium breathable layers.', slots: 16 },
  { handle: 'hoodies', title: 'Hoodies', description: 'Redirect to Tops collection.', slots: 12, redirect: '../collections/tops.html?type=hoodie' },
  { handle: 't-shirts', title: 'Essential Tees', description: 'Redirect to Tops collection.', slots: 12, redirect: '../collections/tops.html?type=tee' },
];

function buildPlaceholders(count) {
  let carousel = '';
  let slides = '';
  for (let i = 1; i <= count; i += 1) {
    carousel += `
          <div class="carousel_item" data-product-index="${i - 1}">
            <img src="../images/kiosk-placeholder-product-img.webp" alt="Product ${String(i).padStart(3, '0')}" class="carousel_img" loading="${i <= 3 ? 'eager' : 'lazy'}">
            <div class="carousel_ratio"></div>
          </div>`;
    slides += `
          <div class="swiper-slide" data-product-handle="product-handle-${i}">
            <h2>Product ${String(i).padStart(3, '0')}</h2>
            <a href="#" class="button view-details-btn">View</a>
          </div>`;
  }
  return { carousel, slides };
}

function main() {
  const shell = fs.readFileSync(SHELL, 'utf8');

  COLLECTIONS.forEach((col) => {
    if (col.redirect) {
      const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${col.redirect}">
  <title>${col.title} — KIOSK</title>
  <script>window.location.replace('${col.redirect}');</script>
</head>
<body><p><a href="${col.redirect}">Continue to ${col.title}</a></p></body>
</html>
`;
      fs.writeFileSync(path.join(OUT_DIR, `${col.handle}.html`), redirectHtml);
      console.log(`Wrote redirect ${col.handle}.html`);
      return;
    }

    const { carousel, slides } = buildPlaceholders(col.slots);
    const html = shell
      .replace(/\{\{HANDLE\}\}/g, col.handle)
      .replace(/\{\{TITLE\}\}/g, col.title)
      .replace(/\{\{DESCRIPTION\}\}/g, col.description)
      .replace('{{CAROUSEL_ITEMS}}', carousel.trim())
      .replace('{{SWIPER_SLIDES}}', slides.trim());

    fs.writeFileSync(path.join(OUT_DIR, `${col.handle}.html`), html);
    console.log(`Wrote collections/${col.handle}.html`);
  });
}

main();
