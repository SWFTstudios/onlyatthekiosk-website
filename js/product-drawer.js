/**
 * KIOSK Product Drawer
 * Underlay reveal (main slides left) with product details from Airtable.
 */
(function () {
  'use strict';

  let isOpen = false;
  let tl = null;
  let enterEndTime = 0;
  let mainEl = null;
  let drawerEl = null;
  let overlayEl = null;
  let panelEl = null;
  let contentEl = null;
  let loadingEl = null;
  let getProducts = () => [];
  let getPlaceholder = null;
  let currentProduct = null;
  let currentHandle = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getDrawerOffset() {
    const width = drawerEl ? drawerEl.offsetWidth : window.innerWidth * 0.85;
    return -width;
  }

  function findCachedProduct(handle) {
    return getProducts().find((p) => p.handle === handle) || null;
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

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text || '';
  }

  function setHtml(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html || '';
  }

  function resetAccordions() {
    document.querySelectorAll('.products_description-item').forEach((item) => {
      item.classList.remove('active');
      const answer = item.querySelector('.products_description-answer');
      if (answer) answer.style.display = 'none';
    });
    const descItem = document.querySelector('.products_description-item');
    if (descItem) {
      descItem.classList.add('active');
      const answer = descItem.querySelector('.products_description-answer');
      if (answer) answer.style.display = 'block';
    }
  }

  function populateDrawer(product) {
    currentProduct = product;
    setText('drawer-product-title', product.title);
    setText('drawer-product-price', formatPrice(product));

    const images = getImages(product);
    const mainImg = $('drawer-main-image');
    if (mainImg && images.length) {
      mainImg.src = images[0].url;
      mainImg.alt = images[0].altText || product.title;
    }

    const gallery = $('drawer-gallery');
    if (gallery) {
      gallery.innerHTML = '';
      images.slice(1).forEach((image) => {
        const item = document.createElement('div');
        item.className = 'products_drawer-more-item';
        const img = document.createElement('img');
        img.className = 'products_drawer-more-image';
        img.loading = 'lazy';
        img.src = image.url;
        img.alt = image.altText || product.title;
        img.addEventListener('click', () => {
          if (mainImg) {
            mainImg.src = image.url;
            mainImg.alt = image.altText || product.title;
          }
        });
        item.appendChild(img);
        gallery.appendChild(item);
      });
    }

    const description = product.descriptionHtml || product.description;
    setHtml('drawer-description', description || '<p>No description available.</p>');

    const care = product.careInstructions
      || product.metafields?.find?.((m) => m.key === 'care_instructions')?.value;
    setHtml('drawer-care-instructions', care || '<p>Hand wash cold. Lay flat to dry. Do not bleach.</p>');

    const delivery = product.delivery
      || product.metafields?.find?.((m) => m.key === 'delivery')?.value
      || '<p>Standard shipping 5–7 business days. Free EU shipping on qualifying orders. Track your order at checkout.</p>';
    setHtml('drawer-delivery', delivery);

    const outOfStock = $('drawer-out-of-stock');
    const addBtn = $('drawer-add-to-cart');
    const available = isAvailable(product);
    if (outOfStock) outOfStock.style.display = available ? 'none' : 'block';
    if (addBtn) addBtn.disabled = !available;

    const err = $('drawer-error');
    if (err) err.style.display = 'none';

    const qty = $('drawer-quantity');
    if (qty) qty.value = '1';

    resetAccordions();
  }

  function populatePlaceholderDrawer(data) {
    currentProduct = null;
    setText('drawer-product-title', data.title);
    setText('drawer-product-price', `${data.price.amount} ${data.price.currencyCode}`);

    const mainImg = $('drawer-main-image');
    if (mainImg) {
      mainImg.src = data.mainImage;
      mainImg.alt = data.title;
    }

    const gallery = $('drawer-gallery');
    if (gallery) {
      gallery.innerHTML = '';
      (data.gallery || []).forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'products_drawer-more-item';
        const img = document.createElement('img');
        img.className = 'products_drawer-more-image';
        img.loading = 'lazy';
        img.src = url;
        img.alt = `${data.title} - Image ${index + 2}`;
        img.addEventListener('click', () => {
          if (mainImg) {
            mainImg.src = url;
            mainImg.alt = `${data.title} - Image ${index + 2}`;
          }
        });
        item.appendChild(img);
        gallery.appendChild(item);
      });
    }

    setHtml('drawer-description', data.description || '');
    setHtml('drawer-care-instructions', data.careInstructions || '');
    setHtml('drawer-delivery', data.delivery || '<p>Shipping details provided at checkout.</p>');

    const outOfStock = $('drawer-out-of-stock');
    const addBtn = $('drawer-add-to-cart');
    if (outOfStock) outOfStock.style.display = 'none';
    if (addBtn) addBtn.disabled = false;

    const err = $('drawer-error');
    if (err) err.style.display = 'none';

    resetAccordions();
  }

  function showLoading(show) {
    if (loadingEl) loadingEl.classList.toggle('is-visible', show);
    if (contentEl) contentEl.classList.toggle('is-loading', show);
  }

  function showError(message) {
    const err = $('drawer-error');
    if (err) {
      err.style.display = 'block';
      const inner = err.querySelector('div');
      if (inner) inner.textContent = message || 'Error loading product details.';
    }
  }

  async function fetchProduct(handle) {
    const cached = findCachedProduct(handle);
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

    throw new Error(`Product "${handle}" not found`);
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

  function pauseLenis() {
    if (window.lenis && typeof window.lenis.stop === 'function') {
      window.lenis.stop();
    }
  }

  function resumeLenis() {
    if (window.lenis && typeof window.lenis.start === 'function') {
      window.lenis.start();
    }
  }

  function onCloseComplete() {
    isOpen = false;
    drawerEl.classList.remove('is-open', 'is-animated');
    drawerEl.setAttribute('aria-hidden', 'true');
    document.body.removeAttribute('data-drawer-status');
    if (window.KioskScrollLock) window.KioskScrollLock.unlock();
    document.dispatchEvent(new CustomEvent('drawerClose'));
    if (window.jQuery) window.jQuery(document).trigger('drawerClose');
    resumeLenis();
    showLoading(false);
  }

  function buildTimeline() {
    if (typeof gsap === 'undefined') return;

    const ease = typeof CustomEase !== 'undefined' ? 'energy' : 'power2.inOut';
    const reveals = drawerEl.querySelectorAll('[data-drawer-reveal]');

    tl = gsap.timeline({
      paused: true,
      defaults: { ease },
      onReverseComplete: onCloseComplete,
    });

    gsap.set(overlayEl, { visibility: 'hidden', pointerEvents: 'none' });
    gsap.set(overlayEl.querySelector('.product-drawer-overlay__dark'), { opacity: 0 });

    tl.set(overlayEl, { visibility: 'visible', pointerEvents: 'auto' }, 0);
    tl.to([mainEl, overlayEl], { x: getDrawerOffset, duration: 0.7 }, 0);
    tl.to(overlayEl.querySelector('.product-drawer-overlay__dark'), { opacity: 1, duration: 0.45 }, 0);

    if (reveals.length) {
      tl.fromTo(
        reveals,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04 },
        0.12
      );
    }

    enterEndTime = tl.duration();
  }

  function animateOpen() {
    if (!tl) buildTimeline();
    if (!tl) {
      drawerEl.classList.add('is-open');
      return;
    }
    tl.invalidate();
    tl.timeScale(1).play();
    requestAnimationFrame(() => drawerEl.classList.add('is-animated'));
  }

  function animateClose() {
    if (!tl || !isOpen) {
      onCloseComplete();
      return;
    }
    tl.timeScale(1).reverse();
  }

  function openDrawer(productHandle) {
    if (!productHandle || !drawerEl) return;

    if (window.KioskNav && typeof window.KioskNav.isOpen === 'function' && window.KioskNav.isOpen()) {
      window.KioskNav.closeMenu();
    }

    currentHandle = productHandle;
    currentProduct = null;
    isOpen = true;

    drawerEl.classList.add('is-open');
    drawerEl.setAttribute('aria-hidden', 'false');
    document.body.setAttribute('data-drawer-status', 'open');
    if (window.KioskScrollLock) window.KioskScrollLock.lock();
    document.dispatchEvent(new CustomEvent('drawerOpen'));
    if (window.jQuery) window.jQuery(document).trigger('drawerOpen');
    pauseLenis();

    if (productHandle.startsWith('product-handle-') && typeof getPlaceholder === 'function') {
      populateDrawer(placeholderToProduct(getPlaceholder(productHandle), productHandle));
      animateOpen();
      return;
    }

    const cached = findCachedProduct(productHandle);
    if (cached) {
      populateDrawer(cached);
      showLoading(false);
      animateOpen();
      return;
    }

    // Use manifest placeholder immediately when offline / no Airtable
    if (typeof getPlaceholder === 'function') {
      const placeholder = getPlaceholder(productHandle);
      if (placeholder && placeholder.title && placeholder.title !== 'Product') {
        populateDrawer(placeholderToProduct(placeholder, productHandle));
        showLoading(false);
        animateOpen();
        return;
      }
    }

    showLoading(true);
    animateOpen();

    fetchProduct(productHandle)
      .then((product) => {
        if (currentHandle !== productHandle) return;
        populateDrawer(product);
        showLoading(false);
      })
      .catch((error) => {
        console.error('Product drawer load error:', error);
        if (typeof getPlaceholder === 'function') {
          const placeholder = getPlaceholder(productHandle);
          if (placeholder) {
            populateDrawer(placeholderToProduct(placeholder, productHandle));
            showLoading(false);
            return;
          }
        }
        showLoading(false);
        showError('Failed to load product details. Please try again.');
      });
  }

  function closeDrawer() {
    if (!isOpen) return;
    animateClose();
  }

  function resolveProductHandle(el) {
    if (!el) return null;
    const direct = el.dataset.productHandle;
    if (direct) return direct;
    let index = el.dataset.productIndex;
    if (index === undefined || index === '') {
      const items = document.querySelectorAll('.carousel_item');
      index = Array.from(items).indexOf(el);
    }
    const slide = document.querySelectorAll('.swiper-slide')[Number(index)];
    return slide?.dataset.productHandle || null;
  }

  function getActiveProductHandle() {
    const activeSlide = document.querySelector('.swiper-slide-active');
    if (activeSlide) {
      const handle = resolveProductHandle(activeSlide);
      if (handle) return handle;
    }
    if (window.collectionSwiper && typeof window.collectionSwiper.activeIndex === 'number') {
      const slide = document.querySelectorAll('.swiper-slide')[window.collectionSwiper.activeIndex];
      const handle = resolveProductHandle(slide);
      if (handle) return handle;
    }
    const btn = $('carousel-view-btn');
    return btn?.dataset.productHandle || null;
  }

  function bindInteractions() {
    const viewBtn = $('carousel-view-btn');
    let viewBtnTouchTs = 0;

    function activateView(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const handle = getActiveProductHandle();
      if (handle) openDrawer(handle);
    }

    if (viewBtn) {
      viewBtn.addEventListener('touchend', (e) => {
        viewBtnTouchTs = Date.now();
        activateView(e);
      }, { passive: false });
      viewBtn.addEventListener('click', (e) => {
        if (Date.now() - viewBtnTouchTs < 600) return;
        activateView(e);
      });
    }

    document.addEventListener('click', (e) => {
      const wrap = e.target.closest('[carousel="wrap"], .carousel_list, .carousel_item');
      if (!wrap) return;
      if (e.target.closest('.carousel-view-btn, .carousel_arrow_link')) return;
      e.preventDefault();
      const handle = getActiveProductHandle();
      if (handle) openDrawer(handle);
    });

    document.addEventListener('click', (e) => {
      const title = e.target.closest('.swiper-slide h2');
      if (!title) return;
      e.preventDefault();
      const slide = title.closest('.swiper-slide');
      const handle = resolveProductHandle(slide);
      if (handle) openDrawer(handle);
    });

    const closeBtn = $('drawer-close-btn');
    const scrim = $('drawer-close-overlay');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (scrim) scrim.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeDrawer();
    });

    document.querySelectorAll('.products_description-question').forEach((question) => {
      question.addEventListener('click', () => {
        const item = question.closest('.products_description-item');
        if (!item) return;
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.products_description-item').forEach((i) => {
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

    const addBtn = $('drawer-add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true;
        const original = addBtn.textContent;
        addBtn.textContent = 'Adding...';
        try {
          let product = currentProduct;
          if (!product && currentHandle) {
            product = await fetchProduct(currentHandle);
            currentProduct = product;
          }
          if (!product) throw new Error('No product loaded');
          console.log('Add to cart:', product.title);
          addBtn.textContent = 'Added!';
          setTimeout(() => {
            addBtn.textContent = original;
            addBtn.disabled = !isAvailable(product);
          }, 2000);
        } catch (err) {
          console.error(err);
          addBtn.textContent = 'Error';
          setTimeout(() => {
            addBtn.textContent = original;
            addBtn.disabled = false;
          }, 2000);
        }
      });
    }

    window.addEventListener('resize', () => {
      if (isOpen && tl) {
        gsap.set([mainEl, overlayEl], { x: getDrawerOffset() });
        tl.invalidate();
      }
    });
  }

  function init(options = {}) {
    if (typeof gsap === 'undefined') {
      console.warn('GSAP not loaded — product drawer animation disabled');
    }

    drawerEl = $('product-drawer');
    mainEl = document.querySelector('[data-main]');
    overlayEl = document.querySelector('[data-product-drawer-overlay]');
    panelEl = drawerEl?.querySelector('.product-drawer__panel');
    contentEl = drawerEl?.querySelector('.product-drawer__content');
    loadingEl = drawerEl?.querySelector('.product-drawer__loading');

    if (!drawerEl || !mainEl || !overlayEl) {
      console.warn('Product drawer elements not found');
      return;
    }

    getProducts = options.getProducts || (() => window.collectionProducts || []);
    getPlaceholder = options.getPlaceholder || window.getProductPlaceholder || null;

    drawerEl.classList.add('product-drawer');
    if (panelEl) panelEl.classList.add('product-drawer__panel');

    buildTimeline();
    bindInteractions();

    window.openProductDrawer = openDrawer;
    window.KioskProductDrawer = { init, open: openDrawer, close: closeDrawer, isOpen: () => isOpen };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.KIOSK_PRODUCT_DRAWER_CONFIG) init(window.KIOSK_PRODUCT_DRAWER_CONFIG);
    });
  } else if (window.KIOSK_PRODUCT_DRAWER_CONFIG) {
    init(window.KIOSK_PRODUCT_DRAWER_CONFIG);
  }

  window.KioskProductDrawer = { init, open: openDrawer, close: closeDrawer, isOpen: () => isOpen };
})();
