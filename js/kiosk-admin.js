/**
 * KIOSK back office (admin.html): orders to pack and ship, stock, buyers and
 * demand. Talks to /api/admin/* (ADMIN_EMAILS only); signs in with the same
 * emailed code as member accounts (/api/auth/code, /api/auth/verify).
 */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const view = $('[data-view]');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (cents, cur = 'usd') => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(cur).toUpperCase() }).format((cents || 0) / 100); } catch (e) { return `$${((cents || 0) / 100).toFixed(2)}`; }
  };
  const when = (s) => (s ? new Date(`${String(s).replace(' ', 'T')}Z`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
  const country = (() => { let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* old browser */ } return (c) => (c && dn ? dn.of(c) : c || ''); })();
  const STATUSES = ['unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled'];

  const state = { tab: 'overview', summary: null, orders: [], filter: 'open', q: '', stock: [] };

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'a-toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
    return data;
  }

  /* --------------------------------------------------------------- sign in */

  function signIn(message = '') {
    $('[data-tabs]').hidden = true;
    view.innerHTML = `
      <form class="a-signin" data-signin novalidate>
        <h1>Back office</h1>
        <p class="a-muted">Sign in with your KIOSK email. We’ll email a six-digit code.</p>
        <input class="a-input" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
        <input class="a-input" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="Six-digit code" maxlength="7" hidden>
        <button class="a-btn a-btn--solid" type="submit">Email me a code</button>
        <p class="a-msg${message ? ' is-error' : ''}" role="alert">${esc(message)}</p>
      </form>`;
    const form = $('[data-signin]');
    const email = form.elements.email;
    const code = form.elements.code;
    const btn = $('button', form);
    const msg = $('.a-msg', form);
    const say = (t, err) => { msg.textContent = t; msg.classList.toggle('is-error', !!err); };
    email.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      try {
        if (code.hidden) {
          await api('/api/auth/code', { method: 'POST', body: JSON.stringify({ email: email.value }) });
          code.hidden = false; email.readOnly = true; btn.textContent = 'Sign in'; code.focus();
          say('Check your email for the code.');
        } else {
          await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email: email.value, code: code.value }) });
          boot();
        }
      } catch (err) { say(err.message, true); }
      btn.disabled = false;
    });
  }

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    $('[data-who]').textContent = '';
    signIn();
  }

  /* -------------------------------------------------------------- overview */

  function renderOverview() {
    const s = state.summary;
    if (!s) return;
    const tile = (label, d) => `<div class="a-stat"><small>${label}</small><b>${esc(money(d.revenue))}</b><span>${esc(d.orders)} order${d.orders === 1 ? '' : 's'}</span></div>`;
    view.innerHTML = `
      <div class="a-row"><h1>Overview</h1><span class="a-spacer"></span>
        <a class="a-btn a-btn--sm" href="/api/admin/export?type=orders">Orders CSV</a>
        <a class="a-btn a-btn--sm" href="/api/admin/export?type=customers">Customers CSV (Shopify)</a></div>
      <div class="a-stats">
        <div class="a-stat${s.toShip ? ' a-stat--alert' : ''}"><small>To ship</small><b>${esc(s.toShip)}</b><span><a href="#" data-go="orders">Open the list</a></span></div>
        ${tile('Today', s.sales.today)}${tile('7 days', s.sales.week)}${tile('30 days', s.sales.month)}${tile('All time', s.sales.all)}
      </div>
      <h2>Best sellers</h2>
      ${s.bestSellers.length ? table(['Product', 'Units', 'Revenue'], s.bestSellers.map((b) => [esc(b.title), num(b.units), num(money(b.revenue))])) : '<p class="a-muted">No sales yet.</p>'}
      <h2>Low stock</h2>
      ${s.lowStock.length ? table(['SKU', 'Product', 'Left', 'In checkouts'], s.lowStock.map((r) => [esc(r.sku), esc(r.title), num(r.left), num(r.reserved)])) : '<p class="a-muted">Nothing running low. Pieces without a stock count are made to order.</p>'}`;
  }

  const num = (v) => ({ html: esc(v), num: true });
  function table(head, rows) {
    const cell = (c, tag) => (c && typeof c === 'object' ? `<${tag} class="${c.num ? 'num' : ''}">${c.html}</${tag}>` : `<${tag}>${c}</${tag}>`);
    return `<div class="a-table-wrap"><table class="a-table"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------------------------------------------------------------- orders */

  async function loadOrders() {
    const qs = new URLSearchParams({ status: state.filter, q: state.q });
    state.orders = (await api(`/api/admin/orders?${qs}`)).orders || [];
  }

  function orderCard(o) {
    const to = o.shipTo || {};
    const addr = [to.name, to.line1, to.line2, [to.city, to.state, to.postal_code].filter(Boolean).join(' '), country(to.country)].filter(Boolean).join('\n');
    return `<article class="a-order" data-order="${esc(o.id)}">
      <div class="a-order__head">
        <b>${esc(o.number)}</b><span class="a-pill a-pill--${esc(o.status)}">${esc(o.status)}</span>
        ${o.payment !== 'paid' ? `<span class="a-pill">${esc(o.payment.replace('_', ' '))}</span>` : ''}
        ${o.member ? '<span class="a-pill">member</span>' : ''}
        <span class="a-muted">${esc(when(o.createdAt))}</span><span class="a-spacer"></span><b>${esc(money(o.total, o.currency))}</b>
      </div>
      <div class="a-order__grid">
        <div><span class="a-label">Pack</span><ul>${o.items.map((it) => `<li>${esc(it.quantity)} × ${esc(it.title)} <span class="a-muted">${esc([it.colour, it.size].filter(Boolean).join(' · '))} · ${esc(it.sku)}</span></li>`).join('')}</ul>
          <p class="a-muted">Shipping paid ${esc(money(o.shipping, o.currency))}${o.tax ? ` · tax ${esc(money(o.tax, o.currency))}` : ''}${o.discount ? ` · discount −${esc(money(o.discount, o.currency))}` : ''}</p></div>
        <div><span class="a-label">Ship to</span><address>${esc(addr)}</address>
          <p class="a-muted">${esc(o.phone || '')}${o.phone ? '<br>' : ''}<a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>
          <button class="a-btn a-btn--sm" type="button" data-copy="${esc(addr)}">Copy address</button></div>
        <div>
          ${o.status === 'shipped' || o.status === 'delivered'
            ? `<span class="a-label">Shipped</span><p>${esc(o.carrier)} ${o.trackingUrl ? `<a href="${esc(o.trackingUrl)}" target="_blank" rel="noopener noreferrer">${esc(o.tracking)}</a>` : ''}<br><span class="a-muted">${esc(when(o.shippedAt))}</span></p>`
            : `<form class="a-ship" data-ship><span class="a-label" style="grid-column:1/-1">Ship it</span>
                <select class="a-select" name="carrier" aria-label="Carrier">${['USPS', 'UPS', 'DHL', 'FedEx'].map((c) => `<option>${c}</option>`).join('')}</select>
                <input class="a-input" name="tracking" placeholder="Tracking number" aria-label="Tracking number" autocomplete="off">
                <button class="a-btn a-btn--solid" type="submit">Mark shipped &amp; email the buyer</button></form>`}
          <div class="a-row" style="margin-top:8px">
            <select class="a-select" data-status aria-label="Status">${STATUSES.filter((s) => s !== 'shipped' || o.status === 'shipped').map((s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select>
            ${o.stripeUrl ? `<a class="a-btn a-btn--sm" href="${esc(o.stripeUrl)}" target="_blank" rel="noopener noreferrer">Stripe · refund</a>` : ''}
          </div>
        </div>
      </div>
      <textarea class="a-textarea" data-notes placeholder="Notes (only you see these)" aria-label="Notes">${esc(o.notes)}</textarea>
    </article>`;
  }

  function renderOrders() {
    const chips = [['open', 'To ship'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']];
    view.innerHTML = `
      <div class="a-row"><h1>Orders</h1><span class="a-spacer"></span>
        <form data-search role="search"><input class="a-input" type="search" name="q" value="${esc(state.q)}" placeholder="Order, email, name or tracking" aria-label="Search orders"></form></div>
      <div class="a-row" role="group" aria-label="Filter">${chips.map(([k, l]) => `<button class="a-chip" type="button" data-filter="${k}" aria-pressed="${state.filter === k}">${l}</button>`).join('')}</div>
      <div class="a-orders" style="margin-top:16px">${state.orders.length ? state.orders.map(orderCard).join('') : `<p class="a-muted">${state.filter === 'open' ? 'Nothing to ship. 🎉' : 'No orders here.'}</p>`}</div>`;
  }

  async function changeOrder(id, body) {
    const data = await api('/api/admin/orders', { method: 'POST', body: JSON.stringify({ id, ...body }) });
    const i = state.orders.findIndex((o) => o.id === id);
    if (i >= 0) state.orders[i] = data.order;
    return data.order;
  }

  /* ----------------------------------------------------------------- stock */

  function renderStock() {
    view.innerHTML = `
      <h1>Stock</h1>
      <p class="a-muted">Leave a count blank for made-to-order pieces (they never sell out). Enter a number for limited drops: checkout holds units for 30 minutes and stops at zero.</p>
      ${state.stock.length ? table(['Product', 'Colour', 'Size', 'SKU', 'In stock', 'In checkouts'], state.stock.map((v) => [
        esc(v.title), esc(v.colour), esc(v.size), `<code>${esc(v.sku)}</code>`,
        `<input class="a-input" type="number" min="0" step="1" inputmode="numeric" data-sku="${esc(v.sku)}" value="${v.onHand == null ? '' : esc(v.onHand)}" placeholder="∞" aria-label="Stock for ${esc(v.sku)}">`,
        num(v.reserved || 0),
      ])) : '<p class="a-muted">Nothing is on sale yet. Mark a product <code>status: \'available\'</code> in js/kiosk-content.js.</p>'}`;
  }

  /* ------------------------------------------------------ customers, demand */

  function renderCustomers() {
    const c = (state.summary && state.summary.customers) || [];
    view.innerHTML = `
      <div class="a-row"><h1>Customers</h1><span class="a-spacer"></span><a class="a-btn a-btn--sm" href="/api/admin/export?type=customers">CSV for Shopify</a></div>
      ${c.length ? table(['Customer', 'Country', 'Orders', 'Spent', 'First order', 'Last order'], c.map((r) => [
        `${esc(r.name || '—')}${r.member ? ' <span class="a-pill">member</span>' : ''}<br><a class="a-muted" href="mailto:${esc(r.email)}">${esc(r.email)}</a>`,
        esc(country(r.country)), num(r.orders), num(money(r.spent)), esc(when(r.first)), esc(when(r.last)),
      ])) : '<p class="a-muted">No buyers yet.</p>'}`;
  }

  function renderDemand() {
    const d = (state.summary && state.summary.demand) || [];
    view.innerHTML = `
      <h1>Demand</h1>
      <p class="a-muted">“Notify me” signups by piece, size and colour: what to make next and in which sizes.</p>
      ${d.length ? table(['Product', 'Size', 'Colour', 'Waiting', 'Status'], d.map((r) => [esc(r.title), esc(r.size || 'any'), esc(r.colour || 'any'), num(r.count), esc(r.status || '')])) : '<p class="a-muted">No signups yet.</p>'}`;
  }

  /* ------------------------------------------------------------- the shell */

  async function show(tab) {
    state.tab = tab;
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    try {
      if (tab === 'orders') { await loadOrders(); renderOrders(); return; }
      if (tab === 'stock') { state.stock = (await api('/api/admin/inventory')).items || []; renderStock(); return; }
      state.summary = await api('/api/admin/summary');
      const badge = $('[data-ship-count]');
      badge.hidden = !state.summary.toShip; badge.textContent = state.summary.toShip;
      ({ overview: renderOverview, customers: renderCustomers, demand: renderDemand }[tab] || renderOverview)();
    } catch (err) {
      if (err.status === 401) signIn();
      else view.innerHTML = `<p class="a-msg is-error">${esc(err.message)}</p>`;
    }
  }

  function bind() {
    document.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { show(tab.dataset.tab); return; }
      const go = e.target.closest('[data-go]');
      if (go) { e.preventDefault(); show(go.dataset.go); return; }
      const f = e.target.closest('[data-filter]');
      if (f) { state.filter = f.dataset.filter; show('orders'); return; }
      const copy = e.target.closest('[data-copy]');
      if (copy) { navigator.clipboard.writeText(copy.dataset.copy).then(() => toast('Address copied')).catch(() => toast('Couldn’t copy')); return; }
      if (e.target.closest('[data-signout]')) signOut();
    });
    document.addEventListener('submit', async (e) => {
      const search = e.target.closest('[data-search]');
      if (search) { e.preventDefault(); state.q = search.elements.q.value.trim(); state.filter = state.q ? 'all' : 'open'; show('orders'); return; }
      const ship = e.target.closest('[data-ship]');
      if (!ship) return;
      e.preventDefault();
      const card = ship.closest('[data-order]');
      const tracking = ship.elements.tracking.value.trim();
      if (!tracking && !confirm('Mark shipped without a tracking number?')) return;
      const btn = $('button', ship); btn.disabled = true;
      try {
        await changeOrder(card.dataset.order, { action: 'ship', carrier: ship.elements.carrier.value, tracking });
        toast('Shipped. The buyer has their tracking email.');
        await loadOrders(); renderOrders();
      } catch (err) { toast(err.message); btn.disabled = false; }
    });
    document.addEventListener('change', async (e) => {
      const st = e.target.closest('[data-status]');
      if (st) {
        const card = st.closest('[data-order]');
        try { await changeOrder(card.dataset.order, { action: 'status', status: st.value }); toast(`Marked ${st.value}`); await loadOrders(); renderOrders(); } catch (err) { toast(err.message); }
        return;
      }
      const notes = e.target.closest('[data-notes]');
      if (notes) {
        try { await changeOrder(notes.closest('[data-order]').dataset.order, { action: 'note', notes: notes.value }); toast('Note saved'); } catch (err) { toast(err.message); }
        return;
      }
      const sku = e.target.closest('[data-sku]');
      if (sku) {
        try {
          const data = await api('/api/admin/inventory', { method: 'POST', body: JSON.stringify({ sku: sku.dataset.sku, onHand: sku.value === '' ? null : Number(sku.value) }) });
          state.stock = data.items || state.stock;
          toast(sku.value === '' ? `${sku.dataset.sku}: made to order` : `${sku.dataset.sku}: ${sku.value} in stock`);
        } catch (err) { toast(err.message); }
      }
    });
  }

  async function boot() {
    try {
      const me = await api('/api/me');
      if (!me.enabled) { view.innerHTML = '<p class="a-msg is-error">Accounts aren’t switched on (the D1 and Email bindings). See docs/COMMERCE.md.</p>'; return; }
      if (!me.user) { signIn(); return; }
      $('[data-who]').innerHTML = `${esc(me.user.email)} <button class="a-btn a-btn--sm" type="button" data-signout>Sign out</button>`;
      $('[data-tabs]').hidden = false;
      await show(location.hash === '#orders' ? 'orders' : 'overview');
      if (view.querySelector('.a-msg.is-error') && /can’t open/.test(view.textContent)) $('[data-tabs]').hidden = true;
    } catch (err) {
      view.innerHTML = `<p class="a-msg is-error">${esc(err.message)}</p>`;
    }
  }

  bind();
  boot();
})();
