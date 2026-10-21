#!/usr/bin/env node
/**
 * Unit tests for the Stripe checkout: catalog pricing, shipping, bags, the
 * webhook signature, CSV exports, and orders + stock against the real D1
 * migrations (Node's built-in SQLite stands in for D1).
 * Run: node scripts/test-commerce-unit.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  commerceProvider, variantId, parseVariant, describeVariant, shippingFor, renderCart, sellableVariants,
  shipCountries, DEFAULT_SHIP_COUNTRIES, orderNumber, skuOf, productById,
} from '../functions/_lib/commerce.js';
import { formEncode, verifyWebhook, signPayload } from '../functions/_lib/stripe.js';
import { addLine, updateLine, removeLines, mergeInto, emptyCart, saveCart, loadCart } from '../functions/_lib/kiosk-cart.js';
import { reserve, release, commit } from '../functions/_lib/inventory.js';
import { createOrderFromSession, expireCheckout, publicOrder, orderItems, trackingUrl } from '../functions/_lib/orders.js';
import { cell, toCsv } from '../functions/_lib/csv.js';
import { adminEmails } from '../functions/_lib/admin.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ok  ${msg}`); } else { failed += 1; console.error(`  FAIL ${msg}`); }
}
async function rejects(fn, msg) {
  try { await fn(); assert(false, msg); } catch (e) { assert(true, msg); }
}

/* A D1-shaped wrapper over an in-memory SQLite with every migration applied */
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
  fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().forEach((f) => db.exec(fs.readFileSync(path.join(dir, f), 'utf8')));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: db.prepare(sql).run(...args).changes } }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())), raw: db };
}

console.log('provider');
assert(commerceProvider({}) === null, 'nothing configured → no checkout');
assert(commerceProvider({ STRIPE_SECRET_KEY: 'sk' }) === 'stripe', 'Stripe key → stripe');
assert(commerceProvider({ STRIPE_SECRET_KEY: 'sk', SHOPIFY_STOREFRONT_TOKEN: 't' }) === 'shopify', 'Shopify wins once its token is set');
assert(commerceProvider({ STRIPE_SECRET_KEY: 'sk', SHOPIFY_STOREFRONT_TOKEN: 't', COMMERCE_PROVIDER: 'stripe' }) === 'stripe', 'COMMERCE_PROVIDER forces it');

console.log('variants and prices');
const tee = variantId('ess-tee', 0, 'M');
assert(tee === 'kiosk:ess-tee:0:M', 'variant id format');
assert(JSON.stringify(parseVariant(variantId('deck-hudson', 1, '8.25"'))) === JSON.stringify({ productId: 'deck-hudson', cw: 1, size: '8.25"' }), 'sizes with quotes round-trip');
assert(parseVariant(variantId('socks-pit', 0, 'S/M')).size === 'S/M', 'slashes in sizes round-trip');
assert(parseVariant('kiosk:ess-tee:0:a:b') === null, 'raw colons are refused');
assert(parseVariant('gid://shopify/ProductVariant/1') === null, 'Shopify ids are not KIOSK variants');
const d = describeVariant(tee);
assert(!d.error && d.unitAmount === 3999, 'Essential Tee priced from the catalog in cents');
assert(d.sku === '001-black-tshirt-m' && d.colour === 'Black', 'SKU uses the colourway handle and size');
assert(d.shipClass === 'light' && describeVariant(variantId('ess-hoodie', 0, 'L')).shipClass === 'heavy', 'tees ship light, hoodies heavy');
assert(/size/i.test(describeVariant('kiosk:ess-tee:0:').error || ''), 'a size is required');
assert(/size/i.test(describeVariant('kiosk:ess-tee:0:XXXL').error || ''), 'unknown sizes are refused');
assert(/isn’t on sale/.test(describeVariant(variantId('ess-tee', 2, 'M')).error || ''), 'coming-soon colourway (Oat) is refused');
assert(/isn’t on sale/.test(describeVariant(variantId('tee-q-direction', 0, 'M')).error || ''), 'coming-soon product is refused');
assert(/isn’t in the shop/.test(describeVariant(variantId('ess-tee', 9, 'M')).error || ''), 'colourway out of range is refused');
assert(/pickup/i.test(describeVariant(variantId('hunt-bridge-tee', 0, 'M')).error || ''), 'pickup-only pieces are refused');
assert(/Digital/.test(describeVariant(variantId('lut-bridge-dusk', 0, '')).error || ''), 'digital goods are refused for now');
const chain = describeVariant(variantId('acc-chain', 1, ''));
assert(!chain.error && chain.sku === '001-silver-chain', 'one-size pieces need no size');
const sellable = sellableVariants();
assert(sellable.length > 0 && sellable.every((v) => !describeVariant(v.id).error), 'every sellable variant describes cleanly');
assert(!sellable.some((v) => v.colour === 'Oat'), 'sellable list skips coming-soon colourways');
assert(new Set(sellable.map((v) => v.sku)).size === sellable.length, 'SKUs are unique');
assert(skuOf(productById('ess-tee'), 0, 'XXL') === '001-black-tshirt-xxl', 'skuOf lower-cases the size');
assert(/^KIOSK-[A-HJ-NP-Z2-9]{6}$/.test(orderNumber()), 'order numbers avoid 0/O and 1/I');

