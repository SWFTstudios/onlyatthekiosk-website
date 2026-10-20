/**
 * GET /api/partners — the public directory: live partners who chose to be
 * listed, with their live pieces. No emails or settings leave the server.
 *   ?handle=…  → one partner (or 404)
 */

import { json, error, handleOptions, withCors } from '../_lib/http.js';
import { accountsReady } from '../_lib/session.js';

const pub = (r) => ({
  handle: r.handle, kind: r.kind, name: r.name, tagline: r.tagline, bio: r.bio,
  city: r.city, country: r.country, website: r.website, instagram: r.instagram, logo: r.logo, cover: r.cover,
});

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!accountsReady(env)) return withCors(json({ partners: [] }), request);

  try {
    const handle = (new URL(request.url).searchParams.get('handle') || '').toLowerCase().slice(0, 40);
    const rows = await env.DB.prepare(
      `SELECT * FROM partners WHERE status = 'live' AND json_extract(settings, '$.listed') IS NOT 0
       ${handle ? 'AND handle = ?' : ''} ORDER BY name LIMIT 200`
    ).bind(...(handle ? [handle] : [])).all();
    const list = rows.results || [];
    if (handle && !list.length) return withCors(error('Partner not found.', 404), request);
    const products = list.length ? await env.DB.prepare(
      `SELECT * FROM partner_products WHERE status = 'live' AND user_id IN (${list.map(() => '?').join(',')}) ORDER BY sort, created_at`
    ).bind(...list.map((r) => r.user_id)).all() : { results: [] };
    const byUser = {};
    (products.results || []).forEach((p) => { (byUser[p.user_id] = byUser[p.user_id] || []).push({ id: p.id, title: p.title, description: p.description, price: p.price, currency: p.currency, url: p.url, image: p.image }); });
    const partners = list.map((r) => ({ ...pub(r), products: byUser[r.user_id] || [] }));
    return withCors(json({ partners }, 200, { 'Cache-Control': 'public, max-age=120' }), request);
  } catch (err) {
    console.error('api/partners', err && err.message);
    return withCors(error('Could not load partners.', 500), request);
  }
}
