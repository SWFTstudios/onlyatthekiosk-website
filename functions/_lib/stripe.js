/**
 * A small Stripe client for the Worker: form-encoded REST calls with fetch and
 * webhook signature checks with Web Crypto (no SDK, nothing to bundle).
 * Needs STRIPE_SECRET_KEY; the webhook needs STRIPE_WEBHOOK_SECRET.
 */

const API = 'https://api.stripe.com/v1';
const enc = new TextEncoder();

/** Stripe's nested form encoding: { a: { b: [1] } } → a[b][0]=1 */
export function formEncode(params, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === 'object') formEncode(v, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(v));
      });
    } else if (typeof value === 'object') {
      formEncode(value, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

export async function stripe(env, method, path, params = null, { idempotencyKey } = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  let url = `${API}${path}`;
  let body;
  if (params && method === 'GET') url += `?${formEncode(params)}`;
  else if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = formEncode(params).toString();
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || `Stripe ${res.status}`);
    err.status = res.status;
    err.code = data.error && data.error.code;
    throw err;
  }
  return data;
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(secret, timestamp, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`)));
}

/**
 * Check a Stripe-Signature header against the raw request body. Returns the
 * parsed event, or throws when the signature is missing, wrong or older than
 * `toleranceSec` (replays).
 */
export async function verifyWebhook(payload, header, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  const parts = String(header || '').split(',').map((p) => p.trim().split('='));
  const t = Number((parts.find(([k]) => k === 't') || [])[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v || '');
  if (!t || !sigs.length) throw new Error('Missing Stripe signature');
  if (Math.abs(now / 1000 - t) > toleranceSec) throw new Error('Stripe signature is too old');
  const expected = await signPayload(secret, t, payload);
  if (!sigs.some((s) => safeEqual(s, expected))) throw new Error('Stripe signature does not match');
  return JSON.parse(payload);
}

export const dashboardPaymentUrl = (env, paymentIntent) =>
  `https://dashboard.stripe.com/${String(env.STRIPE_SECRET_KEY || '').startsWith('sk_test') ? 'test/' : ''}payments/${paymentIntent}`;
