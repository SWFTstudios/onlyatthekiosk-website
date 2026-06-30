# Lifestyle Images — KIOSK product campaign

This pack adds a lifestyle direction for product imagery that feels like **Only at The Kiosk**: NYC streetwear, late-night corner-store energy, clean e-commerce polish, and giftable accessories.

The goal is to create images that sell the feeling, not just the object:

- **T-shirts / hoodies**: cropped model or flat-lay streetwear scenes, no readable outside logos, product remains the hero.
- **Chains / bracelets**: close-up jewelry styling, hands/neck/wrist allowed, no celebrity likeness, no luxury-brand logos.
- **Gift-box content**: objects arranged like a premium mystery drop / kiosk pickup.
- **Site usage**: home hero, collection banners, product cards, social ads, email headers.

## Run it

```bash
OPENAI_API_KEY=sk-...                 \
AIRTABLE_ACCESS_TOKEN=pat...          \
AIRTABLE_BASE_ID=appA3qQw0NAqz8ru3    \
IMAGE_QUALITY=medium                  \
node scripts/generate-lifestyle-images.mjs
```

Options:

- `IMAGE_QUALITY` — `low` | `medium` | `high` (default `medium`).
- `SITE_ORIGIN` — public origin for the saved URLs (default `https://onlyatthekiosk.com`).
- `ONLY_HANDLES=001-white-tshirt,002-gold-chain` — generate a subset.
- `LIFESTYLE_SCENES=streetwear,detail,giftbox` — choose scenes.
- `--force` — regenerate images that already exist.

Output:

- `images/lifestyle/*.png` — generated campaign/lifestyle images.
- `images/lifestyle/manifest.json` — `handle → scene → { file, url }`.

## Recommended image sets

### 1. Streetwear product-on-body

Best for hero sections, collection pages, and social ads.

Prompt direction:

> Editorial NYC streetwear lifestyle photo, cropped model from shoulders to waist, wearing the product naturally, clean concrete or subway-tile background, premium casual styling, soft cinematic daylight, product clearly visible, no readable logos, no text, no watermark.

### 2. Jewelry detail / flex shot

Best for chains, bracelets, PDP secondary images, and paid ads.

Prompt direction:

> Premium lifestyle macro photo of the jewelry being worn, wrist or neckline crop, polished metal catchlights, relaxed streetwear styling, shallow depth of field, neutral urban background, expensive but attainable, no readable logos, no text, no watermark.

### 3. KIOSK gift-box scene

Best for the box-builder experience and landing page sections.

Prompt direction:

> Premium gift-box unboxing scene on a clean table, product arranged with tissue paper, sticker-like blank insert card, soft shadows, corner-store-meets-luxury-drop aesthetic, warm flash photography, no readable text, no watermark.

## Site placement ideas

- `index.html`: use one wide streetwear/lifestyle hero once the shop is live.
- `store.html`: swap the static featured grid hero art for a rotating lifestyle strip.
- `collections/chains.html`: use jewelry detail scenes as secondary hover images.
- `collections/bracelets.html`: use wrist-crop detail scenes as secondary hover images.
- `collections/t-shirts.html` + `collections/hoodies.html`: use cropped product-on-body images above the product grid.

## Notes

Keep the studio product generator for checkout thumbnails and clean catalog images. Use this lifestyle generator for emotion, ads, and campaign sections. The two image sets should work together: studio images answer “what is it?” while lifestyle images answer “why do I want it?”
