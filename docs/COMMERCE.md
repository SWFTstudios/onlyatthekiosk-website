# Selling on the KIOSK before Shopify: Stripe checkout, orders and the back office

Until the Shopify store is live, the shop sells through **Stripe Checkout**. Orders and stock live in the site's own D1 database, emails go out through Cloudflare Email Service, a copy of each order lands in Airtable, and you run everything from **`/admin.html`**.

```
Bag (D1) ──▶ /api/checkout ──▶ Stripe Checkout ──▶ /api/stripe/webhook
                                                    ├─▶ D1 orders + order_items (the record of truth)
                                                    ├─▶ stock taken (inventory)
                                                    ├─▶ email to the buyer + to MAIL_TEAM
                                                    └─▶ Airtable Orders / Customers (a copy to browse)
/admin.html ──▶ mark packed / shipped (+ tracking email), stock, buyers, demand, CSV exports
```

## Switch it on

1. **Apply the migration** (adds `kiosk_carts`, `checkouts`, `orders`, `order_items`, `inventory`):
   ```bash
   npx wrangler d1 migrations apply kiosk-accounts --remote
   ```
2. **Stripe** (start in test mode):
   - Copy the secret key (`sk_test_…`) into the Worker as **`STRIPE_SECRET_KEY`** (Cloudflare dashboard › Workers › onlyatthekiosk-website › Settings › Variables and Secrets).
   - Developers › Webhooks › Add endpoint: `https://onlyatthekiosk.com/api/stripe/webhook` with the events
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
     Put its signing secret (`whsec_…`) in **`STRIPE_WEBHOOK_SECRET`**.
   - Settings › Branding: logo and colours (they show on Stripe's checkout page).
   - Optional: Settings › Payment methods (Apple Pay / Google Pay are on by default), Adaptive Pricing (shows local currency abroad).
3. **Back office**: set **`ADMIN_EMAILS`** to the email(s) that may open `/admin.html` (comma-separated). Sign in there with the emailed six-digit code.
4. Deploy. The shop's **Add to bag** and **Buy now** now use Stripe for every piece marked `status: 'available'` in `js/kiosk-content.js` (today: Essential Tee and Hoodie in Black/White, Curb Chain, Curb Bracelet).
5. Test with card `4242 4242 4242 4242`, any future date and CVC. Then swap in the live keys (`sk_live_…` and a live-mode webhook secret).

Locally: put the same values in `.dev.vars`, run `npx wrangler d1 migrations apply kiosk-accounts --local`, `npx wrangler dev`, and forward webhooks with `stripe listen --forward-to localhost:8787/api/stripe/webhook`.

## Settings

| Variable | What it does | Default |
|---|---|---|
| `STRIPE_SECRET_KEY` | Turns on the Stripe checkout | — |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe's webhook calls | — |
| `ADMIN_EMAILS` | Who can open `/admin.html` | nobody |
| `SHIP_COUNTRIES` | Comma list of ISO codes checkout ships to | US, PR, CA, MX, EU-27, CH, NO, IS, AU, NZ, JP, KR, SG, HK, TW, AE, IL |
| `STRIPE_TAX` | `on` turns on Stripe Tax (register in Stripe › Tax first) | off |
| `COMMERCE_PROVIDER` | `stripe` or `shopify` to force one | Shopify if `SHOPIFY_STOREFRONT_TOKEN` is set, else Stripe |
| `MAIL_TEAM` | Where new-order alerts go | hello@onlyatthekiosk.com |
| `AIRTABLE_ORDERS_TABLE`, `AIRTABLE_CUSTOMERS_TABLE`, `AIRTABLE_CATALOG_TABLE` | Airtable table names | Orders, Customers, Catalog |

## Shipping

Everything ships by USPS with tracking. Rates live in `SHIPPING` in `functions/_lib/commerce.js`; the heaviest piece sets the base and each extra piece adds a little:

| Zone | Service | Tees & small goods | With a hoodie / crew | Each extra piece |
|---|---|---|---|---|
| US, PR | Ground Advantage, 2–5 days | $6 | $9 | +$2 |
| Australia, NZ | First-Class Package International | $18 | $30 | +$5 |
| Everywhere else | First-Class Package International, 7–21 days | $15 | $25 | +$5 |

Shoppers pick their country in the bag (it defaults to where Cloudflare says they are) and Stripe only accepts an address in that country. A product counts as heavy when its `mockup.type` is hoodie, crew or deck; set `ship: 'heavy'` or `ship: 'light'` on a product to override.

Postage you pay (Pirate Ship, commercial rates): roughly $5–6 for a US tee, $8–11 for a hoodie; $19–25 for an international tee, $24–44 for a hoodie. A 450 gsm hoodie packs over 2 lb, which is the expensive bracket abroad.

**Taxes and duties**
- US sales tax: Stripe Tax (`STRIPE_TAX=on`) works out and collects it once you register in the states where you owe. Several states exempt most clothing.
- International parcels ship duties-unpaid: the buyer may pay VAT/duty/fees on delivery (the bag, emails and the shipping page say so).
- **UK is off by default.** HMRC requires overseas sellers to register for UK VAT and charge it at checkout on parcels up to £135. Register, then add `GB` to `SHIP_COUNTRIES` (and turn on Stripe Tax for UK VAT).
- **EU:** since 1 July 2026 there's a €3 duty per item type on parcels under €150. Without IOSS the buyer pays VAT and fees on delivery; with an IOSS intermediary you can collect VAT at checkout instead.

## Stock

No stock row = **made to order**: it never sells out. For limited drops, enter a count per SKU in **Back office › Stock**. Opening a checkout holds the units for 30 minutes; payment takes them off the shelf, expiry gives them back. SKUs are the colourway's Shopify handle plus the size (`001-black-tshirt-m`).

## Running orders (`/admin.html`)

- **Overview:** sales today / 7 / 30 days / all time, what's waiting to ship, best sellers, low stock, CSV exports.
- **Orders:** "To ship" lists unfulfilled and packed orders oldest first: what to pack (SKU, colour, size), the address (copy button), phone and email. Enter the USPS tracking number and **Mark shipped**: the buyer gets an email with the tracking link. Refunds happen in Stripe (button on each order); the webhook marks the order refunded.
- **Stock**, **Customers** (with a Shopify-ready CSV), **Demand** ("Notify me" signups by piece, size and colour).

Buyers get an order email, a shipped email, an order page (`/order.html?session_id=…`) and, if they're members, the order in their account.

## Airtable (Kiosk Insights)

Each paid order is copied to **Orders** (linked to **Customers** and **Catalog**); shipping and refunds update the row. About four API calls per order (the free plan allows 1,000 a month). D1 stays the record of truth, so Airtable being down never blocks an order. The Orders and Customers **Notes** fields are yours: the site never writes them.

The **Catalog** table holds products with lifestyle photography. Refresh it after changing products or photos (deploy first, Airtable fetches images from the live site):

```bash
npm run sync:airtable-catalog            # needs AIRTABLE_ACCESS_TOKEN + AIRTABLE_BASE_ID
npm run sync:airtable-catalog -- --dry-run
```

## Moving to Shopify later

1. Import `kiosk-shopify-products.csv` and put each product's handle in `shopifyHandle`.
2. Set `SHOPIFY_STOREFRONT_TOKEN` (and `COMMERCE_PROVIDER=shopify`, or just remove the Stripe key). The existing Storefront cart takes over; bags and the drawer work the same.
3. Import customers from **Back office › Customers › CSV for Shopify**; keep the orders CSV for your books.
4. Leave the Stripe webhook running so refunds on old orders still update.

## Files

- `functions/_lib/commerce.js` — catalog pricing, variants, shipping rates and countries
- `functions/_lib/kiosk-cart.js`, `functions/api/cart.js` — bags (Stripe mode) and the Shopify cart
- `functions/api/checkout.js` — opens the Stripe Checkout Session
- `functions/api/stripe/webhook.js`, `functions/_lib/order-flow.js`, `functions/_lib/orders.js`, `functions/_lib/inventory.js` — orders and stock
- `functions/api/order.js`, `order.html`, `js/kiosk-order.js` — the buyer's order page
- `functions/api/admin/*`, `admin.html`, `js/kiosk-admin.js`, `css/kiosk-admin.css` — the back office
- `functions/_lib/airtable-orders.js`, `scripts/sync-airtable-catalog.js` — Airtable
- `scripts/test-commerce-unit.mjs` — `npm run test:commerce`
