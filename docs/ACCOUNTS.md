# KIOSK accounts setup

Accounts use **Shopify Customer Accounts** for sign-in and order history, and a **Cloudflare D1** database for sessions, wishlist and cart pointers. Supabase is not used (see the hold note in [AGENT_PLAN.md](AGENT_PLAN.md)).

The UI stays hidden until `SHOPIFY_CUSTOMER_CLIENT_ID` and the D1 binding are live. Merging the PR without secrets is safe.

## Architecture

| Concern | Service |
|---|---|
| Sign-in (email code) | Shopify Customer Account API (hosted OAuth) |
| Orders | Shopify Customer Account GraphQL |
| Checkout | Shopify Storefront cart + checkout URL |
| Session cookie, wishlist, cart id, check-in answers | Cloudflare D1 (`kiosk-accounts`) + Worker `/api/*` |

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

After deploy, open the site: sign-in and the cart light up once `/api/me` returns `{ enabled: true }`. The account button itself always shows, because check-in works on the device before accounts are switched on.

The migrations include `0002_profiles.sql` (check-in answers). Run the apply command above again after pulling it; until then `/api/me` simply reports `profile: null`.

## API surface

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/auth/login?return_to=` | — | Start OAuth (PKCE) |
| `GET /api/auth/callback` | — | Finish OAuth, set `kiosk_session` cookie |
| `GET /api/auth/logout` | session | Clear session + Shopify logout |
| `GET /api/me` | cookie | Profile, wishlist, cart, orders (`enabled: false` when not configured) |
| `GET/POST/DELETE /api/wishlist` | session | Saved stories/products |
| `GET/PUT/DELETE /api/profile` | session | Check-in answers (`taste`), cleaned by `functions/_lib/taste.js` |
| `GET /api/where` | — | Approximate city of the request (home intro, check-in suggestion) |
| `GET/POST /api/cart` | optional session | Create/add/update/remove/attach cart |

## Check-in (onboarding)

Creating an account stays with Shopify: *Sign in / create account* sends people to Shopify's email code, no passwords. Around that, **Check-in** (`js/kiosk-onboard.js`, loaded on demand) asks, all skippable:

1. What to call you
2. Interests: cars, motorcycles, sports, travel, fashion, skate, music, culture, food, photo & film
3. Formats (films, vlogs, interviews, photo diaries, long reads, audio notes, playlists) and pace
4. Home city (suggested from `/api/where`), how you travel, up to six dream destinations
5. Style, top and waist sizes, fit, colours you wear
6. What to hear about (drops, stories, rare finds, radio, meets)

It ends on a boarding pass. Answers save as you go on the device (`localStorage['kiosk:taste']`). For members they also save to D1 (`profiles`) through `/api/profile`, and the account copy wins on other devices. Someone who checks in before signing up has their answers carried over on first sign-in; a member signing in for the first time without answers gets Check-in opened for them once.

Where the answers show up: a *Picked for you* row leading the Atlas (`pickedFor` in `js/kiosk-glass.js`), the home intro flying to your home city, your top size pre-picked on product pages, and *Your check-in* on the account page. Open it from the menu (*Check in*), the account sheet or page, or any element with `data-onboard-open` (add `data-onboard-step="fit"` to jump to a step). Option ids live in `TASTE` in both `js/kiosk-onboard.js` and `functions/_lib/taste.js`; change them together.

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
