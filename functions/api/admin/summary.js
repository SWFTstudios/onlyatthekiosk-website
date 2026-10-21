/**
 * GET /api/admin/summary — the back office overview (ADMIN_EMAILS only):
 * sales figures, what's waiting to ship, best sellers, buyers, low stock and
 * demand from "Notify me" signups (per product, size and colour).
 */

import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { productById } from '../../_lib/commerce.js';

// Orders that still count as sales
const PAID = "payment_status != 'refunded' AND fulfillment_status != 'cancelled'";
const PAID_O = "o.payment_status != 'refunded' AND o.fulfillment_status != 'cancelled'";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  const { response } = await requireAdmin(env, request);
  if (response) return withCors(response, request);

  try {
    const sales = (since) => env.DB.prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE ${PAID}${since ? ` AND created_at >= datetime('now', '${since}')` : ''}`
    ).first();
    const [today, week, month, all, toShip, best, buyers, low, demand] = await Promise.all([
      sales('start of day'),
      sales('-7 days'),
      sales('-30 days'),
      sales(null),
      env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE fulfillment_status IN ('unfulfilled', 'packed')").first(),
      env.DB.prepare(
        `SELECT i.product_id, i.title, SUM(i.quantity) AS units, SUM(i.quantity * i.unit_amount) AS revenue
         FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID_O}
         GROUP BY i.product_id ORDER BY units DESC LIMIT 10`
      ).all(),
      env.DB.prepare(
        `SELECT email, MAX(name) AS name, MAX(country) AS country, COUNT(*) AS orders, SUM(total) AS spent,
                MIN(created_at) AS first, MAX(created_at) AS last, MAX(user_id IS NOT NULL) AS member
         FROM orders WHERE ${PAID} GROUP BY email ORDER BY spent DESC LIMIT 200`
      ).all(),
      env.DB.prepare('SELECT sku, product_id, on_hand, reserved FROM inventory WHERE on_hand - reserved <= 3 ORDER BY on_hand - reserved').all(),
      env.DB.prepare(
        `SELECT interest, MAX(title) AS title, size, colour, COUNT(*) AS n FROM subscribers
         WHERE interest NOT IN ('dispatch', 'stockist', 'partner')
         GROUP BY interest, size, colour ORDER BY n DESC LIMIT 100`
      ).all().catch(() => ({ results: [] })),
    ]);

    return withCors(json({
      sales: { today, week, month, all },
      toShip: toShip.n,
      bestSellers: (best.results || []).map((r) => ({ productId: r.product_id, title: r.title, units: r.units, revenue: r.revenue })),
      customers: (buyers.results || []).map((r) => ({ ...r, member: Boolean(r.member) })),
      lowStock: (low.results || []).map((r) => ({ sku: r.sku, title: (productById(r.product_id) || {}).title || r.product_id, left: r.on_hand - r.reserved, reserved: r.reserved })),
      demand: (demand.results || []).map((r) => {
        const productId = String(r.interest).split('@')[0];
        const p = productById(productId);
        return { productId, title: (p && p.title) || r.title || productId, size: r.size, colour: r.colour, count: r.n, status: p ? p.status : '' };
      }),
    }), request);
  } catch (err) {
    console.error('api/admin/summary', err && err.message);
    return withCors(error('Could not load the overview.', 500), request);
  }
}
