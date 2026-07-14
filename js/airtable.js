/**
 * Airtable API Client
 * 
 * This module provides a centralized interface for interacting with Airtable
 * through the Cloudflare Pages Function proxy. All API calls go through /api/airtable
 * to keep the API token server-side.
 */

class AirtableClient {
  constructor() {
    // API endpoint (Cloudflare Pages Function proxy)
    this.apiEndpoint = '/api/airtable';
    
    // Configuration (can be overridden via config.js)
    this.productsTable = window.AIRTABLE_CONFIG?.productsTable || 'Products';
    this.ordersTable = window.AIRTABLE_CONFIG?.ordersTable || 'Orders';
    
    // Cache for products (to reduce API calls)
    this.productsCache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    
    // Log initialization
    console.log('📊 Airtable Client initialized');
    console.log(`📋 Products Table: ${this.productsTable}`);
    console.log(`🌐 API Endpoint: ${this.apiEndpoint}`);
  }

  /**
   * Execute a request to Airtable API proxy
   * @param {string} table - Table name
   * @param {object} params - Query parameters
   * @returns {Promise<object>} - Response data
   */
  async request(table, params = {}) {
    try {
      // Build query string
      const queryParams = new URLSearchParams({
        table: table,
        ...params
      });
      
      const url = `${this.apiEndpoint}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for errors in response
      if (data.error) {
        console.error('Airtable API error:', data.error);
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error in Airtable request:', error);
      throw error;
    }
  }

  /**
   * Fetch all records from a table, handling Airtable pagination.
   * @param {string} table
   * @param {object} params
   * @returns {Promise<Array>}
   */
  async fetchAllRecords(table, params = {}) {
    const records = [];
    const seenIds = new Set();
    let offset = null;

    do {
      const pageParams = { ...params };
      if (offset) pageParams.offset = offset;

      const data = await this.request(table, pageParams);
      const pageRecords = data.records || [];
      let added = 0;

      for (const record of pageRecords) {
        if (seenIds.has(record.id)) continue;
        seenIds.add(record.id);
        records.push(record);
        added++;
      }

      // Stop if the API returned no new records (e.g. offset not supported yet)
      if (added === 0) break;

      offset = data.offset || null;
    } while (offset);

    return records;
  }

  /**
   * Get all products from Airtable
   * @param {object} options - Query options
   * @param {string} options.collection - Filter by collection
   * @param {boolean} options.activeOnly - Only return active products
   * @param {number} options.maxRecords - Maximum records to return
   * @returns {Promise<Array>} - Array of products
   */
  async getProducts(options = {}) {
    const { collection, activeOnly = true, maxRecords } = options;
    
    // Check cache
    if (this.productsCache && this.cacheTimestamp) {
      const cacheAge = Date.now() - this.cacheTimestamp;
      if (cacheAge < this.cacheTTL) {
        console.log('📦 Using cached products');
        let products = this.productsCache;
        
        // Apply filters to cached data
        if (collection) {
          products = products.filter(p => this.matchesCollection(p, collection));
        }
        if (activeOnly) {
          products = products.filter(p => p.active !== false);
        }
        if (maxRecords) {
          products = products.slice(0, maxRecords);
        }
        
        return products;
      }
    }
    
    try {
      console.log('📡 Fetching products from Airtable...');
      
      // Do not filter by Active at the API level — the Products table may not have that field.
      const params = {};
      if (maxRecords) {
        params.maxRecords = maxRecords;
      }
      
      const records = await this.fetchAllRecords(this.productsTable, params);
      
      // Transform Airtable records to product objects
      const products = this.transformProducts(records);
      
      // Cache products
      this.productsCache = products;
      this.cacheTimestamp = Date.now();
      
      console.log(`✅ Loaded ${products.length} products from Airtable`);
      
      // Apply filters
      let filteredProducts = products;
      if (collection) {
        filteredProducts = filteredProducts.filter(p => this.matchesCollection(p, collection));
        console.log(`📦 Filtered to ${filteredProducts.length} products in "${collection}" collection`);
      }
      if (maxRecords && !collection) {
        filteredProducts = filteredProducts.slice(0, maxRecords);
      }
      
      return filteredProducts;
    } catch (error) {
      console.error('Error fetching products from Airtable:', error);
      throw error;
    }
  }

  /**
   * Get products by collection
   * @param {string} collectionHandle - Collection name (e.g., "Bracelets", "Chains")
   * @param {number} maxRecords - Maximum records to return
   * @returns {Promise<Array>} - Array of products in collection
   */
  async getProductsByCollection(collectionHandle, maxRecords = 50) {
    // Normalize collection name (handle to title)
    const collectionTitle = this.normalizeCollectionName(collectionHandle);
    
    return this.getProducts({
      collection: collectionTitle,
      activeOnly: true,
      maxRecords: maxRecords
    });
  }

  /**
   * Get a single product by handle
   * @param {string} handle - Product handle
   * @returns {Promise<object|null>} - Product object or null if not found
   */
  async getProductByHandle(handle) {
    try {
      // First check cache
      if (this.productsCache) {
        const cached = this.productsCache.find(p => p.handle === handle);
        if (cached) {
          console.log(`📦 Found product in cache: ${handle}`);
          return cached;
        }
      }
      
      // Fetch from API with filter
      const params = {
        filterByFormula: `{Handle} = "${handle}"`
      };
      
      const data = await this.request(this.productsTable, params);
      
      if (data.records && data.records.length > 0) {
        const product = this.transformProduct(data.records[0]);
        console.log(`✅ Found product: ${product.title}`);
        return product;
      }
      
      console.warn(`⚠️ Product not found: ${handle}`);
      return null;
    } catch (error) {
      console.error(`Error fetching product "${handle}":`, error);
      throw error;
    }
  }

  /**
   * Get featured products for a store page section.
   * @param {string} categoryDisplay - e.g. "Chains & Bracelets"
   * @param {number} maxRecords - Maximum products to return
   * @returns {Promise<Array>}
   */
  async getFeaturedProducts(categoryDisplay, maxRecords = 4) {
    try {
      const formula = `AND({Featured}, {Category Display} = "${categoryDisplay}")`;
      const records = await this.fetchAllRecords(this.productsTable, {
        filterByFormula: formula,
      });
      const products = this.transformProducts(records);
      if (products.length > 0) {
        console.log(`✅ Loaded ${products.length} featured products for "${categoryDisplay}"`);
        return products.slice(0, maxRecords);
      }
    } catch (error) {
      console.warn(`Featured filter failed for "${categoryDisplay}":`, error.message);
    }

    const allProducts = await this.getProducts({ activeOnly: true });
    return allProducts
      .filter((p) => p.featured && p.categoryDisplay === categoryDisplay)
      .slice(0, maxRecords);
  }

  /**
   * Get collection data (title, product count)
   * @param {string} collectionHandle - Collection name
   * @returns {Promise<object>} - Collection data
   */
  async getCollection(collectionHandle) {
    const collectionTitle = this.normalizeCollectionName(collectionHandle);
    const products = await this.getProductsByCollection(collectionHandle);
    
    return {
      title: collectionTitle,
      handle: collectionHandle,
      products: {
        edges: products.map(product => ({
          node: product
        }))
      }
    };
  }

  /**
   * Transform Airtable record to product object
   * @param {object} record - Airtable record
   * @returns {object} - Product object
   */
  transformProduct(record) {
    const fields = record.fields || {};
    
    // Parse images
    let images = [];
    if (fields.Images && Array.isArray(fields.Images)) {
      // Airtable attachments
      images = fields.Images.map(img => ({
        url: img.url || img.thumbnails?.large?.url || '',
        altText: img.filename || fields.Title || '',
        width: img.width || 800,
        height: img.height || 800
      }));
    } else if (fields['Image URLs']) {
      // JSON array of URLs
      try {
        const urls = JSON.parse(fields['Image URLs']);
        images = urls.map((url, index) => ({
          url: url,
          altText: `${fields.Title} - Image ${index + 1}`,
          width: 800,
          height: 800
        }));
      } catch (e) {
        console.warn('Error parsing Image URLs:', e);
      }
    } else if (fields['Image Src']) {
      const src = fields['Image Src'];
      const primaryUrl = typeof src === 'string' ? src : src?.[0]?.url || '';
      if (primaryUrl) {
        images.push({
          url: primaryUrl,
          altText: fields['Image Alt Text'] || fields.Title || '',
          width: 800,
          height: 800
        });
      }
    }

    // Append lifestyle image from local manifest when available
    const handle = fields.Handle || '';
    if (handle && typeof getProductImagesByHandle === 'function') {
      const manifestImages = getProductImagesByHandle(handle);
      if (manifestImages?.lifestyle) {
        const hasLifestyle = images.some((img) => img.url === manifestImages.lifestyle);
        if (!hasLifestyle) {
          images.push({
            url: manifestImages.lifestyle,
            altText: manifestImages.lifestyleAlt || `${fields.Title} lifestyle`,
            width: 800,
            height: 800
          });
        }
      }
    }
    
    // Parse variants
    let variants = [];
    if (fields.Variants) {
      try {
        variants = typeof fields.Variants === 'string' 
          ? JSON.parse(fields.Variants)
          : fields.Variants;
      } catch (e) {
        console.warn('Error parsing Variants:', e);
      }
    }
    
    // Format price (Shopify CSV export uses Variant Price)
    const price = fields['Variant Price'] ?? fields.Price ?? 0;
    const priceAmount = typeof price === 'number' ? price.toString() : price;
    
    return {
      id: record.id,
      productId: fields['Product ID'] || '',
      title: fields.Title || '',
      handle: handle,
      description: fields.Description || '',
      descriptionHtml: fields.Description || '',
      price: parseFloat(priceAmount),
      priceRange: {
        minVariantPrice: {
          amount: priceAmount,
          currencyCode: 'USD'
        },
        maxVariantPrice: {
          amount: priceAmount,
          currencyCode: 'USD'
        }
      },
      images: {
        edges: images.map(img => ({
          node: img
        }))
      },
      variants: variants,
      collection: fields.Collection || this.inferCollectionFromHandle(handle),
      categoryDisplay: fields['Category Display'] || '',
      featured: fields.Featured === true,
      careInstructions: fields['Care Instructions'] || fields['Care guide (product.metafields.descriptors.care_guide)'] || '',
      buyButtonId: fields['Shopify Buy Button ID'] || '',
      shopifyProductId: fields['Shopify Product ID'] || '',
      active: fields.Active !== false,
      sortOrder: fields['Sort Order'] || this.extractSortOrder(handle)
    };
  }

  /**
   * Transform multiple Airtable records to product array
   * @param {Array} records - Array of Airtable records
   * @returns {Array} - Array of product objects
   */
  transformProducts(records) {
    const byHandle = new Map();

    for (const record of records) {
      const product = this.transformProduct(record);
      if (!product.handle || product.active === false) continue;

      // One carousel card per handle (Airtable has one row per size variant)
      if (!byHandle.has(product.handle)) {
        byHandle.set(product.handle, product);
      }
    }

    return [...byHandle.values()].sort((a, b) => {
      const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Infer collection title from product handle when Airtable Collection field is empty.
   * @param {string} handle
   * @returns {string}
   */
  inferCollectionFromHandle(handle) {
    if (!handle) return '';
    if (handle.includes('-tshirt')) return 'T-shirts';
    if (handle.includes('-hoodie')) return 'Hoodies';
    if (handle.includes('-bracelet')) return 'Bracelets';
    if (handle.includes('-chain')) return 'Chains';
    return '';
  }

  /**
   * Extract numeric sort order from handles like "003-black-tshirt".
   * @param {string} handle
   * @returns {number}
   */
  extractSortOrder(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Match product to a collection title (handles inferred collections).
   * @param {object} product
   * @param {string} collectionTitle
   * @returns {boolean}
   */
  matchesCollection(product, collectionTitle) {
    if (!collectionTitle) return true;
    const normalizedTarget = collectionTitle.toLowerCase();
    const productCollection = (product.collection || this.inferCollectionFromHandle(product.handle) || '').toLowerCase();
    return productCollection === normalizedTarget;
  }

  /**
   * Normalize collection handle to title
   * @param {string} handle - Collection handle (e.g., "bracelets", "t-shirts")
   * @returns {string} - Collection title (e.g., "Bracelets", "T-shirts")
   */
  normalizeCollectionName(handle) {
    if (!handle) return '';
    
    // Handle special cases
    const specialCases = {
      't-shirts': 'T-shirts',
      't-shirts': 'T-shirts'
    };
    
    if (specialCases[handle.toLowerCase()]) {
      return specialCases[handle.toLowerCase()];
    }
    
    // Convert handle to title: "bracelets" -> "Bracelets"
    return handle
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Clear products cache
   */
  clearCache() {
    this.productsCache = null;
    this.cacheTimestamp = null;
    console.log('🗑️ Products cache cleared');
  }

  /**
   * Format price for display
   * @param {number|string} amount - Price amount
   * @param {string} currencyCode - Currency code (default: USD)
   * @returns {string} - Formatted price
   */
  formatPrice(amount, currencyCode = 'USD') {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(numAmount);
  }
}

// Initialize and expose globally
if (typeof window !== 'undefined') {
  window.airtable = new AirtableClient();
  console.log('✅ Airtable client loaded and ready');
}

