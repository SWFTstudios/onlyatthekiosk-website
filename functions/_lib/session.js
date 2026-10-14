/**
 * Session helpers for KIOSK accounts.
 * Cookie holds a random session id; only a SHA-256 hash is stored in D1.
 * Shopify access/refresh tokens live in D1 and never reach the browser.
 */

import {
  SESSION_COOKIE,
  parseCookies,
  sessionCookieHeader,
  error,
} from './http.js';
import { refreshAccessToken, customerProfile } from './shopify-customer.js';

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
  return Boolean(env && env.DB && env.SHOPIFY_CUSTOMER_CLIENT_ID);
}

export async function createSession(env, {
  userId,
  accessToken,
  refreshToken = null,
  expiresIn = 3600,
}) {
  const sessionId = randomToken(32);
  const idHash = await sha256Hex(sessionId);
  const expiresAt = new Date(Date.now() + Math.max(60, expiresIn) * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id_hash, user_id, access_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(idHash, userId, accessToken, refreshToken, expiresAt).run();
  return { sessionId, expiresAt, cookie: sessionCookieHeader(sessionId) };
}

export async function destroySession(env, request) {
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId && env.DB) {
    const idHash = await sha256Hex(sessionId);
    await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run();
  }
  return sessionCookieHeader('', { clear: true });
}

/**
 * Resolve the signed-in user from the session cookie.
 * Refreshes the Shopify access token when near expiry.
 * Returns null when unsigned or when accounts are not configured.
 */
export async function getSession(env, request) {
  if (!accountsReady(env)) return null;
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;

  const idHash = await sha256Hex(sessionId);
  const row = await env.DB.prepare(
    `SELECT s.id_hash, s.user_id, s.access_token, s.refresh_token, s.expires_at,
            u.shopify_customer_id, u.email, u.first_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ?`
  ).bind(idHash).first();

  if (!row) return null;

  let accessToken = row.access_token;
  let expiresAt = row.expires_at;
  const expiresMs = Date.parse(expiresAt);
  const needsRefresh = !Number.isFinite(expiresMs) || expiresMs - Date.now() < 60_000;

  if (needsRefresh && row.refresh_token) {
    try {
      const tokens = await refreshAccessToken(env, row.refresh_token);
      accessToken = tokens.access_token;
      expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await env.DB.prepare(
        `UPDATE sessions SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?
         WHERE id_hash = ?`
      ).bind(accessToken, tokens.refresh_token || null, expiresAt, idHash).run();
    } catch (err) {
      console.error('session refresh failed', err && err.message);
      await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run();
      return null;
    }
  } else if (needsRefresh && !row.refresh_token) {
    await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run();
    return null;
  }

  return {
    sessionId,
    idHash,
    userId: row.user_id,
    shopifyCustomerId: row.shopify_customer_id,
    email: row.email,
    firstName: row.first_name,
    accessToken,
    expiresAt,
  };
}

export async function requireSession(env, request) {
  if (!accountsReady(env)) {
    return { session: null, response: error('Accounts are not configured yet.', 503) };
  }
  const session = await getSession(env, request);
  if (!session) {
    return { session: null, response: error('Sign in required.', 401) };
  }
  return { session, response: null };
}

export async function upsertUser(env, { shopifyCustomerId, email, firstName }) {
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE shopify_customer_id = ?'
  ).bind(shopifyCustomerId).first();

  if (existing) {
    await env.DB.prepare(
      'UPDATE users SET email = COALESCE(?, email), first_name = COALESCE(?, first_name) WHERE id = ?'
    ).bind(email || null, firstName || null, existing.id).run();
    return existing.id;
  }

  const id = randomToken(16);
  await env.DB.prepare(
    `INSERT INTO users (id, shopify_customer_id, email, first_name) VALUES (?, ?, ?, ?)`
  ).bind(id, shopifyCustomerId, email || null, firstName || null).run();
  return id;
}

export async function syncProfileFromShopify(env, session) {
  try {
    const profile = await customerProfile(env, session.accessToken);
    if (!profile) return session;
    await env.DB.prepare(
      'UPDATE users SET email = COALESCE(?, email), first_name = COALESCE(?, first_name) WHERE id = ?'
    ).bind(profile.email || null, profile.firstName || null, session.userId).run();
    return {
      ...session,
      email: profile.email || session.email,
      firstName: profile.firstName || session.firstName,
      shopifyCustomerId: profile.id || session.shopifyCustomerId,
    };
  } catch (err) {
    console.error('profile sync failed', err && err.message);
    return session;
  }
}
