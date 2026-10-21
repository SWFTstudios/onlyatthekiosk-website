/**
 * POST /api/subscribe { email, interest?, title?, source? } — every email form
 *
 * Used by Join the Dispatch, Notify me (drops), Sell at the KIOSK (stockist),
 * Partner, and the newsletter forms on the info pages.
 *
 *   interest  'dispatch' (default) | 'stockist' | 'partner' | a product/film id
 *   title     what the form was about, as shown on the site
 *   source    the page path it was sent from
 *
 * Each signup is kept in D1 (`subscribers`, one row per email + interest) and
 * copied to Airtable "Incoming Interest" (Source = form · page). The person
 * gets a confirmation email; stockist and partner requests also email the
 * team (MAIL_TEAM). Emails go through Cloudflare Email Service (EMAIL).
 *
 * The signup succeeds when at least one store (D1 or Airtable) took it; an
 * email that fails to send is logged, not shown as an error.
 *
 *   GET → { status: 'ok', stores: { d1, airtable }, email }   (health check)
 */

import { json, error, handleOptions, withCors, rateLimit, clientIp, safeText } from '../_lib/http.js';
import { normalizeEmail } from '../_lib/session.js';
import { sendSubscribeConfirm, sendTeamNotice } from '../_lib/mail.js';

const AIRTABLE_TABLE = 'Incoming Interest';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);

  if (request.method === 'GET') {
    return withCors(json({ status: 'ok', stores: { d1: !!env.DB, airtable: !!(env.AIRTABLE_ACCESS_TOKEN && env.AIRTABLE_BASE_ID) }, email: !!env.EMAIL }), request);
  }
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) return withCors(error('Please enter a valid email address.'), request);
  const interest = (safeText(body.interest, 60).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dispatch');
  const title = safeText(body.title, 120) || null;
  const source = safeText(body.source, 200) || null;

  if (!rateLimit(`sub:ip:${clientIp(request)}`, { limit: 10, windowMs: 10 * 60_000 })
    || !rateLimit(`sub:email:${email}`, { limit: 4, windowMs: 60 * 60_000 })) {
    return withCors(error('Too many signups from here. Try again in a little while.', 429), request);
  }

  // 1. Keep it: D1 and Airtable, side by side
  let isNew = true;
  let d1ok = false;
  if (env.DB) {
    try {
      const r = await env.DB.prepare(
        'INSERT OR IGNORE INTO subscribers (email, interest, title, source) VALUES (?, ?, ?, ?)'
      ).bind(email, interest, title, source).run();
      isNew = !!(r.meta && r.meta.changes);
      d1ok = true;
    } catch (err) { console.error('subscribe d1', err && err.message); }
  }
  const airtable = isNew ? saveToAirtable(env, { email, interest, title, source }) : Promise.resolve(false);
  const airtableOk = await airtable;
  if (!d1ok && !airtableOk) {
    return withCors(error('We couldn’t save your email just now. Please try again.', 502), request);
  }

  // 2. Tell them (and the team for stockist / partner), once per email + interest
  if (isNew && env.EMAIL) {
    const mail = [sendSubscribeConfirm(env, { to: email, interest, title })
      .then(() => env.DB && env.DB.prepare("UPDATE subscribers SET confirmed_at = datetime('now') WHERE email = ? AND interest = ?").bind(email, interest).run())];
    if (interest === 'stockist' || interest === 'partner') mail.push(sendTeamNotice(env, { interest, email, title, source }));
    context.waitUntil(Promise.allSettled(mail).then((rs) => rs.forEach((r) => {
      if (r.status === 'rejected') console.error('subscribe email', r.reason && (r.reason.code || ''), r.reason && r.reason.message);
    })));
  }

  const message = interest === 'dispatch'
    ? (isNew ? 'You’re on the Dispatch. Check your inbox.' : 'You’re already on the Dispatch.')
    : interest === 'stockist' || interest === 'partner'
      ? 'Thanks. We’ll be in touch at that address.'
      : (isNew ? 'Done. We’ll email you the moment it drops.' : 'You’re already on the list for this one.');
  return withCors(json({ success: true, isNew, message }), request);
}

/** Copy a signup to Airtable "Incoming Interest". Resolves true when saved. */
async function saveToAirtable(env, { email, interest, title, source }) {
  if (!env.AIRTABLE_ACCESS_TOKEN || !env.AIRTABLE_BASE_ID) return false;
  const form = interest === 'dispatch' ? 'Dispatch' : interest === 'stockist' ? 'Stockist' : interest === 'partner' ? 'Partner' : `Notify: ${title || interest}`;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Email Address': email, Source: [form, source].filter(Boolean).join(' · ') }, typecast: true }),
    });
    if (!res.ok) console.error('subscribe airtable', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error('subscribe airtable', err && err.message);
    return false;
  }
}
