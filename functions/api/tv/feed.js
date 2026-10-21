/**
 * GET /api/tv/feed?source=top|recent|liked — a Voyager's Spotify tracks
 * resolved to YouTube music videos for KIOSK TV ("Your cabin").
 * Body: curated={ "<spotify track id>": "<youtube id>" } is honoured first.
 */
import { json, error, handleOptions, withCors } from '../../_lib/http.js';
import { getSession, accountsReady } from '../../_lib/session.js';
import { spotifyConfigured, validAccessToken, spotifyApi, normalizeTrack, resolveYouTubeVideo } from '../../_lib/spotify.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET' && request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  if (!spotifyConfigured(env)) return withCors(json({ enabled: false, reason: 'unconfigured', videos: [] }), request);
  if (!accountsReady(env)) return withCors(json({ enabled: false, reason: 'no-voyager', videos: [] }), request);
  const session = await getSession(env, request);
  if (!session) return withCors(json({ enabled: false, reason: 'no-voyager', videos: [] }), request);

  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'top';
  let curated = {};
  if (request.method === 'POST') {
    try { curated = (await request.json()).curated || {}; } catch { curated = {}; }
  } else {
    try { curated = JSON.parse(url.searchParams.get('curated') || '{}'); } catch { curated = {}; }
  }
  try {
    const { row, accessToken } = await validAccessToken(env, session.userId);
    if (!row || !accessToken) return withCors(json({ enabled: false, reason: 'not-connected', videos: [] }), request);
    let items = [];
    if (source === 'recent') items = ((await spotifyApi(env, accessToken, '/me/player/recently-played?limit=30')).items || []).map((x) => x && x.track);
    else if (source === 'liked') items = ((await spotifyApi(env, accessToken, '/me/tracks?limit=30')).items || []).map((x) => x && x.track);
    else items = (await spotifyApi(env, accessToken, '/me/top/tracks?limit=30&time_range=medium_term')).items || [];
    const seen = new Set();
    const tracks = items.map(normalizeTrack).filter((t) => t && !seen.has(t.id) && seen.add(t.id)).slice(0, 30);
    const videos = [];
    for (const track of tracks) {
      const hit = await resolveYouTubeVideo(env, session.userId, track, curated);
      videos.push(hit ? { ...track, youtube: hit.youtube, matchSource: hit.source, verified: hit.verified } : { ...track, youtube: '', matchSource: '', verified: false });
    }
    return withCors(json({ enabled: true, source, videos }), request);
  } catch (err) {
    console.error('tv feed', err && err.message);
    return withCors(error('Could not build your KIOSK TV feed.', 502), request);
  }
}
