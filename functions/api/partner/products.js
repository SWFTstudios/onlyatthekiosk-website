/**
 * /api/partner/products — the pieces a partner lists on the kiosk
 *
 *   POST   { product }       → adds one (draft unless status: 'live')
 *   PUT    { id, product }   → updates one
 *   PUT    { order: [ids] }  → re-orders them
 *   DELETE ?id=…             → removes one
 * Every call answers with the whole profile: { partner, products }.
 */

import { json, error, handleOptions, withCors, rateLimit } from '../../_lib/http.js';
import { requireSession, randomToken } from '../../_lib/session.js';
import { cleanProduct, readPartner, MAX_PRODUCTS } from '../../_lib/partner.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);

  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  const fail = (msg, status = 400) => withCors(error(msg, status), request);
  const uid = session.userId;

  try {
    const partner = await env.DB.prepare('SELECT user_id FROM partners WHERE user_id = ?').bind(uid).first();
    if (!partner) return fail('Set up your partner profile first.', 409);
    if (!rateLimit(`partner-products:${uid}`, { limit: 60, windowMs: 60_000 })) return fail('Too many changes. Try again in a minute.', 429);

    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id') || '';
      await env.DB.prepare('DELETE FROM partner_products WHERE id = ? AND user_id = ?').bind(id.slice(0, 64), uid).run();
      return withCors(json(await readPartner(env, uid)), request);
    }

    if (request.method !== 'POST' && request.method !== 'PUT') return fail('Method not allowed', 405);
    const raw = await request.text();
    if (raw.length > 12000) return fail('That listing is too large.', 413);
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { return fail('Send JSON: { product: { … } }'); }

    if (request.method === 'PUT' && Array.isArray(body.order)) {
      const ids = body.order.filter((x) => typeof x === 'string').slice(0, MAX_PRODUCTS);
      if (ids.length) {
        await env.DB.batch(ids.map((id, i) => env.DB.prepare(`UPDATE partner_products SET sort = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(i, id, uid)));
      }
      return withCors(json(await readPartner(env, uid)), request);
    }

    const p = cleanProduct(body.product);
    if (p.error) return fail(p.error, 422);

    if (request.method === 'POST') {
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM partner_products WHERE user_id = ?').bind(uid).first();
      if ((n && n.n) >= MAX_PRODUCTS) return fail(`You can list up to ${MAX_PRODUCTS} pieces.`, 409);
      await env.DB.prepare(
        `INSERT INTO partner_products (id, user_id, title, description, price, currency, url, image, status, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(randomToken(10), uid, p.title, p.description, p.price, p.currency, p.url, p.image, p.status, (n && n.n) || 0).run();
    } else {
      const id = typeof body.id === 'string' ? body.id.slice(0, 64) : '';
      const res = await env.DB.prepare(
        `UPDATE partner_products SET title = ?, description = ?, price = ?, currency = ?, url = ?, image = ?, status = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      ).bind(p.title, p.description, p.price, p.currency, p.url, p.image, p.status, id, uid).run();
      if (!res.meta || !res.meta.changes) return fail('That piece was not found.', 404);
    }
    return withCors(json(await readPartner(env, uid)), request);
  } catch (err) {
    console.error('api/partner/products', err && err.message);
    return fail('Could not save that piece.', 500);
  }
}
