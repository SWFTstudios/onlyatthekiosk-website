#!/usr/bin/env node
/**
 * Partner Hub tests: field cleaning, then the real /api/partner,
 * /api/partner/products and /api/partners handlers against the real
 * migrations in an in-memory SQLite database standing in for D1.
 * Run: node scripts/test-partner-unit.mjs   (Node 22.13+ for node:sqlite)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { cleanPartner, cleanProduct, safeUrl, handleOf } from '../functions/_lib/partner.js';
import { sha256Hex } from '../functions/_lib/session.js';
import { onRequest as partnerApi } from '../functions/api/partner/index.js';
import { onRequest as productsApi } from '../functions/api/partner/products.js';
import { onRequest as directoryApi } from '../functions/api/partners.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ok  ${msg}`); } else { failed += 1; console.error(`  FAIL ${msg}`); }
}

console.log('cleaning');
assert(safeUrl('kiosk.example.com/shop') === 'https://kiosk.example.com/shop', 'bare domain becomes https');
assert(safeUrl('http://insecure.example.com') === '', 'http links refused');
assert(safeUrl('javascript:alert(1)') === '', 'script links refused');
assert(handleOf('Café Lisboa — Vintage!') === 'cafe-lisboa-vintage', 'handle from a name');
assert(handleOf('ab') === '', 'handle needs three characters');
assert(cleanPartner({ kind: 'store' }).error, 'name required');
assert(cleanPartner({ name: 'X Shop', kind: 'reseller' }).error, 'kind must be store, brand or sponsor');
const cp = cleanPartner({ name: ' Casa  <b>Lisboa</b> ', kind: 'store', instagram: 'https://instagram.com/casa.lisboa/', settings: { payout: 'wire', listed: false } }, 'me@x.co');
assert(cp.name === 'Casa bLisboa/b' && cp.handle === 'casa-blisboa-b', 'tags stripped from names');
assert(cp.instagram === 'casa.lisboa', 'instagram handle from a profile link');
assert(cp.settings.payout === 'link' && cp.settings.listed === false && cp.settings.contactEmail === 'me@x.co', 'settings cleaned with defaults');
assert(cleanProduct({ title: 'Tee', price: 'abc' }).error, 'price must be a number');
const pr = cleanProduct({ title: 'Tee', price: '35.499', currency: 'eur', status: 'live', image: 'https://cdn.example.com/a.jpg' });
assert(pr.price === 35.5 && pr.currency === 'EUR' && pr.status === 'live', 'product cleaned');

// D1 over node:sqlite
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()
  .forEach((f) => db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8')));
const stmt = (sql) => {
  let args = [];
  const s = {
    bind: (...a) => { args = a; return s; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
  };
  return s;
};
const env = { DB: { prepare: stmt, batch: async (list) => { const out = []; for (const s of list) out.push(await s.run()); return out; } }, EMAIL: {} };

async function member(id, email) {
  db.prepare('INSERT INTO users (id, email, member_number) VALUES (?, ?, (SELECT COALESCE(MAX(member_number), 0) + 1 FROM users))').run(id, email);
  const sid = `session-${id}`;
  db.prepare('INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)').run(await sha256Hex(sid), id, new Date(Date.now() + 86400000).toISOString());
  return `kiosk_session=${sid}`;
}
const call = async (api, path, { method = 'GET', cookie = '', body } = {}) => {
  const req = new Request(`https://onlyatthekiosk.com${path}`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const res = await api({ request: req, env });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

console.log('api/partner');
const ada = await member('u-ada', 'ada@example.com');
const bo = await member('u-bo', 'bo@example.com');
assert((await call(partnerApi, '/api/partner')).status === 401, 'signed out → 401');
let r = await call(partnerApi, '/api/partner', { cookie: ada });
assert(r.status === 200 && r.data.partner === null, 'no profile yet');
r = await call(partnerApi, '/api/partner', { method: 'PUT', cookie: ada, body: { partner: { name: 'Casa Lisboa', kind: 'store', bio: 'Workwear.', website: 'casa.example.com' } } });
assert(r.status === 200 && r.data.partner.handle === 'casa-lisboa' && r.data.partner.status === 'pending', 'profile created, pending');
assert(r.data.partner.website === 'https://casa.example.com/' && r.data.partner.settings.contactEmail === 'ada@example.com', 'links and contact filled in');
r = await call(partnerApi, '/api/partner', { method: 'PUT', cookie: bo, body: { partner: { name: 'Casa Lisboa', kind: 'brand' } } });
assert(r.status === 409, 'handle taken by someone else → 409');
r = await call(partnerApi, '/api/partner', { method: 'PUT', cookie: ada, body: { partner: { name: 'Casa Lisboa', kind: 'store', tagline: 'Sourced in Portugal' } } });
assert(r.status === 200 && r.data.partner.tagline === 'Sourced in Portugal', 'owner can update');
r = await call(partnerApi, '/api/partner', { method: 'PUT', cookie: ada, body: { partner: { kind: 'store' } } });
assert(r.status === 422, 'invalid profile → 422');

console.log('api/partner/products');
assert((await call(productsApi, '/api/partner/products', { method: 'POST', cookie: bo, body: { product: { title: 'X' } } })).status === 409, 'products need a profile');
r = await call(productsApi, '/api/partner/products', { method: 'POST', cookie: ada, body: { product: { title: 'Chore coat', price: 180, status: 'live' } } });
assert(r.status === 200 && r.data.products.length === 1 && r.data.products[0].status === 'live', 'piece added');
const coat = r.data.products[0].id;
r = await call(productsApi, '/api/partner/products', { method: 'POST', cookie: ada, body: { product: { title: 'Cap', price: 30 } } });
const cap = r.data.products[1].id;
assert(r.data.products[1].status === 'draft', 'new pieces default to draft');
r = await call(productsApi, '/api/partner/products', { method: 'PUT', cookie: ada, body: { id: coat, product: { title: 'Chore coat, indigo', price: 190, status: 'live' } } });
assert(r.data.products[0].title === 'Chore coat, indigo' && r.data.products[0].price === 190, 'piece updated');
r = await call(productsApi, '/api/partner/products', { method: 'PUT', cookie: ada, body: { order: [cap, coat] } });
assert(r.data.products[0].id === cap, 'pieces re-ordered');
assert((await call(productsApi, '/api/partner/products', { method: 'PUT', cookie: bo, body: { id: coat, product: { title: 'Mine now' } } })).status === 409, 'another member cannot edit');

console.log('api/partners (public)');
r = await call(directoryApi, '/api/partners');
assert(r.status === 200 && r.data.partners.length === 0, 'pending partners stay private');
db.prepare("UPDATE partners SET status = 'live' WHERE user_id = 'u-ada'").run();
r = await call(directoryApi, '/api/partners');
assert(r.data.partners.length === 1 && r.data.partners[0].products.length === 1, 'live partner listed with live pieces only');
assert(!JSON.stringify(r.data).includes('ada@example.com') && !('settings' in r.data.partners[0]), 'no emails or settings in public data');
assert((await call(directoryApi, '/api/partners?handle=casa-lisboa')).data.partners[0].name === 'Casa Lisboa', 'one partner by handle');
await call(partnerApi, '/api/partner', { method: 'PUT', cookie: ada, body: { partner: { name: 'Casa Lisboa', kind: 'store', settings: { listed: false } } } });
assert((await call(directoryApi, '/api/partners')).data.partners.length === 0, 'unlisted partners hidden');

console.log('delete');
r = await call(productsApi, `/api/partner/products?id=${cap}`, { method: 'DELETE', cookie: ada });
assert(r.data.products.length === 1, 'piece removed');
r = await call(partnerApi, '/api/partner', { method: 'DELETE', cookie: ada });
assert(r.data.partner === null && db.prepare('SELECT COUNT(*) AS n FROM partner_products').get().n === 0, 'profile and pieces removed');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
