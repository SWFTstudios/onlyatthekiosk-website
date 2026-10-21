/**
 * /api/partner — the signed-in member's Partner Hub profile
 *
 *   GET           → { partner | null, products: [] }
 *   PUT {partner} → creates or updates the profile (name, kind, handle, bio,
 *                   links, images, settings). New profiles start 'pending';
 *                   KIOSK sets them 'live' (docs/PARTNER_HUB.md).
 *   DELETE        → removes the profile and every piece listed with it
 */

import { json, error, handleOptions, withCors, rateLimit } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';
import { cleanPartner, readPartner } from '../../_lib/partner.js';
import { sendTeamNotice } from '../../_lib/mail.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);

  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  const reply = (data, status) => withCors(json(data, status), request);

  try {
    if (request.method === 'GET') return reply(await readPartner(env, session.userId));

    if (request.method === 'PUT' || request.method === 'POST') {
      if (!rateLimit(`partner:${session.userId}`, { limit: 30, windowMs: 60_000 })) return withCors(error('Too many saves. Try again in a minute.', 429), request);
      const raw = await request.text();
      if (raw.length > 16000) return withCors(error('That profile is too large.', 413), request);
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { return withCors(error('Send JSON: { partner: { … } }'), request); }
      const p = cleanPartner(body.partner, session.email);
      if (p.error) return withCors(error(p.error, 422), request);

      const taken = await env.DB.prepare('SELECT user_id FROM partners WHERE handle = ? AND user_id != ?').bind(p.handle, session.userId).first();
      const existed = await env.DB.prepare('SELECT 1 FROM partners WHERE user_id = ?').bind(session.userId).first();
      if (taken) return withCors(error(`The handle “${p.handle}” is taken. Try another.`, 409, { field: 'handle' }), request);

      await env.DB.prepare(
        `INSERT INTO partners (user_id, handle, kind, name, tagline, bio, city, country, website, instagram, logo, cover, settings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET handle = excluded.handle, kind = excluded.kind, name = excluded.name,
           tagline = excluded.tagline, bio = excluded.bio, city = excluded.city, country = excluded.country,
           website = excluded.website, instagram = excluded.instagram, logo = excluded.logo, cover = excluded.cover,
           settings = excluded.settings, updated_at = datetime('now')`
      ).bind(session.userId, p.handle, p.kind, p.name, p.tagline, p.bio, p.city, p.country, p.website, p.instagram, p.logo, p.cover, JSON.stringify(p.settings)).run();
      // A new profile waits for KIOSK to set it live: tell the team
      if (!existed && env.EMAIL) {
        context.waitUntil(sendTeamNotice(env, { interest: 'partner', email: session.email, title: `New Partner Hub profile: ${p.name} (@${p.handle}, ${p.kind}) · pending review`, source: '/partner' })
          .catch((err) => console.error('partner notice', err && err.message)));
      }
      return reply(await readPartner(env, session.userId));
    }

    if (request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM partner_products WHERE user_id = ?').bind(session.userId),
        env.DB.prepare('DELETE FROM partners WHERE user_id = ?').bind(session.userId),
      ]);
      return reply({ partner: null, products: [] });
    }
    return withCors(error('Method not allowed', 405), request);
  } catch (err) {
    console.error('api/partner', err && err.message);
    return withCors(error('Could not save your partner profile.', 500), request);
  }
}
