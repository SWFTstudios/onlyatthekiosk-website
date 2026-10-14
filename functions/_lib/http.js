/**
 * Shared HTTP helpers for KIOSK Worker API routes.
 * Same-origin by default; never leak stack traces.
 */

const SESSION_COOKIE = 'kiosk_session';
const SESSION_DAYS = 30;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

/** Same-origin CORS for cookie-authenticated routes. */
export function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const host = request.headers.get('Host') || '';
  const ok =
    !origin ||
    origin === `https://${host}` ||
    origin === `http://${host}` ||
    /^https:\/\/([a-z0-9-]+\.)?onlyatthekiosk\.com$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.onlyatthekiosk-website\.pages\.dev$/i.test(origin);
  const allow = ok ? origin || `https://${host}` : `https://${host}`;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export function handleOptions(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function withCors(response, request) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

/** Only allow same-site relative paths for post-login redirects. */
export function safeReturnTo(value, fallback = '/') {
  if (!value || typeof value !== 'string') return fallback;
  const v = value.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || v.includes('\n') || v.includes('\r')) {
    return fallback;
  }
  return v.slice(0, 512);
}

export function siteOrigin(request, env) {
  if (env && env.SITE_ORIGIN) return env.SITE_ORIGIN.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export function sessionCookieHeader(sessionId, { clear = false } = {}) {
  if (clear) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export { SESSION_COOKIE, SESSION_DAYS };

/** Best-effort in-memory rate limit (per isolate). Good enough for auth bursts. */
const buckets = new Map();
export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
