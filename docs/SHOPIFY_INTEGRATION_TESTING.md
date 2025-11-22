# Shopify Integration Testing Guide

## Overview

This guide helps you verify that the Shopify backend integration is working correctly. Follow these steps to test each component of the integration.

## Prerequisites

Before testing, ensure:
- ✅ Products are imported into Shopify (use `kiosk-shopify-products.csv`)
- ✅ Collections are created in Shopify Admin
- ✅ Environment variables are set in Cloudflare Pages:
  - `SHOPIFY_STOREFRONT_TOKEN` - Your Shopify Storefront API access token
  - `SHOPIFY_STORE_DOMAIN` - Your store domain (e.g., `onlyatthekiosk.com`)

## Testing Checklist

### 1. Verify Environment Setup

**Check Cloudflare Pages Environment Variables:**
1. Go to Cloudflare Pages Dashboard
2. Navigate to your project → Settings → Environment Variables
3. Verify `SHOPIFY_STOREFRONT_TOKEN` is set
4. Verify `SHOPIFY_STORE_DOMAIN` is set (or defaults to `onlyatthekiosk.com`)

**Check Shopify Storefront API:**
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → Find your Storefront API app
3. Verify the access token is active
4. Test the API endpoint manually (see below)

### 2. Test API Endpoint Directly

**Using Browser Console:**
```javascript
// Test the Shopify API proxy endpoint
fetch('/api/shopify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        collections(first: 5) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `
  })
})
.then(r => r.json())
.then(data => console.log('Collections:', data))
.catch(err => console.error('Error:', err));
```

**Expected Result:**
- Should return a JSON object with `data.collections.edges` array
- Each collection should have `id`, `title`, and `handle`
- No errors in the response

**If It Fails:**
- Check browser Network tab for the `/api/shopify` request
- Look for 401 (Unauthorized) or 500 (Server Error)
- Verify environment variables in Cloudflare Pages

### 3. Test Collection Pages

**Test URLs:**
- `http://localhost:8788/carousel-template.html?collection=bracelets`
- `http://localhost:8788/carousel-template.html?collection=chains`
- `http://localhost:8788/carousel-template.html?collection=hoodies`
- `http://localhost:8788/carousel-template.html?collection=t-shirts`

**What to Check:**
1. **Page Title** - Should show collection name (e.g., "Bracelets - Only at The Kiosk")
2. **Collection Title** - Should display the collection name at the top
3. **3D Carousel** - Should show product images rotating
4. **Product Titles** - Should show actual product names from Shopify
5. **No Console Errors** - Open browser DevTools → Console, should see no red errors

**Expected Behavior:**
- Collection title animates from center to top
- Carousel displays products with images
- Each product has a "view details" button
- Products match the collection (e.g., bracelets page shows only bracelets)

**If Products Don't Load:**
- Check browser Console for errors
- Verify collection handle matches Shopify (check Shopify Admin)
- Check Network tab for failed API requests
- Verify products are assigned to the collection in Shopify

### 4. Test Product Drawer

**Steps:**
1. Navigate to any collection page
2. Click "view details" button on any product
3. Product drawer should slide in from the right

**What to Check:**
1. **Product Title** - Should match Shopify product title
2. **Product Price** - Should show formatted price (e.g., "$49.99")
3. **Product Images** - Main image and gallery thumbnails should load
4. **Description** - Should show product description from Shopify
5. **Care Instructions** - Should display care guide from metafield
6. **Quantity Selector** - Should allow selecting quantity
7. **Add to Cart Button** - Should be visible and clickable

**Expected Behavior:**
- Drawer opens smoothly
- All product data loads from Shopify
- Images are from Shopify CDN
- Care instructions are formatted correctly

**If Drawer Doesn't Open:**
- Check Console for JavaScript errors
- Verify `js/shopify.js` is loaded (check Network tab)
- Check if product handle is correct

**If Data is Missing:**
- Check Console for API errors
- Verify metafield `descriptors.care_guide` exists in Shopify
- Check Network tab for GraphQL query responses

### 5. Test Metafields

**Verify Care Instructions Load:**
1. Open a product drawer
2. Scroll to "Care Instructions" section
3. Should see formatted care instructions

