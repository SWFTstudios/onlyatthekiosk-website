# KIOSK accounts

Members sign in with **a six-digit code sent to their email**. There are no passwords and no third-party sign-in. The first sign-in for an email creates the account and gives it the next **member number** (#0001, #0002…), plus a welcome email.

| Concern | Service |
|---|---|
| Sign-in codes and welcome emails | Cloudflare Email Service (`send_email` binding `EMAIL`) |
| Members, sessions, codes, saves, check-in, cart pointer | Cloudflare D1 `kiosk-accounts` (binding `DB`) |
| Bag and checkout | Shopify Storefront cart (the member's email is passed to checkout) |

Accounts switch on when both bindings exist (`accountsReady` in `functions/_lib/session.js`). Until then the account sheet says "Member sign-in opens soon" and offers the Dispatch sign-up, while check-in and saves stay on the device.

## Owner checklist

### 1. Email Service (once)

1. The account must be on **Workers Paid**: Email Service only sends to arbitrary recipients on that plan.
2. Cloudflare dashboard → **Compute → Email Service → Email Sending → Onboard Domain** → pick `onlyatthekiosk.com`. Cloudflare adds the SPF, DKIM, DMARC and bounce records itself; they usually take 5 to 15 minutes.
3. The sender is `members@onlyatthekiosk.com`. To use another address on the domain, add a **variable** `MAIL_FROM` on the Worker (Settings → Variables and Secrets).
4. Optional: add a **secret** `AUTH_SECRET` (any long random string). Sign-in codes are then hashed with it. Codes issued before you add it stop working, so add it before launch.

### 2. Database

Already done: `kiosk-accounts` (`539499f7-d26e-4e19-b5e8-6c514397672b`) is bound in `wrangler.jsonc`. `0001` to `0004` are applied to it (`0002_profiles.sql` on 2026-10-17; `0003_partners.sql`, the Partner Hub, and `0004_presence.sql`, the live count and globe pins, on 2026-10-20). When a new migration is added:

```bash
npx wrangler d1 migrations apply kiosk-accounts --remote
```

### 3. Deploy

Merging to `main` deploys through Workers Builds (`npm run build:worker`, then `wrangler deploy`). After that, `/api/me` returns `{ "enabled": true }` and the account sheet shows the sign-in form.

## How sign-in works

1. `POST /api/auth/code { email }` stores a hashed code in `login_codes` (one per email, 10 minutes) and emails it. It always answers the same way, so it never reveals who has an account. It is limited to 3 codes per email and 8 per IP every 10 minutes.
2. `POST /api/auth/verify { email, code, firstName? }` allows 5 tries per code. On success it deletes the code, finds or creates the member, and sets the `kiosk_session` cookie (HttpOnly, Secure, SameSite=Lax, 30 days). It also sends the welcome email once.
3. The site (`js/kiosk-account.js`) then carries over any guest bag and uploads the device's check-in. A new member gets Check-in opened for them, with the name they typed already filled in.

On iPhone the code field uses `autocomplete="one-time-code"`, so iOS offers the code from Mail, and six digits sign in straight away.

## API surface

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/code` | — | Email a sign-in code |
| `POST /api/auth/verify` | — | Check the code, sign in (creates the account the first time) |
| `GET/POST /api/auth/logout` | session | Sign out (GET redirects home, POST answers JSON) |
| `GET /api/me` | cookie | Member, saves, check-in, cart (`enabled: false` when not configured) |
| `GET/POST/DELETE /api/wishlist` | session | Saves (`locker_items`: product, story, video, radio, content) |
| `GET/PUT/DELETE /api/profile` | session | Check-in answers (`taste`), cleaned by `functions/_lib/taste.js` |
| `GET/POST /api/cart` | optional session | Create/add/update/remove/attach cart |
| `GET /api/where` | — | Approximate city (home intro, check-in suggestion) |

## Check-in (onboarding)

**Check-in** (`js/kiosk-onboard.js`, loaded on demand) asks, all skippable: a name, interests, formats and pace, home city and travel, style and sizes, and what to hear about. It ends on a boarding pass. Answers save on the device (`localStorage['kiosk:taste']`). For members they also save to D1 (`profiles`), and the account copy wins on other devices. Option ids live in `TASTE` in both `js/kiosk-onboard.js` and `functions/_lib/taste.js`; change them together.

## Local tests

```bash
node scripts/test-accounts-unit.mjs   # codes, hashing, email checks, rate limit
node scripts/test-accounts-ui.mjs     # sheet, drawer, dashboard (mocked API)
npm run build:worker
npx wrangler d1 migrations apply kiosk-accounts --local
npx wrangler dev                      # local D1; emails are logged, not sent
```

With `wrangler dev` the email binding is simulated: each email's subject (which includes the code) is printed in the terminal, so you can sign in locally.

## Security notes

- Session ids and sign-in codes are random; only hashes are stored.
- Codes last 10 minutes, allow 5 tries, and are deleted once used.
- Code requests answer the same whether or not an account exists.
- Sign-in routes are rate-limited per IP and per email (best effort, per isolate).
- Account APIs only accept same-origin requests with credentials.
