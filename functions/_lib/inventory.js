/**
 * Stock for limited pieces (`inventory`). A SKU without a row is made to
 * order and never sells out. Opening a checkout reserves units for the
 * session's 30 minutes; payment turns the hold into a sale, expiry frees it.
 */

/**
 * Hold stock for priced lines. Returns the lines marked `reserved` where a hold
 * was taken, or throws (and releases what it took) when a SKU is short.
 */
export async function reserve(env, lines) {
  const held = [];
  for (const l of lines) {
    const row = await env.DB.prepare('SELECT on_hand, reserved FROM inventory WHERE sku = ?').bind(l.sku).first();
    if (!row) { held.push({ ...l, reserved: false }); continue; }
    const res = await env.DB.prepare(
      `UPDATE inventory SET reserved = reserved + ?, updated_at = datetime('now')
       WHERE sku = ? AND on_hand - reserved >= ?`
    ).bind(l.quantity, l.sku, l.quantity).run();
    if (!res.meta || !res.meta.changes) {
      await release(env, held);
      const left = Math.max(0, row.on_hand - row.reserved);
      throw Object.assign(new Error(left
        ? `Only ${left} left of ${l.title}${l.size ? ` in ${l.size}` : ''}.`
        : `${l.title}${l.size ? ` in ${l.size}` : ''} just sold out.`), { status: 409 });
    }
    held.push({ ...l, reserved: true });
  }
  return held;
}

/** Give back holds (checkout expired or failed to open). */
export async function release(env, lines) {
  for (const l of lines.filter((x) => x.reserved)) {
    await env.DB.prepare(
      `UPDATE inventory SET reserved = MAX(0, reserved - ?), updated_at = datetime('now') WHERE sku = ?`
    ).bind(l.quantity, l.sku).run();
  }
}

/** Paid: the held units leave the shelf. */
export async function commit(env, lines) {
  for (const l of lines.filter((x) => x.reserved)) {
    await env.DB.prepare(
      `UPDATE inventory SET on_hand = MAX(0, on_hand - ?), reserved = MAX(0, reserved - ?), updated_at = datetime('now')
       WHERE sku = ?`
    ).bind(l.quantity, l.quantity, l.sku).run();
  }
}
