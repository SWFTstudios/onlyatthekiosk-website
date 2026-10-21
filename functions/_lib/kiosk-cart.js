/**
 * Bags for the Stripe checkout, kept in D1 (`kiosk_carts`). Guests hold the
 * bag id in localStorage, members get it linked to their account. Lines only
 * store what was picked; prices are worked out from the catalog every time.
 */

import { randomToken } from './session.js';
import { describeVariant, MAX_LINE_QTY, MAX_LINES } from './commerce.js';

const clampQty = (q) => Math.max(0, Math.min(MAX_LINE_QTY, Math.floor(Number(q) || 0)));

export async function loadCart(env, id) {
  if (!id || !/^[a-f0-9]{24,64}$/.test(id)) return null;
  const row = await env.DB.prepare('SELECT id, user_id, lines FROM kiosk_carts WHERE id = ?').bind(id).first();
  if (!row) return null;
  let lines = [];
  try { lines = JSON.parse(row.lines) || []; } catch (e) { lines = []; }
  return { id: row.id, userId: row.user_id, lines };
}

export async function saveCart(env, cart) {
  await env.DB.prepare(
    `INSERT INTO kiosk_carts (id, user_id, lines, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, lines = excluded.lines, updated_at = datetime('now')`
  ).bind(cart.id, cart.userId || null, JSON.stringify(cart.lines)).run();
  return cart;
}

export function emptyCart(userId = null) {
  return { id: randomToken(16), userId, lines: [] };
}

/** Add a variant (validated against the catalog); the same piece stacks. */
export function addLine(cart, variant, quantity = 1) {
  const d = describeVariant(variant);
  if (d.error) throw Object.assign(new Error(d.error), { status: 400 });
  const qty = clampQty(quantity) || 1;
  const existing = cart.lines.find((l) => l.variantId === d.id);
  if (existing) existing.quantity = clampQty(existing.quantity + qty);
  else {
    if (cart.lines.length >= MAX_LINES) throw Object.assign(new Error('Your bag is full.'), { status: 400 });
    cart.lines.push({ id: randomToken(8), variantId: d.id, quantity: qty });
  }
  return cart;
}

export function updateLine(cart, lineId, quantity) {
  const qty = clampQty(quantity);
  cart.lines = cart.lines
    .map((l) => (l.id === lineId ? { ...l, quantity: qty } : l))
    .filter((l) => l.quantity > 0);
  return cart;
}

export function removeLines(cart, lineIds) {
  const drop = new Set(lineIds);
  cart.lines = cart.lines.filter((l) => !drop.has(l.id));
  return cart;
}

/** Fold a guest bag into a member's bag (same pieces add up). */
export function mergeInto(target, source) {
  for (const l of source.lines || []) {
    try { addLine(target, l.variantId, l.quantity); } catch (e) { /* no longer on sale */ }
  }
  return target;
}
