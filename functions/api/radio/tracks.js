/**
 * GET /api/radio/tracks?spotify=<playlist id> — the songs in a KIOSK Radio playlist
 *
 * The song wheel on radio.html needs each song's title, artist and Spotify URI.
 * Spotify's public embed page for a playlist carries that list (the same one
 * the embedded player shows), so no Spotify API key is needed. Answers are
 * cached at the edge for an hour and in the browser for ten minutes.
 *
 *   → { title, cover, tracks: [{ uri, title, artist, duration, explicit, cover }] }
 *     A song's cover is null when the embed has no art for it: the page then
 *     loads it from /api/radio/cover.
 */

import { json, error, handleOptions, withCors } from '../../_lib/http.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CACHE = 'public, max-age=600, s-maxage=3600';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return error('Method not allowed', 405);

  const url = new URL(request.url);
  const id = url.searchParams.get('spotify') || '';
  if (!/^[A-Za-z0-9]{16,32}$/.test(id)) return withCors(error('Unknown playlist', 400), request);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`${url.origin}/api/radio/tracks?spotify=${id}`);
  const hit = cache && (await cache.match(key));
  if (hit) return withCors(hit, request);

  let body;
  try {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return withCors(error('Spotify is unavailable', 502), request);
    body = parsePlaylist(await res.text());
  } catch (err) {
    return withCors(error('Spotify is unavailable', 502), request);
  }
  if (!body) return withCors(error('Tracklist unavailable', 502), request);

  const out = json(body, 200, { 'Cache-Control': CACHE });
  if (cache) context.waitUntil(cache.put(key, out.clone()));
  return withCors(out, request);
}

/** The embed page is a Next.js app: its __NEXT_DATA__ JSON holds the playlist entity. */
function parsePlaylist(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data;
  try { data = JSON.parse(m[1]); } catch (err) { return null; }
  const entity = findEntity(data);
  if (!entity) return null;
  const tracks = entity.trackList
    .filter((t) => t && typeof t.uri === 'string' && /^spotify:(track|episode):[A-Za-z0-9]+$/.test(t.uri))
    .slice(0, 300)
    .map((t) => ({
      uri: t.uri,
      title: String(t.title || ''),
      artist: String(t.subtitle || ''),
      duration: Number(t.duration) || 0,
      explicit: !!t.isExplicit,
      cover: pickImage(t),
    }));
  return { title: String(entity.name || entity.title || ''), cover: pickImage(entity), tracks };
}

/** Depth-first search for the object that holds `trackList`. */
function findEntity(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 14) return null;
  if (Array.isArray(node.trackList)) return node;
  for (const v of Object.values(node)) {
    const hit = findEntity(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** A cover around 300–640px wide from whichever image list the object has. */
function pickImage(x) {
  if (!x) return null;
  const list = (x.coverArt && x.coverArt.sources) || x.images || (x.visualIdentity && x.visualIdentity.image) || (x.album && x.album.images) || [];
  const imgs = (Array.isArray(list) ? list : [])
    .filter((i) => i && typeof i.url === 'string' && i.url.startsWith('https://'))
    .map((i) => ({ url: i.url, w: Number(i.maxWidth || i.width) || 0 }))
    .sort((a, b) => a.w - b.w);
  if (!imgs.length) return null;
  return (imgs.find((i) => i.w >= 300) || imgs[imgs.length - 1]).url;
}
