/**
 * KIOSK accounts — sign-in sheet, cart drawer, wishlist sync, account page.
 * Requires js/kiosk-glass.js (window.KIOSK). Hides itself when /api/me reports
 * accounts disabled (Shopify Customer Account client or D1 not configured).
 */
(function () {
  'use strict';

  const CART_KEY = 'kiosk:cartId';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const K = () => window.KIOSK || {};
  const toast = (m) => { if (K().toast) K().toast(m); };
  const esc = (v) => (K().esc ? K().esc(v) : String(v == null ? '' : v));
  const icon = () => K().icon || {};

  let state = {
    enabled: false,
    user: null,
    wishlist: [],
    cart: null,
    orders: [],
    loading: true,
  };

  let accountEl = null;
  let cartEl = null;
  let accountReturn = null;
  let cartReturn = null;

  function cartId() {
    try { return localStorage.getItem(CART_KEY) || ''; } catch (e) { return ''; }
  }
  function setCartId(id) {
    try {
      if (id) localStorage.setItem(CART_KEY, id);
      else localStorage.removeItem(CART_KEY);
    } catch (e) { /* ignore */ }
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function setChromeVisible(el, on) {
    if (!el) return;
    if (on) {
      el.removeAttribute('hidden');
      el.classList.remove('is-hidden');
    } else {
      el.setAttribute('hidden', '');
      el.classList.add('is-hidden');
    }
  }

  function showAccountButtons(accountsOn, cartOn) {
    $$('[data-account-open]').forEach((el) => setChromeVisible(el, accountsOn));
    // Cart chrome can light up for guests once Storefront cart works,
    // even before Customer Account OAuth is configured.
    const showCart = !!(accountsOn || cartOn);
    $$('[data-cart-open]').forEach((el) => setChromeVisible(el, showCart));
  }

  function updateCartBadge(cart) {
    const n = (cart && cart.totalQuantity) || 0;
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = String(n);
      el.hidden = n < 1;
    });
  }

  async function refreshMe() {
    try {
      const data = await api('/api/me');
      state.enabled = !!data.enabled;
      state.user = data.user || null;
      state.wishlist = data.wishlist || [];
      state.cart = data.cart || null;
      state.orders = data.orders || [];
      state.loading = false;
      if (state.cart && state.cart.id) setCartId(state.cart.id);
      else if (!state.user) {
        const id = cartId();
        if (id) {
          try {
            const c = await api(`/api/cart?cartId=${encodeURIComponent(id)}`);
            state.cart = c.cart || null;
          } catch (e) { /* guest cart may have expired */ }
        }
      }
      // Show cart chrome when accounts are on, or when a guest already has a cart id.
      showAccountButtons(state.enabled, !!(state.cart && state.cart.id) || !!cartId());
      updateCartBadge(state.cart);
      if (state.user) await mergeLocalWishlist();
      renderAccountPage();
      return state;
    } catch (err) {
      state.enabled = false;
      state.loading = false;
      showAccountButtons(false, !!cartId());
      return state;
    }
  }

  async function mergeLocalWishlist() {
    const local = (K().store && K().store.get(K().saveKey || 'kiosk:saved', [])) || [];
    if (!local.length) return;
    const items = local.map((ref) => ({ kind: 'story', ref }));
    // Also treat product ids saved under the same key if they look like products
    try {
      const data = await api('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ action: 'merge', items }),
      });
      state.wishlist = data.items || [];
    } catch (e) { /* ignore merge failures */ }
  }

  function loginUrl() {
    const returnTo = location.pathname + location.search + location.hash;
    return `/api/auth/login?return_to=${encodeURIComponent(returnTo || '/account.html')}`;
  }

  /* ---------------------------------------------------------- account sheet */

  function accountSheetHtml() {
    const u = state.user;
    if (!u) {
      return `
        <div class="k-acct__scrim" data-account-close></div>
        <div class="k-acct__panel" role="document">
          <header class="k-acct__head">
            <span class="k-acct__grab" aria-hidden="true"></span>
            <h2 class="k-acct__title" id="k-acct-title">Account</h2>
            <button type="button" class="k-acct__x" data-account-close aria-label="Close">${icon().close || '×'}</button>
          </header>
          <div class="k-acct__body">
            <p class="k-lede">Sign in to save pieces across devices, keep a cart, and see your orders.</p>
            <a class="k-btn k-btn--solid k-acct__cta" href="${loginUrl()}">Sign in / create account</a>
            <p class="k-acct__hint">You’ll use Shopify’s secure email code. We never see your password.</p>
          </div>
        </div>`;
    }
    return `
      <div class="k-acct__scrim" data-account-close></div>
      <div class="k-acct__panel" role="document">
        <header class="k-acct__head">
          <span class="k-acct__grab" aria-hidden="true"></span>
          <h2 class="k-acct__title" id="k-acct-title">Account</h2>
          <button type="button" class="k-acct__x" data-account-close aria-label="Close">${icon().close || '×'}</button>
        </header>
        <div class="k-acct__body">
          <p class="k-acct__hello">Hi${u.firstName ? `, ${esc(u.firstName)}` : ''}</p>
          <p class="k-acct__email">${esc(u.email || '')}</p>
          <div class="k-acct__actions">
            <a class="k-btn k-btn--solid" href="account.html">Open dashboard</a>
            <button class="k-btn" type="button" data-cart-open>View cart</button>
            <a class="k-btn" href="/api/auth/logout">Sign out</a>
          </div>
        </div>
      </div>`;
  }

  function openAccountSheet() {
    if (!state.enabled) return;
    if (!accountEl) {
      accountEl = document.createElement('div');
      accountEl.className = 'k-acct';
      accountEl.id = 'k-account';
      accountEl.setAttribute('role', 'dialog');
      accountEl.setAttribute('aria-modal', 'true');
      accountEl.setAttribute('aria-labelledby', 'k-acct-title');
      document.body.append(accountEl);
      accountEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-account-close]')) closeAccountSheet();
        if (e.target.closest('[data-cart-open]')) { closeAccountSheet(); openCartDrawer(); }
      });
    }
    accountEl.innerHTML = accountSheetHtml();
    accountReturn = document.activeElement;
    document.documentElement.classList.add('is-account-open');
    accountEl.classList.add('is-open');
    const focus = $('[data-account-close], .k-acct__cta, a.k-btn', accountEl);
    if (focus) focus.focus();
  }

  function closeAccountSheet() {
    if (!accountEl) return;
    accountEl.classList.remove('is-open');
    document.documentElement.classList.remove('is-account-open');
    if (accountReturn && accountReturn.focus) accountReturn.focus();
  }

  /* ------------------------------------------------------------- cart drawer */

  function money(m) {
    if (!m || m.amount == null) return '';
    const n = Number(m.amount);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: m.currencyCode || 'USD' }).format(n);
    } catch (e) {
      return `$${n.toFixed(2)}`;
    }
  }

  function cartDrawerHtml(cart) {
    const lines = (cart && cart.lines) || [];
    const empty = !lines.length;
    return `
      <div class="k-cart__scrim" data-cart-close></div>
      <div class="k-cart__panel" role="document">
        <header class="k-cart__head">
          <span class="k-cart__grab" aria-hidden="true"></span>
          <h2 class="k-cart__title" id="k-cart-title">Cart</h2>
          <button type="button" class="k-cart__x" data-cart-close aria-label="Close cart">${icon().close || '×'}</button>
        </header>
        <div class="k-cart__body">
          ${empty ? `<p class="k-lede">Your cart is empty. Pick something up in the shop.</p>
            <a class="k-btn k-btn--solid" href="vault.html" data-cart-close>Browse the shop</a>` : `
            <ul class="k-cart__list">
              ${lines.map((line) => `
                <li class="k-cart__line" data-line="${esc(line.id)}">
                  <div class="k-cart__thumb">${line.image ? `<img src="${esc(line.image)}" alt="${esc(line.imageAlt || line.title)}" loading="lazy">` : ''}</div>
                  <div class="k-cart__meta">
                    <b>${esc(line.title)}</b>
                    <small>${esc([line.variantTitle, ...(line.options || []).filter((o) => /size/i.test(o.name)).map((o) => o.value)].filter(Boolean).join(' · '))}</small>
                    <span>${esc(money(line.price))}</span>
                  </div>
                  <div class="k-cart__qty">
                    <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
                    <span>${esc(line.quantity)}</span>
                    <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
                    <button type="button" class="k-cart__remove" data-remove aria-label="Remove">Remove</button>
                  </div>
                </li>`).join('')}
            </ul>
            <div class="k-cart__foot">
              <p class="k-cart__total"><span>Total</span><b>${esc(money(cart.cost))}</b></p>
              <a class="k-btn k-btn--solid" href="${esc(cart.checkoutUrl || '#')}">Checkout</a>
            </div>`}
        </div>
      </div>`;
  }

  function openCartDrawer() {
    if (!cartEl) {
      cartEl = document.createElement('div');
      cartEl.className = 'k-cart';
      cartEl.id = 'k-cart';
      cartEl.setAttribute('role', 'dialog');
      cartEl.setAttribute('aria-modal', 'true');
      cartEl.setAttribute('aria-labelledby', 'k-cart-title');
      document.body.append(cartEl);
      cartEl.addEventListener('click', onCartClick);
    }
    cartEl.innerHTML = cartDrawerHtml(state.cart);
    cartReturn = document.activeElement;
    document.documentElement.classList.add('is-cart-open');
    cartEl.classList.add('is-open');
  }

  function closeCartDrawer() {
    if (!cartEl) return;
    cartEl.classList.remove('is-open');
    document.documentElement.classList.remove('is-cart-open');
    if (cartReturn && cartReturn.focus) cartReturn.focus();
  }

  async function onCartClick(e) {
    if (e.target.closest('[data-cart-close]')) { closeCartDrawer(); return; }
    const line = e.target.closest('[data-line]');
    if (!line) return;
    const lineId = line.getAttribute('data-line');
    const cart = state.cart;
    if (!cart) return;

    if (e.target.closest('[data-remove]')) {
      await mutateCart({ action: 'remove', cartId: cart.id, lineId });
      return;
    }
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const delta = Number(qtyBtn.getAttribute('data-qty')) || 0;
      const current = ((cart.lines || []).find((l) => l.id === lineId) || {}).quantity || 1;
      await mutateCart({ action: 'update', cartId: cart.id, lineId, quantity: current + delta });
    }
  }

  async function mutateCart(body) {
    try {
      const data = await api('/api/cart', { method: 'POST', body: JSON.stringify(body) });
      state.cart = data.cart || null;
      if (state.cart && state.cart.id) setCartId(state.cart.id);
      updateCartBadge(state.cart);
      if (cartEl && cartEl.classList.contains('is-open')) cartEl.innerHTML = cartDrawerHtml(state.cart);
      renderAccountPage();
      return state.cart;
    } catch (err) {
      toast(err.message || 'Could not update cart.');
      throw err;
    }
  }

  /* ---------------------------------------------------------- add to cart */

  async function resolveVariant(product, cw, size) {
    const handle = K().handleOf ? K().handleOf(product, cw) : null;
    if (!handle) throw new Error('This piece isn’t linked to Shopify yet.');
    const q = 'query($h:String!){product(handle:$h){variants(first:50){nodes{id availableForSale selectedOptions{name value}}}}}';
    const r = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, variables: { h: handle } }),
    });
    const data = await r.json().catch(() => ({}));
    const nodes = ((((data.data || {}).product || {}).variants || {}).nodes) || [];
    if (!r.ok || !nodes.length) throw new Error('Could not find that product.');
    const want = String(size || '').toUpperCase();
    const v = nodes.find((n) => n.availableForSale && (!want || n.selectedOptions.some((o) => /size/i.test(o.name) && String(o.value).toUpperCase() === want)))
      || (!want && nodes.find((n) => n.availableForSale));
    if (!v) throw new Error(size ? `Size ${size} is sold out in this colour.` : 'Sold out right now.');
    return v.id;
  }

  async function addToCart({ productId, cw = 0, size }) {
    const product = K().productById ? K().productById(productId) : null;
    if (!product) { toast('Product not found.'); return; }
    if ((product.sizes || []).length > 1 && !size) { toast('Pick a size first.'); return; }
    const msg = $('[data-pdp-msg]');
    const say = (t, err) => { if (msg) { msg.textContent = t; msg.classList.toggle('is-error', !!err); } };
    say('Adding to cart…');
    try {
      const variantId = await resolveVariant(product, cw, size);
      const cart = await mutateCart({
        action: 'add',
        cartId: (state.cart && state.cart.id) || cartId() || undefined,
        variantId,
        quantity: 1,
      });
      say('Added to cart.');
      toast('Added to cart');
      openCartDrawer();
      return cart;
    } catch (err) {
      say(err.message || 'Could not add to cart.', true);
      toast(err.message || 'Could not add to cart.');
    }
  }

  /* ---------------------------------------------------------- wishlist sync */

  async function onSave(e) {
    if (!state.user) return;
    const { ref, kind = 'story', on } = e.detail || {};
    if (!ref) return;
    try {
      if (on) {
        const data = await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ kind, ref }) });
        state.wishlist = data.items || [];
      } else {
        const data = await api('/api/wishlist', { method: 'DELETE', body: JSON.stringify({ kind, ref }) });
        state.wishlist = data.items || [];
      }
      renderAccountPage();
    } catch (err) {
      console.warn('[KIOSK] wishlist sync', err);
    }
  }

  /* ---------------------------------------------------------- account page */

  function renderAccountPage() {
    const root = $('[data-mount="account"]');
    if (!root) return;

    if (!state.enabled) {
      root.innerHTML = `
        <section class="k-acct-page k-wrap">
          <p class="k-eyebrow">Account</p>
          <h1 class="k-display">Coming online</h1>
          <p class="k-lede">Accounts aren’t configured on this deploy yet. Wishlist and cart will light up once Shopify Customer Accounts and D1 are connected.</p>
        </section>`;
      return;
    }

    if (!state.user) {
      root.innerHTML = `
        <section class="k-acct-page k-wrap">
          <p class="k-eyebrow">Account</p>
          <h1 class="k-display">Your KIOSK</h1>
          <p class="k-lede">Sign in to sync saves, keep a cart and see orders.</p>
          <a class="k-btn k-btn--solid" href="${loginUrl()}">Sign in / create account</a>
        </section>`;
      return;
    }

    const u = state.user;
    const wish = state.wishlist || [];
    const cart = state.cart;
    const orders = state.orders || [];
    const C = K().content || {};

    const wishHtml = wish.length ? `<ul class="k-acct-list">${wish.map((w) => {
      if (w.kind === 'product') {
        const p = (C.products || []).find((x) => x.id === w.ref);
        return `<li><a href="vault.html#${esc(w.ref)}">${esc((p && p.title) || w.ref)}</a><small>Product</small></li>`;
      }
      const f = (C.features || []).find((x) => x.slug === w.ref);
      return `<li><a href="story.html?s=${encodeURIComponent(w.ref)}">${esc((f && (f.title || [f.make, f.model].filter(Boolean).join(' '))) || w.ref)}</a><small>Story</small></li>`;
    }).join('')}</ul>` : '<p class="k-acct-empty">Nothing saved yet. Tap the heart on a story.</p>';

    const cartHtml = cart && cart.lines && cart.lines.length
      ? `<ul class="k-acct-list">${cart.lines.map((l) => `<li><span>${esc(l.title)} × ${esc(l.quantity)}</span><small>${esc(money(l.price))}</small></li>`).join('')}</ul>
         <p class="k-acct-row"><b>${esc(money(cart.cost))}</b> <button class="k-btn k-btn--sm" type="button" data-cart-open>Open cart</button></p>`
      : '<p class="k-acct-empty">Cart is empty.</p>';

    const ordersHtml = orders.length
      ? `<ul class="k-acct-list">${orders.map((o) => `
          <li>
            <span>${esc(o.name || 'Order')}<small>${esc(o.processedAt ? new Date(o.processedAt).toLocaleDateString() : '')} · ${esc(o.fulfillmentStatus || o.financialStatus || '')}</small></span>
            <span>${esc(money(o.total))}${o.statusPageUrl ? ` <a href="${esc(o.statusPageUrl)}" target="_blank" rel="noopener noreferrer">View</a>` : ''}</span>
          </li>`).join('')}</ul>`
      : '<p class="k-acct-empty">No orders yet.</p>';

    root.innerHTML = `
      <section class="k-acct-page k-wrap">
        <p class="k-eyebrow">Account</p>
        <h1 class="k-display">Hi${u.firstName ? `, ${esc(u.firstName)}` : ''}</h1>
        <p class="k-lede">${esc(u.email || '')}</p>

        <div class="k-acct-grid">
          <section class="k-glass-panel" aria-labelledby="acct-wish">
            <h2 id="acct-wish">Wishlist</h2>
            ${wishHtml}
          </section>
          <section class="k-glass-panel" aria-labelledby="acct-cart">
            <h2 id="acct-cart">Cart</h2>
            ${cartHtml}
          </section>
          <section class="k-glass-panel" aria-labelledby="acct-orders">
            <h2 id="acct-orders">Orders</h2>
            ${ordersHtml}
          </section>
          <section class="k-glass-panel" aria-labelledby="acct-profile">
            <h2 id="acct-profile">Profile</h2>
            <dl class="k-acct-dl">
              <div><dt>Email</dt><dd>${esc(u.email || '—')}</dd></div>
              <div><dt>Name</dt><dd>${esc(u.firstName || '—')}</dd></div>
            </dl>
            <a class="k-btn k-btn--sm" href="/api/auth/logout">Sign out</a>
          </section>
        </div>
      </section>`;
  }

  /* --------------------------------------------------------------- bind */

  function bind() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-account-open]')) {
        e.preventDefault();
        if (document.body.dataset.page === 'account' && state.user) {
          location.href = 'account.html';
          return;
        }
        openAccountSheet();
      }
      if (e.target.closest('[data-cart-open]') && !e.target.closest('.k-cart')) {
        e.preventDefault();
        openCartDrawer();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAccountSheet(); closeCartDrawer(); }
    });
    document.addEventListener('kiosk:save', onSave);
    document.addEventListener('kiosk:add-to-cart', (e) => addToCart(e.detail || {}));

    // After OAuth return, merge guest cart onto the customer
    const params = new URLSearchParams(location.search);
    if (params.get('signed_in') === '1') {
      const id = cartId();
      if (id) {
        api('/api/cart', { method: 'POST', body: JSON.stringify({ action: 'attach', cartId: id }) })
          .then((data) => {
            state.cart = data.cart || null;
            updateCartBadge(state.cart);
            toast('Welcome back.');
          })
          .catch(() => {});
      } else {
        toast('Welcome back.');
      }
      params.delete('signed_in');
      const clean = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
      history.replaceState(null, '', clean);
    }
    if (params.get('error') === 'auth') {
      toast('Sign-in didn’t complete. Please try again.');
      params.delete('error');
      history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : '') + location.hash);
    }
  }

  function boot() {
    bind();
    refreshMe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.KIOSK_ACCOUNT = {
    refresh: refreshMe,
    openAccount: openAccountSheet,
    openCart: openCartDrawer,
    getState: () => state,
  };
})();
