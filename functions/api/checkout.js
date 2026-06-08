// Cloudflare Pages Function: create a Stripe Checkout Session
//
// POST body: { items: [{ handle, size, quantity }] }
//
// Prices are NEVER trusted from the client. We re-load the catalog from
// /api/products (Airtable) and price every line server-side. The shopper is
// then redirected to Stripe's hosted checkout page.
//
// Required env var (set in Cloudflare Pages → Settings → Environment variables):
//   STRIPE_SECRET_KEY   (use a sk_test_... key while testing)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Countries we ship to.
const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'IE', 'ES', 'IT'];

// Flat shipping in cents; free over the threshold.
const STANDARD_SHIPPING = 800;
const FREE_SHIPPING_THRESHOLD = 10000; // $100.00

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const stripeKey = env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return json(
      {
        error: 'Payments are not configured yet',
        details: 'Set STRIPE_SECRET_KEY in Cloudflare Pages environment variables.',
      },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return json({ error: 'Your cart is empty' }, 400);
  }

  // Load the authoritative catalog.
  let catalog;
  try {
    const res = await fetch(new URL('/api/products', request.url).toString());
    const data = await res.json();
    catalog = data.products || [];
  } catch (e) {
    return json({ error: 'Could not load product catalog', details: e.message }, 502);
  }

  const byHandle = new Map(catalog.map((p) => [p.handle, p]));

  const lineItems = [];
  const orderSummary = [];
  let subtotal = 0;

  for (const item of items) {
    const product = byHandle.get(item.handle);
    if (!product) {
      return json({ error: `Product not found: ${item.handle}` }, 400);
    }

    const quantity = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));

    // Validate size against the product's real sizes.
    let size = '';
    if (product.sizes && product.sizes.length) {
      size = String(item.size || '').trim();
      if (!size || !product.sizes.includes(size)) {
        return json({ error: `Please choose a valid size for ${product.title}` }, 400);
      }
    }

    const unitAmount = Math.round(Number(product.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return json({ error: `Invalid price for ${product.title}` }, 400);
    }

    subtotal += unitAmount * quantity;

    const name = size ? `${product.title} — ${size}` : product.title;
    const productData = {
      name,
      metadata: { handle: product.handle, size },
    };
    // Stripe requires absolute image URLs.
    const img = product.images && product.images[0] && product.images[0].url;
    if (img && /^https?:\/\//i.test(img)) {
      productData.images = [img];
    }

    lineItems.push({
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: productData,
      },
    });

    orderSummary.push({ handle: product.handle, title: product.title, size, quantity, price: product.price });
  }

  const shippingAmount = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;

  const origin = new URL(request.url).origin;

  const params = {
    mode: 'payment',
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/store.html?checkout=cancelled`,
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true,
    customer_creation: 'always',
    shipping_address_collection: { allowed_countries: SHIP_COUNTRIES },
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shippingAmount === 0 ? 'Free Shipping' : 'Standard Shipping',
          fixed_amount: { amount: shippingAmount, currency: 'usd' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 7 },
          },
        },
      },
    ],
    metadata: {
      order_items: JSON.stringify(orderSummary).slice(0, 480),
      item_count: String(orderSummary.reduce((n, i) => n + i.quantity, 0)),
    },
  };

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: encodeForm(params),
    });

    const session = await res.json();
    if (!res.ok) {
      return json(
        { error: 'Stripe could not create the checkout session', details: session.error?.message },
        502
      );
    }

    return json({ url: session.url, id: session.id });
  } catch (e) {
    return json({ error: 'Checkout failed', details: e.message }, 502);
  }
}

// Flatten a nested object/array into Stripe's bracketed form-encoding, e.g.
// { line_items: [{ quantity: 1 }] } -> line_items[0][quantity]=1
function encodeForm(obj, prefix = '', out = []) {
  if (obj === null || obj === undefined) return out;

  if (Array.isArray(obj)) {
    obj.forEach((v, i) => encodeForm(v, prefix ? `${prefix}[${i}]` : String(i), out));
  } else if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      encodeForm(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(obj)}`);
  }

  return prefix === '' ? out.join('&') : out;
}
