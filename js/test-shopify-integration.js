/**
 * Shopify Integration Test Script
 * 
 * Run this in the browser console on any page to test the Shopify integration.
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire file, or load it as a script
 * 4. Run: testShopifyIntegration()
 */

async function testShopifyIntegration() {
  console.log('%c🧪 Testing Shopify Integration...', 'font-size: 16px; font-weight: bold; color: #0066cc;');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Test 1: Check Shopify client
  console.log('1️⃣  Checking Shopify client...');
  if (!window.shopify) {
    console.error('   ❌ Shopify client not loaded');
    console.error('   → Check if js/shopify.js is included in the page');
    results.failed++;
    return results;
  }
  console.log('   ✅ Shopify client loaded');
  results.passed++;

  // Test 2: Test API endpoint
  console.log('\n2️⃣  Testing API endpoint...');
  try {
    const response = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            shop {
              name
            }
            collections(first: 1) {
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
    });
    
    if (!response.ok) {
      console.error(`   ❌ API endpoint failed: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('   → Error details:', errorData);
      results.failed++;
      return results;
    }
    
    const data = await response.json();
    if (data.errors) {
      console.error('   ❌ GraphQL errors:', data.errors);
      results.failed++;
      return results;
    }
    
    if (data.data && data.data.shop) {
      console.log(`   ✅ API endpoint working`);
      console.log(`   ✅ Shop name: ${data.data.shop.name}`);
      if (data.data.collections && data.data.collections.edges.length > 0) {
        console.log(`   ✅ Collections accessible`);
        console.log(`   → Sample collection: ${data.data.collections.edges[0].node.title}`);
      }
      results.passed++;
    } else {
      console.warn('   ⚠️  API responded but data structure unexpected');
      results.warnings++;
    }
  } catch (error) {
    console.error('   ❌ API test failed:', error.message);
    console.error('   → Check if Cloudflare Pages Functions are deployed');
    console.error('   → Verify SHOPIFY_STOREFRONT_TOKEN is set in environment variables');
    results.failed++;
    return results;
  }

  // Test 3: Test collection loading (if on collection page)
  const urlParams = new URLSearchParams(window.location.search);
  const collectionHandle = urlParams.get('collection');
  
  if (collectionHandle) {
    console.log(`\n3️⃣  Testing collection loading: "${collectionHandle}"...`);
    try {
      const collection = await window.shopify.getProductsByCollection(collectionHandle, 5);
      
      if (collection && collection.title) {
        console.log(`   ✅ Collection loaded: "${collection.title}"`);
        
        if (collection.products && collection.products.edges.length > 0) {
          console.log(`   ✅ Products found: ${collection.products.edges.length}`);
          console.log(`   → Sample products:`);
          collection.products.edges.slice(0, 3).forEach((edge, i) => {
            const product = edge.node;
            const price = product.priceRange?.minVariantPrice;
            const priceStr = price ? `${price.amount} ${price.currencyCode}` : 'N/A';
            console.log(`      ${i + 1}. ${product.title} - ${priceStr}`);
          });
          results.passed++;
        } else {
          console.warn('   ⚠️  Collection found but no products');
          console.warn('   → Check if products are assigned to this collection in Shopify');
          results.warnings++;
        }
      } else {
        console.error('   ❌ Collection not found or invalid response');
        console.error('   → Verify collection handle matches Shopify (case-sensitive)');
        results.failed++;
      }
    } catch (error) {
      console.error('   ❌ Collection load failed:', error.message);
      results.failed++;
    }
  } else {
    console.log('\n3️⃣  Skipping collection test (not on a collection page)');
    console.log('   → Navigate to a collection page (e.g., ?collection=bracelets) to test');
  }

  // Test 4: Test product fetch (if product handle available)
  const productHandle = document.querySelector('[data-product-handle]')?.getAttribute('data-product-handle');
  if (productHandle && !productHandle.startsWith('product-handle-')) {
    console.log(`\n4️⃣  Testing product fetch: "${productHandle}"...`);
    try {
      const product = await window.shopify.getProductByHandle(productHandle);
      
      if (product && product.title) {
        console.log(`   ✅ Product loaded: "${product.title}"`);
        
        // Check images
        if (product.images && product.images.edges.length > 0) {
          console.log(`   ✅ Images found: ${product.images.edges.length}`);
        } else {
          console.warn('   ⚠️  No images found for product');
          results.warnings++;
        }
        
        // Check metafields
        const careGuide = window.shopify.getCareGuide(product);
        if (careGuide) {
          console.log(`   ✅ Care guide metafield found`);
        } else {
          console.warn('   ⚠️  Care guide metafield not found');
          console.warn('   → Verify metafield "descriptors.care_guide" exists in Shopify');
          results.warnings++;
        }
        
        // Check variants
        if (product.variants && product.variants.edges.length > 0) {
          console.log(`   ✅ Variants found: ${product.variants.edges.length}`);
        } else {
          console.warn('   ⚠️  No variants found');
          results.warnings++;
        }
        
        results.passed++;
      } else {
        console.error('   ❌ Product not found or invalid response');
        results.failed++;
      }
    } catch (error) {
      console.error('   ❌ Product fetch failed:', error.message);
      results.failed++;
    }
  } else {
    console.log('\n4️⃣  Skipping product test (no product handle found on page)');
  }

  // Test 5: Check for common issues
  console.log('\n5️⃣  Checking for common issues...');
  const issues = [];
  
  // Check if on localhost without server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (!window.location.pathname.includes('/api/')) {
      issues.push('Running on localhost - API calls may fail without Cloudflare Pages Functions');
    }
  }
  
  // Check for CORS errors
  const networkErrors = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('/api/shopify'))
    .filter(entry => entry.transferSize === 0 && entry.decodedBodySize === 0);
  
  if (networkErrors.length > 0) {
    issues.push('Possible network errors detected - check Network tab');
  }
  
  if (issues.length > 0) {
    console.warn('   ⚠️  Potential issues:');
    issues.forEach(issue => console.warn(`      - ${issue}`));
    results.warnings++;
  } else {
    console.log('   ✅ No obvious issues detected');
    results.passed++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('%c📊 Test Summary', 'font-size: 14px; font-weight: bold;');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Warnings: ${results.warnings}`);
  
  if (results.failed === 0 && results.warnings === 0) {
    console.log('\n%c🎉 All tests passed! Integration is working correctly.', 'font-size: 14px; font-weight: bold; color: #00aa00;');
  } else if (results.failed === 0) {
    console.log('\n%c✅ Integration is working, but some warnings to review.', 'font-size: 14px; font-weight: bold; color: #ffaa00;');
  } else {
    console.log('\n%c❌ Some tests failed. Check the errors above.', 'font-size: 14px; font-weight: bold; color: #cc0000;');
  }
  
  return results;
}

// Auto-run if on a collection page
if (window.location.search.includes('collection=')) {
  console.log('%c💡 Collection page detected. Run testShopifyIntegration() to test.', 'color: #0066cc;');
}

// Make function globally available
window.testShopifyIntegration = testShopifyIntegration;

