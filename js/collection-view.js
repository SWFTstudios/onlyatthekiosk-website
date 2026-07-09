/**
 * Collection view mode (carousel / list) and filter chips.
 */
(function () {
  const STORAGE_KEY = 'collectionView';

  function getViewMode() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'carousel';
    } catch {
      return 'carousel';
    }
  }

  function setViewMode(mode) {
    const page = document.querySelector('.collection-page');
    if (!page) return;

    page.setAttribute('data-view', mode);
    document.body.classList.toggle('collection-view-carousel', mode === 'carousel');
    document.body.classList.toggle('collection-view-list', mode === 'list');

    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch { /* ignore */ }

    page.querySelectorAll('.collection-view-toggle__btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === mode);
      btn.setAttribute('aria-pressed', btn.dataset.view === mode ? 'true' : 'false');
    });

    if (mode === 'carousel') {
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  function initViewToggle() {
    const page = document.querySelector('.collection-page');
    if (!page) return;

    setViewMode(getViewMode());

    page.querySelectorAll('.collection-view-toggle__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setViewMode(btn.dataset.view);
      });
    });
  }

  function initFilters(onFilterChange) {
    const page = document.querySelector('.collection-page');
    if (!page) return 'all';

    const chips = page.querySelectorAll('.collection-filter-chip');
    let active = 'all';

    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam === 'hoodie' || typeParam === 'tee') {
      active = typeParam === 'hoodie' ? 'hoodie' : 'tee';
    }

    chips.forEach((chip) => {
      if (chip.dataset.filter === active) chip.classList.add('is-active');
      chip.addEventListener('click', () => {
        active = chip.dataset.filter;
        chips.forEach((c) => c.classList.toggle('is-active', c.dataset.filter === active));
        if (typeof onFilterChange === 'function') onFilterChange(active);
      });
    });

    return active;
  }

  function buildToolbar(collectionKey) {
    const meta = window.COLLECTION_CONFIG?.COLLECTION_META?.[collectionKey];
    if (!meta) return '';

    const filtersHtml = meta.filters.map((f) => `
      <button type="button" class="collection-filter-chip${f.id === 'all' ? ' is-active' : ''}" data-filter="${f.id}">${f.label}</button>
    `).join('');

    return `
      <div class="collection-toolbar">
        <div class="collection-filters" role="group" aria-label="Filter products">${filtersHtml}</div>
        <div class="collection-view-toggle" role="group" aria-label="View mode">
          <button type="button" class="collection-view-toggle__btn is-active" data-view="carousel" aria-pressed="true">Carousel</button>
          <button type="button" class="collection-view-toggle__btn" data-view="list" aria-pressed="false">List</button>
        </div>
      </div>
    `;
  }

  window.CollectionView = {
    getViewMode,
    setViewMode,
    initViewToggle,
    initFilters,
    buildToolbar,
  };
})();
