// Cloudflare Pages Function to proxy Airtable API requests
// This keeps the API token server-side and handles CORS

export async function onRequest(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only GET requests are supported.' }),
      { 
        status: 405,
        headers: corsHeaders
      }
    );
  }

  try {
    // Get Airtable configuration from environment variables
    const AIRTABLE_ACCESS_TOKEN = env.AIRTABLE_ACCESS_TOKEN;
    const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;
    const AIRTABLE_PRODUCTS_TABLE = env.AIRTABLE_PRODUCTS_TABLE || 'Products';
    const AIRTABLE_ORDERS_TABLE = env.AIRTABLE_ORDERS_TABLE || 'Orders';
    
    // Validate environment variables
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('Missing Airtable configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error. Airtable API token not configured.',
          details: 'Please set AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID in Cloudflare Pages environment variables.'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    const maxRecords = url.searchParams.get('maxRecords');
    const filterByFormula = url.searchParams.get('filterByFormula');
    const sort = url.searchParams.get('sort');
    
    // Validate table parameter
    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Table parameter is required' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Build Airtable API URL
    const tableName = encodeURIComponent(table);
    const airtableApiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;
    
    // Build query parameters for Airtable API
    const airtableParams = new URLSearchParams();
    if (maxRecords) {
      airtableParams.append('maxRecords', maxRecords);
    }
    if (filterByFormula) {
      airtableParams.append('filterByFormula', filterByFormula);
    }
    if (sort) {
      airtableParams.append('sort[0][field]', sort);
      airtableParams.append('sort[0][direction]', 'asc');
    }
    
    // Add view parameter (default to Grid view)
    airtableParams.append('view', 'Grid view');
    
    const airtableUrl = `${airtableApiUrl}?${airtableParams.toString()}`;

    // Forward request to Airtable API
    const airtableResponse = await fetch(airtableUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    // Get response data
    const responseData = await airtableResponse.json();

    // Check for Airtable API errors
    if (!airtableResponse.ok) {
      console.error('Airtable API error:', responseData);
      
      // Handle specific error cases
      if (airtableResponse.status === 401 || airtableResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Airtable authentication failed',
            details: 'Please check your AIRTABLE_ACCESS_TOKEN'
          }),
          { 
            status: 401,
            headers: corsHeaders
          }
        );
      }
      
      if (airtableResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Table not found',
            details: `Table "${table}" does not exist in Airtable base`
          }),
          { 
            status: 404,
            headers: corsHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Airtable API error',
          details: responseData.error?.message || 'Unknown error',
          status: airtableResponse.status
        }),
        { 
          status: airtableResponse.status,
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
    console.error('Error in Airtable proxy:', error);
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

