/**
 * Collection page bootstrap — load products, filters, carousel, list, drawer.
 */
(function () {
  function getCollectionHandle() {
    const page = document.querySelector('.collection-page');
    if (page?.dataset?.collection) return page.dataset.collection;
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1].replace('.html', '') || 'chains';
  }

  function formatCollectionTitle(handle) {
    const meta = window.COLLECTION_CONFIG?.COLLECTION_META?.[handle];
    if (meta?.title) return meta.title;
    return handle.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function updateCollectionTitle(title) {
    const text = document.querySelector('.collection-title-text');
    const pageTitle = document.getElementById('page-title');
    if (text) text.textContent = title;
    if (pageTitle) pageTitle.textContent = `${title} — KIOSK`;
  }

  function waitForClient(name, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      const tick = () => {
        if (window[name]) resolve();
        else if (attempt >= maxAttempts) reject(new Error(`${name} not available`));
        else {
          attempt += 1;
          setTimeout(tick, 100);
        }
      };
      tick();
    });
  }

  async function loadProducts(handle) {
    if (handle === 'tops' && window.airtable?.getCollection) {
      const [hoodies, tees] = await Promise.all([
        window.airtable.getCollection('hoodies'),
        window.airtable.getCollection('t-shirts'),
      ]);
      const nodes = [
        ...(hoodies?.products?.edges || []),
        ...(tees?.products?.edges || []),
      ].map((e) => e.node);
      return { title: 'Tops', products: nodes };
    }

    if (window.airtable) {
      const collection = await window.airtable.getCollection(handle);
      const products = (collection?.products?.edges || []).map((e) => e.node);
      return { title: collection?.title || formatCollectionTitle(handle), products };
    }

    if (window.shopify) {
      const collection = await window.shopify.getProductsByCollection(handle, 50);
      const products = (collection?.products?.edges || []).map((e) => e.node);
      return { title: formatCollectionTitle(handle), products };
    }

    return { title: formatCollectionTitle(handle), products: [] };
  }

  function applyManifestFallback(handle) {
    const manifestKey = handle === 'tops' ? 'tops' : handle;
    if (typeof applyManifestCarouselImages === 'function') {
      applyManifestCarouselImages(manifestKey);
    }
  }

  function enrichAll(products) {
    if (!window.ProductCatalog?.enrichProduct) return products;
    return products.map((p) => window.ProductCatalog.enrichProduct(p));
  }

  function filterAndRender(allProducts, collectionKey, activeFilter) {
    const filtered = window.COLLECTION_CONFIG
      ? window.COLLECTION_CONFIG.filterProducts(allProducts, collectionKey, activeFilter)
      : allProducts;

    const enriched = enrichAll(filtered);

    if (window.CollectionCarousel) {
      window.CollectionCarousel.rebuildCarousel(enriched);
    }
    if (window.CollectionList) {
      window.CollectionList.renderList(enriched);
    }

    window.collectionProducts = enriched;
    $(document).trigger('productsLoaded');
    return enriched;
  }

  async function init() {
    const handle = getCollectionHandle();
    const title = formatCollectionTitle(handle);
    updateCollectionTitle(title);
    applyManifestFallback(handle);

    await window.ProductCatalog?.loadCatalog?.();

    const toolbarHost = document.getElementById('collection-toolbar-host');
    if (toolbarHost && window.CollectionView) {
      toolbarHost.innerHTML = window.CollectionView.buildToolbar(handle);
    }

    let allProducts = [];

    try {
      await waitForClient('airtable').catch(() => waitForClient('shopify'));
      const result = await loadProducts(handle);
      allProducts = result.products;
      if (result.title) updateCollectionTitle(result.title);
    } catch (e) {
      console.warn('Using manifest placeholders:', e);
    }

    if (!allProducts.length && typeof COLLECTION_HANDLES !== 'undefined') {
      const handles = COLLECTION_HANDLES[handle] || [];
      allProducts = handles.map((h) => ({
        handle: h,
        title: PRODUCT_IMAGES?.[h]?.title || h,
        images: PRODUCT_IMAGES?.[h]
          ? { edges: [{ node: { url: PRODUCT_IMAGES[h].product, altText: PRODUCT_IMAGES[h].title } }] }
          : { edges: [] },
        priceRange: { minVariantPrice: { amount: '79.99', currencyCode: 'USD' } },
        variants: { edges: [] },
      }));
    }

    window.allCollectionProducts = enrichAll(allProducts);

    const onFilter = (activeFilter) => {
      filterAndRender(window.allCollectionProducts, handle, activeFilter);
    };

    let activeFilter = 'all';
    if (window.CollectionView) {
      activeFilter = window.CollectionView.initFilters(onFilter);
      window.CollectionView.initViewToggle();
    }

    filterAndRender(window.allCollectionProducts, handle, activeFilter);

    if (window.CollectionCarousel) {
      window.CollectionCarousel.animateCollectionTitle();
      window.CollectionCarousel.initCarousel();
    }

    if (window.ProductDrawer) {
      window.ProductDrawer.initDrawer();
    }

    $(document).on('drawerOpen', () => { document.body.style.overflow = 'hidden'; });
    $(document).on('drawerClose', () => {
      const mode = window.CollectionView?.getViewMode?.() || 'carousel';
      document.body.style.overflow = mode === 'list' ? 'auto' : '';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
