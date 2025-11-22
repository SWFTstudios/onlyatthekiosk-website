/**
 * Collection Products Test Script
 * 
 * Tests each collection page to verify it's pulling the exact amount of products
 * from Shopify. Run this in the browser console on any page that has the Shopify client loaded.
 * 
 * Usage:
 * 1. Open any page with Shopify integration (e.g., collections/bracelets.html)
 * 2. Open browser DevTools → Console
 * 3. Copy and paste this entire script
 * 4. Or load it: <script src="js/test-collection-products.js"></script>
 * 5. Run: testAllCollections()
 */

/**
 * Test a single collection
 * @param {string} handle - Collection handle (e.g., 'bracelets', 'chains')
 * @returns {Promise<object>} Test results
 */
async function testCollection(handle) {
  const results = {
    handle: handle,
    success: false,
    productCount: 0,
    expectedCount: null,
    products: [],
    error: null,
    collectionTitle: null,
    apiResponse: null
  };

  try {
    if (!window.shopify) {
      throw new Error('Shopify client not loaded');
    }

    console.log(`\n🧪 Testing collection: "${handle}"`);
    console.log(`📡 Store: ${window.shopify.storeDomain || 'onlyatthekiosk.com'}`);

    // Fetch collection from Shopify
    const collection = await window.shopify.getProductsByCollection(handle, 100);

    if (!collection) {
      throw new Error(`Collection "${handle}" not found in Shopify`);
    }

    results.collectionTitle = collection.title;
    results.apiResponse = collection;

    if (collection.products && collection.products.edges) {
      results.productCount = collection.products.edges.length;
      results.products = collection.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle
      }));
    } else {
      results.productCount = 0;
    }

    results.success = true;

    console.log(`✅ Collection found: "${collection.title}"`);
    console.log(`📦 Products found: ${results.productCount}`);

    if (results.productCount > 0) {
      console.log(`📋 Product list:`);
      results.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.title} (${product.handle})`);
      });
    } else {
      console.warn(`⚠️ No products found in collection "${handle}"`);
    }

  } catch (error) {
    results.error = error.message;
    results.success = false;
    console.error(`❌ Error testing collection "${handle}":`, error);
  }

  return results;
}

/**
 * Test all collections
 * @returns {Promise<object>} Test results for all collections
 */
async function testAllCollections() {
  console.log('🚀 Starting Collection Products Test');
  console.log('=====================================\n');

  if (!window.shopify) {
    console.error('❌ Shopify client not loaded. Please ensure js/shopify.js is loaded.');
    return null;
  }

  const collections = [
    { handle: 'bracelets', expectedCount: null }, // Will be determined from Shopify
    { handle: 'chains', expectedCount: null },
    { handle: 'hoodies', expectedCount: null },
    { handle: 't-shirts', expectedCount: null }
  ];

  const results = {
    timestamp: new Date().toISOString(),
    store: window.shopify.storeDomain || 'onlyatthekiosk.com',
    collections: [],
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      totalProducts: 0
    }
  };

  // Test each collection
  for (const collection of collections) {
    const testResult = await testCollection(collection.handle);
    results.collections.push({
      ...collection,
      ...testResult
    });

    if (testResult.success) {
      results.summary.successful++;
      results.summary.totalProducts += testResult.productCount;
    } else {
      results.summary.failed++;
    }

    results.summary.total++;

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n📊 Test Summary');
  console.log('=====================================');
  console.log(`Store: ${results.store}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`\nCollections Tested: ${results.summary.total}`);
  console.log(`✅ Successful: ${results.summary.successful}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`📦 Total Products: ${results.summary.totalProducts}`);

  console.log('\n📋 Detailed Results:');
  console.log('=====================================');
  results.collections.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.handle.toUpperCase()}`);
    console.log(`   Title: ${result.collectionTitle || 'N/A'}`);
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Products: ${result.productCount}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Return results for further analysis
  return results;
}

/**
 * Test a specific collection and compare with expected count
 * @param {string} handle - Collection handle
 * @param {number} expectedCount - Expected number of products
 * @returns {Promise<object>} Test results with comparison
 */
async function testCollectionWithExpected(handle, expectedCount) {
  console.log(`\n🧪 Testing collection: "${handle}" (Expected: ${expectedCount} products)`);
  
  const result = await testCollection(handle);
  
  if (result.success) {
    if (result.productCount === expectedCount) {
      console.log(`✅ PASS: Found exactly ${expectedCount} products`);
    } else if (result.productCount > expectedCount) {
      console.warn(`⚠️ WARNING: Found ${result.productCount} products, expected ${expectedCount} (${result.productCount - expectedCount} more)`);
    } else {
      console.warn(`⚠️ WARNING: Found ${result.productCount} products, expected ${expectedCount} (${expectedCount - result.productCount} missing)`);
    }
    
    result.expectedCount = expectedCount;
    result.matchesExpected = result.productCount === expectedCount;
  }
  
  return result;
}

/**
 * Quick test - just get counts for all collections
 * @returns {Promise<object>} Simple count results
 */
async function quickCountTest() {
  console.log('⚡ Quick Count Test');
  console.log('===================\n');

  if (!window.shopify) {
    console.error('❌ Shopify client not loaded');
    return null;
  }

  const collections = ['bracelets', 'chains', 'hoodies', 't-shirts'];
  const counts = {};

  for (const handle of collections) {
    try {
      const collection = await window.shopify.getProductsByCollection(handle, 100);
      const count = collection?.products?.edges?.length || 0;
      counts[handle] = {
        title: collection?.title || handle,
        count: count,
        success: true
      };
      console.log(`✅ ${handle}: ${count} products`);
    } catch (error) {
      counts[handle] = {
        count: 0,
        success: false,
        error: error.message
      };
      console.error(`❌ ${handle}: Error - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n📊 Summary:');
  const total = Object.values(counts).reduce((sum, c) => sum + c.count, 0);
  console.log(`Total products across all collections: ${total}`);

  return counts;
}

// Export functions for use
if (typeof window !== 'undefined') {
  window.testCollection = testCollection;
  window.testAllCollections = testAllCollections;
  window.testCollectionWithExpected = testCollectionWithExpected;
  window.quickCountTest = quickCountTest;
}

// Auto-run if loaded in browser console
if (typeof window !== 'undefined' && window.location) {
  console.log('📝 Collection Products Test Script Loaded');
  console.log('Available functions:');
  console.log('  - testAllCollections() - Test all collections');
  console.log('  - testCollection(handle) - Test a specific collection');
  console.log('  - testCollectionWithExpected(handle, count) - Test with expected count');
  console.log('  - quickCountTest() - Quick count of all collections');
  console.log('\n💡 Run testAllCollections() to start testing');
}

