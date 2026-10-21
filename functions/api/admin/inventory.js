/**
 * /api/admin/inventory — stock per SKU (ADMIN_EMAILS only).
 *
 * GET  → every piece checkout can sell, with its stock (null = made to order)
 * POST { sku, onHand }       set the count for a limited piece
 *      { sku, onHand: null } make it made-to-order again (never sells out)
 */

import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { sellableVariants } from '../../_lib/commerce.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  const { response } = await requireAdmin(env, request);
  if (response) return withCors(response, request);

  try {
    const variants = sellableVariants();
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const v = variants.find((x) => x.sku === body.sku);
      if (!v) return withCors(error('That SKU isn’t on sale.'), request);
      if (body.onHand === null || body.onHand === '') {
        const row = await env.DB.prepare('SELECT reserved FROM inventory WHERE sku = ?').bind(v.sku).first();
        if (row && row.reserved > 0) return withCors(error('Someone is checking out with this right now. Try again in half an hour.', 409), request);
        await env.DB.prepare('DELETE FROM inventory WHERE sku = ?').bind(v.sku).run();
      } else {
        const n = Math.floor(Number(body.onHand));
        if (!(n >= 0 && n <= 100000)) return withCors(error('Enter a stock count of 0 or more.'), request);
        await env.DB.prepare(
          `INSERT INTO inventory (sku, product_id, on_hand, updated_at) VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(sku) DO UPDATE SET on_hand = MAX(excluded.on_hand, inventory.reserved), updated_at = datetime('now')`
        ).bind(v.sku, v.productId, n).run();
      }
    } else if (request.method !== 'GET') {
      return withCors(error('Method not allowed', 405), request);
    }

    const rows = (await env.DB.prepare('SELECT sku, on_hand, reserved FROM inventory').all()).results || [];
    const stock = Object.fromEntries(rows.map((r) => [r.sku, r]));
    return withCors(json({
      items: variants.map((v) => ({
        ...v,
        onHand: stock[v.sku] ? stock[v.sku].on_hand : null,
        reserved: stock[v.sku] ? stock[v.sku].reserved : 0,
      })),
    }), request);
  } catch (err) {
    console.error('api/admin/inventory', err && err.message);
    return withCors(error('Could not load stock.', 500), request);
  }
}
