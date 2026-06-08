// Cloudflare Pages Function: Stripe webhook receiver
//
// Stripe calls this after a successful payment. We verify the signature, then
// record the order into Airtable:
//   1. Orders table        — clean fulfilment record
//   2. Purchases + Customer — CRM tie-in (created/linked by email)
//
// Required env vars (Cloudflare Pages → Settings → Environment variables):
//   STRIPE_SECRET_KEY      sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET  whsec_...  (from the webhook endpoint in Stripe)
//   AIRTABLE_ACCESS_TOKEN
//   AIRTABLE_BASE_ID
//
// Configure the endpoint in Stripe to send the `checkout.session.completed` event to:
//   https://<your-domain>/api/stripe-webhook

const ORDERS_TABLE = 'Orders';
const PURCHASES_TABLE = 'Purchases';
const CUSTOMERS_TABLE = 'Customers';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();

  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const verified = await verifyStripeSignature(payload, signature, secret);
  if (!verified) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  // We only care about completed, paid checkouts.
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = event.data.object;
  if (session.payment_status && session.payment_status !== 'paid') {
    return new Response(JSON.stringify({ received: true, status: session.payment_status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await recordOrder(session, env);
  } catch (e) {
    // Log but still 200 — Stripe will retry on non-2xx, and we don't want to
    // double-record once the issue is a transient Airtable hiccup. The error is
    // surfaced in the Cloudflare function logs for debugging.
    console.error('Failed to record order:', e.message);
    return new Response(JSON.stringify({ received: true, recorded: false, error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true, recorded: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function recordOrder(session, env) {
  const token = env.AIRTABLE_ACCESS_TOKEN;
  const baseId = env.AIRTABLE_BASE_ID;
  if (!token || !baseId) throw new Error('Airtable env vars missing');

  const lineItems = await fetchLineItems(session.id, env.STRIPE_SECRET_KEY);

  const details = session.customer_details || {};
  const email = details.email || '';
  const name = details.name || '';
  const currency = (session.currency || 'usd').toUpperCase();
  const subtotal = (session.amount_subtotal || 0) / 100;
  const shipping = (session.total_details?.amount_shipping || 0) / 100;
  const total = (session.amount_total || 0) / 100;

  const itemsText = lineItems.length
    ? lineItems.map((li) => `${li.quantity}× ${li.description} — ${formatMoney(li.amount_total / 100, currency)}`).join('\n')
    : safeMetaItems(session.metadata);
  const itemCount = lineItems.reduce((n, li) => n + (li.quantity || 0), 0) || Number(session.metadata?.item_count || 0);

  const orderId = 'KIOSK-' + String(session.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  const shippingAddress = formatAddress(session.shipping_details || details);

  // 1. CRM: find or create the customer.
  let customerRecordId = null;
  try {
    customerRecordId = await findOrCreateCustomer(baseId, token, { email, name });
  } catch (e) {
    console.error('Customer upsert failed:', e.message);
  }

  // 2. CRM: create the purchase, linked to the customer.
  let purchaseRecordId = null;
  try {
    const purchaseFields = {
      'Purchase ID': orderId,
      'Purchase Date': new Date((session.created || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
      'Items Purchased': itemsText,
      'Total Amount': total,
      'Payment Method': 'Stripe',
    };
    if (customerRecordId) purchaseFields.Customer = [customerRecordId];
    purchaseRecordId = await createRecord(baseId, PURCHASES_TABLE, purchaseFields, token);
  } catch (e) {
    console.error('Purchase create failed:', e.message);
  }

  // 3. Store: the clean order record for fulfilment.
  const orderFields = {
    'Order ID': orderId,
    'Order Date': new Date().toISOString(),
    Email: email,
    'Customer Name': name,
    Items: itemsText,
    'Item Count': itemCount,
    Subtotal: subtotal,
    Shipping: shipping,
    Total: total,
    Currency: currency,
    'Payment Status': 'paid',
    'Fulfillment Status': 'unfulfilled',
    'Shipping Address': shippingAddress,
    'Stripe Session ID': session.id,
    'Stripe Payment Intent': session.payment_intent || '',
  };
  if (purchaseRecordId) orderFields['Linked Purchase'] = [purchaseRecordId];

  await createRecord(baseId, ORDERS_TABLE, orderFields, token);
}

async function fetchLineItems(sessionId, stripeKey) {
  if (!stripeKey) return [];
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=100`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function findOrCreateCustomer(baseId, token, { email, name }) {
  if (!email) return null;

  const formula = encodeURIComponent(`LOWER({Email Address}) = "${email.toLowerCase().replace(/"/g, '')}"`);
  const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    CUSTOMERS_TABLE
  )}?maxRecords=1&filterByFormula=${formula}`;

  const res = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const data = await res.json();
    if (data.records && data.records.length) {
      const id = data.records[0].id;
      // Touch the recent purchase date.
      await patchRecord(baseId, CUSTOMERS_TABLE, id, {
        'Recent Purchase Date': new Date().toISOString().slice(0, 10),
      }, token).catch(() => {});
      return id;
    }
  }

  return createRecord(
    baseId,
    CUSTOMERS_TABLE,
    {
      'Customer Name': name || email.split('@')[0],
      'Email Address': email,
      'Account Created': new Date().toISOString().slice(0, 10),
      'Recent Purchase Date': new Date().toISOString().slice(0, 10),
    },
    token
  );
}

async function createRecord(baseId, table, fields, token) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Airtable create ${table} ${res.status}: ${detail}`);
  }
  const data = await res.json();
  return data.id;
}

async function patchRecord(baseId, table, recordId, fields, token) {
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, typecast: true }),
    }
  );
  if (!res.ok) throw new Error(`Airtable patch ${table} ${res.status}`);
  return res.json();
}

function safeMetaItems(metadata) {
  if (!metadata || !metadata.order_items) return '';
  try {
    const items = JSON.parse(metadata.order_items);
    return items.map((i) => `${i.quantity}× ${i.title}${i.size ? ` (${i.size})` : ''}`).join('\n');
  } catch {
    return metadata.order_items;
  }
}

function formatAddress(d) {
  if (!d) return '';
  const a = d.address || {};
  const parts = [
    d.name,
    a.line1,
    a.line2,
    [a.city, a.state, a.postal_code].filter(Boolean).join(', '),
    a.country,
    d.phone,
  ].filter(Boolean);
  return parts.join('\n');
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// --- Stripe signature verification using Web Crypto (Workers runtime) ---
async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  // Reject events older than 5 minutes to limit replay.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return timingSafeEqual(computed, expected);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
