/**
 * Product catalog client
 *
 * Talks to the /api/products Cloudflare Function (which reads Airtable and
 * de-dupes the Shopify-style rows into clean products). It returns objects in
 * the shape the storefront pages already expect (priceRange / images.edges /
 * variants.edges), plus a few flat conveniences (price, sizes, image).
 *
 * Kept on `window.airtable` for backwards compatibility with existing pages.
 */

class CatalogClient {
  constructor() {
    this.endpoint = '/api/products';
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTTL = 5 * 60 * 1000;
  }

  async _fetchAll() {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }
    const res = await fetch(this.endpoint);
    if (!res.ok) throw new Error(`Catalog API error ${res.status}`);
    const data = await res.json();
    this.cache = (data.products || []).map((p) => this._shape(p));
    this.cacheTime = Date.now();
    return this.cache;
  }

  // Map the API product into the shape pages consume.
  _shape(p) {
    const amount = String(p.price ?? 0);
    return {
      id: p.handle,
      handle: p.handle,
      title: p.title,
      collection: p.collection,
      description: p.description || '',
      descriptionHtml: p.description || '',
      careInstructions: p.careInstructions || '',
      price: Number(p.price) || 0,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      image: (p.images && p.images[0] && p.images[0].url) || '/images/kiosk-placeholder-product-img.webp',
      priceRange: {
        minVariantPrice: { amount, currencyCode: 'USD' },
        maxVariantPrice: { amount, currencyCode: 'USD' },
      },
      images: {
        edges: (p.images && p.images.length ? p.images : [{ url: '/images/kiosk-placeholder-product-img.webp', alt: p.title }]).map(
          (img) => ({ node: { url: img.url, altText: img.alt || p.title, width: 800, height: 800 } })
        ),
      },
      // A single synthetic variant — sizes are handled separately at add-to-cart.
      variants: {
        edges: [{ node: { id: p.handle, title: 'Default', availableForSale: true, price: { amount, currencyCode: 'USD' } } }],
      },
    };
  }

  async getProducts({ collection, maxRecords } = {}) {
    let products = await this._fetchAll();
    if (collection) {
      const want = this._normalize(collection);
      products = products.filter((p) => this._normalize(p.collection) === want);
    }
    if (maxRecords) products = products.slice(0, maxRecords);
    return products;
  }

  async getProductsByCollection(handle, maxRecords = 50) {
    return this.getProducts({ collection: handle, maxRecords });
  }

  async getProductByHandle(handle) {
    const products = await this._fetchAll();
    return products.find((p) => p.handle === handle) || null;
  }

  async getCollection(handle) {
    const products = await this.getProductsByCollection(handle);
    return {
      title: this._titleCase(handle),
      handle,
      products: { edges: products.map((node) => ({ node })) },
    };
  }

  _normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  _titleCase(handle) {
    if (!handle) return '';
    return handle.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  formatPrice(amount, currencyCode = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
      typeof amount === 'string' ? parseFloat(amount) : amount
    );
  }

  clearCache() {
    this.cache = null;
    this.cacheTime = 0;
  }
}

if (typeof window !== 'undefined') {
  window.airtable = new CatalogClient();
  console.log('✅ Catalog client ready (/api/products)');
}
