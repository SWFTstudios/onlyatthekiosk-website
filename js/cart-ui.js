/**
 * Cart UI
 *
 * Injects a floating cart button + slide-out drawer onto every page it loads on,
 * so the cart works site-wide without editing each page's markup. Renders from
 * window.cart and triggers Stripe checkout via window.checkout.
 */
(function () {
  const money = (n) =>
    window.CartManager ? window.CartManager.formatPrice(n) : `$${(Number(n) || 0).toFixed(2)}`;

  const STYLES = `
    #kiosk-cart-btn{position:fixed;top:1rem;right:1rem;z-index:9998;display:flex;align-items:center;
      justify-content:center;width:3rem;height:3rem;border-radius:999px;border:1px solid currentColor;
      background:var(--cart-bg,#000);color:var(--cart-fg,#fff);cursor:pointer;font-size:1.1rem;
      box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .15s ease}
    #kiosk-cart-btn:hover{transform:scale(1.06)}
    #kiosk-cart-btn .cart-count{position:absolute;top:-4px;right:-4px;min-width:1.25rem;height:1.25rem;
      padding:0 .3rem;border-radius:999px;background:#ff3b30;color:#fff;font-size:.72rem;font-weight:700;
      display:none;align-items:center;justify-content:center;line-height:1}
    #kiosk-cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;opacity:0;
      visibility:hidden;transition:opacity .25s ease}
    #kiosk-cart-overlay.open{opacity:1;visibility:visible}
    #kiosk-cart-drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,100%);z-index:9999;
      background:var(--cart-panel,#fff);color:var(--cart-panel-fg,#111);transform:translateX(100%);
      transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;
      box-shadow:-8px 0 30px rgba(0,0,0,.2);font-family:inherit}
    #kiosk-cart-drawer.open{transform:translateX(0)}
    .kc-head{display:flex;align-items:center;justify-content:space-between;padding:1.25rem;
      border-bottom:1px solid rgba(128,128,128,.25)}
    .kc-head h3{margin:0;font-size:1rem;letter-spacing:.08em;text-transform:uppercase}
    .kc-close{background:none;border:none;font-size:1.5rem;line-height:1;cursor:pointer;color:inherit}
    .kc-items{flex:1;overflow-y:auto;padding:.5rem 1.25rem}
    .kc-empty{padding:3rem 1rem;text-align:center;opacity:.6}
    .kc-item{display:flex;gap:.85rem;padding:1rem 0;border-bottom:1px solid rgba(128,128,128,.18)}
    .kc-item img{width:64px;height:64px;object-fit:cover;border-radius:6px;background:#eee;flex:none}
    .kc-item-info{flex:1;min-width:0}
    .kc-item-title{font-weight:600;font-size:.9rem;margin:0 0 .15rem}
    .kc-item-size{font-size:.75rem;opacity:.65;margin:0 0 .4rem}
    .kc-qty{display:inline-flex;align-items:center;border:1px solid rgba(128,128,128,.4);border-radius:6px}
    .kc-qty button{width:1.75rem;height:1.6rem;background:none;border:none;cursor:pointer;font-size:1rem;color:inherit}
    .kc-qty span{min-width:1.6rem;text-align:center;font-size:.85rem}
    .kc-item-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between}
    .kc-item-price{font-weight:600;font-size:.9rem}
    .kc-remove{background:none;border:none;cursor:pointer;font-size:.72rem;opacity:.6;text-decoration:underline;color:inherit;padding:0}
    .kc-foot{padding:1.25rem;border-top:1px solid rgba(128,128,128,.25)}
    .kc-subtotal{display:flex;justify-content:space-between;margin-bottom:.35rem;font-weight:600}
    .kc-note{font-size:.72rem;opacity:.6;margin:0 0 1rem}
    .kc-checkout{display:block;width:100%;padding:.95rem;border:none;border-radius:8px;background:#000;
      color:#fff;font-size:.9rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
    .kc-checkout:disabled{opacity:.4;cursor:not-allowed}
    [data-theme="dark"] #kiosk-cart-drawer{--cart-panel:#111;--cart-panel-fg:#f5f5f5}
    [data-theme="dark"] #kiosk-cart-btn{--cart-bg:#fff;--cart-fg:#000}
    [data-theme="dark"] .kc-checkout{background:#fff;color:#000}
  `;

  function build() {
    if (document.getElementById('kiosk-cart-drawer')) return;

    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'kiosk-cart-btn';
    btn.setAttribute('aria-label', 'Open cart');
    btn.innerHTML = `<span aria-hidden="true">🛒</span><span class="cart-count" data-cart-count>0</span>`;

    const overlay = document.createElement('div');
    overlay.id = 'kiosk-cart-overlay';

    const drawer = document.createElement('aside');
    drawer.id = 'kiosk-cart-drawer';
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.innerHTML = `
      <div class="kc-head">
        <h3>Your Bag</h3>
        <button class="kc-close" aria-label="Close cart">&times;</button>
      </div>
      <div class="kc-items" id="kc-items"></div>
      <div class="kc-foot" id="kc-foot"></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    btn.addEventListener('click', open);
    overlay.addEventListener('click', close);
    drawer.querySelector('.kc-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    render();
  }

  function open() {
    render();
    document.getElementById('kiosk-cart-overlay').classList.add('open');
    document.getElementById('kiosk-cart-drawer').classList.add('open');
  }

  function close() {
    document.getElementById('kiosk-cart-overlay').classList.remove('open');
    document.getElementById('kiosk-cart-drawer').classList.remove('open');
  }

  function render() {
    const itemsEl = document.getElementById('kc-items');
    const footEl = document.getElementById('kc-foot');
    if (!itemsEl || !window.cart) return;

    const items = window.cart.getItems();

    if (!items.length) {
      itemsEl.innerHTML = `<div class="kc-empty">Your bag is empty.<br>Find something only at the kiosk.</div>`;
      footEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = items
      .map(
        (i) => `
      <div class="kc-item" data-key="${escapeAttr(i.key)}">
        <img src="${escapeAttr(i.image || '/images/kiosk-placeholder-product-img.webp')}" alt="${escapeAttr(i.title)}"
             onerror="this.src='/images/kiosk-placeholder-product-img.webp'">
        <div class="kc-item-info">
          <p class="kc-item-title">${escapeHtml(i.title)}</p>
          ${i.size ? `<p class="kc-item-size">Size: ${escapeHtml(i.size)}</p>` : ''}
          <div class="kc-qty">
            <button data-act="dec" aria-label="Decrease quantity">−</button>
            <span>${i.quantity}</span>
            <button data-act="inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="kc-item-right">
          <span class="kc-item-price">${money(i.price * i.quantity)}</span>
          <button class="kc-remove" data-act="remove">Remove</button>
        </div>
      </div>`
      )
      .join('');

    itemsEl.querySelectorAll('.kc-item').forEach((row) => {
      const key = row.getAttribute('data-key');
      row.querySelector('[data-act="inc"]').addEventListener('click', () => {
        const it = window.cart.getItems().find((x) => x.key === key);
        window.cart.setQuantity(key, (it ? it.quantity : 0) + 1);
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', () => {
        const it = window.cart.getItems().find((x) => x.key === key);
        window.cart.setQuantity(key, (it ? it.quantity : 0) - 1);
      });
      row.querySelector('[data-act="remove"]').addEventListener('click', () => window.cart.removeItem(key));
    });

    const subtotal = window.cart.getSubtotal();
    const freeShip = subtotal >= 100;
    footEl.innerHTML = `
      <div class="kc-subtotal"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <p class="kc-note">${
        freeShip ? 'You unlocked free shipping. ' : `Add ${money(100 - subtotal)} more for free shipping. `
      }Shipping &amp; taxes calculated at checkout.</p>
      <button class="kc-checkout" id="kc-checkout">Checkout</button>
    `;

    footEl.querySelector('#kc-checkout').addEventListener('click', function () {
      this.disabled = true;
      this.textContent = 'Redirecting…';
      window.checkout.redirectToCheckout().finally(() => {
        this.disabled = false;
        this.textContent = 'Checkout';
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  window.addEventListener('cartUpdated', () => {
    if (document.getElementById('kiosk-cart-drawer')) render();
  });

  window.cartUI = { open, close, render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
