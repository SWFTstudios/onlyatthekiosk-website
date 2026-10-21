/**
 * POST /api/checkout { cartId?, country } — open a Stripe Checkout Session
 * for the bag and answer { url } to send the shopper to.
 *
 * Prices and shipping are worked out here from js/kiosk-content.js and
 * functions/_lib/commerce.js; the browser only says which bag and where it
 * ships. Limited stock is held for the session's 30 minutes. What was bought
 * is snapshotted in `checkouts` so the webhook can write the order.
 */

import { json, error, handleOptions, withCors, siteOrigin, rateLimit, clientIp } from '../_lib/http.js';
import { accountsReady, getSession } from '../_lib/session.js';
import {
  commerceProvider, describeVariant, shippingFor, shipCountries, pickCountry, absolute, CURRENCY,
} from '../_lib/commerce.js';
import { loadCart } from '../_lib/kiosk-cart.js';
import { reserve, release } from '../_lib/inventory.js';
import { stripe } from '../_lib/stripe.js';

const SESSION_MINUTES = 31;   // Stripe's minimum is 30

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return withCors(error('Method not allowed', 405), request);
  if (commerceProvider(env) !== 'stripe' || !env.DB) return withCors(error('Checkout is not configured.', 503), request);
  if (!rateLimit(`checkout:ip:${clientIp(request)}`, { limit: 20, windowMs: 10 * 60_000 })) {
    return withCors(error('Too many tries. Wait a minute and try again.', 429), request);
  }

  const body = await request.json().catch(() => ({}));
  const country = pickCountry(request, body.country);
  if (!shipCountries(env).includes(country)) {
    return withCors(error('We don’t ship there yet. Email hello@onlyatthekiosk.com and we’ll see what we can do.'), request);
  }

  let held = [];
  try {
    const session = accountsReady(env) ? await getSession(env, request) : null;
    let cart = null;
    if (session) {
      const row = await env.DB.prepare('SELECT shopify_cart_id FROM carts WHERE user_id = ?').bind(session.userId).first();
      cart = await loadCart(env, row && row.shopify_cart_id);
    }
    if (!cart) {
      const guest = await loadCart(env, body.cartId);
      if (guest && (!guest.userId || (session && guest.userId === session.userId))) cart = guest;
    }

    const lines = [];
    for (const l of (cart && cart.lines) || []) {
      const d = describeVariant(l.variantId);
      if (d.error) continue;
      lines.push({
        productId: d.productId, cw: d.cw, size: d.size, colour: d.colour, sku: d.sku,
        title: d.title, variantTitle: d.variantTitle, quantity: l.quantity, unitAmount: d.unitAmount,
        image: d.image, shipClass: d.shipClass,
      });
    }
    if (!lines.length) return withCors(error('Your bag is empty.'), request);

    const subtotal = lines.reduce((n, l) => n + l.unitAmount * l.quantity, 0);
    const ship = shippingFor(country, lines);
    const origin = siteOrigin(request, env);
    const tax = String(env.STRIPE_TAX || '').toLowerCase() === 'on';
    const behavior = tax ? 'exclusive' : undefined;

    held = await reserve(env, lines);

    const cs = await stripe(env, 'POST', '/checkout/sessions', {
      mode: 'payment',
      locale: 'auto',
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: l.unitAmount,
          tax_behavior: behavior,
          product_data: {
            name: l.title,
            description: l.variantTitle || undefined,
            images: l.image ? [absolute(origin, l.image)] : undefined,
            metadata: { product_id: l.productId, sku: l.sku },
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [country] },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: ship.label,
          fixed_amount: { amount: ship.amount, currency: CURRENCY },
          tax_behavior: behavior,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: ship.days[0] },
            maximum: { unit: 'business_day', value: ship.days[1] },
          },
        },
      }],
      automatic_tax: tax ? { enabled: true } : undefined,
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      customer_email: session ? session.email : undefined,
      client_reference_id: cart.id,
      metadata: { cart_id: cart.id, user_id: session ? session.userId : '', country },
      payment_intent_data: { description: 'KIOSK order', metadata: { cart_id: cart.id } },
      success_url: `${origin}/order.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/vault.html?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
    });

    await env.DB.prepare(
      `INSERT INTO checkouts (session_id, cart_id, user_id, country, lines, subtotal, shipping)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      cs.id, cart.id, session ? session.userId : null, country,
      JSON.stringify(held.map(({ image, shipClass, ...l }) => l)), subtotal, ship.amount,
    ).run();

    return withCors(json({ url: cs.url }), request);
  } catch (err) {
    if (held.length) await release(env, held).catch(() => {});
    console.error('api/checkout', err && err.message);
    const status = err.status === 409 ? 409 : 500;
    return withCors(error(status === 409 ? err.message : 'Checkout couldn’t open. Try again in a minute.', status), request);
  }
}
