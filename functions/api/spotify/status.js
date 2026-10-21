/** GET /api/spotify/status — is Spotify configured, is this Voyager connected? */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { accountsReady, getSession } from '../../_lib/session.js';
import { spotifyConfigured, getConnection } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  const configured = spotifyConfigured(env);
  if (!accountsReady(env)) return withCors(json({ configured, voyager: false, connected: false, premium: false }), request);
  const session = await getSession(env, request);
  if (!session) return withCors(json({ configured, voyager: false, connected: false, premium: false }), request);
  const row = configured ? await getConnection(env, session.userId) : null;
  return withCors(json({
    configured,
    voyager: true,
    connected: !!row,
    premium: !!row && row.product === 'premium',
    product: row ? row.product : '',
    displayName: row ? row.display_name : '',
    spotifyUserId: row ? row.spotify_user_id : '',
  }), request);
}
