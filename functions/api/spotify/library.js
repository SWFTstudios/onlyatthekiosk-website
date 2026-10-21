/**
 * GET /api/spotify/library?kind=top|recent|liked|playlists
 * The Voyager's own Spotify, normalised to { tracks } or { playlists }.
 */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { requireSession } from '../../_lib/session.js';
import { spotifyConfigured, validAccessToken, spotifyApi, normalizeTrack } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!spotifyConfigured(env)) return withCors(error('Spotify is not configured yet.', 503), request);
  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);
  const kind = new URL(request.url).searchParams.get('kind') || 'top';
  try {
    const { accessToken } = await validAccessToken(env, session.userId);
    if (!accessToken) return withCors(error('Spotify is not connected.', 401), request);
    if (kind === 'playlists') {
      const d = await spotifyApi(env, accessToken, '/me/playlists?limit=50');
      return withCors(json({ playlists: (d.items || []).filter(Boolean).map((p) => ({
        id: p.id, uri: p.uri, title: p.name || '', trackCount: (p.tracks && p.tracks.total) || 0,
        cover: ((p.images || [])[0] || {}).url || '',
      })) }), request);
    }
    let items = [];
    if (kind === 'recent') {
      const d = await spotifyApi(env, accessToken, '/me/player/recently-played?limit=50');
      items = (d.items || []).map((x) => x && x.track);
    } else if (kind === 'liked') {
      const d = await spotifyApi(env, accessToken, '/me/tracks?limit=50');
      items = (d.items || []).map((x) => x && x.track);
    } else {
      const d = await spotifyApi(env, accessToken, '/me/top/tracks?limit=50&time_range=medium_term');
      items = d.items || [];
    }
    const seen = new Set();
    const tracks = items.map(normalizeTrack).filter((t) => t && !seen.has(t.id) && seen.add(t.id));
    return withCors(json({ tracks }), request);
  } catch (err) {
    console.error('spotify library', err && err.message);
    return withCors(error('Could not load your Spotify library.', 502), request);
  }
}
