/**
 * POST /api/stripe/webhook — Stripe tells the site about payments.
 *
 * In the Stripe dashboard (Developers › Webhooks) point an endpoint at
 * https://onlyatthekiosk.com/api/stripe/webhook with these events, and put its
 * signing secret in STRIPE_WEBHOOK_SECRET:
 *   checkout.session.completed            paid → order, stock, emails, Airtable
 *   checkout.session.async_payment_succeeded
 *   checkout.session.async_payment_failed  → free held stock
 *   checkout.session.expired               → free held stock
 *   charge.refunded                        → order marked (partially) refunded
 *
 * Stripe retries anything that doesn't answer 2xx, and every step here is safe
 * to run twice.
 */

import { json, error } from '../../_lib/http.js';
import { verifyWebhook } from '../../_lib/stripe.js';
import { expireCheckout } from '../../_lib/orders.js';
import { isPaid, onPaidSession } from '../../_lib/order-flow.js';
import { updateOrderMirror } from '../../_lib/airtable-orders.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return error('Not configured', 503);

  const payload = await request.text();
  let event;
  try {
    event = await verifyWebhook(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe webhook signature', err && err.message);
    return error('Bad signature', 400);
  }

  const obj = (event.data && event.data.object) || {};
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        if (isPaid(obj)) await onPaidSession(context, obj);
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await expireCheckout(env, obj.id);
        break;
      case 'charge.refunded': {
        if (!obj.payment_intent) break;
        const status = obj.amount_refunded >= obj.amount ? 'refunded' : 'partially_refunded';
        await env.DB.prepare(
          "UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE payment_intent = ?"
        ).bind(status, obj.payment_intent).run();
        const order = await env.DB.prepare('SELECT * FROM orders WHERE payment_intent = ?').bind(obj.payment_intent).first();
        if (order) context.waitUntil(updateOrderMirror(env, order).catch((err) => console.error('airtable refund', err && err.message)));
        break;
      }
      default:
        break;
    }
    return json({ received: true });
  } catch (err) {
    console.error('stripe webhook', event.type, err && err.message);
    return error('Webhook handling failed', 500);
  }
}
