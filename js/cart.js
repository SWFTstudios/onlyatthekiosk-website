/**
 * Cart State Management (local, Stripe-backed)
 *
 * The cart lives in localStorage. Each line is a product + chosen size.
 * Checkout hands the cart to /api/checkout, which builds a Stripe Checkout
 * Session server-side. No prices are trusted from here — they're only used for
 * display; the server re-prices everything against Airtable.
 */

const CART_STORAGE_KEY = 'kiosk_cart';

class CartManager {
  constructor() {
    this.items = [];
    this.load();
  }

  // Stable key per product+size so the same shirt in two sizes are separate lines.
  static keyFor(handle, size) {
    return `${handle}::${size || ''}`;
  }

  load() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this.items)) this.items = [];
    } catch {
      this.items = [];
    }
    this.emit();
  }

  save() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.error('Could not save cart:', e);
    }
    this.emit();
  }

  /**
   * Add a product to the cart.
   * @param {object} product - { handle, title, price, image }
   * @param {string} size - chosen size ('' if the product has none)
   * @param {number} quantity
   */
  addItem(product, size = '', quantity = 1) {
    if (!product || !product.handle) {
      throw new Error('addItem requires a product with a handle');
    }
    const key = CartManager.keyFor(product.handle, size);
    const existing = this.items.find((i) => i.key === key);

    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + quantity);
    } else {
      this.items.push({
        key,
        handle: product.handle,
        title: product.title || product.handle,
        price: Number(product.price) || 0,
        image: product.image || (product.images && product.images[0] && product.images[0].url) || '',
        size: size || '',
        quantity: Math.max(1, Math.min(10, quantity)),
      });
    }
    this.save();
  }

  removeItem(key) {
    this.items = this.items.filter((i) => i.key !== key);
    this.save();
  }

  setQuantity(key, quantity) {
    const item = this.items.find((i) => i.key === key);
    if (!item) return;
    const q = parseInt(quantity, 10) || 0;
    if (q <= 0) {
      this.removeItem(key);
      return;
    }
    item.quantity = Math.min(10, q);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.reduce((n, i) => n + i.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  // The payload /api/checkout expects.
  toCheckoutPayload() {
    return {
      items: this.items.map((i) => ({ handle: i.handle, size: i.size, quantity: i.quantity })),
    };
  }

  // Update any cart-count badges and broadcast a change event.
  emit() {
    const count = this.getCount();
    document.querySelectorAll('.cart-count, [data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
    window.dispatchEvent(
      new CustomEvent('cartUpdated', {
        detail: { count, subtotal: this.getSubtotal(), items: this.items },
      })
    );
  }

  static formatPrice(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);
  }
}

const cart = new CartManager();
window.cart = cart;
window.CartManager = CartManager;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = cart;
}
