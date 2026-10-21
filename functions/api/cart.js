/**
 * /api/cart
 * GET  ?cartId=&country=  — fetch cart (guest cartId or signed-in user's stored cart)
 * POST { action: 'create'|'add'|'update'|'remove'|'attach', ... }
 *
 * Two backends, picked by functions/_lib/commerce.js (commerceProvider):
 *   shopify — Shopify Storefront carts (variantId is a Shopify variant gid)
 *   stripe  — KIOSK bags in D1, paid through Stripe Checkout (/api/checkout);
 *             variantId is kiosk:<product>:<colourway>:<size>
 * Both answer with the same cart shape, so the cart drawer doesn't care.
 *
 * Signed-in users: cart id is stored in D1 (carts) and linked to the member.
 * Guests: pass cartId from localStorage; no member link.
 */

import {
  json,
  error,
  handleOptions,
  withCors,
  siteOrigin,
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
import { commerceProvider, renderCart, shipCountries, pickCountry } from '../_lib/commerce.js';
import * as bag from '../_lib/kiosk-cart.js';

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

  const provider = commerceProvider(env);
  if (provider === 'stripe') return stripeCart(context);
  if (provider !== 'shopify') {
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
        ? { email: session.email }
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
          ? { email: session.email }
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
      // Link a guest cart to the signed-in member (checkout gets their email).
      if (!session) return withCors(error('Sign in required.', 401), request);
      const cartId = body.cartId;
      if (!cartId) return withCors(error('cartId is required.'), request);
      const cart = await attachBuyer(env, cartId, { email: session.email });
      if (cart) await saveUserCartId(env, session.userId, cart.id);
      return withCors(json({ cart }), request);
    }

    return withCors(error('Unknown action.'), request);
  } catch (err) {
    console.error('api/cart', err && err.message);
    return withCors(error(err.message || 'Cart request failed.', 500), request);
  }
}

/* ------------------------------------------------------------- Stripe bags */

async function stripeCart(context) {
  const { request, env } = context;
  if (!env.DB) return withCors(error('Checkout is not configured.', 503), request);
  const origin = siteOrigin(request, env);
  const countries = shipCountries(env);

  try {
    const session = accountsReady(env) ? await getSession(env, request) : null;
    const url = new URL(request.url);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const country = pickCountry(request, body.country || url.searchParams.get('country'));
    const reply = (cart) => withCors(json({ cart: cart ? renderCart(cart, { origin, country, countries }) : null }), request);

    // A member's bag comes from their account; a guest's from the id they hold.
    // A bag linked to a member is never handed to someone else.
    let cart = null;
    if (session) {
      cart = await bag.loadCart(env, await loadUserCartId(env, session.userId));
      if (cart && cart.userId && cart.userId !== session.userId) cart = null;
    }
    const askedId = body.cartId || url.searchParams.get('cartId');
    const guest = askedId && (!cart || askedId !== cart.id) ? await bag.loadCart(env, askedId) : null;
    const guestOk = guest && (!guest.userId || (session && guest.userId === session.userId));
    if (!cart && guestOk) cart = guest;

    if (request.method === 'GET') return reply(cart);
    if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);

    const action = body.action;
    const fresh = () => bag.emptyCart(session ? session.userId : null);
    const persist = async (c) => {
      if (session) c.userId = session.userId;
      await bag.saveCart(env, c);
      if (session) await saveUserCartId(env, session.userId, c.id);
      return reply(c);
    };

    if (action === 'create') {
      const c = fresh();
      for (const l of (Array.isArray(body.lines) ? body.lines : []).slice(0, 20)) {
        bag.addLine(c, l.variantId || l.merchandiseId, l.quantity);
      }
      return persist(c);
    }
    if (action === 'add') {
      if (!body.variantId) return withCors(error('variantId is required.'), request);
      return persist(bag.addLine(cart || fresh(), body.variantId, body.quantity));
    }
    if (action === 'update') {
      if (!cart || !body.lineId) return withCors(error('cartId and lineId are required.'), request);
      return persist(bag.updateLine(cart, body.lineId, body.quantity));
    }
    if (action === 'remove') {
      const lineIds = body.lineIds || (body.lineId ? [body.lineId] : []);
      if (!cart || !lineIds.length) return withCors(error('cartId and lineId(s) are required.'), request);
      return persist(bag.removeLines(cart, lineIds));
    }
    if (action === 'attach') {
      // Fold the guest bag into the member's bag after signing in.
      if (!session) return withCors(error('Sign in required.', 401), request);
      if (!guestOk) return reply(cart);
      if (cart && cart.id !== guest.id) {
        bag.mergeInto(cart, guest);
        await env.DB.prepare('DELETE FROM kiosk_carts WHERE id = ?').bind(guest.id).run();
        return persist(cart);
      }
      return persist(guest);
    }
    return withCors(error('Unknown action.'), request);
  } catch (err) {
    console.error('api/cart stripe', err && err.message);
    return withCors(error(err.status === 400 ? err.message : 'Cart request failed.', err.status || 500), request);
  }
}
