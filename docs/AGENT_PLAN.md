# KIOSK backend: plan for Cursor agents

> **Status (Oct 2026): Supabase is on hold** until the outstanding Supabase bill is paid.
> Do not create projects, connect the Supabase MCP or run workstreams A, B, or the Supabase
> parts of C, D and E. Supabase-free work (Shopify query validation, the orders webhook
> logging to Cloudflare only, R2 media, Turnstile, a read-only Twilio audit) may proceed
> once the owner approves it.

**Purpose.** This is the playbook for Cursor agents that add accounts, sign-in and the backend to the KIOSK site. It covers the services, the MCP connectors each agent may use, the order to build in, and what "done" means.

**How to use it:**

1. Set up the connectors in §2 and the accounts and secrets in §3. This takes about 30 minutes, and only you can do it.
2. Run the workstreams in §5 in order. Give each one its own Cursor agent, its own branch and its own PR. Paste the prompt in each workstream's **Prompt** block.
3. Agents must follow §4 (guardrails). Cursor loads those rules automatically from `.cursor/rules/backend.mdc`.

---

## 1. Target architecture

```
Browser (static pages on Cloudflare)
  │  supabase-js: sign in with Google / email code / phone code
  │  ── session (JWT) ──────────────────────────────────────────┐
  ▼                                                             │
Cloudflare Worker  (wrangler.jsonc: static assets + functions/)  │
  /api/me, /api/saved, /api/reservations ... verifies the JWT ◄─┘
  /api/shopify, /api/shopify-cart   (already exists: checkout)
  /go/<store>                       (already exists: partner visits)
  /api/webhooks/shopify             (new: orders → Supabase)
  │            │                 │
  ▼            ▼                 ▼
Supabase      Cloudflare R2     Shopify
 Auth          media bucket      catalog of record for KIOSK's label,
 Postgres+RLS  (photos, video,   checkout, orders
 (profiles,     downloads)
  saved, orders,
  reservations,                  Twilio Verify
  partners, visits)  ◄────────── (phone codes, called by Supabase Auth)
```

**Who owns what:**

| Concern | Service | Notes |
|---|---|---|
| Identity: Google, email code, phone code | **Supabase Auth** | Free plan: 50,000 MAU. Pro: 100,000 MAU included. Phone codes go through Twilio Verify, configured in Supabase. |
| Per-user data | **Supabase Postgres**, with Row Level Security on every table | Profiles, saved stories, Hunt reservations, order history, partner accounts, partner visit reports. |
| Public content: stories, catalog copy, stores | Stays in `js/kiosk-content.js` for now | A later workstream can move it to a CMS. Not needed for accounts. |
| Hosting, API, edge logic | **Cloudflare Workers** | Already deployed as `onlyatthekiosk`. |
| Media | **Cloudflare R2** | Moves images and video out of git. No egress fees. |
| Bot protection | **Cloudflare Turnstile** | Free. Supabase Auth accepts Turnstile as its CAPTCHA, so set it on every sign-in form. |
| Checkout | **Shopify** | Already wired through `/api/shopify` and `/api/shopify-cart`. |
| SMS | **Twilio Verify** | The only per-use cost. See §6. |

**Why Supabase for auth.** It's free up to 50,000 monthly users and has Google, email OTP and phone OTP built in. Phone OTP uses Twilio Verify natively. Its row-level security means the browser can safely read a user's own rows.

**Caveat:** free Supabase projects pause after a week of inactivity. Run production on **Pro ($25/month)** and the dev project on Free.

---

## 2. MCP connectors

Use a project-level `.cursor/mcp.json`, copied from `.cursor/mcp.example.json`. **`.cursor/mcp.json` is git-ignored; never commit it.**

