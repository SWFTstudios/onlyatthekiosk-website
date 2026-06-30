/**
 * Store page — dynamic hero categories and featured product grids.
 */

(function () {
  const PLACEHOLDER = window.AIRTABLE_CONFIG?.ui?.imagePlaceholder
    || '/images/kiosk-placeholder-product-img.webp';
  const CURRENCY = window.STORE_CONFIG?.currency
    || window.AIRTABLE_CONFIG?.ui?.defaultCurrency
    || 'USD';

  function formatPrice(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(num)) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  function collectionHref(product) {
    const handle = product.handle || '';
    if (handle.includes('-hoodie')) return 'collections/hoodies.html';
    if (handle.includes('-tshirt')) return 'collections/t-shirts.html';
    if (handle.includes('-bracelet')) return 'collections/bracelets.html';
    if (handle.includes('-chain')) return 'collections/chains.html';
    const collection = (product.collection || '').toLowerCase();
    if (collection.includes('hoodie')) return 'collections/hoodies.html';
    if (collection.includes('t-shirt') || collection.includes('tshirt')) return 'collections/t-shirts.html';
    if (collection.includes('bracelet')) return 'collections/bracelets.html';
    if (collection.includes('chain')) return 'collections/chains.html';
    return 'store.html';
  }

  function getImagePair(product, handle) {
    const edges = product?.images?.edges || [];
    const primary = edges[0]?.node?.url || '';
    const secondary = edges[1]?.node?.url || '';

    if (primary && secondary) {
      return { product: primary, lifestyle: secondary };
    }

    if (typeof getProductImagesByHandle === 'function' && handle) {
      const manifest = getProductImagesByHandle(handle);
      if (manifest) {
        return {
          product: primary || manifest.product,
          lifestyle: secondary || manifest.lifestyle,
        };
      }
    }

    return {
      product: primary || PLACEHOLDER,
      lifestyle: secondary || primary || PLACEHOLDER,
    };
  }

  function buildManifestProduct(handle, sectionConfig) {
    const manifest = typeof getProductImagesByHandle === 'function'
      ? getProductImagesByHandle(handle)
      : null;
    if (!manifest) return null;

    const price = sectionConfig?.fallbackPrices?.[handle] ?? 0;
    return {
      handle,
      title: manifest.title,
      price,
      collection: '',
      images: {
        edges: [
          { node: { url: manifest.product, altText: manifest.productAlt } },
          { node: { url: manifest.lifestyle, altText: manifest.lifestyleAlt } },
        ],
      },
    };
  }

  function renderHeroCategories() {
    const container = document.querySelector('[data-hero-products]');
    const categories = window.STORE_CONFIG?.heroCategories || [];
    if (!container || !categories.length) return;

    container.innerHTML = '';

    categories.forEach((cat, index) => {
      const manifest = typeof getProductImagesByHandle === 'function'
        ? getProductImagesByHandle(cat.lifestyleHandle)
        : null;
      const imageSrc = cat.image || manifest?.lifestyle || PLACEHOLDER;
      const alt = manifest?.lifestyleAlt || `${cat.label} lifestyle`;

      const link = document.createElement('a');
      link.href = cat.href;
      link.className = 'hero_products-item w-inline-block';
      link.innerHTML = `
        <img loading="${index === 0 ? 'eager' : 'lazy'}" src="${imageSrc}" alt="${alt}" class="hero_products-image">
        <h4 class="hero_products-arrow">↓</h4>
        <h4 class="hero_products-arrow-view">→ View</h4>
        <h4 class="hero_products-name">${cat.label}</h4>
        <div class="hero_products-blur"></div>
        <h4 class="hero_products-view">View</h4>
      `;
      container.appendChild(link);
    });
  }

  function renderFeaturedCard(product, index) {
    const images = getImagePair(product, product.handle);
    const href = collectionHref(product);
    const priceText = formatPrice(product.price);
    const spinnerHtml = index === 0
      ? `<img loading="lazy" src="/images/buy-spinner.svg" alt="" class="buy-spinner_first">
        <img loading="lazy" src="/images/buy-spinner.svg" alt="" class="buy-spinner">`
      : `<img loading="lazy" src="/images/buy-spinner.svg" alt="" class="buy-spinner">`;

    const card = document.createElement('a');
    card.href = href;
    card.className = 'featured-product w-inline-block';
    card.innerHTML = `
      <div class="featured-product_top">
        <img loading="eager" src="${images.product}" alt="${product.title}" class="featured_products-image">
        ${spinnerHtml}
        <img loading="lazy" src="${images.lifestyle}" alt="${product.title} lifestyle" class="featured_products-image-secondary">
      </div>
      <div class="featured-product_bottom">
        <h4 class="featured-product_name">${product.title}</h4>
        <p>${priceText}</p>
      </div>
    `;
    return card;
  }

  function renderFeaturedSection(container, products) {
    if (!container) return;
    container.innerHTML = '';

    products.forEach((product, index) => {
      container.appendChild(renderFeaturedCard(product, index));
    });
  }

  async function loadFeaturedSection(categoryDisplay, sectionKey) {
    const container = document.querySelector(`[data-featured-section="${sectionKey}"]`);
    const sectionConfig = window.STORE_CONFIG?.featuredSections?.[categoryDisplay];
    if (!container || !sectionConfig) return;

    let products = [];

    if (window.airtable) {
      try {
        products = await window.airtable.getFeaturedProducts(categoryDisplay, 4);
      } catch (error) {
        console.warn(`Airtable featured load failed for ${categoryDisplay}:`, error);
      }
    }

    if (!products.length && sectionConfig.handles) {
      products = sectionConfig.handles
        .map((handle) => buildManifestProduct(handle, sectionConfig))
        .filter(Boolean);
    }

    renderFeaturedSection(container, products);
  }

  async function initStorePage() {
    renderHeroCategories();

    await Promise.all([
      loadFeaturedSection('Chains & Bracelets', 'chains-bracelets'),
      loadFeaturedSection('T-Shirts & Hoodies', 'tees-hoodies'),
    ]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStorePage);
  } else {
    initStorePage();
  }
})();
