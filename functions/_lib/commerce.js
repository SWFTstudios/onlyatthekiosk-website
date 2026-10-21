/**
 * KIOSK checkout without Shopify: the catalog, prices and shipping that
 * /api/cart, /api/checkout and the Stripe webhook share.
 *
 * Prices always come from js/kiosk-content.js (the same file the shop renders),
 * never from the browser. A cart line names a piece as a "variant id":
 *   kiosk:<product id>:<colourway index>:<size>   e.g. kiosk:ess-tee:0:M
 *
 * Which checkout runs (see docs/COMMERCE.md):
 *   COMMERCE_PROVIDER = 'stripe' | 'shopify'   (explicit), otherwise
 *   'shopify' when SHOPIFY_STOREFRONT_TOKEN is set, 'stripe' when
 *   STRIPE_SECRET_KEY is set, else none (the shop shows "Notify me" only).
 */

import './kiosk-data.js';
import '../../js/kiosk-content.js';

const content = () => globalThis.window.KIOSK_CONTENT || { products: [] };

export const CURRENCY = 'usd';
export const MAX_LINE_QTY = 10;
export const MAX_LINES = 20;
const DIGITAL = ['films', 'luts', 'mixes'];

export function commerceProvider(env) {
  const forced = String((env && env.COMMERCE_PROVIDER) || '').toLowerCase();
  if (forced === 'stripe' || forced === 'shopify') return forced;
  if (env && env.SHOPIFY_STOREFRONT_TOKEN) return 'shopify';
  if (env && env.STRIPE_SECRET_KEY) return 'stripe';
  return null;
}

export const productById = (id) => (content().products || []).find((p) => p.id === id) || null;
const wayOf = (p, cw) => (p.colorways || [])[cw || 0] || {};
const statusOf = (p, cw) => wayOf(p, cw).status || p.status;

export const toCents = (dollars) => Math.round(Number(dollars) * 100);
export const money = (cents, currency = CURRENCY) => ({ amount: (cents / 100).toFixed(2), currencyCode: currency.toUpperCase() });

export function variantId(productId, cw = 0, size = '') {
  return `kiosk:${productId}:${Number(cw) || 0}:${encodeURIComponent(size || '')}`;
}

/** { productId, cw, size } from a variant id, or null when it isn't one. */
export function parseVariant(id) {
  const m = /^kiosk:([a-z0-9-]{1,80}):(\d{1,2}):([^:]{0,40})$/.exec(String(id || ''));
  if (!m) return null;
  let size = '';
  try { size = decodeURIComponent(m[3]); } catch (e) { return null; }
  return { productId: m[1], cw: Number(m[2]), size };
}

/** The stock-keeping code staff see: the colourway's handle plus the size. */
export function skuOf(p, cw, size) {
  const base = wayOf(p, cw).shopifyHandle || `${p.id}-${cw}`;
  const s = String(size || '').toLowerCase().replace(/[^a-z0-9.]+/g, '');
  return s ? `${base}-${s}` : base;
}

/**
 * Everything checkout needs about one variant, or { error } when it can't be
 * sold: unknown, not available yet, partner-store, pickup-only or digital
 * pieces, and sizes the product doesn't come in.
 */
export function describeVariant(id) {
  const v = parseVariant(id);
  if (!v) return { error: 'That piece isn’t in the shop.' };
  const p = productById(v.productId);
  if (!p || (v.cw > 0 && !(p.colorways || [])[v.cw])) return { error: 'That piece isn’t in the shop.' };
  if (p.store && p.store !== 'kiosk') return { error: `${p.title} is sold by its own store.` };
  if (p.pickup) return { error: `${p.title} is pickup only. Reserve it from its page.` };
  if (DIGITAL.includes(p.category)) return { error: 'Digital downloads aren’t on sale yet.' };
  if (statusOf(p, v.cw) !== 'available' || p.price == null) return { error: `${p.title} isn’t on sale yet.` };
  const sizes = p.sizes || [];
  let size = v.size;
  if (sizes.length > 1 && !sizes.includes(size)) return { error: `Pick a size for ${p.title}.` };
  if (sizes.length === 1) size = sizes[0];
  if (!sizes.length) size = '';
  const way = wayOf(p, v.cw);
  const photo = (way.lifestyle && way.lifestyle[0]) || way.image || p.image || ((p.lifestyle || [])[0]) || '';
  return {
    id: variantId(p.id, v.cw, size),
    product: p,
    productId: p.id,
    cw: v.cw,
    size,
    colour: way.name || '',
    title: p.title,
    variantTitle: [way.name, size].filter(Boolean).join(' · '),
    sku: skuOf(p, v.cw, size),
    unitAmount: toCents(p.price),
    image: photo,
    shipClass: shipClassOf(p),
  };
}

/* ------------------------------------------------------------- shipping
 * Everything ships from Jersey City, NJ by USPS. Customers pay a flat rate:
 * the heaviest piece in the order sets the base, and each extra piece adds a
 * little. Edit the numbers here; docs/COMMERCE.md shows the costs behind them.
 *
 *   light  tees, longsleeves, caps, beanies, socks, chains, small goods (~0.6 lb packed)
 *   heavy  hoodies, crewnecks, decks (1.5–2.5 lb packed)
 */
