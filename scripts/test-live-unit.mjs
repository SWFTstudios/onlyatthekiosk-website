#!/usr/bin/env node
/**
 * Live presence tests: the real /api/live handler against the real
 * migrations on an in-memory SQLite database standing in for D1.
 * Run: node scripts/test-live-unit.mjs   (Node 22.13+ for node:sqlite)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequest as live } from '../functions/api/live.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ok  ${msg}`); } else { failed += 1; console.error(`  FAIL ${msg}`); }
}

const db = new DatabaseSync(':memory:');
readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()
  .forEach((f) => db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8')));
const stmt = (sql) => {
  let args = [];
  const s = {
    bind: (...a) => { args = a; return s; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  };
  return s;
};
const env = { DB: { prepare: stmt, batch: async (list) => { for (const s of list) await s.run(); } } };
let ip = 0;
const call = async (method, body, cf) => {
  ip += 1;
  const req = new Request('https://onlyatthekiosk.com/api/live', { method, headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${ip}` }, body: body ? JSON.stringify(body) : undefined });
  if (cf) Object.defineProperty(req, 'cf', { value: cf });
  const res = await live({ request: req, env });
  return { status: res.status, data: await res.json() };
};
const LAGOS = { latitude: '6.4541', longitude: '3.3947', city: 'Lagos', country: 'NG' };
const TOKYO = { latitude: '35.6762', longitude: '139.6503', city: 'Tokyo', country: 'JP' };

console.log('api/live');
let r = await live({ request: new Request('https://x.test/api/live'), env: {} });
assert((await r.json()).enabled === false, 'no database → disabled, empty');
r = await call('GET');
assert(r.data.enabled && r.data.count === 0 && r.data.viewers.length === 0, 'nobody here yet');
assert((await call('POST', { id: 'short' }, LAGOS)).status === 400, 'tab id must be a random token');
r = await call('POST', { id: 'a'.repeat(24) }, LAGOS);
assert(r.data.count === 1 && r.data.viewers.length === 0, 'heartbeat counts me but leaves me off my own list');
await call('POST', { id: 'b'.repeat(24) }, LAGOS);
await call('POST', { id: 'c'.repeat(24) }, TOKYO);
r = await call('GET');
const lagos = r.data.viewers.find((v) => v.city === 'Lagos');
assert(r.data.count === 3 && r.data.viewers.length === 2 && lagos.n === 2, 'viewers grouped by city');
assert(lagos.lat === 6.5 && lagos.lon === 3.4, 'coordinates rounded to one decimal');
r = await call('POST', { id: 'c'.repeat(24) }, TOKYO);
assert(r.data.viewers.every((v) => v.city !== 'Tokyo') && r.data.count === 3, 'a tab never sees itself');
assert(!db.prepare('SELECT id FROM presence').all().some((x) => x.id === 'a'.repeat(24)), 'tab ids are stored hashed');
await call('POST', { id: 'c'.repeat(24), leave: true });
r = await call('GET');
assert(r.data.count === 2 && !r.data.viewers.some((v) => v.city === 'Tokyo'), 'leaving drops the tab at once');
db.prepare('UPDATE presence SET seen_at = seen_at - 300').run();
r = await call('GET');
assert(r.data.count === 0, 'quiet tabs drop off after two minutes');
await call('POST', { id: 'd'.repeat(24) }, TOKYO);
assert(db.prepare('SELECT COUNT(*) AS n FROM presence').get().n === 3, 'not swept before ten minutes');
db.prepare('UPDATE presence SET seen_at = seen_at - 400 WHERE city = ?').run('Lagos');
await call('POST', { id: 'd'.repeat(24) }, TOKYO);
assert(db.prepare('SELECT COUNT(*) AS n FROM presence').get().n === 1, 'old rows swept on the next heartbeat');
r = await call('POST', { id: 'e'.repeat(24) });
assert(r.status === 200 && db.prepare('SELECT COUNT(*) AS n FROM presence').get().n === 1, 'no location → not pinned');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
