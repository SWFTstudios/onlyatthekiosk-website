/** POST /api/tv/not-this-video { spotifyTrackId } — never serve that match to this Voyager again. */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const id = String(body.spotifyTrackId || '');
  if (!/^[A-Za-z0-9]{8,32}$/.test(id)) return withCors(error('Unknown track', 400), request);
  await env.DB.prepare('INSERT OR IGNORE INTO tv_video_blocks (user_id, spotify_track_id) VALUES (?, ?)').bind(session.userId, id).run();
  return withCors(json({ ok: true }), request);
}
