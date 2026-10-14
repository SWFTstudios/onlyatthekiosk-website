/**
 * /go/<store>[?p=<product>] — the "Visit store" link on a partner's KIOSK page.
 *
 * Counts the visit, then sends the visitor to the store's own site tagged as
 * coming from the kiosk:
 *   utm_source=onlyatthekiosk  utm_medium=referral  utm_campaign=kiosk-store-page|kiosk-product
 *   utm_content=<product id>   ref=onlyatthekiosk   kiosk_click=<unique id>
 * Shopify (and most analytics) report UTM-tagged sessions and orders as
 * referrals from the kiosk; kiosk_click lets a partner match a sale to the
 * exact click in our log.
 *
 * Only stores listed in js/kiosk-content.js can be targets, so this can't be
 * used as an open redirect. Every click is written to the Worker logs
 * (observability is on in wrangler.jsonc). Optional extra sinks:
 *   - KV namespace bound as KIOSK_CLICKS
 *   - Airtable table named in AIRTABLE_VISITS_TABLE (uses AIRTABLE_ACCESS_TOKEN
 *     and AIRTABLE_BASE_ID; fields: Click, Store, Product, At, Country, Page)
 * No IP addresses or user agents are stored.
 */
import '../_lib/kiosk-data.js';
import '../../js/kiosk-content.js';

const data = () => globalThis.window.KIOSK_CONTENT || { stores: [], products: [] };

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const here = new URL(request.url);
  const id = String(params.store || '').toLowerCase();
  const { stores = [], products = [] } = data();
  const store = stores.find((s) => s.id === id);
  if (!store) return Response.redirect(new URL('/store.html', here).toString(), 302);
  if (!store.url) return Response.redirect(new URL(`/store.html?s=${encodeURIComponent(store.id)}`, here).toString(), 302);

  let dest;
  try { dest = new URL(store.url); } catch (e) { dest = null; }
  if (!dest || !/^https?:$/.test(dest.protocol)) return Response.redirect(new URL(`/store.html?s=${encodeURIComponent(store.id)}`, here).toString(), 302);

  // A product link may deep-link into the store, but only on the store's own host
  const pid = here.searchParams.get('p');
  const product = pid ? products.find((p) => p.id === pid && (p.store || 'kiosk') === store.id) : null;
  if (product && product.storeUrl) {
    try { const u = new URL(product.storeUrl, dest); if (u.host === dest.host) dest = u; } catch (e) { /* keep the store home */ }
  }

  const click = crypto.randomUUID();
  dest.searchParams.set('utm_source', 'onlyatthekiosk');
  dest.searchParams.set('utm_medium', 'referral');
  dest.searchParams.set('utm_campaign', product ? 'kiosk-product' : 'kiosk-store-page');
  if (product) dest.searchParams.set('utm_content', product.id);
  dest.searchParams.set('ref', 'onlyatthekiosk');
  dest.searchParams.set('kiosk_click', click);

  let page = '';
  try { const r = new URL(request.headers.get('referer') || ''); if (r.host === here.host) page = r.pathname + r.search; } catch (e) { /* no referer */ }
  const record = { click, store: store.id, product: product ? product.id : '', at: new Date().toISOString(), country: (request.cf && request.cf.country) || '', page };
  console.log(JSON.stringify({ event: 'partner_visit', ...record }));

  const later = [];
  if (env.KIOSK_CLICKS && typeof env.KIOSK_CLICKS.put === 'function') {
    later.push(env.KIOSK_CLICKS.put(`visit:${record.at}:${click}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 400 }));
  }
  if (env.AIRTABLE_ACCESS_TOKEN && env.AIRTABLE_BASE_ID && env.AIRTABLE_VISITS_TABLE) {
    later.push(fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_VISITS_TABLE)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ typecast: true, records: [{ fields: { Click: click, Store: store.id, Product: record.product, At: record.at, Country: record.country, Page: page } }] }),
    }));
  }
  if (later.length) {
    const all = Promise.allSettled(later);
    if (typeof context.waitUntil === 'function') context.waitUntil(all); else await all;
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: dest.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'origin',
      // First-party note of the last partner visit (30 days), for our own reporting
      'Set-Cookie': `kiosk_ref=${store.id}.${click}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`,
    },
  });
}
