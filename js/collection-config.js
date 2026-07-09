/**
 * Collection page configuration — active catalog, filters, display labels.
 */
(function () {
  const JEWELRY_ACTIVE_NUMBERS = ['001', '002', '003', '004', '005', '006'];
  const TOP_NUMBERS = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'];
  const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

  function buildJewelryHandles(type) {
    const handles = [];
    JEWELRY_ACTIVE_NUMBERS.forEach((num) => {
      handles.push(`${num}-gold-${type}`);
      handles.push(`${num}-silver-${type}`);
    });
    return handles;
  }

  function buildTopHandles(kind, color) {
    return TOP_NUMBERS.map((num) => `${num}-${color}-${kind}`);
  }

  const ACTIVE_HANDLES = {
    chains: buildJewelryHandles('chain'),
    bracelets: buildJewelryHandles('bracelet'),
    hoodies: buildTopHandles('hoodie', 'black').concat(buildTopHandles('hoodie', 'white')),
    't-shirts': buildTopHandles('tshirt', 'black').concat(buildTopHandles('tshirt', 'white')),
    tops: buildTopHandles('hoodie', 'black')
      .concat(buildTopHandles('hoodie', 'white'))
      .concat(buildTopHandles('tshirt', 'black'))
      .concat(buildTopHandles('tshirt', 'white')),
  };

  const COLLECTION_META = {
    chains: {
      title: 'Chains',
      filterType: 'material',
      filters: [
        { id: 'all', label: 'All' },
        { id: 'gold', label: 'Gold Plated' },
        { id: 'silver', label: 'Stainless Steel' },
      ],
    },
    bracelets: {
      title: 'Bracelets',
      filterType: 'material',
      filters: [
        { id: 'all', label: 'All' },
        { id: 'gold', label: 'Gold Plated' },
        { id: 'silver', label: 'Stainless Steel' },
      ],
    },
    tops: {
      title: 'Tops',
      filterType: 'tops',
      filters: [
        { id: 'all', label: 'All' },
        { id: 'hoodie', label: 'Hoodie' },
        { id: 'tee', label: 'Tee' },
        { id: 'black', label: 'Black' },
        { id: 'white', label: 'White' },
      ],
    },
    hoodies: {
      title: 'Hoodies',
      filterType: 'tops',
      filters: [
        { id: 'all', label: 'All' },
        { id: 'black', label: 'Black' },
        { id: 'white', label: 'White' },
      ],
    },
    't-shirts': {
      title: 'Essential Tees',
      filterType: 'tops',
      filters: [
        { id: 'all', label: 'All' },
        { id: 'black', label: 'Black' },
        { id: 'white', label: 'White' },
      ],
    },
  };

  function getMaterialLabel(handle) {
    if (handle.includes('-gold-')) return 'Gold Plated';
    if (handle.includes('-silver-')) return 'Stainless Steel';
    if (handle.includes('-black-')) return 'Black';
    if (handle.includes('-white-')) return 'White';
    return '';
  }

  function getProductTypeLabel(handle) {
    if (handle.includes('-hoodie')) return 'Hoodie';
    if (handle.includes('-tshirt')) return 'Tee';
    if (handle.includes('-chain')) return 'Chain';
    if (handle.includes('-bracelet')) return 'Bracelet';
    return '';
  }

  function filterProducts(products, collectionKey, activeFilter) {
    const activeSet = new Set(ACTIVE_HANDLES[collectionKey] || []);
    let filtered = products.filter((p) => activeSet.has(p.handle));

    if (!activeFilter || activeFilter === 'all') return filtered;

    if (collectionKey === 'chains' || collectionKey === 'bracelets') {
      if (activeFilter === 'gold') {
        filtered = filtered.filter((p) => p.handle.includes('-gold-'));
      } else if (activeFilter === 'silver') {
        filtered = filtered.filter((p) => p.handle.includes('-silver-'));
      }
    }

    if (collectionKey === 'tops' || collectionKey === 'hoodies' || collectionKey === 't-shirts') {
      if (activeFilter === 'hoodie') {
        filtered = filtered.filter((p) => p.handle.includes('-hoodie'));
      } else if (activeFilter === 'tee') {
        filtered = filtered.filter((p) => p.handle.includes('-tshirt'));
      } else if (activeFilter === 'black') {
        filtered = filtered.filter((p) => p.handle.includes('-black-'));
      } else if (activeFilter === 'white') {
        filtered = filtered.filter((p) => p.handle.includes('-white-'));
      }
    }

    return filtered;
  }

  function getProductPageUrl(handle, basePath) {
    const prefix = basePath || '';
    return `${prefix}/products/${handle}`;
  }

  function getCollectionBasePath() {
    const path = window.location.pathname;
    return path.includes('/collections/') ? '..' : '.';
  }

  window.COLLECTION_CONFIG = {
    ACTIVE_HANDLES,
    COLLECTION_META,
    SIZES,
    JEWELRY_ACTIVE_NUMBERS,
    getMaterialLabel,
    getProductTypeLabel,
    filterProducts,
    getProductPageUrl,
    getCollectionBasePath,
  };
})();
