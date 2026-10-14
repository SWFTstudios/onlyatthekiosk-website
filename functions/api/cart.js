/**
 * /api/cart
 * GET  ?cartId=  — fetch cart (guest cartId or signed-in user's stored cart)
 * POST { action: 'create'|'add'|'update'|'remove'|'attach', ... }
 *
 * Signed-in users: cart id is stored in D1 and linked via buyer identity.
 * Guests: pass cartId from localStorage; no D1 write.
 */

import {
  json,
  error,
  handleOptions,
  withCors,
} from '../_lib/http.js';
import { accountsReady, getSession } from '../_lib/session.js';
import {
  createCart,
  getCart,
  addLines,
  updateLines,
  removeLines,
  attachBuyer,
} from '../_lib/storefront-cart.js';

async function loadUserCartId(env, userId) {
  const row = await env.DB.prepare(
    'SELECT shopify_cart_id FROM carts WHERE user_id = ?'
  ).bind(userId).first();
  return row && row.shopify_cart_id;
}

async function saveUserCartId(env, userId, cartId) {
  await env.DB.prepare(
    `INSERT INTO carts (user_id, shopify_cart_id, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET shopify_cart_id = excluded.shopify_cart_id, updated_at = datetime('now')`
  ).bind(userId, cartId).run();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return handleOptions(request);

  if (!env.SHOPIFY_STOREFRONT_TOKEN) {
    return withCors(error('Checkout is not configured.', 503), request);
  }

  try {
    const session = accountsReady(env) ? await getSession(env, request) : null;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      let cartId = url.searchParams.get('cartId');
      if (session) {
        const stored = await loadUserCartId(env, session.userId);
        if (stored) cartId = stored;
      }
      if (!cartId) return withCors(json({ cart: null }), request);
      const cart = await getCart(env, cartId);
      return withCors(json({ cart }), request);
    }

    if (request.method !== 'POST') {
      return withCors(error('Method not allowed', 405), request);
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'create') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const buyerIdentity = session
        ? { customerAccessToken: session.accessToken }
        : null;
      const cart = await createCart(env, { lines, buyerIdentity });
      if (session && cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    if (action === 'add') {
      let cartId = body.cartId;
      if (session) {
        const stored = await loadUserCartId(env, session.userId);
        if (stored) cartId = stored;
      }
      if (!body.variantId) {
        return withCors(error('variantId is required.'), request);
      }
      const line = {
        merchandiseId: body.variantId,
        quantity: Math.max(1, Math.min(99, Number(body.quantity) || 1)),
      };
      let cart;
      if (!cartId) {
        const buyerIdentity = session
          ? { customerAccessToken: session.accessToken }
          : null;
        cart = await createCart(env, { lines: [line], buyerIdentity });
      } else {
        cart = await addLines(env, cartId, [line]);
      }
      if (session && cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    if (action === 'update') {
      let cartId = body.cartId;
      if (session) {
        const stored = await loadUserCartId(env, session.userId);
        if (stored) cartId = stored;
      }
      if (!cartId || !body.lineId) {
        return withCors(error('cartId and lineId are required.'), request);
      }
      const qty = Math.max(0, Math.min(99, Number(body.quantity) || 0));
      let cart;
      if (qty === 0) {
        cart = await removeLines(env, cartId, [body.lineId]);
      } else {
        cart = await updateLines(env, cartId, [{ id: body.lineId, quantity: qty }]);
      }
      if (session && cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    if (action === 'remove') {
      let cartId = body.cartId;
      if (session) {
        const stored = await loadUserCartId(env, session.userId);
        if (stored) cartId = stored;
      }
      const lineIds = body.lineIds || (body.lineId ? [body.lineId] : []);
      if (!cartId || !lineIds.length) {
        return withCors(error('cartId and lineId(s) are required.'), request);
      }
      const cart = await removeLines(env, cartId, lineIds);
      if (session && cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    if (action === 'attach') {
      // Link a guest cart to the signed-in Shopify customer.
      if (!session) return withCors(error('Sign in required.', 401), request);
      const cartId = body.cartId;
      if (!cartId) return withCors(error('cartId is required.'), request);
      const cart = await attachBuyer(env, cartId, session.accessToken);
      if (cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    return withCors(error('Unknown action.'), request);
  } catch (err) {
    console.error('api/cart', err && err.message);
    return withCors(error(err.message || 'Cart request failed.', 500), request);
  }
}
