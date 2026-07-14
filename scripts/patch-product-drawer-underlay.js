#!/usr/bin/env node
/**
 * Wire collection pages to shared product drawer with nav-style underlay reveal.
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  'carousel-template.html',
  'collections/t-shirts.html',
  'collections/hoodies.html',
  'collections/chains.html',
  'collections/bracelets.html',
];

const ROOT = path.join(__dirname, '..');

const DRAWER_BLOCK = `  <!-- Product Drawer Overlay -->
  <div data-product-drawer-overlay class="product-drawer-overlay" aria-hidden="true">
    <div class="product-drawer-overlay__dark" id="drawer-close-overlay" aria-hidden="true"></div>
  </div>

  <!-- Product Drawer Panel (underlay — revealed when main slides left) -->
  <aside id="product-drawer" class="products_collection-drawer product-drawer" aria-hidden="true" aria-label="Product details">
    <div class="products_drawer-wrapper product-drawer__panel">
      <button class="products_drawer-close-icon" id="drawer-close-btn" aria-label="Close drawer">×</button>

      <div class="product-drawer__loading" id="drawer-loading">
        <div class="product-drawer__spinner"></div>
        <p>Loading product details...</p>
      </div>

      <div class="product-drawer__content">
        <div class="products_drawer-title" data-drawer-reveal>
          <h3 id="drawer-product-title"></h3>
          <h3 id="drawer-product-price"></h3>
          <a class="product-detail__full-link" id="drawer-full-link" href="#" hidden>Full details →</a>
        </div>

        <div class="products_drawer-content" data-drawer-reveal>
          <div class="products_drawer-images">
            <img src="" loading="lazy" alt="Product image" class="products_drawer-main-image" id="drawer-main-image">
            <div class="products_drawer-more-collection" id="drawer-gallery"></div>
          </div>

          <div class="products_drawer-text">
            <div class="products_text-top">
              <div class="products_quantity-wrapper">
                <div class="margin-bottom margin-xsmall">
                  <h4 class="uppercase">qty</h4>
                </div>
                <input type="number" pattern="^[0-9]+$" inputmode="numeric" id="drawer-quantity" name="quantity" min="1" class="products_quantity" value="1">
              </div>
              <button id="drawer-add-to-cart" class="button-secondary">Add to Cart</button>
              <div style="display:none" class="products_out-of-stock" id="drawer-out-of-stock">
                <div>Sold out.</div>
              </div>
              <div style="display:none" class="products_error" id="drawer-error">
                <div>Error loading product details.</div>
              </div>
            </div>

            <div class="products_text-bottom">
              <div class="margin-bottom margin-medium">
                <h4 class="uppercase">product info</h4>
              </div>

              <div class="products_description-item">
                <div class="products_description-question">
                  <div class="products_description-left">
                    <span class="products_description-icon">📄</span>
                    <p>Description</p>
                  </div>
                  <span class="product_description-plus">+</span>
                </div>
                <div class="products_description-answer" style="display:none;">
                  <div class="paragraph" id="drawer-description"></div>
                </div>
              </div>

              <div class="products_description-item">
                <div class="products_description-question">
                  <div class="products_description-left">
                    <span class="products_description-icon">ℹ️</span>
                    <p>Care Instructions</p>
                  </div>
                  <span class="product_description-plus">+</span>
                </div>
                <div class="products_description-answer" style="display:none;">
                  <div class="paragraph" id="drawer-care-instructions"></div>
                </div>
              </div>

              <div class="products_description-item">
                <div class="products_description-question">
                  <div class="products_description-left">
                    <span class="products_description-icon">🚚</span>
                    <p>Delivery</p>
                  </div>
                  <span class="product_description-plus">+</span>
                </div>
                <div class="products_description-answer" style="display:none;">
                  <p id="drawer-delivery"></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
`;

const DRAWER_INIT_JS = `    // Product Drawer — shared module with nav-style underlay reveal
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
        careInstructions: '<p>Hand wash recommended in cold water.</p>'
      };
    }

    if (window.KioskProductDrawer) {
      window.KioskProductDrawer.init({
        getProducts: () => collectionProducts,
        getPlaceholder: (handle) => getPlaceholderProduct(handle),
      });
    }`;

function patch(content) {
  let next = content;

  if (!next.includes('product-drawer.css')) {
    next = next.replace(
      '<link href="../css/underlay-nav.css" rel="stylesheet" type="text/css">',
      '<link href="../css/underlay-nav.css" rel="stylesheet" type="text/css">\n  <link href="../css/product-drawer.css" rel="stylesheet" type="text/css">'
    );
  }

  // Remove old drawer inside main
  next = next.replace(
    /\n\s*<!-- Product Drawer -->[\s\S]*?<!-- Loading Spinner -->[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n/,
    '\n'
  );

  // Insert new drawer before main if not present
  if (!next.includes('data-product-drawer-overlay')) {
    next = next.replace(
      /(\s*<!-- MAIN:BEGIN -->\s*<main data-main)/,
      `\n${DRAWER_BLOCK}\n$1`
    );
  }

  // Expose collection products globally for drawer cache
  if (!next.includes('window.collectionProducts = collectionProducts')) {
    next = next.replace(
      /collectionProducts = collection\.products\.edges\.map\(edge => edge\.node\);/,
      'collectionProducts = collection.products.edges.map(edge => edge.node);\n            window.collectionProducts = collectionProducts;'
    );
  }

  // Replace inline drawer JS block
  next = next.replace(
    /\/\/ Product Drawer Functionality[\s\S]*?(?=      \/\/ Auto-enable if URL parameter)/,
    `${DRAWER_INIT_JS}\n\n`
  );

  // Add product-drawer.js script
  if (!next.includes('product-drawer.js')) {
    next = next.replace(
      '<script src="../js/underlay-nav.js" type="text/javascript"></script>',
      '<script src="../js/product-drawer.js" type="text/javascript"></script>\n  <script src="../js/underlay-nav.js" type="text/javascript"></script>'
    );
  }

  return next;
}

let changed = 0;
for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = patch(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
    console.log('Patched:', file);
    changed++;
  } else {
    console.log('No changes:', file);
  }
}

console.log(`Done. ${changed} file(s) updated.`);
