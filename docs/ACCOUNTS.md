# KIOSK accounts setup

Accounts use **Shopify Customer Accounts** for sign-in and order history, and a **Cloudflare D1** database for sessions, wishlist and cart pointers. Supabase is not used (see the hold note in [AGENT_PLAN.md](AGENT_PLAN.md)).

The UI stays hidden until `SHOPIFY_CUSTOMER_CLIENT_ID` and the D1 binding are live. Merging the PR without secrets is safe.

## Architecture

| Concern | Service |
|---|---|
| Sign-in (email code) | Shopify Customer Account API (hosted OAuth) |
| Orders | Shopify Customer Account GraphQL |
| Checkout | Shopify Storefront cart + checkout URL |
| Session cookie, wishlist, cart id | Cloudflare D1 (`kiosk-accounts`) + Worker `/api/*` |

## Owner checklist

### 1. Shopify Customer Account API client

1. In Shopify admin, enable **new customer accounts**.
2. Add a **Headless** channel (or a Customer Account API client for the storefront).
3. Record the **Client ID** and **Client secret**.
4. Under application setup, set:
   - **Callback URL(s):** `https://onlyatthekiosk.com/api/auth/callback` (plus your Pages preview URL, e.g. `https://<preview>.onlyatthekiosk-website.pages.dev/api/auth/callback`)
   - **Javascript origins:** `https://onlyatthekiosk.com` and the preview origin
   - **Logout URL:** `https://onlyatthekiosk.com/`
5. Shopify does not allow `http://localhost` callbacks. Use a tunnel (e.g. Cloudflare Tunnel / ngrok) for local OAuth tests.

Docs: [Getting started with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started)

### 2. Cloudflare D1

```bash
npx wrangler d1 create kiosk-accounts
```

Copy the returned `database_id` into [wrangler.jsonc](../wrangler.jsonc) (replace the placeholder UUID), then:

```bash
npx wrangler d1 migrations apply kiosk-accounts --local
npx wrangler d1 migrations apply kiosk-accounts
```

### 3. Worker secrets

```bash
npx wrangler secret put SHOPIFY_CUSTOMER_CLIENT_ID
npx wrangler secret put SHOPIFY_CUSTOMER_CLIENT_SECRET
# already used by checkout:
# npx wrangler secret put SHOPIFY_STOREFRONT_TOKEN
```

Optional vars (non-secret is fine in the dashboard):

- `SHOPIFY_STORE` — default `onlyatthekiosk.com`
- `SHOPIFY_STOREFRONT_API_VERSION` — default `2026-07` (buyer identity)
- `SHOPIFY_CUSTOMER_SHOP_ID` — if discovery needs it
- `SITE_ORIGIN` — e.g. `https://onlyatthekiosk.com` (for correct OAuth redirect URI behind previews)

### 4. Deploy

```bash
npm run build:worker
npx wrangler deploy
```

After deploy, open the site: the account and cart buttons appear in the header once `/api/me` returns `{ enabled: true }`.

## API surface

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/auth/login?return_to=` | — | Start OAuth (PKCE) |
| `GET /api/auth/callback` | — | Finish OAuth, set `kiosk_session` cookie |
| `GET /api/auth/logout` | session | Clear session + Shopify logout |
| `GET /api/me` | cookie | Profile, wishlist, cart, orders (`enabled: false` when not configured) |
| `GET/POST/DELETE /api/wishlist` | session | Saved stories/products |
| `GET/POST /api/cart` | optional session | Create/add/update/remove/attach cart |

## Local tests

```bash
node scripts/test-accounts-unit.mjs
node scripts/test-accounts-ui.mjs
npm run build:worker
```

## Security notes

- Session id is random; only a SHA-256 hash is stored in D1.
- Shopify access/refresh tokens never reach the browser.
- `return_to` must be a same-site path (open-redirect safe).
- Auth routes are rate-limited per IP (best-effort per isolate).
- CORS on account APIs is same-origin + credentials.
