/**
 * POST /api/auth/code { email } — email a six-digit sign-in code
 *
 * Works the same for new and returning members (the account is made when
 * the code is confirmed at /api/auth/verify), and answers the same either
 * way so it never reveals who has an account. A code lasts 10 minutes;
 * asking again replaces it. Rate-limited per IP and per email.
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp } from '../../_lib/http.js';
import { accountsReady, normalizeEmail, loginCode, hashCode } from '../../_lib/session.js';
import { sendLoginCode } from '../../_lib/mail.js';

const CODE_MINUTES = 10;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  if (!accountsReady(env)) return withCors(error('Accounts are not switched on yet.', 503), request);

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) return withCors(error('Enter a valid email address.'), request);

  const ip = clientIp(request);
  if (!rateLimit(`code:ip:${ip}`, { limit: 8, windowMs: 10 * 60_000 })
    || !rateLimit(`code:email:${email}`, { limit: 3, windowMs: 10 * 60_000 })) {
    return withCors(error('Too many codes asked for. Wait a few minutes and try again.', 429), request);
  }

  try {
    const code = loginCode();
    const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString();
    await env.DB.prepare(
      `INSERT INTO login_codes (email, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, 0, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         attempts = 0, created_at = excluded.created_at`
    ).bind(email, await hashCode(env, email, code), expiresAt).run();
    await sendLoginCode(env, { to: email, code });
    return withCors(json({ ok: true, expiresIn: CODE_MINUTES * 60 }), request);
  } catch (err) {
    console.error('auth/code', err && (err.code || ''), err && err.message);
    return withCors(error('We couldn’t send the code just now. Try again in a minute.', 502), request);
  }
}
