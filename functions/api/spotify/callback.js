/** GET /api/spotify/callback — Spotify redirects here after consent. */
import { parseCookies } from '../../_lib/http.js';
import { getSession } from '../../_lib/session.js';
import { spotifyConfigured, exchangeCode, spotifyApi, saveConnection } from '../../_lib/spotify.js';

const CLEAR = 'kiosk_spotify_oauth=; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
const back = (returnTo, flag) => {
  const sep = returnTo.includes('?') ? '&' : '?';
  return new Response(null, { status: 302, headers: { Location: `${returnTo}${sep}spotify=${flag}`, 'Set-Cookie': CLEAR, 'Cache-Control': 'no-store' } });
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let saved = {};
  try { saved = JSON.parse(parseCookies(request).kiosk_spotify_oauth || '{}'); } catch { saved = {}; }
  const returnTo = saved.returnTo && saved.returnTo.startsWith('/') && !saved.returnTo.startsWith('//') ? saved.returnTo : '/radio.html';
  if (!spotifyConfigured(env)) return back(returnTo, 'unconfigured');
  const session = await getSession(env, request);
  if (!session) return back('/account.html', 'sign-in-first');
  if (url.searchParams.get('error')) return back(returnTo, 'declined');
  const code = url.searchParams.get('code') || '';
  if (!code || !saved.state || url.searchParams.get('state') !== saved.state || !saved.verifier) return back(returnTo, 'failed');
  try {
    const tokens = await exchangeCode(env, request, code, saved.verifier);
    const access = tokens.access_token;
    const profile = await spotifyApi(env, access, '/me');
    await saveConnection(env, session.userId, tokens, profile);
    return back(returnTo, 'connected');
  } catch (err) {
    console.error('spotify callback', err && err.message);
    return back(returnTo, 'failed');
  }
}
