# Image Source Options for Carousel

## Overview

The carousel supports multiple image sources. This document explains how to configure each option.

## Current Setup

Each of the **80 catalog products** has **two unique placeholder images** (product packshot + lifestyle) stored locally:

```
images/products/
  001-gold-chain-product.webp
  001-gold-chain-lifestyle.webp
  ...
```

- **Manifest:** [`data/product-image-manifest.json`](../data/product-image-manifest.json)
- **Frontend fallback:** [`js/product-image-manifest.js`](../js/product-image-manifest.js)
- **Last-resort fallback:** `images/kiosk-placeholder-product-img.webp` (single shared file)

Collection pages load live images from **Airtable** (`Image URLs` field). When Airtable is unavailable, `initStaticCarouselImages()` applies unique images from the manifest per collection.

---

## Product Image Workflow

### 1. Build manifest from CSV

```bash
npm run build:manifest
```

Parses [`kiosk-shopify-products.csv`](../kiosk-shopify-products.csv) and writes prompts + paths to `data/product-image-manifest.json`.

### 2. Generate images

```bash
# All products via OpenAI (uses Cloudflare OPENAI_API_KEY secret)
node scripts/generate-product-images.js --openai --remote --force

# Local generation (requires OPENAI_API_KEY in .dev.vars or env)
node scripts/generate-product-images.js --openai --force

# One collection at a time
node scripts/generate-product-images.js --openai --remote --force --collection chains
```

Add `OPENAI_API_KEY` to Cloudflare Pages secrets (same place as Airtable credentials). Optional: `OPENAI_IMAGE_MODEL` (default `gpt-image-1`), `IMAGE_SYNC_SECRET` for auth.

After adding the secret and deploying, regenerate all images:

```bash
node scripts/generate-product-images.js --openai --remote --force
npm run sync:airtable-images -- --remote
```

### 3. Optimize (if re-processing raw files)

```bash
npm run optimize:images
```

### 4. Sync to Airtable

```bash
npm run sync:airtable-images
# Requires AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID
```

Writes `Image URLs` JSON per product:

```json
[
  "https://onlyatthekiosk.com/images/products/001-gold-chain-product.webp",
  "https://onlyatthekiosk.com/images/products/001-gold-chain-lifestyle.webp"
]
```

### 5. Update Shopify CSV

```bash
npm run update:csv-images
```

Sets unique `Image Src` per product and adds lifestyle rows (`Image Position: 2`).

### 6. Regenerate frontend manifest

```bash
npm run build:product-image-js
```

### 7. Verify

```bash
node scripts/verify-product-images.js
```

---

## Swapping in Real Photography

When real images are ready, replace files **keeping the same filenames**:

1. Drop new photos into `images/products/` as `{handle}-product.webp` and `{handle}-lifestyle.webp`
2. Run `npm run optimize:images` if needed
3. If filenames unchanged, **no Airtable or code updates required**
4. Update manifest status to `"real"` manually or re-run generation scripts

---

## Image Source Options

### Option 1: Local Product Images (Current — Unique Per Product)
**Best for:** Development, pre-launch placeholders, Cloudflare Pages hosting

```javascript
// js/product-image-manifest.js — auto-generated
const PRODUCT_IMAGES = {
  "001-gold-chain": {
    "product": "/images/products/001-gold-chain-product.webp",
    "lifestyle": "/images/products/001-gold-chain-lifestyle.webp"
  }
};
```

**Pros:**
- ✅ Unique image per product (not one shared placeholder)
- ✅ Fast local/CDN delivery
- ✅ Easy swap when real photos arrive

**Cons:**
- ❌ Not real product photography (until replaced)

---

### Option 2: Airtable Image URLs (Recommended for Live Collections)
**Best for:** Production collection pages

Collection pages fetch products via [`js/airtable.js`](../js/airtable.js). Set the `Image URLs` field to a JSON array:

```json
["/images/products/001-gold-chain-product.webp", "/images/products/001-gold-chain-lifestyle.webp"]
```

First image = carousel thumbnail + drawer main. Second = drawer gallery.

---

### Option 3: Shopify Storefront API
**Best for:** `carousel-template.html` and Shopify-native product data

**Setup:**
1. Import updated CSV or upload images in Shopify Admin
2. Product images served from Shopify CDN automatically

See [`docs/SHOPIFY_CSV_IMPORT_GUIDE.md`](SHOPIFY_CSV_IMPORT_GUIDE.md).

---

### Option 4: CDN/Image Hosting Service
**Best for:** Production with optimized delivery at scale

```javascript
const placeholderImage = 'https://res.cloudinary.com/your-cloud/image/upload/w_800,h_800,c_fill/product-placeholder.jpg';
```

---

### Option 5: Legacy Single Placeholder
**Best for:** Last-resort fallback only

```javascript
const placeholderImage = '/images/kiosk-placeholder-product-img.webp';
```

Used only when no product-specific image is found.

---

## Recommended Setup for Production

1. **Live collections:** Airtable `Image URLs` pointing to `/images/products/{handle}-*.webp`
2. **Offline fallback:** `js/product-image-manifest.js` (auto-generated)
3. **Shopify import:** Updated CSV with unique image URLs per product
4. **Real photos:** Replace WebP files in place when ready

## Image Optimization Tips

- **Max file size:** 500KB per image
- **Dimensions:** 1200×1200px
- **Format:** WebP (quality ~80)
- **Use CDN:** Cloudflare Pages serves `/images/products/` globally

## Troubleshooting

**Images not showing?**
1. Check browser console for errors
2. Verify files exist in `images/products/`
3. Run `node scripts/verify-product-images.js`
4. Check Airtable `Image URLs` field is valid JSON
5. Verify API credentials (Airtable) in Cloudflare Pages env vars

**All carousel images still identical?**
1. Confirm Airtable records have distinct `Image URLs`
2. Check `initStaticCarouselImages(collectionHandle)` runs on page load
3. Regenerate JS manifest: `npm run build:product-image-js`

**Slow loading?**
1. Images are already optimized WebP (~8KB each)
2. Use `loading="lazy"` for below-fold carousel items (already set)
3. Consider Cloudflare image optimization for production


