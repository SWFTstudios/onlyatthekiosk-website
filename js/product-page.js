/**
 * Premium product detail page — /products/:handle
 */
(function () {
  const PLACEHOLDER = '/images/kiosk-placeholder-product-img.webp';
  let product = null;
  let selectedVariantId = null;

  function getHandleFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const productsIdx = parts.indexOf('products');
    if (productsIdx !== -1 && parts[productsIdx + 1]) {
      return decodeURIComponent(parts[productsIdx + 1].replace(/\.html$/, ''));
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('handle');
  }

  function collectionBackLink(handle) {
    if (handle.includes('-chain')) return 'collections/chains.html';
    if (handle.includes('-bracelet')) return 'collections/bracelets.html';
    if (handle.includes('-hoodie') || handle.includes('-tshirt')) return 'collections/tops.html';
    return 'store.html';
  }

  async function fetchProduct(handle) {
    if (window.airtable) {
      const p = await window.airtable.getProductByHandle(handle);
      if (p) return window.ProductCatalog?.enrichProduct?.(p) || p;
    }
    if (window.shopify) {
      return window.shopify.getProductByHandle(handle);
    }
    return null;
  }

  function buildFallbackProduct(handle) {
    const catalog = window.PRODUCT_CATALOG?.[handle];
    const images = window.ProductCatalog?.getProductImages(handle);
    const title = catalog?.tagline || PRODUCT_IMAGES?.[handle]?.title || handle;

    return {
      handle,
      title: PRODUCT_IMAGES?.[handle]?.title || title,
      tagline: catalog?.tagline,
      descriptionHtml: catalog?.descriptionHtml || `<p>${title}</p>`,
      careInstructions: catalog?.careHtml,
      deliveryHtml: catalog?.deliveryHtml,
      sizeGuideHtml: catalog?.sizeGuideHtml,
      wearSeason: catalog?.wearSeason,
      material: catalog?.material,
      finish: catalog?.finish,
      catalogSizes: catalog?.sizes || window.COLLECTION_CONFIG?.SIZES,
      priceRange: { minVariantPrice: { amount: '79.99', currencyCode: 'USD' } },
      images: images ? {
        edges: images.all.map((url, i) => ({
          node: { url, altText: `${title} image ${i + 1}` },
        })),
      } : { edges: [] },
      variants: { edges: [] },
    };
  }

  function formatPrice(p) {
    const amount = p.priceRange?.minVariantPrice?.amount;
    const currency = p.priceRange?.minVariantPrice?.currencyCode || 'USD';
    if (window.airtable?.formatPrice) return window.airtable.formatPrice(amount, currency);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount));
  }

  function renderGallery(p) {
    const images = window.ProductCatalog?.getProductImages(p.handle);
    const urls = p.images?.edges?.length
      ? p.images.edges.map((e) => e.node.url)
      : images?.all || [PLACEHOLDER];

    const gallery = document.getElementById('product-gallery');
    gallery.innerHTML = `
      <img class="product-gallery__main" id="gallery-main" src="${urls[0]}" alt="${p.title}">
      <div class="product-gallery__thumbs">
        ${urls.slice(1, 4).map((url, i) => `
          <img class="product-gallery__thumb${i === 0 ? ' is-active' : ''}" src="${url}" alt="" data-full="${url}">
        `).join('')}
      </div>
    `;

    gallery.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        document.getElementById('gallery-main').src = thumb.dataset.full;
        gallery.querySelectorAll('.product-gallery__thumb').forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  function renderSizes(p) {
    const sizes = p.catalogSizes || window.COLLECTION_CONFIG?.SIZES || [];
    const variants = p.variants?.edges?.map((e) => e.node) || [];
    const container = document.getElementById('product-sizes');
    container.innerHTML = sizes.map((size) => {
      const variant = variants.find((v) => (v.title || '').toUpperCase() === size);
      const id = variant?.id || '';
      return `<button type="button" class="product-page__size-btn${size === 'M' ? ' is-active' : ''}" data-size="${size}" data-variant-id="${id}">${size}</button>`;
    }).join('');

    container.querySelectorAll('.product-page__size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.product-page__size-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        selectedVariantId = btn.dataset.variantId || null;
      });
    });

    const defaultBtn = container.querySelector('.is-active');
    if (defaultBtn) selectedVariantId = defaultBtn.dataset.variantId || null;
  }

  function renderProduct(p) {
    product = p;
    document.getElementById('page-title').textContent = `${p.title} — KIOSK`;
    document.getElementById('product-back-link').href = collectionBackLink(p.handle);
    document.getElementById('product-title').textContent = p.title;
    document.getElementById('product-tagline').textContent = p.tagline || '';
    document.getElementById('product-price').textContent = formatPrice(p);

    const chips = document.getElementById('product-chips');
    const chipValues = [p.material, p.finish, window.COLLECTION_CONFIG?.getProductTypeLabel?.(p.handle)].filter(Boolean);
    chips.innerHTML = chipValues.map((c) => `<span class="product-page__chip">${c}</span>`).join('');

    document.getElementById('product-description').innerHTML = p.descriptionHtml || '';
    document.getElementById('panel-sizing').innerHTML = p.sizeGuideHtml || '<p>See size chart above.</p>';
    document.getElementById('panel-care').innerHTML = p.careInstructions || p.careHtml || '';
    document.getElementById('panel-wear').innerHTML = `<p>${p.wearSeason || p.styleNotes || ''}</p>`;
    document.getElementById('panel-delivery').innerHTML = p.deliveryHtml || '<p>Standard shipping 5–7 business days.</p>';

    renderGallery(p);
    renderSizes(p);
    document.getElementById('product-info').hidden = false;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.title,
      description: (p.descriptionHtml || '').replace(/<[^>]+>/g, '').slice(0, 300),
      image: p.images?.edges?.map((e) => e.node.url) || [],
      offers: {
        '@type': 'Offer',
        price: p.priceRange?.minVariantPrice?.amount,
        priceCurrency: p.priceRange?.minVariantPrice?.currencyCode || 'USD',
        availability: 'https://schema.org/InStock',
      },
    };
    document.getElementById('product-jsonld').textContent = JSON.stringify(jsonLd);
  }

  function initAccordion() {
    document.querySelectorAll('.product-page__accordion-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.product-page__accordion-item');
        const wasOpen = item.classList.contains('is-open');
        document.querySelectorAll('.product-page__accordion-item').forEach((i) => i.classList.remove('is-open'));
        if (!wasOpen) item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', !wasOpen ? 'true' : 'false');
      });
    });
  }

  async function init() {
    const handle = getHandleFromPath();
    if (!handle) {
      document.getElementById('product-gallery').innerHTML = '<p class="product-page__loading">Product not found.</p>';
      return;
    }

    await window.ProductCatalog?.loadCatalog?.();
    initAccordion();

    try {
      let p = await fetchProduct(handle);
      if (!p) p = buildFallbackProduct(handle);
      renderProduct(p);
    } catch (err) {
      console.error(err);
      renderProduct(buildFallbackProduct(handle));
    }

    document.getElementById('product-add-to-cart').addEventListener('click', async () => {
      const btn = document.getElementById('product-add-to-cart');
      btn.disabled = true;
      btn.textContent = 'Adding…';
      try {
        if (!product) throw new Error('No product');
        let variantId = selectedVariantId;
        if (!variantId && product.variants?.edges?.length) {
          variantId = product.variants.edges[0].node.id;
        }
        if (!variantId) throw new Error('Select a size');
        if (!window.cart) throw new Error('Cart unavailable');
        await window.cart.addItem(variantId, 1);
        btn.textContent = 'Added';
      } catch (e) {
        alert(e.message);
        btn.textContent = 'Add to Cart';
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
