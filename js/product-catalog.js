/**
 * Premium product copy catalog — merges with Airtable/Shopify product data.
 */
(function () {
  let catalogData = null;

  async function loadCatalog() {
    if (catalogData) return catalogData;
    if (window.PRODUCT_CATALOG) {
      catalogData = window.PRODUCT_CATALOG;
      return catalogData;
    }
    try {
      const base = window.COLLECTION_CONFIG?.getCollectionBasePath?.() || '.';
      const res = await fetch(`${base}/data/product-catalog.json`);
      if (res.ok) {
        catalogData = await res.json();
      }
    } catch (e) {
      console.warn('Product catalog JSON not loaded:', e);
      catalogData = {};
    }
    return catalogData;
  }

  function getCatalogEntry(handle) {
    if (!catalogData || !handle) return null;
    return catalogData[handle] || null;
  }

  function enrichProduct(product) {
    if (!product?.handle) return product;
    const entry = getCatalogEntry(product.handle);
    if (!entry) return product;

    return {
      ...product,
      tagline: entry.tagline || product.tagline,
      descriptionHtml: product.descriptionHtml || entry.descriptionHtml,
      careInstructions: product.careInstructions || entry.careHtml,
      deliveryHtml: entry.deliveryHtml,
      sizeGuideHtml: entry.sizeGuideHtml,
      material: entry.material,
      finish: entry.finish,
      fit: entry.fit,
      wearSeason: entry.wearSeason,
      styleNotes: entry.styleNotes,
      catalogSizes: entry.sizes || window.COLLECTION_CONFIG?.SIZES,
    };
  }

  function getProductImages(handle) {
    const entry = typeof getProductImagesByHandle === 'function'
      ? getProductImagesByHandle(handle)
      : null;
    const placeholder = window.AIRTABLE_CONFIG?.ui?.imagePlaceholder
      || '/images/kiosk-placeholder-product-img.webp';

    if (!entry) {
      return {
        hero: placeholder,
        details: [placeholder, placeholder, placeholder],
        all: [placeholder, placeholder, placeholder, placeholder],
      };
    }

    const hero = entry.hero || entry.lifestyle || entry.product || placeholder;
    const details = [
      entry.detail1 || entry.product || placeholder,
      entry.detail2 || entry.lifestyle || placeholder,
      entry.detail3 || entry.product || placeholder,
    ];

    return { hero, details, all: [hero, ...details] };
  }

  function getDisplayTitle(handle, fallback) {
    const entry = getCatalogEntry(handle);
    if (fallback) return fallback;
    if (entry?.tagline) return entry.tagline;
    return handle;
  }

  window.ProductCatalog = {
    loadCatalog,
    getCatalogEntry,
    enrichProduct,
    getProductImages,
    getDisplayTitle,
  };
})();
