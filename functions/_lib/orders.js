/**
 * Orders from Stripe Checkout, stored in D1 (`orders`, `order_items`).
 * The webhook calls createOrderFromSession once a session is paid; it is safe
 * to call twice (Stripe retries), the second call finds the order and stops.
 */

import { randomToken } from './session.js';
import { orderNumber } from './commerce.js';
import { commit, release } from './inventory.js';
import { stripe } from './stripe.js';

export const FULFILLMENT = ['unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled'];

const parse = (s, fallback) => { try { return JSON.parse(s); } catch (e) { return fallback; } };

/** Address fields Stripe sends, across API versions. */
function shippingDetails(cs) {
  const sd = (cs.collected_information && cs.collected_information.shipping_details) || cs.shipping_details || {};
  const a = sd.address || (cs.customer_details && cs.customer_details.address) || {};
  return {
    name: sd.name || (cs.customer_details && cs.customer_details.name) || '',
    line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', state: a.state || '',
    postal_code: a.postal_code || '', country: a.country || '',
  };
}

export function formatAddress(to) {
  const t = to || {};
  return [t.name, t.line1, t.line2, [t.city, t.state, t.postal_code].filter(Boolean).join(' '), t.country].filter(Boolean);
}

/** Lines from Stripe itself, for a paid session whose snapshot is missing. */
async function linesFromStripe(env, sessionId) {
  const res = await stripe(env, 'GET', `/checkout/sessions/${sessionId}/line_items`, { limit: 100, expand: ['data.price.product'] });
  return (res.data || []).map((li) => {
    const prod = (li.price && li.price.product) || {};
    const meta = prod.metadata || {};
    return {
      productId: meta.product_id || '', cw: 0, size: '', colour: '', sku: meta.sku || '',
      title: li.description || prod.name || 'Item', variantTitle: prod.description || '',
      quantity: li.quantity || 1, unitAmount: (li.price && li.price.unit_amount) || 0, reserved: false,
    };
  });
}

/** → { created, order, items } */
export async function createOrderFromSession(env, cs) {
  const existing = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').bind(cs.id).first();
  if (existing) return { created: false, order: existing, items: await orderItems(env, existing.id) };

  const snap = await env.DB.prepare('SELECT * FROM checkouts WHERE session_id = ?').bind(cs.id).first();
  const lines = snap ? parse(snap.lines, []) : await linesFromStripe(env, cs.id);
  const cd = cs.customer_details || {};
  const email = String(cd.email || cs.customer_email || '').toLowerCase();
  const to = shippingDetails(cs);
  const td = cs.total_details || {};
  let userId = (snap && snap.user_id) || (cs.metadata && cs.metadata.user_id) || null;
  if (!userId && email) {
    const u = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    userId = u ? u.id : null;
  }

  const order = {
    id: randomToken(12),
    number: orderNumber(),
    stripe_session_id: cs.id,
    payment_intent: typeof cs.payment_intent === 'string' ? cs.payment_intent : (cs.payment_intent && cs.payment_intent.id) || null,
    user_id: userId,
    email,
    name: cd.name || to.name || '',
    phone: cd.phone || '',
    ship_to: JSON.stringify(to),
    country: to.country || (snap && snap.country) || '',
    currency: cs.currency || 'usd',
    subtotal: cs.amount_subtotal != null ? cs.amount_subtotal : (snap ? snap.subtotal : 0),
    shipping: td.amount_shipping != null ? td.amount_shipping : (snap ? snap.shipping : 0),
    tax: td.amount_tax || 0,
    discount: td.amount_discount || 0,
    total: cs.amount_total || 0,
  };

  // The unique index on stripe_session_id settles a race between two deliveries
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO orders (id, number, stripe_session_id, payment_intent, user_id, email, name, phone,
       ship_to, country, currency, subtotal, shipping, tax, discount, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(order.id, order.number, order.stripe_session_id, order.payment_intent, order.user_id, order.email, order.name,
    order.phone, order.ship_to, order.country, order.currency, order.subtotal, order.shipping, order.tax,
    order.discount, order.total).run();
  if (!res.meta || !res.meta.changes) {
    const won = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').bind(cs.id).first();
    return { created: false, order: won, items: won ? await orderItems(env, won.id) : [] };
  }

  if (lines.length) {
    await env.DB.batch(lines.map((l) => env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, cw, colour, size, sku, title, quantity, unit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(order.id, l.productId || '', l.cw || 0, l.colour || '', l.size || '', l.sku || '', l.title, l.quantity, l.unitAmount)));
  }

  if (snap) {
    const paid = await env.DB.prepare("UPDATE checkouts SET status = 'paid' WHERE session_id = ? AND status = 'open'").bind(cs.id).run();
    if (paid.meta && paid.meta.changes) await commit(env, lines);
    if (snap.cart_id) await env.DB.prepare("UPDATE kiosk_carts SET lines = '[]', updated_at = datetime('now') WHERE id = ?").bind(snap.cart_id).run();
  }

  const saved = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(order.id).first();
  return { created: true, order: saved, items: await orderItems(env, order.id) };
}

/** A session that was never paid: free its stock. */
export async function expireCheckout(env, sessionId) {
  const snap = await env.DB.prepare('SELECT lines FROM checkouts WHERE session_id = ?').bind(sessionId).first();
  if (!snap) return false;
  const res = await env.DB.prepare("UPDATE checkouts SET status = 'expired' WHERE session_id = ? AND status = 'open'").bind(sessionId).run();
  if (res.meta && res.meta.changes) await release(env, parse(snap.lines, []));
  return true;
}

export async function orderItems(env, orderId) {
  const r = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(orderId).all();
  return r.results || [];
}

export const itemLine = (it) => `${it.title}${[it.colour, it.size].filter(Boolean).length ? ` (${[it.colour, it.size].filter(Boolean).join(' · ')})` : ''} × ${it.quantity}`;

export const cents = (n, currency = 'usd') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((n || 0) / 100); } catch (e) { return `$${((n || 0) / 100).toFixed(2)}`; }
};

export function trackingUrl(carrier, tracking) {
  if (!tracking) return '';
  const t = encodeURIComponent(tracking);
  if (/ups/i.test(carrier)) return `https://www.ups.com/track?tracknum=${t}`;
  if (/fedex/i.test(carrier)) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  if (/dhl/i.test(carrier)) return `https://www.dhl.com/en/express/tracking.html?AWB=${t}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
}

/** What a customer may see about their order (no internal notes or ids). */
export function publicOrder(o, items) {
  return {
    number: o.number,
    createdAt: o.created_at,
    email: o.email,
    shipTo: parse(o.ship_to, {}),
    status: o.fulfillment_status,
    payment: o.payment_status,
    carrier: o.carrier,
    tracking: o.tracking,
    trackingUrl: trackingUrl(o.carrier, o.tracking),
    currency: o.currency,
    subtotal: o.subtotal, shipping: o.shipping, tax: o.tax, discount: o.discount, total: o.total,
    items: (items || []).map((it) => ({ title: it.title, colour: it.colour, size: it.size, quantity: it.quantity, unitAmount: it.unit_amount, productId: it.product_id })),
  };
}
