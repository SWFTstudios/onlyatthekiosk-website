/**
 * KIOSK 3D Collection Carousel
 * Full-viewport swipe, load-first init, Swiper + GSAP sync
 */
(function () {
  'use strict';

  const INTRO_SEEN_KEY = 'kiosk-carousel-seen';
  const INTRO_DURATION = 1.5;

  function getAssetBase() {
    if (window.KioskCarousel3DConfig && window.KioskCarousel3DConfig.assetBase !== undefined) {
      return window.KioskCarousel3DConfig.assetBase;
    }
    return window.location.pathname.includes('/collections/') ? '../' : '';
  }

  function getCollectionHandle() {
    if (window.KioskCarousel3DConfig && window.KioskCarousel3DConfig.collectionHandle) {
      return window.KioskCarousel3DConfig.collectionHandle;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('collection')) return params.get('collection');
    const parts = window.location.pathname.split('/');
    const last = parts[parts.length - 1].replace('.html', '');
    return last || 't-shirts';
  }

  function formatCollectionTitle(handle) {
    if (!handle) return 'Collection';
    return handle.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function updateCollectionTitle(title) {
    const textEl = document.querySelector('#collection-title .collection-title-text');
    const pageTitle = document.getElementById('page-title');
    if (textEl) textEl.textContent = title;
    if (pageTitle) pageTitle.textContent = `${title} — KIOSK`;
  }

  function waitForAirtable(maxAttempts = 50, attempt = 0) {
    return new Promise((resolve, reject) => {
      if (window.airtable || window.shopify) resolve();
      else if (attempt >= maxAttempts) reject(new Error('Product client not available'));
      else setTimeout(() => waitForAirtable(maxAttempts, attempt + 1).then(resolve).catch(reject), 100);
    });
  }

  function compute3DLayout(wrapEl, productCount) {
    const $wrap = $(wrapEl);
    const $items = $wrap.find('.carousel_item');
    const count = productCount || $items.length;
    if (!count) return 0;

    const rotateAmount = 360 / count;
    const zTranslate = 2 * Math.tan((rotateAmount / 2) * (Math.PI / 180));
    const negTranslate = `calc(var(--3d-carousel-item-width) / -${zTranslate} - var(--3d-carousel-gap))`;
    const posTranslate = `calc(var(--3d-carousel-item-width) / ${zTranslate} + var(--3d-carousel-gap))`;

    $wrap.css({ '--3d-carousel-z': negTranslate, perspective: posTranslate });

    $items.each(function (index) {
      $(this).css({
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotateY(${rotateAmount * index}deg) translateZ(${posTranslate})`,
      });
      const img = $(this).find('.carousel_img');
      if (img.length) {
        img.on('load', function () {
          $(this).css({ opacity: 1, visibility: 'visible' });
        }).on('error', function () {
          $(this).attr('src', `${getAssetBase()}images/kiosk-placeholder-product-img.webp`);
        });
        if (img[0].complete && img[0].naturalHeight !== 0) {
          img.css({ opacity: 1, visibility: 'visible' });
        }
      }
    });

    return rotateAmount;
  }

  function buildCarouselDOM(products, assetBase) {
    const placeholder = `${assetBase}images/kiosk-placeholder-product-img.webp`;
    const $list = $('.carousel_list');
    const $wrapper = $('.swiper-wrapper');
    $list.empty();
    $wrapper.empty();

    products.forEach((product, index) => {
      const imageUrl =
        product.images && product.images.edges && product.images.edges.length > 0
          ? product.images.edges[0].node.url
          : placeholder;

      $list.append(`
        <div class="carousel_item" data-product-index="${index}">
          <img src="${imageUrl}" alt="${product.title}" class="carousel_img" loading="${index < 3 ? 'eager' : 'lazy'}">
          <div class="carousel_ratio"></div>
        </div>
      `);

      $wrapper.append(`
        <div class="swiper-slide" data-product-handle="${product.handle}">
          <h2>${product.title}</h2>
          <a href="#" class="button view-details-btn">View</a>
        </div>
      `);
    });
  }

  async function loadCollectionProducts(handle) {
    const client = window.airtable || window.shopify;
    if (!client) {
      updateCollectionTitle(formatCollectionTitle(handle));
      return null;
    }

    try {
      const collection = await client.getProductsByCollection(handle, 50);
      if (collection && collection.products && collection.products.edges && collection.products.edges.length > 0) {
        const products = collection.products.edges.map((edge) => edge.node);
        updateCollectionTitle(collection.title || formatCollectionTitle(handle));
        return products;
      }
      updateCollectionTitle(collection?.title || formatCollectionTitle(handle));
      return null;
    } catch (err) {
      console.error('Error loading collection products:', err);
      updateCollectionTitle(formatCollectionTitle(handle));
      return null;
    }
  }

  function ensureTouchLayer(componentEl) {
    const $component = $(componentEl);
    if ($component.find('.carousel-3d__touch').length) return $component.find('.carousel-3d__touch')[0];
    const touch = document.createElement('div');
    touch.className = 'carousel-3d__touch';
    touch.setAttribute('aria-hidden', 'true');
    $component.prepend(touch);
    return touch;
  }

  function bindFullAreaTouch(touchEl, swiper) {
    let startY = 0;
    let startX = 0;
    let tracking = false;

    touchEl.addEventListener(
      'touchstart',
      (e) => {
        if (e.target.closest('.view-details-btn, .carousel_arrow_link, .swiper-slide a, .swiper-slide button')) return;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        tracking = true;
        if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
      },
      { passive: true }
    );

    touchEl.addEventListener(
      'touchend',
      (e) => {
        if (!tracking) return;
        tracking = false;
        const endY = e.changedTouches[0].clientY;
        const endX = e.changedTouches[0].clientX;
        const deltaY = endY - startY;
        const deltaX = endX - startX;

        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 40) {
          if (deltaY < 0) swiper.slideNext();
          else swiper.slidePrev();
        }

        if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
      },
      { passive: true }
    );
  }

  function playIntro(wrapEl, onComplete) {
    const skipIntro = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';

    if (typeof gsap === 'undefined' || !wrapEl) {
      onComplete();
      return;
    }

    if (skipIntro) {
      gsap.set(wrapEl, { opacity: 1, '--3d-carousel-rotate': 0, '--3d-carousel-rotate-x': -4 });
      gsap.set('[fade-up]', { opacity: 1 });
      onComplete();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
        onComplete();
      },
    });

    tl.to(wrapEl, { opacity: 1, duration: 0.25 });
    tl.fromTo(
      wrapEl,
      { '--3d-carousel-rotate': 100, '--3d-carousel-rotate-x': -90 },
      { '--3d-carousel-rotate': 0, '--3d-carousel-rotate-x': -4, duration: INTRO_DURATION, ease: 'power2.inOut' },
      '<'
    );
    tl.to('[fade-up]', { opacity: 1 }, '>-0.2');
  }

  function animateCollectionTitle() {
    const el = document.getElementById('collection-title');
    if (!el || typeof gsap === 'undefined') return;

    gsap.set(el, { left: '50%', top: '50%', xPercent: -50, yPercent: -50 });
    gsap.to(el, {
      top: '6rem',
      yPercent: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      delay: 1,
    });
  }

  function initSwiper(componentEl, wrapEl, rotateAmount) {
    const $component = $(componentEl);
    const swiperEl = $component.find('.swiper')[0];
    const nextEl = $component.find('[carousel="next"]')[0];
    const prevEl = $component.find('[carousel="prev"]')[0];
    const slides = $component.find('.swiper-slide');

    if (!swiperEl || slides.length === 0) {
      console.warn('No swiper slides — skipping init');
      return null;
    }

    if (window.kioskCarouselSwiper) {
      window.kioskCarouselSwiper.destroy(true, true);
    }

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      wrapEl,
      { '--3d-carousel-rotate': 0 },
      { '--3d-carousel-rotate': -(360 - rotateAmount), duration: 30, ease: 'none' }
    );

    const progress = { value: 0 };
    const useLoop = slides.length > 2;

    const swiper = new Swiper(swiperEl, {
      effect: 'creative',
      creativeEffect: {
        prev: { translate: [0, '-100%', 0], scale: 0.5, opacity: 0 },
        next: { translate: [0, '100%', 0], scale: 0.5, opacity: 0 },
      },
      grabCursor: true,
      simulateTouch: true,
      allowTouchMove: true,
      touchRatio: 1,
      touchAngle: 45,
      threshold: 10,
      longSwipesRatio: 0.3,
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 450,
      loop: useLoop,
      resistance: true,
      resistanceRatio: 0.85,
      keyboard: { enabled: true, onlyInViewport: true },
      mousewheel: {
        enabled: true,
        eventsTarget: '[carousel="component"]',
        sensitivity: 1,
        forceToAxis: true,
      },
      navigation: {
        nextEl,
        prevEl,
        disabledClass: 'swiper-button-disabled',
      },
      touchEventsTarget: 'container',
      preventClicks: true,
      preventClicksPropagation: true,
    });

    swiper.on('progress', (e) => {
      gsap.to(progress, {
        value: e.progress,
        onUpdate: () => {
          tl.progress(progress.value);
        },
      });
    });

    const touchEl = ensureTouchLayer(componentEl);
    bindFullAreaTouch(touchEl, swiper);

    window.kioskCarouselSwiper = swiper;
    window.kioskCarouselRotationTl = tl;
    return swiper;
  }

  function initDrawer() {
    const $drawer = $('#product-drawer');
    if (!$drawer.length) return;

    let currentProductData = null;
    let currentProductHandle = null;

    async function fetchProduct(handle) {
      const client = window.airtable || window.shopify;
      if (!client) throw new Error('Product client not loaded');
      const product = await client.getProductByHandle(handle);
      if (!product) throw new Error(`Product "${handle}" not found`);
      return product;
    }

    function populateDrawer(product) {
      $('#drawer-product-title').text(product.title);
      const price = product.priceRange.minVariantPrice;
      const formatted = (window.airtable || window.shopify)
        ? (window.airtable || window.shopify).formatPrice(price.amount, price.currencyCode)
        : `${price.amount} ${price.currencyCode}`;
      $('#drawer-product-price').text(formatted);

      if (product.images.edges.length > 0) {
        const main = product.images.edges[0].node;
        $('#drawer-main-image').attr('src', main.url).attr('alt', main.altText || product.title);
        const $gallery = $('#drawer-gallery').empty();
        product.images.edges.slice(1).forEach(({ node: image }) => {
          const $item = $('<div class="products_drawer-more-item"></div>');
          const $img = $('<img class="products_drawer-more-image" loading="lazy">')
            .attr('src', image.url)
            .attr('alt', image.altText || product.title);
          $item.append($img).on('click', () => {
            $('#drawer-main-image').attr('src', image.url).attr('alt', image.altText || product.title);
          });
          $gallery.append($item);
        });
      }

      if (product.descriptionHtml) $('#drawer-description').html(product.descriptionHtml);
      else if (product.description) $('#drawer-description').text(product.description);
      else $('#drawer-description').text('No description available.');

      const care = (window.airtable || window.shopify) ? (window.airtable || window.shopify).getCareGuide(product) : null;
      if (care) $('#drawer-care-instructions').html(care);
      else $('#drawer-care-instructions').html('<p>Care instructions not available.</p>');

      const delivery = (window.airtable || window.shopify) ? (window.airtable || window.shopify).getMetafield(product, 'custom', 'delivery') : null;
      if (delivery) $('#drawer-delivery').html(delivery);
      else $('#drawer-delivery').text('Shipping details provided at checkout. Free EU shipping on qualifying orders.');

      const available = product.variants.edges[0]?.node.availableForSale || false;
      $('#drawer-out-of-stock').toggle(!available);
      $('#drawer-add-to-cart').prop('disabled', !available);
      $('#drawer-error').hide();
    }

    function getPlaceholderProduct(handle) {
      const assetBase = getAssetBase();
      const placeholder = `${assetBase}images/kiosk-placeholder-product-img.webp`;
      const match = handle.match(/product-handle-(\d+)/);
      const index = match ? parseInt(match[1], 10) - 1 : 0;
      const num = String(index + 1).padStart(3, '0');
      return {
        title: `Product ${num}`,
        price: { amount: '299.00', currencyCode: 'SEK' },
        mainImage: placeholder,
        gallery: [placeholder, placeholder],
        description: `<p>Product ${num} — an essential piece from KIOSK.</p>`,
        careInstructions: '<p>Hand wash cold. Lay flat to dry.</p>',
      };
    }

    function populatePlaceholderDrawer(data) {
      $('#drawer-product-title').text(data.title);
      $('#drawer-product-price').text(`${data.price.amount} ${data.price.currencyCode}`);
      $('#drawer-main-image').attr('src', data.mainImage).attr('alt', data.title);
      const $gallery = $('#drawer-gallery').empty();
      (data.gallery || []).forEach((url, i) => {
        const $item = $('<div class="products_drawer-more-item"></div>');
        $item.append($('<img class="products_drawer-more-image" loading="lazy">').attr('src', url));
        $item.on('click', () => $('#drawer-main-image').attr('src', url));
        $gallery.append($item);
      });
      $('#drawer-description').html(data.description || '');
      $('#drawer-care-instructions').html(data.careInstructions || '');
      $('#drawer-delivery').text('Standard shipping: 5–7 business days.');
      $('#drawer-error, #drawer-out-of-stock').hide();
      $('#drawer-add-to-cart').prop('disabled', false);
    }

    function openDrawer(handle) {
      currentProductHandle = handle;
      currentProductData = null;
      $drawer.addClass('open');
      $('body').css('overflow', 'hidden');
      $(document).trigger('drawerOpen');

      if (handle && handle.startsWith('product-handle-')) {
        populatePlaceholderDrawer(getPlaceholderProduct(handle));
        return;
      }

      $('#drawer-loading').show();
      fetchProduct(handle)
        .then((product) => {
          currentProductData = product;
          populateDrawer(product);
          $('#drawer-loading').hide();
        })
        .catch((err) => {
          console.error(err);
          $('#drawer-loading').hide();
          $('#drawer-error').show();
        });
    }

    function closeDrawer() {
      $drawer.removeClass('open');
      $('body').css('overflow', '');
      $(document).trigger('drawerClose');
    }

    $(document).on('click', '.view-details-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const handle = $(this).closest('.swiper-slide').data('product-handle');
      if (handle) openDrawer(handle);
    });

    $('#drawer-close-btn, #drawer-close-overlay').on('click', closeDrawer);
    $(document).on('keydown', (e) => {
      if (e.key === 'Escape' && $drawer.hasClass('open')) closeDrawer();
    });

    $('.products_description-question').on('click', function () {
      const $item = $(this).closest('.products_description-item');
      const wasActive = $item.hasClass('active');
      $('.products_description-item').removeClass('active');
      if (!wasActive) $item.addClass('active');
    });

    $('#drawer-add-to-cart').on('click', async function () {
      const $btn = $(this);
      const original = $btn.text();
      $btn.prop('disabled', true).text('Adding...');
      try {
        let product = currentProductData;
        if (!product && currentProductHandle) {
          product = await fetchProduct(currentProductHandle);
          currentProductData = product;
        }
        if (!product) throw new Error('Product data not available');
        const variant = product.variants.edges[0]?.node;
        if (!variant?.availableForSale) throw new Error('Out of stock');
        if (!window.cart) throw new Error('Cart not loaded');
        await window.cart.addItem(variant.id, parseInt($('#drawer-quantity').val(), 10) || 1);
        $btn.text('Added!');
        setTimeout(() => $btn.text(original), 2000);
      } catch (err) {
        alert('Failed to add to cart: ' + err.message);
        $btn.text(original);
      } finally {
        $btn.prop('disabled', false);
      }
    });
  }

  function initDebugBorders() {
    window.toggleDebugBorders = function toggleDebugBorders() {
      document.documentElement.classList.toggle('debug-borders');
      return document.documentElement.classList.contains('debug-borders');
    };
    if (window.location.search.includes('debug=borders')) window.toggleDebugBorders();
  }

  async function initCarousel() {
    const component = document.querySelector('[carousel="component"]');
    const wrap = document.querySelector("[carousel='wrap']");
    if (!component || !wrap) return;

    const handle = getCollectionHandle();
    const assetBase = getAssetBase();

    updateCollectionTitle(formatCollectionTitle(handle));
    animateCollectionTitle();

    let products = null;
    try {
      await waitForAirtable();
      products = await loadCollectionProducts(handle);
    } catch {
      console.warn('Airtable unavailable — using placeholder products');
    }

    if (products && products.length > 0) {
      buildCarouselDOM(products, assetBase);
    }

    const productCount = $('.carousel_item').length;
    if (!productCount) {
      console.warn('No carousel items found');
      return;
    }

    const rotateAmount = compute3DLayout(wrap, productCount);

    playIntro(wrap, () => {
      initSwiper(component, wrap, rotateAmount);
    });
  }

  window.KioskCarousel3D = {
    init: initCarousel,
    reinit(products) {
      const assetBase = getAssetBase();
      if (products && products.length) buildCarouselDOM(products, assetBase);
      const wrap = document.querySelector("[carousel='wrap']");
      const component = document.querySelector('[carousel="component"]');
      const rotateAmount = compute3DLayout(wrap, $('.carousel_item').length);
      initSwiper(component, wrap, rotateAmount);
    },
  };

  function boot() {
    initDebugBorders();
    initDrawer();

    $(document).on('drawerOpen', () => {
      document.body.style.overflow = 'hidden';
    });
    $(document).on('drawerClose', () => {
      document.body.style.overflow = '';
    });

    if (typeof $ !== 'undefined') {
      $(initCarousel);
    } else {
      document.addEventListener('DOMContentLoaded', initCarousel);
    }
  }

  boot();
})();