| Connector | What agents use it for | How it connects | Auth | Mode |
|---|---|---|---|---|
| **Supabase** | Apply migrations, inspect tables and RLS policies, read logs, generate types | Hosted: `https://mcp.supabase.com/mcp?project_ref=<DEV_PROJECT_REF>&read_only=true` | OAuth in the browser on first use | **Read-only, scoped to the dev project.** Remove `read_only=true` only while an agent applies migrations to **dev**. Never point it at prod. |
| **Cloudflare Docs** | Look up current Workers, R2 and Turnstile APIs | `https://docs.mcp.cloudflare.com/mcp` | None | Read |
| **Cloudflare Bindings** | Create and list R2 buckets, D1 and KV | `https://bindings.mcp.cloudflare.com/mcp` | Cloudflare OAuth | Writes need your approval |
| **Cloudflare Builds** | See deploy and build results and errors | `https://builds.mcp.cloudflare.com/mcp` | Cloudflare OAuth | Read |
| **Cloudflare Observability** | Read Worker logs, e.g. `partner_visit` or errors | `https://observability.mcp.cloudflare.com/mcp` | Cloudflare OAuth | Read |
| **Shopify Dev** | Search Shopify docs and validate Admin/Storefront GraphQL against the schema | `npx -y @shopify/dev-mcp@latest` (local) | None, no store access | Read. To opt out of telemetry, set `OPT_OUT_INSTRUMENTATION=true`. |
| **Twilio** | Check the Verify service config and read message and verification logs | `npx -y @twilio-alpha/mcp <ACCOUNT_SID>/<API_KEY>:<API_SECRET> --services <service>` (local) | A **restricted Twilio API key**, not the account auth token | Load only the Verify service (`--services`; confirm the service name in the package README). Read only. Never send test SMS in a loop. |

**Setup steps (you):**

1. Copy `.cursor/mcp.example.json` to `.cursor/mcp.json` and fill in `<DEV_PROJECT_REF>`. Then fill in the Twilio key, or delete the Twilio entry until workstream C.
2. Open Cursor › Settings › MCP. Each server should show green. Supabase and Cloudflare open a browser window to sign in.
3. Give agents only the servers their workstream lists (§5). Turn the others off in that chat.

**Notes:**
- **Twilio:** Twilio advises not running community Twilio MCP servers alongside theirs.
- **Shopify:** the Shopify connector inside Claude was signed in to a different store ("Fizz"), not KIOSK. Agents must not use any Shopify *store* connector until you confirm the right store. The Dev MCP above has no store access, so it's safe.

---

## 3. Accounts and secrets checklist (you, before the agents start)

| # | Create | Where the values go |
|---|---|---|
| 1 | Supabase project **kiosk-dev** (Free) and **kiosk-prod** (Pro) | Project ref and URL go in `.dev.vars` (dev) and Cloudflare Worker secrets (prod). The anon key may go in the frontend. **The service role key goes only in Worker secrets.** |
| 2 | Google Cloud OAuth client (Web). Redirect URI: `https://<ref>.supabase.co/auth/v1/callback` | Supabase › Auth › Providers › Google |
| 3 | Twilio: a **Verify service** with SMS on, Fraud Guard on, and geo permissions limited to the countries you serve | Supabase › Auth › Providers › Phone › Twilio Verify (Account SID, Auth Token, Verify Service SID) |
| 4 | A restricted Twilio API key, for the MCP only | Your local `.cursor/mcp.json` |
| 5 | Cloudflare Turnstile widget for `onlyatthekiosk.com` (plus the preview domains) | Site key in the frontend. Secret key in Supabase › Auth › Bot protection. |
| 6 | Shopify Storefront token (already used by `/api/shopify`) and a webhook signing secret | Cloudflare Worker secrets: `SHOPIFY_STOREFRONT_TOKEN`, `SHOPIFY_STORE`, `SHOPIFY_WEBHOOK_SECRET` |
| 7 | Cloudflare: R2 bucket `kiosk-media` and a custom domain `media.onlyatthekiosk.com` | `wrangler.jsonc` binding (agent D) |

Set Worker secrets with `npx wrangler secret put NAME` or the Cloudflare dashboard. **Never put a secret in a committed file, a PR description or a chat.**

---

## 4. Guardrails for every agent

1. **Dev first.** Migrations, auth settings and test users go to `kiosk-dev`. Prod changes happen only after you approve the PR, using the same migration files.
2. **Migrations live in git** (`supabase/migrations/<timestamp>_<name>.sql`). Never change a schema through the dashboard or the MCP without a matching migration file. Leave the old `20250101000000_create_products_table.sql` and `archive/` untouched.
3. **RLS on every table**, with policies written and tested for anon, the signed-in owner and other users.
4. **No secrets in code or chats.** The service role key and Twilio and Shopify secrets live only in Worker secrets and `.dev.vars`.
5. **SMS safety:**
   - Turnstile on every OTP request.
   - Supabase rate limits: OTP at most once per 60 seconds per number (the default), plus a per-IP limit.
   - Twilio geo permissions limited to the countries you serve.
   - No automated tests that send real SMS. Use Supabase test phone numbers and OTPs.
