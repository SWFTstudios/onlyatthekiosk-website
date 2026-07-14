/**
 * KIOSK 3D Collection Carousel
 * Of Skin And Souls-style cylinder: per-card sin/cos placement,
 * desktop velocity-drag + inertia, mobile swipe-to-step, flip cards, 4s autoplay.
 */
(function () {
  'use strict';

  const INTRO_SEEN_KEY = 'kiosk-carousel-seen';
  const REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * MOTION — OSAS-matched parameters (tunable in one place)
   * ------------------------------------------------------------------ */
  const MOTION = {
    radius: { desktop: 380, mobile: 320 },
    perspective: { desktop: 1400, mobile: 1000 },
    mobileBreakpoint: 768,
    inertiaFriction: 0.9,
    inertiaCutoff: 0.1,
    dragVelThreshold: 0.5,
    snapLerp: 0.1,
    velocityScale: 2, // matches OSAS: (dx/dtMs) * 2
    swipePx: 50,
    swipeMs: 500,
    autoplayMs: 4000,
    autoplayResumeMs: 10000,
    flipDuration: 0.7,
    hoverScale: 1.15,
    brightness: { front: 1, neighbor: 0.85, back: 0.15 },
    blurMax: 0.5,
    intro: {
      duration: REDUCED_MOTION ? 0 : 1.5,
      fromRotate: 100,
      ease: 'power2.inOut',
      fadeDuration: 0.4,
    },
    wheelThreshold: 30,
    wheelLockout: 350,
  };

  function isMobile() {
    return window.innerWidth < MOTION.mobileBreakpoint;
  }

  function getRadius(count) {
    const base = isMobile() ? MOTION.radius.mobile : MOTION.radius.desktop;
    const n = Math.max(count || 1, 1);
    // Widen the cylinder as card count grows so faces don't intersect
    // (classic: half-width / tan(π/n)). Floor at OSAS baseline.
    const cardW = isMobile() ? 220 : 256;
    const fitted = cardW / 2 / Math.tan(Math.PI / n) + (isMobile() ? 40 : 80);
    return Math.max(base, fitted);
  }

  function getPerspective() {
    return isMobile() ? MOTION.perspective.mobile : MOTION.perspective.desktop;
  }

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

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatProductPrice(product) {
    try {
      const price = product.priceRange && product.priceRange.minVariantPrice;
      if (!price) return '';
      const client = window.airtable || window.shopify;
      if (client && typeof client.formatPrice === 'function') {
        return client.formatPrice(price.amount, price.currencyCode);
      }
      return `${price.amount} ${price.currencyCode}`;
    } catch {
      return '';
    }
  }

  /* ------------------------------------------------------------------ *
   * DOM
   * ------------------------------------------------------------------ */

  function buildCarouselDOM(products, assetBase) {
    const placeholder = `${assetBase}images/kiosk-placeholder-product-img.webp`;
    const $list = $('.carousel_list');
    $list.empty();

    // Hide legacy title strip — titles live on flip backs
    $('.swiper, .carousel-titles').hide();

    products.forEach((product, index) => {
      const imageUrl =
        product.images && product.images.edges && product.images.edges.length > 0
          ? product.images.edges[0].node.url
          : placeholder;
      const title = escapeHtml(product.title);
      const price = escapeHtml(formatProductPrice(product));
      const handle = escapeHtml(product.handle);

      $list.append(`
        <div class="carousel_item" data-product-index="${index}" data-product-handle="${handle}">
          <div class="carousel_card">
            <div class="carousel_card__face carousel_card__face--front">
              <img src="${imageUrl}" alt="${title}" class="carousel_img" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">
            </div>
            <div class="carousel_card__face carousel_card__face--back">
              <div class="carousel_card__back-inner">
                <h3 class="carousel_card__title">${title}</h3>
                ${price ? `<p class="carousel_card__price">${price}</p>` : ''}
                <button type="button" class="button view-details-btn" data-product-handle="${handle}">View</button>
              </div>
            </div>
          </div>
        </div>
      `);
    });
  }

  function ensurePlaceholderFlipCards(assetBase) {
    const $items = $('.carousel_item');
    if (!$items.length) return;
    if ($items.first().find('.carousel_card').length) return;

    const placeholder = `${assetBase}images/kiosk-placeholder-product-img.webp`;
    $items.each(function (index) {
      const $item = $(this);
      const img = $item.find('.carousel_img').attr('src') || placeholder;
      const handle = $item.data('product-handle') || `product-handle-${index + 1}`;
      const title = $item.find('.carousel_img').attr('alt') || `Product ${String(index + 1).padStart(3, '0')}`;
      $item.attr('data-product-handle', handle);
      $item.attr('data-product-index', index);
      $item.html(`
        <div class="carousel_card">
          <div class="carousel_card__face carousel_card__face--front">
            <img src="${img}" alt="${escapeHtml(title)}" class="carousel_img" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">
          </div>
          <div class="carousel_card__face carousel_card__face--back">
            <div class="carousel_card__back-inner">
              <h3 class="carousel_card__title">${escapeHtml(title)}</h3>
              <p class="carousel_card__price">299.00 SEK</p>
              <button type="button" class="button view-details-btn" data-product-handle="${escapeHtml(handle)}">View</button>
            </div>
          </div>
        </div>
      `);
    });
    $('.swiper, .carousel-titles').hide();
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
    const existing = componentEl.querySelector('.carousel-3d__touch');
    if (existing) return existing;
    const touch = document.createElement('div');
    touch.className = 'carousel-3d__touch';
    touch.setAttribute('aria-hidden', 'true');
    componentEl.prepend(touch);
    return touch;
  }

  /* ------------------------------------------------------------------ *
   * Ring controller — OSAS cylinder
   * ------------------------------------------------------------------ */

  let drawerOpenFn = null;
  let controller = null;

  function shortestAngle(delta) {
    return ((delta + 180) % 360) - 180;
  }

  function createRingController(componentEl, wrapEl) {
    const listEl = wrapEl.querySelector('.carousel_list') || wrapEl.firstElementChild;
    const items = Array.from(wrapEl.querySelectorAll('.carousel_item'));
    const count = items.length;
    if (!count || !listEl) return null;

    const step = 360 / count;
    const flipped = new Set();

    const state = {
      G: 0, // global rotation degrees
      velocity: 0, // live drag velocity (deg-ish units / frame)
      inertia: 0, // release velocity
      snapTarget: 0,
      dragging: false,
      snapping: false,
      activeIndex: 0,
      autoplayPaused: false,
      hoverIndex: -1,
    };

    wrapEl.style.perspective = `${getPerspective()}px`;
    wrapEl.style.perspectiveOrigin = 'center center';
    listEl.style.transformStyle = 'preserve-3d';
    listEl.style.transition = 'none';
    listEl.style.position = 'relative';
    listEl.style.width = '100%';
    listEl.style.height = '100%';

    items.forEach((el) => {
      el.style.position = 'absolute';
      el.style.top = '50%';
      el.style.left = '50%';
      el.style.pointerEvents = 'auto';
    });

    function cardPose(index) {
      const angle = step * index + state.G;
      const rad = (angle * Math.PI) / 180;
      const R = getRadius(count);
      return {
        x: Math.sin(rad) * R,
        z: Math.cos(rad) * R,
        rotationY: angle,
      };
    }

    function normalizeAngle(deg) {
      return ((deg % 360) + 360) % 360;
    }

    function frontIndex() {
      let best = 0;
      let bestAbs = Infinity;
      for (let i = 0; i < count; i++) {
        const ry = normalizeAngle(cardPose(i).rotationY);
        const dist = Math.min(Math.abs(ry), Math.abs(ry - 360));
        if (dist < bestAbs) {
          bestAbs = dist;
          best = i;
        }
      }
      return best;
    }

    function brightnessFor(index) {
      const ry = normalizeAngle(cardPose(index).rotationY);
      if (ry > 90 && ry < 270) return MOTION.brightness.back;
      if (index === state.activeIndex) return MOTION.brightness.front;
      return MOTION.brightness.neighbor;
    }

    function motionBlur() {
      const a = Math.abs(state.velocity + state.inertia);
      if (a > 0.1) return Math.min(1.2 * (a - 0.1), MOTION.blurMax);
      return 0;
    }

    function render() {
      const blur = motionBlur();
      const active = frontIndex();
      if (active !== state.activeIndex) {
        state.activeIndex = active;
      }

      items.forEach((el, i) => {
        const { x, z, rotationY } = cardPose(i);
        const ry = normalizeAngle(rotationY);
        const backFacing = ry > 90 && ry < 270;
        let scale = 1;
        if (!backFacing && state.hoverIndex === i && !isMobile()) {
          scale = MOTION.hoverScale;
        }
        el.style.transform = `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotationY}deg) scale(${scale})`;
        el.style.transformOrigin = 'center center';
        el.style.zIndex = i === state.activeIndex ? 10 : backFacing ? 0 : 1;
        el.style.visibility = backFacing ? 'hidden' : 'visible';
        el.classList.toggle('is-active', i === state.activeIndex);

        const img = el.querySelector('.carousel_img');
        if (img) {
          img.style.filter = `blur(${blur}px) brightness(${brightnessFor(i)})`;
        }
      });
    }

    function snapNow() {
      const rem = state.G % step;
      let delta = 0;
      if (rem > step / 2) delta = step - rem;
      else if (rem < -step / 2) delta = -step - rem;
      else delta = -rem;
      state.snapTarget = state.G + delta;
      state.snapping = true;
      state.inertia = 0;
      state.velocity = 0;
    }

    function stepBy(cards) {
      pauseAutoplay();
      // Advance product index by `cards`. Decreasing G brings the next
      // higher index to rotationY≈0 (card i is at step*i + G).
      const rem = state.G % step;
      let base = state.G;
      if (Math.abs(rem) > 0.01) {
        if (rem > step / 2) base = state.G + (step - rem);
        else if (rem < -step / 2) base = state.G + (-step - rem);
        else base = state.G - rem;
      }
      state.snapTarget = base - cards * step;
      state.snapping = true;
      state.inertia = 0;
      state.velocity = 0;
      state.dragging = false;
    }

    function goToIndex(idx) {
      const current = frontIndex();
      let diff = ((idx - current) % count + count) % count;
      if (diff > count / 2) diff -= count;
      stepBy(diff);
    }

    /* ---- autoplay ---- */
    let autoplayTimer = null;
    let resumeTimer = null;

    function clearAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function startAutoplay() {
      clearAutoplay();
      if (REDUCED_MOTION) return;
      state.autoplayPaused = false;
      autoplayTimer = setInterval(() => {
        if (!state.dragging && !document.hidden) stepBy(1);
      }, MOTION.autoplayMs);
    }

    function pauseAutoplay() {
      state.autoplayPaused = true;
      clearAutoplay();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        startAutoplay();
      }, MOTION.autoplayResumeMs);
    }

    /* ---- flip ---- */
    function closeAllFlips() {
      flipped.clear();
      items.forEach((el) => el.classList.remove('is-flipped'));
    }

    function toggleFlip(index) {
      const el = items[index];
      if (!el) return;
      const handle = el.getAttribute('data-product-handle') || String(index);
      if (flipped.has(handle)) {
        flipped.delete(handle);
        el.classList.remove('is-flipped');
      } else {
        closeAllFlips();
        flipped.add(handle);
        el.classList.add('is-flipped');
      }
      pauseAutoplay();
    }

    function openActiveProduct() {
      const el = items[state.activeIndex];
      const handle = el && el.getAttribute('data-product-handle');
      if (handle && drawerOpenFn) drawerOpenFn(String(handle));
    }

    /* ---- rAF loop ---- */
    let rafId = null;
    function tick() {
      if (state.dragging) {
        // If pointer has gone still, kill residual velocity so the ring doesn't runaway
        if (performance.now() - lastMoveT > 48) {
          state.velocity *= 0.85;
          if (Math.abs(state.velocity) < 0.05) state.velocity = 0;
        }
        state.G += state.velocity;
      } else if (state.snapping) {
        const delta = shortestAngle(state.snapTarget - state.G);
        if (Math.abs(delta) < 0.5) {
          state.G = state.snapTarget;
          state.snapping = false;
        } else {
          state.G += delta * MOTION.snapLerp;
        }
      } else if (Math.abs(state.inertia) > MOTION.inertiaCutoff) {
        state.G += state.inertia;
        state.inertia *= MOTION.inertiaFriction;
      } else if (state.inertia !== 0) {
        state.inertia = 0;
        snapNow();
      }
      render();
      rafId = requestAnimationFrame(tick);
    }

    /* ---- desktop drag (velocity) — listeners on wrap so flip View stays clickable ---- */
    const touchEl = ensureTouchLayer(componentEl);
    touchEl.style.pointerEvents = 'none'; // visual/grab cue only; wrap owns gestures
    wrapEl.style.cursor = 'grab';
    let lastMoveX = 0;
    let lastMoveT = 0;
    let pointerId = null;

    // Mobile touch swipe state
    let touchStartX = 0;
    let touchStartT = 0;

    function onPointerDown(e) {
      if (e.pointerType === 'touch') return; // mobile handled separately
      if (isMobile()) return;
      if (pointerId !== null) return;
      // Ignore interactive controls
      if (e.target.closest && e.target.closest('.view-details-btn, .carousel_arrow_link, button, a')) return;

      pointerId = e.pointerId;
      pauseAutoplay();
      state.dragging = true;
      state.snapping = false;
      state.inertia = 0;
      state.velocity = 0;
      lastMoveX = e.clientX;
      lastMoveT = performance.now();
      wrapEl.classList.add('is-grabbing');
      wrapEl.style.cursor = 'grabbing';
      if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
      try {
        wrapEl.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    }

    function onPointerMove(e) {
      // Hover tracking (desktop)
      if (!isMobile() && !state.dragging) {
        updateHover(e.clientX, e.clientY);
      }

      if (e.pointerId !== pointerId || !state.dragging) return;
      const now = performance.now();
      const dt = now - lastMoveT;
      const dx = e.clientX - lastMoveX;
      if (dt > 0) {
        // OSAS: velocity = (dx/dtMs) * 2 — treat as deg/frame-ish
        state.velocity = (dx / dt) * MOTION.velocityScale;
      }
      lastMoveX = e.clientX;
      lastMoveT = now;
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      wrapEl.classList.remove('is-grabbing');
      wrapEl.style.cursor = 'grab';
      if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();

      if (!state.dragging) return;
      state.dragging = false;

      const v = state.velocity;
      state.velocity = 0;
      if (Math.abs(v) < MOTION.dragVelThreshold) {
        snapNow();
      } else {
        state.inertia = v;
      }
    }

    function onPointerCancel(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      state.dragging = false;
      state.velocity = 0;
      wrapEl.classList.remove('is-grabbing');
      wrapEl.style.cursor = 'grab';
      if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
      snapNow();
    }

    function updateHover(x, y) {
      let found = -1;
      for (let i = 0; i < items.length; i++) {
        const ry = normalizeAngle(cardPose(i).rotationY);
        if (ry > 90 && ry < 270) continue;
        const rect = items[i].getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          found = i;
          break;
        }
      }
      if (found !== state.hoverIndex) {
        state.hoverIndex = found;
      }
    }

    /* ---- mobile discrete swipe ---- */
    function onTouchStart(e) {
      if (!isMobile()) return;
      if (!e.touches || !e.touches.length) return;
      if (e.target.closest && e.target.closest('.view-details-btn, .carousel_arrow_link, button, a')) return;
      touchStartX = e.touches[0].clientX;
      touchStartT = performance.now();
      pauseAutoplay();
      if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
    }

    function onTouchEnd(e) {
      if (!isMobile()) return;
      if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
      if (!e.changedTouches || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dt = performance.now() - touchStartT;
      if (Math.abs(dx) > MOTION.swipePx && dt < MOTION.swipeMs) {
        // swipe right → prev, left → next (OSAS: t>0 ? prev : next)
        if (dx > 0) stepBy(-1);
        else stepBy(1);
      } else {
        // tap
        handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }

    function handleTap(x, y) {
      // Prefer hit-testing real card rects among front hemisphere
      for (let i = 0; i < items.length; i++) {
        const ry = normalizeAngle(cardPose(i).rotationY);
        if (ry > 90 && ry < 270) continue;
        const rect = items[i].getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          if (i === state.activeIndex) {
            toggleFlip(i);
          } else {
            goToIndex(i);
          }
          return;
        }
      }
      // Fallback: tap center band flips active
      const rect = wrapEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      if (Math.abs(x - cx) < getRadius(count) * 0.55) {
        toggleFlip(state.activeIndex);
      }
    }

    // Desktop click on touch layer for flip / bring-to-front
    let clickStartX = 0;
    let clickStartY = 0;
    let clickStartT = 0;
    function onClickCapture(e) {
      if (isMobile()) return;
      if (e.target.closest && e.target.closest('.view-details-btn')) return;
      // Ignore if we just dragged
      const moved = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
      const dt = performance.now() - clickStartT;
      if (moved > 8 || dt > 400) return;
      handleTap(e.clientX, e.clientY);
    }
    function onClickDown(e) {
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      clickStartT = performance.now();
    }

    wrapEl.addEventListener('pointerdown', onPointerDown);
    wrapEl.addEventListener('pointermove', onPointerMove);
    wrapEl.addEventListener('pointerup', onPointerUp);
    wrapEl.addEventListener('pointercancel', onPointerCancel);
    wrapEl.addEventListener('touchstart', onTouchStart, { passive: true });
    wrapEl.addEventListener('touchend', onTouchEnd, { passive: true });
    wrapEl.addEventListener('mousedown', onClickDown);
    wrapEl.addEventListener('click', onClickCapture);

    // View buttons on card backs (and any remaining title strip)
    $(componentEl).on('click', '.view-details-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const handle =
        $(this).data('product-handle') ||
        $(this).closest('[data-product-handle]').data('product-handle');
      if (handle && drawerOpenFn) drawerOpenFn(String(handle));
      pauseAutoplay();
    });

    /* ---- arrows ---- */
    const nextEl = componentEl.querySelector('[carousel="next"]');
    const prevEl = componentEl.querySelector('[carousel="prev"]');
    if (nextEl) {
      nextEl.addEventListener('click', (e) => {
        e.preventDefault();
        stepBy(1);
      });
    }
    if (prevEl) {
      prevEl.addEventListener('click', (e) => {
        e.preventDefault();
        stepBy(-1);
      });
    }

    /* ---- keyboard ---- */
    function onKeydown(e) {
      if ($('#product-drawer').hasClass('open')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        toggleFlip(state.activeIndex);
      }
    }
    document.addEventListener('keydown', onKeydown);

    /* ---- mousewheel (desktop) ---- */
    let wheelAccum = 0;
    let wheelLockedUntil = 0;
    function onWheel(e) {
      if ($('#product-drawer').hasClass('open')) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLockedUntil) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      wheelAccum += delta;
      if (Math.abs(wheelAccum) >= MOTION.wheelThreshold) {
        stepBy(wheelAccum > 0 ? 1 : -1);
        wheelAccum = 0;
        wheelLockedUntil = now + MOTION.wheelLockout;
      }
    }
    componentEl.addEventListener('wheel', onWheel, { passive: false });

    /* ---- resize ---- */
    let resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        wrapEl.style.perspective = `${getPerspective()}px`;
        render();
      }, 150);
    }
    window.addEventListener('resize', onResize);

    // visibility: pause when tab hidden
    function onVisibility() {
      if (document.hidden) clearAutoplay();
      else if (!state.autoplayPaused) startAutoplay();
    }
    document.addEventListener('visibilitychange', onVisibility);

    render();
    rafId = requestAnimationFrame(tick);
    startAutoplay();

    function destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      clearAutoplay();
      if (resumeTimer) clearTimeout(resumeTimer);
      wrapEl.removeEventListener('pointerdown', onPointerDown);
      wrapEl.removeEventListener('pointermove', onPointerMove);
      wrapEl.removeEventListener('pointerup', onPointerUp);
      wrapEl.removeEventListener('pointercancel', onPointerCancel);
      wrapEl.removeEventListener('touchstart', onTouchStart);
      wrapEl.removeEventListener('touchend', onTouchEnd);
      wrapEl.removeEventListener('mousedown', onClickDown);
      wrapEl.removeEventListener('click', onClickCapture);
      componentEl.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    }

    return {
      state,
      stepBy,
      goToIndex,
      openActiveProduct,
      toggleFlip,
      pauseAutoplay,
      startAutoplay,
      render,
      destroy,
      count,
      step,
      get activeIndex() {
        return state.activeIndex;
      },
    };
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
      gsap.set(wrapEl, { opacity: 1 });
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
      { rotationY: MOTION.intro.fromRotate },
      { rotationY: 0, duration: MOTION.intro.duration, ease: MOTION.intro.ease, clearProps: 'rotationY' },
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

      const delivery = (window.airtable || window.shopify)
        ? (window.airtable || window.shopify).getMetafield(product, 'custom', 'delivery')
        : null;
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
      (data.gallery || []).forEach((url) => {
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
      if (controller) controller.pauseAutoplay();

      if (handle && String(handle).startsWith('product-handle-')) {
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
   * Debug
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
      <div class="carousel-3d__hud-row"><span>G</span><b data-hud="rotation">0</b></div>
      <div class="carousel-3d__hud-row"><span>active</span><b data-hud="active">0</b></div>
      <div class="carousel-3d__hud-row"><span>velocity</span><b data-hud="velocity">0</b></div>
      <div class="carousel-3d__hud-row"><span>inertia</span><b data-hud="inertia">0</b></div>
      <div class="carousel-3d__hud-row"><span>snap</span><b data-hud="snap">0</b></div>
      <div class="carousel-3d__hud-row"><span>state</span><b data-hud="state">idle</b></div>
      <div class="carousel-3d__hud-row"><span>autoplay</span><b data-hud="autoplay">on</b></div>
      <div class="carousel-3d__hud-row"><span>fps</span><b data-hud="fps">60</b></div>
      <div class="carousel-3d__hud-actions">
        <button type="button" data-hud-action="next">Next</button>
        <button type="button" data-hud-action="prev">Prev</button>
        <button type="button" data-hud-action="flip">Flip</button>
        <button type="button" data-hud-action="devtools">GSDevTools</button>
      </div>
    `;
    document.body.appendChild(hud);

    const els = {
      rotation: hud.querySelector('[data-hud="rotation"]'),
      active: hud.querySelector('[data-hud="active"]'),
      velocity: hud.querySelector('[data-hud="velocity"]'),
      inertia: hud.querySelector('[data-hud="inertia"]'),
      snap: hud.querySelector('[data-hud="snap"]'),
      state: hud.querySelector('[data-hud="state"]'),
      autoplay: hud.querySelector('[data-hud="autoplay"]'),
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
      els.rotation.textContent = `${s.G.toFixed(1)}°`;
      els.active.textContent = `${s.activeIndex + 1} / ${controller.count}`;
      els.velocity.textContent = s.velocity.toFixed(2);
      els.inertia.textContent = s.inertia.toFixed(2);
      els.snap.textContent = `${s.snapTarget.toFixed(1)}°`;
      els.state.textContent = s.dragging ? 'dragging' : s.snapping ? 'snapping' : Math.abs(s.inertia) > 0.1 ? 'inertia' : 'idle';
      els.autoplay.textContent = s.autoplayPaused ? 'paused' : 'on';
      els.fps.textContent = String(fps);
      els.fps.style.color = fps < 50 ? '#ff6600' : '';
    });

    hud.addEventListener('click', (e) => {
      const action = e.target.getAttribute && e.target.getAttribute('data-hud-action');
      if (!action || !controller) return;
      if (action === 'next') controller.stepBy(1);
      else if (action === 'prev') controller.stepBy(-1);
      else if (action === 'flip') controller.toggleFlip(controller.state.activeIndex);
      else if (action === 'devtools') loadGSDevTools();
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
    if (introTimeline) window.GSDevTools.create({ animation: introTimeline });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

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
    } else {
      ensurePlaceholderFlipCards(assetBase);
    }

    if (!$('.carousel_item').length) {
      console.warn('No carousel items found');
      return;
    }

    playIntro(wrap, () => {
      if (controller) controller.destroy();
      controller = createRingController(component, wrap);
      window.kioskCarousel3DController = controller;
    });
  }

  window.KioskCarousel3D = {
    init: initCarousel,
    reinit(products) {
      const assetBase = getAssetBase();
      if (products && products.length) buildCarouselDOM(products, assetBase);
      else ensurePlaceholderFlipCards(assetBase);
      const wrap = document.querySelector("[carousel='wrap']");
      const component = document.querySelector('[carousel="component"]');
      if (!wrap || !component) return;
      if (controller) controller.destroy();
      controller = createRingController(component, wrap);
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
