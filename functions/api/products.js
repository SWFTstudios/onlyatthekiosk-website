// Cloudflare Pages Function: Product catalog API
//
// Reads the Airtable "Products" table (which stores data in Shopify CSV-export
// shape — one row per variant/image) and collapses it into clean product
// objects keyed by Handle, with sizes and images aggregated.
//
// This is the single source of truth the storefront reads from. Prices are
// re-validated here (and in /api/checkout) server-side so the client can never
// tamper with them.
//
// Query params:
//   ?collection=Bracelets   filter to a single collection (Type field)
//   ?handle=001-gold-chain  return a single product
//   ?maxRecords=12          cap number of products returned

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const token = env.AIRTABLE_ACCESS_TOKEN;
  const baseId = env.AIRTABLE_BASE_ID;
  const table = env.AIRTABLE_PRODUCTS_TABLE || 'Products';

  if (!token || !baseId) {
    return json(
      {
        error: 'Server configuration error',
        details: 'AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID must be set in Cloudflare Pages environment variables.',
      },
      500
    );
  }

  const url = new URL(request.url);
  const collectionFilter = url.searchParams.get('collection');
  const handleFilter = url.searchParams.get('handle');
  const maxRecords = parseInt(url.searchParams.get('maxRecords') || '0', 10);

  try {
    const records = await fetchAllRecords(baseId, table, token);
    let products = groupRecordsIntoProducts(records);

    // Only show published / active products to shoppers.
    products = products.filter((p) => p.active);

    if (handleFilter) {
      const product = products.find((p) => p.handle === handleFilter);
      return json({ product: product || null });
    }

    if (collectionFilter) {
      const want = normalize(collectionFilter);
      products = products.filter((p) => normalize(p.collection) === want);
    }

    products.sort((a, b) => a.handle.localeCompare(b.handle));

    if (maxRecords > 0) {
      products = products.slice(0, maxRecords);
    }

    return json({ products, count: products.length });
  } catch (error) {
    return json({ error: 'Failed to load products', details: error.message }, 500);
  }
}

// Pull every row from the table, following Airtable pagination.
async function fetchAllRecords(baseId, table, token) {
  const all = [];
  let offset = null;
  const base = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);

    const res = await fetch(`${base}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Airtable ${res.status}: ${detail}`);
    }

    const data = await res.json();
    all.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  return all;
}

// Collapse Shopify-style rows (variant × image) into one product per Handle.
function groupRecordsIntoProducts(records) {
  const byHandle = new Map();

  for (const record of records) {
    const f = record.fields || {};
    const handle = String(f.Handle || '').trim();
    if (!handle) continue;

    if (!byHandle.has(handle)) {
      byHandle.set(handle, {
        id: handle,
        handle,
        title: cleanTitle(f.Title) || titleFromHandle(handle),
        collection: f.Type || f['Product Category'] || '',
        description: f['Body (HTML)'] || '',
        careInstructions:
          f['Care instructions (product.metafields.shopify.care-instructions)'] ||
          f['Care guide (product.metafields.descriptors.care_guide)'] ||
          '',
        price: 0,
        currency: 'USD',
        images: [],
        _imageSet: new Set(),
        sizes: [],
        _sizeSet: new Set(),
        active: false,
      });
    }

    const product = byHandle.get(handle);

    // Title / collection / description may only appear on some rows — fill gaps.
    if (!product.title || /^#?\d/.test(product.title) === false) {
      const t = cleanTitle(f.Title);
      if (t) product.title = t;
    }
    if (!product.collection && (f.Type || f['Product Category'])) {
      product.collection = f.Type || f['Product Category'];
    }
    if (!product.description && f['Body (HTML)']) {
      product.description = f['Body (HTML)'];
    }

    // Price: take the first positive Variant Price we see.
    const price = parseFloat(f['Variant Price']);
    if (!product.price && Number.isFinite(price) && price > 0) {
      product.price = price;
    }

    // Active if any row is published / status active.
    const status = String(f.Status || '').toLowerCase();
    if (f.Published === true || status === 'active' || status === 'published') {
      product.active = true;
    }

    // Sizes from Option1 Value.
    const size = String(f['Option1 Value'] || '').trim();
    if (size && !product._sizeSet.has(size)) {
      product._sizeSet.add(size);
      product.sizes.push(size);
    }

    // Images from Image Src, ordered by Image Position.
    const imgUrl = String(f['Image Src'] || '').trim();
    if (imgUrl && !product._imageSet.has(imgUrl)) {
      product._imageSet.add(imgUrl);
      product.images.push({
        url: imgUrl,
        alt: f['Image Alt Text'] || product.title,
        position: Number(f['Image Position']) || 999,
      });
    }
  }

  const SIZE_ORDER = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, '2XL': 5, '3XL': 6 };

  return Array.from(byHandle.values()).map((p) => {
    p.images.sort((a, b) => a.position - b.position);
    p.sizes.sort((a, b) => {
      const ai = SIZE_ORDER[a.toUpperCase()];
      const bi = SIZE_ORDER[b.toUpperCase()];
      if (ai !== undefined && bi !== undefined) return ai - bi;
      return a.localeCompare(b);
    });
    delete p._imageSet;
    delete p._sizeSet;
    if (!p.images.length) {
      p.images.push({ url: '/images/kiosk-placeholder-product-img.webp', alt: p.title, position: 0 });
    }
    return p;
  });
}

function cleanTitle(t) {
  if (!t) return '';
  return String(t).replace(/\s+/g, ' ').trim();
}

function titleFromHandle(handle) {
  return handle
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
