/**
 * POST /api/auth/verify { email, code, firstName?, marketing? } — sign in
 *
 * Checks the emailed code (5 tries, 10 minutes), then signs the member in
 * with a session cookie. The first sign-in for an email creates the account
 * with the next member number and sends a welcome email.
 *
 *   → { ok, isNew, user: { email, firstName, memberNumber, memberNo } }
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp, safeText } from '../../_lib/http.js';
import { accountsReady, normalizeEmail, hashCode, upsertUser, createSession, memberNo } from '../../_lib/session.js';
import { sendWelcome } from '../../_lib/mail.js';

const MAX_TRIES = 5;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  if (!accountsReady(env)) return withCors(error('Accounts are not switched on yet.', 503), request);

  if (!rateLimit(`verify:ip:${clientIp(request)}`, { limit: 30, windowMs: 10 * 60_000 })) {
    return withCors(error('Too many tries. Wait a few minutes and try again.', 429), request);
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').replace(/\D/g, '');
  if (!email || code.length !== 6) return withCors(error('Enter the six-digit code from the email.'), request);

  try {
    const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?').bind(email).first();
    if (!row || !(Date.parse(row.expires_at) > Date.now())) {
      return withCors(error('That code has expired. Send a new one.', 400, { expired: true }), request);
    }
    if (row.attempts >= MAX_TRIES) {
      await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
      return withCors(error('Too many wrong codes. Send a new one.', 429, { expired: true }), request);
    }
    if (row.code_hash !== await hashCode(env, email, code)) {
      await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
      const left = MAX_TRIES - row.attempts - 1;
      return withCors(error(left > 0 ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That code isn’t right. Send a new one.', 400, { expired: left <= 0 }), request);
    }
    await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();

    const firstName = safeText(body.firstName, 60) || null;
    const { id, isNew } = await upsertUser(env, { email, firstName, marketing: body.marketing === true });
    const user = await env.DB.prepare('SELECT email, first_name, member_number, welcome_sent_at FROM users WHERE id = ?').bind(id).first();
    const session = await createSession(env, id);

    if (isNew) context.waitUntil(mirrorMember(env, id, user).catch((err) => console.error('airtable member', err && err.message)));

    if (!user.welcome_sent_at) {
      context.waitUntil(sendWelcome(env, { to: email, firstName: user.first_name, memberNo: memberNo(user.member_number) })
        .then(() => env.DB.prepare("UPDATE users SET welcome_sent_at = datetime('now') WHERE id = ?").bind(id).run())
        .catch((err) => console.error('welcome email', err && err.message)));
    }

    return withCors(json({
      ok: true,
      isNew,
      user: { email: user.email, firstName: user.first_name, memberNumber: user.member_number, memberNo: memberNo(user.member_number) },
    }, 200, { 'Set-Cookie': session.cookie }), request);
  } catch (err) {
    console.error('auth/verify', err && err.message);
    return withCors(error('We couldn’t sign you in just now. Try again.', 500), request);
  }
}

/** Copy a new member to Airtable "Members" (D1 stays the source of truth). */
async function mirrorMember(env, id, user) {
  if (!env.AIRTABLE_ACCESS_TOKEN || !env.AIRTABLE_BASE_ID) return;
  const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent('Members')}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typecast: true,
      fields: {
        Email: user.email,
        'First Name': user.first_name || '',
        'Member No.': String(user.member_number).padStart(4, '0'),
        'Member Since': new Date().toISOString().slice(0, 10),
        'Marketing Opt-in': false,
        Source: 'KIOSK sign-in',
      },
    }),
  });
  if (!res.ok) { console.error('airtable member', res.status, (await res.text()).slice(0, 300)); return; }
  const rec = await res.json();
  if (rec && rec.id) await env.DB.prepare('UPDATE users SET airtable_record_id = ? WHERE id = ?').bind(rec.id, id).run();
}
