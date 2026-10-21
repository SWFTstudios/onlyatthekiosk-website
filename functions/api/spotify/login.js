/**
 * GET /api/spotify/login?returnTo=/radio.html — start Spotify OAuth (PKCE).
 * Voyagers only: sign in with the email code first, then connect Spotify.
 */
import { handleOptions, withCors, error, safeReturnTo } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';
import { spotifyConfigured, SPOTIFY_SCOPES, pkcePair, randomState, redirectUri } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!spotifyConfigured(env)) return withCors(error('Spotify is not configured yet. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET as Worker secrets.', 503), request);
  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);

  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'), '/radio.html');
  const { verifier, challenge } = await pkcePair();
  const state = randomState();
  const auth = new URL('https://accounts.spotify.com/authorize');
  auth.searchParams.set('client_id', env.SPOTIFY_CLIENT_ID);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('redirect_uri', redirectUri(env, request));
  auth.searchParams.set('scope', SPOTIFY_SCOPES);
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge_method', 'S256');
  auth.searchParams.set('code_challenge', challenge);

  const cookie = `kiosk_spotify_oauth=${encodeURIComponent(JSON.stringify({ state, verifier, returnTo }))}; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, { status: 302, headers: { Location: auth.toString(), 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
}
