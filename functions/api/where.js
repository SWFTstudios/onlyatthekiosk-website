/**
 * GET /api/where — the visitor's approximate city, for the home intro
 *
 * The opening flight on the home page ends over the visitor's town. Cloudflare
 * already attaches an approximate location (city level, from the IP address)
 * to every request, so no browser permission prompt is needed. Nothing is
 * stored or logged; the answer is not cached anywhere shared.
 *
 *   → { lat, lon, city, region, country } or { lat: null } when unknown
 */

import { json, handleOptions, withCors } from '../_lib/http.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  const cf = request.cf || {};
  const lat = Number(cf.latitude); const lon = Number(cf.longitude);
  const known = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const body = known
    ? { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, city: cf.city || '', region: cf.region || '', country: cf.country || '' }
    : { lat: null, lon: null, city: '', region: '', country: cf.country || '' };
  return withCors(json(body, 200, { 'Cache-Control': 'private, no-store' }), request);
}
