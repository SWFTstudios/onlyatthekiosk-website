/**
 * /api/profile — a member's onboarding answers ("Check-in")
 *
 *   GET            → { profile: { taste, onboardedAt, updatedAt } | null }
 *   PUT { taste }  → saves the cleaned answers; marks onboarding done when
 *                    taste.completedAt is set. Returns the saved profile.
 *   DELETE         → forgets the answers (the account itself stays)
 *
 * Signed-out visitors keep the same answers on their device only
 * (localStorage 'kiosk:taste'); js/kiosk-account.js uploads them on sign-in.
 */

import { json, error, handleOptions, withCors } from '../_lib/http.js';
import { requireSession } from '../_lib/session.js';
import { cleanTaste, readProfile } from '../_lib/taste.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);

  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);

  try {
    if (request.method === 'GET') {
      return withCors(json({ profile: await readProfile(env, session.userId) }), request);
    }
    if (request.method === 'PUT' || request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 8000) return withCors(error('That profile is too large.', 413), request);
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { return withCors(error('Send JSON: { taste: { … } }'), request); }
      const taste = cleanTaste(body.taste);
      const onboarded = taste.completedAt || null;
      await env.DB.prepare(
        `INSERT INTO profiles (user_id, taste, onboarded_at, updated_at) VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET taste = excluded.taste,
           onboarded_at = COALESCE(profiles.onboarded_at, excluded.onboarded_at), updated_at = datetime('now')`
      ).bind(session.userId, JSON.stringify(taste), onboarded).run();
      return withCors(json({ profile: await readProfile(env, session.userId) }), request);
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM profiles WHERE user_id = ?').bind(session.userId).run();
      return withCors(json({ profile: null }), request);
    }
    return withCors(error('Method not allowed', 405), request);
  } catch (err) {
    console.error('api/profile', err && err.message);
    return withCors(error('Could not save your check-in.', 500), request);
  }
}