6. **Keep the site's style.** The frontend stays vanilla JS in `js/kiosk-glass.js` (or a new `js/kiosk-auth.js`) with the existing glass and terminal look. No framework, no bundler. Pin any CDN script to an exact version.
7. **Small PRs.** One workstream per branch, with a description of what changed, how it was tested, and any dashboard steps you must do.
8. **Tests.** Add Playwright checks in the style of the existing ones, plus SQL tests for RLS. Run `npm run build:worker` before pushing.
9. **Ask before anything that costs money or touches prod:** sending SMS, creating paid resources, changing Shopify products.

---

## 5. Workstreams (one Cursor agent each, in order)

### A. Supabase schema and RLS
**Connectors:** Supabase (dev, write mode while applying), Cloudflare Docs.

**Tasks:**
- Write migrations for these tables:
  - `profiles` (id → auth.users, display_name, avatar, country, marketing_opt_in, created_at)
  - `saved_items` (user_id, kind 'story'|'product', ref, created_at)
  - `hunt_reservations` (user_id, product_id, size, status 'reserved'|'cancelled'|'collected', phone_verified_at, created_at)
  - `orders` (user_id, shopify_order_id, email, total, currency, line_items jsonb, created_at)
  - `partners` (store_id, user_id, role)
  - `partner_visits` (click, store_id, product_id, at, country, page)
- Add a trigger that creates a profile when a user signs up.
- RLS on every table:
  - Each user reads and writes only their own rows.
  - `orders` is insert-only from the service role.
  - `partner_visits` is readable by that store's partners, and inserts come from the service role.
- Generate TypeScript types into `supabase/types.ts` for the Worker.

**Done when:** migrations apply cleanly to dev, the RLS SQL tests pass, and a written policy matrix is in the PR.

**Prompt:**
> Read docs/AGENT_PLAN.md §1–§5A and .cursor/rules/backend.mdc. Using the Supabase MCP on the **dev** project only, create the migrations and RLS policies for workstream A, apply them to dev, add SQL tests for every policy, and open a PR. Do not touch existing migrations or prod.

### B. Sign-in (Google, email code, phone code) and account page
**Connectors:** Supabase (dev, read-only), Cloudflare Docs.

**Tasks:**
- **Sign-in sheet:** add `js/kiosk-auth.js` (supabase-js from a pinned CDN version) with a frosted sheet that matches Settings and the product panel. Include:
  - **Continue with Google**
  - **Email me a code** (email OTP)
  - **Text me a code** (phone OTP, E.164, with a country picker)
  - Turnstile on each.
- **Entry points:** an account button in the header and in More on the phone tab bar.
- **Account view:** profile, saved stories and products (the existing save hearts sync for signed-in users), Hunt reservations, orders, Dispatch opt-in, and sign out.
- **Session:** on sign-in, merge the local `kiosk:saved` list into `saved_items`.
- **Translations:** add the new UI strings to `js/kiosk-i18n.js`.

**Done when:**
- Google and email sign-in work on dev.
- Phone works with Supabase **test numbers**.
- Playwright covers open, close, the flows (stubbed) and no horizontal overflow at 390px.

**Prompt:**
> Read docs/AGENT_PLAN.md and .cursor/rules/backend.mdc. Build workstream B: the sign-in sheet and account view on top of Supabase Auth (dev), matching the site's glass style in js/kiosk-glass.js. Use Supabase test phone numbers, never real SMS. Open a PR listing the dashboard settings I must enable.

### C. Twilio Verify hardening (phone codes)
**Connectors:** Twilio (restricted key, Verify only), Supabase (dev, read-only).

**Tasks:**
- Confirm the Supabase phone provider is set to Twilio Verify.
- Confirm Fraud Guard is on and geo permissions are limited to the agreed countries.
- Check that the code length, expiry and message template are set in Twilio.
- Document the monthly cost estimate and the alert you should set (a Twilio usage trigger, for example at $20).
- Phone codes are required **only** for Hunt reservations (`phone_verified_at`). They are optional for normal sign-in.

