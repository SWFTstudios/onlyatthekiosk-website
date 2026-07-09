/**
 * 3D carousel — GSAP ring + Swiper sync.
 */
(function () {
  const PLACEHOLDER = '/images/kiosk-placeholder-product-img.webp';

  function layoutCarouselItems(wrapEl, productCount) {
    const $wrap = $(wrapEl);
    const itemEl = $wrap.find('.carousel_item');
    const count = productCount || itemEl.length;
    if (!count) return null;

    const rotateAmount = 360 / count;
    const zTranslate = 2 * Math.tan((rotateAmount / 2) * (Math.PI / 180));
    const negTranslate = `calc(var(--3d-carousel-item-width) / -${zTranslate} - var(--3d-carousel-gap))`;
    const posTranslate = `calc(var(--3d-carousel-item-width) / ${zTranslate} + var(--3d-carousel-gap))`;

    $wrap.css('--3d-carousel-z', negTranslate);
    $wrap.css('perspective', posTranslate);

    itemEl.each(function (index) {
      $(this).css({
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotateY(${rotateAmount * index}deg) translateZ(${posTranslate})`,
      });

      const img = $(this).find('.carousel_img');
      if (!img.length) return;
      img.on('load', function () {
        $(this).css({ opacity: 1, visibility: 'visible' });
      }).on('error', function () {
        $(this).attr('src', PLACEHOLDER);
      });
      if (img[0].complete && img[0].naturalHeight !== 0) {
        img.css({ opacity: 1, visibility: 'visible' });
      }
    });

    return rotateAmount;
  }

  function getProductImageUrl(product) {
    if (product.images?.edges?.length) {
      return product.images.edges[0].node.url;
    }
    if (window.ProductCatalog) {
      return window.ProductCatalog.getProductImages(product.handle).hero;
    }
    return PLACEHOLDER;
  }

  function rebuildCarousel(products) {
    if (!products?.length) return;

    const carouselList = $('.carousel_list');
    const swiperWrapper = $('.swiper-wrapper');
    const wrapEl = $("[carousel='wrap']");

    carouselList.empty();
    swiperWrapper.empty();

    products.forEach((product, index) => {
      const imgUrl = getProductImageUrl(product);
      carouselList.append(`
        <div class="carousel_item" data-product-index="${index}">
          <img src="${imgUrl}" alt="${product.title || product.handle}" class="carousel_img" loading="${index < 3 ? 'eager' : 'lazy'}">
          <div class="carousel_ratio"></div>
        </div>
      `);

      swiperWrapper.append(`
        <div class="swiper-slide" data-product-handle="${product.handle}">
          <h2>${product.title || product.handle}</h2>
          <a href="#" class="button view-details-btn">View</a>
        </div>
      `);
    });

    window.dynamicProductsCount = products.length;
    layoutCarouselItems(wrapEl[0], products.length);
    $(document).trigger('carouselRebuilt');
  }

  function initCarousel() {
    $('[carousel="component"]').each(function () {
      const componentEl = $(this);
      const wrapEl = componentEl.find("[carousel='wrap']");
      const swiperEl = componentEl.find('.swiper');
      const nextEl = componentEl.find("[carousel='next']");
      const prevEl = componentEl.find("[carousel='prev']");

      if (!wrapEl.length) return;

      let rotateAmount = layoutCarouselItems(wrapEl[0], window.dynamicProductsCount || wrapEl.find('.carousel_item').length);
      if (!rotateAmount) return;

      const isDynamicLoad = window.dynamicProductsCount !== undefined;
      let swiperInstance = null;

      const introTl = gsap.timeline({
        onComplete() {
          if (isDynamicLoad) {
            $(document).one('productsLoaded carouselRebuilt', () => {
              rotateAmount = layoutCarouselItems(wrapEl[0], window.dynamicProductsCount) || rotateAmount;
              setTimeout(() => initSwiper(), 100);
            });
            setTimeout(() => {
              if (!window.swiperInitialized) initSwiper();
            }, 2000);
          } else {
            initSwiper();
          }
        },
      });

      introTl.to(wrapEl, { opacity: 1, duration: 0.3 });
      introTl.fromTo(
        wrapEl,
        { '--3d-carousel-rotate': 100, '--3d-carousel-rotate-x': -90 },
        { '--3d-carousel-rotate': 0, '--3d-carousel-rotate-x': -4, duration: 4, ease: 'power2.inOut' },
        '<'
      );
      introTl.to('[fade-up]', { opacity: 1 }, '>-0.3');

      function initSwiper() {
        if (swiperInstance) {
          swiperInstance.destroy(true, true);
          window.swiperInitialized = false;
        }

        rotateAmount = layoutCarouselItems(wrapEl[0], window.dynamicProductsCount || wrapEl.find('.carousel_item').length) || rotateAmount;
        const slides = swiperEl.find('.swiper-slide');
        if (!slides.length) return;

        const tl = gsap.timeline({ paused: true });
        tl.fromTo(
          wrapEl,
          { '--3d-carousel-rotate': 0 },
          { '--3d-carousel-rotate': -(360 - rotateAmount), duration: 30, ease: 'none' }
        );

        const progress = { value: 0 };
        window.swiperInitialized = true;

        swiperInstance = new Swiper(swiperEl[0], {
          effect: 'creative',
          creativeEffect: {
            prev: { translate: [0, '-100%', 0], scale: 0.5, opacity: 0 },
            next: { translate: [0, '100%', 0], scale: 0.5, opacity: 0 },
          },
          grabCursor: true,
          touchRatio: 1,
          simulateTouch: true,
          slidesPerView: 1,
          speed: 500,
          navigation: {
            nextEl: nextEl[0],
            prevEl: prevEl[0],
            disabledClass: 'swiper-button-disabled',
          },
          mousewheel: {
            enabled: true,
            eventsTarget: "[carousel='component']",
            sensitivity: 1,
            forceToAxis: true,
          },
        });

        swiperInstance.on('progress', (e) => {
          gsap.to(progress, {
            value: e.progress,
            onUpdate: () => { tl.progress(progress.value); },
          });
        });

        swiperInstance.on('reachBeginning', () => prevEl.addClass('swiper-button-disabled'));
        swiperInstance.on('reachEnd', () => nextEl.addClass('swiper-button-disabled'));
        swiperInstance.on('fromEdge', () => {
          prevEl.removeClass('swiper-button-disabled');
          nextEl.removeClass('swiper-button-disabled');
        });

        window.collectionSwiper = swiperInstance;
      }

      $(document).on('carouselRebuilt', () => {
        rotateAmount = layoutCarouselItems(wrapEl[0], window.dynamicProductsCount) || rotateAmount;
        if (window.swiperInitialized) initSwiper();
      });
    });
  }

  function animateCollectionTitle() {
    const collectionTitle = document.getElementById('collection-title');
    if (!collectionTitle || typeof gsap === 'undefined') return;

    gsap.set(collectionTitle, { left: '50%', top: '50%', xPercent: -50, yPercent: -50 });
    gsap.to(collectionTitle, {
      top: '6rem',
      yPercent: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      delay: 1,
    });
  }

  window.CollectionCarousel = {
    layoutCarouselItems,
    rebuildCarousel,
    initCarousel,
    animateCollectionTitle,
  };
})();
