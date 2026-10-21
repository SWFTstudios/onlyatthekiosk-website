# Cloudflare Preview links

This site is a Cloudflare **Worker** (`onlyatthekiosk-website`), not a Pages
project, so previews are Worker Version Preview URLs:

```
https://pr-<number>-onlyatthekiosk-website.elombe.workers.dev
```

Example (PR #57): https://pr-57-onlyatthekiosk-website.elombe.workers.dev

## Automatic: every pull request

`.github/workflows/preview.yml` runs on PR open/update. It builds the site,
uploads the PR code as a non-production version with preview alias
`pr-<number>`, and posts/updates one "Cloudflare Preview" comment on the PR.
Production (`onlyatthekiosk.com`) is never touched.

Repo secrets required (GitHub → Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Workers Scripts: Edit** for the account |
| `CLOUDFLARE_ACCOUNT_ID` | `e246ec2918a6cd045fd4bfd00f024f0c` |

Until those secrets exist, the workflow skips with a warning and no comment.

Preview URLs are enabled on the Worker (`previews_enabled: true`, set via the
Cloudflare API on 2026-10-21). The plain workers.dev route for the production
version stays disabled.

## Manual: any branch or commit

```bash
npm run build:worker
npx wrangler@4 versions upload --preview-alias pr-57 --tag pr-57 --message "PR #57"
# → https://pr-57-onlyatthekiosk-website.elombe.workers.dev
```

## Caution

Previews share **production bindings** (D1 `kiosk-accounts`, secrets, email).
Treat a preview as staging: look, click and listen, but do not run
destructive tests against real accounts/orders from a preview link.
