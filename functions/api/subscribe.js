// Cloudflare Pages Function to handle email subscriptions via Airtable
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get email from request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Airtable configuration from environment variables
    // Try multiple ways to access env vars (Cloudflare Pages Functions compatibility)
    const AIRTABLE_ACCESS_TOKEN = env.AIRTABLE_ACCESS_TOKEN || context.env?.AIRTABLE_ACCESS_TOKEN;
    const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID || context.env?.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = 'Incoming Interest';
    
    // Log environment variable access for debugging
    const envKeys = Object.keys(env || {});
    console.log('Environment check:', {
      hasToken: !!AIRTABLE_ACCESS_TOKEN,
      hasBaseId: !!AIRTABLE_BASE_ID,
      tokenLength: AIRTABLE_ACCESS_TOKEN ? AIRTABLE_ACCESS_TOKEN.length : 0,
      baseIdLength: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.length : 0,
      availableEnvKeys: envKeys,
      envObjectType: typeof env,
      envExists: !!env
    });
    
    // Validate environment variables with detailed logging
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('Missing Airtable configuration', {
        hasToken: !!AIRTABLE_ACCESS_TOKEN,
        hasBaseId: !!AIRTABLE_BASE_ID,
        tokenLength: AIRTABLE_ACCESS_TOKEN ? AIRTABLE_ACCESS_TOKEN.length : 0,
        baseIdLength: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.length : 0,
        availableEnvKeys: envKeys,
        envObject: env ? 'exists' : 'missing'
      });
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error. Environment variables not found.',
          debug: {
            hasToken: !!AIRTABLE_ACCESS_TOKEN,
            hasBaseId: !!AIRTABLE_BASE_ID,
            availableKeys: envKeys,
            envType: typeof env
          }
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
    
    const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

    // Prepare data for Airtable
    // Note: "Date Submitted" is auto-generated, so we don't set it manually
    const airtableData = {
      fields: {
        'Email Address': email
      }
    };

    // Make request to Airtable API
    const airtableResponse = await fetch(AIRTABLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(airtableData)
    });

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      const errorStatus = airtableResponse.status;
      
      // Log detailed error for debugging
      console.error('Airtable API error:', {
        status: errorStatus,
        statusText: airtableResponse.statusText,
        error: errorData,
        url: AIRTABLE_API_URL,
        hasToken: !!AIRTABLE_ACCESS_TOKEN,
        tokenLength: AIRTABLE_ACCESS_TOKEN ? AIRTABLE_ACCESS_TOKEN.length : 0
      });
      
      // Check for authentication errors (401, 403)
      if (errorStatus === 401 || errorStatus === 403) {
        let authError = 'Authentication required. Please check your Airtable token.';
        try {
          const parsedError = JSON.parse(errorData);
          if (parsedError.error && parsedError.error.message) {
            authError = parsedError.error.message;
          }
        } catch (e) {
          // Use default message
        }
        return new Response(
          JSON.stringify({ 
            error: authError,
            status: errorStatus,
            type: 'authentication'
          }),
          { 
            status: 401,
            headers: corsHeaders
          }
        );
      }
      
      // Check if it's a duplicate entry (422 status)
      if (errorStatus === 422) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered' }),
          { 
            status: 409,
            headers: corsHeaders
          }
        );
      }

      // Return more specific error for debugging
      let errorMessage = 'Failed to save email. Please try again.';
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.error) {
          errorMessage = parsedError.error.message || parsedError.error.type || errorMessage;
        }
      } catch (e) {
        // If we can't parse, use default message
        errorMessage = errorData || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: errorStatus
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const result = await airtableResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email saved successfully',
        id: result.id 
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error processing subscription:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error. Please try again later.',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

