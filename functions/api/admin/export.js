/**
 * GET /api/admin/export?type=orders|customers — CSV downloads (ADMIN_EMAILS only).
 * orders: one row per item, for spreadsheets and bookkeeping.
 * customers: Shopify's customer-import columns, ready for when the store moves.
 */

import { error, handleOptions, withCors } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { toCsv } from '../../_lib/csv.js';

const usd = (c) => ((c || 0) / 100).toFixed(2);
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET') return withCors(error('Method not allowed', 405), request);
  const { response } = await requireAdmin(env, request);
  if (response) return withCors(response, request);

  const type = new URL(request.url).searchParams.get('type') === 'customers' ? 'customers' : 'orders';
  try {
    let csv;
    if (type === 'orders') {
      const rows = (await env.DB.prepare(
        `SELECT o.*, i.title AS item_title, i.colour, i.size, i.sku, i.quantity, i.unit_amount
         FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.created_at, i.id`
      ).all()).results || [];
      csv = toCsv(
        ['Order', 'Date', 'Email', 'Name', 'Country', 'Item', 'Colour', 'Size', 'SKU', 'Qty', 'Unit price', 'Order subtotal',
          'Order shipping', 'Order tax', 'Order discount', 'Order total', 'Currency', 'Payment', 'Fulfillment', 'Carrier', 'Tracking', 'Shipped'],
        rows.map((r) => [r.number, r.created_at, r.email, r.name, r.country, r.item_title, r.colour, r.size, r.sku, r.quantity,
          usd(r.unit_amount), usd(r.subtotal), usd(r.shipping), usd(r.tax), usd(r.discount), usd(r.total), r.currency.toUpperCase(),
          r.payment_status, r.fulfillment_status, r.carrier, r.tracking, r.shipped_at || '']),
      );
    } else {
      const rows = (await env.DB.prepare(
        `SELECT o.email, o.name, o.phone, o.ship_to, COUNT(*) AS orders, SUM(o.total) AS spent, COALESCE(MAX(u.marketing_opt_in), 0) AS marketing
         FROM orders o LEFT JOIN users u ON u.id = o.user_id GROUP BY o.email ORDER BY MIN(o.created_at)`
      ).all()).results || [];
      csv = toCsv(
        ['First Name', 'Last Name', 'Email', 'Accepts Email Marketing', 'Default Address Company', 'Default Address Address1',
          'Default Address Address2', 'Default Address City', 'Default Address Province Code', 'Default Address Country Code',
          'Default Address Zip', 'Default Address Phone', 'Phone', 'Accepts SMS Marketing', 'Tags', 'Note', 'Tax Exempt'],
        rows.map((r) => {
          const to = parse(r.ship_to);
          const [first, ...rest] = String(r.name || to.name || '').split(' ');
          return [first, rest.join(' '), r.email, r.marketing ? 'yes' : 'no', '', to.line1, to.line2, to.city, to.state, to.country,
            to.postal_code, r.phone, r.phone, 'no', 'kiosk-stripe', `${r.orders} order${r.orders === 1 ? '' : 's'}, $${usd(r.spent)} before Shopify`, 'no'];
        }),
      );
    }
    return withCors(new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kiosk-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    }), request);
  } catch (err) {
    console.error('api/admin/export', err && err.message);
    return withCors(error('Could not build the export.', 500), request);
  }
}
