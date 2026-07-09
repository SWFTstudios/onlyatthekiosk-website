/**
 * Collection list view renderer.
 */
(function () {
  const PLACEHOLDER = '/images/kiosk-placeholder-product-img.webp';

  function formatPrice(product) {
    const amount = product.priceRange?.minVariantPrice?.amount;
    const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';
    if (!amount) return '';
    if (window.airtable?.formatPrice) return window.airtable.formatPrice(amount, currency);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount));
  }

  function getThumb(product) {
    if (product.images?.edges?.length) {
      const lifestyle = product.images.edges.find((e) => e.node.url.includes('lifestyle'));
      return lifestyle?.node.url || product.images.edges[0].node.url;
    }
    if (window.ProductCatalog) {
      return window.ProductCatalog.getProductImages(product.handle).hero;
    }
    return PLACEHOLDER;
  }

  function getSubtitle(product) {
    const cfg = window.COLLECTION_CONFIG;
    const parts = [];
    if (cfg?.getMaterialLabel) parts.push(cfg.getMaterialLabel(product.handle));
    if (cfg?.getProductTypeLabel) parts.push(cfg.getProductTypeLabel(product.handle));
    return parts.filter(Boolean).join(' · ');
  }

  function renderList(products, container) {
    const el = container || document.getElementById('collection-list');
    if (!el) return;

    const base = window.COLLECTION_CONFIG?.getCollectionBasePath?.() || '..';

    if (!products.length) {
      el.innerHTML = '<p class="collection-list__empty">No products match this filter.</p>';
      return;
    }

    el.innerHTML = products.map((product) => {
      const thumb = getThumb(product);
      const subtitle = getSubtitle(product);
      const price = formatPrice(product);
      const pdpUrl = `${base}/products/${product.handle}`;

      return `
        <article class="collection-list__item" data-product-handle="${product.handle}">
          <img class="collection-list__thumb" src="${thumb}" alt="${product.title || product.handle}" loading="lazy">
          <div class="collection-list__meta">
            <p class="collection-list__subtitle">${subtitle}</p>
            <h3>${product.title || product.handle}</h3>
            <p class="collection-list__price">${price}</p>
          </div>
          <div class="collection-list__actions">
            <button type="button" class="button view-details-btn">View</button>
            <a href="${pdpUrl}" class="collection-list__link">Full details</a>
          </div>
        </article>
      `;
    }).join('');
  }

  window.CollectionList = { renderList, formatPrice, getThumb, getSubtitle };
})();