console.log('shipping');
const L = (shipClass, quantity = 1) => ({ shipClass, quantity });
assert(shippingFor('US', [L('light')]).amount === 600, 'US tee $6');
assert(shippingFor('US', [L('light'), L('heavy')]).amount === 1100, 'US tee + hoodie $9 + $2');
assert(shippingFor('CA', [L('light', 2)]).amount === 2000, 'Canada two tees $15 + $5');
assert(shippingFor('AU', [L('heavy')]).amount === 3000, 'Australia hoodie $30');
assert(shippingFor('DE', [L('heavy')]).label.includes('International'), 'Germany ships First-Class International');
assert(shippingFor('US', []).amount === 0, 'empty bag ships free');
assert(!DEFAULT_SHIP_COUNTRIES.includes('GB'), 'UK off until registered for UK VAT');
assert(JSON.stringify(shipCountries({ SHIP_COUNTRIES: 'us, gb , xx1' })) === '["US","GB"]', 'SHIP_COUNTRIES overrides the list');

console.log('bags');
const bag = emptyCart();
addLine(bag, tee, 1);
addLine(bag, tee, 2);
assert(bag.lines.length === 1 && bag.lines[0].quantity === 3, 'same piece stacks');
addLine(bag, tee, 50);
assert(bag.lines[0].quantity === 10, 'line quantity caps at 10');
await rejects(async () => addLine(bag, variantId('tee-q-direction', 0, 'M')), 'adding a coming-soon piece throws');
addLine(bag, variantId('ess-hoodie', 1, 'L'));
updateLine(bag, bag.lines[0].id, 2);
assert(bag.lines[0].quantity === 2, 'update sets quantity');
removeLines(bag, [bag.lines[1].id]);
assert(bag.lines.length === 1, 'remove drops the line');
const other = emptyCart();
addLine(other, tee, 1);
other.lines.push({ id: 'x', variantId: 'kiosk:gone:0:M', quantity: 1 });
mergeInto(bag, other);
assert(bag.lines.length === 1 && bag.lines[0].quantity === 3, 'merge adds up and skips dead pieces');
const view = renderCart({ id: 'c1', lines: [...bag.lines, { id: 'y', variantId: 'kiosk:gone:0:M', quantity: 1 }] }, { origin: 'https://onlyatthekiosk.com', country: 'FR' });
assert(view.lines.length === 1 && view.totalQuantity === 3, 'render drops lines no longer on sale');
assert(view.cost.amount === '119.97' && view.cost.currencyCode === 'USD', 'subtotal from catalog prices');
assert(view.shipping.country === 'FR' && view.shipping.amount === 2500, 'France: $15 + 2 × $5');
assert(view.shipping.byZone.US === 1000 && view.shipping.byZone.AU === 2800, 'rates per zone for the country picker');
assert(view.lines[0].image.startsWith('https://onlyatthekiosk.com/images/'), 'line image is absolute');
assert(view.lines[0].variantTitle === 'Black' && view.lines[0].options[0].value === 'M', 'drawer gets colour and size separately');
assert(renderCart({ id: 'c', lines: [] }, { country: 'ZZ' }).shipping.country === 'US', 'unsupported country falls back to US');

console.log('stripe');
const fe = formEncode({ a: 1, b: { c: [{ d: 'x' }, 'y'] }, skip: undefined, e: true });
assert(fe.toString() === 'a=1&b%5Bc%5D%5B0%5D%5Bd%5D=x&b%5Bc%5D%5B1%5D=y&e=true', 'nested form encoding');
const secret = 'whsec_test';
const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
const t = Math.floor(Date.now() / 1000);
const sig = await signPayload(secret, t, body);
assert((await verifyWebhook(body, `t=${t},v1=${sig}`, secret)).id === 'evt_1', 'valid signature passes');
await rejects(() => verifyWebhook(`${body} `, `t=${t},v1=${sig}`, secret), 'tampered body fails');
const oldSig = await signPayload(secret, t - 3600, body);
await rejects(() => verifyWebhook(body, `t=${t - 3600},v1=${oldSig}`, secret), 'old signature fails');
await rejects(() => verifyWebhook(body, '', secret), 'missing signature fails');
await rejects(() => verifyWebhook(body, `t=${t},v1=${sig}`, ''), 'missing secret fails');

