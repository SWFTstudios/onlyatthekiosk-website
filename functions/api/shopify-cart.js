// Cloudflare Pages Function to handle Shopify Cart API operations
// This keeps the API token server-side and handles cart create, add, update, remove, and checkout

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Shopify configuration from environment variables
    const SHOPIFY_STOREFRONT_TOKEN = env.SHOPIFY_STOREFRONT_TOKEN;
    const SHOPIFY_STORE = env.SHOPIFY_STORE || 'onlyatthekiosk.com';
    const SHOPIFY_API_VERSION = env.SHOPIFY_API_VERSION || '2024-01';
    
    // Validate environment variables
    if (!SHOPIFY_STOREFRONT_TOKEN) {
      console.error('Missing SHOPIFY_STOREFRONT_TOKEN environment variable');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error. Shopify API token not configured.'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Construct Shopify API endpoint
    const shopifyApiUrl = `https://${SHOPIFY_STORE}/api/${SHOPIFY_API_VERSION}/graphql.json`;

    // Handle GET request (get cart)
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const cartId = url.searchParams.get('cartId');

      if (!cartId) {
        return new Response(
          JSON.stringify({ error: 'Cart ID is required' }),
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const query = `
        query getCart($id: ID!) {
          cart(id: $id) {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        id
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: query,
          variables: { id: cartId }
        })
      });

      const data = await response.json();

      if (!response.ok || data.errors) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to get cart',
            details: data.errors || data.message
          }),
          { 
            status: response.status || 500,
            headers: corsHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ cart: data.data.cart }),
        { 
          status: 200,
          headers: corsHeaders
        }
      );
    }

    // Handle POST request (create cart or add item)
    if (request.method === 'POST') {
      const body = await request.json();
      const { action, cartId, variantId, quantity } = body;

      if (action === 'create') {
        // Create new cart
        const mutation = `
          mutation cartCreate {
            cartCreate {
              cart {
                id
                checkoutUrl
                totalQuantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                lines(first: 100) {
                  edges {
                    node {
                      id
                      quantity
                      merchandise {
                        ... on ProductVariant {
                          id
                          title
                          price {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await fetch(shopifyApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
          },
          body: JSON.stringify({ query: mutation })
        });

        const data = await response.json();

        if (!response.ok || data.errors) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create cart',
              details: data.errors || data.message
            }),
            { 
              status: response.status || 500,
              headers: corsHeaders
            }
          );
        }

        return new Response(
          JSON.stringify({ cart: data.data.cartCreate.cart }),
          { 
            status: 200,
            headers: corsHeaders
          }
        );
      }

      if (action === 'add') {
        // Add item to cart
        if (!cartId || !variantId) {
          return new Response(
            JSON.stringify({ error: 'Cart ID and variant ID are required' }),
            { 
              status: 400,
              headers: corsHeaders
            }
          );
        }

        const mutation = `
          mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
                checkoutUrl
                totalQuantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                lines(first: 100) {
                  edges {
                    node {
                      id
                      quantity
                      merchandise {
                        ... on ProductVariant {
                          id
                          title
                          price {
                            amount
                            currencyCode
                          }
                          product {
                            id
                            title
                            handle
                            images(first: 1) {
                              edges {
                                node {
                                  url
                                  altText
                                }
                              }
                            }
                          }
                        }
                      }
                      cost {
                        totalAmount {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const response = await fetch(shopifyApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              cartId: cartId,
              lines: [{
                merchandiseId: variantId,
                quantity: quantity || 1
              }]
            }
          })
        });

        const data = await response.json();

        if (!response.ok || data.errors || (data.data.cartLinesAdd.userErrors && data.data.cartLinesAdd.userErrors.length > 0)) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to add item to cart',
              details: data.errors || data.data.cartLinesAdd.userErrors || data.message
            }),
            { 
              status: response.status || 500,
              headers: corsHeaders
            }
          );
        }

        return new Response(
          JSON.stringify({ cart: data.data.cartLinesAdd.cart }),
          { 
            status: 200,
            headers: corsHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Handle PUT request (update item quantity)
    if (request.method === 'PUT') {
      const body = await request.json();
      const { action, cartId, lineId, quantity } = body;

      if (action !== 'update' || !cartId || !lineId || quantity === undefined) {
        return new Response(
          JSON.stringify({ error: 'Cart ID, line ID, and quantity are required' }),
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const mutation = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 100) {
                edges {
                  node {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          id
                          title
                          handle
                          images(first: 1) {
                            edges {
                              node {
                                url
                                altText
                              }
                            }
                          }
                        }
                      }
                    }
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            cartId: cartId,
            lines: [{
              id: lineId,
              quantity: quantity
            }]
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.errors || (data.data.cartLinesUpdate.userErrors && data.data.cartLinesUpdate.userErrors.length > 0)) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update cart item',
            details: data.errors || data.data.cartLinesUpdate.userErrors || data.message
          }),
          { 
            status: response.status || 500,
            headers: corsHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ cart: data.data.cartLinesUpdate.cart }),
        { 
          status: 200,
          headers: corsHeaders
        }
      );
    }

    // Handle DELETE request (remove item)
    if (request.method === 'DELETE') {
      const body = await request.json();
      const { action, cartId, lineId } = body;

      if (action !== 'remove' || !cartId || !lineId) {
        return new Response(
          JSON.stringify({ error: 'Cart ID and line ID are required' }),
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const mutation = `
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 100) {
                edges {
                  node {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          id
                          title
                          handle
                          images(first: 1) {
                            edges {
                              node {
                                url
                                altText
                              }
                            }
                          }
                        }
                      }
                    }
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            cartId: cartId,
            lineIds: [lineId]
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.errors || (data.data.cartLinesRemove.userErrors && data.data.cartLinesRemove.userErrors.length > 0)) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to remove cart item',
            details: data.errors || data.data.cartLinesRemove.userErrors || data.message
          }),
          { 
            status: response.status || 500,
            headers: corsHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ cart: data.data.cartLinesRemove.cart }),
        { 
          status: 200,
          headers: corsHeaders
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error handling cart request:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

