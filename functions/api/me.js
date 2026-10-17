/**
 * GET /api/me — the signed-in member: profile, saves (locker), cart, check-in
 * When accounts are not configured, returns { enabled: false }.
 */

import { json, error, handleOptions, withCors } from '../_lib/http.js';
import { accountsReady, getSession, memberNo } from '../_lib/session.js';
import { getCart } from '../_lib/storefront-cart.js';
import { readProfile } from '../_lib/taste.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  if (!accountsReady(env)) return withCors(json({ enabled: false, user: null }), request);

  try {
    const session = await getSession(env, request);
    if (!session) return withCors(json({ enabled: true, user: null }), request);

    const [locker, cartRow, profile] = await Promise.all([
      env.DB.prepare('SELECT kind, ref, created_at FROM locker_items WHERE user_id = ? ORDER BY created_at DESC').bind(session.userId).all(),
      env.DB.prepare('SELECT shopify_cart_id FROM carts WHERE user_id = ?').bind(session.userId).first(),
      readProfile(env, session.userId).catch(() => null),
    ]);

    let cart = null;
    if (cartRow && cartRow.shopify_cart_id) {
      try { cart = await getCart(env, cartRow.shopify_cart_id); } catch (err) { console.error('me cart', err && err.message); }
    }

    return withCors(json({
      enabled: true,
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
      orders: [],
    }), request);
  } catch (err) {
    console.error('api/me', err && err.message);
    return withCors(error('Could not load your account.', 500), request);
  }
}
