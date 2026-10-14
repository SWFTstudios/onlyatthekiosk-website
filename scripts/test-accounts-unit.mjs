#!/usr/bin/env node
/**
 * Unit tests for accounts helpers (safeReturnTo, PKCE, session hash).
 * Run: node scripts/test-accounts-unit.mjs
 */

import { safeReturnTo, rateLimit } from '../functions/_lib/http.js';
import { sha256Hex, randomToken } from '../functions/_lib/session.js';
import { randomString, pkceChallenge } from '../functions/_lib/shopify-customer.js';

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
const verifier = randomString(32);
const challenge = await pkceChallenge(verifier);
assert(typeof challenge === 'string' && challenge.length >= 40, 'pkce challenge length');
assert(!challenge.includes('+') && !challenge.includes('/') && !challenge.includes('='), 'pkce is base64url');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
