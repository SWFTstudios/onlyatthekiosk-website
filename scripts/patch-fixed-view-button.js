#!/usr/bin/env node
/**
 * Replace per-slide View buttons with one fixed bottom View button
 * that opens the product drawer for the active carousel item.
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

const FIXED_BTN_HTML = `
    <!-- Fixed View button — opens drawer for active product -->
    <a href="#" id="carousel-view-btn" class="button carousel-view-btn" aria-label="View product details">View</a>`;

const FIXED_BTN_CSS = `
    /* Fixed View button at bottom of screen */
    .carousel-view-btn {
      position: fixed;
      left: 50%;
      bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 10001;
      pointer-events: auto;
      padding: 0.75rem 2rem;
      background-color: transparent;
      color: var(--text-primary);
      border: 1px solid var(--text-primary);
      text-decoration: none;
      border-radius: 50px;
      font-weight: 500;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      font-family: 'Generalsans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 44px;
      min-width: 120px;
      text-wrap: balance;
      max-width: calc(100vw - 2rem);
      touch-action: manipulation;
    }

    .carousel-view-btn:hover {
      background-color: var(--text-primary);
      color: var(--bg-primary);
      border-color: var(--text-primary);
      transform: translateX(-50%) scale(1.02);
    }

    .carousel-view-btn:active {
      transform: translateX(-50%) scale(0.98);
    }

    @media screen and (max-width: 767px) {
      .carousel-view-btn {
        bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        padding: 0.625rem 1.75rem;
        font-size: 0.8rem;
      }
    }

    /* Per-slide View buttons replaced by fixed button */
    .swiper-slide .view-details-btn {
      display: none !important;
    }
`;

const UPDATE_BTN_FN = `
          function updateFixedViewButton() {
            const activeSlide = swiperEl.find('.swiper-slide').eq(swiper.activeIndex);
            const handle = activeSlide.data('product-handle') || '';
            const title = activeSlide.find('h2').text().trim();
            const btn = $('#carousel-view-btn');
            if (btn.length) {
              btn.attr('data-product-handle', handle);
              btn.attr('aria-label', title ? 'View ' + title : 'View product details');
            }
          }

          updateFixedViewButton();
          swiper.on('slideChange', updateFixedViewButton);
`;

function patch(content) {
  let next = content;

  // Add fixed button CSS before Navigation Arrows section
  if (!next.includes('.carousel-view-btn')) {
    next = next.replace(
      /(\/\* Navigation Arrows)/,
      `${FIXED_BTN_CSS}\n$1`
    );
  }

  // Reduce slide bottom padding (button no longer in slides)
  next = next.replace(
    /padding: 1\.5rem 2rem 6rem;/,
    'padding: 1.5rem 2rem 5.5rem; /* room for fixed View button */'
  );

  // Add fixed button HTML before closing carousel component
  if (!next.includes('id="carousel-view-btn"')) {
    next = next.replace(
      /(<div fade-up="" class="carousel_arrow_wrap">[\s\S]*?<\/div>\s*)(<\/div>\s*\n\s*<!-- Product Drawer)/,
      `$1${FIXED_BTN_HTML}\n  $2`
    );
  }

  // Remove per-slide View buttons from static HTML
  next = next.replace(/\n\s*<a href="#" class="button view-details-btn">View<\/a>/g, '');

  // Remove View button from dynamic slide template
  next = next.replace(
    /<h2>\$\{product\.title\}<\/h2>\s*<a href="#" class="button view-details-btn">View<\/a>/,
    '<h2>${product.title}</h2>'
  );

  // Sync fixed button on slide change
  if (!next.includes('function updateFixedViewButton')) {
    next = next.replace(
      /(\/\/ Sync Swiper progress with 3D rotation\s+swiper\.on\("progress")/,
      `${UPDATE_BTN_FN}
          $1`
    );
  }

  // Update touch handler exclusions
  next = next.replace(
    /\.view-details-btn, \.carousel_arrow_link/g,
    '.carousel-view-btn, .carousel_arrow_link'
  );

  // Replace view-details-btn click handler with fixed button handler
  next = next.replace(
    /\/\/ Event handlers — delegation supports dynamically loaded products\s+\$\(document\)\.on\('click', '\.view-details-btn', function\(e\) \{[\s\S]*?\}\);/,
    `// Event handlers — fixed View button opens active product drawer
      $('#carousel-view-btn').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const activeSlide = $('.swiper-slide.swiper-slide-active');
        const productHandle = resolveProductHandle(activeSlide);
        if (productHandle) {
          openDrawer(productHandle);
        } else {
          console.warn('Product handle not found for active slide');
        }
      });`
  );

  // Update carousel area click exclusion
  next = next.replace(
    /if \(\$\(e\.target\)\.closest\('\.view-details-btn, \.carousel_arrow_link'\)\.length\) return;/,
    "if ($(e.target).closest('.carousel-view-btn, .carousel_arrow_link').length) return;"
  );

  // Re-sync fixed button after dynamic products load
  if (!next.includes("$(document).on('productsLoaded'")) {
    next = next.replace(
      /(\$\(document\)\.on\('click', '\.swiper-slide h2')/,
      `$(document).on('productsLoaded', function() {
        if (window.collectionSwiper && typeof window.collectionSwiper.activeIndex === 'number') {
          const activeSlide = $('.swiper-slide').eq(window.collectionSwiper.activeIndex);
          const handle = activeSlide.data('product-handle') || '';
          const title = activeSlide.find('h2').text().trim();
          const btn = $('#carousel-view-btn');
          btn.attr('data-product-handle', handle);
          btn.attr('aria-label', title ? 'View ' + title : 'View product details');
        }
      });

      $1`
    );
  }

  // Expose swiper instance for productsLoaded handler
  if (!next.includes('window.collectionSwiper = swiper')) {
    next = next.replace(
      /(resistanceRatio: 0\.85\s*\}\);)/,
      `$1
          window.collectionSwiper = swiper;`
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
