// Generate a single product/lifestyle image via OpenAI (ChatGPT / DALL-E).
// Requires OPENAI_API_KEY in Cloudflare Pages secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

async function generateOpenAIImage(prompt, apiKey, model) {
  const modelsToTry = [model, 'dall-e-3'].filter((m, i, arr) => arr.indexOf(m) === i);

  let lastError = null;
  for (const currentModel of modelsToTry) {
    const requestBody = {
      model: currentModel,
      prompt,
      n: 1,
      size: '1024x1024',
    };

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      const image = data.data?.[0];
      if (image?.b64_json) {
        return { b64: image.b64_json, model: currentModel };
      }
      if (image?.url) {
        const imageResponse = await fetch(image.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download generated image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const bytes = new Uint8Array(imageBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return { b64: btoa(binary), model: currentModel };
      }
      throw new Error(`OpenAI response did not include image data for ${currentModel}`);
    }

    lastError = `${currentModel}: ${response.status} ${await response.text()}`;
  }

  throw new Error(`OpenAI API error — ${lastError}`);
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const apiKey = env.OPENAI_API_KEY || env.IMAGE_GEN_API_KEY;
  const model = env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error',
        details: 'Set OPENAI_API_KEY in Cloudflare Pages secrets.',
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  if (env.IMAGE_SYNC_SECRET) {
    const authHeader = request.headers.get('Authorization') || '';
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (provided !== env.IMAGE_SYNC_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
  }

  try {
    const body = await request.json();
    const { handle, kind } = body;

    if (!handle || !kind || !['product', 'lifestyle'].includes(kind)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. Provide handle and kind (product|lifestyle).' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const origin = new URL(request.url).origin;
    const manifestRes = await fetch(`${origin}/data/product-image-manifest.json`);
    if (!manifestRes.ok) {
      throw new Error(`Failed to load manifest: ${manifestRes.status}`);
    }

    const manifest = await manifestRes.json();
    const entry = manifest[handle];
    if (!entry) {
      return new Response(JSON.stringify({ error: `Unknown handle: ${handle}` }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const prompt = kind === 'product' ? entry.productPrompt : entry.lifestylePrompt;
    const { b64, model: usedModel } = await generateOpenAIImage(prompt, apiKey, model);

    return new Response(
      JSON.stringify({
        success: true,
        handle,
        kind,
        model: usedModel,
        b64,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('generate-product-image error:', error);
    return new Response(
      JSON.stringify({ error: 'Generation failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
