/**
 * Configuration File
 * 
 * Stores non-sensitive configuration values for the Shopify integration.
 * Sensitive values (API tokens) should be stored in environment variables.
 */

// Shopify Configuration
window.SHOPIFY_CONFIG = {
  // Store domain (can be overridden via environment variable)
  storeDomain: 'onlyatthekiosk.com',
  
  // API version (can be overridden via environment variable)
  apiVersion: '2024-01',
  
  // Feature flags
  features: {
    // Enable/disable cart persistence
    cartPersistence: true,
    
    // Enable/disable checkout redirect
    checkoutRedirect: true,
    
    // Enable/disable product image lazy loading
    lazyLoadImages: true,
    
    // Enable/disable product drawer animations
    drawerAnimations: true
  },
  
  // UI Configuration
  ui: {
    // Cart count update delay (ms)
    cartUpdateDelay: 300,
    
    // Product image placeholder
    imagePlaceholder: '/images/kiosk-placeholder-product-img.webp',
    
    // Default currency
    defaultCurrency: 'USD'
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SHOPIFY_CONFIG;
}

