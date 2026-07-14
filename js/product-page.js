/**
 * KIOSK Product Page — dedicated PDP with mobile-first layout
 */
(function () {
  'use strict';

  const PREFIX = 'pdp';
  const detail = () => window.KioskProductDetail;
  let currentProduct = null;
  let gallerySwiper = null;

  function parseHandle() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('handle');
    if (fromQuery) return fromQuery.trim();

    const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function showState({ loading, error, content }) {
    const loadingEl = document.getElementById('pdp-loading');
    const errorEl = document.getElementById('pdp-not-found');
    const contentEl = document.getElementById('pdp-content');
    const stickyBar = document.getElementById('pdp-sticky-bar');

    if (loadingEl) loadingEl.hidden = !loading;
    if (errorEl) errorEl.hidden = !error;
    if (contentEl) contentEl.hidden = !content;
    if (stickyBar) stickyBar.hidden = !content;
  }

  function renderBreadcrumb(product) {
    const el = document.getElementById('pdp-breadcrumb');
    if (!el || !product) return;

    const collectionLink = detail().collectionHref(product);
    const collectionLabel = collectionLink.includes('t-shirts')
      ? 'Essential Tees'
      : collectionLink.includes('hoodies')
        ? 'Hoodies'
        : collectionLink.includes('bracelets')
          ? 'Bracelets'
          : collectionLink.includes('chains')
            ? 'Chains'
            : 'Shop';

    el.innerHTML = `
      <a href="store.html">Shop</a>
      <span class="product-page__breadcrumb-sep" aria-hidden="true">/</span>
      <a href="${collectionLink}">${collectionLabel}</a>
      <span class="product-page__breadcrumb-sep" aria-hidden="true">/</span>
      <span aria-current="page">${product.title}</span>
    `;
  }

  function initGallery(images) {
    const wrapper = document.getElementById('pdp-gallery-slides');
    const thumbs = document.getElementById('pdp-gallery-thumbs');
    if (!wrapper || !images.length) return;

    wrapper.innerHTML = '';
    if (thumbs) thumbs.innerHTML = '';

    images.forEach((image, index) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${image.url}" alt="${image.altText || ''}" loading="${index === 0 ? 'eager' : 'lazy'}">`;
      wrapper.appendChild(slide);

      if (thumbs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `product-detail__thumb${index === 0 ? ' is-active' : ''}`;
        btn.setAttribute('aria-label', `View image ${index + 1}`);
        btn.innerHTML = `<img src="${image.url}" alt="" loading="lazy">`;
        btn.addEventListener('click', () => {
          if (gallerySwiper) gallerySwiper.slideTo(index);
        });
        thumbs.appendChild(btn);
      }
    });

    if (typeof Swiper === 'undefined') return;

    if (gallerySwiper) {
      gallerySwiper.destroy(true, true);
      gallerySwiper = null;
    }

    gallerySwiper = new Swiper('#pdp-gallery-swiper', {
      slidesPerView: 1,
      spaceBetween: 0,
      pagination: {
        el: '#pdp-gallery-swiper .swiper-pagination',
        clickable: true,
      },
      on: {
        slideChange(swiper) {
          if (!thumbs) return;
          thumbs.querySelectorAll('.product-detail__thumb').forEach((thumb, i) => {
            thumb.classList.toggle('is-active', i === swiper.activeIndex);
          });
        },
      },
    });
  }

  function renderProduct(product) {
    currentProduct = product;
    const root = document.getElementById('pdp-content');
    const images = detail().getImages(product);

    detail().populate(PREFIX, product, { root });
    detail().updateProductMeta(product);
    renderBreadcrumb(product);

    const mainImg = detail().getEl(PREFIX, 'main-image');
    if (mainImg) mainImg.style.display = 'none';

    initGallery(images);
    showState({ loading: false, error: false, content: true });
  }

  function bindInteractions() {
    const addBtn = detail().getEl(PREFIX, 'add-to-cart');
    const stickyBtn = detail().getEl(PREFIX, 'sticky-add-to-cart');
    const qtyEl = detail().getEl(PREFIX, 'quantity');

    const cartOptions = { quantityEl: qtyEl };

    detail().bindAddToCart(addBtn, () => currentProduct, cartOptions);

    if (stickyBtn && addBtn) {
      stickyBtn.addEventListener('click', () => addBtn.click());
    }
  }

  async function init() {
    const handle = parseHandle();
    const errorMsg = document.getElementById('pdp-not-found-message');

    if (!handle) {
      if (errorMsg) errorMsg.textContent = 'No product specified.';
      showState({ loading: false, error: true, content: false });
      return;
    }

    showState({ loading: true, error: false, content: false });
    bindInteractions();

    try {
      const product = await detail().fetchProduct(handle, {
        getPlaceholder: (h) => {
          if (typeof getProductImagesByHandle === 'function') {
            const manifest = getProductImagesByHandle(h);
            if (manifest) {
              return {
                title: manifest.title || h,
                mainImage: manifest.product,
                gallery: [manifest.lifestyle].filter(Boolean),
                description: `<p>${manifest.title || h} — an essential piece from KIOSK.</p>`,
                price: { amount: '0', currencyCode: 'USD' },
              };
            }
          }
          return null;
        },
      });

      if (!product.handle) product.handle = handle;
      renderProduct(product);
    } catch (error) {
      console.error('Product page load error:', error);
      if (errorMsg) {
        errorMsg.textContent = 'Product not found. Browse the shop to discover essentials.';
      }
      showState({ loading: false, error: true, content: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
