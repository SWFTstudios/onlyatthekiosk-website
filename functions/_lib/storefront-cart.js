/**
 * Storefront Cart helpers used by /api/cart.
 * Pins a current Storefront API version (buyer identity needs newer than 2024-01).
 */

const STOREFRONT_API_VERSION = '2026-07';

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { totalAmount { amount currencyCode } }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            product { title handle }
            image { url altText }
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

function shopifyUrl(env) {
  const store = (env.SHOPIFY_STORE || 'onlyatthekiosk.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ver = env.SHOPIFY_STOREFRONT_API_VERSION || STOREFRONT_API_VERSION;
  return `https://${store}/api/${ver}/graphql.json`;
}

export async function storefrontGraphql(env, query, variables = {}) {
  const token = env.SHOPIFY_STOREFRONT_TOKEN;
  if (!token) throw new Error('SHOPIFY_STOREFRONT_TOKEN is not configured');
  const res = await fetch(shopifyUrl(env), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) {
    const msg = (data.errors && data.errors[0] && data.errors[0].message) || `Storefront API ${res.status}`;
    throw new Error(msg);
  }
  return data.data;
}

function normalizeCart(cart) {
  if (!cart) return null;
  const lines = ((cart.lines && cart.lines.edges) || []).map((e) => {
    const n = e.node || {};
    const m = n.merchandise || {};
    return {
      id: n.id,
      quantity: n.quantity,
      variantId: m.id,
      title: (m.product && m.product.title) || m.title || '',
      variantTitle: m.title || '',
      handle: (m.product && m.product.handle) || '',
      image: (m.image && m.image.url) || null,
      imageAlt: (m.image && m.image.altText) || '',
      price: m.price || null,
      options: m.selectedOptions || [],
    };
  });
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity || 0,
    cost: (cart.cost && cart.cost.totalAmount) || null,
    lines,
  };
}

export async function createCart(env, { lines = [], buyerIdentity = null } = {}) {
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`;
  const input = {};
  if (lines.length) input.lines = lines;
  if (buyerIdentity) input.buyerIdentity = buyerIdentity;
  const data = await storefrontGraphql(env, mutation, { input });
  const payload = data.cartCreate;
  if (payload.userErrors && payload.userErrors.length) {
    throw new Error(payload.userErrors[0].message);
  }
  return normalizeCart(payload.cart);
}

export async function getCart(env, cartId) {
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) { ${CART_FIELDS} }
    }`;
  const data = await storefrontGraphql(env, query, { id: cartId });
  return normalizeCart(data.cart);
}

export async function addLines(env, cartId, lines) {
  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`;
  const data = await storefrontGraphql(env, mutation, { cartId, lines });
  const payload = data.cartLinesAdd;
  if (payload.userErrors && payload.userErrors.length) {
    throw new Error(payload.userErrors[0].message);
  }
  return normalizeCart(payload.cart);
}

export async function updateLines(env, cartId, lines) {
  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`;
  const data = await storefrontGraphql(env, mutation, { cartId, lines });
  const payload = data.cartLinesUpdate;
  if (payload.userErrors && payload.userErrors.length) {
    throw new Error(payload.userErrors[0].message);
  }
  return normalizeCart(payload.cart);
}

export async function removeLines(env, cartId, lineIds) {
  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`;
  const data = await storefrontGraphql(env, mutation, { cartId, lineIds });
  const payload = data.cartLinesRemove;
  if (payload.userErrors && payload.userErrors.length) {
    throw new Error(payload.userErrors[0].message);
  }
  return normalizeCart(payload.cart);
}

/** Link a cart to a member (buyerIdentity: { email }) so checkout is pre-filled. */
export async function attachBuyer(env, cartId, buyerIdentity) {
  const mutation = `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`;
  const data = await storefrontGraphql(env, mutation, {
    cartId,
    buyerIdentity,
  });
  const payload = data.cartBuyerIdentityUpdate;
  if (payload.userErrors && payload.userErrors.length) {
    throw new Error(payload.userErrors[0].message);
  }
  return normalizeCart(payload.cart);
}

export { STOREFRONT_API_VERSION, normalizeCart };