**Done when:** you get a written checklist with screenshots or values, no code changes except docs, and no SMS sent.

**Prompt:**
> Read docs/AGENT_PLAN.md §5C. Using the Twilio MCP read-only, audit the Verify service and write docs/TWILIO_VERIFY.md with the settings, the risks and the usage alert I should configure. Do not send any messages.

### D. Cloudflare: authenticated API, R2 media, webhooks
**Connectors:** Cloudflare Docs, Bindings, Builds, Observability; Supabase (dev, read-only).

**Tasks:**
- **Authenticated API:** add `functions/api/me.js`, `saved.js` and `reservations.js`.
  - Verify the Supabase JWT, using the project's JWKS/asymmetric signing keys or `auth.getUser()`.
  - Call Supabase with the user's token so RLS applies. Use the service role only where a policy says so.
- **Partner visits:** `functions/go/[store].js` also inserts into `partner_visits` (service role), alongside the existing log.
- **R2:**
  - Create `kiosk-media`, bind it in `wrangler.jsonc`, and serve it at `media.onlyatthekiosk.com`.
  - Write a script that uploads `images/` and `videos/` and rewrites paths in `js/kiosk-content.js`, in a separate PR.
- **Rate limits:** add rate limiting on the new endpoints.

**Done when:** `npm run build:worker` passes, the endpoints have tests with a mocked JWT, and the Builds MCP shows a green preview deploy.

**Prompt:**
> Read docs/AGENT_PLAN.md §5D and .cursor/rules/backend.mdc. Implement the authenticated Worker endpoints and partner_visits insert. Then, in a second PR, set up the R2 media bucket. Ask before creating any Cloudflare resource.

### E. Shopify: checkout check and order history
**Connectors:** Shopify Dev (schema and docs only), Cloudflare Docs.

**Tasks:**
- **Checkout check:** verify the `/api/shopify` variant query and the `/api/shopify-cart` flow against the current Storefront schema, using the Dev MCP to validate the GraphQL.
- **Signed-in checkout:** pass the user's email to the cart (buyer identity), so orders link to the account.
- **Order webhook:** add `functions/api/webhooks/shopify.js` for `orders/create`. Verify the HMAC with `SHOPIFY_WEBHOOK_SECRET`, then insert into `orders` (service role), matched by email.

**Done when:** schema validation passes, the HMAC check has unit tests, and the PR lists the webhook URL to register in Shopify admin.

**Prompt:**
> Read docs/AGENT_PLAN.md §5E. Using only the Shopify Dev MCP (no store access), validate our Storefront queries, add buyer identity to the cart, and add the orders/create webhook into Supabase with HMAC verification. Open a PR.

### F. QA and security review (last)
**Connectors:** all, read-only.

**Tasks:**
- Review the whole flow end to end on the preview deploy.
- Check:
  - RLS bypasses
  - secrets leaking into the client bundle
  - open redirects in the auth callbacks
  - OTP rate limits
  - Turnstile on every form
  - webhook replay
  - CORS
- Run all Playwright suites.

**Done when:** you get a findings list, ranked, with fixes in follow-up PRs.

**Order and dependencies:** A runs first. B, C, D and E can then run in parallel, with B and D sharing the JWT contract in A's PR. F runs last.

---

## 6. Running costs

| Item | Cost |
|---|---|
| Cloudflare Workers Paid | $5/month; includes 10M requests. Static pages are free. |
| R2 | 10 GB free, then $0.015/GB-month. No egress fees. |
| Supabase | Dev: Free. Prod: Pro, $25/month; includes 100k MAU and an 8 GB database. |
| Google sign-in, email OTP, Turnstile | Free (Supabase's built-in email is rate-limited; use a custom SMTP sender in prod, e.g. Cloudflare Email Service). |
| Twilio Verify | About **$0.05 per successful verification + about $0.008 per SMS** in the US. This is the only per-user cost, so keep phone codes to Hunt reservations. |
| Shopify | Unchanged. |

Confirm the Supabase, Twilio and Shopify prices on their own pricing pages before launch; the figures above come from third-party sources dated 2026.

## 7. Open decisions (you)

1. Phone codes: only for Hunt reservations (recommended), or a sign-in option for everyone?
2. Which countries can receive SMS?
3. Keep Shopify as the checkout (recommended for now)?
4. Who besides you needs admin or partner access?
