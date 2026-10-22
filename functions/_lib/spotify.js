/**
 * Spotify helpers for KIOSK Radio.
 *
 * Flow: Authorization Code + PKCE. The Voyager's refresh token lives only
 * here (D1, AES-GCM encrypted with SPOTIFY_TOKEN_KEY / AUTH_SECRET); the
 * browser only ever sees 1-hour access tokens for the Web Playback SDK.
 * Secrets (Worker secrets, never code): SPOTIFY_CLIENT_ID,
 * SPOTIFY_CLIENT_SECRET, SPOTIFY_TOKEN_KEY (falls back to AUTH_SECRET).
 */

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export const spotifyConfigured = (env) => Boolean(env && env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
const tokenKeySource = (env) => (env && (env.SPOTIFY_TOKEN_KEY || env.AUTH_SECRET)) || '';

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export function randomState(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export async function pkcePair() {
  const verifier = randomState(48);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(digest) };
}

async function aesKey(env) {
  const src = tokenKeySource(env);
  if (!src) return null;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kiosk-spotify:${src}`));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptText(env, plain) {
  const key = await aesKey(env);
  if (!key || !plain) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return `${b64url(iv)}.${b64url(cipher)}`;
}

export async function decryptText(env, stored) {
  const key = await aesKey(env);
  if (!key || !stored || !stored.includes('.')) return null;
  try {
    const [iv, cipher] = stored.split('.');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(iv) }, key, unb64url(cipher));
    return new TextDecoder().decode(plain);
  } catch { return null; }
}

export function redirectUri(env, request) {
  if (env && env.SPOTIFY_REDIRECT_URI) return env.SPOTIFY_REDIRECT_URI;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/spotify/callback`;
}

async function tokenRequest(env, params) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || 'Spotify token request failed');
  return data;
}

export const exchangeCode = (env, request, code, verifier) => tokenRequest(env, {
  grant_type: 'authorization_code', code, redirect_uri: redirectUri(env, request), code_verifier: verifier,
});
const refreshTokens = (env, refreshToken) => tokenRequest(env, { grant_type: 'refresh_token', refresh_token: refreshToken });

export async function spotifyApi(env, accessToken, path, opts = {}) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Spotify request failed');
  return data;
}

export async function saveConnection(env, userId, tokens, profile) {
  const refresh = tokens.refresh_token;
  if (!refresh) throw new Error('Spotify did not return a refresh token');
  const [refreshEnc, accessEnc] = await Promise.all([
    encryptText(env, refresh), encryptText(env, tokens.access_token || ''),
  ]);
  if (!refreshEnc) throw new Error('SPOTIFY_TOKEN_KEY / AUTH_SECRET is not configured');
  const expiresAt = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO spotify_connections (user_id, spotify_user_id, display_name, product, scopes, refresh_token_enc, access_token_enc, access_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET spotify_user_id=excluded.spotify_user_id, display_name=excluded.display_name,
       product=excluded.product, scopes=excluded.scopes, refresh_token_enc=excluded.refresh_token_enc,
       access_token_enc=excluded.access_token_enc, access_expires_at=excluded.access_expires_at, updated_at=datetime('now')`,
  ).bind(userId, profile.id || '', profile.display_name || '', profile.product || '', tokens.scope || SPOTIFY_SCOPES, refreshEnc, accessEnc, expiresAt).run();
}

export async function getConnection(env, userId) {
  if (!env || !env.DB) return null;
  try {
    return await env.DB.prepare('SELECT * FROM spotify_connections WHERE user_id = ?').bind(userId).first();
  } catch { return null; } // migration not applied yet
}

export async function deleteConnection(env, userId) {
  if (!env || !env.DB) return;
  await env.DB.prepare('DELETE FROM spotify_connections WHERE user_id = ?').bind(userId).run();
}

/** A valid access token for the Voyager, refreshing (and rotating) when needed. */
export async function validAccessToken(env, userId) {
  const row = await getConnection(env, userId);
  if (!row) return { row: null, accessToken: null };
  const expires = row.access_expires_at ? Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(row.access_expires_at) ? row.access_expires_at : `${row.access_expires_at}Z`) : 0;
  if (row.access_token_enc && expires > Date.now() + 60_000) {
    const cached = await decryptText(env, row.access_token_enc);
    if (cached) return { row, accessToken: cached };
  }
  const refresh = await decryptText(env, row.refresh_token_enc);
  if (!refresh) return { row, accessToken: null };
  const tokens = await refreshTokens(env, refresh);
  const nextRefresh = tokens.refresh_token || refresh;
  const [refreshEnc, accessEnc] = await Promise.all([encryptText(env, nextRefresh), encryptText(env, tokens.access_token)]);
  const expiresAt = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000).toISOString();
  await env.DB.prepare(
    `UPDATE spotify_connections SET refresh_token_enc = ?, access_token_enc = ?, access_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`,
  ).bind(refreshEnc, accessEnc, expiresAt, userId).run();
  return { row, accessToken: tokens.access_token };
}

export const normalizeTrack = (t) => {
  if (!t || !t.id) return null;
  const album = t.album || {};
  const images = (album.images || []).slice().sort((a, b) => (b.width || 0) - (a.width || 0));
  return {
    id: t.id,
    uri: t.uri || `spotify:track:${t.id}`,
    title: t.name || '',
    artist: (t.artists || []).map((a) => a.name).filter(Boolean).join(', '),
    album: album.name || '',
    cover: (images[1] || images[0] || {}).url || '',
    durationMs: t.duration_ms || 0,
    explicit: !!t.explicit,
  };
};

/* ------------------------------------------------ YouTube video matching */

const ytSearchCacheKey = (track) => `${track.artist} ${track.title} official music video`.trim();

export async function resolveYouTubeVideo(env, userId, track, curated = {}) {
  if (curated && curated[track.id]) return { youtube: curated[track.id], source: 'curated', verified: true };
  if (!env || !env.DB) return null;
  try {
    const blocked = await env.DB.prepare('SELECT 1 FROM tv_video_blocks WHERE user_id = ? AND spotify_track_id = ?').bind(userId || '', track.id).first();
    if (blocked) return null;
    const hit = await env.DB.prepare('SELECT youtube_id, verified FROM tv_video_map WHERE spotify_track_id = ?').bind(track.id).first();
    if (hit) return { youtube: hit.youtube_id, source: 'cache', verified: !!hit.verified };
  } catch { /* tables not migrated yet */ }
  if (!env.YOUTUBE_API_KEY) return null;
  const q = encodeURIComponent(ytSearchCacheKey(track));
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=1&q=${q}&key=${env.YOUTUBE_API_KEY}`);
  const data = await res.json().catch(() => ({}));
  const id = data && data.items && data.items[0] && data.items[0].id && data.items[0].id.videoId;
  if (!id) return null;
  try {
    await env.DB.prepare(
      'INSERT INTO tv_video_map (spotify_track_id, youtube_id, verified) VALUES (?, ?, 0) ON CONFLICT(spotify_track_id) DO NOTHING',
    ).bind(track.id, id).run();
  } catch { /* ignore */ }
  return { youtube: id, source: 'youtube-search', verified: false };
}
