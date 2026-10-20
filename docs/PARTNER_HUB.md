# Partner Hub

`partner.html` is where **stores, brands and sponsors** keep their page on the kiosk. It runs on the member accounts (`docs/ACCOUNTS.md`): a partner signs in with their email and a six-digit code, then sets up a partner profile on the same account.

| Tab | What the partner does |
|---|---|
| Overview | Sees their status (In review / Live / Paused), counts, and what stores, brands and sponsors get |
| Profile | Name, kind (store, brand, sponsor), handle, tagline, bio, city, country, website, Instagram, logo and cover image links, with a live preview card |
| Pieces | Adds, edits, re-orders and removes the pieces they sell (name, price, currency, buy link, image link, description); each is a draft until switched to *Show it on the kiosk* |
| Settings | Contact email, directory listing on/off, email notices, how they're paid (Shopify Collective, link out, marketplace app or sponsorship; see `docs/MARKETPLACE.md`), and removing the profile |
| Media kit | KIOSK brand files to download (`images/brand/`) |
| On the kiosk | The directory: stores from `js/kiosk-content.js` plus every live, listed partner |

A live partner's public page is `partner.html?p=<handle>`: cover, name, bio, links and their live pieces.

## Going live (the KIOSK desk)

New profiles start **pending** and stay private. Review them and switch them on in D1:

```bash
# Who's waiting
npx wrangler d1 execute kiosk-accounts --remote --command "SELECT handle, kind, name, json_extract(settings, '$.contactEmail') AS email, created_at FROM partners WHERE status = 'pending'"
# Approve one (or 'paused' to take a page down)
npx wrangler d1 execute kiosk-accounts --remote --command "UPDATE partners SET status = 'live' WHERE handle = 'casa-lisboa'"
```

Only `live` partners with *List me in the directory* on appear in `/api/partners`, and only their `live` pieces. Emails and settings never leave the server.

## Setup

1. Apply the migration once: `npx wrangler d1 migrations apply kiosk-accounts --remote` (adds `partners` and `partner_products`, `migrations/0003_partners.sql`).
2. Deploy. With accounts switched off (no `DB` or `EMAIL` binding) the hub shows an *Apply to partner* button instead. It adds the email to the Dispatch list through `/api/subscribe` (the same list as the newsletter; the `partner` interest is only remembered on the visitor's device), so follow up from there.

## API

| Route | Who | Does |
|---|---|---|
| `GET /api/partner` | signed in | `{ partner, products }` (partner is `null` until created) |
| `PUT /api/partner` `{ partner }` | signed in | creates or updates the profile; `409` if the handle is taken |
| `DELETE /api/partner` | signed in | removes the profile and its pieces (the account stays) |
| `POST /api/partner/products` `{ product }` | partner | adds a piece (60 at most) |
| `PUT /api/partner/products` `{ id, product }` or `{ order: [ids] }` | partner | edits a piece, or re-orders them |
| `DELETE /api/partner/products?id=` | partner | removes a piece |
| `GET /api/partners[?handle=]` | anyone | live, listed partners and their live pieces |

Every field is cleaned in `functions/_lib/partner.js`: links must be `https`, names and text lose tags and control characters, unknown fields are dropped. Images are links the partner hosts; there are no uploads yet.

Tests: `npm run test:partner` runs the real migrations and handlers on an in-memory SQLite database (Node 22.13+).
