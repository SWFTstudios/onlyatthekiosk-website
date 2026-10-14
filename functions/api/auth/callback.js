/**
 * GET /api/auth/callback?code=…&state=…
 * Completes Shopify Customer Account OAuth, creates a session cookie.
 */

import {
  siteOrigin,
  rateLimit,
  clientIp,
  error,
  safeReturnTo,
} from '../../_lib/http.js';
import {
  accountsReady,
  upsertUser,
  createSession,
} from '../../_lib/session.js';
import {
  exchangeCode,
  customerProfile,
} from '../../_lib/shopify-customer.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return error('Method not allowed', 405);
  }

  if (!accountsReady(env)) {
    return error('Accounts are not configured yet.', 503);
  }

  const ip = clientIp(request);
  if (!rateLimit(`auth-callback:${ip}`, { limit: 30, windowMs: 60_000 })) {
    return error('Too many requests.', 429);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    console.error('oauth error', oauthError, url.searchParams.get('error_description'));
    return Response.redirect(`${siteOrigin(request, env)}/account.html?error=auth`, 302);
  }

  if (!code || !state) {
    return error('Missing code or state.', 400);
  }

  try {
    const row = await env.DB.prepare(
      'SELECT code_verifier, nonce, return_to FROM auth_states WHERE state = ?'
    ).bind(state).first();

    if (!row) {
      return error('Invalid or expired sign-in state. Please try again.', 400);
    }

    await env.DB.prepare('DELETE FROM auth_states WHERE state = ?').bind(state).run();

    const origin = siteOrigin(request, env);
    const redirectUri = `${origin}/api/auth/callback`;
    const tokens = await exchangeCode(env, {
      code,
      redirectUri,
      codeVerifier: row.code_verifier,
    });

    const profile = await customerProfile(env, tokens.access_token);
    if (!profile || !profile.id) {
      return error('Could not load your Shopify customer profile.', 502);
    }

    const userId = await upsertUser(env, {
      shopifyCustomerId: profile.id,
      email: profile.email,
      firstName: profile.firstName,
    });

    const { cookie } = await createSession(env, {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresIn: tokens.expires_in || 3600,
    });

    const returnTo = safeReturnTo(row.return_to, '/account.html');
    const dest = new URL(returnTo, origin);
    dest.searchParams.set('signed_in', '1');

    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.pathname + dest.search + dest.hash,
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('auth/callback', err && err.message);
    return Response.redirect(`${siteOrigin(request, env)}/account.html?error=auth`, 302);
  }
}
