/**
 * KIOSK Product Detail — shared render, fetch, and interaction logic
 * Used by product-drawer.js and product-page.js
 */
(function () {
  'use strict';

  const DEFAULT_DELIVERY =
    '<p>Standard shipping 5–7 business days. Free EU shipping on qualifying orders. Track your order at checkout.</p>';
  const DEFAULT_CARE = '<p>Hand wash cold. Lay flat to dry. Do not bleach.</p>';

  function getEl(prefix, name) {
    return document.getElementById(`${prefix}-${name}`);
  }

  function formatPrice(product) {
    const price = product.priceRange?.minVariantPrice;
    if (!price) return '';
    if (window.airtable && typeof window.airtable.formatPrice === 'function') {
      return window.airtable.formatPrice(price.amount, price.currencyCode || 'USD');
    }
    return `${price.amount} ${price.currencyCode || ''}`.trim();
  }

  function getImages(product) {
    if (product.images?.edges?.length) {
      return product.images.edges.map(({ node }) => node);
    }
    if (Array.isArray(product.images)) {
      return product.images;
    }
    return [];
  }

  function isAvailable(product) {
    if (product.variants?.edges?.length) {
      return product.variants.edges.some(({ node }) => node.availableForSale !== false);
    }
    if (Array.isArray(product.variants) && product.variants.length) {
      return product.variants.some((v) => v.availableForSale !== false && v.available !== false);
    }
    return product.active !== false;
  }

  function getFirstVariantId(product) {
    if (product.variants?.edges?.length) {
      const variant = product.variants.edges.find(({ node }) => node.availableForSale !== false)?.node
        || product.variants.edges[0].node;
      return variant?.id || null;
    }
    if (Array.isArray(product.variants) && product.variants.length) {
      const variant = product.variants.find((v) => v.availableForSale !== false && v.available !== false)
        || product.variants[0];
      return variant?.id || null;
    }
    return product.variantId || product.shopifyVariantId || null;
  }

  function placeholderToProduct(data, handle) {
    const images = [data.mainImage, ...(data.gallery || [])].filter(Boolean);
    return {
      title: data.title || 'Product',
      handle: handle || '',
      description: data.description || '',
      descriptionHtml: data.description || '',
      careInstructions: data.careInstructions || '',
      delivery: data.delivery || '',
      priceRange: {
        minVariantPrice: {
          amount: data.price?.amount || '0',
          currencyCode: data.price?.currencyCode || 'USD',
        },
      },
      images: {
        edges: images.map((url, index) => ({
          node: {
            url,
            altText: index === 0 ? data.title : `${data.title} ${index + 1}`,
          },
        })),
      },
      variants: { edges: [{ node: { availableForSale: true } }] },
      active: true,
    };
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

  function productPageHref(handle) {
    return `/products/${handle}`;
  }

  function setText(prefix, name, text) {
    const el = getEl(prefix, name);
    if (el) el.textContent = text || '';
  }

  function setHtml(prefix, name, html) {
    const el = getEl(prefix, name);
    if (el) el.innerHTML = html || '';
  }

  function resetAccordions(root) {
    const scope = root || document;
    scope.querySelectorAll('.products_description-item').forEach((item) => {
      item.classList.remove('active');
      const answer = item.querySelector('.products_description-answer');
      if (answer) answer.style.display = 'none';
    });
    const descItem = scope.querySelector('.products_description-item');
    if (descItem) {
      descItem.classList.add('active');
      const answer = descItem.querySelector('.products_description-answer');
      if (answer) answer.style.display = 'block';
    }
  }

  function bindAccordions(root) {
    const scope = root || document;
    scope.querySelectorAll('.products_description-question').forEach((question) => {
      if (question.dataset.accordionBound) return;
      question.dataset.accordionBound = 'true';
      question.addEventListener('click', () => {
        const item = question.closest('.products_description-item');
        if (!item) return;
        const wasActive = item.classList.contains('active');
        scope.querySelectorAll('.products_description-item').forEach((i) => {
          i.classList.remove('active');
          const answer = i.querySelector('.products_description-answer');
          if (answer) answer.style.display = 'none';
        });
        if (!wasActive) {
          item.classList.add('active');
          const answer = item.querySelector('.products_description-answer');
          if (answer) answer.style.display = 'block';
        }
      });
    });
  }

  function renderGalleryThumbnails(prefix, images, onSelect) {
    const gallery = getEl(prefix, 'gallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    images.slice(1).forEach((image) => {
      const item = document.createElement('div');
      item.className = 'products_drawer-more-item';
      const img = document.createElement('img');
      img.className = 'products_drawer-more-image';
      img.loading = 'lazy';
      img.src = image.url;
      img.alt = image.altText || '';
      img.addEventListener('click', () => onSelect(image));
      item.appendChild(img);
      gallery.appendChild(item);
    });
  }

  function populate(prefix, product, options = {}) {
    const priceText = formatPrice(product);
    setText(prefix, 'product-title', product.title);
    setText(prefix, 'product-price', priceText);

    const images = getImages(product);
    const mainImg = getEl(prefix, 'main-image');
    if (mainImg && images.length) {
      mainImg.src = images[0].url;
      mainImg.alt = images[0].altText || product.title;
    }

    renderGalleryThumbnails(prefix, images, (image) => {
      if (mainImg) {
        mainImg.src = image.url;
        mainImg.alt = image.altText || product.title;
      }
    });

    const description = product.descriptionHtml || product.description;
    setHtml(prefix, 'description', description || '<p>No description available.</p>');

    const care = product.careInstructions
      || product.metafields?.find?.((m) => m.key === 'care_instructions')?.value;
    setHtml(prefix, 'care-instructions', care || DEFAULT_CARE);

    const delivery = product.delivery
      || product.metafields?.find?.((m) => m.key === 'delivery')?.value
      || DEFAULT_DELIVERY;
    setHtml(prefix, 'delivery', delivery);

    const outOfStock = getEl(prefix, 'out-of-stock');
    const addBtn = getEl(prefix, 'add-to-cart');
    const available = isAvailable(product);
    if (outOfStock) outOfStock.style.display = available ? 'none' : 'block';
    if (addBtn) addBtn.disabled = !available;

    const err = getEl(prefix, 'error');
    if (err) err.style.display = 'none';

    const qty = getEl(prefix, 'quantity');
    if (qty) qty.value = '1';

    const fullLink = getEl(prefix, 'full-link');
    if (fullLink && product.handle) {
      fullLink.href = productPageHref(product.handle);
      fullLink.hidden = false;
    }

    const stickyPrice = getEl(prefix, 'sticky-price');
    if (stickyPrice) stickyPrice.textContent = priceText;

    if (options.root) {
      resetAccordions(options.root);
      bindAccordions(options.root);
    } else {
      resetAccordions();
    }

    return { images, priceText, available };
  }

  function populatePlaceholder(prefix, data, options = {}) {
    const product = placeholderToProduct(data, data.handle || '');
    return populate(prefix, product, options);
  }

  async function fetchProduct(handle, options = {}) {
    const getProducts = options.getProducts || (() => []);
    const getPlaceholder = options.getPlaceholder || null;

    const cached = getProducts().find((p) => p.handle === handle);
    if (cached) return cached;

    if (window.airtable) {
      try {
        const product = await window.airtable.getProductByHandle(handle);
        if (product) return product;
      } catch (error) {
        console.warn(`Airtable fetch failed for "${handle}", trying placeholder`, error);
      }
    }

    if (typeof getPlaceholder === 'function') {
      const placeholder = getPlaceholder(handle);
      if (placeholder) return placeholderToProduct(placeholder, handle);
    }

    if (typeof getProductImagesByHandle === 'function') {
      const manifest = getProductImagesByHandle(handle);
      if (manifest) {
        return placeholderToProduct(
          {
            title: manifest.title || handle,
            mainImage: manifest.product,
            gallery: [manifest.lifestyle].filter(Boolean),
            description: `<p>${manifest.title || handle} — an essential piece from KIOSK.</p>`,
            price: { amount: '0', currencyCode: 'USD' },
          },
          handle
        );
      }
    }

    throw new Error(`Product "${handle}" not found`);
  }

  function bindAddToCart(button, getProduct, options = {}) {
    if (!button || button.dataset.cartBound) return;
    button.dataset.cartBound = 'true';

    button.addEventListener('click', async () => {
      button.disabled = true;
      const original = button.textContent;
      button.textContent = 'Adding...';

      try {
        let product = typeof getProduct === 'function' ? getProduct() : getProduct;
        if (!product) throw new Error('No product loaded');

        const qtyEl = options.quantityEl;
        const quantity = Math.max(1, parseInt(qtyEl?.value || '1', 10) || 1);
        const variantId = getFirstVariantId(product);

        if (window.cart && variantId) {
          await window.cart.addItem(variantId, quantity);
          button.textContent = 'Added!';
        } else {
          console.log('Add to cart:', product.title, quantity);
          button.textContent = 'Added!';
        }

        if (typeof options.onSuccess === 'function') options.onSuccess(product);

        setTimeout(() => {
          button.textContent = original;
          button.disabled = !isAvailable(product);
        }, 2000);
      } catch (err) {
        console.error(err);
        button.textContent = 'Error';
        setTimeout(() => {
          button.textContent = original;
          button.disabled = false;
        }, 2000);
      }
    });
  }

  function updateProductMeta(product) {
    if (!product?.handle) return;

    const title = `${product.title} — KIOSK`;
    const description = (product.description || product.descriptionHtml || '')
      .replace(/<[^>]+>/g, '')
      .slice(0, 160);
    const images = getImages(product);
    const imageUrl = images[0]?.url
      ? (images[0].url.startsWith('http') ? images[0].url : `${window.location.origin}${images[0].url}`)
      : '';
    const canonical = `${window.location.origin}/products/${product.handle}`;
    const price = product.priceRange?.minVariantPrice;

    document.title = title;

    const setMeta = (attr, key, value) => {
      if (!value) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'product');
    setMeta('property', 'og:url', canonical);
    if (imageUrl) setMeta('property', 'og:image', imageUrl);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    let jsonLd = document.getElementById('product-jsonld');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'product-jsonld';
      jsonLd.type = 'application/ld+json';
      document.head.appendChild(jsonLd);
    }

    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: imageUrl ? [imageUrl] : undefined,
      description,
      brand: { '@type': 'Brand', name: 'KIOSK' },
      offers: price
        ? {
            '@type': 'Offer',
            price: price.amount,
            priceCurrency: price.currencyCode || 'USD',
            availability: isAvailable(product)
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: canonical,
          }
        : undefined,
    });
  }

  window.KioskProductDetail = {
    formatPrice,
    getImages,
    isAvailable,
    getFirstVariantId,
    placeholderToProduct,
    collectionHref,
    productPageHref,
    populate,
    populatePlaceholder,
    fetchProduct,
    bindAccordions,
    resetAccordions,
    bindAddToCart,
    updateProductMeta,
    getEl,
  };
})();
