/**
 * Best-effort copy of orders and buyers into Airtable ("Kiosk Insights":
 * Orders, Customers, Catalog). D1 stays the record of truth: a failed copy is
 * logged and never blocks an order. Each new order costs about four API calls
 * (the free plan allows 1,000 a month). Field names match the base as set up
 * in docs/COMMERCE.md; table names can be changed with AIRTABLE_ORDERS_TABLE,
 * AIRTABLE_CUSTOMERS_TABLE and AIRTABLE_CATALOG_TABLE.
 */

import { formatAddress, itemLine } from './orders.js';

const ready = (env) => Boolean(env && env.AIRTABLE_ACCESS_TOKEN && env.AIRTABLE_BASE_ID);
const tables = (env) => ({
  orders: env.AIRTABLE_ORDERS_TABLE || 'Orders',
  customers: env.AIRTABLE_CUSTOMERS_TABLE || 'Customers',
  catalog: env.AIRTABLE_CATALOG_TABLE || 'Catalog',
});
const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const dollars = (c) => Math.round(c || 0) / 100;
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

async function at(env, method, table, { path = '', query = null, body = null } = {}) {
  const url = new URL(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${path}`);
  if (query) Object.entries(query).forEach(([k, v]) => [].concat(v).forEach((x) => url.searchParams.append(k, x)));
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`airtable ${table} ${res.status} ${JSON.stringify(data.error || '').slice(0, 200)}`);
  return data;
}

async function upsertCustomer(env, order) {
  const t = tables(env);
  const to = parse(order.ship_to);
  const fields = {
    Email: order.email,
    Name: order.name || to.name || '',
    Phone: order.phone || '',
    City: to.city || '',
    State: [to.state, to.country].filter(Boolean).join(', '),
    Member: Boolean(order.user_id),
  };
  const found = await at(env, 'GET', t.customers, { query: { filterByFormula: `LOWER({Email})=${quote(order.email.toLowerCase())}`, maxRecords: 1 } });
  const rec = (found.records || [])[0];
  if (rec) {
    await at(env, 'PATCH', t.customers, { path: `/${rec.id}`, body: { fields, typecast: true } });
    return rec.id;
  }
  const made = await at(env, 'POST', t.customers, { body: { fields: { ...fields, 'First Order': order.created_at.slice(0, 10) }, typecast: true } });
  return made.id;
}

async function catalogIds(env, productIds) {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return [];
  const t = tables(env);
  const found = await at(env, 'GET', t.catalog, {
    query: { filterByFormula: `OR(${ids.map((id) => `{Product ID}=${quote(id)}`).join(',')})`, 'fields[]': 'Product ID' },
  });
  return (found.records || []).map((r) => r.id);
}

/** Copy a new order (and its buyer) in. Returns the Airtable record id. */
export async function mirrorOrder(env, order, items) {
  if (!ready(env)) return null;
  const t = tables(env);
  const [customerId, products] = await Promise.all([
    upsertCustomer(env, order).catch((err) => { console.error('airtable customer', err.message); return null; }),
    catalogIds(env, items.map((it) => it.product_id)).catch((err) => { console.error('airtable catalog', err.message); return []; }),
  ]);
  const made = await at(env, 'POST', t.orders, {
    body: {
      typecast: true,
      fields: {
        'Order ID': order.number,
        'Order Date': new Date(`${order.created_at.replace(' ', 'T')}Z`).toISOString(),
        Email: order.email,
        'Customer Name': order.name,
        Items: items.map(itemLine).join('\n'),
        'Item Count': items.reduce((n, it) => n + it.quantity, 0),
        Subtotal: dollars(order.subtotal),
        Shipping: dollars(order.shipping),
        Total: dollars(order.total),
        Currency: order.currency.toUpperCase(),
        'Payment Status': 'paid',
        'Fulfillment Status': order.fulfillment_status,
        'Shipping Address': formatAddress(parse(order.ship_to)).join('\n'),
        'Stripe Session ID': order.stripe_session_id,
        'Stripe Payment Intent': order.payment_intent || '',
        ...(products.length ? { Products: products } : {}),
        ...(customerId ? { Customer: [customerId] } : {}),
      },
    },
  });
  await env.DB.prepare('UPDATE orders SET airtable_record_id = ? WHERE id = ?').bind(made.id, order.id).run();
  return made.id;
}

/** Keep the Airtable row in step after shipping or refunds (its Notes field stays yours). */
export async function updateOrderMirror(env, order) {
  if (!ready(env) || !order.airtable_record_id) return;
  await at(env, 'PATCH', tables(env).orders, {
    path: `/${order.airtable_record_id}`,
    body: {
      typecast: true,
      fields: {
        'Payment Status': order.payment_status,
        'Fulfillment Status': order.fulfillment_status,
        ...(order.carrier ? { Carrier: order.carrier } : {}),
        'Tracking Number': order.tracking || '',
        'Shipped On': order.shipped_at ? order.shipped_at.slice(0, 10) : null,
      },
    },
  });
}
