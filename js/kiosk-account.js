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
    profile: null,
    loading: true,
  };
  let justSignedIn = false;

  /* ------------------------------------------------- check-in (onboarding)
   * js/kiosk-onboard.js loads on demand. Answers live on the device as
   * 'kiosk:taste'; for members they also live on the account
   * (/api/profile). The account copy wins once it exists. */
  const TASTE_KEY = 'kiosk:taste';
  const localTaste = () => { try { return JSON.parse(localStorage.getItem(TASTE_KEY) || 'null'); } catch (e) { return null; } };
  let onboardReady = null;
  function loadOnboard() {
    if (window.KioskOnboard) return Promise.resolve(window.KioskOnboard);
    if (!onboardReady) {
      onboardReady = new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = 'js/kiosk-onboard.js'; sc.async = true;
        sc.onload = () => resolve(window.KioskOnboard);
        sc.onerror = () => { onboardReady = null; reject(new Error('onboarding unavailable')); };
        document.head.append(sc);
      });
    }
    return onboardReady;
  }
  function openOnboarding(opts = {}) {
    closeAccountSheet();
    return loadOnboard().then((ob) => ob.open({ ...opts, onDone: () => { renderAccountPage(); if (opts.onDone) opts.onDone(); } })).catch(() => toast('Check-in couldn’t load. Try again.'));
  }
  let tasteTimer = 0;
  function saveTaste(taste) {
    if (!state.user) return Promise.resolve(null);
    clearTimeout(tasteTimer);
    return new Promise((resolve) => {
      tasteTimer = setTimeout(() => {
        api('/api/profile', { method: 'PUT', body: JSON.stringify({ taste }) })
          .then((d) => { state.profile = d.profile || null; resolve(state.profile); })
          .catch(() => resolve(null));
      }, 600);
    });
  }
  async function syncTaste() {
    if (!state.user) return;
    const local = localTaste();
    if (state.profile && state.profile.onboardedAt) {
      // the account copy wins; keep this device in step
      try { localStorage.setItem(TASTE_KEY, JSON.stringify(state.profile.taste)); } catch (e) { /* storage unavailable */ }
      document.dispatchEvent(new CustomEvent('kiosk:taste', { detail: state.profile.taste }));
    } else if (local && local.completedAt) {
      await saveTaste(local);   // checked in before signing up: carry it over
    } else if (justSignedIn) {
      openOnboarding();         // first time in: check in
    }
  }

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
    // The account button always shows: check-in works on this device even before accounts are switched on
    $$('[data-account-open]').forEach((el) => setChromeVisible(el, true));
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
      state.profile = data.profile || null;
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
      if (state.user) { await mergeLocalWishlist(); await syncTaste(); }
      renderAccountPage();
      document.dispatchEvent(new CustomEvent('kiosk:account', { detail: { enabled: state.enabled, signedIn: !!state.user } }));
      return state;
    } catch (err) {
      state.enabled = false;
      state.loading = false;
      showAccountButtons(false, !!cartId());
      renderAccountPage();
      document.dispatchEvent(new CustomEvent('kiosk:account', { detail: { enabled: false, signedIn: false } }));
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

  const tasteLine = (t) => (window.KioskOnboard && window.KioskOnboard.summary ? window.KioskOnboard.summary(t) : [...(t.interests || []), ...(t.formats || []).slice(0, 2)].map((x) => x.replace(/-/g, ' ')).join(' · '));
  function checkinBlock(cls = '') {
    const t = localTaste();
    if (t && t.completedAt) {
      if (!window.KioskOnboard) loadOnboard().then(() => { renderAccountPage(); if (accountEl && accountEl.classList.contains('is-open')) accountEl.innerHTML = accountSheetHtml(); }).catch(() => {});
      return `<div class="k-checkin ${cls}"><p class="k-checkin__eyebrow">Your check-in</p><p class="k-checkin__line">${esc(tasteLine(t) || 'Checked in')}</p><button type="button" class="k-btn k-btn--sm" data-onboard-open>Edit check-in</button></div>`;
    }
    return `<div class="k-checkin k-checkin--new ${cls}"><p class="k-checkin__eyebrow">Check-in · 1 minute</p><p class="k-checkin__line">Tell us what you’re into and we’ll pick stories, films and pieces for you.</p><button type="button" class="k-btn k-btn--sm k-btn--solid" data-onboard-open>Check in</button></div>`;
  }

  /* The member card: a boarding pass with what's kept for you, then what an
   * account adds and one clear next step. */
  const PERK_ICONS = {
    save: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.3a3 3 0 0 1 6 1.5C14 10 8 13.5 8 13.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    plane: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 11.5l14-5-1-2-5 1.4L6.6 2.6 5.3 3.1l2.3 4.6-3.3 1-1.7-1.5-1 .4 1 2.6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    box: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5l5.5-3 5.5 3v6L8 14l-5.5-3V5z M2.5 5L8 8l5.5-3M8 8v6" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    bell: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3L4 11zM6.5 14h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const PERKS = [
    ['save', 'Saves on every device', 'Hearts on stories and pieces follow you.'],
    ['plane', 'Your check-in, everywhere', 'Picks for you on the Atlas, your size pre-selected.'],
    ['box', 'Orders and your bag', 'Track orders; your cart waits for you.'],
    ['bell', 'First call on drops', 'Hear about rare finds before they board.'],
  ];
  const localSaves = () => ((K().store && K().store.get(K().saveKey || 'kiosk:saved', [])) || []).length;

  function memberCard(u) {
    const t = localTaste();
    const saves = u ? (state.wishlist || []).length : localSaves();
    const name = u ? (u.firstName || (u.email || '').split('@')[0] || 'Member') : ((t && t.name) || 'Guest');
    return `
      <div class="k-member" aria-label="${u ? 'Your member pass' : 'Guest pass'}">
        <div class="k-member__top">
          <span class="k-member__brand">KIOSK</span>
          <span class="k-member__kind">${u ? 'Member pass' : 'Guest pass'}</span>
        </div>
        <p class="k-member__name">${esc(name)}</p>
        ${u && u.email ? `<p class="k-member__email">${esc(u.email)}</p>` : ''}
        <dl class="k-member__stats">
          <div><dt>Saved</dt><dd>${esc(saves)}</dd></div>
          <div><dt>Check-in</dt><dd>${t && t.completedAt ? 'Done' : '—'}</dd></div>
          <div><dt>${u ? 'Orders' : 'Status'}</dt><dd>${u ? esc((state.orders || []).length) : 'On this device'}</dd></div>
        </dl>
      </div>`;
  }

  function accountSheetHtml() {
    const u = state.user;
    const head = `
        <div class="k-acct__scrim" data-account-close></div>
        <div class="k-acct__panel" role="document">
          <header class="k-acct__head">
            <span class="k-acct__grab" aria-hidden="true"></span>
            <h2 class="k-acct__title" id="k-acct-title">${u ? 'Your account' : 'Account'}</h2>
            <button type="button" class="k-acct__x" data-account-close aria-label="Close">${icon().close || '×'}</button>
          </header>
          <div class="k-acct__body">
            ${memberCard(u)}`;
    if (!u) {
      const cta = state.enabled
        ? `<a class="k-btn k-btn--solid k-acct__cta" href="${loginUrl()}">Sign in or create account</a>
           <p class="k-acct__hint">No password. We email you a one-time code.</p>`
        : `<div class="k-acct__soon">
             <p><b>Member sign-in opens soon.</b> Until then your saves and check-in are kept on this device.</p>
             <button type="button" class="k-btn k-btn--solid k-acct__cta" data-notify="dispatch" data-notify-title="The Dispatch">Tell me when it opens</button>
           </div>`;
      return `${head}
            ${cta}
            <ul class="k-perks">${PERKS.map(([ico, title, note]) => `<li><i aria-hidden="true">${PERK_ICONS[ico]}</i><span><b>${title}</b><small>${note}</small></span></li>`).join('')}</ul>
            ${checkinBlock('k-checkin--sheet')}
          </div>
        </div>`;
    }
    return `${head}
            <div class="k-acct__tiles">
              <a class="k-acct__tile" href="account.html"><i aria-hidden="true">${PERK_ICONS.box}</i><span>Dashboard<small>Orders &amp; saves</small></span></a>
              <button class="k-acct__tile" type="button" data-cart-open><i aria-hidden="true">${(icon().bag) || PERK_ICONS.box}</i><span>Your bag<small>${esc((state.cart && state.cart.totalQuantity) || 0)} items</small></span></button>
              <button class="k-acct__tile" type="button" data-onboard-open><i aria-hidden="true">${PERK_ICONS.plane}</i><span>Check-in<small>${localTaste() && localTaste().completedAt ? 'Edit answers' : '1 minute'}</small></span></button>
            </div>
            ${checkinBlock('k-checkin--sheet')}
            <a class="k-btn k-acct__out" href="/api/auth/logout">Sign out</a>
          </div>
        </div>`;
  }

  function openAccountSheet() {
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
              <p class="k-cart__ship">Shipping calculated at checkout · Secure Shopify checkout</p>
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
          <h1 class="k-display">Your KIOSK</h1>
          <p class="k-lede">Accounts are coming soon. Your check-in and saves stay on this device until then.</p>
          ${checkinBlock('k-checkin--page')}
        </section>`;
      return;
    }

    if (!state.user) {
      root.innerHTML = `
        <section class="k-acct-page k-wrap">
          <p class="k-eyebrow">Account</p>
          <h1 class="k-display">Your KIOSK</h1>
          <p class="k-lede">Make an account to keep your check-in, saves and cart on every device. No password: a one-time code by email.</p>
          <a class="k-btn k-btn--solid" href="${loginUrl()}">Sign in / create account</a>
          ${checkinBlock('k-checkin--page')}
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
          <section class="k-glass-panel k-acct-taste" aria-labelledby="acct-taste">
            <h2 id="acct-taste">Your check-in</h2>
            ${tastePanel()}
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

  function tastePanel() {
    const t = localTaste();
    if (!t || !t.completedAt) return `<p class="k-acct-empty">Not checked in yet. A minute of questions and the KIOSK picks for you.</p><button class="k-btn k-btn--sm k-btn--solid" type="button" data-onboard-open>Check in</button>`;
    const ob = window.KioskOnboard;
    const lab = (g, v) => (ob && ob.TASTE[g] ? ((ob.TASTE[g].find((x) => x[0] === v) || [])[1] || v) : v);
    const row = (label, list) => (list && list.length ? `<div><dt>${label}</dt><dd>${list.map((x) => `<span class="k-acct-tag">${esc(x)}</span>`).join('')}</dd></div>` : '');
    if (!ob) loadOnboard().then(() => renderAccountPage()).catch(() => {});
    return `<dl class="k-acct-dl k-acct-dl--taste">
        ${row('Into', (t.interests || []).map((v) => lab('interests', v)))}
        ${row('Formats', (t.formats || []).map((v) => lab('formats', v)))}
        ${t.home && t.home.city ? `<div><dt>Home</dt><dd>${esc(t.home.city)}</dd></div>` : ''}
        ${row('Dream trips', (t.dream || []).map((v) => lab('dream', v)))}
        ${row('Style', (t.style || []).map((v) => lab('style', v)))}
        ${t.sizes && (t.sizes.top || t.sizes.bottom) ? `<div><dt>Sizes</dt><dd>${[t.sizes.top ? `Top ${esc(t.sizes.top.toUpperCase())}` : '', t.sizes.bottom ? `Waist ${esc(t.sizes.bottom)}` : '', t.fit ? esc(lab('fit', t.fit)) : ''].filter(Boolean).join(' · ')}</dd></div>` : ''}
        ${row('Updates', (t.updates || []).map((v) => lab('updates', v)))}
      </dl>
      <button class="k-btn k-btn--sm" type="button" data-onboard-open>Edit check-in</button>`;
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
      const ob = e.target.closest('[data-onboard-open]');
      if (ob) { e.preventDefault(); openOnboarding(ob.dataset.onboardStep ? { step: ob.dataset.onboardStep } : {}); return; }
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
      justSignedIn = true;
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
    openOnboarding,
    saveTaste,
    getState: () => state,
    wishlisted: (kind, ref) => (state.wishlist || []).some((w) => w.kind === kind && w.ref === ref),
  };
})();
