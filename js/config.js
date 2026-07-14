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

// Store page featured products and hero categories
window.STORE_CONFIG = {
  currency: 'USD',
  heroCategories: [
    {
      label: 'Hoodies',
      href: 'collections/hoodies.html',
      image: '/images/store/hero-hoodies.webp',
      lifestyleHandle: '001-black-hoodie',
    },
    {
      label: 'Chains',
      href: 'collections/chains.html',
      image: '/images/store/hero-chains.webp',
      lifestyleHandle: '001-gold-chain',
    },
    {
      label: 'Bracelets',
      href: 'collections/bracelets.html',
      image: '/images/store/hero-bracelets.webp',
      lifestyleHandle: '001-gold-bracelet',
    },
  ],
  featuredSections: {
    'Chains & Bracelets': {
      handles: ['001-gold-chain', '001-silver-chain', '001-gold-bracelet', '002-gold-chain'],
      fallbackPrices: {
        '001-gold-chain': 79.99,
        '001-silver-chain': 69.99,
        '001-gold-bracelet': 59.99,
        '002-gold-chain': 79.99,
      },
    },
    'T-Shirts & Hoodies': {
      handles: ['001-black-hoodie', '001-white-hoodie', '001-black-tshirt', '001-white-tshirt'],
      fallbackPrices: {
        '001-black-hoodie': 89.99,
        '001-white-hoodie': 89.99,
        '001-black-tshirt': 39.99,
        '001-white-tshirt': 39.99,
      },
    },
  },
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

