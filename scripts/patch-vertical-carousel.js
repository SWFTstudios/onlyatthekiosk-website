#!/usr/bin/env node
/**
 * Patch collection pages for vertical carousel swipe + locked page scroll.
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

  // Lock page scroll
  next = next.replace(
    /overflow-y: auto; \/\* Allow vertical scrolling \*\//,
    'overflow-y: hidden; /* Lock page scroll — vertical carousel only */'
  );

  next = next.replace(
    /(html, body \{[\s\S]*?)\s*\/\* Allow touch scrolling \*\/\s*touch-action: pan-y pan-x;/,
    '$1      position: fixed;\n      inset: 0;\n      touch-action: none;'
  );

  next = next.replace(
    /-webkit-overflow-scrolling: touch;\n    \}/,
    '-webkit-overflow-scrolling: auto;\n    }\n\n    main[data-main]:has([carousel="component"]) {\n      overflow: hidden;\n      height: 100svh;\n      max-height: 100svh;\n    }'
  );

  // Carousel component fills viewport
  next = next.replace(
    /(\[carousel="component"\] \{[\s\S]*?)overflow: visible; \/\* Allow 3D carousel items to extend beyond bounds \*\//,
    '$1overflow: hidden;'
  );

  next = next.replace(
    /(\[carousel="component"\] \{[\s\S]*?)\s*\/\* Allow touch gestures for swiping and scrolling \*\/\s*touch-action: pan-y pan-x;/,
    '$1      height: 100svh;\n      max-height: 100svh;\n      touch-action: none;'
  );

  // Full-height swiper touch layer
  next = next.replace(
    /\/\* Swiper Container for Titles \*\/\s*\.swiper \{[\s\S]*?z-index: 10000; \/\* Just below product drawer \(10001\) but above carousel \*\/\s*\}/,
    `/* Swiper Container — full-viewport vertical touch layer */
    .swiper {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      box-sizing: border-box;
      overflow: hidden;
      touch-action: pan-y;
      z-index: 6;
      pointer-events: auto;
    }`
  );

  next = next.replace(
    /\.swiper-wrapper \{\s*overflow: visible !important;/,
    '.swiper-wrapper {\n      overflow: hidden !important;'
  );

  next = next.replace(
    /(\.swiper-slide \{[\s\S]*?)justify-content: center;/,
    '$1justify-content: flex-end;\n      padding-bottom: 6rem;'
  );

  // Vertical nav arrows
  next = next.replace(
    /\/\* Navigation Arrows \*\/\s*\.carousel_arrow_wrap \{[\s\S]*?z-index: 9999; \/\* Highest z-index to appear above everything \*\/\s*\}/,
    `/* Navigation Arrows — vertical up/down */
    .carousel_arrow_wrap {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10000;
    }`
  );

  next = next.replace(
    /\.carousel_arrow_link::before \{\s*content: '';\s*width: 0;\s*height: 0;\s*border-style: solid;\s*border-width: 8px 12px 8px 0;\s*border-color: transparent var\(--text-primary-light, #000\) transparent transparent;/,
    `.carousel_arrow_link::before {
      content: '';
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 8px 12px 8px;
      border-color: transparent transparent var(--text-primary-light, #000) transparent;`
  );

  next = next.replace(
    /\[data-theme="light"\] \.carousel_arrow_link::before \{\s*border-color: transparent var\(--text-primary-light, #000\) transparent transparent;\s*\}/,
    '[data-theme="light"] .carousel_arrow_link::before {\n      border-color: transparent transparent var(--text-primary-light, #000) transparent;\n    }'
  );

  next = next.replace(
    /\[data-theme="dark"\] \.carousel_arrow_link::before \{\s*border-color: transparent var\(--text-primary-dark, #fff\) transparent transparent;\s*\}/,
    '[data-theme="dark"] .carousel_arrow_link::before {\n      border-color: transparent transparent var(--text-primary-dark, #fff) transparent;\n    }'
  );

  next = next.replace(
    /\.carousel_arrow_link\.is-right::before \{\s*border-width: 8px 0 8px 12px;\s*border-color: transparent transparent transparent var\(--text-primary-light, #000\);\s*\}/,
    `.carousel_arrow_link.is-right::before {
      border-width: 12px 8px 0 8px;
      border-color: var(--text-primary-light, #000) transparent transparent transparent;`
  );

  next = next.replace(
    /\[data-theme="light"\] \.carousel_arrow_link\.is-right::before \{\s*border-color: transparent transparent transparent var\(--text-primary-light, #000\);\s*\}/,
    '[data-theme="light"] .carousel_arrow_link.is-right::before {\n      border-color: var(--text-primary-light, #000) transparent transparent transparent;\n    }'
  );

  next = next.replace(
    /\[data-theme="dark"\] \.carousel_arrow_link\.is-right::before \{\s*border-color: transparent transparent transparent var\(--text-primary-dark, #fff\);\s*\}/,
    '[data-theme="dark"] .carousel_arrow_link.is-right::before {\n      border-color: var(--text-primary-dark, #fff) transparent transparent transparent;\n    }'
  );

  // Swiper JS config
  next = next.replace(
    /const swiper = new Swiper\(swiperEl\[0\], \{\s*effect: "creative",/,
    `const swiper = new Swiper(swiperEl[0], {
            direction: 'vertical',
            effect: "creative",`
  );

  next = next.replace(
    /touchAngle: 45,/,
    'touchAngle: 90,'
  );

  next = next.replace(
    /touchStartPreventDefault: false,\s*touchMoveStopPropagation: false,/,
    'touchStartPreventDefault: true,\n            touchMoveStopPropagation: true,'
  );

  next = next.replace(
    /eventsTarget: "\[carousel='component'\]",/,
    `eventsTarget: "[carousel='component']",\n              releaseOnEdges: false,`
  );

  // Lock scroll after swiper init
  next = next.replace(
    /window\.swiperInitialized = true;/,
    `window.swiperInitialized = true;

          if (window.lenis && typeof window.lenis.stop === 'function') {
            window.lenis.stop();
          }
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';`
  );

  return next;
}

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = patch(original);
  if (updated === original) {
    console.warn(`No changes applied to ${file}`);
  } else {
    fs.writeFileSync(filePath, updated);
    console.log(`Patched ${file}`);
  }
}
