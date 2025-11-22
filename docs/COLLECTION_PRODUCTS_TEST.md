# Collection Products Test Guide

This guide helps you verify that each collection page is pulling the exact amount of products from Shopify.

## Quick Test

### Method 1: Browser Console (Recommended)

1. **Open any collection page** (e.g., `collections/bracelets.html`)
2. **Open browser DevTools** → Console tab
3. **Load the test script:**
   ```javascript
   // Copy and paste the entire contents of js/test-collection-products.js
   // Or load it directly:
   const script = document.createElement('script');
   script.src = 'js/test-collection-products.js';
   document.head.appendChild(script);
   ```
4. **Run the test:**
   ```javascript
   testAllCollections()
   ```

### Method 2: Quick Count Test

For a faster test that just shows counts:

```javascript
quickCountTest()
```

This will quickly test all collections and show product counts.

### Method 3: Test Individual Collection

Test a specific collection:

```javascript
// Test bracelets
testCollection('bracelets')

// Test with expected count
testCollectionWithExpected('bracelets', 20)
```

## Expected Results

Based on your product structure:

| Collection | Expected Products | Notes |
|------------|------------------|-------|
| Bracelets | 20 | 10 Gold + 10 Silver |
| Chains | 20 | 10 Gold + 10 Silver |
| Hoodies | 20 | 10 Black + 10 White |
| T-shirts | 20 | 10 Black + 10 White |

**Total Expected: 80 products**

## Test Output

### Successful Test Output

```
🚀 Starting Collection Products Test
=====================================

🧪 Testing collection: "bracelets"
📡 Store: onlyatthekiosk.com
✅ Collection found: "Bracelets"
📦 Products found: 20
📋 Product list:
   1. #001 Gold Bracelet (001-gold-bracelet)
   2. #002 Gold Bracelet (002-gold-bracelet)
   ...

📊 Test Summary
=====================================
Store: onlyatthekiosk.com
Collections Tested: 4
✅ Successful: 4
❌ Failed: 0
📦 Total Products: 80
```

### Failed Test Output

If a collection fails, you'll see:

```
❌ Error testing collection "chains": Collection "chains" not found in Shopify
```

## Troubleshooting

### Issue: "Shopify client not loaded"

**Solution:**
- Ensure `js/shopify.js` is loaded
- Check browser Network tab - file should load with `200 OK`
- Verify `js/config.js` is loaded before `js/shopify.js`

### Issue: "Collection not found"

**Solution:**
1. Check collection handle matches exactly (case-sensitive)
2. Verify collection exists in Shopify Admin
3. Check collection handle in Shopify:
   - Go to Shopify Admin → Products → Collections
   - Click on the collection
   - Check URL: `.../collections/bracelets` (handle is in URL)

### Issue: Product count doesn't match expected

**Possible causes:**
1. Products not assigned to collection in Shopify
2. Collection conditions don't match products (for smart collections)
3. Products not published/active
4. Collection handle mismatch

**Solution:**
1. Go to Shopify Admin → Products → Collections
2. Click on the collection
3. Verify products are listed
4. For smart collections, check conditions match products
5. Verify product tags match collection conditions

### Issue: "401 Unauthorized" or API errors

**Solution:**
1. Check `SHOPIFY_STOREFRONT_TOKEN` in Cloudflare Pages
2. Verify token is valid in Shopify Admin
3. Check Network tab for `/api/shopify` requests
4. Verify API endpoint is accessible

## Automated Testing

### Run Test on Page Load

Add this to any collection page to auto-run the test:

```html
<script>
  // Wait for Shopify client to load
  window.addEventListener('load', function() {
    setTimeout(() => {
      if (window.shopify && window.testAllCollections) {
        console.log('🧪 Auto-running collection products test...');
        testAllCollections().then(results => {
          // Store results for inspection
          window.testResults = results;
          console.log('✅ Test complete. Results stored in window.testResults');
        });
      }
    }, 2000);
  });
</script>
```

## Test Results Analysis

The test returns a detailed results object:

```javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  store: "onlyatthekiosk.com",
  collections: [
    {
      handle: "bracelets",
      success: true,
      productCount: 20,
      collectionTitle: "Bracelets",
      products: [...]
    },
    // ... other collections
  ],
  summary: {
    total: 4,
    successful: 4,
    failed: 0,
    totalProducts: 80
  }
}
```

## Verification Checklist

After running the test, verify:

- [ ] All 4 collections tested successfully
- [ ] Each collection has the expected number of products
- [ ] Product titles match Shopify store
- [ ] Product handles are correct
- [ ] No API errors in console
- [ ] Total product count matches expected (80 products)

## Related Documentation

- [`SHOPIFY_INTEGRATION_TESTING.md`](SHOPIFY_INTEGRATION_TESTING.md) - Comprehensive testing guide
- [`VERIFY_LIVE_STORE_CONNECTION.md`](VERIFY_LIVE_STORE_CONNECTION.md) - Store connection verification
- [`SHOPIFY_STOREFRONT_API_REFERENCE.md`](SHOPIFY_STOREFRONT_API_REFERENCE.md) - API reference

