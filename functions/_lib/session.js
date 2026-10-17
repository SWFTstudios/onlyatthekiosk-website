/**
 * Session helpers for KIOSK accounts.
 *
 * Members sign in with a one-time code sent to their email (Cloudflare Email
 * Service, the EMAIL binding); there are no passwords. The cookie holds a
 * random session id and only its SHA-256 hash is stored in D1 (`sessions`).
 * Accounts switch on when both the DB and EMAIL bindings exist.
 */

import {
  SESSION_COOKIE,
  SESSION_DAYS,
  parseCookies,
  sessionCookieHeader,
  error,
} from './http.js';

const enc = new TextEncoder();

export async function sha256Hex(value) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function accountsReady(env) {
  return Boolean(env && env.DB && env.EMAIL);
}

/** Lower-cased, trimmed email, or null when it isn't one. */
export function normalizeEmail(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

/** A six-digit sign-in code. */
export function loginCode() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}

/** Codes are stored hashed with the email (and AUTH_SECRET when set). */
export function hashCode(env, email, code) {
  return sha256Hex(`${(env && env.AUTH_SECRET) || 'kiosk'}:${email}:${code}`);
}

export async function createSession(env, userId) {
  const sessionId = randomToken(32);
  const idHash = await sha256Hex(sessionId);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(idHash, userId, expiresAt).run();
  return { sessionId, expiresAt, cookie: sessionCookieHeader(sessionId) };
}

export async function destroySession(env, request) {
  const sessionId = parseCookies(request)[SESSION_COOKIE];
  if (sessionId && env.DB) {
    const idHash = await sha256Hex(sessionId);
    await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run();
  }
  return sessionCookieHeader('', { clear: true });
}

/**
 * The signed-in member from the session cookie, or null (signed out, expired
 * or accounts not configured). Marks the session seen at most once an hour.
 */
export async function getSession(env, request) {
  if (!accountsReady(env)) return null;
  const sessionId = parseCookies(request)[SESSION_COOKIE];
  if (!sessionId) return null;

  const idHash = await sha256Hex(sessionId);
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, s.last_seen_at,
            u.email, u.first_name, u.member_number, u.member_since, u.marketing_opt_in
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ?`
  ).bind(idHash).first();
  if (!row) return null;

  if (!(Date.parse(row.expires_at) > Date.now())) {
    await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run();
    return null;
  }
  if (!(Date.parse(`${row.last_seen_at}Z`) > Date.now() - 3600_000)) {
    await env.DB.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id_hash = ?").bind(idHash).run();
  }

  return {
    sessionId,
    idHash,
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    memberNumber: row.member_number,
    memberSince: row.member_since,
    marketing: !!row.marketing_opt_in,
  };
}

export async function requireSession(env, request) {
  if (!accountsReady(env)) {
    return { session: null, response: error('Accounts are not configured yet.', 503) };
  }
  const session = await getSession(env, request);
  if (!session) return { session: null, response: error('Sign in required.', 401) };
  return { session, response: null };
}

/**
 * Find or create the member for an email. New members get the next member
 * number. Returns { id, isNew }.
 */
export async function upsertUser(env, { email, firstName = null, marketing = false }) {
  const existing = await env.DB.prepare('SELECT id, first_name FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    if (firstName && !existing.first_name) {
      await env.DB.prepare('UPDATE users SET first_name = ? WHERE id = ?').bind(firstName, existing.id).run();
    }
    return { id: existing.id, isNew: false };
  }
  const id = randomToken(16);
  // Two sign-ups at once can race for a number: the unique index rejects one, so retry
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await env.DB.prepare(
        `INSERT INTO users (id, email, first_name, member_number, marketing_opt_in)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(member_number), 0) + 1 FROM users), ?)`
      ).bind(id, email, firstName, marketing ? 1 : 0).run();
      return { id, isNew: true };
    } catch (err) {
      if (attempt === 2 || !/UNIQUE/i.test(String(err && err.message))) throw err;
      const raced = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (raced) return { id: raced.id, isNew: false };
    }
  }
  throw new Error('Could not create member');
}

export const memberNo = (n) => `#${String(n || 0).padStart(4, '0')}`;
