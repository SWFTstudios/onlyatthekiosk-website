/**
 * Cart State Management
 * 
 * Handles cart operations, localStorage persistence, and cart count display.
 * Integrates with Shopify Cart API through the Cloudflare Pages Function proxy.
 */

class CartManager {
  constructor() {
    this.cartId = null;
    this.cartItems = [];
    this.cartCount = 0;
    this.cartTotal = 0;
    this.isLoading = false;
    
    // Load cart from localStorage on initialization
    this.loadCartFromStorage();
    
    // Update cart count display
    this.updateCartCount();
  }

  /**
   * Load cart data from localStorage
   */
  loadCartFromStorage() {
    try {
      const storedCartId = localStorage.getItem('shopify_cart_id');
      const storedCartItems = localStorage.getItem('shopify_cart_items');
      
      if (storedCartId) {
        this.cartId = storedCartId;
      }
      
      if (storedCartItems) {
        this.cartItems = JSON.parse(storedCartItems);
        this.calculateCartCount();
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.clearCart();
    }
  }

  /**
   * Save cart data to localStorage
   */
  saveCartToStorage() {
    try {
      if (this.cartId) {
        localStorage.setItem('shopify_cart_id', this.cartId);
      }
      localStorage.setItem('shopify_cart_items', JSON.stringify(this.cartItems));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  /**
   * Calculate cart count from items
   */
  calculateCartCount() {
    this.cartCount = this.cartItems.reduce((total, item) => {
      return total + (item.quantity || 0);
    }, 0);
  }

  /**
   * Calculate cart total from items
   */
  calculateCartTotal() {
    this.cartTotal = this.cartItems.reduce((total, item) => {
      const price = parseFloat(item.variant?.price?.amount || item.price || 0);
      return total + (price * (item.quantity || 0));
    }, 0);
  }

  /**
   * Update cart count display in UI
   */
  updateCartCount() {
    this.calculateCartCount();
    
    // Update cart count badge/element if it exists
    const cartCountElements = document.querySelectorAll('.cart-count, [data-cart-count]');
    cartCountElements.forEach(element => {
      element.textContent = this.cartCount;
      element.style.display = this.cartCount > 0 ? 'inline-block' : 'none';
    });
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: {
        count: this.cartCount,
        total: this.cartTotal,
        items: this.cartItems
      }
    }));
  }

  /**
   * Create a new cart or get existing cart
   * @returns {Promise<object>} - Cart data
   */
  async createCart() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('/api/shopify-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart) {
        this.cartId = data.cart.id;
        this.updateCartFromResponse(data.cart);
        this.saveCartToStorage();
        this.updateCartCount();
      }

      return data.cart;
    } catch (error) {
      console.error('Error creating cart:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Add item to cart
   * @param {string} variantId - Shopify variant ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<object>} - Updated cart data
   */
  async addItem(variantId, quantity = 1) {
    if (this.isLoading) {
      return;
    }

    // Ensure we have a cart
    if (!this.cartId) {
      await this.createCart();
    }

    this.isLoading = true;

    try {
      const response = await fetch('/api/shopify-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          cartId: this.cartId,
          variantId: variantId,
          quantity: quantity
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart) {
        this.updateCartFromResponse(data.cart);
        this.saveCartToStorage();
        this.updateCartCount();
      }

      return data.cart;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Update item quantity in cart
   * @param {string} lineId - Cart line item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<object>} - Updated cart data
   */
  async updateItem(lineId, quantity) {
    if (this.isLoading || !this.cartId) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('/api/shopify-cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          cartId: this.cartId,
          lineId: lineId,
          quantity: quantity
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart) {
        this.updateCartFromResponse(data.cart);
        this.saveCartToStorage();
        this.updateCartCount();
      }

      return data.cart;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Remove item from cart
   * @param {string} lineId - Cart line item ID
   * @returns {Promise<object>} - Updated cart data
   */
  async removeItem(lineId) {
    if (this.isLoading || !this.cartId) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('/api/shopify-cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'remove',
          cartId: this.cartId,
          lineId: lineId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart) {
        this.updateCartFromResponse(data.cart);
        this.saveCartToStorage();
        this.updateCartCount();
      }

      return data.cart;
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get current cart data
   * @returns {Promise<object>} - Cart data
   */
  async getCart() {
    if (!this.cartId) {
      return null;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch(`/api/shopify-cart?cartId=${this.cartId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart) {
        this.updateCartFromResponse(data.cart);
        this.saveCartToStorage();
        this.updateCartCount();
      }

      return data.cart;
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Update cart state from Shopify API response
   * @param {object} cart - Cart object from Shopify API
   */
  updateCartFromResponse(cart) {
    this.cartId = cart.id;
    this.cartItems = cart.lines?.edges?.map(edge => ({
      id: edge.node.id,
      variantId: edge.node.merchandise.id,
      quantity: edge.node.quantity,
      variant: edge.node.merchandise,
      price: edge.node.cost?.totalAmount?.amount
    })) || [];
    
    this.calculateCartCount();
    this.calculateCartTotal();
  }

  /**
   * Clear cart (local only, doesn't delete from Shopify)
   */
  clearCart() {
    this.cartId = null;
    this.cartItems = [];
    this.cartCount = 0;
    this.cartTotal = 0;
    localStorage.removeItem('shopify_cart_id');
    localStorage.removeItem('shopify_cart_items');
    this.updateCartCount();
  }

  /**
   * Get cart items array
   * @returns {Array} - Cart items
   */
  getItems() {
    return this.cartItems;
  }

  /**
   * Get cart count
   * @returns {number} - Cart item count
   */
  getCount() {
    return this.cartCount;
  }

  /**
   * Get cart total
   * @returns {number} - Cart total amount
   */
  getTotal() {
    return this.cartTotal;
  }
}

// Create and export singleton instance
const cart = new CartManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cart;
}

// Make available globally
window.cart = cart;

