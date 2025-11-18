// Cloudflare Worker to handle form submissions to Airtable
// Worker Name: kiosk-form-submission-handler

export default {
  async fetch(request, env) {
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

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {
      // Get request body
      const body = await request.json();
      const { email, formType = 'email-signup' } = body;

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
      const AIRTABLE_ACCESS_TOKEN = env.AIRTABLE_ACCESS_TOKEN;
      const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;
      const AIRTABLE_TABLE_NAME = 'Incoming Interest';
      
      // Validate environment variables
      if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
        console.error('Missing Airtable configuration', {
          hasToken: !!AIRTABLE_ACCESS_TOKEN,
          hasBaseId: !!AIRTABLE_BASE_ID
        });
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error. Please contact support.'
          }),
          { 
            status: 500,
            headers: corsHeaders
          }
        );
      }
      
      const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

      // Prepare data for Airtable
      const airtableData = {
        fields: {
          'Email Address': email,
          'Source': formType
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
        
        console.error('Airtable API error:', {
          status: errorStatus,
          statusText: airtableResponse.statusText,
          error: errorData
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

        // Return more specific error
        let errorMessage = 'Failed to save email. Please try again.';
        try {
          const parsedError = JSON.parse(errorData);
          if (parsedError.error) {
            errorMessage = parsedError.error.message || parsedError.error.type || errorMessage;
          }
        } catch (e) {
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
      console.error('Error processing form submission:', {
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
};

