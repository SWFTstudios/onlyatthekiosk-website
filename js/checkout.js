/**
 * Checkout Flow
 * 
 * Handles redirecting to Shopify checkout and processing checkout completion.
 */

class CheckoutManager {
  constructor() {
    this.checkoutUrl = null;
  }

  /**
   * Get checkout URL from cart
   * @returns {Promise<string>} - Checkout URL
   */
  async getCheckoutUrl() {
    try {
      if (!window.cart) {
        throw new Error('Cart manager not loaded');
      }

      const cartId = window.cart.cartId;
      if (!cartId) {
        throw new Error('No cart found. Please add items to cart first.');
      }

      // Get cart to retrieve checkout URL
      const cart = await window.cart.getCart();
      if (!cart || !cart.checkoutUrl) {
        throw new Error('Checkout URL not available');
      }

      this.checkoutUrl = cart.checkoutUrl;
      return this.checkoutUrl;
    } catch (error) {
      console.error('Error getting checkout URL:', error);
      throw error;
    }
  }

  /**
   * Redirect to Shopify checkout
   * @param {boolean} newWindow - Open checkout in new window (default: false)
   */
  async redirectToCheckout(newWindow = false) {
    try {
      const checkoutUrl = await this.getCheckoutUrl();
      
      if (newWindow) {
        window.open(checkoutUrl, '_blank');
      } else {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      alert('Failed to proceed to checkout: ' + error.message);
    }
  }

  /**
   * Handle checkout completion (called after returning from Shopify checkout)
   * This can be used to clear cart, show confirmation, etc.
   */
  handleCheckoutComplete() {
    // Clear cart after successful checkout
    if (window.cart) {
      window.cart.clearCart();
    }

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('checkoutComplete', {
      detail: {
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Check if we're returning from checkout
   * This checks URL parameters that Shopify might add
   */
  checkReturnFromCheckout() {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    
    if (checkoutStatus === 'success' || checkoutStatus === 'complete') {
      this.handleCheckoutComplete();
      return true;
    }
    
    return false;
  }
}

// Create and export singleton instance
const checkout = new CheckoutManager();

// Check for return from checkout on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    checkout.checkReturnFromCheckout();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = checkout;
}

// Make available globally
window.checkout = checkout;

