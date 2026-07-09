#!/usr/bin/env node
/**
 * Fix fixed View button not responding on mobile:
 * - Move outside carousel component (escapes touch-action: none)
 * - Use button element with touchend + click delegation
 * - Clear title/button overlap with extra slide padding
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

const NEW_BTN_HTML = `  <!-- Fixed View button — opens drawer for active product -->
  <button type="button" id="carousel-view-btn" class="button carousel-view-btn" data-lenis-prevent aria-label="View product details">View</button>
`;

function patch(content) {
  let next = content;

  // Remove button from inside carousel component
  next = next.replace(
    /\n\s*<!-- Fixed View button[\s\S]*?<a href="#" id="carousel-view-btn"[\s\S]*?>View<\/a>/,
    ''
  );
  next = next.replace(
    /\n\s*<!-- Fixed View button[\s\S]*?<button type="button" id="carousel-view-btn"[\s\S]*?>View<\/button>/,
    ''
  );

  // Insert button after carousel component, before product drawer
  if (!next.includes('id="carousel-view-btn"')) {
    next = next.replace(
      /(<\/div>\s*\n\s*<!-- Product Drawer)/,
      `${NEW_BTN_HTML}\n$1`
    );
  } else if (next.includes('<a href="#" id="carousel-view-btn"')) {
    next = next.replace(
      /<a href="#" id="carousel-view-btn" class="button carousel-view-btn"([^>]*)>View<\/a>/,
      '<button type="button" id="carousel-view-btn" class="button carousel-view-btn"$1 data-lenis-prevent>View</button>'
    );
    // Also move if still inside component - handled by first replace
  }

  // Ensure button is outside component (move if still nested)
  const nestedBtn = next.match(
    /\[carousel="component"\][\s\S]*?<button type="button" id="carousel-view-btn"/
  );
  if (nestedBtn) {
    const btnMarkup = next.match(
      /\n\s*<!-- Fixed View button[\s\S]*?<button type="button" id="carousel-view-btn"[\s\S]*?>View<\/button>/
    );
    if (btnMarkup) {
      next = next.replace(btnMarkup[0], '');
      if (!next.includes('id="carousel-view-btn"')) {
        next = next.replace(
          /(<\/div>\s*\n\s*<!-- Product Drawer)/,
          `${btnMarkup[0].trim()}\n$1`
        );
      }
    }
  }

  // CSS: stronger stacking + spacing
  next = next.replace(
    /\.carousel-view-btn \{[\s\S]*?touch-action: manipulation;\s*\}/,
    `.carousel-view-btn {
      position: fixed;
      left: 50%;
      bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 10005;
      pointer-events: auto !important;
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
      -webkit-appearance: none;
      appearance: none;
    }`
  );

  next = next.replace(
    /padding: 1\.5rem 2rem 5\.5rem; \/\* room for fixed View button \*\//,
    'padding: 1.5rem 2rem calc(6.5rem + env(safe-area-inset-bottom, 0px)); /* room for fixed View button */'
  );

  // Prevent title from intercepting taps near button
  if (!next.includes('.swiper-slide h2 {') || !next.includes('padding-bottom: 0.25rem')) {
    next = next.replace(
      /(\.swiper-slide h2 \{[\s\S]*?cursor: pointer;\n    \})/,
      `$1

    .swiper-slide {
      padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
    }`
    );
  }

  // Replace click-only handler with touch-safe activation
  next = next.replace(
    /\/\/ Event handlers — fixed View button opens active product drawer[\s\S]*?console\.warn\('Product handle not found for active slide'\);\s*\}\s*\}\);/,
    `// Event handlers — fixed View button opens active product drawer
      function getActiveProductHandle() {
        const activeSlide = $('.swiper-slide.swiper-slide-active');
        if (activeSlide.length) {
          const handle = resolveProductHandle(activeSlide);
          if (handle) return handle;
        }
        if (window.collectionSwiper && typeof window.collectionSwiper.activeIndex === 'number') {
          const slide = $('.swiper-slide').eq(window.collectionSwiper.activeIndex);
          const handle = resolveProductHandle(slide);
          if (handle) return handle;
        }
        return $('#carousel-view-btn').attr('data-product-handle') || null;
      }

      function activateViewButton(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const productHandle = getActiveProductHandle();
        if (productHandle) {
          openDrawer(productHandle);
        } else {
          console.warn('Product handle not found for active slide');
        }
      }

      let viewBtnTouchTs = 0;
      $(document).on('touchend', '#carousel-view-btn', function(e) {
        viewBtnTouchTs = Date.now();
        activateViewButton(e);
      });
      $(document).on('click', '#carousel-view-btn', function(e) {
        if (Date.now() - viewBtnTouchTs < 600) return;
        activateViewButton(e);
      });

      // Native fallback for iOS Safari when jQuery click synthesis fails
      document.addEventListener('touchend', function(e) {
        const btn = e.target && e.target.closest ? e.target.closest('#carousel-view-btn') : null;
        if (!btn) return;
        if (Date.now() - viewBtnTouchTs < 50) return;
        viewBtnTouchTs = Date.now();
        e.preventDefault();
        const productHandle = btn.getAttribute('data-product-handle')
          || (window.collectionSwiper && $('.swiper-slide').eq(window.collectionSwiper.activeIndex).data('product-handle'));
        if (productHandle && typeof openDrawer === 'function') {
          openDrawer(productHandle);
        }
      }, { passive: false, capture: true });`
  );

  // Expose openDrawer for native handler
  if (!next.includes('window.openProductDrawer = openDrawer')) {
    next = next.replace(
      /(function openDrawer\(productHandle\) \{)/,
      'window.openProductDrawer = null;\n      function openDrawer(productHandle) {'
    );
    next = next.replace(
      /(function openDrawer\(productHandle\) \{[\s\S]*?fetchProduct\(productHandle\))/,
      (match) => match.replace(
        'function openDrawer(productHandle) {',
        'function openDrawer(productHandle) {\n        window.openProductDrawer = openDrawer;'
      )
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
