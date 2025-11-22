/**
 * Shopify Storefront API Client
 * 
 * This module provides a centralized interface for interacting with the Shopify Storefront API
 * through the Cloudflare Pages Function proxy. All API calls go through /api/shopify to keep
 * the API token server-side.
 */

class ShopifyClient {
  constructor() {
    // API endpoint (Cloudflare Pages Function proxy)
    this.apiEndpoint = '/api/shopify';
    
    // Store configuration (can be overridden via config.js)
    this.storeDomain = window.SHOPIFY_CONFIG?.storeDomain || 'onlyatthekiosk.com';
    this.apiVersion = window.SHOPIFY_CONFIG?.apiVersion || '2024-01';
    
    // Log initialization
    console.log('🛍️ Shopify Client initialized');
    console.log(`📡 Store: ${this.storeDomain}`);
    console.log(`🔌 API Version: ${this.apiVersion}`);
    console.log(`🌐 API Endpoint: ${this.apiEndpoint}`);
  }

  /**
   * Execute a GraphQL query against Shopify Storefront API
   * @param {string} query - GraphQL query string
   * @param {object} variables - GraphQL variables (optional)
   * @returns {Promise<object>} - Response data
   */
  async query(query, variables = {}) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for GraphQL errors
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0]?.message || 'GraphQL query error');
      }

      return data.data;
    } catch (error) {
      console.error('Shopify API request failed:', error);
      throw error;
    }
  }

  /**
   * Fetch all products (with pagination)
   * @param {number} first - Number of products to fetch (default: 20)
   * @param {string} after - Cursor for pagination (optional)
   * @returns {Promise<object>} - Products data
   */
  async getProducts(first = 20, after = null) {
    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              metafields(identifiers: [
                {namespace: "descriptors", key: "care_guide"}
              ]) {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `;

    const variables = { first };
    if (after) {
      variables.after = after;
    }

    return this.query(query, variables);
  }

  /**
   * Fetch a single product by handle
   * @param {string} handle - Product handle (e.g., "bracelet-model-a")
   * @returns {Promise<object>} - Product data
   */
  async getProductByHandle(handle) {
    const query = `
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          title
          handle
          description
          descriptionHtml
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                quantityAvailable
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          metafields(identifiers: [
            {namespace: "descriptors", key: "care_guide"}
          ]) {
            namespace
            key
            value
            type
          }
        }
      }
    `;

    const data = await this.query(query, { handle });
    return data.product;
  }

  /**
   * Fetch products by collection handle
   * @param {string} collectionHandle - Collection handle (e.g., "bracelets")
   * @param {number} first - Number of products to fetch (default: 20)
   * @returns {Promise<object>} - Products data
   */
  async getProductsByCollection(collectionHandle, first = 20) {
    const query = `
      query getCollectionProducts($handle: String!, $first: Int!) {
        collection(handle: $handle) {
          id
          title
          description
          descriptionHtml
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                descriptionHtml
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 5) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 5) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      availableForSale
                      quantityAvailable
                    }
                  }
                }
                metafields(identifiers: [
                  {namespace: "descriptors", key: "care_guide"}
                ]) {
                  namespace
                  key
                  value
                  type
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { handle: collectionHandle, first });
    return data.collection;
  }

  /**
   * Fetch all collections
   * @param {number} first - Number of collections to fetch (default: 20)
   * @returns {Promise<object>} - Collections data
   */
  async getCollections(first = 20) {
    const query = `
      query getCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              image {
                url
                altText
              }
            }
          }
        }
      }
    `;

    return this.query(query, { first });
  }

  /**
   * Fetch a single collection by handle
   * @param {string} handle - Collection handle (e.g., "bracelets")
   * @returns {Promise<object>} - Collection data
   */
  async getCollectionByHandle(handle) {
    const query = `
      query getCollectionByHandle($handle: String!) {
        collection(handle: $handle) {
          id
          title
          handle
          description
          descriptionHtml
          image {
            url
            altText
          }
        }
      }
    `;

    const data = await this.query(query, { handle });
    return data.collection;
  }

  /**
   * Format price for display
   * @param {string} amount - Price amount (as string, e.g., "49.99")
   * @param {string} currencyCode - Currency code (e.g., "USD")
   * @returns {string} - Formatted price (e.g., "$49.99")
   */
  formatPrice(amount, currencyCode = 'USD') {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(numAmount);
  }

  /**
   * Extract product images array from GraphQL response
   * @param {object} product - Product object from GraphQL
   * @returns {Array<string>} - Array of image URLs
   */
  getProductImages(product) {
    if (!product || !product.images || !product.images.edges) {
      return [];
    }
    return product.images.edges.map(edge => edge.node.url);
  }

  /**
   * Get primary product image URL
   * @param {object} product - Product object from GraphQL
   * @returns {string|null} - Primary image URL or null
   */
  getPrimaryImage(product) {
    const images = this.getProductImages(product);
    return images.length > 0 ? images[0] : null;
  }

  /**
   * Get product variant by ID
   * @param {object} product - Product object from GraphQL
   * @param {string} variantId - Variant ID
   * @returns {object|null} - Variant object or null
   */
  getVariantById(product, variantId) {
    if (!product || !product.variants || !product.variants.edges) {
      return null;
    }
    const variant = product.variants.edges.find(edge => edge.node.id === variantId);
    return variant ? variant.node : null;
  }

  /**
   * Get metafield value by namespace and key
   * @param {object} product - Product object from GraphQL
   * @param {string} namespace - Metafield namespace (e.g., "descriptors")
   * @param {string} key - Metafield key (e.g., "care_guide")
   * @returns {string|null} - Metafield value or null
   */
  getMetafield(product, namespace, key) {
    if (!product || !product.metafields) {
      return null;
    }
    const metafield = product.metafields.find(
      mf => mf.namespace === namespace && mf.key === key
    );
    return metafield ? metafield.value : null;
  }

  /**
   * Get care guide metafield (convenience method)
   * @param {object} product - Product object from GraphQL
   * @returns {string|null} - Care guide content or null
   */
  getCareGuide(product) {
    return this.getMetafield(product, 'descriptors', 'care_guide');
  }
}

// Create and export singleton instance
const shopify = new ShopifyClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = shopify;
}

// Make available globally
window.shopify = shopify;

