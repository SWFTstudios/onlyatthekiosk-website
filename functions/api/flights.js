/**
 * GET /api/flights — live aircraft for the Flights page (flights.html)
 *
 *   ?near=LAT,LON        aircraft within ~250 nm of a point
 *   ?callsign=DAL123     one flight by callsign (ICAO, e.g. BAW117)
 *   ?hex=a1b2c3          one aircraft by its ICAO 24-bit address (refresh)
 *   ?route=DAL123&lat=…&lon=…   origin and destination airports for a callsign
 *
 * Source: adsb.lol (community ADS-B feed, ODbL). The OpenSky Network is the
 * fallback for callsign lookups. Responses are normalised to
 *   { source, now, aircraft: [{ hex, callsign, reg, type, lat, lon, alt, gs, track, vs, squawk, seen, ground }] }
 * and cached at the edge for a few seconds so busy pages share requests.
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp } from '../_lib/http.js';

const ADSB = 'https://api.adsb.lol';
const OPENSKY = 'https://opensky-network.org/api';
const UA = { 'User-Agent': 'onlyatthekiosk.com flights page', Accept: 'application/json' };

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/** adsb.lol / ADSBExchange v2 aircraft → our shape */
function fromAdsb(a) {
  const ground = a.alt_baro === 'ground';
  return {
    hex: String(a.hex || '').replace(/^~/, ''),
    callsign: String(a.flight || '').trim(),
    reg: a.r || '',
    type: a.t || '',
    desc: a.desc || '',
    lat: num(a.lat), lon: num(a.lon),
    alt: ground ? 0 : num(a.alt_baro != null ? a.alt_baro : a.alt_geom),
    gs: num(a.gs), track: num(a.track != null ? a.track : a.true_heading),
    vs: num(a.baro_rate != null ? a.baro_rate : a.geom_rate),
    squawk: a.squawk || '', seen: num(a.seen_pos != null ? a.seen_pos : a.seen) || 0,
    ground,
  };
}

/** OpenSky state vector → our shape (metres and m/s converted to ft and kt) */
function fromOpenSky(s, now) {
  return {
    hex: s[0], callsign: String(s[1] || '').trim(), reg: '', type: '', desc: '', country: s[2] || '',
    lat: num(s[6]), lon: num(s[5]),
    alt: s[8] ? 0 : (num(s[7] != null ? s[7] : s[13]) || 0) * 3.28084,
    gs: (num(s[9]) || 0) * 1.94384, track: num(s[10]), vs: (num(s[11]) || 0) * 196.85,
    squawk: s[14] || '', seen: Math.max(0, now - (s[4] || now)), ground: !!s[8],
  };
}

async function getJson(url, init = {}, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) }, signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

const usable = (a) => a.lat != null && a.lon != null;

async function near(lat, lon) {
  const d = await getJson(`${ADSB}/v2/point/${lat.toFixed(2)}/${lon.toFixed(2)}/250`);
  return { source: 'adsb.lol', now: d.now || Date.now(), aircraft: (d.ac || []).map(fromAdsb).filter(usable) };
}

async function byCallsign(cs) {
  try {
    const d = await getJson(`${ADSB}/v2/callsign/${encodeURIComponent(cs)}`);
    const list = (d.ac || []).map(fromAdsb).filter(usable);
    if (list.length) return { source: 'adsb.lol', now: d.now || Date.now(), aircraft: list };
  } catch (e) { /* fall through to OpenSky */ }
  const d = await getJson(`${OPENSKY}/states/all`, {}, 12000);
  const now = d.time || Math.floor(Date.now() / 1000);
  const list = (d.states || []).filter((s) => String(s[1] || '').trim().toUpperCase() === cs).map((s) => fromOpenSky(s, now)).filter(usable);
  return { source: 'opensky', now: now * 1000, aircraft: list };
}

async function byHex(hex) {
  const d = await getJson(`${ADSB}/v2/hex/${encodeURIComponent(hex)}`);
  return { source: 'adsb.lol', now: d.now || Date.now(), aircraft: (d.ac || []).map(fromAdsb).filter(usable) };
}

async function route(cs, lat, lon) {
  const d = await getJson(`${ADSB}/api/0/routeset`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planes: [{ callsign: cs, lat: lat || 0, lng: lon || 0 }] }),
  });
  const r = Array.isArray(d) ? d[0] : null;
  if (!r || !Array.isArray(r._airports) || r._airports.length < 2) return { route: null };
  const ap = (a) => ({ iata: a.iata || '', icao: a.icao || '', name: a.name || '', city: a.location || '', country: a.countryiso2 || '', lat: num(a.lat), lon: num(a.lon) });
  return { route: { plausible: r.plausible !== false && r.plausible !== 0, stops: r._airports.map(ap) } };
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!rateLimit(`flights:${clientIp(request)}`, { limit: 90, windowMs: 60_000 })) {
    return withCors(error('Too many requests, slow down a little', 429), request);
  }

  const url = new URL(request.url);
  const q = url.searchParams;
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`${url.origin}/api/flights?${[...q.entries()].sort().map(([k, v]) => `${k}=${v}`).join('&')}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return withCors(hit, request);
  }

  let body; let ttl = 10;
  try {
    if (q.get('near')) {
      const [la, lo] = q.get('near').split(',').map(Number);
      if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return withCors(error('near must be "lat,lon"'), request);
      body = await near(Math.round(la * 4) / 4, Math.round(lo * 4) / 4);   // round so nearby visitors share the cache
      ttl = 15;
    } else if (q.get('callsign')) {
      const cs = q.get('callsign').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (cs.length < 3) return withCors(error('Callsign looks too short'), request);
      body = await byCallsign(cs);
      ttl = 10;
    } else if (q.get('hex')) {
      const hex = q.get('hex').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 6);
      if (hex.length !== 6) return withCors(error('hex must be 6 hex digits'), request);
      body = await byHex(hex);
      ttl = 5;
    } else if (q.get('route')) {
      const cs = q.get('route').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      body = await route(cs, num(q.get('lat')), num(q.get('lon')));
      ttl = 3600;
    } else {
      return withCors(error('Ask with ?near=lat,lon, ?callsign=, ?hex= or ?route='), request);
    }
  } catch (e) {
    return withCors(error('The live feed did not answer. Try again in a moment.', 502), request);
  }

  const res = json(body, 200, { 'Cache-Control': `public, max-age=${ttl}` });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return withCors(res, request);
}
