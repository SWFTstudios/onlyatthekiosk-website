#!/usr/bin/env node
/**
 * Patch collection pages and carousel-template with product image manifest integration.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  { file: 'collections/chains.html', scriptPath: '../js/product-image-manifest.js' },
  { file: 'collections/bracelets.html', scriptPath: '../js/product-image-manifest.js' },
  { file: 'collections/hoodies.html', scriptPath: '../js/product-image-manifest.js' },
  { file: 'collections/t-shirts.html', scriptPath: '../js/product-image-manifest.js' },
  { file: 'carousel-template.html', scriptPath: 'js/product-image-manifest.js' },
];

const SCRIPT_TAG = (src) => `  <script src="${src}" type="text/javascript"></script>`;

const INIT_FN = `
      function initStaticCarouselImages(collectionKey) {
        if (typeof COLLECTION_HANDLES === 'undefined' || typeof PRODUCT_IMAGES === 'undefined') return;
        const handles = COLLECTION_HANDLES[collectionKey] || [];
        $('.carousel_item').each(function (i) {
          const handle = handles[i];
          if (!handle || !PRODUCT_IMAGES[handle]) return;
          const entry = PRODUCT_IMAGES[handle];
          $(this).find('.carousel_img')
            .attr('src', entry.product)
            .attr('alt', entry.productAlt);
        });
      }
`;

const PLACEHOLDER_FN = `
      function getPlaceholderProduct(productHandle) {
        const collectionKey = typeof collectionHandle !== 'undefined' ? collectionHandle : null;
        if (typeof getProductPlaceholder === 'function') {
          return getProductPlaceholder(productHandle, collectionKey);
        }
        const fallback = '/images/kiosk-placeholder-product-img.webp';
        return {
          title: 'Product',
          price: { amount: '299.00', currencyCode: 'SEK' },
          mainImage: fallback,
          gallery: [fallback],
          description: '<p>Product — an essential piece from KIOSK.</p>',
          careInstructions: '<p><strong>Care Instructions:</strong></p><ul><li>Hand wash recommended in cold water</li></ul>'
        };
      }
`;

function patchFile(relPath, scriptPath) {
  const filePath = path.join(ROOT, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const configScript = scriptPath.includes('../')
    ? '<script src="../js/config.js"'
    : '<script src="js/config.js"';

  if (!content.includes('product-image-manifest.js')) {
    content = content.replace(
      configScript,
      `${SCRIPT_TAG(scriptPath)}\n  ${configScript}`
    );
    changed = true;
  }

  if (!content.includes('function initStaticCarouselImages')) {
    content = content.replace(
      /(\s+\/\/ Placeholder product data for template products)/,
      `${INIT_FN}\n$1`
    );
    changed = true;
  }

  const oldPlaceholderStart = content.indexOf('function getPlaceholderProduct(productHandle) {');
  if (oldPlaceholderStart !== -1) {
    const oldPlaceholderEnd = content.indexOf('\n      // Populate drawer with placeholder data', oldPlaceholderStart);
    if (oldPlaceholderEnd !== -1) {
      content = content.slice(0, oldPlaceholderStart) + PLACEHOLDER_FN.trim() + content.slice(oldPlaceholderEnd);
      changed = true;
    }
  }

  if (!content.includes('initStaticCarouselImages(collectionHandle)')) {
    content = content.replace(
      /if \(collectionHandle\) \{\s*\n\s*const initialTitle = formatCollectionTitle\(collectionHandle\);/,
      `if (collectionHandle) {\n        initStaticCarouselImages(collectionHandle);\n        const initialTitle = formatCollectionTitle(collectionHandle);`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Patched ${relPath}`);
  } else {
    console.log(`⏭️  Already patched: ${relPath}`);
  }
}

for (const { file, scriptPath } of FILES) {
  patchFile(file, scriptPath);
}
