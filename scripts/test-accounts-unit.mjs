#!/usr/bin/env node
/**
 * Unit tests for accounts helpers (safeReturnTo, rate limit, sign-in codes, hashing).
 * Run: node scripts/test-accounts-unit.mjs
 */

import { safeReturnTo, rateLimit, safeText } from '../functions/_lib/http.js';
import { sha256Hex, randomToken, normalizeEmail, loginCode, hashCode, accountsReady, memberNo } from '../functions/_lib/session.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
}

console.log('safeReturnTo');
assert(safeReturnTo('/account.html') === '/account.html', 'allows relative path');
assert(safeReturnTo('/vault.html?c=apparel') === '/vault.html?c=apparel', 'allows query');
assert(safeReturnTo('https://evil.com') === '/', 'blocks absolute URL');
assert(safeReturnTo('//evil.com') === '/', 'blocks protocol-relative');
assert(safeReturnTo('/\\evil') === '/', 'blocks backslash');
assert(safeReturnTo('../etc/passwd') === '/', 'blocks relative traversal without leading slash');
assert(safeReturnTo(null) === '/', 'null falls back');
assert(safeReturnTo('/ok', '/home') === '/ok', 'keeps valid with custom fallback');

console.log('rateLimit');
const key = `test-${Date.now()}`;
assert(rateLimit(key, { limit: 2, windowMs: 60_000 }) === true, 'first allowed');
assert(rateLimit(key, { limit: 2, windowMs: 60_000 }) === true, 'second allowed');
assert(rateLimit(key, { limit: 2, windowMs: 60_000 }) === false, 'third blocked');

console.log('crypto helpers');
const tok = randomToken(16);
assert(tok.length === 32, 'randomToken hex length');
const hash = await sha256Hex('hello');
assert(hash === '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', 'sha256Hex hello');

console.log('sign-in codes');
assert(normalizeEmail('  Ada@Example.COM ') === 'ada@example.com', 'email trimmed and lower-cased');
assert(normalizeEmail('not-an-email') === null, 'rejects non-email');
assert(normalizeEmail(`${'a'.repeat(250)}@x.io`) === null, 'rejects over-long email');
const codes = Array.from({ length: 200 }, loginCode);
assert(codes.every((c) => /^\d{6}$/.test(c)), 'codes are six digits');
assert(new Set(codes).size > 190, 'codes vary');
const h1 = await hashCode({}, 'a@b.co', '123456');
assert(h1 === await hashCode({}, 'a@b.co', '123456'), 'code hash is stable');
assert(h1 !== await hashCode({}, 'c@b.co', '123456'), 'code hash depends on email');
assert(h1 !== await hashCode({ AUTH_SECRET: 's' }, 'a@b.co', '123456'), 'code hash uses AUTH_SECRET');
assert(accountsReady({ DB: {}, EMAIL: {} }) && !accountsReady({ DB: {} }), 'accounts need DB and EMAIL');
assert(memberNo(2) === '#0002', 'member number format');
assert(safeText('  <b>Ada</b>\n Lovelace ') === 'bAda/b Lovelace', 'names cleaned');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