export const SHIPPING = {
  US: {
    label: 'USPS Ground Advantage', days: [2, 5],
    light: 600, heavy: 900, extra: 200,
  },
  AU: {
    label: 'USPS First-Class Package International', days: [7, 21],
    light: 1800, heavy: 3000, extra: 500,
  },
  INTL: {
    label: 'USPS First-Class Package International', days: [7, 21],
    light: 1500, heavy: 2500, extra: 500,
  },
};
const ZONE_OF = { US: 'US', PR: 'US', AU: 'AU', NZ: 'AU' };

/**
 * Countries checkout ships to. Override with SHIP_COUNTRIES (comma list of
 * ISO codes). The UK is left out until the shop is registered for UK VAT:
 * HMRC requires overseas sellers to charge VAT at checkout on parcels up to
 * £135 (add GB to SHIP_COUNTRIES once registered).
 */
export const DEFAULT_SHIP_COUNTRIES = [
  'US', 'PR', 'CA', 'MX',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'CH', 'NO', 'IS', 'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'AE', 'IL',
];

export function shipCountries(env) {
  const raw = env && env.SHIP_COUNTRIES;
  if (!raw) return DEFAULT_SHIP_COUNTRIES;
  const list = String(raw).toUpperCase().split(/[\s,]+/).filter((c) => /^[A-Z]{2}$/.test(c));
  return list.length ? list : DEFAULT_SHIP_COUNTRIES;
}

/** The ship-to country: what the shopper picked, else where Cloudflare says they are. */
export function pickCountry(request, asked) {
  const c = String(asked || (request.cf && request.cf.country) || 'US').toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : 'US';
}

export function shipClassOf(p) {
  if (p.ship === 'heavy' || p.ship === 'light') return p.ship;
  const type = (p.mockup && p.mockup.type) || '';
  return ['hoodie', 'crew', 'deck'].includes(type) ? 'heavy' : 'light';
}

/** { zone, label, days, amount } in cents for these lines shipped to a country. */
export function shippingFor(country, lines) {
  const zone = ZONE_OF[country] || 'INTL';
  const rate = SHIPPING[zone];
  const qty = lines.reduce((n, l) => n + l.quantity, 0);
  if (!qty) return { zone, label: rate.label, days: rate.days, amount: 0 };
  const heavy = lines.some((l) => l.shipClass === 'heavy');
  const amount = (heavy ? rate.heavy : rate.light) + rate.extra * (qty - 1);
  return { zone, label: rate.label, days: rate.days, amount };
}

/* ----------------------------------------------------------------- carts */

/**
 * Turn stored lines [{ id, variantId, quantity }] into the cart shape the
 * drawer already renders for Shopify carts, plus the shipping choices.
 * Lines that can no longer be sold are dropped.
 */
export function renderCart({ id, lines }, { origin = '', country = 'US', countries = DEFAULT_SHIP_COUNTRIES } = {}) {
  const out = [];
  for (const l of lines || []) {
    const d = describeVariant(l.variantId);
    if (d.error) continue;
    out.push({
      id: l.id,
      quantity: l.quantity,
      variantId: d.id,
      productId: d.productId,
      title: d.title,
      variantTitle: d.colour,   // the drawer adds the size from options
      handle: d.productId,
      image: d.image ? absolute(origin, d.image) : null,
      imageAlt: `${d.title}${d.colour ? ` in ${d.colour}` : ''}`,
      price: money(d.unitAmount),
      options: d.size ? [{ name: 'Size', value: d.size }] : [],
      shipClass: d.shipClass,
    });
  }
  const subtotal = out.reduce((n, l) => n + toCents(l.price.amount) * l.quantity, 0);
  const shipTo = countries.includes(country) ? country : (countries.includes('US') ? 'US' : countries[0]);
  const ship = shippingFor(shipTo, out);
  return {
    id,
    provider: 'stripe',
    checkoutUrl: '/api/checkout',   // POST { cartId, country } → { url } (the drawer's Checkout button)
    totalQuantity: out.reduce((n, l) => n + l.quantity, 0),
    cost: money(subtotal),
    lines: out.map(({ shipClass, ...l }) => l),
    shipping: {
      country: shipTo,
      countries,
      // what each zone would charge for this cart, so the drawer can show it as the country changes
      byZone: Object.fromEntries(Object.keys(SHIPPING).map((z) => [z, shippingFor(z === 'INTL' ? 'ZZ' : z, out).amount])),
      zoneOf: ZONE_OF,
      amount: ship.amount,
      label: ship.label,
    },
  };
}

export function absolute(origin, path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${origin.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}

/** KIOSK-7Q4M2X: easy to read out on the phone (no 0/O, 1/I). */
export function orderNumber() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return `KIOSK-${[...a].map((b) => abc[b % abc.length]).join('')}`;
}

/** Every piece checkout can sell right now, one entry per colourway and size. */
export function sellableVariants() {
  const out = [];
  for (const p of content().products || []) {
    const ways = (p.colorways && p.colorways.length) ? p.colorways : [{}];
    ways.forEach((w, cw) => {
      const sizes = (p.sizes && p.sizes.length) ? p.sizes : [''];
      sizes.forEach((size) => {
        const d = describeVariant(variantId(p.id, cw, size));
        if (!d.error) out.push({ id: d.id, productId: p.id, title: p.title, colour: d.colour, size: d.size, sku: d.sku });
      });
    });
  }
  return out;
}
