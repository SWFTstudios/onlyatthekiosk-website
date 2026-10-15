/**
 * GET /api/radio/cover?uri=spotify:track:<id> — one song's cover art
 *
 * Redirects to the album art on Spotify's image CDN, found through Spotify's
 * public oEmbed endpoint. The song wheel on radio.html uses it as an <img src>,
 * so covers load only for the songs on screen. Redirects are cached for a week.
 * Only Spotify image hosts are ever redirected to.
 */

import { error } from '../../_lib/http.js';

const IMAGE_HOSTS = /(^|\.)(scdn\.co|spotifycdn\.com)$/i;

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return error('Method not allowed', 405);

  const url = new URL(request.url);
  const m = /^spotify:(track|episode):([A-Za-z0-9]{16,32})$/.exec(url.searchParams.get('uri') || '');
  if (!m) return error('Unknown song', 400);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`${url.origin}/api/radio/cover?uri=spotify:${m[1]}:${m[2]}`);
  const hit = cache && (await cache.match(key));
  if (hit) return hit;

  let image = '';
  try {
    const page = encodeURIComponent(`https://open.spotify.com/${m[1]}/${m[2]}`);
    const res = await fetch(`https://open.spotify.com/oembed?url=${page}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const d = await res.json();
      const u = new URL(String(d.thumbnail_url || ''));
      if (u.protocol === 'https:' && IMAGE_HOSTS.test(u.hostname)) image = u.href;
    }
  } catch (err) { image = ''; }

  if (!image) {
    return new Response('Cover not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } });
  }
  const out = new Response(null, { status: 302, headers: { Location: image, 'Cache-Control': 'public, max-age=604800' } });
  if (cache) context.waitUntil(cache.put(key, out.clone()));
  return out;
}
