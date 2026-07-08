/**
 * KIOSK 3D Collection Carousel
 *
 * Interaction model:
 *   - The 3D ring is the single source of truth (state.rotation, degrees).
 *   - Drag/swipe horizontally anywhere on the carousel to spin the ring 1:1.
 *   - On release, momentum carries the ring, then it snaps to the nearest
 *     card so the active card always lands front-facing the customer.
 *   - Tap the front card to open the product view; tap a side card to bring
 *     it to the front. Arrows, keyboard and mousewheel drive the same ring.
 *   - Product titles crossfade as a follower of the ring (no Swiper).
 *
 * Debugging (visual aids for tuning motion):
 *   - ?debug=motion  → live HUD (rotation, velocity, active index, FPS,
 *     snap target) + GSDevTools scrubber for the intro timeline.
 *   - ?debug=borders → container border overlay (see INSTRUCTIONS.md).
 */
(function () {
  'use strict';

  const INTRO_SEEN_KEY = 'kiosk-carousel-seen';
  const REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * MOTION SPEC — every duration/ease/threshold in one place.
   * Tune these like an animator: all values are plain numbers/strings.
   * ------------------------------------------------------------------ */
  const MOTION = {
    intro: {
      duration: REDUCED_MOTION ? 0 : 1.5,   // s — first-visit ring build-in
      fromRotate: 100,                      // deg — ring starts wound up
      fromTilt: -90,                        // deg — ring starts flat (top view)
      ease: 'power2.inOut',
      fadeDuration: 0.4,                    // s — [fade-up] elements
    },
    drag: {
      // Dragging one card-width of pixels rotates the ring by one card.
      sensitivity: 1.0,                     // multiplier on deg-per-px
      tapMaxMovement: 8,                    // px — under this = tap, not drag
      tapMaxDuration: 300,                  // ms — under this = tap, not drag
      velocitySampleWindow: 100,            // ms — window for release velocity
    },
    inertia: {
      projection: 0.22,                     // s — velocity carry (deg = v * this)
      maxFlingCards: 3,                     // clamp momentum to N cards per fling
      minDuration: 0.45,                    // s — settle tween floor
      maxDuration: 1.1,                     // s — settle tween ceiling
      durationPerDeg: 0.006,                // s per degree of travel
      // Slight overshoot so the card "lands" with weight (easeOutBack-lite).
      settleEase: { id: 'kioskLand', bezier: '0.22, 1.15, 0.32, 1' },
      settleEaseFallback: 'power3.out',
    },
    step: {
      // Arrow / keyboard / wheel: exactly one card per action.
      duration: REDUCED_MOTION ? 0.2 : 0.65, // s
      wheelThreshold: 30,                    // accumulated deltaY before a step
      wheelLockout: 350,                     // ms between wheel steps
    },
    tilt: {
      // Velocity-based X tilt while spinning — adds physicality, rests at 0
      // so the landed card faces the customer dead-on.
      max: 6,                                // deg (applied negative)
      velocityRef: 600,                      // deg/s that maps to full tilt
      duration: 0.45,                        // s — tilt easing
      ease: 'power2.out',
    },
    title: {
      duration: 0.28,                        // s — crossfade per card change
      travel: 14,                            // px — vertical slide distance
      ease: 'power2.out',
    },
  };

  let settleEase = MOTION.inertia.settleEaseFallback;

  function registerEases() {
    if (typeof gsap === 'undefined') return;
    if (typeof CustomEase !== 'undefined') {
      gsap.registerPlugin(CustomEase);
      try {
        settleEase = CustomEase.create(MOTION.inertia.settleEase.id, MOTION.inertia.settleEase.bezier);
      } catch (e) {
        settleEase = MOTION.inertia.settleEaseFallback;
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Config / helpers
   * ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ *
   * 3D layout
   * ------------------------------------------------------------------ */

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
        img.attr('decoding', 'async');
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
    const $titles = $('.carousel-titles_wrapper, .swiper-wrapper');
    $list.empty();
    $titles.empty();

    products.forEach((product, index) => {
      const imageUrl =
        product.images && product.images.edges && product.images.edges.length > 0
          ? product.images.edges[0].node.url
          : placeholder;

      $list.append(`
        <div class="carousel_item" data-product-index="${index}" data-product-handle="${product.handle}">
          <img src="${imageUrl}" alt="${product.title}" class="carousel_img" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">
          <div class="carousel_ratio"></div>
        </div>
      `);

      $titles.append(`
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

  /* ------------------------------------------------------------------ *
   * Ring controller — drag-to-spin, inertia, snap, front-facing landing
   * ------------------------------------------------------------------ */

  let drawerOpenFn = null; // set by initDrawer()
  let controller = null;

  function createRingController(componentEl, wrapEl, rotateAmount) {
    const count = $(wrapEl).find('.carousel_item').length;
    if (!count) return null;

    const items = $(wrapEl).find('.carousel_item').toArray();
    const slides = () => $(componentEl).find('.swiper-slide');

    const state = {
      rotation: 0,   // deg, continuous (unbounded)
      tilt: 0,       // deg, X tilt (rests at 0 = front-facing)
      velocity: 0,   // deg/s, live during drag/inertia
      activeIndex: 0,
      snapTarget: 0, // deg, last computed snap destination
      dragging: false,
      settling: false,
    };

    const setRotate = gsap.quickSetter(wrapEl, '--3d-carousel-rotate', 'deg');
    const setTilt = gsap.quickSetter(wrapEl, '--3d-carousel-rotate-x', 'deg');
    const wrapIndex = gsap.utils.wrap(0, count);
    const snapToCard = gsap.utils.snap(rotateAmount);

    let degPerPx = rotateAmount / Math.max(items[0].offsetWidth || 300, 1);

    function measure() {
      const w = items[0] ? items[0].offsetWidth : 0;
      degPerPx = (rotateAmount / Math.max(w || 300, 1)) * MOTION.drag.sensitivity;
    }

    function render() {
      setRotate(state.rotation);
      setTilt(state.tilt);
      const idx = wrapIndex(Math.round(-state.rotation / rotateAmount));
      if (idx !== state.activeIndex) {
        const direction = deltaDirection(state.activeIndex, idx);
        state.activeIndex = idx;
        applyActiveCard(idx);
        crossfadeTitle(idx, direction);
      }
    }

    function deltaDirection(fromIdx, toIdx) {
      // Shortest ring direction: +1 next (rotation decreasing), -1 prev.
      const diff = wrapIndex(toIdx - fromIdx);
      return diff <= count / 2 ? 1 : -1;
    }

    function applyActiveCard(idx) {
      items.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    }

    function crossfadeTitle(idx, direction) {
      const $slides = slides();
      if (!$slides.length) return;
      const dir = direction >= 0 ? 1 : -1;
      $slides.each(function (i) {
        if (i === idx) return;
        if (this.classList.contains('is-active-title')) {
          const el = this;
          gsap.to(el, {
            autoAlpha: 0,
            y: -MOTION.title.travel * dir,
            duration: MOTION.title.duration,
            ease: MOTION.title.ease,
            overwrite: 'auto',
            onComplete: () => el.classList.remove('is-active-title'),
          });
        }
      });
      const incoming = $slides.get(idx);
      if (!incoming) return;
      incoming.classList.add('is-active-title');
      gsap.fromTo(
        incoming,
        { autoAlpha: 0, y: MOTION.title.travel * dir },
        { autoAlpha: 1, y: 0, duration: MOTION.title.duration, ease: MOTION.title.ease, overwrite: 'auto' }
      );
    }

    function killTweens() {
      gsap.killTweensOf(state, 'rotation');
    }

    function tiltTo(value) {
      gsap.to(state, {
        tilt: value,
        duration: MOTION.tilt.duration,
        ease: MOTION.tilt.ease,
        overwrite: 'auto',
        onUpdate: render,
      });
    }

    function settleTo(targetRotation, durationOverride) {
      state.snapTarget = targetRotation;
      state.settling = true;
      const travel = Math.abs(targetRotation - state.rotation);
      const duration =
        durationOverride !== undefined
          ? durationOverride
          : gsap.utils.clamp(
              MOTION.inertia.minDuration,
              MOTION.inertia.maxDuration,
              MOTION.inertia.minDuration + travel * MOTION.inertia.durationPerDeg
            );
      killTweens();
      gsap.to(state, {
        rotation: targetRotation,
        duration: REDUCED_MOTION ? Math.min(duration, 0.2) : duration,
        ease: settleEase,
        overwrite: 'auto',
        onUpdate: render,
        onComplete: () => {
          state.settling = false;
          state.velocity = 0;
        },
      });
      tiltTo(0);
    }

    function stepBy(cards) {
      // Continuous index nearest to current rotation, then offset.
      const k = Math.round(-state.rotation / rotateAmount);
      settleTo(-(k + cards) * rotateAmount, MOTION.step.duration);
    }

    function goToIndex(idx) {
      const k = Math.round(-state.rotation / rotateAmount);
      const current = wrapIndex(k);
      let diff = wrapIndex(idx - current);
      if (diff > count / 2) diff -= count; // take the short way around
      stepBy(diff);
    }

    /* ---- pointer drag ---- */

    const touchEl = ensureTouchLayer(componentEl);
    const samples = [];
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let startTime = 0;
    let totalMovement = 0;

    function trackVelocity(x) {
      const now = performance.now();
      samples.push({ t: now, x });
      while (samples.length > 1 && now - samples[0].t > MOTION.drag.velocitySampleWindow) {
        samples.shift();
      }
    }

    function releaseVelocity() {
      if (samples.length < 2) return 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt <= 0) return 0;
      return ((last.x - first.x) / dt) * degPerPx; // deg/s
    }

    function onPointerDown(e) {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      state.dragging = true;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startTime = performance.now();
      totalMovement = 0;
      samples.length = 0;
      trackVelocity(e.clientX);
      killTweens();
      touchEl.classList.add('is-grabbing');
      if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
      if (touchEl.setPointerCapture) {
        try { touchEl.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
      }
    }

    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      totalMovement += Math.abs(dx);
      trackVelocity(e.clientX);

      state.rotation += dx * degPerPx;
      state.velocity = releaseVelocity();
      // Velocity-based tilt: physical while moving, rests flat on landing.
      const t = gsap.utils.clamp(0, 1, Math.abs(state.velocity) / MOTION.tilt.velocityRef);
      state.tilt = -MOTION.tilt.max * t;
      render();
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      state.dragging = false;
      touchEl.classList.remove('is-grabbing');
      if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();

      const elapsed = performance.now() - startTime;
      const isTap =
        totalMovement < MOTION.drag.tapMaxMovement && elapsed < MOTION.drag.tapMaxDuration;

      if (isTap) {
        tiltTo(0);
        handleTap(e.clientX, e.clientY);
        return;
      }

      // Vertical flick fallback (legacy gesture): step one card.
      const dyTotal = e.clientY - startY;
      const dxTotal = e.clientX - startX;
      if (Math.abs(dyTotal) > Math.abs(dxTotal) && Math.abs(dyTotal) > 40) {
        stepBy(dyTotal < 0 ? 1 : -1);
        return;
      }

      // Momentum + snap so the card always lands front-facing.
      const v = releaseVelocity();
      state.velocity = v;
      let projected = state.rotation + v * MOTION.inertia.projection;
      const maxFling = MOTION.inertia.maxFlingCards * rotateAmount;
      projected = gsap.utils.clamp(state.rotation - maxFling, state.rotation + maxFling, projected);
      settleTo(snapToCard(projected));
    }

    function onPointerCancel(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      state.dragging = false;
      touchEl.classList.remove('is-grabbing');
      if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
      settleTo(snapToCard(state.rotation));
    }

    /* ---- tap → product ---- */

    function handleTap(x, y) {
      const rect = wrapEl.getBoundingClientRect();
      const margin = 48;
      if (y < rect.top - margin || y > rect.bottom + margin) return;

      const itemW = items[0] ? items[0].offsetWidth : 0;
      const centerX = rect.left + rect.width / 2;
      const dx = x - centerX;

      if (Math.abs(dx) <= itemW * 0.5) {
        openActiveProduct();
      } else if (dx > 0) {
        stepBy(1); // card visually on the right = next
      } else {
        stepBy(-1);
      }
    }

    function openActiveProduct() {
      const $slides = slides();
      const handle =
        $($slides.get(state.activeIndex)).data('product-handle') ||
        $(items[state.activeIndex]).data('product-handle');
      if (handle && drawerOpenFn) drawerOpenFn(String(handle));
    }

    touchEl.addEventListener('pointerdown', onPointerDown);
    touchEl.addEventListener('pointermove', onPointerMove);
    touchEl.addEventListener('pointerup', onPointerUp);
    touchEl.addEventListener('pointercancel', onPointerCancel);

    /* ---- arrows ---- */

    const nextEl = componentEl.querySelector('[carousel="next"]');
    const prevEl = componentEl.querySelector('[carousel="prev"]');
    if (nextEl) nextEl.addEventListener('click', (e) => { e.preventDefault(); stepBy(1); });
    if (prevEl) prevEl.addEventListener('click', (e) => { e.preventDefault(); stepBy(-1); });

    /* ---- keyboard ---- */

    function onKeydown(e) {
      if ($('#product-drawer').hasClass('open')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); stepBy(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); stepBy(-1); }
      else if (e.key === 'Enter' && document.activeElement === document.body) { openActiveProduct(); }
    }
    document.addEventListener('keydown', onKeydown);

    /* ---- mousewheel ---- */

    let wheelAccum = 0;
    let wheelLockedUntil = 0;
    function onWheel(e) {
      if ($('#product-drawer').hasClass('open')) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLockedUntil) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      wheelAccum += delta;
      if (Math.abs(wheelAccum) >= MOTION.step.wheelThreshold) {
        stepBy(wheelAccum > 0 ? 1 : -1);
        wheelAccum = 0;
        wheelLockedUntil = now + MOTION.step.wheelLockout;
      }
    }
    componentEl.addEventListener('wheel', onWheel, { passive: false });

    /* ---- resize ---- */

    let resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        compute3DLayout(wrapEl, count);
        measure();
        render();
      }, 150);
    }
    window.addEventListener('resize', onResize);

    /* ---- init ---- */

    measure();
    applyActiveCard(0);
    // Show first title immediately (no animation on init).
    const $initSlides = slides();
    $initSlides.each(function (i) {
      this.classList.toggle('is-active-title', i === 0);
      gsap.set(this, { autoAlpha: i === 0 ? 1 : 0, y: 0 });
    });
    render();

    function destroy() {
      killTweens();
      touchEl.removeEventListener('pointerdown', onPointerDown);
      touchEl.removeEventListener('pointermove', onPointerMove);
      touchEl.removeEventListener('pointerup', onPointerUp);
      touchEl.removeEventListener('pointercancel', onPointerCancel);
      componentEl.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
    }

    return { state, stepBy, goToIndex, openActiveProduct, settleTo, render, measure, destroy, rotateAmount, count };
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

  /* ------------------------------------------------------------------ *
   * Intro
   * ------------------------------------------------------------------ */

  let introTimeline = null;

  function playIntro(wrapEl, onComplete) {
    const skipIntro = REDUCED_MOTION || sessionStorage.getItem(INTRO_SEEN_KEY) === '1';

    if (typeof gsap === 'undefined' || !wrapEl) {
      onComplete();
      return;
    }

    if (skipIntro) {
      gsap.set(wrapEl, { opacity: 1, '--3d-carousel-rotate': '0deg', '--3d-carousel-rotate-x': '0deg' });
      gsap.set('[fade-up]', { opacity: 1 });
      onComplete();
      return;
    }

    introTimeline = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
        onComplete();
      },
    });

    introTimeline.to(wrapEl, { opacity: 1, duration: 0.25 });
    introTimeline.fromTo(
      wrapEl,
      { '--3d-carousel-rotate': `${MOTION.intro.fromRotate}deg`, '--3d-carousel-rotate-x': `${MOTION.intro.fromTilt}deg` },
      {
        '--3d-carousel-rotate': '0deg',
        '--3d-carousel-rotate-x': '0deg',
        duration: MOTION.intro.duration,
        ease: MOTION.intro.ease,
      },
      '<'
    );
    introTimeline.to('[fade-up]', { opacity: 1, duration: MOTION.intro.fadeDuration }, '>-0.2');
  }

  function animateCollectionTitle() {
    const el = document.getElementById('collection-title');
    if (!el || typeof gsap === 'undefined') return;

    gsap.set(el, { left: '50%', top: '50%', xPercent: -50, yPercent: -50 });
    gsap.to(el, {
      top: '6rem',
      yPercent: 0,
      duration: REDUCED_MOTION ? 0 : 1.2,
      ease: 'power2.inOut',
      delay: REDUCED_MOTION ? 0 : 1,
    });
  }

  /* ------------------------------------------------------------------ *
   * Product drawer
   * ------------------------------------------------------------------ */

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

    drawerOpenFn = openDrawer;

    function closeDrawer() {
      $drawer.removeClass('open');
      $('body').css('overflow', '');
      $(document).trigger('drawerClose');
    }

    $(document).on('click', '.view-details-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const handle = $(this).closest('.swiper-slide').data('product-handle');
      if (handle) openDrawer(String(handle));
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

  /* ------------------------------------------------------------------ *
   * Debug tooling
   * ------------------------------------------------------------------ */

  function initDebugBorders() {
    window.toggleDebugBorders = function toggleDebugBorders() {
      document.documentElement.classList.toggle('debug-borders');
      return document.documentElement.classList.contains('debug-borders');
    };
    if (window.location.search.includes('debug=borders')) window.toggleDebugBorders();
  }

  function initMotionHUD() {
    if (!window.location.search.includes('debug=motion')) return;

    const hud = document.createElement('div');
    hud.className = 'carousel-3d__hud';
    hud.innerHTML = `
      <div class="carousel-3d__hud-title">MOTION DEBUG</div>
      <div class="carousel-3d__hud-row"><span>rotation</span><b data-hud="rotation">0</b></div>
      <div class="carousel-3d__hud-row"><span>active</span><b data-hud="active">0</b></div>
      <div class="carousel-3d__hud-row"><span>velocity</span><b data-hud="velocity">0</b></div>
      <div class="carousel-3d__hud-row"><span>snap target</span><b data-hud="snap">0</b></div>
      <div class="carousel-3d__hud-row"><span>state</span><b data-hud="state">idle</b></div>
      <div class="carousel-3d__hud-row"><span>fps</span><b data-hud="fps">60</b></div>
      <div class="carousel-3d__hud-actions">
        <button type="button" data-hud-action="replay-intro">Replay intro</button>
        <button type="button" data-hud-action="next">Next</button>
        <button type="button" data-hud-action="prev">Prev</button>
        <button type="button" data-hud-action="devtools">GSDevTools</button>
      </div>
    `;
    document.body.appendChild(hud);

    const els = {
      rotation: hud.querySelector('[data-hud="rotation"]'),
      active: hud.querySelector('[data-hud="active"]'),
      velocity: hud.querySelector('[data-hud="velocity"]'),
      snap: hud.querySelector('[data-hud="snap"]'),
      state: hud.querySelector('[data-hud="state"]'),
      fps: hud.querySelector('[data-hud="fps"]'),
    };

    let frames = 0;
    let lastFpsTime = performance.now();
    let fps = 60;

    gsap.ticker.add(() => {
      frames += 1;
      const now = performance.now();
      if (now - lastFpsTime >= 500) {
        fps = Math.round((frames * 1000) / (now - lastFpsTime));
        frames = 0;
        lastFpsTime = now;
      }
      if (!controller) return;
      const s = controller.state;
      els.rotation.textContent = `${s.rotation.toFixed(1)}°`;
      els.active.textContent = `${s.activeIndex + 1} / ${controller.count}`;
      els.velocity.textContent = `${Math.round(s.velocity)}°/s`;
      els.snap.textContent = `${s.snapTarget.toFixed(1)}°`;
      els.state.textContent = s.dragging ? 'dragging' : s.settling ? 'settling' : 'idle';
      els.fps.textContent = String(fps);
      els.fps.style.color = fps < 50 ? '#ff6600' : '';
    });

    hud.addEventListener('click', (e) => {
      const action = e.target.getAttribute && e.target.getAttribute('data-hud-action');
      if (!action) return;
      if (action === 'replay-intro') {
        sessionStorage.removeItem(INTRO_SEEN_KEY);
        const wrap = document.querySelector("[carousel='wrap']");
        if (wrap) {
          gsap.set(wrap, { opacity: 0 });
          playIntro(wrap, () => { if (controller) controller.render(); });
        }
      } else if (action === 'next' && controller) {
        controller.stepBy(1);
      } else if (action === 'prev' && controller) {
        controller.stepBy(-1);
      } else if (action === 'devtools') {
        loadGSDevTools();
      }
    });
  }

  function loadGSDevTools() {
    if (window.GSDevTools) {
      attachGSDevTools();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/GSDevTools.min.js';
    script.onload = attachGSDevTools;
    script.onerror = () => console.warn('GSDevTools failed to load');
    document.body.appendChild(script);
  }

  function attachGSDevTools() {
    if (!window.GSDevTools) return;
    gsap.registerPlugin(window.GSDevTools);
    if (!introTimeline) {
      // Rebuild the intro so there is a timeline to scrub.
      sessionStorage.removeItem(INTRO_SEEN_KEY);
      const wrap = document.querySelector("[carousel='wrap']");
      if (wrap) {
        gsap.set(wrap, { opacity: 0 });
        playIntro(wrap, () => { if (controller) controller.render(); });
      }
    }
    if (introTimeline) window.GSDevTools.create({ animation: introTimeline });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  async function initCarousel() {
    const component = document.querySelector('[carousel="component"]');
    const wrap = document.querySelector("[carousel='wrap']");
    if (!component || !wrap) return;

    registerEases();

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
      if (controller) controller.destroy();
      controller = createRingController(component, wrap, rotateAmount);
      window.kioskCarousel3DController = controller;
    });
  }

  window.KioskCarousel3D = {
    init: initCarousel,
    reinit(products) {
      const assetBase = getAssetBase();
      if (products && products.length) buildCarouselDOM(products, assetBase);
      const wrap = document.querySelector("[carousel='wrap']");
      const component = document.querySelector('[carousel="component"]');
      if (!wrap || !component) return;
      const rotateAmount = compute3DLayout(wrap, $('.carousel_item').length);
      if (controller) controller.destroy();
      controller = createRingController(component, wrap, rotateAmount);
      window.kioskCarousel3DController = controller;
    },
    get controller() {
      return controller;
    },
    MOTION,
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
      $(function () {
        initCarousel();
        initMotionHUD();
      });
    } else {
      document.addEventListener('DOMContentLoaded', initCarousel);
    }
  }

  boot();
})();
