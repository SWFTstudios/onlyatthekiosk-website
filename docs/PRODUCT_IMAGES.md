# Product Images — AI generation

Every product can get its own AI-generated studio photo. The generator reads the
catalog from Airtable, builds a brand-aligned prompt per product (colorway +
category), creates the image with OpenAI `gpt-image-1`, and saves it to
`images/products/<handle>.png`. Those files deploy with the site, so each image
is served at `https://<your-domain>/images/products/<handle>.png` — which also
lets Stripe show the thumbnail at checkout.

## Run it

```bash
OPENAI_API_KEY=sk-...                 \
AIRTABLE_ACCESS_TOKEN=pat...          \
AIRTABLE_BASE_ID=appA3qQw0NAqz8ru3    \
IMAGE_QUALITY=medium                  \
node scripts/generate-product-images.mjs
```

Options:
- `IMAGE_QUALITY` — `low` | `medium` | `high` (default `medium`). Roughly
  $0.02 / $0.04 / $0.17 per image, so ~40 products ≈ **$1–7** total.
- `SITE_ORIGIN` — public origin for the saved URLs (default
  `https://onlyatthekiosk.com`).
- `ONLY_HANDLES=001-white-tshirt,002-gold-chain` — generate just a subset.
- `--force` — regenerate images that already exist (otherwise it skips them and
  is safe to re-run/resume).

Output:
- `images/products/*.png` — the photos.
- `images/products/manifest.json` — `handle → { file, url }`, used to update
  Airtable's `Image Src`.

## After generating

1. Commit `images/products/` so the files deploy.
2. Point each product at its new photo by setting **Image Src** in the Airtable
   Products table to the manifest URL (every row sharing a handle). The
   storefront reads `Image Src` live via `/api/products`.

## Editing the look

The prompt style lives in `scripts/generate-product-images.mjs`
(`SHARED_STYLE` + `CATEGORY_PROMPTS`). Tweak it and re-run with `--force` to
restyle the whole catalog (e.g. a darker night-mode background, or the
vacuum-sealed-pack vending-machine aesthetic).
