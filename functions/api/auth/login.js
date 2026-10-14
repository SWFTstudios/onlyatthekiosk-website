/**
 * GET /api/auth/login?return_to=/account.html
 * Starts Shopify Customer Account OAuth (PKCE).
 */

import {
  safeReturnTo,
  siteOrigin,
  rateLimit,
  clientIp,
  error,
} from '../../_lib/http.js';
import { accountsReady, randomToken } from '../../_lib/session.js';
import {
  randomString,
  pkceChallenge,
  buildAuthorizeUrl,
} from '../../_lib/shopify-customer.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return error('Method not allowed', 405);
  }

  if (!accountsReady(env)) {
    return error('Accounts are not configured yet. See docs/ACCOUNTS.md.', 503);
  }

  const ip = clientIp(request);
  if (!rateLimit(`auth-login:${ip}`, { limit: 15, windowMs: 60_000 })) {
    return error('Too many sign-in attempts. Try again in a minute.', 429);
  }

  try {
    const url = new URL(request.url);
    const returnTo = safeReturnTo(url.searchParams.get('return_to') || '/account.html');
    const state = randomToken(16);
    const nonce = randomString(16);
    const codeVerifier = randomString(32);
    const codeChallenge = await pkceChallenge(codeVerifier);
    const origin = siteOrigin(request, env);
    const redirectUri = `${origin}/api/auth/callback`;

    await env.DB.prepare(
      `INSERT INTO auth_states (state, code_verifier, nonce, return_to) VALUES (?, ?, ?, ?)`
    ).bind(state, codeVerifier, nonce, returnTo).run();

    // Drop stale auth states older than an hour
    await env.DB.prepare(
      `DELETE FROM auth_states WHERE created_at < datetime('now', '-1 hour')`
    ).run();

    const authorizeUrl = await buildAuthorizeUrl(env, {
      redirectUri,
      state,
      nonce,
      codeChallenge,
    });

    return Response.redirect(authorizeUrl, 302);
  } catch (err) {
    console.error('auth/login', err && err.message);
    return error('Could not start sign-in. Please try again.', 500);
  }
}
