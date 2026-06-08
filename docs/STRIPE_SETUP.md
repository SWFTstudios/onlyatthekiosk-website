# Stripe Checkout + Airtable Orders — Setup

This store now takes real payments through **Stripe Checkout** and records every
order in **Airtable**. The catalog still lives in Airtable too, so you manage
everything (products and orders) from one place.

```
Shopper → collection page → add to cart (size + qty)
        → cart drawer → Checkout
        → /api/checkout  ── creates a Stripe Checkout Session (prices re-checked against Airtable)
        → Stripe hosted checkout (card entry, shipping, tax)
        → success.html
Stripe  → /api/stripe-webhook ── writes the order to Airtable (Orders + Purchases + Customers)
```

Nothing here trusts prices from the browser — `/api/checkout` re-loads each
product from Airtable and prices the order server-side.

---

## 1. Environment variables (Cloudflare Pages)

Cloudflare Pages → your project → **Settings → Environment variables**. Add these
to **Production** (and Preview if you use it):

| Variable | Value | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Start with your **test** secret key. Swap to `sk_live_…` to go live. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | From the webhook endpoint you create in step 3. |
| `AIRTABLE_ACCESS_TOKEN` | `pat…` | Already used by the site. Token must have `data.records:read` **and** `data.records:write` on the Kiosk Insights base. |
| `AIRTABLE_BASE_ID` | `appA3qQw0NAqz8ru3` | Kiosk Insights base. |
| `AIRTABLE_PRODUCTS_TABLE` | `Products` | Optional (defaults to `Products`). |

> The Airtable token previously only needed read access. The webhook **writes**
> orders, so make sure the token has write scope on this base, or order
> recording will fail (payments still succeed — they just won't log).

After adding/changing variables, **redeploy** so functions pick them up.

## 2. Get your Stripe keys

1. Sign in at <https://dashboard.stripe.com> (account: *EK Web Development*).
2. Toggle **Test mode** on (top-right) while testing.
3. **Developers → API keys** → copy the **Secret key** (`sk_test_…`) into
   `STRIPE_SECRET_KEY`.

## 3. Create the webhook endpoint

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/stripe-webhook`
3. Events to send: **`checkout.session.completed`**.
4. Save, then copy the endpoint's **Signing secret** (`whsec_…`) into
   `STRIPE_WEBHOOK_SECRET`. Redeploy.

Create a **separate** endpoint for test mode and live mode (each has its own
signing secret).

## 4. Test the full flow

1. Open a collection page (e.g. `/collections/t-shirts.html`), open a product,
   pick a size, **Add to Cart**.
2. Open the cart (🛒 top-right) → **Checkout**.
3. On Stripe, pay with test card **`4242 4242 4242 4242`**, any future expiry,
   any CVC, any postcode.
4. You land on `/success.html`. Within a few seconds a new row appears in the
   Airtable **Orders** table, plus a linked **Purchases** record and a
   **Customers** record.

Useful test cards: `4000 0000 0000 9995` (declined), `4000 0025 0000 3155` (3-D
Secure). Full list: <https://stripe.com/docs/testing>.

## 5. Going live

1. Switch the Stripe Dashboard to **live mode**, grab the live `sk_live_…` key.
2. Create a live-mode webhook (step 3) and grab its live `whsec_…`.
3. Update both env vars in Cloudflare, redeploy. Done.

---

## How orders are stored

**Orders** table (`tblGYNPPfUFZlBX7B`, created for the store) — one row per paid
checkout, built for fulfilment:

`Order ID · Order Date · Email · Customer Name · Items · Item Count · Subtotal ·
Shipping · Total · Currency · Payment Status · Fulfillment Status ·
Shipping Address · Stripe Session ID · Stripe Payment Intent · Linked Purchase`

Update **Fulfillment Status** (`unfulfilled → packed → shipped → delivered`) as
you ship.

**CRM tie-in** — the webhook also creates a **Purchases** record (linked to the
Order) and finds-or-creates a **Customers** record by email, so sales roll into
your existing Customers / Segments / Campaigns dashboards.

## Managing the catalog

Edit the **Products** table in Airtable. The storefront reads it live through
`/api/products`, which collapses the Shopify-export rows into one product per
`Handle`:

- **Title**, **Handle**, **Type** (collection: T-shirts / Hoodies / Chains /
  Bracelets), **Body (HTML)** (description), **Variant Price**.
- **Option1 Value** rows become the selectable **sizes**.
- **Image Src** rows (ordered by **Image Position**) become the product images.
- A product shows only if a row has **Published** checked or **Status** = `active`.

Prices update on the site within ~5 minutes (catalog cache) and are always
re-validated at checkout.

## Files

| File | Role |
| --- | --- |
| `functions/api/products.js` | Reads Airtable, returns the clean catalog. |
| `functions/api/checkout.js` | Creates the Stripe Checkout Session (server-priced). |
| `functions/api/stripe-webhook.js` | Verifies Stripe signature, writes orders to Airtable. |
| `js/airtable.js` | Front-end catalog client (`/api/products`). |
| `js/cart.js` | Local cart (localStorage). |
| `js/checkout.js` | Posts the cart to `/api/checkout`. |
| `js/cart-ui.js` | Cart button + slide-out drawer (injected site-wide). |
| `success.html` | Order confirmation page. |

The old Shopify functions (`functions/api/shopify*.js`) are no longer used and
can be deleted once you're happy with Stripe.
