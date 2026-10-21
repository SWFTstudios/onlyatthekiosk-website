/**
 * GET /api/order?session_id=cs_... — the order behind a Stripe Checkout
 * Session, for order.html (the page Stripe sends shoppers back to) and the
 * account page. The session id is unguessable and only reaches the buyer.
 *
 * If Stripe says the session is paid but the webhook hasn't landed yet, the
 * order is settled here (the same idempotent step the webhook runs).
 *   → { order } | { pending: true } | 404
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp } from '../_lib/http.js';
import { stripe } from '../_lib/stripe.js';
import { orderItems, publicOrder } from '../_lib/orders.js';
import { isPaid, onPaidSession } from '../_lib/order-flow.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!env.DB) return withCors(error('Orders are not configured.', 503), request);
  if (!rateLimit(`order:ip:${clientIp(request)}`, { limit: 60, windowMs: 10 * 60_000 })) {
    return withCors(error('Too many requests.', 429), request);
  }

  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return withCors(error('Order not found.', 404), request);

  try {
    let order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').bind(id).first();
    if (!order && env.STRIPE_SECRET_KEY) {
      const cs = await stripe(env, 'GET', `/checkout/sessions/${id}`).catch(() => null);
      if (!cs) return withCors(error('Order not found.', 404), request);
      if (!isPaid(cs)) return withCors(json({ pending: true, status: cs.status }), request);
      order = (await onPaidSession(context, cs)).order;
    }
    if (!order) return withCors(error('Order not found.', 404), request);
    return withCors(json({ order: publicOrder(order, await orderItems(env, order.id)) }), request);
  } catch (err) {
    console.error('api/order', err && err.message);
    return withCors(error('Could not load the order.', 500), request);
  }
}
