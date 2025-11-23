/**
 * Configuration File
 * 
 * Stores non-sensitive configuration values for the Shopify integration.
 * Sensitive values (API tokens) should be stored in environment variables.
 */

// Airtable Configuration
window.AIRTABLE_CONFIG = {
  // Table names (can be overridden via environment variable)
  productsTable: 'Products',
  ordersTable: 'Orders',
  
  // Feature flags
  features: {
    // Enable/disable product caching
    productCache: true,
    
    // Cache TTL in milliseconds (5 minutes)
    cacheTTL: 5 * 60 * 1000,
    
    // Enable/disable product image lazy loading
    lazyLoadImages: true,
    
    // Enable/disable product drawer animations
    drawerAnimations: true
  },
  
  // UI Configuration
  ui: {
    // Product image placeholder
    imagePlaceholder: '/images/kiosk-placeholder-product-img.webp',
    
    // Default currency
    defaultCurrency: 'USD'
  }
};

// Shopify Configuration (for Buy Button and webhooks)
window.SHOPIFY_CONFIG = {
  // Store domain (can be overridden via environment variable)
  storeDomain: 'onlyatthekiosk.com',
  
  // Buy Button configuration
  buyButton: {
    // Shopify Buy Button SDK URL
    sdkUrl: 'https://sdks.shopifycdn.com/buy-button/latest/buybutton.js',
    
    // Default button styling
    buttonStyle: {
      color: '#ff6600', // Accent color
      backgroundColor: 'transparent',
      borderRadius: '4px'
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SHOPIFY_CONFIG;
}

