#!/usr/bin/env node
/**
 * Enable product card + View button clicks to open the product drawer
 * while preserving vertical carousel swipe.
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

function patch(content) {
  let next = content;

  // Allow clicks through swiper overlay; interactive children opt back in
  next = next.replace(
    /(\.swiper \{[\s\S]*?z-index: 6;\n)\s*pointer-events: auto;/,
    '$1      pointer-events: none;'
  );

  next = next.replace(
    /(\.carousel_list \{[\s\S]*?user-select: none;\n)\s*pointer-events: none;/,
    '$1      pointer-events: auto;'
  );

  next = next.replace(
    /(\.carousel_item \{[\s\S]*?user-select: none;\n)\s*pointer-events: none;/,
    `$1      pointer-events: auto;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;`
  );

  if (!next.includes('.carousel_item.is-active')) {
    next = next.replace(
      /(\.carousel_item \{[\s\S]*?-webkit-tap-highlight-color: transparent;\n    \})/,
      `$1

    .carousel_item.is-active {
      cursor: pointer;
    }`
    );
  }

  // Clickable product title
  next = next.replace(
    /(\.swiper-slide h2 \{[\s\S]*?transition: color 0\.3s ease;\n)(    \})/,
    `$1      pointer-events: auto;
      cursor: pointer;
$2`
  );

  // Add data-product-handle to dynamically created carousel items
  next = next.replace(
    /<div class="carousel_item" data-product-index="\$\{index\}">/,
    '<div class="carousel_item" data-product-index="${index}" data-product-handle="${product.handle}">'
  );

  // Swiper: allow clicks on View button after swipe
  next = next.replace(
    /preventClicks: true,\s*preventClicksPropagation: true,/,
    `preventClicks: false,
            preventClicksPropagation: false,`
  );

  // Component-level vertical swipe (swiper overlay is pointer-events: none)
  const touchNavBlock = `
          // Vertical swipe on carousel component (swiper overlay passes through touches)
          const componentEl = $("[carousel='component']")[0];
          if (componentEl) {
            let touchStartY = 0;
            let touchStartX = 0;
            let touchMoved = false;

            componentEl.addEventListener('touchstart', (e) => {
              if (e.target.closest('.view-details-btn, .carousel_arrow_link, .products_collection-drawer')) return;
              touchStartY = e.touches[0].clientY;
              touchStartX = e.touches[0].clientX;
              touchMoved = false;
            }, { passive: true });

            componentEl.addEventListener('touchmove', (e) => {
              const dy = Math.abs(e.touches[0].clientY - touchStartY);
              const dx = Math.abs(e.touches[0].clientX - touchStartX);
              if (dy > 12 || dx > 12) touchMoved = true;
            }, { passive: true });

            componentEl.addEventListener('touchend', (e) => {
              if (e.target.closest('.view-details-btn, .carousel_arrow_link, .products_collection-drawer')) return;
              const dy = e.changedTouches[0].clientY - touchStartY;
              const dx = e.changedTouches[0].clientX - touchStartX;
              if (touchMoved && Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
                if (dy < 0) swiper.slideNext();
                else swiper.slidePrev();
              }
            }, { passive: true });
          }
`;

  if (!next.includes('Vertical swipe on carousel component')) {
    next = next.replace(
      /(resistanceRatio: 0\.85\s*\}\);)/,
      `$1
${touchNavBlock}`
    );
  }

  // Resolve product handle from element or synced slide index
  const resolveHandleFn = `
      function resolveProductHandle($el) {
        const direct = $el.data('product-handle');
        if (direct) return direct;
        let index = $el.data('product-index');
        if (index === undefined || index === '') {
          index = $el.index();
        }
        const slide = $('.swiper-slide').eq(index);
        if (slide.length) return slide.data('product-handle');
        return null;
      }
`;

  if (!next.includes('function resolveProductHandle')) {
    next = next.replace(
      /(\/\/ Open drawer\s+function openDrawer\(productHandle\) \{)/,
      `${resolveHandleFn}
      $1`
    );
  }

  // Event delegation for View button + carousel area clicks
  next = next.replace(
    /\/\/ Event handlers\s+viewDetailsBtns\.on\('click', function\(e\) \{[\s\S]*?\}\);/,
    `// Event handlers — delegation supports dynamically loaded products
      $(document).on('click', '.view-details-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productHandle = resolveProductHandle($(this).closest('.swiper-slide'));
        if (productHandle) {
          openDrawer(productHandle);
        } else {
          console.warn('Product handle not found for View button');
        }
      });

      // Product card area — open the active (front-facing) slide's product
      $(document).on('click', '[carousel="wrap"], .carousel_list, .carousel_item', function(e) {
        if ($(e.target).closest('.view-details-btn, .carousel_arrow_link').length) return;
        const activeSlide = $('.swiper-slide.swiper-slide-active');
        const productHandle = resolveProductHandle(activeSlide);
        if (productHandle) {
          openDrawer(productHandle);
        }
      });

      $(document).on('click', '.swiper-slide h2', function(e) {
        e.preventDefault();
        const productHandle = resolveProductHandle($(this).closest('.swiper-slide'));
        if (productHandle) {
          openDrawer(productHandle);
        }
      });`
  );

  // Remove unused static binding variable
  next = next.replace(
    /const viewDetailsBtns = \$\('\.view-details-btn'\);\s*\n/,
    ''
  );

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
