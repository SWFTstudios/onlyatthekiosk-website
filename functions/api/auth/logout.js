/**
 * GET /api/auth/logout
 * Clears the KIOSK session and redirects through Shopify logout when possible.
 */

import { siteOrigin, error } from '../../_lib/http.js';
import { accountsReady, destroySession, getSession } from '../../_lib/session.js';
import { buildLogoutUrl } from '../../_lib/shopify-customer.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET' && request.method !== 'POST') {
    return error('Method not allowed', 405);
  }

  const origin = siteOrigin(request, env);
  const home = `${origin}/`;

  if (!accountsReady(env)) {
    return Response.redirect(home, 302);
  }

  try {
    // We do not store id_token; Shopify logout still works with client_id + redirect.
    await getSession(env, request);
    const clearCookie = await destroySession(env, request);
    let dest = home;
    try {
      dest = await buildLogoutUrl(env, {
        postLogoutRedirectUri: home,
      });
    } catch (err) {
      console.error('logout url', err && err.message);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: dest,
        'Set-Cookie': clearCookie,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('auth/logout', err && err.message);
    return Response.redirect(home, 302);
  }
}
