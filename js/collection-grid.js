/**
 * KIOSK collection grid
 * Replaces the legacy scroll-controlled 3D carousel with a conventional,
 * responsive ecommerce product grid.
 */
(function () {
  'use strict';

  window.KIOSK_PRODUCT_DRAWER_CONFIG = window.KIOSK_PRODUCT_DRAWER_CONFIG || {};

  const getCollectionHandle = () => {
    const file = window.location.pathname.split('/').pop() || '';
    return file.replace(/\.html$/, '') || 'chains';
  };

  const formatTitle = (handle) => handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('T Shirts', 'T-Shirts');

  const createCard = (handle, entry) => {
    const article = document.createElement('article');
    article.className = 'collection-grid__card';
    article.setAttribute('role', 'listitem');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'collection-grid__button';
    button.dataset.productHandle = handle;
    button.setAttribute('aria-label', `View ${entry.title}`);

    const media = document.createElement('span');
    media.className = 'collection-grid__media';

    const image = document.createElement('img');
    image.className = 'collection-grid__image';
    image.src = entry.product;
    image.alt = entry.productAlt || `${entry.title} product photo`;
    image.loading = 'lazy';
    image.decoding = 'async';
    media.appendChild(image);

    const meta = document.createElement('span');
    meta.className = 'collection-grid__meta';

    const title = document.createElement('h2');
    title.className = 'collection-grid__title';
    title.textContent = entry.title;

    const action = document.createElement('span');
    action.className = 'collection-grid__action';
    action.textContent = 'View';

    meta.append(title, action);
    button.append(media, meta);
    article.appendChild(button);
    return article;
  };

  const openProduct = (handle) => {
    if (window.KioskProductDrawer?.open) {
      window.KioskProductDrawer.open(handle);
      return;
    }
    window.location.href = `../product.html?handle=${encodeURIComponent(handle)}`;
  };

  const init = () => {
    const component = document.querySelector('[carousel="component"]');
    if (!component) return;

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.lenis?.start?.();

    const collectionHandle = getCollectionHandle();
    const handles = window.COLLECTION_HANDLES?.[collectionHandle] || [];
    const title = document.querySelector('.collection-title-text');
    if (title) title.textContent = formatTitle(collectionHandle);

    const grid = document.createElement('div');
    grid.className = 'collection-grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', `${formatTitle(collectionHandle)} products`);

    handles.forEach((handle) => {
      const entry = window.PRODUCT_IMAGES?.[handle];
      if (entry) grid.appendChild(createCard(handle, entry));
    });

    component.replaceChildren(grid);

    grid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-handle]');
      if (button) openProduct(button.dataset.productHandle);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
