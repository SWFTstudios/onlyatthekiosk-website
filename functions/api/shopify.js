// Cloudflare Pages Function to proxy Shopify Storefront API requests
// This keeps the API token server-side and handles CORS

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Storefront-Access-Token',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for GraphQL
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for GraphQL queries.' }),
      { 
        status: 405,
        headers: corsHeaders
      }
    );
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
          error: 'Server configuration error. Shopify API token not configured.',
          details: 'Please set SHOPIFY_STOREFRONT_TOKEN in Cloudflare Pages environment variables.'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Get GraphQL query from request body
    const body = await request.json();
    const { query, variables } = body;

    // Validate query
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'GraphQL query is required' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Construct Shopify API endpoint
    const shopifyApiUrl = `https://${SHOPIFY_STORE}/api/${SHOPIFY_API_VERSION}/graphql.json`;

    // Forward request to Shopify Storefront API
    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query: query,
        variables: variables || {}
      })
    });

    // Get response data
    const responseData = await shopifyResponse.json();

    // Check for Shopify API errors
    if (!shopifyResponse.ok) {
      console.error('Shopify API error:', {
        status: shopifyResponse.status,
        statusText: shopifyResponse.statusText,
        errors: responseData.errors
      });

      return new Response(
        JSON.stringify({ 
          error: 'Shopify API error',
          details: responseData.errors || responseData.message,
          status: shopifyResponse.status
        }),
        { 
          status: shopifyResponse.status,
          headers: corsHeaders
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error proxying Shopify API request:', {
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

