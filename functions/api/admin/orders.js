/**
 * /api/admin/orders — the back office's order list (ADMIN_EMAILS only).
 *
 * GET  ?status=open|unfulfilled|packed|shipped|delivered|cancelled|all&q=
 *      open = unfulfilled + packed (what still has to leave Jersey City)
 * POST { id, action: 'status', status }                 packed, delivered, cancelled…
 *      { id, action: 'ship', carrier, tracking, notify } shipped + email to the buyer
 *      { id, action: 'note', notes }
 * Every change is copied to the order's Airtable row.
 */

import { json, error, handleOptions, withCors, safeText, siteOrigin } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { FULFILLMENT, orderItems, trackingUrl } from '../../_lib/orders.js';
import { dashboardPaymentUrl } from '../../_lib/stripe.js';
import { sendShippedNotice } from '../../_lib/mail.js';
import { updateOrderMirror } from '../../_lib/airtable-orders.js';

const parse = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

function view(env, o, items) {
  return {
    id: o.id,
    number: o.number,
    createdAt: o.created_at,
    email: o.email,
    name: o.name,
    phone: o.phone,
    shipTo: parse(o.ship_to),
    country: o.country,
    currency: o.currency,
    subtotal: o.subtotal, shipping: o.shipping, tax: o.tax, discount: o.discount, total: o.total,
    payment: o.payment_status,
    status: o.fulfillment_status,
    carrier: o.carrier,
    tracking: o.tracking,
    trackingUrl: trackingUrl(o.carrier, o.tracking),
    shippedAt: o.shipped_at,
    notes: o.notes,
    member: Boolean(o.user_id),
    stripeUrl: o.payment_intent ? dashboardPaymentUrl(env, o.payment_intent) : '',
    items: items.map((it) => ({ title: it.title, colour: it.colour, size: it.size, sku: it.sku, quantity: it.quantity, unitAmount: it.unit_amount, productId: it.product_id })),
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  const { response } = await requireAdmin(env, request);
  if (response) return withCors(response, request);

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || 'open';
      const q = safeText(url.searchParams.get('q') || '', 80).toLowerCase();
      const where = [];
      const args = [];
      if (status === 'open') where.push("fulfillment_status IN ('unfulfilled', 'packed')");
      else if (FULFILLMENT.includes(status)) { where.push('fulfillment_status = ?'); args.push(status); }
      if (q) {
        where.push('(LOWER(number) LIKE ? OR LOWER(email) LIKE ? OR LOWER(name) LIKE ? OR LOWER(tracking) LIKE ?)');
        args.push(...Array(4).fill(`%${q}%`));
      }
      const rows = (await env.DB.prepare(
        `SELECT * FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY ${status === 'open' ? 'created_at ASC' : 'created_at DESC'} LIMIT 200`
      ).bind(...args).all()).results || [];
      const items = rows.length ? ((await env.DB.prepare(
        `SELECT * FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`
      ).bind(...rows.map((r) => r.id)).all()).results || []) : [];
      const by = items.reduce((m, it) => { (m[it.order_id] = m[it.order_id] || []).push(it); return m; }, {});
      return withCors(json({ orders: rows.map((o) => view(env, o, by[o.id] || [])) }), request);
    }

    if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
    const body = await request.json().catch(() => ({}));
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(String(body.id || '')).first();
    if (!order) return withCors(error('Order not found.', 404), request);

    if (body.action === 'status') {
      if (!FULFILLMENT.includes(body.status) || body.status === 'shipped') return withCors(error('Pick a status.'), request);
      await env.DB.prepare("UPDATE orders SET fulfillment_status = ?, updated_at = datetime('now') WHERE id = ?").bind(body.status, order.id).run();
    } else if (body.action === 'ship') {
      const carrier = safeText(body.carrier || 'USPS', 20);
      const tracking = safeText(body.tracking || '', 60).replace(/\s+/g, '');
      await env.DB.prepare(
        `UPDATE orders SET fulfillment_status = 'shipped', carrier = ?, tracking = ?,
           shipped_at = COALESCE(shipped_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`
      ).bind(carrier, tracking, order.id).run();
    } else if (body.action === 'note') {
      await env.DB.prepare("UPDATE orders SET notes = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(String(body.notes || '').slice(0, 2000), order.id).run();
    } else {
      return withCors(error('Unknown action.'), request);
    }

    const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(order.id).first();
    const items = await orderItems(env, order.id);
    if (body.action === 'ship' && body.notify !== false && env.EMAIL) {
      context.waitUntil(sendShippedNotice(env, { order: updated, items, origin: siteOrigin(request, env) })
        .catch((err) => console.error('shipped email', err && err.message)));
    }
    context.waitUntil(updateOrderMirror(env, updated).catch((err) => console.error('airtable order update', err && err.message)));
    return withCors(json({ order: view(env, updated, items) }), request);
  } catch (err) {
    console.error('api/admin/orders', err && err.message);
    return withCors(error('Could not load orders.', 500), request);
  }
}
