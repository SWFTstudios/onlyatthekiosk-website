# Verify Live Shopify Store Connection

This guide helps you verify that all products are correctly linked to your live Shopify store (`onlyatthekiosk.com`) and displaying real product data.

## Quick Verification Checklist

### ✅ 1. Check Browser Console

Open any collection page (e.g., `collections/bracelets.html`) and check the browser console. You should see:

```
🛍️ Shopify Client initialized
📡 Store: onlyatthekiosk.com
🔌 API Version: 2024-01
🌐 API Endpoint: /api/shopify
🛍️ Loading products from Shopify collection: "bracelets"
📡 Store: onlyatthekiosk.com
✅ Loaded X products from Shopify
📦 Collection: "Bracelets"
```

**If you see errors:**
- ❌ "Shopify client not loaded" → Check that `js/shopify.js` is included in the page
- ❌ "401 Unauthorized" → Check `SHOPIFY_STOREFRONT_TOKEN` in Cloudflare Pages
- ❌ "Collection not found" → Verify collection handle matches Shopify exactly

### ✅ 2. Verify Collection URLs

All navigation links should now point to:
- `collections/bracelets.html` (not `carousel-template.html?collection=bracelets`)
- `collections/chains.html`
- `collections/hoodies.html`
- `collections/t-shirts.html`

**Check these pages:**
- `index.html` - Navigation menu
- `store.html` - Navigation menu
- `carousel-template.html` - Navigation menu
- `kiosk-styleguide.html` - Navigation menu

### ✅ 3. Test Product Loading

1. Navigate to any collection page (e.g., `collections/bracelets.html`)
2. Open browser DevTools → Console
3. Look for:
   - ✅ "Loading products from Shopify collection: ..."
   - ✅ "Loaded X products from Shopify"
   - ✅ Product titles should match your Shopify store

**If products don't load:**
- Check Network tab for `/api/shopify` requests
- Verify request returns `200 OK`
- Check response contains product data

### ✅ 4. Test Product Drawer

1. Click "view details" on any product
2. Open browser DevTools → Console
3. Look for:
   - ✅ "Fetching product from Shopify: ..."
   - ✅ "Product loaded from Shopify: ..."
   - ✅ Product price, images, and description should match Shopify

**If drawer doesn't show data:**
- Check console for errors
- Verify product handle matches Shopify
- Check metafields are configured correctly

### ✅ 5. Verify API Endpoint

The API proxy should connect to:
```
https://onlyatthekiosk.com/api/2024-01/graphql.json
```

**Test in browser console:**
```javascript
fetch('/api/shopify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query { collections(first: 1) { edges { node { title handle } } } }`
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ API working:', data);
  if (data.errors) console.error('❌ API errors:', data.errors);
});
```

**Expected:**
- Status: `200 OK`
- Response contains collection data
- No errors in response

## Environment Variables Check

### Required in Cloudflare Pages:

1. **`SHOPIFY_STOREFRONT_TOKEN`**
   - Your Shopify Storefront API access token
   - Get from: Shopify Admin → Settings → Apps → Your app → Storefront API
   - Should start with `shpat_` or `shpca_`

2. **`SHOPIFY_STORE`** (optional, defaults to `onlyatthekiosk.com`)
   - Your Shopify store domain
   - Should be: `onlyatthekiosk.com`

3. **`SHOPIFY_API_VERSION`** (optional, defaults to `2024-01`)
   - API version to use
   - Current: `2024-01`

### How to Check:

1. Go to Cloudflare Pages Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify all variables are set for Production environment

## Collection Handles Verification

Your collection handles in Shopify must match exactly (case-sensitive):

| Collection | Handle in Shopify | URL |
|------------|-------------------|-----|
| Bracelets | `bracelets` | `collections/bracelets.html` |
| Chains | `chains` | `collections/chains.html` |
| Hoodies | `hoodies` | `collections/hoodies.html` |
| T-shirts | `t-shirts` | `collections/t-shirts.html` |

**To verify in Shopify:**
1. Go to Shopify Admin → Products → Collections
2. Click on each collection
3. Check the URL: `.../collections/bracelets` (handle is in URL)
4. Ensure handle matches exactly (lowercase, hyphens)

## Product Data Verification

### Check Product Handles

Product handles should match your Shopify products. Example:
- `001-gold-chain`
- `001-silver-chain`
- `001-black-hoodie`

**To verify:**
1. Go to Shopify Admin → Products
2. Click on a product
3. Check the URL: `.../products/001-gold-chain` (handle is in URL)

### Check Product Images

Product images should load from Shopify CDN:
- URLs should be: `https://cdn.shopify.com/...` or similar
- Images should display in carousel and product drawer

### Check Product Prices

Prices should match Shopify:
- Format: `$XX.XX` (USD)
- Should match variant prices in Shopify Admin

### Check Care Instructions

Care instructions should load from metafield:
- Namespace: `descriptors`
- Key: `care_guide`
- Should display in product drawer

## Troubleshooting

### Issue: "Shopify client not loaded"

**Solution:**
1. Check `js/shopify.js` is included in HTML
2. Check `js/config.js` is included before `js/shopify.js`
3. Check browser Network tab - files should load with `200 OK`

### Issue: "401 Unauthorized"

**Solution:**
1. Check `SHOPIFY_STOREFRONT_TOKEN` in Cloudflare Pages
2. Verify token is valid in Shopify Admin
3. Regenerate token if needed

### Issue: "Collection not found"

**Solution:**
1. Verify collection handle matches exactly (case-sensitive)
2. Check collection exists in Shopify Admin
3. Verify products are assigned to collection

### Issue: "No products in collection"

**Solution:**
1. Check Shopify Admin → Collections → Verify products are assigned
2. For smart collections, verify conditions match products
3. Check product tags match collection conditions

### Issue: Products show placeholder data

**Solution:**
1. Check console for errors
2. Verify API endpoint is accessible
3. Check Network tab for failed requests
4. Verify environment variables are set

## Success Indicators

✅ **All working correctly if:**
- Console shows "Shopify Client initialized"
- Console shows "Loaded X products from Shopify"
- Product titles match Shopify store
- Product images load from Shopify CDN
- Product prices match Shopify
- Product drawer shows real data
- No console errors
- API requests return `200 OK`

## Next Steps

Once verified:
1. Test on mobile devices
2. Test all collection pages
3. Test product drawer on all products
4. Verify add to cart functionality
5. Test checkout flow

## Related Documentation

- [`SHOPIFY_INTEGRATION_TESTING.md`](SHOPIFY_INTEGRATION_TESTING.md) - Comprehensive testing guide
- [`SHOPIFY_STOREFRONT_API_REFERENCE.md`](SHOPIFY_STOREFRONT_API_REFERENCE.md) - Complete API reference
- [`SHOPIFY_STOREFRONT_API_SETUP.md`](SHOPIFY_STOREFRONT_API_SETUP.md) - Setup instructions

