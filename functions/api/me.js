/**
 * GET /api/me — the signed-in member: profile, saves (locker), cart, check-in, orders
 * When accounts are not configured, returns { enabled: false }.
 * `commerce` says which checkout runs ('stripe' | 'shopify' | null), so the
 * shop knows how to add to the bag even for guests.
 */

import { json, error, handleOptions, withCors, siteOrigin } from '../_lib/http.js';
import { accountsReady, getSession, memberNo } from '../_lib/session.js';
import { getCart } from '../_lib/storefront-cart.js';
import { readProfile } from '../_lib/taste.js';
import { commerceProvider, renderCart, shipCountries, pickCountry, money } from '../_lib/commerce.js';
import { loadCart } from '../_lib/kiosk-cart.js';

async function memberOrders(env, session) {
  const r = await env.DB.prepare(
    `SELECT number, created_at, fulfillment_status, payment_status, total, currency, stripe_session_id
     FROM orders WHERE user_id = ? OR email = ? ORDER BY created_at DESC LIMIT 20`
  ).bind(session.userId, session.email).all();
  return (r.results || []).map((o) => ({
    name: o.number,
    processedAt: `${o.created_at.replace(' ', 'T')}Z`,
    fulfillmentStatus: o.fulfillment_status,
    financialStatus: o.payment_status,
    total: money(o.total, o.currency),
    statusPageUrl: `/order.html?session_id=${encodeURIComponent(o.stripe_session_id)}`,
  }));
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  const commerce = commerceProvider(env);
  if (!accountsReady(env)) return withCors(json({ enabled: false, user: null, commerce }), request);

  try {
    const session = await getSession(env, request);
    if (!session) return withCors(json({ enabled: true, user: null, commerce }), request);

    const [locker, cartRow, profile, orders] = await Promise.all([
      env.DB.prepare('SELECT kind, ref, created_at FROM locker_items WHERE user_id = ? ORDER BY created_at DESC').bind(session.userId).all(),
      env.DB.prepare('SELECT shopify_cart_id FROM carts WHERE user_id = ?').bind(session.userId).first(),
      readProfile(env, session.userId).catch(() => null),
      commerce === 'stripe' ? memberOrders(env, session).catch((err) => { console.error('me orders', err && err.message); return []; }) : [],
    ]);

    let cart = null;
    if (cartRow && cartRow.shopify_cart_id) {
      try {
        if (commerce === 'stripe') {
          const c = await loadCart(env, cartRow.shopify_cart_id);
          if (c) cart = renderCart(c, { origin: siteOrigin(request, env), country: pickCountry(request), countries: shipCountries(env) });
        } else if (commerce === 'shopify') {
          cart = await getCart(env, cartRow.shopify_cart_id);
        }
      } catch (err) { console.error('me cart', err && err.message); }
    }

    return withCors(json({
      enabled: true,
      commerce,
      user: {
        id: session.userId,
        email: session.email,
        firstName: session.firstName,
        memberNumber: session.memberNumber,
        memberNo: memberNo(session.memberNumber),
        memberSince: session.memberSince,
        marketing: session.marketing,
      },
      profile,
      wishlist: (locker.results || []).map((r) => ({ kind: r.kind, ref: r.ref, createdAt: r.created_at })),
      cart,
      orders,
    }), request);
  } catch (err) {
    console.error('api/me', err && err.message);
    return withCors(error('Could not load your account.', 500), request);
  }
}
