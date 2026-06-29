#!/usr/bin/env node
/**
 * Generate js/product-image-manifest.js for offline carousel fallbacks.
 * Usage: node scripts/build-product-image-js.js
 */

const fs = require('fs');
const path = require('path');
const { TYPE_TO_COLLECTION } = require('./product-image-prompts');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'product-image-manifest.json');
const OUT_PATH = path.join(ROOT, 'js', 'product-image-manifest.js');

function buildCollectionHandles(manifest) {
  const collections = {};

  for (const [handle, entry] of Object.entries(manifest)) {
    const col = entry.collection;
    if (!collections[col]) collections[col] = [];
    collections[col].push({ handle, number: entry.number, variant: entry.variant });
  }

  for (const col of Object.keys(collections)) {
    collections[col].sort((a, b) => {
      if (a.number !== b.number) return a.number.localeCompare(b.number);
      return a.variant.localeCompare(b.variant);
    });
    collections[col] = collections[col].map((item) => item.handle);
  }

  return collections;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const images = {};
  const collectionHandles = buildCollectionHandles(manifest);

  for (const [handle, entry] of Object.entries(manifest)) {
    images[handle] = {
      product: entry.productPath,
      lifestyle: entry.lifestylePath,
      title: entry.title,
      productAlt: entry.productAlt,
      lifestyleAlt: entry.lifestyleAlt,
    };
  }

  const js = `/**
 * Auto-generated product image manifest for offline carousel fallbacks.
 * Regenerate: npm run build:product-image-js
 */
const PRODUCT_IMAGES = ${JSON.stringify(images, null, 2)};

const COLLECTION_HANDLES = ${JSON.stringify(collectionHandles, null, 2)};

/**
 * Resolve a placeholder or real handle to a catalog handle.
 * @param {string} productHandle
 * @param {string} [collectionKey] - e.g. "chains", from page filename
 * @returns {string|null}
 */
function resolveCatalogHandle(productHandle, collectionKey) {
  if (PRODUCT_IMAGES[productHandle]) return productHandle;

  const match = productHandle.match(/product-handle-(\\d+)/);
  if (!match || !collectionKey) return null;

  const index = parseInt(match[1], 10) - 1;
  const handles = COLLECTION_HANDLES[collectionKey];
  if (!handles || index < 0 || index >= handles.length) return null;

  return handles[index];
}

/**
 * Get placeholder product data with unique images when available.
 * @param {string} productHandle
 * @param {string} [collectionKey]
 * @returns {object}
 */
function getProductPlaceholder(productHandle, collectionKey) {
  const fallbackImage = (typeof KIOSK_CONFIG !== 'undefined' && KIOSK_CONFIG.imagePlaceholder)
    ? KIOSK_CONFIG.imagePlaceholder
    : '/images/kiosk-placeholder-product-img.webp';

  const catalogHandle = resolveCatalogHandle(productHandle, collectionKey);
  const entry = catalogHandle ? PRODUCT_IMAGES[catalogHandle] : null;

  const title = entry ? entry.title : 'Product';
  const mainImage = entry ? entry.product : fallbackImage;
  const gallery = entry
    ? [entry.lifestyle]
    : [fallbackImage];

  return {
    title,
    price: { amount: '299.00', currencyCode: 'SEK' },
    mainImage,
    gallery,
    description: \`<p>\${title} — an essential piece from KIOSK. Built for everyday wear, designed to feel like a find.</p>\`,
    careInstructions: '<p><strong>Care Instructions:</strong></p><ul><li>Hand wash recommended in cold water</li><li>Do not bleach or use harsh detergents</li><li>Lay flat to dry</li><li>Iron on low heat if needed</li><li>Store in a cool, dry place</li><li>Keep away from direct sunlight when storing</li></ul>'
  };
}

function getProductImagesByHandle(handle) {
  const entry = PRODUCT_IMAGES[handle];
  if (!entry) return null;
  return {
    product: entry.product,
    lifestyle: entry.lifestyle,
    productAlt: entry.productAlt,
    lifestyleAlt: entry.lifestyleAlt,
    title: entry.title,
  };
}

/**
 * Apply manifest product images to the 3D carousel and swiper titles.
 * @param {string} collectionKey - e.g. "t-shirts"
 */
function applyManifestCarouselImages(collectionKey) {
  if (!collectionKey || !COLLECTION_HANDLES[collectionKey]) return;

  const handles = COLLECTION_HANDLES[collectionKey];
  const carouselItems = document.querySelectorAll('.carousel_item');
  const swiperSlides = document.querySelectorAll('.swiper-slide');

  handles.forEach((handle, index) => {
    const entry = PRODUCT_IMAGES[handle];
    if (!entry) return;

    const carouselImg = carouselItems[index]?.querySelector('.carousel_img');
    if (carouselImg) {
      carouselImg.src = entry.product;
      carouselImg.alt = entry.productAlt;
    }

    const slide = swiperSlides[index];
    if (slide) {
      slide.dataset.productHandle = handle;
      const titleEl = slide.querySelector('h2');
      if (titleEl) titleEl.textContent = entry.title;
    }
  });
}

if (typeof window !== 'undefined') {
  window.PRODUCT_IMAGES = PRODUCT_IMAGES;
  window.COLLECTION_HANDLES = COLLECTION_HANDLES;
  window.resolveCatalogHandle = resolveCatalogHandle;
  window.getProductPlaceholder = getProductPlaceholder;
  window.getProductImagesByHandle = getProductImagesByHandle;
  window.applyManifestCarouselImages = applyManifestCarouselImages;
}
`;

  fs.writeFileSync(OUT_PATH, js);
  console.log(`✅ Wrote ${Object.keys(images).length} entries to ${OUT_PATH}`);
  console.log('   Collections:', Object.keys(collectionHandles).map((k) => `${k}(${collectionHandles[k].length})`).join(', '));
}

main();
