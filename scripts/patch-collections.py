#!/usr/bin/env python3
"""Patch the 4 collection pages to use the new Stripe cart + size selector.

The collection pages are template-generated and identical in the regions we
touch. Each replacement must occur exactly once per file or we abort.
"""
import sys
import pathlib

FILES = ["bracelets.html", "chains.html", "hoodies.html", "t-shirts.html"]
ROOT = pathlib.Path(__file__).resolve().parent.parent / "collections"

# --- (A) script includes -------------------------------------------------
SCRIPTS_FROM = '''  <script src="../js/config.js" type="text/javascript"></script>
  <script src="../js/airtable.js" type="text/javascript"></script>'''
SCRIPTS_TO = '''  <script src="../js/config.js" type="text/javascript"></script>
  <script src="../js/airtable.js" type="text/javascript"></script>
  <script src="../js/cart.js" type="text/javascript"></script>
  <script src="../js/checkout.js" type="text/javascript"></script>
  <script src="../js/cart-ui.js" type="text/javascript"></script>'''

# --- (B) size selector markup -------------------------------------------
TITLE_FROM = '''      <div class="products_drawer-title">
        <h3 id="drawer-product-title"></h3>
        <h3 id="drawer-product-price"></h3>
      </div>'''
TITLE_TO = TITLE_FROM + '''
      <div class="products_drawer-sizes-wrap" id="drawer-size-wrapper" style="display:none;padding:0 0 .5rem;">
        <div class="margin-bottom margin-xsmall"><h4 class="uppercase">size</h4></div>
        <div id="drawer-sizes" class="drawer-sizes"></div>
      </div>
      <style>
        .drawer-sizes{display:flex;gap:.5rem;flex-wrap:wrap}
        .drawer-size-btn{min-width:2.75rem;padding:.5rem .75rem;border:1px solid currentColor;background:transparent;
          color:inherit;cursor:pointer;border-radius:6px;font-size:.85rem;text-transform:uppercase;letter-spacing:.04em}
        .drawer-size-btn.selected{background:#000;color:#fff;border-color:#000}
        [data-theme="dark"] .drawer-size-btn.selected{background:#fff;color:#000;border-color:#fff}
      </style>'''

# --- (C) render sizes when drawer populates -----------------------------
PRICE_FROM = "        $('#drawer-product-price').text(formattedPrice);"
PRICE_TO = PRICE_FROM + "\n        renderDrawerSizes(product);"

# --- (D) size state + render helper --------------------------------------
VARS_FROM = '''      // Store current product data for add to cart
      let currentProductData = null;
      let currentProductHandle = null;'''
VARS_TO = VARS_FROM + '''

      // Size the shopper picked in the drawer (required for sized products)
      let selectedSize = '';

      function renderDrawerSizes(product) {
        const wrapper = $('#drawer-size-wrapper');
        const container = $('#drawer-sizes');
        container.empty();
        selectedSize = '';
        const sizes = (product && product.sizes) || [];
        if (!sizes.length) {
          wrapper.hide();
          return;
        }
        wrapper.show();
        sizes.forEach((size) => {
          const btn = $('<button type="button" class="drawer-size-btn"></button>').text(size);
          btn.on('click', function () {
            container.find('.drawer-size-btn').removeClass('selected');
            $(this).addClass('selected');
            selectedSize = size;
          });
          container.append(btn);
        });
      }'''

# --- (E) add-to-cart now uses the local Stripe cart ----------------------
ADD_FROM = "          await window.cart.addItem(firstVariant.id, 1);"
ADD_TO = '''          // Sized products require a size selection
          if (product.sizes && product.sizes.length && !selectedSize) {
            throw new Error('Please select a size first');
          }
          const qty = Math.max(1, parseInt($('#drawer-quantity').val(), 10) || 1);
          const firstImage = (product.images && product.images.edges && product.images.edges[0] && product.images.edges[0].node.url) || '';
          await window.cart.addItem({
            handle: product.handle,
            title: product.title,
            price: product.price,
            image: firstImage
          }, selectedSize, qty);
          if (window.cartUI) window.cartUI.open();'''

REPLACEMENTS = [
    ("script includes", SCRIPTS_FROM, SCRIPTS_TO),
    ("size markup", TITLE_FROM, TITLE_TO),
    ("render sizes call", PRICE_FROM, PRICE_TO),
    ("size state/helper", VARS_FROM, VARS_TO),
    ("add-to-cart", ADD_FROM, ADD_TO),
]

failed = False
for fname in FILES:
    path = ROOT / fname
    text = path.read_text()
    for label, frm, to in REPLACEMENTS:
        count = text.count(frm)
        if count != 1:
            print(f"  ✗ {fname}: '{label}' matched {count}x (expected 1)")
            failed = True
            continue
        text = text.replace(frm, to)
    path.write_text(text)
    print(f"  ✓ patched {fname}")

if failed:
    print("One or more replacements did not match exactly once. Review above.")
    sys.exit(1)
print("All collection pages patched.")
