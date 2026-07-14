#!/usr/bin/env node
/**
 * Patch collection pages: shared product-detail assets, drawer link, remove inline drawer CSS.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'collections/t-shirts.html',
  'collections/hoodies.html',
  'collections/chains.html',
  'collections/bracelets.html',
];

const DRAWER_LINK = `          <a class="product-detail__full-link" id="drawer-full-link" href="#" hidden>Full details →</a>`;

function patch(content) {
  let next = content;

  if (!next.includes('product-detail.css')) {
    next = next.replace(
      '<link href="../css/product-drawer.css" rel="stylesheet" type="text/css">',
      '<link href="../css/product-drawer.css" rel="stylesheet" type="text/css">\n  <link href="../css/product-detail.css" rel="stylesheet" type="text/css">'
    );
  }

  if (!next.includes('product-detail.js')) {
    next = next.replace(
      '<script src="../js/product-drawer.js" type="text/javascript"></script>',
      '<script src="../js/product-detail.js" type="text/javascript"></script>\n  <script src="../js/product-drawer.js" type="text/javascript"></script>'
    );
  }

  if (!next.includes('drawer-full-link')) {
    next = next.replace(
      '          <h3 id="drawer-product-price"></h3>\n        </div>',
      `          <h3 id="drawer-product-price"></h3>\n${DRAWER_LINK}\n        </div>`
    );
  }

  // Remove inline Product Drawer Styles block (carousel styles preserved above)
  next = next.replace(
    /\n    \/\* Product Drawer Styles \*\/[\s\S]*?\n    \/\*\n    ={40}\n    DEBUG BORDER SYSTEM/,
    '\n\n    /*\n    ========================================\n    DEBUG BORDER SYSTEM'
  );

  return next;
}

let changed = 0;
FILES.forEach((rel) => {
  const filePath = path.join(ROOT, rel);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = patch(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
    console.log('Patched', rel);
    changed += 1;
  } else {
    console.log('No changes', rel);
  }
});

console.log(`Done. ${changed} file(s) updated.`);
