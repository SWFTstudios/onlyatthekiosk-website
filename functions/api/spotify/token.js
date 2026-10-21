/** GET /api/spotify/token — short-lived access token for the Web Playback SDK. */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';
import { spotifyConfigured, validAccessToken } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!spotifyConfigured(env)) return withCors(error('Spotify is not configured yet.', 503), request);
  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  try {
    const { row, accessToken } = await validAccessToken(env, session.userId);
    if (!row) return withCors(error('Spotify is not connected.', 404), request);
    if (!accessToken) return withCors(error('Spotify session expired. Connect Spotify again.', 401), request);
    return withCors(json({ accessToken, premium: row.product === 'premium', expiresAt: row.access_expires_at }), request);
  } catch (err) {
    console.error('spotify token', err && err.message);
    return withCors(error('Could not refresh Spotify. Connect Spotify again.', 401), request);
  }
}
