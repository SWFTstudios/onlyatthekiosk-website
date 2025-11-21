# Image Source Options for Carousel

## Overview

The carousel now supports multiple image sources. This document explains how to configure each option.

## Current Setup

The carousel is currently using **placeholder images** from `via.placeholder.com` for fast loading and testing.

## Image Source Options

### Option 1: Placeholder Service (Current - Fast & Free)
**Best for:** Testing, demos, development

```javascript
// In carousel-template.html, line ~1495
const placeholderImage = 'https://via.placeholder.com/800x800/1a1a1a/ffffff?text=Product+Placeholder';
```

**Pros:**
- ✅ No hosting needed
- ✅ Fast loading
- ✅ Free
- ✅ No file size issues

**Cons:**
- ❌ Not real product images
- ❌ Generic placeholder

---

### Option 2: Shopify Storefront API (Recommended for Production)
**Best for:** Real products from your Shopify store

**Setup:**
1. Your Shopify Storefront API is already configured
2. Uncomment `loadCarouselImagesFromShopify()` in the carousel script
3. Update product handles in `data-product-handle` attributes

**Code Location:** `carousel-template.html` line ~1175

```javascript
// Uncomment this line in the carousel initialization:
loadCarouselImagesFromShopify();
```

**How it works:**
- Fetches product images from Shopify Storefront API
- Uses the `primary_image` from each product
- Automatically updates carousel images when products change

**Pros:**
- ✅ Real product images
- ✅ Automatic updates
- ✅ CDN-hosted (fast)
- ✅ Already integrated

**Cons:**
- ⚠️ Requires API calls (slight delay on first load)

---

### Option 3: Supabase Database
**Best for:** Custom image URLs, Airtable-synced images

**Setup:**
1. Images are stored in Supabase `products` table (`primary_image` field)
2. Uncomment and configure Supabase credentials
3. Uncomment `loadCarouselImagesFromSupabase()` function

**Code Location:** `carousel-template.html` line ~1185

```javascript
// 1. Add your Supabase credentials:
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// 2. Uncomment this line:
loadCarouselImagesFromSupabase();
```

**How it works:**
- Queries Supabase REST API for product images
- Uses `primary_image` URL from database
- Can sync from Airtable (via Edge Function)

**Pros:**
- ✅ Full control over image URLs
- ✅ Can use any CDN or hosting
- ✅ Syncs with Airtable
- ✅ Fast queries

**Cons:**
- ⚠️ Requires Supabase setup
- ⚠️ Need to manage image URLs

---

### Option 4: CDN/Image Hosting Service
**Best for:** Production with optimized images

**Services:**
- **Cloudinary** (recommended)
- **Imgix**
- **ImageKit**
- **Your own CDN**

**Setup:**
```javascript
// In getPlaceholderProduct() function:
const placeholderImage = 'https://res.cloudinary.com/your-cloud/image/upload/w_800,h_800,c_fill/product-placeholder.jpg';
```

**Pros:**
- ✅ Optimized images (automatic compression)
- ✅ Fast global CDN
- ✅ Image transformations
- ✅ Best performance

**Cons:**
- ⚠️ May require paid plan
- ⚠️ Need to upload images

---

### Option 5: Local Hosted Images (Not Recommended)
**Best for:** Small, optimized images only

**Current Issue:** Your placeholder image is 6.5MB, which is too large.

**If you want to use local images:**
1. Optimize the image to <500KB
2. Use tools like TinyPNG or ImageOptim
3. Update the path in `getPlaceholderProduct()`

```javascript
const placeholderImage = '/images/kiosk-placeholder-product-img.webp';
```

---

## Recommended Setup for Production

1. **For Real Products:** Use Shopify Storefront API (Option 2)
   - Already configured
   - Just uncomment `loadCarouselImagesFromShopify()`

2. **For Placeholders:** Use placeholder service (Option 1)
   - Fast and free
   - Good for testing

3. **For Custom Images:** Use Supabase (Option 3)
   - Full control
   - Syncs with Airtable

## Quick Switch Guide

### Switch to Shopify Images:
1. Open `carousel-template.html`
2. Find line ~1175 (after carousel initialization)
3. Uncomment: `loadCarouselImagesFromShopify();`
4. Save and deploy

### Switch to Supabase Images:
1. Open `carousel-template.html`
2. Find line ~1300 (Supabase config)
3. Add your Supabase URL and key
4. Find line ~1185
5. Uncomment `loadCarouselImagesFromSupabase();`
6. Save and deploy

## Image Optimization Tips

- **Max file size:** 500KB per image
- **Dimensions:** 800x800px or 1200x1200px
- **Format:** WebP (best) or JPEG
- **Use CDN:** Always use a CDN for production

## Troubleshooting

**Images not showing?**
1. Check browser console for errors
2. Verify image URLs are accessible
3. Check CORS settings if using external URLs
4. Verify API credentials (Shopify/Supabase)

**Slow loading?**
1. Use CDN-hosted images
2. Optimize image file sizes
3. Use `loading="lazy"` for below-fold images
4. Consider image preloading for critical images

