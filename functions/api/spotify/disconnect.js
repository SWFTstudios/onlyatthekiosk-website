/** POST /api/spotify/disconnect — unlink Spotify from this Voyager. */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';
import { deleteConnection } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  await deleteConnection(env, session.userId);
  return withCors(json({ ok: true }), request);
}
