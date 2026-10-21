/**
 * order.html — where Stripe sends shoppers after paying (?session_id=cs_…),
 * also linked from order emails and the account page. Reads /api/order; while
 * the payment is still settling it checks again for a few seconds.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-mount="order"]');
  if (!root) return;
  const K = () => window.KIOSK || {};
  const esc = (v) => (K().esc ? K().esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const money = (cents, cur) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(cur || 'usd').toUpperCase() }).format((cents || 0) / 100); } catch (e) { return `$${((cents || 0) / 100).toFixed(2)}`; }
  };
  const STATUS = {
    unfulfilled: ['Paid', 'We’re packing it. You’ll get the tracking number by email when it ships.'],
    packed: ['Packed', 'It’s boxed and going to the post office.'],
    shipped: ['On its way', 'It’s on its way with USPS.'],
    delivered: ['Delivered', 'It arrived. Enjoy it.'],
    cancelled: ['Cancelled', 'This order was cancelled. Any payment is refunded to your card.'],
  };

  const id = new URLSearchParams(location.search).get('session_id') || '';
  const shell = (eyebrow, title, body) => {
    root.innerHTML = `<section class="k-acct-page k-wrap"><p class="k-eyebrow">${eyebrow}</p><h1 class="k-display">${title}</h1>${body}</section>`;
  };

  function render(o) {
    const [label, note] = STATUS[o.status] || STATUS.unfulfilled;
    const to = o.shipTo || {};
    const addr = [to.name, to.line1, to.line2, [to.city, to.state, to.postal_code].filter(Boolean).join(' '), to.country].filter(Boolean);
    const refunded = o.payment === 'refunded' ? ' · refunded' : o.payment === 'partially_refunded' ? ' · partly refunded' : '';
    shell(`Order ${esc(o.number)}`, o.status === 'unfulfilled' ? 'Thank you. It’s yours.' : esc(label), `
      <p class="k-lede">${esc(note)}${refunded}</p>
      <div class="k-acct-grid">
        <section class="k-glass-panel" aria-labelledby="o-items">
          <h2 id="o-items">What you got</h2>
          <ul class="k-acct-list">${o.items.map((it) => `<li><span>${esc(it.title)}<small>${esc([it.colour, it.size].filter(Boolean).join(' · '))} × ${esc(it.quantity)}</small></span><span>${esc(money(it.unitAmount * it.quantity, o.currency))}</span></li>`).join('')}
            <li><span>Shipping</span><span>${esc(money(o.shipping, o.currency))}</span></li>
            ${o.discount ? `<li><span>Discount</span><span>−${esc(money(o.discount, o.currency))}</span></li>` : ''}
            ${o.tax ? `<li><span>Tax</span><span>${esc(money(o.tax, o.currency))}</span></li>` : ''}
            <li><b>Total</b><b>${esc(money(o.total, o.currency))}</b></li>
          </ul>
        </section>
        <section class="k-glass-panel" aria-labelledby="o-ship">
          <h2 id="o-ship">Shipping</h2>
          <p>${addr.map(esc).join('<br>')}</p>
          ${o.tracking ? `<p>${esc(o.carrier || 'USPS')} <b>${esc(o.tracking)}</b></p><a class="k-btn k-btn--sm k-btn--solid" href="${esc(o.trackingUrl)}" target="_blank" rel="noopener noreferrer">Track the parcel</a>` : '<p class="k-acct-empty">Tracking appears here once it ships.</p>'}
          <p class="k-acct-hint">A receipt went to ${esc(o.email)}. Questions: <a href="mailto:hello@onlyatthekiosk.com">hello@onlyatthekiosk.com</a></p>
        </section>
      </div>
      <p class="k-mt-l"><a class="k-btn" href="vault.html">Back to the shop</a></p>`);
  }

  let tries = 0;
  async function load() {
    if (!/^cs_(test|live)_/.test(id)) { shell('Order', 'Order not found', '<p class="k-lede">This link is missing its order. Check the email we sent, or <a href="account.html">your account</a>.</p>'); return; }
    try {
      const res = await fetch(`/api/order?session_id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) {
        render(data.order);
        if (window.KIOSK_ACCOUNT && window.KIOSK_ACCOUNT.refresh) window.KIOSK_ACCOUNT.refresh();   // the bag is empty now
        const seen = `kiosk:purchase:${data.order.number}`;
        let fresh = true;
        try { fresh = !sessionStorage.getItem(seen); sessionStorage.setItem(seen, '1'); } catch (e) { /* storage unavailable */ }
        if (fresh && typeof window.gtag === 'function') window.gtag('event', 'purchase', { transaction_id: data.order.number, currency: String(data.order.currency).toUpperCase(), value: data.order.total / 100, shipping: data.order.shipping / 100 });
        return;
      }
      if (res.ok && data.pending && tries < 8) {
        tries += 1;
        shell('Order', 'Confirming your payment…', '<p class="k-lede">This takes a few seconds.</p>');
        setTimeout(load, 2000);
        return;
      }
      shell('Order', res.status === 404 ? 'Order not found' : 'Still confirming', `<p class="k-lede">${res.status === 404 ? 'We couldn’t find this order.' : 'Your payment is still being confirmed. You’ll get an email as soon as it goes through.'} Questions: <a href="mailto:hello@onlyatthekiosk.com">hello@onlyatthekiosk.com</a></p>`);
    } catch (e) {
      shell('Order', 'Couldn’t load your order', '<p class="k-lede">Check your connection and reload. Your receipt is in your email.</p>');
    }
  }
  load();
})();
