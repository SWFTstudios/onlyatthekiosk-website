/**
 * Apply catalog product images and titles to collection carousel pages.
 * Loaded on collections/*.html after product-image-manifest.js.
 */
(function () {
  function getCollectionKeyFromPath() {
    const parts = window.location.pathname.split('/');
    const page = parts[parts.length - 1].replace('.html', '');
    const valid = ['chains', 'bracelets', 'hoodies', 't-shirts'];
    return valid.includes(page) ? page : null;
  }

  function applyCatalogToCarousel() {
    const key = getCollectionKeyFromPath();
    if (!key || typeof applyManifestCarouselImages !== 'function') return;
    applyManifestCarouselImages(key);
  }

  function scheduleReapply() {
    applyCatalogToCarousel();
    requestAnimationFrame(applyCatalogToCarousel);
    setTimeout(applyCatalogToCarousel, 100);
    setTimeout(applyCatalogToCarousel, 2000);
  }

  document.addEventListener('DOMContentLoaded', scheduleReapply);
  document.addEventListener('productsLoaded', applyCatalogToCarousel);

  if (typeof window !== 'undefined') {
    window.applyCatalogToCarousel = applyCatalogToCarousel;
  }
})();