console.log('csv and admin');
assert(cell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"`, 'formulas are defused');
assert(cell('+12015550123') === '+12015550123', 'phone numbers stay as typed');
assert(cell('a,b') === '"a,b"' && cell(null) === '', 'commas quoted, null empty');
assert(toCsv(['A', 'B'], [[1, 'x']]) === 'A,B\r\n1,x', 'rows joined with CRLF');
assert(JSON.stringify(adminEmails({ ADMIN_EMAILS: ' A@x.co, b@y.co ,nope' })) === '["a@x.co","b@y.co"]', 'admin list parsed and lower-cased');
assert(adminEmails({}).length === 0, 'no list, no admins');
assert(trackingUrl('USPS', '9400 1').includes('tLabels=9400%201') && trackingUrl('UPS', '1Z').includes('ups.com'), 'tracking links per carrier');

console.log('orders and stock (D1 migrations on SQLite)');
const DB = fakeD1();
const env = { DB };
const stored = await saveCart(env, (() => { const c = emptyCart(); addLine(c, tee, 2); addLine(c, variantId('ess-hoodie', 0, 'L'), 1); return c; })());
assert((await loadCart(env, stored.id)).lines.length === 2, 'bag saved and loaded');
assert(await loadCart(env, '../etc') === null, 'odd bag ids are ignored');

await DB.prepare("INSERT INTO inventory (sku, product_id, on_hand) VALUES ('001-black-tshirt-m', 'ess-tee', 3)").run();
const lines = stored.lines.map((l) => { const x = describeVariant(l.variantId); return { productId: x.productId, cw: x.cw, size: x.size, colour: x.colour, sku: x.sku, title: x.title, quantity: l.quantity, unitAmount: x.unitAmount }; });
const held = await reserve(env, lines);
assert(held.find((l) => l.sku === '001-black-tshirt-m').reserved && !held.find((l) => l.sku !== '001-black-tshirt-m').reserved, 'only limited SKUs are held');
let inv = await DB.prepare("SELECT on_hand, reserved FROM inventory WHERE sku = '001-black-tshirt-m'").first();
assert(inv.on_hand === 3 && inv.reserved === 2, 'two of three held');
await rejects(() => reserve(env, [{ ...lines[0], quantity: 2 }]), 'cannot hold more than is left');
inv = await DB.prepare("SELECT reserved FROM inventory WHERE sku = '001-black-tshirt-m'").first();
assert(inv.reserved === 2, 'a failed hold leaves no trace');

await DB.prepare('INSERT INTO checkouts (session_id, cart_id, user_id, country, lines, subtotal, shipping) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .bind('cs_test_paid', stored.id, null, 'US', JSON.stringify(held), 3999 * 2 + 8999, 1100).run();
const cs = {
  id: 'cs_test_paid', mode: 'payment', payment_status: 'paid', currency: 'usd', payment_intent: 'pi_1',
  amount_subtotal: 16997, amount_total: 18097, total_details: { amount_shipping: 1100, amount_tax: 0, amount_discount: 0 },
  customer_details: { email: 'Buyer@Example.com', name: 'Ada Buyer', phone: '+12015550123', address: { country: 'US' } },
  collected_information: { shipping_details: { name: 'Ada Buyer', address: { line1: '1 Grove St', city: 'Jersey City', state: 'NJ', postal_code: '07302', country: 'US' } } },
  metadata: { cart_id: stored.id },
};
const first = await createOrderFromSession(env, cs);
assert(first.created && /^KIOSK-/.test(first.order.number), 'paid session becomes an order');
assert(first.order.email === 'buyer@example.com' && first.order.total === 18097 && first.order.shipping === 1100, 'order amounts and email from Stripe');
assert(first.items.length === 2 && first.items[0].sku === '001-black-tshirt-m', 'order items from the checkout snapshot');
inv = await DB.prepare("SELECT on_hand, reserved FROM inventory WHERE sku = '001-black-tshirt-m'").first();
assert(inv.on_hand === 1 && inv.reserved === 0, 'paid units leave the shelf');
assert((await loadCart(env, stored.id)).lines.length === 0, 'the bag is emptied');
const again = await createOrderFromSession(env, cs);
assert(!again.created && again.order.id === first.order.id, 'a repeated webhook finds the same order');
assert((await DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n === 1, 'still one order');
inv = await DB.prepare("SELECT on_hand FROM inventory WHERE sku = '001-black-tshirt-m'").first();
assert(inv.on_hand === 1, 'stock is not taken twice');
const pub = publicOrder(first.order, await orderItems(env, first.order.id));
assert(pub.shipTo.city === 'Jersey City' && pub.items.length === 2 && !('notes' in pub) && !('id' in pub), 'public order hides internals');

const held2 = await reserve(env, [{ ...lines[0], quantity: 1 }]);
await DB.prepare('INSERT INTO checkouts (session_id, cart_id, country, lines, subtotal, shipping) VALUES (?, ?, ?, ?, ?, ?)')
  .bind('cs_test_expired', 'x', 'US', JSON.stringify(held2), 3999, 600).run();
assert((await DB.prepare("SELECT reserved FROM inventory WHERE sku = '001-black-tshirt-m'").first()).reserved === 1, 'second checkout holds the last one');
await expireCheckout(env, 'cs_test_expired');
await expireCheckout(env, 'cs_test_expired');
inv = await DB.prepare("SELECT on_hand, reserved FROM inventory WHERE sku = '001-black-tshirt-m'").first();
assert(inv.on_hand === 1 && inv.reserved === 0, 'expiry frees the hold, once');
await release(env, []);
await commit(env, []);
assert(true, 'empty release/commit are no-ops');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
