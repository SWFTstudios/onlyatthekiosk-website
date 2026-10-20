/**
 * /api/live — who's on the site right now, for the pins on the home globe
 *
 *   POST { id }          heartbeat from an open tab (id: random, per tab);
 *                        answers like GET, without the caller in the list
 *   POST { id, leave }   the tab closed: drop it now
 *   GET                  → { enabled, count, viewers: [{ lat, lon, city, country, n }] }
 *
 * A viewer is anyone heard from in the last two minutes (tabs check in every
 * half minute). Locations are the city-level guess Cloudflare attaches to each
 * request (no permission prompt), rounded to one decimal (~10 km) and grouped
 * by place; nothing else is kept. A visitor Cloudflare can't place still
 * counts, they just get no pin (stored at 0,0, which the list leaves out).
 * Needs only the D1 binding DB (table: migrations/0004_presence.sql).
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp } from '../_lib/http.js';
import { sha256Hex } from '../_lib/session.js';

const LIVE_S = 120;      // counts as "here now"
const SWEEP_S = 600;     // rows older than this are deleted

async function list(env, now, selfHash) {
  const rows = await env.DB.prepare(
    `SELECT lat, lon, city, country, COUNT(*) AS n FROM presence
     WHERE seen_at >= ? AND id != ? AND NOT (lat = 0 AND lon = 0) GROUP BY lat, lon, city, country ORDER BY n DESC LIMIT 300`
  ).bind(now - LIVE_S, selfHash || '').all();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM presence WHERE seen_at >= ?').bind(now - LIVE_S).first();
  return { enabled: true, count: Number((total && total.n) || 0), viewers: (rows.results || []).map((r) => ({ lat: r.lat, lon: r.lon, city: r.city, country: r.country, n: Number(r.n) })) };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  const reply = (data, status = 200) => withCors(json(data, status), request);
  if (!env || !env.DB) return reply({ enabled: false, count: 0, viewers: [] });
  const now = Math.floor(Date.now() / 1000);

  try {
    if (request.method === 'GET') return reply(await list(env, now, ''));
    if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);

    if (!rateLimit(`live:${clientIp(request)}`, { limit: 90, windowMs: 60_000 })) return withCors(error('Slow down.', 429), request);
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' && /^[a-z0-9]{16,64}$/i.test(body.id) ? body.id : '';
    if (!id) return withCors(error('Send { id }: a random id for this tab.'), request);
    const hash = await sha256Hex(`live:${id}`);

    if (body.leave) {
      await env.DB.prepare('DELETE FROM presence WHERE id = ?').bind(hash).run();
      return reply({ ok: true });
    }
    const cf = request.cf || {};
    const lat = Number(cf.latitude); const lon = Number(cf.longitude);
    const known = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM presence WHERE seen_at < ?').bind(now - SWEEP_S),
      env.DB.prepare(
        `INSERT INTO presence (id, lat, lon, city, country, seen_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET lat = excluded.lat, lon = excluded.lon, city = excluded.city, country = excluded.country, seen_at = excluded.seen_at`
      ).bind(hash, known ? Math.round(lat * 10) / 10 : 0, known ? Math.round(lon * 10) / 10 : 0,
        known ? String(cf.city || '').slice(0, 60) : '', known ? String(cf.country || '').slice(0, 2) : '', now),
    ]);
    return reply(await list(env, now, hash));
  } catch (err) {
    console.error('api/live', err && err.message);
    return reply({ enabled: false, count: 0, viewers: [] });
  }
}
