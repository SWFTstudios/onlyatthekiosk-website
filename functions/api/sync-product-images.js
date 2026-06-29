// Cloudflare Pages Function to sync product image URLs to Airtable.
// Uses AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID from Cloudflare env secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function absoluteUrl(origin, relativePath) {
  if (relativePath.startsWith('http')) return relativePath;
  return `${origin}${relativePath}`;
}

async function fetchAllRecords(baseId, table, token) {
  const records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);

  return records;
}

async function updateRecord(baseId, table, token, recordId, fields) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Airtable update failed: ${response.status} ${await response.text()}`);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: corsHeaders }
    );
  }

  const token = env.AIRTABLE_ACCESS_TOKEN;
  const baseId = env.AIRTABLE_BASE_ID;
  const table = env.AIRTABLE_PRODUCTS_TABLE || 'Products';
  const siteOrigin = env.SITE_ORIGIN || new URL(request.url).origin;

  if (!token || !baseId) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error',
        details: 'AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID must be set in Cloudflare secrets.',
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Optional auth when IMAGE_SYNC_SECRET is configured
  if (env.IMAGE_SYNC_SECRET) {
    const authHeader = request.headers.get('Authorization') || '';
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (provided !== env.IMAGE_SYNC_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }
  }

  try {
    const origin = new URL(request.url).origin;
    const manifestRes = await fetch(`${origin}/data/product-image-manifest.json`);

    if (!manifestRes.ok) {
      throw new Error(`Failed to load manifest: ${manifestRes.status}`);
    }

    const manifest = await manifestRes.json();
    const handles = Object.keys(manifest).filter((h) => {
      const status = manifest[h].status;
      return status === 'optimized' || status === 'synced' || status === 'pending';
    });

    const records = await fetchAllRecords(baseId, table, token);

    let synced = 0;
    const missingHandles = new Set(handles);
    const updatedHandles = new Set();

    for (const record of records) {
      const handle = record.fields?.Handle || record.fields?.handle;
      if (!handle || !manifest[handle]) continue;

      missingHandles.delete(handle);
      updatedHandles.add(handle);

      const entry = manifest[handle];
      await updateRecord(baseId, table, token, record.id, {
        'Image Src': absoluteUrl(siteOrigin, entry.productPath),
        'Image Alt Text': entry.productAlt,
      });

      synced++;
      await sleep(220);
    }

    const missing = missingHandles.size;
    const missingHandlesList = [...missingHandles].slice(0, 20);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        missing,
        total: handles.length,
        missingHandles: missingHandlesList,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('sync-product-images error:', error);
    return new Response(
      JSON.stringify({ error: 'Sync failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
