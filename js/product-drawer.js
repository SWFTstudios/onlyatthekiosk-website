/**
 * Product quick-view drawer with size picker and add to cart.
 */
(function () {
  let currentProduct = null;
  let currentHandle = null;
  let selectedVariantId = null;

  const PLACEHOLDER = '/images/kiosk-placeholder-product-img.webp';

  function getBasePath() {
    return window.COLLECTION_CONFIG?.getCollectionBasePath?.() || '..';
  }

  async function fetchProduct(handle) {
    if (window.airtable) {
      const product = await window.airtable.getProductByHandle(handle);
      if (product && window.ProductCatalog) {
        return window.ProductCatalog.enrichProduct(product);
      }
      return product;
    }
    if (window.shopify) {
      return window.shopify.getProductByHandle(handle);
    }
    throw new Error('No product API available');
  }

  function getPlaceholder(handle) {
    if (typeof getProductPlaceholder === 'function') {
      const collectionKey = document.querySelector('.collection-page')?.dataset?.collection;
      return getProductPlaceholder(handle, collectionKey);
    }
    return {
      title: 'Product',
      price: { amount: '79.99', currencyCode: 'USD' },
      mainImage: PLACEHOLDER,
      gallery: [PLACEHOLDER],
      description: '<p>Product from KIOSK.</p>',
      careInstructions: '<p>See full product page for care details.</p>',
    };
  }

  function formatPrice(product) {
    const price = product.priceRange?.minVariantPrice || product.price;
    if (!price) return '';
    const amount = price.amount;
    const currency = price.currencyCode || 'USD';
    if (window.airtable?.formatPrice) return window.airtable.formatPrice(amount, currency);
    if (window.shopify?.formatPrice) return window.shopify.formatPrice(amount, currency);
    return `${amount} ${currency}`;
  }

  function buildSizePicker(product) {
    const sizes = product.catalogSizes || window.COLLECTION_CONFIG?.SIZES || [];
    const variants = product.variants?.edges?.map((e) => e.node) || product.variants || [];

    let html = '<div class="drawer-size-picker"><h4>Size</h4><div class="drawer-size-picker__grid">';
    sizes.forEach((size) => {
      const variant = variants.find((v) => (v.title || v.option1 || '').toUpperCase() === size);
      const available = variant ? variant.availableForSale !== false : true;
      const variantId = variant?.id || '';
      html += `<button type="button" class="drawer-size-chip${size === 'M' ? ' is-active' : ''}" data-size="${size}" data-variant-id="${variantId}" ${available ? '' : 'disabled'}>${size}</button>`;
    });
    html += '</div></div>';
    return html;
  }

  function bindSizePicker() {
    const chips = document.querySelectorAll('.drawer-size-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (chip.disabled) return;
        chips.forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        selectedVariantId = chip.dataset.variantId || null;
      });
    });
    const defaultChip = document.querySelector('.drawer-size-chip.is-active');
    if (defaultChip) selectedVariantId = defaultChip.dataset.variantId || null;
  }

  function populateDrawer(product) {
    currentProduct = product;
    $('#drawer-product-title').text(product.title);
    $('#drawer-product-price').text(formatPrice(product));

    const images = window.ProductCatalog
      ? window.ProductCatalog.getProductImages(product.handle)
      : null;

    let mainUrl = PLACEHOLDER;
    const galleryUrls = [];

    if (product.images?.edges?.length) {
      product.images.edges.forEach(({ node }, i) => {
        if (i === 0) mainUrl = node.url;
        else galleryUrls.push(node.url);
      });
    } else if (images) {
      mainUrl = images.hero;
      galleryUrls.push(...images.details);
    } else if (product.mainImage) {
      mainUrl = product.mainImage;
      galleryUrls.push(...(product.gallery || []));
    }

    $('#drawer-main-image').attr('src', mainUrl).attr('alt', product.title || '');

    const gallery = $('#drawer-gallery');
    gallery.empty();
    galleryUrls.forEach((url) => {
      const item = $('<div class="products_drawer-more-item"></div>');
      const img = $('<img class="products_drawer-more-image" loading="lazy">');
      img.attr('src', url).attr('alt', product.title);
      item.append(img);
      item.on('click', () => {
        $('#drawer-main-image').attr('src', url);
      });
      gallery.append(item);
    });

    const sizeContainer = $('#drawer-size-container');
    if (sizeContainer.length) {
      sizeContainer.html(buildSizePicker(product));
      bindSizePicker();
    }

    const desc = product.descriptionHtml || product.description || '';
    $('#drawer-description').html(desc || '<p>No description available.</p>');
    $('#drawer-care-instructions').html(product.careInstructions || product.careHtml || '<p>See product page for care details.</p>');
    $('#drawer-delivery').html(product.deliveryHtml || '<p>Standard shipping 5–7 business days. Free EU shipping on qualifying orders.</p>');

    const pdpUrl = `${getBasePath()}/products/${product.handle}`;
    $('#drawer-full-details').attr('href', pdpUrl).show();

    const available = product.variants?.edges?.[0]?.node?.availableForSale !== false;
    $('#drawer-out-of-stock').toggle(!available);
    $('#drawer-add-to-cart').prop('disabled', !available);
    $('#drawer-error').hide();
  }

  function openDrawer(handle) {
    currentHandle = handle;
    currentProduct = null;
    selectedVariantId = null;

    const drawer = $('#product-drawer');
    drawer.addClass('open');
    $('body').css('overflow', 'hidden');
    $(document).trigger('drawerOpen');

    if (handle?.startsWith('product-handle-')) {
      populateDrawer({ ...getPlaceholder(handle), handle, title: getPlaceholder(handle).title });
      return;
    }

    $('#drawer-loading').show();
    fetchProduct(handle)
      .then((product) => {
        if (!product) throw new Error('Product not found');
        populateDrawer(product);
        $('#drawer-loading').hide();
      })
      .catch((err) => {
        console.error(err);
        const placeholder = getPlaceholder(handle);
        populateDrawer({ ...placeholder, handle, title: placeholder.title });
        $('#drawer-loading').hide();
      });
  }

  function closeDrawer() {
    $('#product-drawer').removeClass('open');
    $('body').css('overflow', '');
    $(document).trigger('drawerClose');
  }

  function initDrawer() {
    $('#drawer-close-btn, #drawer-close-overlay').on('click', closeDrawer);
    $(document).on('keydown', (e) => {
      if (e.key === 'Escape' && $('#product-drawer').hasClass('open')) closeDrawer();
    });

    $(document).on('click', '.view-details-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const item = $(this).closest('[data-product-handle]');
      const slide = $(this).closest('.swiper-slide');
      const handle = item.data('product-handle') || slide.data('product-handle');
      if (handle) openDrawer(handle);
    });

    $(document).on('click', '.collection-list__item', function (e) {
      if ($(e.target).closest('.collection-list__link').length) return;
      if ($(e.target).closest('.view-details-btn').length) return;
      const handle = $(this).data('product-handle');
      if (handle) openDrawer(handle);
    });

    $('.products_description-question').on('click', function () {
      const item = $(this).closest('.products_description-item');
      const wasActive = item.hasClass('active');
      $('.products_description-item').removeClass('active');
      if (!wasActive) item.addClass('active');
    });

    $('#drawer-add-to-cart').on('click', async function () {
      const btn = $(this);
      const original = btn.text();
      btn.prop('disabled', true).text('Adding...');

      try {
        let product = currentProduct;
        if (!product && currentHandle) {
          product = await fetchProduct(currentHandle);
          currentProduct = product;
        }
        if (!product) throw new Error('Product not available');

        let variantId = selectedVariantId;
        if (!variantId && product.variants?.edges?.length) {
          const activeChip = document.querySelector('.drawer-size-chip.is-active');
          const size = activeChip?.dataset.size;
          const match = product.variants.edges.find(({ node }) =>
            (node.title || '').toUpperCase() === size
          );
          variantId = match?.node?.id || product.variants.edges[0].node.id;
        }

        if (!variantId) throw new Error('Select a size');
        if (!window.cart) throw new Error('Cart not loaded');

        const qty = parseInt($('#drawer-quantity').val(), 10) || 1;
        await window.cart.addItem(variantId, qty);
        btn.text('Added!');
        setTimeout(() => btn.text(original), 2000);
      } catch (err) {
        console.error(err);
        alert('Could not add to cart: ' + err.message);
        btn.text(original);
      } finally {
        btn.prop('disabled', false);
      }
    });
  }

  window.ProductDrawer = { openDrawer, closeDrawer, initDrawer, fetchProduct, populateDrawer };
})();
