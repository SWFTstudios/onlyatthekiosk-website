/**
 * KIOSK Product Drawer
 * Underlay reveal (main slides left) with product details from Airtable.
 */
(function () {
  'use strict';

  const PREFIX = 'drawer';
  const detail = () => window.KioskProductDetail;

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

  function showLoading(show) {
    if (loadingEl) loadingEl.classList.toggle('is-visible', show);
    if (contentEl) contentEl.classList.toggle('is-loading', show);
  }

  function showError(message) {
    const err = detail().getEl(PREFIX, 'error');
    if (err) {
      err.style.display = 'block';
      const inner = err.querySelector('div');
      if (inner) inner.textContent = message || 'Error loading product details.';
    }
  }

  function populateDrawer(product) {
    currentProduct = product;
    const root = drawerEl;
    detail().populate(PREFIX, product, { root });
    detail().bindAccordions(root);
  }

  function populatePlaceholderDrawer(data, handle) {
    currentProduct = null;
    populateDrawer(detail().placeholderToProduct(data, handle));
  }

  async function fetchProduct(handle) {
    return detail().fetchProduct(handle, { getProducts, getPlaceholder });
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
      populatePlaceholderDrawer(getPlaceholder(productHandle), productHandle);
      animateOpen();
      return;
    }

    const cached = getProducts().find((p) => p.handle === productHandle);
    if (cached) {
      populateDrawer(cached);
      showLoading(false);
      animateOpen();
      return;
    }

    if (typeof getPlaceholder === 'function') {
      const placeholder = getPlaceholder(productHandle);
      if (placeholder && placeholder.title && placeholder.title !== 'Product') {
        populateDrawer(detail().placeholderToProduct(placeholder, productHandle));
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
            populateDrawer(detail().placeholderToProduct(placeholder, productHandle));
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

    detail().bindAccordions(drawerEl);

    const addBtn = detail().getEl(PREFIX, 'add-to-cart');
    const qtyEl = detail().getEl(PREFIX, 'quantity');
    detail().bindAddToCart(addBtn, async () => {
      if (currentProduct) return currentProduct;
      if (currentHandle) {
        currentProduct = await fetchProduct(currentHandle);
        return currentProduct;
      }
      return null;
    }, { quantityEl: qtyEl });

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

    if (!window.KioskProductDetail) {
      console.warn('KioskProductDetail not loaded — product drawer disabled');
      return;
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
