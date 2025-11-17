// Cloudflare Pages Function to handle email subscriptions via Airtable
export async function onRequestPost(context) {
  const { request, env } = context;
  
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
          headers: { 'Content-Type': 'application/json' }
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
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Airtable configuration from environment variables
    const AIRTABLE_ACCESS_TOKEN = env.AIRTABLE_ACCESS_TOKEN;
    const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = 'Incoming Interest';
    
    // Validate environment variables
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('Missing Airtable configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error. Please contact support.' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

    // Prepare data for Airtable
    const airtableData = {
      fields: {
        'Email': email,
        'Date': new Date().toISOString()
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
      console.error('Airtable API error:', errorData);
      
      // Check if it's a duplicate entry (422 status)
      if (airtableResponse.status === 422) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered' }),
          { 
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to save email. Please try again.' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again later.' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