**Check in Browser Console:**
```javascript
// Test fetching a product with metafields
fetch('/api/shopify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        product(handle: "001-gold-chain") {
          title
          metafields(identifiers: [
            {namespace: "descriptors", key: "care_guide"}
          ]) {
            namespace
            key
            value
          }
        }
      }
    `
  })
})
.then(r => r.json())
.then(data => {
  console.log('Product:', data.data.product);
  console.log('Care Guide:', data.data.product.metafields);
});
```

**Expected Result:**
- Should return product with metafields array
- `metafields[0].value` should contain care instructions
- No errors

**If Metafields Don't Load:**
- Verify metafield namespace is `descriptors`
- Verify metafield key is `care_guide`
- Check Shopify Admin → Products → Metafields
- Ensure metafield is set to "Storefront API" visibility

### 6. Test Navigation Links

**Test Collection Links:**
1. Open navigation menu (click hamburger icon)
2. Click "Bracelets", "Chains", "Hoodies", or "T-shirts"
3. Should navigate to collection page with correct URL parameter

**What to Check:**
- URL should be: `carousel-template.html?collection=bracelets` (or other collection)
- Page should load the correct collection
- Collection title should match

**Test from Store Page:**
1. Navigate to `store.html`
2. Click any collection link in navigation
3. Should navigate to correct collection page

### 7. Browser DevTools Checks

**Console Tab:**
- No red errors
- Should see: "Shopify client loaded" or similar
- API requests should succeed

**Network Tab:**
- Filter by "shopify" or "api"
- Check `/api/shopify` requests:
  - Status should be `200 OK`
  - Response should contain GraphQL data
  - No CORS errors

**Application Tab:**
- Check `localStorage` for theme settings (not related to Shopify, but good to verify)

### 8. Common Issues & Solutions

**Issue: "Shopify client not loaded"**
- **Solution:** Verify `js/shopify.js` is included in HTML
- Check file path is correct
- Check browser Network tab to see if file loads

**Issue: "401 Unauthorized"**
- **Solution:** Check `SHOPIFY_STOREFRONT_TOKEN` in Cloudflare Pages
- Verify token is valid in Shopify Admin
- Regenerate token if needed

**Issue: "Collection not found"**
- **Solution:** Verify collection handle matches exactly
- Check Shopify Admin → Collections → Collection handle
- Handles are case-sensitive and use hyphens (e.g., `t-shirts` not `T-Shirts`)

**Issue: "No products in collection"**
- **Solution:** 
  - Check Shopify Admin → Collections → Verify products are assigned
  - For smart collections, verify conditions match products
  - Check product tags match collection conditions

**Issue: "Metafield not found"**
- **Solution:**
  - Verify metafield namespace: `descriptors`
  - Verify metafield key: `care_guide`
  - Check metafield visibility is set to "Storefront API"
  - Re-import products if metafields weren't included

**Issue: "Images not loading"**
- **Solution:**
  - Check image URLs in Network tab
  - Verify images are uploaded to Shopify
  - Check CDN URL format is correct

### 9. Local Development Testing

**If testing locally:**
1. Use Cloudflare Pages local development: `npx wrangler pages dev`
2. Set environment variables in `.dev.vars` file:
   ```
   SHOPIFY_STOREFRONT_TOKEN=your_token_here
   SHOPIFY_STORE_DOMAIN=onlyatthekiosk.com
   ```
3. Access site at `http://localhost:8788`

**If using static file server:**
- API calls will fail (no server-side proxy)
- Need to use Cloudflare Pages Functions for API proxy
- Or use Shopify's CORS-enabled Storefront API directly (not recommended for production)

### 10. Production Testing

**After deployment:**
1. Visit live site URL
2. Test collection pages
3. Test product drawer
4. Check browser Console for errors
5. Verify API calls succeed (check Network tab)

**Monitor:**
- Cloudflare Pages Function logs
- Browser Console errors
- Network request failures

## Quick Test Script

Run this in browser Console on any collection page:

```javascript
// Quick integration test
async function testShopifyIntegration() {
  console.log('🧪 Testing Shopify Integration...\n');
  
  // 1. Check Shopify client
  if (!window.shopify) {
    console.error('❌ Shopify client not loaded');
    return;
  }
  console.log('✅ Shopify client loaded');
  
  // 2. Test API endpoint
  try {
    const response = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { collections(first: 1) { edges { node { title handle } } } }`
      })
    });
    
    if (!response.ok) {
      console.error('❌ API endpoint failed:', response.status);
      return;
    }
    
    const data = await response.json();
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return;
    }
    
    console.log('✅ API endpoint working');
    console.log('✅ Collections:', data.data.collections.edges);
  } catch (error) {
    console.error('❌ API test failed:', error);
    return;
  }
  
  // 3. Test collection loading
  const urlParams = new URLSearchParams(window.location.search);
  const collectionHandle = urlParams.get('collection');
  
  if (collectionHandle) {
    try {
      const collection = await window.shopify.getProductsByCollection(collectionHandle, 5);
      if (collection && collection.products && collection.products.edges.length > 0) {
        console.log('✅ Collection loaded:', collection.title);
        console.log('✅ Products found:', collection.products.edges.length);
      } else {
        console.warn('⚠️ Collection found but no products');
      }
    } catch (error) {
      console.error('❌ Collection load failed:', error);
    }
  }
  
  console.log('\n✅ Integration test complete!');
}

// Run test
testShopifyIntegration();
```

## Success Criteria

✅ All tests pass
✅ Products load from Shopify
✅ Collection pages display correctly
✅ Product drawer shows all data
✅ Care instructions display
✅ No console errors
✅ API requests succeed

## Next Steps

Once integration is verified:
1. Test add to cart functionality
2. Test checkout flow
3. Test on mobile devices
4. Test with different collections
5. Verify all 80 products are accessible

