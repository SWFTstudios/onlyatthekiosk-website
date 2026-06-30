/**
 * Checkout Flow (Stripe)
 *
 * Sends the local cart to /api/checkout, which creates a Stripe Checkout
 * Session and returns its hosted URL. We then redirect the shopper to Stripe.
 */

class CheckoutManager {
  /**
   * Create a Stripe Checkout Session for the current cart and redirect to it.
   */
  async redirectToCheckout() {
    if (!window.cart || window.cart.getCount() === 0) {
      alert('Your cart is empty.');
      return;
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.cart.toCheckoutPayload()),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        const msg = data.details || data.error || 'Checkout is unavailable right now.';
        throw new Error(msg);
      }

      // Off to Stripe's hosted checkout.
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Could not start checkout: ' + error.message);
    }
  }

  /**
   * If we've returned from a cancelled checkout, leave the cart intact.
   * The cart is cleared on the success page instead.
   */
  checkReturnFromCheckout() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'cancelled') {
      // Nothing to do — cart is preserved so the shopper can try again.
      return 'cancelled';
    }
    return null;
  }
}

const checkout = new CheckoutManager();
window.checkout = checkout;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => checkout.checkReturnFromCheckout());
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = checkout;
}
