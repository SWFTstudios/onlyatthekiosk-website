/**
 * KIOSK — Glass runtime
 * Renders the shared chrome (nav, footer, player, lightbox) and each
 * page's content from window.KIOSK_CONTENT (js/kiosk-content.js).
 *
 * Pages declare themselves with <body class="k" data-page="home|films|journal|story|radio|vault|hunt|store">
 * and provide empty mount points (data-mount="...") that this file fills.
 */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  const C = window.KIOSK_CONTENT || { features: [], mixes: [], products: [], categories: [], issue: {} };
  let PAGE = document.body.dataset.page || '';

  /* ------------------------------------------------------------ utils */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const pad = (n) => String(n).padStart(2, '0');
  const mount = (name) => $(`[data-mount="${name}"]`);
  const fill = (name, html) => { const el = mount(name); if (el) el.innerHTML = html; return el; };

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
  };

  /* ------------------------------------------------- reader settings
   * Saved on this device as 'kiosk:prefs' (only values that differ from
   * the defaults). The <head> of each page copies the look-and-feel ones
   * onto <html data-*> before paint; the CSS does the rest.
   * -------------------------------------------------------------------- */
  const PREFS_KEY = 'kiosk:prefs';
  const PREF_DEFAULTS = {
    accent: 'signal', type: 'm', density: 'comfortable', depth: 'on', corners: 'round',
    motion: 'system', intro: 'once', autoplay: 'on', lang: 'en', mt: 'off',
    homeOrder: [], homeHidden: [],
  };
  const PREF_ATTRS = ['accent', 'type', 'density', 'depth', 'corners', 'motion'];
  const prefs = Object.assign({}, PREF_DEFAULTS, store.get(PREFS_KEY, {}));
  function savePrefs() {
    const out = {};
    Object.keys(PREF_DEFAULTS).forEach((k) => {
      if (JSON.stringify(prefs[k]) !== JSON.stringify(PREF_DEFAULTS[k])) out[k] = prefs[k];
    });
    store.set(PREFS_KEY, out);
    applyPrefs();
  }
  function applyPrefs() {
    const d = document.documentElement;
    PREF_ATTRS.forEach((k) => {
      if (prefs[k] && prefs[k] !== PREF_DEFAULTS[k]) d.setAttribute(`data-${k}`, prefs[k]);
      else d.removeAttribute(`data-${k}`);
    });
  }

  const icon = {
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.5 11.5l7-7M5.5 4.5h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    left: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="M0 1.2v11.6c0 .8.9 1.3 1.6.8l9.4-5.8c.6-.4.6-1.3 0-1.7L1.6.4C.9-.1 0 .4 0 1.2z"/></svg>',
    pause: '<svg viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.3a3 3 0 0 1 6 1.5C14 10 8 13.5 8 13.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    expand: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    collapse: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 6.5h-4v-4M2.5 9.5h4v4M9.5 6.5L14 2M6.5 9.5L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 14.5s5-4.6 5-8.3A5 5 0 0 0 3 6.2c0 3.7 5 8.3 5 8.3z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.3" r="1.7" stroke="currentColor" stroke-width="1.3"/></svg>',
    gear: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 6h8M15 6h2M3 14h2M9 14h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="13" cy="6" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="14" r="2" stroke="currentColor" stroke-width="1.4"/></svg>',
    user: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M4 16.5c1.5-3 4-4.5 6-4.5s4.5 1.5 6 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    bag: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5.5 7h9l-.7 9.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5.5 7z" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5" stroke="currentColor" stroke-width="1.3"/></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" stroke="currentColor" stroke-width="1.4"/></svg>',
    wave: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" stroke="currentColor" stroke-width="1.4"/></svg>',
  };

  /* ------------------------------------------------------------ data */

  // Lead story first, then newest shoot first
  // `hidden: true` keeps a story in the content file but off the site
  const features = (C.features || []).filter((f) => !f.hidden).sort((a, b) => {
    const lead = (C.issue || {}).lead;
    if (a.slug === lead) return -1;
    if (b.slug === lead) return 1;
    return String(b.published).localeCompare(String(a.published));
  });
  const featureBySlug = (slug) => features.find((f) => f.slug === slug);
  const productById = (id) => (C.products || []).find((p) => p.id === id);
  const mixBySlug = (slug) => (C.mixes || []).find((m) => m.slug === slug);
  const machineById = (id) => (C.machines || []).find((m) => m.id === id);
  const spotifyUrl = (m) => (m && m.spotify ? `https://open.spotify.com/playlist/${encodeURIComponent(m.spotify)}` : '');
  const sourceName = (m) => (m.soundcloud ? 'SoundCloud' : m.apple ? 'Apple Music' : m.spotify ? 'Spotify' : '');
  const appleEmbed = (url) => String(url || '').replace('://music.apple.com', '://embed.music.apple.com');
  /** Where the playlist lives (button under each deck / card). */
  const sourceLink = (m) => (m.soundcloud ? { href: m.soundcloud, label: 'Open on SoundCloud' } : m.apple ? { href: m.apple, label: 'Open in Apple Music' } : m.spotify ? { href: spotifyUrl(m), label: 'Open in Spotify' } : null);
  const mixMeta = (m) => [m.bpm && `${m.bpm} BPM`, m.length].filter(Boolean).join(' · ') || sourceName(m);
  const categoryLabel = (id) => ((C.categories || []).find((c) => c.id === id) || {}).label || id;

  const storyHref = (f) => `story.html?s=${encodeURIComponent(f.slug)}`;
  const featureName = (f) => [f.year, f.make, f.model].filter(Boolean).join(' ');
  const place = (f) => [f.city, f.country].filter(Boolean).join(', ');
  const typeLabel = (t) => ({ motorcycle: 'Motorcycle', meet: 'Meet' }[t] || 'Car');

  /* Blog helpers: chapters are dictated later; empty ones stay hidden. */
  const DRAFT = new URLSearchParams(location.search).get('draft') === '1';
  const written = (f) => (f.chapters || []).filter((c) => (c.body || '').trim());
  const paragraphs = (text) => String(text || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  function readMinutes(f) {
    const words = (f.story || []).map((b) => `${b.lead || ''} ${b.body || b.text || ''}`)
      .concat(written(f).map((c) => c.body)).join(' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
  }
  const longDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const formatLabel = (f) => ({ film: 'Film', gallery: 'Photo story', interview: 'Interview' }[f.format] || 'Story');
  const price = (p) => {
    if (p.price == null) return 'Shop';
    const n = Number(p.price);
    return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  };

  // Per-colourway helpers: a colourway can carry its own status, handle and photos
  const wayOf = (p, cw) => (p.colorways || [])[cw || 0] || {};
  const wayStatus = (p, cw) => wayOf(p, cw).status || p.status;
  const handleOf = (p, cw) => wayOf(p, cw).shopifyHandle || p.shopifyHandle || '';
  const lifeOf = (p, cw) => { const w = wayOf(p, cw); return (w.lifestyle && w.lifestyle.length ? w.lifestyle : p.lifestyle) || []; };
  const isDigitalP = (p) => ['mixes', 'films', 'luts'].includes(p.category);
  const canBuy = (p, cw) => wayStatus(p, cw) === 'available' && !!(handleOf(p, cw) || p.href);
  // Kept for older links: a direct link to the product page
  const productHref = (p, cw) => (canBuy(p, cw) ? (p.href && !handleOf(p, cw) ? p.href : pdpHref(p, cw)) : '');
  const pdpHref = (p, cw) => `vault.html?p=${encodeURIComponent(p.id)}${cw ? `&cw=${cw}` : ''}`;

  /**
   * Product image for a colourway. view: '' (default, back for quote pieces,
   * flips to the front on hover), 'front', 'back' or 'life' (lifestyle photo).
   * Physical pieces with no lifestyle photos show a tech sketch.
   */
  const storeOf = (p) => (C.stores || []).find((x) => x.id === (p.store || 'kiosk'));

  function productVisual(p, cw = 0, view = '') {
    const way = (p.colorways || [])[cw] || {};
    const alt = esc(way.name ? `${p.title}, ${way.name}` : p.title);
    const life = lifeOf(p, cw);
    if ((view === 'life' || view === 'life2') && life.length) {
      const i = view === 'life2' && life[1] ? 1 : 0;
      return `<img class="k-product-img k-product-img--photo" src="${esc(life[i])}" alt="${alt}, ${i ? 'in the terminal' : 'on the street'}" loading="lazy" decoding="async">`;
    }
    // No real photos yet: a factory tech sketch instead of a render
    if (!life.length && !isDigitalP(p) && window.KioskMockup) {
      return window.KioskMockup.render(p.mockup || { type: 'tee' }, way, { sketch: true, code: flightOf(p), title: p.title, category: categoryLabel(p.category), detail: p.detail, sizes: p.sizes, colorways: p.colorways });
    }
    if (view === 'front' && way.imageFront) return `<img class="k-product-img" src="${esc(way.imageFront)}" alt="${alt}, front" loading="lazy" decoding="async">`;
    const src = way.image || p.image;
    if (src && way.imageFront && !view) {
      return `<span class="k-flip"><img class="k-product-img" src="${esc(src)}" alt="${alt}, back" loading="lazy" decoding="async"><img class="k-product-img k-flip__alt" src="${esc(way.imageFront)}" alt="" aria-hidden="true" loading="lazy" decoding="async"></span>`;
    }
    if (src) return `<img class="k-product-img" src="${esc(src)}" alt="${alt}" loading="lazy" decoding="async">`;
    return window.KioskMockup ? window.KioskMockup.render(p.mockup || { type: 'tee' }, way) : '';
  }

  /** Stories that feature a product (pinned, graded with, film or soundtrack). */
  function storiesFor(p) {
    return features.filter((f) => (f.products || []).includes(p.id) || f.gradedWith === p.id || f.filmProduct === p.id
      || ((mixBySlug(f.soundtrack) || {}).product === p.id));
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ----------------------------------------------------------- media */

  /**
   * Media block. Uses the real image/video when present; otherwise a
   * tonal "plate" with the subject's code as a ghost watermark.
   */
  function media(opts) {
    const { image, video, poster, tone, mark, meta, alt, eager, swatch, cls, style, focus, vimeo } = opts;
    let inner;
    if (video) {
      inner = `<video src="${esc(video)}" ${poster ? `poster="${esc(poster)}"` : ''} muted loop playsinline autoplay preload="metadata"></video>`;
    } else if (image) {
      inner = `<img src="${esc(image)}" alt="${esc(alt || '')}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${focus ? ` style="object-position:${esc(focus)}"` : ''}>`;
    } else {
      const style = swatch ? ` style="--a:${esc(swatch)};--c:${esc(swatch)}66"` : '';
      inner = `<div class="plate plate--${esc(tone || 'graphite')}"${style}${vimeo && vimeo.id ? ` data-vimeo-cover="${esc(vimeo.id)}"` : ''} role="img" aria-label="${esc(alt || mark || '')}">${mark ? `<span class="plate__mark">${esc(mark)}</span>` : ''}${meta ? `<span class="plate__meta">${esc(meta)}</span>` : ''}</div>`;
    }
    return `<div class="k-media${cls ? ` ${cls}` : ''}"${style ? ` style="${esc(style)}"` : ''}>${inner}</div>`;
  }

  const featureMedia = (f, extra = {}) => media({
    image: f.image, tone: f.tone, mark: f.code, alt: featureName(f), focus: f.focus, vimeo: f.vimeo,
    meta: extra.meta !== undefined ? extra.meta : `${f.city} · ${f.coords || ''}`,
    ...extra,
  });

  /** The K star (images/brand/kiosk-k-star.svg): the KIOSK logo — a backwards K and a K back to back, a four-point star where they meet. */
  const KIOSK_SYMBOL = '<svg class="k-symbol" viewBox="0 0 1152 726" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M0 725.1C0 724.3 48.2 677.3 103.5 624C112.8 615 141.2 587.6 166.5 563.1C191.8 538.6 230 501.6 251.5 481C272.9 460.4 298.4 435.9 308 426.5C329.9 405.4 347.1 388.8 362.4 374.1L374.3 362.7L365.4 354.1C337.4 327 240.5 232.7 204.5 197.5C156.4 150.5 53.4 50.4 10.7 9C6.5 4.9 3 1.2 3 0.8C3 0.4 62.6 0 135.4 0L267.8 -0L271 3.7C273.9 7 282.8 16.4 323.6 59C335.1 71 383.5 122 431.9 173C452.5 194.7 475.3 218.5 482.5 225.8C495 238.4 495.8 239 499.6 239C504.1 239 507.1 236.7 508.9 231.7C509.7 229.8 509.8 194.1 509.3 114.4L508.7 -0.1L540.8 0.2C558.4 0.4 573.1 0.8 573.5 1.2C574.8 2.5 570.2 84.3 563.9 171.5C556.7 271.3 551.8 294.3 532.6 318.6C525.2 328 514.5 335.5 502 340.1C497.7 341.6 477.9 347.2 457.9 352.5C437.9 357.8 420.8 362.3 420 362.6C419.1 363 421.3 364 425 365C433.3 367.3 466.5 376.1 483.6 380.5C508.1 386.9 517.3 391.3 527.5 401.5C549.4 423.4 555.8 447.9 563 537.5C564.1 551.2 565.2 563.9 565.5 565.5C566.5 571.5 570.7 630.7 572 656C572.6 667.3 573.3 679 573.6 682.1L574.2 687.7L560.9 688.3C553.5 688.7 538.5 689 527.5 689.1L507.5 689.2L507 581.2C506.7 521.8 506.2 472.9 505.9 472.6C505.3 472 492.5 483.7 472 503.4C465.6 509.5 437.3 536.8 409 564C380.7 591.2 350.1 620.7 341 629.5C331.9 638.3 305.8 663.6 283 685.6L241.5 725.6L120.7 725.8C54.3 725.9 0 725.6 0 725.1ZM787.5 611.4C724.8 548.4 669.7 493.1 665 488.6C660.4 484.2 654.6 478.6 652.1 476.2C649.7 473.9 647.6 472 647.4 472C647.2 472 647 520.8 647 580.5L647 689L614.5 689C586.3 689 581.9 688.8 581.4 687.5C580.4 684.9 585.3 604.6 589 564C597.6 469.1 600.4 450.3 609.4 429.1C616 413.6 626.8 400.4 639.5 392.5C648.5 386.8 659 383.5 702.2 372.4C721.4 367.5 737 363.2 737 362.9C737 362.6 729.7 360.5 720.8 358.2C677 346.9 658.5 341.9 652.3 339.4C627.2 329.3 612.5 311.3 604.6 280.6C599.5 261.3 596.6 233.7 592 161C590.8 143.1 589.5 122 589 114C586.5 75.9 583.1 1.5 583.8 0.8C584.3 0.3 598.8 0.1 616.1 0.2L647.5 0.5L647.5 21.5C647.5 33.1 647.1 85 646.7 137C645.9 230.5 645.9 231.5 647.9 234.7C650.1 238.1 653.5 239.6 657.3 238.6C659.7 238 665.6 232 759.5 134C824.2 66.7 886.8 1.9 888.4 0.8C890 -0.3 1152 -0.2 1152 0.9C1152 1.4 1149.6 4 1146.6 6.7C1140.2 12.4 1066.7 83.1 1059.5 90.5C1054.4 95.7 979.9 167.4 912.5 232C892.1 251.5 869 273.8 861 281.5C831.2 310.4 783.4 355.9 780.8 357.9L778.1 360.1L794.8 376.3C826.9 407.5 847.1 427.1 921 499.5C1040.5 616.6 1089.5 664.6 1121.3 695.4C1137.6 711.3 1151 724.6 1151 724.9C1151 725.2 1094.8 725.6 1026.2 725.8L901.4 726.1L787.5 611.4Z"/></svg>';

  /* ----------------------------------------------------------- chrome */

  const NAV = [
    { id: 'journal', label: 'Atlas', href: 'atlas.html' },
    { id: 'films', label: 'Films', href: 'films.html' },
    { id: 'radio', label: 'Radio', href: 'radio.html' },
    { id: 'tv', label: 'KIOSK TV', href: 'tv.html' },
    { id: 'garage', label: 'Garage', href: 'the-garage.html' },
    { id: 'vault', label: 'Shop', href: 'vault.html' },
  ];

  const PLANE_ICON = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 11.5l14-5-1-2-5 1.4L6.6 2.6 5.3 3.1l2.3 4.6-3.3 1-1.7-1.5-1 .4 1 2.6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 16.5h14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  const TAB_ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    garage: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 14.5l1.6-4.3A2 2 0 0 1 7 8.9h10a2 2 0 0 1 1.9 1.3l1.6 4.3V18a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-1H7.1v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.5" cy="14" r="1.1" fill="currentColor"/><circle cx="16.5" cy="14" r="1.1" fill="currentColor"/></svg>',
    journal: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h10.5L19 8v11.5H5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 10h8M8 13.5h8M8 17h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    radio: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12v-1a8 8 0 0 1 16 0v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="3.5" y="12" width="4" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="16.5" y="12" width="4" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l-1 11.5H6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    films: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M10 9.3v5.4l4.6-2.7z" fill="currentColor"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20.5s-6-5.6-6-10.5a6 6 0 0 1 12 0c0 4.9-6 10.5-6 10.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="1.6"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5L5.5 5h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V19h13v-6.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 19v-4h4v4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    flights: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 16.5l19-6.5-1.2-2.6-6.6 1.8L8.3 3.5 6.6 4.2l3 6.1-4.4 1.3-2.2-2-1.4.5 1.4 3.4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 20.5h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="6.5" cy="17.5" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="17.5" r="2" stroke="currentColor" stroke-width="1.6"/></svg>',
  };
  const MENU_EXTRA = {
    journal: { note: 'Every story', icon: 'journal' },
    films: { note: 'Screening room', icon: 'films' },
    radio: { note: 'Phonk & mixes', icon: 'radio' },
    tv: { note: 'Music videos', icon: 'films' },
    garage: { note: 'The Street File', icon: 'garage' },
    vault: { note: 'Supply', icon: 'shop' },
  };
  const MENU = [
    { id: 'home', label: 'Home', href: 'index.html', note: 'Front page', icon: 'home' },
    ...NAV.map((n) => ({ ...n, ...(MENU_EXTRA[n.id] || {}) })),
    { id: 'archive', label: 'The Journal', href: 'archive.html', note: 'Monthly archive', icon: 'journal' },
    { id: 'gallery', label: 'Gallery', href: 'gallery.html', note: 'Every frame', icon: 'films' },
    { id: 'hunt', label: 'Lost &amp; Found', href: 'lost-and-found.html', note: 'Rare finds', icon: 'pin' },
    { id: 'store', label: 'Stores', href: 'store.html', note: 'Partner stores', icon: 'store' },
    { id: 'flights', label: 'Flights', href: 'flights.html', note: 'Live flight deck', icon: 'flights' },
    { id: 'partner', label: 'Partner Hub', href: 'partner.html', note: 'Stores, brands & sponsors', icon: 'store' },
  ];
  const TABS = [
    { id: 'home', label: 'Home', href: 'index.html', icon: TAB_ICONS.home },
    { id: 'journal', label: 'Atlas', href: 'atlas.html', icon: TAB_ICONS.journal },
    { id: 'films', label: 'Films', href: 'films.html', icon: TAB_ICONS.films },
    { id: 'radio', label: 'Radio', href: 'radio.html', icon: TAB_ICONS.radio },
    { id: 'vault', label: 'Shop', href: 'vault.html', icon: TAB_ICONS.shop },
  ];

  function currentNav() {
    const params = new URLSearchParams(location.search);
    if (PAGE === 'story' || PAGE === 'archive' || PAGE === 'gallery') return 'journal';
    if (PAGE === 'hunt' || PAGE === 'store') return 'vault';   // both live under Shop
    return PAGE;
  }

  /* ------------------------------------------------- day / night + clock
   * Theme follows the visitor's local time (light 06:00–18:59) unless they
   * pick one. The <head> of each page sets data-theme before paint; this
   * keeps it in sync, cycles the toggle and ticks the clocks.
   * -------------------------------------------------------------------- */
  const THEME_KEY = 'kiosk:theme';
  const THEME_ICONS = {
    auto: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="3.6" stroke="currentColor" stroke-width="1.4"/><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    dark: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15.6 12.6A6.8 6.8 0 0 1 7.4 4.4a6.8 6.8 0 1 0 8.2 8.2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  };
  const themeIcon = (mode) => THEME_ICONS[mode] || THEME_ICONS.auto;
  const themePref = () => store.get(THEME_KEY, 'auto');
  const autoTheme = () => { const h = new Date().getHours(); return h >= 6 && h < 19 ? 'light' : 'dark'; };
  function applyTheme() {
    const pref = themePref();
    const mode = pref === 'auto' ? autoTheme() : pref;
    document.documentElement.dataset.theme = mode;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0b0b0c' : '#ffffff');
    $$('[data-theme-toggle]').forEach((b) => {
      (b.querySelector('[data-theme-ico]') || b).innerHTML = themeIcon(pref);
      b.setAttribute('aria-label', `Theme: ${pref === 'auto' ? `auto (${mode === 'dark' ? 'night' : 'day'})` : pref === 'dark' ? 'night' : 'day'}`);
      b.title = pref === 'auto' ? `Auto · follows your local time (${mode === 'dark' ? 'night' : 'day'} now)` : pref === 'dark' ? 'Night' : 'Day';
    });
    $$('[data-theme-sub]').forEach((el) => { el.textContent = pref === 'auto' ? `Auto · ${mode === 'dark' ? 'Night' : 'Day'}` : pref === 'dark' ? 'Night' : 'Day'; });
  }
  function bindThemeAndClock() {
    applyTheme();
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-theme-toggle]')) return;
      const inMenu = !!e.target.closest('.k-sheet__q');   // read before applyTheme swaps the icon out
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(themePref()) + 1) % order.length];
      store.set(THEME_KEY, next);
      applyTheme();
      // The menu tile shows the new state itself; elsewhere say it in a toast
      if (!inMenu) toast(next === 'auto' ? 'Theme follows your local time' : next === 'dark' ? 'Night mode' : 'Day mode', { icon: themeIcon(next) });
    });
    const zone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop().replace(/_/g, ' ');
    const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    let lastMinute = -1;
    const tick = () => {
      const now = new Date();
      const t = fmt.format(now);
      $$('[data-clock]').forEach((el) => { el.textContent = t; });
      $$('[data-clock-zone]').forEach((el) => { el.textContent = zone; });
      if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); if (themePref() === 'auto') applyTheme(); }
    };
    tick();
    setInterval(tick, 1000);
  }

  function renderChrome() {
    const cur = currentNav();
    const links = NAV.map((n) => `<a href="${n.href}"${n.id === cur ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');

    const nav = document.createElement('header');
    nav.className = 'k-nav';
    // Glass header: local clock and who's here now · the K star (centre) · day/night · radio · menu. Everything else lives in the menu.
    nav.innerHTML = `
      <div class="k-nav__inner">
        <div class="k-nav__left">
          <div class="k-nav__clock" aria-hidden="true"><span data-clock>--:--:--</span><small data-clock-zone></small></div>
          <a class="k-nav__live" href="index.html" data-live-nav hidden><span class="k-nav__live-dot" aria-hidden="true"></span><b data-live-count>1</b><span class="k-nav__live-label">online</span></a>
        </div>
        <a class="k-logo" href="index.html" aria-label="KIOSK home"><span class="k-logo__mark">${KIOSK_SYMBOL}</span></a>
        <nav class="k-nav__links" aria-label="Primary">${links}</nav>
        <div class="k-nav__actions">
          <button class="k-nav__theme" type="button" data-theme-toggle aria-label="Theme: auto">${themeIcon('auto')}</button>
          <button class="k-nav__theme k-nav__settings" type="button" data-settings-open aria-label="Open settings">${icon.gear}</button>
          <button class="k-nav__theme k-nav__account is-hidden" type="button" data-account-open aria-label="Account" hidden>${icon.user}</button>
          <button class="k-nav__theme k-nav__cart is-hidden" type="button" data-cart-open aria-label="Cart" hidden><span class="k-nav__cart-icon">${icon.bag}</span><span class="k-nav__cart-count" data-cart-count hidden>0</span></button>
          <a class="k-nav__radio" href="radio.html"><span class="k-live" aria-hidden="true"></span><canvas class="k-nav__wave" data-wave data-wave-bar="2" data-wave-gap="2" aria-hidden="true"></canvas><span class="k-nav__radio-label">Radio</span></a>
          <button class="k-nav__menu-btn" type="button" aria-expanded="false" aria-controls="k-sheet" aria-label="Open menu"><span></span></button>
        </div>
      </div>`;

    const sheet = document.createElement('div');
    sheet.className = 'k-sheet';
    sheet.id = 'k-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = `
      <div class="k-sheet__top">
        <p class="k-eyebrow">Only at the KIOSK · Issue ${esc((C.issue || {}).number || '01')}</p>
        <p class="k-sheet__clock" aria-hidden="true"><span data-clock>--:--:--</span> <small data-clock-zone></small></p>
      </div>
      <ul class="k-sheet__links">
        ${MENU.map((n, i) => `<li style="--i:${i}"><a href="${n.href}"${n.id === cur ? ' aria-current="page"' : ''}><i class="k-sheet__ico">${TAB_ICONS[n.icon] || ''}</i><b>${n.label}</b><small>${esc(n.note || '')}</small><span>${pad(i)}</span></a></li>`).join('')}
      </ul>
      <div class="k-sheet__foot" style="--i:${MENU.length}">
        <div class="k-sheet__quick">
          <button class="k-sheet__q" type="button" data-settings-open><i>${icon.gear}</i><span>Settings<small>Look &amp; feel</small></span></button>
          <button class="k-sheet__q k-sheet__theme" type="button" data-theme-toggle aria-label="Theme: auto"><i data-theme-ico>${themeIcon('auto')}</i><span>Theme<small data-theme-sub>Auto</small></span></button>
          <button class="k-sheet__q" type="button" data-onboard-open><i>${PLANE_ICON}</i><span>Check in<small data-checkin-sub>1 minute</small></span></button>
          <button class="k-sheet__q is-hidden" type="button" data-account-open hidden><i>${icon.user}</i><span>Account<small data-account-sub>Sign in</small></span></button>
          <button class="k-sheet__q is-hidden" type="button" data-cart-open hidden><i>${icon.bag}<span class="k-nav__cart-count" data-cart-count hidden>0</span></i><span>Cart<small>Your bag</small></span></button>
        </div>
        <div class="k-sheet__pills">
          <button class="k-btn k-btn--sm k-btn--solid" type="button" data-notify="dispatch" data-notify-title="The Dispatch">Join the Dispatch</button>
          <button class="k-btn k-btn--sm" type="button" data-notify="stockist" data-notify-title="Sell at the KIOSK">Sell at the KIOSK</button>
          <a class="k-btn k-btn--sm" href="https://www.instagram.com/onlyatthekiosk" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a class="k-btn k-btn--sm" href="about.html">About</a>
          <a class="k-btn k-btn--sm" href="contact.html">Contact</a>
        </div>
      </div>`;

    const guides = document.createElement('div');
    guides.className = 'k-guides';
    guides.setAttribute('aria-hidden', 'true');
    guides.innerHTML = '<span></span><span></span><span></span><span></span>';

    // Phones: a floating, icon-only tab bar within reach of a thumb. A soft
    // highlight glides to the current tab; More sits apart in its own circle.
    const tabbar = document.createElement('nav');
    tabbar.className = 'k-tabbar';
    tabbar.setAttribute('aria-label', 'Primary');
    const curTab = TABS.findIndex((t) => t.id === cur);
    tabbar.innerHTML = `<div class="k-tabbar__pill" style="--n:${TABS.length};--i:${Math.max(0, curTab)}"${curTab < 0 ? ' data-idle' : ''}>
        <span class="k-tabbar__glow" aria-hidden="true"></span>
        ${TABS.map((t) => `<a class="k-tabbar__item" href="${t.href}" data-tab="${t.id}" aria-label="${t.label}" title="${t.label}"${t.id === cur ? ' aria-current="page"' : ''}>${t.icon}</a>`).join('')}
      </div>
      <button class="k-tabbar__item k-tabbar__more" type="button" data-tab-more aria-label="More" aria-expanded="false" aria-controls="k-sheet">${TAB_ICONS.more}</button>`;

    document.body.prepend(guides);
    document.body.prepend(sheet);
    document.body.prepend(nav);
    document.body.append(tabbar);
    syncQuickSubs();
    document.addEventListener('kiosk:taste', syncQuickSubs);
    document.addEventListener('kiosk:account', syncQuickSubs);

    const btn = $('.k-nav__menu-btn', nav);
    const more = $('[data-tab-more]', tabbar);
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      more.setAttribute('aria-expanded', String(open));
      more.setAttribute('aria-label', open ? 'Close menu' : 'More');
      more.innerHTML = open ? TAB_ICONS.close : TAB_ICONS.more;
      document.documentElement.classList.toggle('is-sheet-open', open);
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    more.addEventListener('click', () => setOpen(more.getAttribute('aria-expanded') !== 'true'));
    tabbar.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      setOpen(false);
      // glide the highlight now; the page follows
      const pill = $('.k-tabbar__pill', tabbar);
      pill.style.setProperty('--i', String($$('.k-tabbar__item', pill).indexOf(a)));
      pill.removeAttribute('data-idle');
    });
    sheet.addEventListener('click', (e) => { if (e.target.closest('a, [data-notify], [data-settings-open], [data-account-open], [data-cart-open], [data-onboard-open]')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

    const footer = document.createElement('footer');
    footer.className = 'k-footer';
    footer.innerHTML = `
      <div class="k-wrap">
        <div class="k-footer__grid">
          <div>
            <p class="k-eyebrow">Only at the KIOSK</p>
            <p class="k-lede k-mt-s">A global travel magazine for the curious. Cars, motorcycles, sports, culture and fashion, plus pieces and rare finds you can only get at the kiosk.</p>
          </div>
          <div><h4>Watch + Listen</h4><ul><li><a href="atlas.html">The Atlas</a></li><li><a href="archive.html">The Journal</a></li><li><a href="gallery.html">Gallery</a></li><li><a href="films.html">Films</a></li><li><a href="atlas.html?type=photo">Photo stories</a></li><li><a href="atlas.html?type=article">Articles &amp; interviews</a></li><li><a href="radio.html">KIOSK Radio</a></li></ul></div>
          <div><h4>Shop</h4><ul><li><a href="vault.html?c=quotes">Words to wear</a></li><li><a href="vault.html?c=travel">Travel goods</a></li><li><a href="lost-and-found.html">Lost &amp; Found</a></li><li><a href="vault.html?c=apparel">Apparel</a></li><li><a href="vault.html?c=skate">Skate</a></li><li><a href="vault.html?c=accessories">Accessories</a></li><li><a href="vault.html?c=luts">LUT packs</a></li><li><a href="store.html">Partner stores</a></li><li><a href="partner.html">Partner Hub</a></li></ul></div>
          <div><h4>KIOSK</h4><ul><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li><li><a href="faq.html">FAQ</a></li><li><a href="shipping-returns.html">Shipping + Returns</a></li><li><a href="https://www.instagram.com/onlyatthekiosk" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
        </div>
        <div class="k-footer__mark" aria-hidden="true"><span class="k-rk">K</span>IOSK</div>
        <div class="k-footer__base">
          <span>© ${new Date().getFullYear()} Only at the KIOSK</span>
          <span><a href="terms-conditions.html">Terms</a> · <a href="privacy-cookies.html">Privacy</a> · <a href="do-not-sell.html">Do not sell my info</a></span>
        </div>
      </div>`;
    document.body.append(footer);
  }

  /* ------------------------------------------------------------ toast */

  /* A short note above the tab bar: glass pill, optional icon, tap to
   * dismiss. Longer messages stay up a little longer. */
  let toastTimer;
  const TOAST_OK = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function toast(msg, opts = {}) {
    let el = $('.k-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'k-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.addEventListener('click', () => { clearTimeout(toastTimer); el.classList.remove('is-visible'); });
      document.body.append(el);
    }
    const ico = opts.icon === false ? '' : (opts.icon || '');
    el.innerHTML = `${ico ? `<i class="k-toast__ico" aria-hidden="true">${ico}</i>` : ''}<span>${esc(msg)}</span>`;
    el.classList.toggle('has-ico', !!ico);
    el.classList.remove('is-visible');
    void el.offsetWidth;   // restart the entrance when one toast replaces another
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), Math.min(6000, 2400 + String(msg).length * 40));
  }
  toast.ok = TOAST_OK;

  /* Desktop tooltips for icon-only buttons: their aria-label (or title)
   * in a small glass tip, after a short hover or on keyboard focus. */
  function bindTips() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const tip = document.createElement('div');
    tip.className = 'k-hint';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'k-hint';
    document.body.append(tip);
    let timer = 0;
    let cur = null;
    const textOf = (el) => (el.dataset.tip || el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
    const iconOnly = (el) => el.dataset.tip || !el.textContent.trim();
    const target = (node) => {
      const el = node && node.closest && node.closest('button, a, [data-tip]');
      return el && iconOnly(el) && textOf(el) && !el.closest('.k-hint') ? el : null;
    };
    const show = (el) => {
      if (el.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); }
      tip.textContent = textOf(el);
      const r = el.getBoundingClientRect();
      tip.classList.add('is-visible');
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const below = r.top < h + 16;
      tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${below ? r.bottom + 8 : r.top - h - 8}px`;
      tip.dataset.side = below ? 'below' : 'above';
      el.setAttribute('aria-describedby', 'k-hint');
      cur = el;
    };
    const hide = () => {
      clearTimeout(timer);
      tip.classList.remove('is-visible');
      if (cur) cur.removeAttribute('aria-describedby');
      cur = null;
    };
    document.addEventListener('pointerover', (e) => {
      const el = target(e.target);
      if (el === cur) return;
      hide();
      if (el) timer = setTimeout(() => show(el), 380);
    });
    document.addEventListener('focusin', (e) => { const el = target(e.target); hide(); if (el && el.matches(':focus-visible')) show(el); });
    ['pointerdown', 'scroll', 'keydown', 'focusout'].forEach((t) => document.addEventListener(t, (e) => { if (t !== 'keydown' || e.key === 'Escape') hide(); }, true));
  }

  /* The menu's quick tiles say where things stand. */
  function syncQuickSubs() {
    const t = store.get('kiosk:taste', null);
    $$('[data-checkin-sub]').forEach((el) => { el.textContent = t && t.completedAt ? 'Done · edit' : '1 minute'; });
    const st = window.KIOSK_ACCOUNT && window.KIOSK_ACCOUNT.getState ? window.KIOSK_ACCOUNT.getState() : null;
    const u = st && st.user;
    $$('[data-account-sub]').forEach((el) => { el.textContent = u ? (u.firstName || 'Signed in') : 'Sign in'; });
  }

  /* --------------------------------------------------------- lightbox */

  let lastFocus = null;
  function lightbox() {
    let el = $('.k-lightbox');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'k-lightbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="k-lightbox__inner"></div>';
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-close]')) closeLightbox();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.classList.contains('is-open')) closeLightbox(); });
    document.body.append(el);
    return el;
  }

  function openLightbox(html, label) {
    const el = lightbox();
    lastFocus = document.activeElement;
    $('.k-lightbox__inner', el).innerHTML = html;
    el.setAttribute('aria-label', label || 'Dialog');
    el.setAttribute('aria-hidden', 'false');
    // Opened from a product page: sit in front of it, not behind
    el.classList.toggle('is-over', !!$('.k-pdp.is-open'));
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const focusable = $('[data-autofocus]', el) || $('[data-close]', el);
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function closeLightbox() {
    const el = $('.k-lightbox');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Stop any playback by clearing content after fade
    setTimeout(() => { if (!el.classList.contains('is-open')) $('.k-lightbox__inner', el).innerHTML = ''; }, 400);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openFilm(f) {
    player.pause();   // the film has its own soundtrack
    let screen;
    if (f.embed) {
      const src = f.embed + (f.embed.includes('?') ? '&' : '?') + 'autoplay=1';
      screen = `<iframe src="${esc(src)}" title="${esc(f.title || featureName(f))}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else if (f.video) {
      screen = `<video src="${esc(f.video)}" ${f.poster ? `poster="${esc(f.poster)}"` : ''} controls autoplay playsinline></video>`;
    } else {
      screen = `${featureMedia(f, { meta: '' })}
        <div class="k-lightbox__empty">
          <div>
            <p class="k-eyebrow">In post-production</p>
            <p>The film for <strong>${esc(featureName(f))}</strong> is being cut and scored. Join the Dispatch to get it first.</p>
            <button class="k-btn k-btn--solid" type="button" data-notify="${esc(f.filmProduct || f.slug)}" data-notify-title="${esc(f.title || featureName(f))}">Notify me</button>
          </div>
        </div>`;
    }
    openLightbox(`
      <div class="k-lightbox__head">
        <div><p class="k-eyebrow">${esc(formatLabel(f))} · ${esc(f.runtime || '—')}</p><p class="k-h3 k-mt-s">${esc(f.title || featureName(f))} <span class="k-serif" style="color:var(--ink-3)">— ${esc(featureName(f))}</span></p></div>
        <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
      </div>
      <div class="k-lightbox__screen"${f.aspect ? ` style="${screenFit(f.aspect)}"` : ''}>${screen}</div>`, `${featureName(f)} film`);
  }

  /** Film screen for a non-16:9 film ('4/3'): keep the ratio and fit the window height. */
  const screenFit = (aspect) => {
    const [w, h] = String(aspect).split('/').map(Number);
    return w && h ? `aspect-ratio:${w}/${h};width:min(100%, calc(78svh * ${w} / ${h}));margin:0 auto` : '';
  };

  /* ------------------------------------------------------------ vimeo */

  const vimeoById = (id) => (C.vimeo || []).find((v) => String(v.id) === String(id));
  const vimeoPage = (v) => `https://vimeo.com/${encodeURIComponent(v.id)}${v.hash ? `/${encodeURIComponent(v.hash)}` : ''}`;
  const vimeoSrc = (v) => `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?${v.hash ? `h=${encodeURIComponent(v.hash)}&` : ''}autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
  const vimeoMeta = new Map();

  /** Title, thumbnail and length from Vimeo's oEmbed endpoint (CORS-enabled, no key). */
  function vimeoInfo(v) {
    if (!vimeoMeta.has(v.id)) {
      vimeoMeta.set(v.id, fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoPage(v))}&width=1280`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})));
    }
    return vimeoMeta.get(v.id);
  }

  function vimeoCards() {
    return (C.vimeo || []).map((v, n) => `
      <button class="k-vimeo__card k-dark" type="button" data-vimeo="${esc(v.id)}" data-reveal data-reveal-delay="${n % 3}">
        <span class="k-vimeo__thumb"><span class="plate plate--graphite"></span></span>
        <span class="k-vimeo__play" aria-hidden="true">${icon.play}</span>
        <span class="k-vimeo__meta">
          <span class="k-eyebrow">Film · <span data-vimeo-time>Vimeo</span></span>
          <b data-vimeo-title>${esc(v.title || 'Loading…')}</b>
        </span>
      </button>`).join('');
  }

  function hydrateVimeo(root) {
    $$('[data-vimeo]', root).forEach((card) => {
      const v = vimeoById(card.dataset.vimeo);
      if (!v) return;
      vimeoInfo(v).then((d) => {
        const title = v.title || d.title || 'Film';
        $('[data-vimeo-title]', card).textContent = title;
        card.setAttribute('aria-label', `Play ${title}`);
        if (d.duration) $('[data-vimeo-time]', card).textContent = `${Math.floor(d.duration / 60)}:${pad(d.duration % 60)}`;
        if (d.thumbnail_url) $('.k-vimeo__thumb', card).innerHTML = `<img src="${esc(d.thumbnail_url)}" alt="" loading="lazy" decoding="async">`;
      });
    });
  }

  /** Swap placeholder plates for Vimeo thumbnails (stories whose only media is a Vimeo film). */
  function hydrateCovers(root = document) {
    $$('[data-vimeo-cover]', root).forEach((plate) => {
      const f = features.find((x) => x.vimeo && String(x.vimeo.id) === plate.dataset.vimeoCover);
      if (!f) return;
      vimeoInfo(f.vimeo).then((d) => {
        if (!d.thumbnail_url || !plate.isConnected) return;
        const img = document.createElement('img');
        img.src = d.thumbnail_url;
        img.alt = plate.getAttribute('aria-label') || '';
        img.decoding = 'async';
        plate.replaceWith(img);
      });
    });
  }

  function openVimeo(v) {
    player.pause();   // the film has its own soundtrack
    const story = v.story && featureBySlug(v.story);
    openLightbox(`
      <div class="k-lightbox__head">
        <div><p class="k-eyebrow">Film · Vimeo</p><p class="k-h3 k-mt-s" data-vimeo-title>${esc(v.title || 'Film')}</p></div>
        <div class="k-row-flex">
          ${story ? `<a class="k-btn k-btn--sm" href="${storyHref(story)}">Read the story</a>` : ''}
          <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
        </div>
      </div>
      <div class="k-lightbox__screen"${v.aspect ? ` style="${screenFit(v.aspect)}"` : ''}><iframe src="${esc(vimeoSrc(v))}" title="${esc(v.title || 'Film')}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`, 'Film');
    vimeoInfo(v).then((d) => { const t = $('.k-lightbox.is-open [data-vimeo-title]'); if (t && !v.title && d.title) t.textContent = d.title; });
  }

  function fillVimeo(name) {
    const el = mount(name);
    if (!el) return;
    if (!(C.vimeo || []).length) { const sec = el.closest('[data-vimeo-section]'); if (sec) sec.hidden = true; return; }
    el.innerHTML = vimeoCards();
    hydrateVimeo(el);
  }

  /** Play a raw clip straight from Google Drive (needs the file shared "Anyone with the link"). */
  function openDriveClip(id, title) {
    player.pause();
    openLightbox(`
      <div class="k-lightbox__head">
        <div><p class="k-eyebrow">Raw footage</p><p class="k-h3 k-mt-s">${esc(title)}</p></div>
        <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
      </div>
      <div class="k-lightbox__screen"><iframe src="https://drive.google.com/file/d/${encodeURIComponent(id)}/preview" title="${esc(title)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
      <p class="k-small k-mt-s"><a href="https://drive.google.com/file/d/${encodeURIComponent(id)}/view" target="_blank" rel="noopener" style="text-decoration:underline;text-underline-offset:3px">Open in Google Drive</a></p>`, 'Raw footage clip');
  }

  function openNotify(id, title) {
    openLightbox(`
      <div class="k-glass k-glass--strong" style="max-width:560px;margin:0 auto;padding:clamp(20px,4vw,32px);border-radius:var(--r-xl)">
        <div class="k-lightbox__head">
          <p class="k-eyebrow">Notify me</p>
          <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
        </div>
        ${id === 'dispatch'
          ? `<p class="k-h3">Join <span class="k-serif">the Dispatch.</span></p><p class="k-body k-mt-s">New films, new playlists, Supply drops and Lost &amp; Found coordinates — one email per release.</p>`
          : id === 'stockist'
          ? `<p class="k-h3">Sell at <span class="k-serif">the KIOSK.</span></p><p class="k-body k-mt-s">Independent stores, thrift curators and makers: stock your pieces here. You sell through your own Shopify and keep your store; the kiosk takes a small share of each sale. Leave your email and we’ll send the stockist pack.</p>`
          : id === 'partner'
          ? `<p class="k-h3">Partner with <span class="k-serif">the KIOSK.</span></p><p class="k-body k-mt-s">Stores, brands and sponsors: get a page on the kiosk, list your pieces or back a film. Leave your email and the desk will set up your Partner Hub account.</p>`
          : `<p class="k-h3"><span class="k-serif">${esc(title || 'This drop')}</span> isn’t out yet.</p><p class="k-body k-mt-s">Leave your email and we’ll tell you the moment it drops. No spam, one email per release.</p>`}
        <form class="k-input k-mt-m" data-dispatch novalidate data-interest="${esc(id || '')}" data-title="${esc(title || '')}">
          <label class="k-sr" for="k-notify-email">Email</label>
          <input id="k-notify-email" type="email" name="email" placeholder="you@example.com" autocomplete="email" required data-autofocus>
          <div class="k-input__row"><span class="k-small" style="color:rgba(13,13,14,.5)">Dispatch · KIOSK</span><button class="k-input__send" type="submit" aria-label="Join">${icon.send}</button></div>
        </form>
        <p class="k-form-msg k-mt-s" aria-live="polite"></p>
      </div>`, 'Notify me');
  }

  /* ------------------------------------------------------------ radio
   * One player for the whole site, docked at the bottom of every page.
   *
   * - A mix with `audio` (a self-hosted MP3) plays through <audio> and the
   *   waveform is the real signal, read from a Web Audio analyser.
   * - A mix with `spotify` plays through Spotify's IFrame API. Spotify never
   *   exposes its audio to the page, so that waveform is synthesised: a
   *   140 BPM phonk pattern (808, cowbell, hats) that starts, stops and seeks
   *   with Spotify's own playback updates.
   *
   * Every <canvas data-wave> on the page is drawn from the same signal.
   * data-wave="<slug>" only moves while that mix is the one playing.
   * Internal links load in place (see softNavigate)
   * so the music keeps going from page to page.
   * -------------------------------------------------------------------- */

  // Reduced motion: the visitor's system setting, or Settings › Motion
  const REDUCED = prefs.motion === 'reduced' || (prefs.motion !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const wave = {
    bins: new Float32Array(64),
    level: 0,
    raf: 0,
    analyser: null,
    freq: null,
    silentFrames: 0,
    clock: { position: 0, at: 0 },     // Spotify position (ms) at performance.now()

    /** Synthesised spectrum for Spotify: kick + 808 lows, cowbell mids, hat highs. */
    synth(now) {
      const pos = player.playing ? this.clock.position + (now - this.clock.at) : this.clock.position;
      const beat = 60000 / 140;
      const ph = (pos % beat) / beat;
      const off = ((pos + beat / 2) % beat) / beat;
      const sixteenth = ((pos % (beat / 4)) / (beat / 4));
      const bar = Math.floor(pos / (beat * 4));
      const kick = Math.exp(-ph * 6);
      const sub = Math.exp(-ph * 1.8) * 0.85;
      const cow = (Math.floor(pos / beat) % 2 ? 1 : 0.55) * Math.exp(-off * 10);
      const hat = Math.exp(-sixteenth * 14) * (0.5 + 0.5 * ((Math.floor(pos / (beat / 4)) + bar) % 3 ? 0.6 : 1));
      const n = this.bins.length;
      for (let i = 0; i < n; i += 1) {
        const x = i / (n - 1);
        const low = Math.max(0, 1 - x * 3.2) * (0.55 * kick + 0.45 * sub);
        const mid = Math.exp(-((x - 0.42) ** 2) / 0.012) * cow * 0.9;
        const high = Math.max(0, x - 0.55) * 1.8 * hat;
        const shimmer = 0.12 + 0.1 * Math.sin(now / 170 + i * 1.7) * Math.sin(now / 410 + i * 0.6);
        this.bins[i] = Math.min(1, 1.35 * (low + mid + high + shimmer * (1 - x * 0.5)) * (0.9 + 0.1 * Math.sin(i * 12.9898 + pos / 90)));
      }
    },

    /** Real spectrum from the analyser, log-spaced into bins. */
    sample() {
      if (!this.analyser) return false;
      this.analyser.getByteFrequencyData(this.freq);
      const n = this.bins.length;
      const len = this.freq.length;
      let total = 0;
      for (let i = 0; i < n; i += 1) {
        const a = Math.floor(2 * (len / 2) ** (i / n));
        const b = Math.max(a + 1, Math.floor(2 * (len / 2) ** ((i + 1) / n)));
        let sum = 0;
        for (let k = a; k < b && k < len; k += 1) sum += this.freq[k];
        const v = sum / (b - a) / 255;
        this.bins[i] = v;
        total += v;
      }
      // Cross-origin audio without CORS reads as silence: fall back to the synth
      this.silentFrames = total === 0 ? this.silentFrames + 1 : 0;
      return this.silentFrames < 90;
    },

    start() {
      if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
    },

    frame(now) {
      this.raf = 0;
      const target = player.playing && !player.buffering ? 1 : 0;
      this.level += (target - this.level) * (target ? 0.08 : 0.06);
      if (!(player.source === 'audio' && this.sample())) this.synth(now);
      this.draw();
      if (player.playing || this.level > 0.004) this.start();
      else { this.level = 0; this.draw(); }
    },

    draw() {
      $$('canvas[data-wave]').forEach((c) => {
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
        }
        const ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const mine = !c.dataset.wave || c.dataset.wave === (player.mix && player.mix.slug);
        const level = mine ? (REDUCED ? this.level * 0.35 : this.level) : 0;
        const gap = Number(c.dataset.waveGap || 3);
        const barW = Number(c.dataset.waveBar || 2);
        const count = Math.max(4, Math.floor((w + gap) / (barW + gap)));
        const mid = h / 2;
        ctx.fillStyle = getComputedStyle(c).color;
        for (let i = 0; i < count; i += 1) {
          // Mirror the spectrum so lows sit in the middle, like a stereo meter
          const t = Math.abs(i / (count - 1) - 0.5) * 2;
          const v = this.bins[Math.min(this.bins.length - 1, Math.floor(t * (this.bins.length - 1)))];
          const amp = Math.max(1, v * level * (h - 2));
          ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, v * level * 1.4 + 0.1);
          const x = i * (barW + gap);
          const r = Math.min(barW / 2, amp / 2);
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, mid - amp / 2, barW, amp, r); else ctx.rect(x, mid - amp / 2, barW, amp);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    },

    connect(audio) {
      if (this.analyser) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const ctx = new AC();
        const src = ctx.createMediaElementSource(audio);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.78;
        this.freq = new Uint8Array(this.analyser.frequencyBinCount);
        src.connect(this.analyser);
        this.analyser.connect(ctx.destination);
        this.ctx = ctx;
      } catch (err) { this.analyser = null; }
    },
  };

  const spotify = {
    api: null,
    ctrl: null,
    uri: '',
    wantPlay: false,
    loading: null,
    load() {
      if (this.loading) return this.loading;
      this.loading = new Promise((resolve) => {
        window.onSpotifyIframeApiReady = (api) => { this.api = api; resolve(api); };
        const s = document.createElement('script');
        s.src = 'https://open.spotify.com/embed/iframe-api/v1';
        s.async = true;
        s.onerror = () => resolve(null);
        document.head.append(s);
      });
      return this.loading;
    },
    /** Plays the playlist, or one song from it when `track` (a spotify:track: URI) is given. */
    async open(mix, slot, track) {
      const api = await this.load();
      if (!api) return false;
      const uri = track || `spotify:playlist:${mix.spotify}`;
      this.wantPlay = true;
      if (this.ctrl) {
        if (this.uri !== uri) { this.uri = uri; this.ctrl.loadUri(uri); } else this.ctrl.resume();
        setTimeout(() => { if (this.wantPlay) this.ctrl.play(); }, 600);
        return true;
      }
      this.uri = uri;
      await new Promise((resolve) => {
        api.createController(slot, { uri, width: '100%', height: 352 }, (ctrl) => {
          this.ctrl = ctrl;
          ctrl.addListener('ready', () => { if (this.wantPlay) ctrl.play(); resolve(); });
          ctrl.addListener('playback_update', (e) => player.onSpotify(e.data || {}));
          setTimeout(resolve, 4000);
        });
      });
      return true;
    },
  };

  /* ------------------------------------------------------ Spotify connect
   * One OAuth connect per Voyager (Worker: /api/spotify/*), then a single
   * persistent Web Playback SDK device — "KIOSK Radio" — plays whole
   * playlists in-page. No per-song sign-in. Premium only (Spotify's rule);
   * everyone else keeps the embed above. Access tokens are fetched fresh
   * from /api/spotify/token (refresh stays server-side).
   * -------------------------------------------------------------------- */
  const spotifySdk = {
    status: null,          // { configured, voyager, connected, premium }
    statusLoading: null,
    sdk: null,
    deviceId: '',
    deviceReady: null,
    active: false,         // the SDK device is the thing making sound

    async loadStatus(force) {
      if (this.status && !force) return this.status;
      if (this.statusLoading) return this.statusLoading;
      this.statusLoading = fetch('/api/spotify/status')
        .then((r) => (r.ok ? r.json() : { configured: false }))
        .catch(() => ({ configured: false }))
        .then((d) => { this.status = d; this.statusLoading = null; return d; });
      return this.statusLoading;
    },

    loadSdk() {
      if (this.sdk) return this.sdk;
      this.sdk = new Promise((resolve) => {
        if (window.Spotify && window.Spotify.Player) { resolve(true); return; }
        const prev = window.onSpotifyWebPlaybackSDKReady;
        window.onSpotifyWebPlaybackSDKReady = () => { if (prev) prev(); resolve(true); };
        const s = document.createElement('script');
        s.src = 'https://sdk.scdn.co/spotify-player.js';
        s.async = true;
        s.onerror = () => resolve(false);
        document.head.append(s);
        setTimeout(() => resolve(!!(window.Spotify && window.Spotify.Player)), 8000);
      });
      return this.sdk;
    },

    async token() {
      const r = await fetch('/api/spotify/token');
      if (!r.ok) throw new Error('spotify-token');
      const d = await r.json();
      return d.accessToken;
    },

    /** Create (once) and connect the KIOSK Radio device. */
    async ensureDevice() {
      if (this.deviceReady) return this.deviceReady;
      this.deviceReady = (async () => {
        if (!await this.loadSdk()) return false;
        const P = new window.Spotify.Player({
          name: 'KIOSK Radio',
          volume: 0.85,
          getOAuthToken: (cb) => { this.token().then(cb).catch(() => {}); },
        });
        this.player = P;
        P.addListener('ready', ({ device_id }) => { this.deviceId = device_id; });
        P.addListener('not_ready', () => { this.deviceId = ''; });
        P.addListener('player_state_changed', (st) => player.onSpotifySdk(st));
        P.addListener('account_error', () => { this.active = false; });
        P.addListener('authentication_error', () => { this.status = null; this.active = false; });
        const ok = await P.connect();
        for (let i = 0; i < 40 && !this.deviceId; i += 1) await new Promise((r) => setTimeout(r, 150));
        return !!(ok && this.deviceId);
      })().catch(() => false);
      return this.deviceReady;
    },

    async api(path, opts = {}) {
      const token = await this.token();
      const r = await fetch(`https://api.spotify.com/v1${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!r.ok && r.status !== 204) throw new Error(`spotify-api-${r.status}`);
      return r.status === 204 ? null : r.json().catch(() => null);
    },

    /**
     * Play a mix on the SDK device. With a track pick, queue the wheel from
     * that song onward so Spotify itself advances — like a radio.
     * Returns false when the embed fallback should run instead.
     */
    async play(mix, trackUri, queueUris) {
      const st = await this.loadStatus();
      if (!st.connected || !st.premium) return false;
      if (!await this.ensureDevice()) return false;
      try {
        const body = trackUri
          ? { uris: (queueUris && queueUris.length ? queueUris : [trackUri]) }
          : { context_uri: `spotify:playlist:${mix.spotify}` };
        await this.api(`/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`, { method: 'PUT', body: JSON.stringify(body) });
        this.active = true;
        return true;
      } catch { return false; }
    },
  };

  /* SoundCloud: the Widget API plays a track, playlist or likes page in an
   * iframe and reports play / pause / progress, which drive the waveform. */
  const soundcloud = {
    widget: null,
    iframe: null,
    url: '',
    loading: null,
    load() {
      if (this.loading) return this.loading;
      this.loading = new Promise((resolve) => {
        if (window.SC && window.SC.Widget) { resolve(window.SC); return; }
        const s = document.createElement('script');
        s.src = 'https://w.soundcloud.com/player/api.js';
        s.async = true;
        s.onload = () => resolve(window.SC || null);
        s.onerror = () => resolve(null);
        document.head.append(s);
      });
      return this.loading;
    },
    /** Plays the link from the top, or from song `index` of a playlist / likes page. */
    async open(mix, slot, index) {
      const SC = await this.load();
      if (!SC || !SC.Widget) return false;
      const start = (w) => (index != null ? w.skip(index) : w.play());
      if (this.iframe && this.url === mix.soundcloud) { start(this.widget); return true; }
      if (this.iframe) this.iframe.remove();
      this.url = mix.soundcloud;
      const f = document.createElement('iframe');
      f.title = `${mix.title} on SoundCloud`;
      f.allow = 'autoplay';
      f.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(mix.soundcloud)}&auto_play=true&visual=false&show_comments=false&show_reposts=false&show_teaser=false&hide_related=true&color=%23e8e5de`;
      slot.append(f);
      this.iframe = f;
      const w = SC.Widget(f);
      this.widget = w;
      const E = SC.Widget.Events;
      w.bind(E.PLAY, () => {
        player.onSoundcloud({ playing: true });
        w.getCurrentSound((sound) => { if (sound && sound.title) player.nowPlaying(sound.title, sound.user && sound.user.username); });
        w.getCurrentSoundIndex((i) => player.onSoundcloudIndex(i));
      });
      w.bind(E.PAUSE, () => player.onSoundcloud({ playing: false }));
      w.bind(E.FINISH, () => player.onSoundcloud({ playing: false }));
      w.bind(E.PLAY_PROGRESS, (e) => player.onSoundcloud({ playing: true, position: e.currentPosition, relative: e.relativePosition }));
      return new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), 10000);
        w.bind(E.READY, () => { clearTimeout(t); start(w); resolve(true); });
      });
    },
    /** The songs behind a link, read from a silent widget that's removed once it answers. */
    async list(url) {
      const SC = await this.load();
      if (!SC || !SC.Widget) return [];
      return new Promise((resolve) => {
        const f = document.createElement('iframe');
        f.title = 'SoundCloud tracklist';
        f.setAttribute('aria-hidden', 'true');
        f.tabIndex = -1;
        f.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;opacity:0;pointer-events:none';
        f.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=false`;
        document.body.append(f);
        const w = SC.Widget(f);
        let t;
        const done = (sounds) => { clearTimeout(t); f.remove(); resolve(Array.isArray(sounds) ? sounds : []); };
        t = setTimeout(() => done([]), 12000);
        w.bind(SC.Widget.Events.READY, () => w.getSounds(done));
      });
    },
  };

  /* Songs in each mix, for the song wheel on the radio page.
   * A mix's own `tracks` list wins; otherwise Spotify playlists are read by
   * /api/radio/tracks and SoundCloud links by a silent widget.
   * Each song: { title, artist, cover, uri (Spotify), source (SoundCloud index), audio } */
  const radioTracks = {
    list: {},          // slug → songs, once loaded
    loading: {},       // slug → Promise<songs>
    get(mix) {
      if (!mix) return Promise.resolve([]);
      if (this.list[mix.slug]) return Promise.resolve(this.list[mix.slug]);
      if (!this.loading[mix.slug]) {
        this.loading[mix.slug] = this.fetch(mix).catch(() => []).then((songs) => {
          if (songs.length) this.list[mix.slug] = songs;
          else delete this.loading[mix.slug];   // try again next time
          return songs;
        });
      }
      return this.loading[mix.slug];
    },
    async fetch(mix) {
      const own = (mix.tracks || []).filter(Boolean);
      if (own.length) {
        return own.map((t) => (typeof t === 'string' ? { title: t } : {
          title: t.title || '', artist: t.artist || '', cover: t.cover || '', audio: t.audio || '',
          uri: t.spotify ? (String(t.spotify).startsWith('spotify:') ? t.spotify : `spotify:track:${t.spotify}`) : '',
        })).map((t) => ({ ...t, cover: t.cover || (t.uri ? coverFor(t.uri) : '') }));
      }
      if (mix.spotify) {
        const res = await fetch(`/api/radio/tracks?spotify=${encodeURIComponent(mix.spotify)}`);
        if (!res.ok) return [];
        const d = await res.json();
        return (d.tracks || []).map((t) => ({ title: t.title, artist: t.artist, uri: t.uri, explicit: t.explicit, cover: t.cover || coverFor(t.uri) }));
      }
      if (mix.soundcloud) {
        const sounds = await soundcloud.list(mix.soundcloud);
        return sounds.map((x, i) => ({ x, i })).filter(({ x }) => x && x.title).map(({ x, i }) => ({
          title: x.title,
          artist: (x.user && x.user.username) || '',
          cover: String(x.artwork_url || (x.user && x.user.avatar_url) || '').replace('-large.', '-t500x500.'),
          source: i,
        }));
      }
      return [];
    },
  };
  const coverFor = (uri) => `/api/radio/cover?uri=${encodeURIComponent(uri)}`;
  const radioWheels = new Set();

  const player = {
    el: null,
    mix: null,
    source: '',          // 'audio' | 'spotify' | 'soundcloud' | 'apple'
    track: null,         // { slug, index } when one song was picked on the song wheel
    playing: false,
    buffering: false,
    audio: null,

    active() { return !!(this.el && this.el.classList.contains('is-visible')); },

    ensure() {
      if (this.el) return;
      this.el = document.createElement('section');
      this.el.className = 'k-dock k-dark';
      this.el.setAttribute('aria-label', 'KIOSK Radio player');
      this.el.innerHTML = `
        <div class="k-dock__panel" id="k-dock-panel" aria-hidden="true">
          <div class="k-dock__embed" data-embed="spotify"><div data-spotify-slot></div></div>
          <div class="k-dock__embed" data-embed="soundcloud" hidden></div>
          <div class="k-dock__embed" data-embed="apple" hidden></div>
          <p class="k-dock__note k-small" data-embed="apple" hidden>Press play in the Apple Music player. Sign in to Apple Music in this browser for full tracks; otherwise it plays previews. It keeps playing while you browse.</p>
          <p class="k-dock__note k-small" data-embed="spotify">Previews here. Voyagers with Spotify Premium: connect Spotify once on the Radio page and the whole playlist plays in full, right here.</p>
        </div>
        <div class="k-dock__bar">
          <button class="k-dock__btn" type="button" data-dock-toggle aria-label="Play">${icon.play}</button>
          <div class="k-dock__info">
            <span class="k-dock__eyebrow"><span class="k-live" aria-hidden="true"></span>KIOSK Radio</span>
            <b class="k-dock__title"></b>
          </div>
          <canvas class="k-dock__wave" data-wave aria-hidden="true"></canvas>
          <span class="k-dock__time" aria-live="off"></span>
          <button class="k-dock__icon" type="button" data-dock-expand aria-expanded="false" aria-controls="k-dock-panel" aria-label="Show tracklist">${icon.arrow}</button>
          <button class="k-dock__icon" type="button" data-dock-close aria-label="Close player">${icon.close}</button>
          <div class="k-dock__progress" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><i></i></div>
        </div>`;
      document.body.append(this.el);
      $('[data-dock-toggle]', this.el).addEventListener('click', () => this.toggle());
      $('[data-dock-expand]', this.el).addEventListener('click', () => this.expand(!this.el.classList.contains('is-expanded')));
      $('[data-dock-close]', this.el).addEventListener('click', () => this.close());
      const bar = $('.k-dock__progress', this.el);
      bar.addEventListener('click', (e) => {
        const r = bar.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        if (spotifySdk.active && spotifySdk.player && this.sdkDuration) { spotifySdk.player.seek(Math.round(frac * this.sdkDuration)).catch(() => {}); return; }
        if (!this.audio || !this.audio.duration) return;
        this.audio.currentTime = frac * this.audio.duration;
      });
      bar.addEventListener('keydown', (e) => {
        if (spotifySdk.active && spotifySdk.player && this.sdkDuration) {
          if (e.key === 'ArrowRight') spotifySdk.player.seek(Math.min(this.sdkDuration, (this.sdkPosition || 0) + 10_000)).catch(() => {});
          if (e.key === 'ArrowLeft') spotifySdk.player.seek(Math.max(0, (this.sdkPosition || 0) - 10_000)).catch(() => {});
          return;
        }
        if (!this.audio || !this.audio.duration) return;
        if (e.key === 'ArrowRight') this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
        if (e.key === 'ArrowLeft') this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
      });
    },

    show(mix) {
      this.ensure();
      this.mix = mix;
      $('.k-dock__title', this.el).textContent = `${mix.title}${mix.volume ? ` · ${mix.volume}` : ''}`;
      this.el.classList.add('is-visible');
      document.body.classList.add('is-radio-on');
    },

    expand(open) {
      if (!this.el) return;
      this.el.classList.toggle('is-expanded', open);
      $('#k-dock-panel', this.el).setAttribute('aria-hidden', String(!open));
      $('[data-dock-expand]', this.el).setAttribute('aria-expanded', String(open));
    },

    /**
     * Play a mix, or one song of it: `opts.index` is the song's place in
     * radioTracks.list[slug] (the song wheel). A song that ends hands over to
     * the next one, so the wheel keeps playing like a radio.
     */
    async play(slug, opts = {}) {
      const mix = mixBySlug(slug);
      if (!mix) return;
      const song = opts.index != null ? (radioTracks.list[slug] || [])[opts.index] : null;
      const same = song ? !!(this.track && this.track.slug === slug && this.track.index === opts.index) : true;
      if (this.mix === mix && this.active() && same) { this.toggle(); return; }
      const audioSrc = (song && song.audio) || mix.audio;
      if (!audioSrc && !mix.spotify && !mix.soundcloud && !mix.apple) { toast(`${mix.title} drops soon.`); return; }
      this.pauseAll();
      this.show(mix);
      // Songs can be picked one at a time from Spotify, SoundCloud and MP3s (Apple's embed has no API)
      const pickable = song && (song.audio || (mix.spotify && song.uri) || (mix.soundcloud && song.source != null));
      this.track = pickable ? { slug, index: opts.index } : null;
      if (this.track) this.nowPlaying(song.title, song.artist);
      if (audioSrc) {
        this.source = 'audio';
        if (!this.audio) this.bindAudio();
        // Remote audio needs CORS for the analyser to read it (R2/Bunny: allow this origin)
        if (new URL(audioSrc, location.href).origin !== location.origin) this.audio.crossOrigin = 'anonymous';
        else this.audio.removeAttribute('crossorigin');
        this.audio.src = audioSrc;
        wave.connect(this.audio);
        if (wave.ctx && wave.ctx.state === 'suspended') wave.ctx.resume();
        $('.k-dock__progress', this.el).hidden = false;
        this.el.classList.remove('has-embed');
        this.audio.play().catch(() => {});
      } else if (mix.soundcloud) {
        this.source = 'soundcloud';
        $('.k-dock__progress', this.el).hidden = true;
        this.showEmbed('soundcloud');
        this.buffering = true;
        this.sync();
        this.expand(true);
        const ok = await soundcloud.open(mix, $('[data-embed="soundcloud"].k-dock__embed', this.el), this.track ? song.source : null);
        if (!ok) {
          this.buffering = false;
          toast('SoundCloud couldn’t load. Opening it in a new tab.');
          window.open(mix.soundcloud, '_blank', 'noopener');
        }
      } else if (mix.apple) {
        // Apple Music's embed has no control API: it plays from its own button
        this.source = 'apple';
        $('.k-dock__progress', this.el).hidden = true;
        this.showEmbed('apple');
        const box = $('[data-embed="apple"].k-dock__embed', this.el);
        const src = appleEmbed(mix.apple);
        if (box.dataset.src !== src) {
          box.dataset.src = src;
          box.innerHTML = `<iframe src="${esc(src)}" title="${esc(mix.title)} on Apple Music" height="450" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" style="width:100%;overflow:hidden;border:0;border-radius:12px;background:transparent"></iframe>`;
        }
        this.playing = true;
        this.buffering = false;
        this.expand(true);
      } else {
        this.source = 'spotify';
        $('.k-dock__progress', this.el).hidden = true;
        this.buffering = true;
        this.sync();
        // Connected Voyager + Premium: the persistent SDK device plays the
        // whole playlist (or the wheel queue) with no per-song sign-in.
        const queue = this.track ? (radioTracks.list[slug] || []).slice(opts.index).map((s) => s.uri).filter(Boolean) : null;
        if (await spotifySdk.play(mix, this.track ? song.uri : null, queue)) {
          $$('[data-embed]', this.el).forEach((n) => { n.hidden = true; });
          this.el.classList.remove('has-embed');
          this.expand(false);
          this.buffering = false;
          this.sync();
          this.syncMediaSession();
          return;
        }
        this.showEmbed('spotify');
        this.el.classList.add('has-embed');
        const slot = $('[data-spotify-slot]', this.el) || $('.k-dock__embed iframe', this.el);
        // Open the tracklist so the Spotify play button is right there if the
        // browser blocks autoplay; it folds away once music starts.
        this.expand(true);
        const ok = await spotify.open(mix, slot, this.track ? song.uri : null);
        if (!ok) {
          this.buffering = false;
          toast('Spotify couldn’t load. Opening it in a new tab.');
          window.open(spotifyUrl(mix), '_blank', 'noopener');
        }
      }
      this.sync();
    },

    /** Show the Spotify or SoundCloud player in the fold-out panel. */
    showEmbed(which) {
      this.el.classList.add('has-embed');
      $$('[data-embed]', this.el).forEach((n) => { n.hidden = n.dataset.embed !== which; });
    },

    /** Track title from the source, shown in the dock next to the playlist name. */
    nowPlaying(title, artist) {
      if (!this.el || !this.mix) return;
      $('.k-dock__title', this.el).textContent = `${title}${artist ? ` — ${artist}` : ''} · ${this.mix.title}`;
    },

    /** Next song on the wheel (wraps round to the first). */
    next() {
      if (spotifySdk.active && spotifySdk.player) { spotifySdk.player.nextTrack().catch(() => {}); return; }
      const t = this.track;
      const list = t && radioTracks.list[t.slug];
      if (!list || !list.length) return;
      this.play(t.slug, { index: (t.index + 1) % list.length });
    },

    /** SoundCloud moved on to song `i` of its playlist: keep the wheel in step. */
    onSoundcloudIndex(i) {
      if (this.source !== 'soundcloud' || !this.mix) return;
      const list = radioTracks.list[this.mix.slug] || [];
      const k = list.findIndex((s) => s.source === i);
      if (k < 0) return;
      this.track = { slug: this.mix.slug, index: k };
      this.sync();
    },

    onSoundcloud(d) {
      if (this.source !== 'soundcloud') return;
      const was = this.playing;
      this.playing = !!d.playing;
      this.buffering = false;
      if (d.position != null) wave.clock = { position: d.position, at: performance.now() };
      if (this.playing && !was && this.el.classList.contains('is-expanded')) setTimeout(() => this.expand(false), 1200);
      if (d.position != null) $('.k-dock__time', this.el).textContent = `${Math.floor(d.position / 60000)}:${pad(Math.floor((d.position / 1000) % 60))}`;
      this.sync();
    },

    bindAudio() {
      this.audio = new Audio();
      this.audio.preload = 'none';
      const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : '0:00');
      this.audio.addEventListener('timeupdate', () => {
        const pct = this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0;
        $('.k-dock__progress i', this.el).style.width = `${pct}%`;
        $('.k-dock__progress', this.el).setAttribute('aria-valuenow', String(Math.round(pct)));
        $('.k-dock__time', this.el).textContent = fmt(this.audio.currentTime);
      });
      this.audio.addEventListener('play', () => { this.playing = true; this.buffering = false; this.sync(); });
      this.audio.addEventListener('pause', () => { this.playing = false; this.sync(); });
      this.audio.addEventListener('ended', () => { if (this.track) this.next(); });
      this.audio.addEventListener('waiting', () => { this.buffering = true; this.sync(); });
      this.audio.addEventListener('playing', () => { this.buffering = false; this.sync(); });
      this.audio.addEventListener('error', () => { toast('This mix couldn’t be loaded.'); this.playing = false; this.sync(); });
    },

    onSpotify(d) {
      if (this.source !== 'spotify') return;
      const was = this.playing;
      this.playing = d.isPaused === false;
      this.buffering = !!d.isBuffering;
      // A song picked on the wheel stops at its end (or jumps back to 0:00): play the next one
      const pos = d.position || 0;
      const ended = d.duration && (pos >= d.duration - 1500 || (pos === 0 && this.lastPos >= d.duration - 3000));
      this.lastPos = pos;
      if (this.track && was && !this.playing && ended && Date.now() - (this.advanced || 0) > 3000) {
        this.advanced = Date.now();
        this.lastPos = 0;
        this.next();
        return;
      }
      wave.clock = { position: d.position || 0, at: performance.now() };
      if (this.playing) spotify.wantPlay = false;
      if (this.playing && !was && this.el.classList.contains('is-expanded') && !this.userExpanded) {
        setTimeout(() => this.expand(false), 1200);
      }
      const fmt = (ms) => `${Math.floor(ms / 60000)}:${pad(Math.floor((ms / 1000) % 60))}`;
      $('.k-dock__time', this.el).textContent = d.duration ? `${fmt(d.position || 0)} / ${fmt(d.duration)}` : '';
      this.sync();
    },

    /** Web Playback SDK state: keep dock, wheel, waveform and cabin in step. */
    onSpotifySdk(state) {
      if (this.source !== 'spotify' || !spotifySdk.active) return;
      if (!state) { this.playing = false; this.sync(); return; }
      const was = this.playing;
      this.playing = !state.paused;
      this.buffering = false;
      this.sdkPosition = state.position || 0;
      this.sdkDuration = state.duration || 0;
      if (this.el && this.sdkDuration) {
        const bar = $('.k-dock__progress', this.el);
        if (bar) { bar.hidden = false; $('i', bar).style.width = `${(this.sdkPosition / this.sdkDuration) * 100}%`; bar.setAttribute('aria-valuenow', String(Math.round((this.sdkPosition / this.sdkDuration) * 100))); }
      }
      wave.clock = { position: state.position || 0, at: performance.now() };
      const track = state.track_window && state.track_window.current_track;
      if (track) {
        this.nowPlaying(track.name || '', (track.artists || []).map((a) => a.name).join(', '));
        const list = this.mix ? (radioTracks.list[this.mix.slug] || []) : [];
        const idx = list.findIndex((s) => s.uri === track.uri);
        if (idx >= 0 && this.mix) this.track = { slug: this.mix.slug, index: idx };
        if ('mediaSession' in navigator) {
          const art = ((track.album && track.album.images) || []).map((i) => ({ src: i.url, sizes: `${i.width}x${i.height}` }));
          try { navigator.mediaSession.metadata = new MediaMetadata({ title: track.name || '', artist: (track.artists || []).map((a) => a.name).join(', '), album: (track.album && track.album.name) || '', artwork: art }); } catch { /* artwork sizes optional */ }
        }
      }
      const fmt = (ms) => `${Math.floor(ms / 60000)}:${pad(Math.floor((ms / 1000) % 60))}`;
      if (this.el) $('.k-dock__time', this.el).textContent = state.duration ? `${fmt(state.position || 0)} / ${fmt(state.duration)}` : '';
      if (this.playing !== was) this.syncMediaSession();
      this.sync();
    },

    /** Lock-screen / headphone controls follow the dock. */
    syncMediaSession() {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
        navigator.mediaSession.setActionHandler('play', () => this.toggle());
        navigator.mediaSession.setActionHandler('pause', () => this.toggle());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      } catch { /* older browsers */ }
    },

    /** Previous song: SDK device if it is playing, else the wheel. */
    prev() {
      if (spotifySdk.active && spotifySdk.player) { spotifySdk.player.previousTrack().catch(() => {}); return; }
      const t = this.track;
      const list = t && radioTracks.list[t.slug];
      if (!list || !list.length) return;
      this.play(t.slug, { index: (t.index - 1 + list.length) % list.length });
    },

    toggle() {
      if (this.source === 'audio' && this.audio) {
        if (this.audio.paused) { if (wave.ctx) wave.ctx.resume(); this.audio.play().catch(() => {}); } else this.audio.pause();
      } else if (this.source === 'spotify' && spotifySdk.active && spotifySdk.player) {
        spotifySdk.player.togglePlay().catch(() => {});
      } else if (this.source === 'spotify' && spotify.ctrl) {
        spotify.ctrl.togglePlay();
      } else if (this.source === 'soundcloud' && soundcloud.widget) {
        soundcloud.widget.toggle();
      } else if (this.source === 'apple') {
        this.expand(!this.el.classList.contains('is-expanded'));
      }
    },
    /** Apple Music can't be paused from outside its iframe: unload it instead. */
    stopApple() {
      const box = this.el && $('[data-embed="apple"].k-dock__embed', this.el);
      if (box && box.dataset.src) { box.innerHTML = ''; box.dataset.src = ''; }
      if (this.source === 'apple') this.playing = false;
    },

    pause() {
      if (this.audio && !this.audio.paused) this.audio.pause();
      if (spotifySdk.active && spotifySdk.player && this.source === 'spotify' && this.playing) spotifySdk.player.pause().catch(() => {});
      if (spotify.ctrl && this.source === 'spotify' && this.playing) spotify.ctrl.pause();
      if (soundcloud.widget && this.source === 'soundcloud' && this.playing) soundcloud.widget.pause();
      if (this.source === 'apple') { this.stopApple(); this.sync(); }
    },

    pauseAll() {
      if (this.audio) this.audio.pause();
      if (spotifySdk.player && spotifySdk.active) spotifySdk.player.pause().catch(() => {});
      if (spotify.ctrl) spotify.ctrl.pause();
      if (soundcloud.widget) soundcloud.widget.pause();
      this.stopApple();
      this.playing = false;
    },

    close() {
      this.pauseAll();
      this.expand(false);
      this.el.classList.remove('is-visible');
      document.body.classList.remove('is-radio-on');
      this.sync();
    },

    isPlaying(slug) { return !!(this.mix && this.mix.slug === slug && this.playing); },

    sync() {
      if (this.el) {
        const btn = $('[data-dock-toggle]', this.el);
        btn.innerHTML = this.playing ? icon.pause : icon.play;
        btn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
        this.el.classList.toggle('is-playing', this.playing);
        this.el.classList.toggle('is-buffering', this.buffering && !this.playing);
      }
      document.body.classList.toggle('is-radio-playing', this.playing);
      $$('[data-mix-play]').forEach((b) => {
        const on = this.isPlaying(b.dataset.mixPlay);
        b.setAttribute('aria-pressed', String(on));
        const ico = $('[data-ico]', b);
        if (ico) ico.innerHTML = on ? icon.pause : icon.play;
        const label = $('[data-label]', b);
        if (label) label.textContent = on ? 'Pause' : 'Play';
      });
      $$('[data-radio-deck]').forEach((d) => d.classList.toggle('is-playing', this.isPlaying(d.dataset.radioDeck)));
      radioWheels.forEach((w) => (w.root.isConnected ? w.sync() : radioWheels.delete(w)));
      wave.start();
    },
  };

  /* ---------------------------------------------------- soft navigation
   * Links between KIOSK Glass pages swap <main> in place instead of
   * reloading, like an app: the chrome stays put, the radio keeps playing.
   * Anything else (legacy pages, other sites, new tabs) navigates normally.
   * -------------------------------------------------------------------- */

  const SOFT_PAGES = new Set(['', 'index', 'films', 'flights', 'atlas', 'archive', 'gallery', 'story', 'radio', 'tv', 'vault', 'lost-and-found', 'store']);
  let pageAbort = new AbortController();
  // The page's identity ignores ?p / ?cw / ?handle: those only open the product panel
  const pageKey = () => { const q = new URLSearchParams(location.search); ['p', 'cw', 'handle'].forEach((k) => q.delete(k)); const qs = q.toString(); return location.pathname + (qs ? `?${qs}` : ''); };
  let renderedKey = pageKey();

  function softUrl(a) {
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.dataset.hard != null) return null;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return null;
    const file = url.pathname.split('/').pop().replace(/\.html$/, '');
    if (!SOFT_PAGES.has(file)) return null;
    if (url.pathname + url.search === location.pathname + location.search && url.hash) return null;
    return url;
  }

  function markNav() {
    const cur = currentNav();
    $$('.k-nav__links a, .k-sheet__links a').forEach((a) => {
      const item = NAV.find((n) => n.href === a.getAttribute('href'));
      if (item && item.id === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const tab = cur;
    $$('[data-tab]').forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const pill = $('.k-tabbar__pill');
    if (pill) {
      const i = $$('[data-tab]', pill).findIndex((a) => a.dataset.tab === tab);
      if (i >= 0) { pill.style.setProperty('--i', String(i)); pill.removeAttribute('data-idle'); } else pill.setAttribute('data-idle', '');
    }
  }

  async function softNavigate(href, push) {
    let doc;
    try {
      const res = await fetch(href, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    } catch (err) { location.href = href; return; }
    const next = doc.body && doc.body.dataset.page;
    const main = doc.querySelector('main');
    if (!PAGES[next] || !main) { location.href = href; return; }

    pageAbort.abort();
    pageAbort = new AbortController();
    if (push) history.pushState({ kiosk: true }, '', href);
    renderedKey = pageKey();
    if (pdpEl && pdpEl.classList.contains('is-open')) closePDP({ fromHistory: true });
    document.title = doc.title;
    const desc = doc.querySelector('meta[name="description"]');
    const here = $('meta[name="description"]');
    if (desc && here) here.setAttribute('content', desc.getAttribute('content'));
    document.body.dataset.page = next;
    PAGE = next;
    const lb = $('.k-lightbox.is-open');
    if (lb) closeLightbox();

    const swap = () => {
      $('main').replaceWith(document.importNode(main, true));
      document.documentElement.classList.remove('is-reading');
      markNav();
      window.scrollTo({ top: 0, behavior: 'instant' });
      runPage();
      reveal();
      player.sync();
      syncPDPFromUrl();
    };
    // App-style page change: the new page rises in over the old one
    if (document.startViewTransition && !REDUCED) {
      document.documentElement.dataset.nav = push ? 'forward' : 'back';
      await document.startViewTransition(swap).updateCallbackDone.catch(() => {});
    } else {
      swap();
    }
    const hash = new URL(href, location.href).hash;
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ block: 'start' });
    const m = $('main');
    if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
    if (typeof window.gtag === 'function') window.gtag('event', 'page_view', { page_location: location.href, page_title: document.title });
  }

  function bindSoftNav() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = softUrl(e.target.closest('a[href]'));
      if (!url) return;
      e.preventDefault();
      // Same page, different product (?p=): just open the panel
      const k = new URLSearchParams(url.search); ['p', 'cw', 'handle'].forEach((x) => k.delete(x));
      const ks = k.toString();
      if (url.pathname + (ks ? `?${ks}` : '') === renderedKey) { history.pushState({ kiosk: true }, '', url.pathname + url.search + url.hash); syncPDPFromUrl(); return; }
      softNavigate(url.href, true);
    });
    window.addEventListener('popstate', () => {
      if (pageKey() === renderedKey) { syncPDPFromUrl(); return; }   // hash or product-panel change
      softNavigate(location.href, false);
    });
  }

  /* ------------------------------------------------------------ saves */

  const SAVE_KEY = 'kiosk:saved';
  const saved = new Set(store.get(SAVE_KEY, []));
  function toggleSave(slug, btn) {
    const on = !saved.has(slug);
    if (on) saved.add(slug); else saved.delete(slug);
    store.set(SAVE_KEY, Array.from(saved));
    $$(`[data-save="${CSS.escape(slug)}"]`).forEach((b) => b.setAttribute('aria-pressed', String(saved.has(slug))));
    if (btn) toast(saved.has(slug) ? 'Saved to your library' : 'Removed from your library');
    // Let kiosk-account.js sync to D1 when signed in
    document.dispatchEvent(new CustomEvent('kiosk:save', { detail: { ref: slug, kind: 'story', on } }));
  }

  /* ---------------------------------------------------------- cards */

  function featureCard(f) {
    const meta = [f.city || f.location, f.runtime || formatLabel(f)].filter(Boolean);
    return `
      <article class="k-card" data-reveal>
        <a href="${storyHref(f)}" aria-label="${esc(featureName(f))} — ${esc(f.title || '')}">
          ${featureMedia(f, { meta: '' })}
        </a>
        <div class="k-card__top">
          <span class="k-tag">${esc(formatLabel(f))}</span>
          <button class="k-save" type="button" data-save="${esc(f.slug)}" aria-pressed="${saved.has(f.slug)}" aria-label="Save ${esc(featureName(f))}">${icon.heart}</button>
        </div>
        <a class="k-card__caption k-glass k-glass--dark" href="${storyHref(f)}" tabindex="-1">
          <p class="k-card__pass"><span>KSK ${esc(f.code || '')}</span><span>Gate ${esc(DESK_GATE[f.desk] || 'A')}</span><span>${esc(shortDate(f.published))}</span></p>
          <h3 class="k-card__title">${esc([f.make, f.model].filter(Boolean).join(' '))}</h3>
          <p class="k-card__sub">${[f.year, typeLabel(f.type), f.shotOn].filter(Boolean).map(esc).join(' · ')}</p>
          ${f.palette && f.palette.length ? `<div class="k-palette-strip k-mt-s" aria-hidden="true">${f.palette.map((c) => `<i style="--swatch:${esc(c.hex)}"></i>`).join('')}</div>` : ''}
          <div class="k-card__meta"><span>${esc(meta[0] || '')}</span><span>${esc(meta[1] || '')}</span></div>
        </a>
      </article>`;
  }

  function productCard(p, opts = {}) {
    const cw = Math.min(opts.colorway || 0, Math.max((p.colorways || []).length - 1, 0));
    const ways = p.colorways || [];
    const isDigital = ['mixes', 'films', 'luts'].includes(p.category);
    const badge = p.badge
      ? `<span class="k-badge${p.badge === 'Issue 01' ? ' k-badge--sticker' : p.badge === 'Digital' || p.badge === 'Classic' ? ' k-badge--soft' : ''}">${esc(p.badge)}</span>` : '';
    const status = p.status === 'available' ? '' : `<span class="k-shop-card__status">${isDigital ? 'Dropping soon' : 'Coming soon'}</span>`;
    return `
      <article class="k-shop-card"${opts.noId ? '' : ` id="${esc(p.id)}"`} data-product="${esc(p.id)}" data-cw="${cw}" data-reveal>
        <div class="k-shop-card__tile" data-quickview="${esc(p.id)}">
          ${badge}${status}
          <div class="k-shop-card__img">${productVisual(p, cw)}</div>
          <button class="k-shop-card__quick" type="button" data-quickview="${esc(p.id)}">Quick view</button>
        </div>
        <div class="k-shop-card__info">
          <div class="k-shop-card__row">
            <h3 class="k-shop-card__title"><button type="button" data-quickview="${esc(p.id)}" style="text-align:left">${esc(p.title)}</button></h3>
            <span class="k-shop-card__price">${esc(price(p))}</span>
          </div>
          <p class="k-shop-card__sub">${storeOf(p) ? `by ${esc(storeOf(p).name)} · ` : ''}${esc(categoryLabel(p.category))}${ways.length > 1 ? ` · ${ways.length} colours` : ''}</p>
          ${p.pickup ? `<p class="k-pickup"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 14.5s5-4.6 5-8.3A5 5 0 0 0 3 6.2c0 3.7 5 8.3 5 8.3z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.3" r="1.7" stroke="currentColor" stroke-width="1.3"/></svg>Pickup only · ${esc(p.pickup.place)}</p>` : ''}
          ${p.quote ? `<p class="k-shop-card__quote">“${esc(p.quote)}”</p>` : ''}
          ${ways.length > 1 ? `<div class="k-dots" role="group" aria-label="Colourways">${ways.map((w, i) => `<button class="k-dot" type="button" style="--sw:${esc(w.garment)}" data-dot="${i}" aria-pressed="${i === cw}" aria-label="${esc(w.name)}" title="${esc(w.name)}"></button>`).join('')}<span class="k-dots__name">${esc(ways[cw].name)}</span></div>` : ''}
          ${opts.reasons && opts.reasons.length ? `<div class="k-match">${opts.reasons.map((r) => `<span>${esc(r)}</span>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }

  function swapColorway(card, i) {
    const p = productById(card.dataset.product);
    if (!p || !(p.colorways || [])[i]) return;
    card.dataset.cw = String(i);
    const img = $('.k-shop-card__img', card);
    img.classList.add('is-swapping');
    setTimeout(() => { img.innerHTML = productVisual(p, i); img.classList.remove('is-swapping'); }, 150);
    $$('[data-dot]', card).forEach((d) => d.setAttribute('aria-pressed', String(Number(d.dataset.dot) === i)));
    const name = $('.k-dots__name', card);
    if (name) name.textContent = p.colorways[i].name;
  }

  // Older call sites ("Quick view") open the new product panel
  function openQuickView(id, cw = 0) { openPDP(id, { cw }); }

  function filmRow(f, i) {
    return `
      <button class="k-row" type="button" data-film="${esc(f.slug)}" style="width:100%;text-align:left">
        <span class="k-row__num">${pad(i + 1)}</span>
        <span>
          <span class="k-row__title" style="display:block">${esc(f.title || f.model)}${f.make ? ` <span class="k-serif" style="opacity:.55">— ${esc(f.make)} ${esc(f.code)}</span>` : ''}</span>
          <span class="k-row__sub" style="display:block">${[place(f), f.shotOn].filter(Boolean).map(esc).join(' · ')}</span>
        </span>
        <span class="k-row__end"><span class="k-row__meta">${esc(f.runtime || '—')}</span><span class="k-arrow k-arrow--ring">${icon.right}</span></span>
        <span class="k-row__thumb" aria-hidden="true">${featureMedia(f, { meta: '' })}</span>
      </button>`;
  }

  /* ------------------------------------------------------------ radio */

  /** The play / pause button used wherever a mix appears. */
  const mixButton = (m, cls = 'k-btn k-btn--solid') => `<button class="${cls}" type="button" data-mix-play="${esc(m.slug)}" aria-pressed="${player.isPlaying(m.slug)}"><span data-ico style="display:inline-grid;width:12px">${player.isPlaying(m.slug) ? icon.pause : icon.play}</span> <span data-label>${player.isPlaying(m.slug) ? 'Pause' : 'Play'}</span></button>`;

  function radioBlock(activeSlug) {
    const mixes = C.mixes || [];
    if (!mixes.length) return '';
    const m = mixBySlug(activeSlug) || (player.mix && mixBySlug(player.mix.slug)) || mixes[0];
    return `
      <div class="k-radio">
        <div class="k-radio__deck k-glass${player.isPlaying(m.slug) ? ' is-playing' : ''}" data-radio-deck="${esc(m.slug)}" data-reveal>
          <div class="plate plate--${esc(m.tone)}"></div>
          <div class="k-row-flex" style="justify-content:space-between">
            <span class="k-eyebrow"><span class="k-live" aria-hidden="true"></span><b>KIOSK Radio</b> · ${esc(m.volume)}</span>
            <span class="k-eyebrow">${esc(mixMeta(m))}</span>
          </div>
          <div>
            <h3 class="k-radio__now">${esc(m.title)} <span class="k-serif" style="opacity:.6">${esc(m.volume)}</span></h3>
            <p class="k-radio__mood">${esc(m.mood)}</p>
          </div>
          <canvas class="k-radio__wave" data-wave="${esc(m.slug)}" data-wave-bar="3" data-wave-gap="3" aria-hidden="true"></canvas>
          <div class="k-radio__controls">
            ${mixButton(m)}
            ${sourceLink(m) ? `<a class="k-btn" href="${esc(sourceLink(m).href)}" target="_blank" rel="noopener">${esc(sourceLink(m).label)}<span class="k-arrow">${icon.arrow}</span></a>` : ''}
            ${(m.tracks || []).length ? `<span class="k-small">${esc(m.tracks.length)} tracks</span>` : ''}
          </div>
        </div>
        <div class="k-radio__list k-glass" data-reveal data-reveal-delay="1">
          <p class="k-eyebrow" style="padding:12px 10px 8px">On rotation</p>
          ${mixes.map((x) => `
            <button class="k-radio__item${x.slug === m.slug ? ' is-active' : ''}" type="button" data-radio-select="${esc(x.slug)}">
              <span class="k-radio__cover">${media({ image: x.cover, tone: x.tone, mark: '' })}</span>
              <span><b>${esc(x.title)}</b><small>${esc(x.volume)} · ${esc(x.mood)}</small></span>
              <span class="k-mono">${esc(x.length || sourceName(x))}</span>
            </button>`).join('')}
          <div style="padding:10px"><a class="k-bar" href="radio.html">All playlists<span class="k-arrow">${icon.arrow}</span></a></div>
        </div>
      </div>`;
  }

  function bindRadio(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const sel = e.target.closest('[data-radio-select]');
      if (!sel) return;
      container.innerHTML = radioBlock(sel.dataset.radioSelect);
      reveal(container);
      hydrateCovers(container);
      player.sync();
      wave.draw();
    });
  }

  /* ------------------------------------------------------ song wheel
   * Radio page: every song of a playlist as a cover on a turning 3D drum.
   * Drag or swipe it, scroll over it, or use the arrow keys; it spins with
   * momentum and settles on a song. Tap the front cover (or Play) to hear
   * that song, any other cover to bring it round. When a song ends the
   * player starts the next one and the wheel turns to follow.
   * -------------------------------------------------------------------- */

  const WHEEL_STEP = 30;    // degrees between covers
  const WHEEL_SPAN = 4;     // covers drawn either side of the front one

  function radioWheelBlock(activeSlug, first) {
    const mixes = C.mixes || [];
    if (!mixes.length) return '';
    const m = mixBySlug(activeSlug) || (player.mix && mixBySlug(player.mix.slug)) || mixes[0];
    const link = sourceLink(m);
    return `
      <div class="k-wheel k-dark" data-wheel="${esc(m.slug)}"${first ? ' data-reveal' : ''}>
        <div class="k-wheel__ambient" aria-hidden="true"><img alt="" data-wheel-ambient hidden></div>
        <div class="k-wheel__head">
          <p class="k-eyebrow"><span class="k-live" aria-hidden="true"></span><b>KIOSK Radio</b> · Song wheel</p>
          <div class="k-wheel__mixes" role="group" aria-label="Playlists">
            ${mixes.map((x) => `
              <button class="k-wheel__mix" type="button" data-wheel-mix="${esc(x.slug)}" aria-pressed="${x.slug === m.slug}">
                <span class="k-wheel__mix-cover">${media({ image: x.cover, tone: x.tone, mark: '' })}</span>
                <span><b>${esc(x.title)}</b><small>${esc(x.volume)}${sourceName(x) ? ` · ${esc(sourceName(x))}` : ''}</small></span>
              </button>`).join('')}
          </div>
        </div>
        <div class="k-wheel__stage" tabindex="0" role="group" aria-roledescription="song wheel" aria-label="Songs in ${esc(m.title)}. Left and right arrows turn the wheel, Enter plays the song in front." data-wheel-stage>
          <div class="k-wheel__drum" data-wheel-drum aria-hidden="true"></div>
        </div>
        <div class="k-wheel__now">
          <button class="k-wheel__step" type="button" data-wheel-step="-1" aria-label="Previous song">${icon.left}</button>
          <div class="k-wheel__info" aria-live="polite" aria-atomic="true">
            <span class="k-mono k-wheel__count" data-wheel-count></span>
            <b class="k-wheel__title" data-wheel-title data-no-i18n></b>
            <span class="k-wheel__artist" data-wheel-artist data-no-i18n></span>
          </div>
          <button class="k-wheel__step" type="button" data-wheel-step="1" aria-label="Next song">${icon.right}</button>
        </div>
        <div class="k-wheel__controls">
          <button class="k-btn k-btn--solid" type="button" data-wheel-play><span data-ico style="display:inline-grid;width:12px">${icon.play}</span> <span data-label>Play</span></button>
          ${link ? `<a class="k-btn" href="${esc(link.href)}" target="_blank" rel="noopener">${esc(link.label)}<span class="k-arrow">${icon.arrow}</span></a>` : ''}
          <canvas class="k-wheel__wave" data-wave="${esc(m.slug)}" data-wave-bar="2" data-wave-gap="3" aria-hidden="true"></canvas>
        </div>
      </div>`;
  }

  /**
   * A turning 3D drum of cards: the engine behind the radio's song wheel and
   * the shop carousel. Drag or swipe it, scroll over it (trackpads turn it
   * freely, a mouse wheel moves one card per notch; vertical scrolling only
   * while all of it is on screen) or use the arrow keys. It spins with
   * momentum and settles on a card; the drum loops round.
   *   stage, drum      the perspective box and the rotating element inside it
   *   step, span       degrees between cards, cards drawn either side of the front
   *   makeCard()       → an element for the pool (kept while it's in view)
   *   paint(card, i)   fill a card with item i
   *   onFront(i)       item i came round to the front
   *   onTap(i)         the front card was tapped, or Enter / Space pressed
   */
  function spinDrum({ stage, drum, step = 30, span = 4, makeCard, paint, onFront, onTap }) {
    const SLOTS = span * 2 + 1;
    let n = 0;
    let ready = false;
    let pos = 0;               // fractional item index facing the front
    let vel = 0;
    let target = 0;
    let raf = 0;
    let front = -1;
    let drag = null;
    let touched = 0;           // last time the visitor turned it
    let wheelSnap = 0;
    let wheelLock = 0;
    let cardW = 240;
    let radius = 600;

    const wrap = (i) => (n ? ((i % n) + n) % n : 0);
    const cards = Array.from({ length: SLOTS }, () => { const c = makeCard(); drum.append(c); return c; });

    const measure = () => {
      cardW = cards[0].offsetWidth || cardW;
      radius = Math.round(cardW / 2 / Math.tan((step * Math.PI) / 360) + cardW * 0.06);
      drum.style.setProperty('--r', `${radius}px`);
    };

    const render = () => {
      const base = Math.round(pos);
      const reach = Math.min(span, Math.floor((n - 1) / 2));   // never show an item twice
      const used = new Set();
      for (let u = base - reach; n && u <= base + reach; u += 1) {
        const card = cards[((u % SLOTS) + SLOTS) % SLOTS];
        used.add(card);
        const off = u - pos;
        const a = off * step;
        card.hidden = false;
        card.style.transform = `translate(-50%, -50%) rotateY(${a.toFixed(2)}deg) translateZ(${radius}px)`;
        card.style.setProperty('--shade', Math.min(1, 1 - Math.cos((a * Math.PI) / 180) + Math.abs(off) * 0.07).toFixed(3));
        card.classList.toggle('is-front', u === base);
        if (card.dataset.u !== String(u)) {
          card.dataset.u = String(u);
          card.dataset.i = String(wrap(u));
          paint(card, wrap(u));
        }
      }
      cards.forEach((c) => { if (!used.has(c)) { c.hidden = true; delete c.dataset.u; } });
      const f = wrap(base);
      if (n && f !== front) { front = f; onFront(f); }
    };

    const tick = () => {
      raf = 0;
      if (!drag) {
        if (REDUCED) { pos = target; vel = 0; } else {
          vel = (vel + (target - pos) * 0.075) * 0.74;   // damped spring towards the resting card
          pos += vel;
          if (Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.002) { pos = target; vel = 0; }
        }
      }
      render();
      if (drag || pos !== target) raf = requestAnimationFrame(tick);
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const api = {
      cards,
      get front() { return front; },
      get busy() { return !!drag || Date.now() - touched < 2500; },
      /** Fill the drum with `count` items, facing item `start`; `spinIn` turns it in from the side. */
      setItems(count, start = 0, spinIn = true) {
        n = count;
        ready = count > 0;
        front = -1;
        cards.forEach((c) => { delete c.dataset.u; });
        pos = REDUCED || !spinIn ? start : start - Math.min(6, count);
        vel = 0;
        target = start;
        run();
        render();
      },
      /** Placeholder cards turning while the real items load. */
      idle(count) { n = count; ready = false; render(); if (!REDUCED) { target = 2; run(); } },
      spin(k) { if (!ready) return; touched = Date.now(); target = Math.round(target) + k; run(); },
      /** Turn the shortest way round to item `i`. */
      goTo(i, byVisitor) {
        if (!ready) return;
        if (byVisitor) touched = Date.now();
        const base = Math.round(target);
        let d = (((i - wrap(base)) % n) + n) % n;
        if (d > n / 2) d -= n;
        target = base + d;
        run();
      },
      refresh() { cards.forEach((c) => { if (c.dataset.u != null) paint(c, Number(c.dataset.i)); }); },
    };

    // Drag / swipe. Vertical swipes still scroll the page (touch-action: pan-y).
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !ready) return;
      drag = { x: e.clientX, y: e.clientY, from: pos, last: e.clientX, t: performance.now(), v: 0, moved: false, id: e.pointerId };
      vel = 0;
      touched = Date.now();
      run();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;   // still a tap
        if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; target = Math.round(pos); run(); return; }
        drag.moved = true;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('is-dragging');
      }
      const per = cardW * 0.8;
      const now = performance.now();
      pos = drag.from - dx / per;
      drag.v = 0.6 * drag.v + 0.4 * ((-(e.clientX - drag.last) / per) * (16.7 / Math.max(1, now - drag.t)));
      drag.last = e.clientX;
      drag.t = now;
      touched = Date.now();
      run();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      stage.classList.remove('is-dragging');
      if (!d.moved) {
        const card = e.type === 'pointerup' && e.target.closest('[data-u]');
        if (card && cards.includes(card)) {
          const u = Number(card.dataset.u);
          if (u === Math.round(pos)) onTap(front); else { touched = Date.now(); target = u; }
        }
        run();
        return;
      }
      // Flick: carry the speed on and settle on the card it lands near
      const v = REDUCED || performance.now() - d.t > 90 ? 0 : d.v;
      vel = v * 0.6;
      target = Math.round(pos + v * 12);
      run();
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    stage.addEventListener('wheel', (e) => {
      if (!ready || n < 2) return;
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const r = stage.getBoundingClientRect();
      if (!horiz && (r.top < 0 || r.bottom > window.innerHeight)) return;
      e.preventDefault();
      touched = Date.now();
      let d = horiz ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= window.innerHeight;
      if (!horiz && Math.abs(d) >= 50) {
        const now = performance.now();
        if (now - wheelLock > 70) { wheelLock = now; api.spin(Math.sign(d)); }
        return;
      }
      clearTimeout(wheelSnap);
      vel = 0;
      pos += d / (cardW * 1.1);
      target = pos;
      wheelSnap = setTimeout(() => { target = Math.round(pos); run(); }, 120);
      run();
    }, { passive: false });

    stage.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
      if (k && ready) { e.preventDefault(); api.spin(k); } else if (e.key === 'Home' && ready) { e.preventDefault(); api.goTo(0, true); } else if (e.key === 'End' && ready) { e.preventDefault(); api.goTo(n - 1, true); } else if ((e.key === 'Enter' || e.key === ' ') && e.target === stage) { e.preventDefault(); if (ready) onTap(front); }
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => { if (!stage.isConnected) { ro.disconnect(); return; } measure(); render(); });
      ro.observe(stage);
    }
    measure();
    return api;
  }

  /** Swap a cover <img> without flashing a broken image while it loads. */
  function setCover(img, src) {
    if (img.dataset.src === (src || '')) return;
    img.dataset.src = src || '';
    img.hidden = true;
    if (src) img.src = src; else img.removeAttribute('src');
  }
  function coverImg() {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.hidden = true;
    img.addEventListener('load', () => { if (img.dataset.src) img.hidden = false; });
    img.addEventListener('error', () => { img.hidden = true; });
    return img;
  }

  function songWheel(root) {
    const slug = root.dataset.wheel;
    const mix = mixBySlug(slug);
    const ambient = $('[data-wheel-ambient]', root);
    const playBtn = $('[data-wheel-play]', root);

    let songs = [];
    let fallback = false;      // no song list: the wheel holds the playlist itself
    let loaded = false;
    let followed = -1;         // last song the player reported, so the wheel follows it once
    const current = () => (player.track && player.track.slug === slug ? player.track.index : -1);

    const describe = (front) => {
      const song = (loaded && songs[front]) || {};
      $('[data-wheel-count]', root).textContent = !loaded ? 'Loading songs…' : fallback ? (mix.volume || '') : `${pad(front + 1)} / ${pad(songs.length)}`;
      $('[data-wheel-title]', root).textContent = loaded ? (song.title || '') : mix.title;
      $('[data-wheel-artist]', root).textContent = loaded ? (song.artist || '') : (mix.mood || '');
      const src = song.cover || '';
      if (ambient.dataset.src !== src) {
        ambient.dataset.src = src;
        ambient.hidden = true;
        if (src) { ambient.onload = () => { ambient.hidden = false; }; ambient.src = src; }
      }
      sync();
    };

    const playFront = () => {
      if (!loaded) return;
      if (fallback) { player.play(slug); return; }
      followed = wheel.front;
      player.play(slug, { index: wheel.front });
    };

    const wheel = spinDrum({
      stage: $('[data-wheel-stage]', root),
      drum: $('[data-wheel-drum]', root),
      step: WHEEL_STEP,
      span: WHEEL_SPAN,
      makeCard() {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'k-wheel__card';
        b.tabIndex = -1;
        b.innerHTML = `<span class="plate plate--${esc(mix.tone || 'graphite')}"></span><span class="k-wheel__badge"><span class="k-wheel__eq"><i></i><i></i><i></i></span>${icon.play}</span>`;
        b.insertBefore(coverImg(), b.children[1]);
        return b;
      },
      paint(card, i) { setCover($('img', card), loaded ? (songs[i] || {}).cover : ''); },
      onFront: describe,
      onTap: playFront,
    });

    function sync() {
      const cur = current();
      const front = wheel.front;
      wheel.cards.forEach((c) => c.classList.toggle('is-playing', !fallback && player.playing && c.dataset.i === String(cur)));
      const on = fallback ? player.isPlaying(slug) : player.playing && cur === front;
      $('[data-ico]', playBtn).innerHTML = on ? icon.pause : icon.play;
      $('[data-label]', playBtn).textContent = on ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${(loaded && songs[front] && songs[front].title) || mix.title}`);
      root.classList.toggle('is-playing', player.isPlaying(slug));
      // The player moved on to another song: turn to it, unless the visitor is browsing
      if (loaded && !fallback && cur >= 0 && cur !== followed) {
        followed = cur;
        if (cur !== front && !wheel.busy) wheel.goTo(cur);
      }
    }

    $$('[data-wheel-step]', root).forEach((b) => b.addEventListener('click', () => wheel.spin(Number(b.dataset.wheelStep))));
    playBtn.addEventListener('click', playFront);

    wheel.idle(WHEEL_SPAN * 2 + 1);
    radioTracks.get(mix).then((list) => {
      if (!root.isConnected) return;
      loaded = true;
      fallback = !list.length;
      songs = list.length ? list : [{ title: mix.title, artist: mix.mood, cover: mix.cover }];
      followed = current();
      root.classList.add('is-loaded');
      wheel.setItems(songs.length, Math.max(0, current()), !fallback);
    });

    radioWheels.add({ root, sync });
  }

  function mountWheel(container, slug, first) {
    if (!container) return;
    container.innerHTML = radioWheelBlock(slug, first);
    const root = $('[data-wheel]', container);
    if (!root) return;
    reveal(container);
    hydrateCovers(container);
    songWheel(root);
    player.sync();
    wave.draw();
  }

  /* ---------------------------------------------------- shop the look */

  /**
   * Rank products against a story's season, vibes and colour guide.
   * Products pinned in f.products always lead.
   */
  /** Index of the first colourway whose name is in the story's palette (else 0). */
  function matchColorway(p, colors) {
    const i = (p.colorways || []).findIndex((w) => colors.has(String(w.name).toLowerCase()));
    return i < 0 ? 0 : i;
  }

  function shopTheLook(f, limit = 4) {
    const pinned = (f.products || []).map(productById).filter(Boolean);
    const vibes = new Set((f.vibes || []).map((v) => v.toLowerCase()));
    const colors = new Set((f.palette || []).map((c) => c.name.toLowerCase()));
    const scored = (C.products || [])
      .filter((p) => !pinned.includes(p))
      .map((p) => {
        const reasons = [];
        let score = 0;
        if (f.season && (p.seasons || []).includes(f.season)) { score += 2; reasons.push(f.season); }
        (p.vibes || []).forEach((v) => { if (vibes.has(v.toLowerCase())) { score += 2; reasons.push(v); } });
        const named = (p.colors || []).concat((p.colorways || []).map((w) => w.name));
        Array.from(new Set(named)).forEach((c) => { if (colors.has(c.toLowerCase())) { score += 3; reasons.push(c); } });
        if (p.id === f.gradedWith) { score += 4; reasons.unshift('graded with'); }
        if (mixBySlug(f.soundtrack) && mixBySlug(f.soundtrack).product === p.id) { score += 4; reasons.unshift('soundtrack'); }
        return { p, score, reasons: Array.from(new Set(reasons)).slice(0, 3), colorway: matchColorway(p, colors) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const pinnedOut = pinned.map((p) => {
      const reasons = ['picked'];
      if (p.id === f.gradedWith) reasons.push('graded with');
      if (p.id === f.filmProduct) reasons.push('this film');
      const cw = matchColorway(p, colors);
      if (cw > 0 || (p.colorways && p.colorways[0] && colors.has(p.colorways[0].name.toLowerCase()))) reasons.push(p.colorways[cw].name);
      return { p, reasons, colorway: cw };
    });
    return pinnedOut.concat(scored).slice(0, limit);
  }

  /* ----------------------------------------------------------- reveal */

  let io;
  function reveal(root = document) {
    const els = $$('[data-reveal]:not(.is-in)', root);
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------- dispatch */

  async function submitDispatch(form) {
    const input = $('input[type="email"]', form);
    const btn = $('button[type="submit"]', form);
    const msg = form.nextElementSibling && form.nextElementSibling.classList.contains('k-form-msg') ? form.nextElementSibling : $('.k-form-msg', form.parentElement);
    const email = (input.value || '').trim();
    const say = (t, err) => { if (msg) { msg.textContent = t; msg.classList.toggle('is-error', !!err); } };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.', true); input.focus(); return; }
    btn.disabled = true;
    say('Joining…');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Which form this was, so the confirmation email and Airtable say so
        body: JSON.stringify({
          email, interest: form.dataset.interest || 'dispatch', title: form.dataset.title || '', source: location.pathname,
          // Drop alerts: a size and / or colour, or '' for any
          size: ($('[data-notify-size][aria-pressed="true"]', form) || { dataset: {} }).dataset.notifySize || '',
          colour: ($('[data-notify-colour][aria-pressed="true"]', form) || { dataset: {} }).dataset.notifyColour || '',
        }),
      });
      let data = {};
      try { data = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      const interest = form.dataset.interest;
      if (interest) {
        const list = store.get('kiosk:interests', []);
        if (!list.includes(interest)) store.set('kiosk:interests', list.concat(interest));
      }
      form.reset();
      say(data.message || 'You’re on the Dispatch. Talk soon.');
      toast('You’re on the list.');
    } catch (err) {
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
      say(local ? 'Signups only work on the deployed site (Cloudflare Pages).' : err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  /* -------------------------------------------------- global delegates */

  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-dot]');
      if (dot) { const card = dot.closest('[data-product]'); if (card) swapColorway(card, Number(dot.dataset.dot)); return; }
      const pd = e.target.closest('[data-pdp]');
      if (pd) { e.preventDefault(); openPDP(pd.dataset.pdp, { cw: Number(pd.dataset.cw || 0), full: pd.dataset.full != null }); return; }
      const qv = e.target.closest('[data-quickview]');
      if (qv) {
        const card = qv.closest('[data-product]');
        openQuickView(qv.dataset.quickview, qv.dataset.cw != null ? Number(qv.dataset.cw) : card ? Number(card.dataset.cw || 0) : 0);
        return;
      }
      const save = e.target.closest('[data-save]');
      if (save) { e.preventDefault(); toggleSave(save.dataset.save, save); return; }
      const dclip = e.target.closest('[data-drive-clip]');
      if (dclip) { openDriveClip(dclip.dataset.driveClip, dclip.dataset.driveTitle); return; }
      const vim = e.target.closest('[data-vimeo]');
      if (vim) { const v = vimeoById(vim.dataset.vimeo); if (v) openVimeo(v); return; }
      const film = e.target.closest('[data-film]');
      if (film) { const f = featureBySlug(film.dataset.film); if (f) openFilm(f); return; }
      const notify = e.target.closest('[data-notify]');
      if (notify) { openNotify(notify.dataset.notify, notify.dataset.notifyTitle); return; }
      const mix = e.target.closest('[data-mix-play]');
      if (mix) { player.play(mix.dataset.mixPlay); return; }
      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const text = copy.dataset.copy;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}`)).catch(() => toast(text));
        else toast(text);
      }
    });
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-dispatch]');
      if (form) { e.preventDefault(); submitDispatch(form); }
    });
  }

  /* ------------------------------------------------------------- i18n
   * Interface text comes from js/kiosk-i18n.js (loaded only when a reader
   * picks another language): every text node and aria-label / placeholder /
   * title is looked up by its English text, including text rendered later.
   * Stories and product notes aren't in the dictionary; where the browser
   * has an on-device translator (Translator API) and the reader turns it on,
   * longer passages are translated locally. Nothing is sent to a server.
   * -------------------------------------------------------------------- */
  const I18N_ATTRS = ['aria-label', 'placeholder', 'title'];
  const I18N_SKIP = 'script, style, textarea, code, pre, [data-clock], [data-clock-zone], [data-no-i18n], .k-tabbar__item svg';
  const i18n = { strings: null, patterns: [], loading: null, done: new Set(), attrs: new Map(), mo: null, mt: null, mtCache: new Map(), queue: new Set(), raf: 0 };
  const norm = (t) => t.replace(/\s+/g, ' ').trim();

  function i18nLoad() {
    if (window.KIOSK_I18N) return Promise.resolve(window.KIOSK_I18N);
    if (!i18n.loading) i18n.loading = loadScript('js/kiosk-i18n.js').then(() => window.KIOSK_I18N);
    return i18n.loading;
  }
  function i18nReady(data) {
    if (i18n.strings || !data) return;
    i18n.strings = data.strings || {};
    i18n.patterns = Object.keys(data.patterns || {}).map((key) => {
      const names = [];
      // {num…} placeholders match digits only; any other {name} matches any text
      const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\w+)\\\}/g, (m, n) => { names.push(n); return /^num/.test(n) ? '(\\d+)' : '(.+?)'; })}$`);
      return { re, names, tr: data.patterns[key] };
    });
  }
  function lookup(text, lang) {
    const key = norm(text);
    if (!key || !/[A-Za-z]/.test(key)) return null;
    const hit = i18n.strings[key];
    if (hit && hit[lang]) return hit[lang];
    for (const p of i18n.patterns) {
      const m = key.match(p.re);
      if (m && p.tr[lang]) {
        return p.names.reduce((out, n, i) => {
          const cap = m[i + 1]; const t = i18n.strings[cap];
          return out.replace(`{${n}}`, t && t[lang] ? t[lang] : cap);
        }, p.tr[lang]);
      }
    }
    return null;
  }
  function translateText(node, lang) {
    const st = node.__k || (node.__k = { src: node.nodeValue, out: null });
    if (node.nodeValue !== st.out && node.nodeValue !== st.src) { st.src = node.nodeValue; st.out = null; }   // the app changed it
    if (lang === 'en') { if (st.out != null && node.nodeValue === st.out) node.nodeValue = st.src; st.out = null; return; }
    const tr = lookup(st.src, lang);
    if (tr) {
      const lead = st.src.match(/^\s*/)[0]; const tail = st.src.match(/\s*$/)[0];
      st.out = lead + tr + tail;
      if (node.nodeValue !== st.out) node.nodeValue = st.out;
      i18n.done.add(node);
    } else if (prefs.mt === 'on' && norm(st.src).length > 36) {
      machineTranslate(node, st, lang);
    }
  }
  function translateAttrs(el, lang) {
    let rec = i18n.attrs.get(el);
    I18N_ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const v = el.getAttribute(a);
      if (!rec) { rec = {}; i18n.attrs.set(el, rec); }
      const r = rec[a] || (rec[a] = { src: v, out: null });
      if (v !== r.out && v !== r.src) { r.src = v; r.out = null; }
      if (lang === 'en') { if (r.out != null && v === r.out) el.setAttribute(a, r.src); r.out = null; return; }
      const tr = lookup(r.src, lang);
      if (tr) { r.out = tr; if (v !== tr) el.setAttribute(a, tr); }
    });
  }
  function translateTree(root, lang = prefs.lang) {
    if (!i18n.strings || !root) return;
    if (root.nodeType === 3) { if (!(root.parentElement && root.parentElement.closest(I18N_SKIP))) translateText(root, lang); return; }
    if (root.nodeType !== 1 || root.closest(I18N_SKIP)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest(I18N_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) translateText(n, lang);
    [root, ...root.querySelectorAll('[aria-label], [placeholder], [title]')].forEach((el) => { if (el.nodeType === 1) translateAttrs(el, lang); });
  }
  function i18nWatch() {
    if (i18n.mo) return;
    i18n.mo = new MutationObserver((records) => {
      records.forEach((r) => {
        if (r.type === 'childList') r.addedNodes.forEach((n) => i18n.queue.add(n));
        else if (r.type === 'characterData') i18n.queue.add(r.target);
        else i18n.queue.add(r.target);
      });
      if (!i18n.raf) {
        i18n.raf = requestAnimationFrame(() => {
          i18n.raf = 0;
          const q = Array.from(i18n.queue); i18n.queue.clear();
          q.forEach((n) => { if (n.isConnected) translateTree(n); });
        });
      }
    });
    i18n.mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
  }

  /* On-device translation of longer passages (Chrome's Translator API) */
  const hasMT = () => 'Translator' in self;
  async function mtTranslator(lang) {
    if (!hasMT()) return null;
    if (i18n.mt && i18n.mt.lang === lang) return i18n.mt.ready;
    const ready = (async () => {
      try {
        const opts = { sourceLanguage: 'en', targetLanguage: lang };
        const a = await self.Translator.availability(opts);
        if (a === 'unavailable') return null;
        return await self.Translator.create(opts);
      } catch (e) { return null; }
    })();
    i18n.mt = { lang, ready };
    return ready;
  }
  async function machineTranslate(node, st, lang) {
    const key = `${lang}\u0000${st.src}`;
    if (i18n.mtCache.has(key)) { st.out = i18n.mtCache.get(key); node.nodeValue = st.out; i18n.done.add(node); return; }
    const tr = await mtTranslator(lang);
    if (!tr || prefs.lang !== lang || prefs.mt !== 'on' || node.nodeValue !== st.src) return;
    try {
      const out = await tr.translate(st.src);
      i18n.mtCache.set(key, out);
      if (node.nodeValue === st.src && prefs.lang === lang) { st.out = out; node.nodeValue = out; i18n.done.add(node); }
    } catch (e) { /* leave it in English */ }
  }

  async function setLanguage(lang) {
    prefs.lang = lang;
    savePrefs();
    document.documentElement.lang = lang;
    if (lang === 'en') {
      i18n.done.forEach((n) => { if (n.isConnected) translateText(n, 'en'); });
      i18n.done.clear();
      i18n.attrs.forEach((rec, el) => { if (el.isConnected) translateAttrs(el, 'en'); });
      return;
    }
    try { i18nReady(await i18nLoad()); } catch (e) { toast('Couldn’t load that language. Try again.'); return; }
    translateTree(document.body, lang);
    i18nWatch();
  }
  function bootI18n() {
    const d = document.documentElement;
    if (prefs.lang === 'en') { d.classList.remove('is-i18n'); return; }
    i18nLoad().then((data) => { i18nReady(data); translateTree(document.body); i18nWatch(); })
      .catch(() => {})
      .finally(() => d.classList.remove('is-i18n'));
  }

  /* --------------------------------------------------------- settings
   * A sheet with the reader's options: language, look, layout and motion.
   * Opened from the gear in the header, "Settings" in the menu or #settings.
   * -------------------------------------------------------------------- */
  const HOME_SECTIONS = [
    ['garage', 'Latest stories'], ['globe', 'The Atlas'], ['departments', 'The Departments'], ['about', 'Why the kiosk'],
    ['make', 'What we make'], ['films', 'Films'], ['mosaic', 'The Mosaic'], ['radio', 'Radio'], ['shop', 'Supply & co.'], ['dispatch', 'The Dispatch'],
  ];
  const ACCENTS = [['signal', 'Signal', '#ff5b23'], ['cobalt', 'Cobalt', '#2f5bff'], ['acid', 'Acid', '#b6f500'], ['rose', 'Rose', '#ff3d8b'], ['gold', 'Gold', '#e2a72e'], ['mono', 'Mono', 'currentColor']];

  function homeOrder() {
    const known = HOME_SECTIONS.map(([k]) => k);
    return prefs.homeOrder.filter((k) => known.includes(k)).concat(known.filter((k) => !prefs.homeOrder.includes(k)));
  }
  // Home page: put sections in the reader's order, hide the ones switched off, renumber the eyebrows
  function applyHome() {
    const main = $('main');
    if (PAGE !== 'home' || !main) return;
    let n = 0;
    homeOrder().forEach((k) => {
      const sec = $(`[data-home="${k}"]`, main);
      if (!sec) return;
      main.append(sec);
      sec.hidden = prefs.homeHidden.includes(k);
      if (sec.hidden) return;
      const eb = $$('.k-eyebrow', sec).find((e) => /^\s*\d{2} \//.test(e.textContent));
      const t = eb && Array.from(eb.childNodes).find((c) => c.nodeType === 3 && /^\s*\d{2} \//.test(c.nodeValue));
      if (t) { n += 1; t.nodeValue = t.nodeValue.replace(/\d{2}/, pad(n)); }
    });
  }

  function seg(name, opts, current, label) {
    return `<div class="k-seg k-set__seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" role="radio" data-pref="${name}" data-value="${v}" aria-checked="${String(v === current)}">${l}</button>`).join('')}</div>`;
  }
  function settingsHtml() {
    const langs = (window.KIOSK_I18N && window.KIOSK_I18N.langs) || LANGS;
    const order = homeOrder();
    const label = Object.fromEntries(HOME_SECTIONS);
    return `
      <div class="k-set__scrim" data-settings-close></div>
      <div class="k-set__panel" role="document">
        <header class="k-set__head">
          <span class="k-set__grab" aria-hidden="true"></span>
          <h2 class="k-set__title" id="k-set-title">Settings</h2>
          <button type="button" class="k-set__x" data-settings-close aria-label="Close settings">${icon.close}</button>
        </header>
        <div class="k-set__body">
          <section class="k-set__group" aria-labelledby="k-set-lang">
            <h3 id="k-set-lang">Language</h3>
            <div class="k-set__langs" role="radiogroup" aria-label="Interface language">
              ${langs.map((l) => `<button type="button" role="radio" data-lang="${l.code}" lang="${l.code}" aria-checked="${String(prefs.lang === l.code)}" data-no-i18n>${esc(l.name)}</button>`).join('')}
            </div>
            <label class="k-set__switch${hasMT() ? '' : ' is-off'}">
              <span><b>Translate stories on this device</b><small>${hasMT() ? 'Uses your browser’s built-in translator. Nothing leaves your device.' : 'Stories and product notes stay in English in this browser.'}</small></span>
              <input type="checkbox" data-pref-check="mt"${prefs.mt === 'on' ? ' checked' : ''}${hasMT() ? '' : ' disabled'}><i aria-hidden="true"></i>
            </label>
          </section>

          <section class="k-set__group" aria-labelledby="k-set-look">
            <h3 id="k-set-look">Appearance</h3>
            <div class="k-set__row"><span>Theme</span>${seg('theme', [['auto', 'Auto'], ['light', 'Day'], ['dark', 'Night']], themePref(), 'Theme')}</div>
            <div class="k-set__row"><span>Accent</span>
              <div class="k-set__swatches" role="radiogroup" aria-label="Accent">${ACCENTS.map(([v, l, c]) => `<button type="button" role="radio" data-pref="accent" data-value="${v}" aria-checked="${String(prefs.accent === v)}" aria-label="${l}" title="${l}" style="--sw:${c}"></button>`).join('')}</div>
            </div>
            <div class="k-set__row"><span>Text size</span>${seg('type', [['s', '<small>A</small>'], ['m', 'A'], ['l', '<big>A</big>'], ['xl', '<big><b>A</b></big>']], prefs.type, 'Text size')}</div>
            <div class="k-set__row"><span>Depth</span>${seg('depth', [['on', 'Depth'], ['off', 'Flat']], prefs.depth, 'Depth and parallax')}</div>
            <div class="k-set__row"><span>Corners</span>${seg('corners', [['round', 'Round'], ['square', 'Square']], prefs.corners, 'Corners')}</div>
          </section>

          <section class="k-set__group" aria-labelledby="k-set-layout">
            <h3 id="k-set-layout">Layout</h3>
            <div class="k-set__row"><span>Density</span>${seg('density', [['comfortable', 'Comfortable'], ['compact', 'Compact']], prefs.density, 'Density')}</div>
            <p class="k-set__label">Home sections</p>
            <p class="k-set__hint">Drag or use the arrows to reorder. Switch a section off to hide it.</p>
            <ol class="k-set__sections" data-home-list>
              ${order.map((k, i) => `
                <li data-key="${k}" draggable="true">
                  <span class="k-set__handle" aria-hidden="true"></span>
                  <span class="k-set__name">${esc(label[k])}</span>
                  <button type="button" class="k-set__mv" data-move="-1" aria-label="Move up"${i === 0 ? ' disabled' : ''}>${icon.left}</button>
                  <button type="button" class="k-set__mv" data-move="1" aria-label="Move down"${i === order.length - 1 ? ' disabled' : ''}>${icon.right}</button>
                  <label class="k-set__mini"><input type="checkbox" data-home-show${prefs.homeHidden.includes(k) ? '' : ' checked'} aria-label="Show"><i aria-hidden="true"></i></label>
                </li>`).join('')}
            </ol>
          </section>

          <section class="k-set__group" aria-labelledby="k-set-motion">
            <h3 id="k-set-motion">Motion</h3>
            <div class="k-set__row"><span>Animations</span>${seg('motion', [['system', 'System'], ['full', 'Full'], ['reduced', 'Reduced']], prefs.motion, 'Animations')}</div>
            <div class="k-set__row"><span>Intro animation</span>${seg('intro', [['once', 'Once per visit'], ['off', 'Off']], prefs.intro, 'Intro animation')}</div>
          </section>
        </div>
        <footer class="k-set__foot">
          <p>Your settings are saved on this device.</p>
          <button type="button" class="k-btn k-btn--sm" data-settings-reset>Reset to defaults</button>
          <button type="button" class="k-btn k-btn--sm k-btn--solid" data-settings-close>Done</button>
        </footer>
      </div>`;
  }
  const LANGS = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' }, { code: 'pt', name: 'Português' }, { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'zh', name: '中文' }];

  let settingsEl = null;
  let settingsReturn = null;
  function openSettings() {
    if (!settingsEl) {
      settingsEl = document.createElement('div');
      settingsEl.className = 'k-set';
      settingsEl.id = 'k-settings';
      settingsEl.setAttribute('role', 'dialog');
      settingsEl.setAttribute('aria-modal', 'true');
      settingsEl.setAttribute('aria-labelledby', 'k-set-title');
      document.body.append(settingsEl);
      bindSettings(settingsEl);
    }
    settingsEl.innerHTML = settingsHtml();
    settingsReturn = document.activeElement;
    document.documentElement.classList.add('is-settings-open');
    requestAnimationFrame(() => {
      settingsEl.classList.add('is-open');
      const first = $('.k-set__x', settingsEl);
      if (first) first.focus({ preventScroll: true });
    });
  }
  function closeSettings() {
    if (!settingsEl || !settingsEl.classList.contains('is-open')) return;
    settingsEl.classList.remove('is-open');
    document.documentElement.classList.remove('is-settings-open');
    if (location.hash === '#settings') history.replaceState(history.state, '', location.pathname + location.search);
    if (settingsReturn && settingsReturn.focus) settingsReturn.focus({ preventScroll: true });
  }
  function refreshSettings() {
    if (!settingsEl) return;
    const body = $('.k-set__body', settingsEl);
    const top = body ? body.scrollTop : 0;
    settingsEl.innerHTML = settingsHtml();
    const nb = $('.k-set__body', settingsEl);
    if (nb) nb.scrollTop = top;
  }
  function moveHome(key, dir) {
    const order = homeOrder();
    const i = order.indexOf(key); const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    prefs.homeOrder = order;
    savePrefs(); applyHome();
  }
  function bindSettings(root) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-settings-close]')) { closeSettings(); return; }
      if (e.target.closest('[data-settings-reset]')) {
        const lang = prefs.lang;
        Object.assign(prefs, JSON.parse(JSON.stringify(PREF_DEFAULTS)));
        store.set(THEME_KEY, 'auto'); applyTheme();
        savePrefs(); applyHome();
        if (lang !== 'en') setLanguage('en');
        refreshSettings();
        toast('Settings reset');
        return;
      }
      const lang = e.target.closest('[data-lang]');
      if (lang) { setLanguage(lang.dataset.lang).then(refreshSettings); return; }
      const opt = e.target.closest('[data-pref]');
      if (opt) {
        const { pref, value } = opt.dataset;
        if (pref === 'theme') { store.set(THEME_KEY, value); applyTheme(); }
        else { prefs[pref] = value; savePrefs(); }
        if (pref === 'motion') toast('Settings saved');
        $$(`[data-pref="${pref}"]`, root).forEach((b) => b.setAttribute('aria-checked', String(b === opt)));
        return;
      }
      const mv = e.target.closest('[data-move]');
      if (mv) {
        const key = mv.closest('[data-key]').dataset.key;
        moveHome(key, Number(mv.dataset.move));
        refreshSettings();
        const again = $(`[data-key="${key}"] [data-move="${mv.dataset.move}"]`, root);
        if (again && !again.disabled) again.focus(); else { const li = $(`[data-key="${key}"] [data-move]:not([disabled])`, root); if (li) li.focus(); }
      }
    });
    root.addEventListener('change', (e) => {
      const chk = e.target.closest('[data-pref-check]');
      if (chk) {
        prefs[chk.dataset.prefCheck] = chk.checked ? 'on' : 'off';
        savePrefs();
        if (chk.dataset.prefCheck === 'mt' && prefs.lang !== 'en') { mtTranslator(prefs.lang); translateTree(document.body); }
        return;
      }
      const show = e.target.closest('[data-home-show]');
      if (show) {
        const key = show.closest('[data-key]').dataset.key;
        prefs.homeHidden = show.checked ? prefs.homeHidden.filter((k) => k !== key) : prefs.homeHidden.concat(key);
        savePrefs(); applyHome();
      }
    });
    // Drag to reorder home sections
    let dragKey = null;
    root.addEventListener('dragstart', (e) => { const li = e.target.closest('[data-key]'); if (!li) return; dragKey = li.dataset.key; li.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; });
    root.addEventListener('dragover', (e) => { if (dragKey && e.target.closest('[data-key]')) e.preventDefault(); });
    root.addEventListener('drop', (e) => {
      const li = e.target.closest('[data-key]');
      if (!dragKey || !li) return;
      e.preventDefault();
      const order = homeOrder().filter((k) => k !== dragKey);
      order.splice(order.indexOf(li.dataset.key) + (e.offsetY > li.offsetHeight / 2 ? 1 : 0), 0, dragKey);
      prefs.homeOrder = order; dragKey = null;
      savePrefs(); applyHome(); refreshSettings();
    });
    root.addEventListener('dragend', () => { dragKey = null; });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button:not([disabled]), input:not([disabled]), a[href]', $('.k-set__panel', root)).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
  function bindSettingsOpen() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-settings-open]')) { e.preventDefault(); openSettings(); }
    });
    if (location.hash === '#settings') openSettings();
    window.addEventListener('hashchange', () => { if (location.hash === '#settings') openSettings(); });
  }

  /* ------------------------------------------------------------ depth
   * Scroll-linked cover (it sinks back as the page slides over it), a
   * header that tucks away while you read, and cards that tilt toward the
   * pointer. Off with Settings › Depth: Flat or reduced motion.
   * -------------------------------------------------------------------- */
  /* ------------------------------------------------- one scroll pass
   * Everything that follows the scroll runs in one pass per frame. With
   * Lenis (smooth scroll) the pass runs inside Lenis's own frame, right after
   * it moves the page: no frame of lag, no second loop. Without it, on the
   * next frame after a scroll event. Listeners get scrollY and work from
   * geometry they measured on resize (see measured()), never reading layout
   * mid-scroll, so one listener's style writes can't force a layout for the
   * next. -------------------------------------------------------------- */
  const scrollFns = new Set();
  let scrollRaf = 0; let lenisOn = null;
  const runScroll = () => { scrollRaf = 0; const y = window.scrollY; scrollFns.forEach((fn) => fn(y)); };
  const smoothLenis = () => { const l = window.KioskEditorial && window.KioskEditorial.lenis; return l || null; };
  function hookLenis() {
    const l = smoothLenis();
    if (l && l !== lenisOn) { l.on('scroll', runScroll); lenisOn = l; }
  }
  window.addEventListener('scroll', () => {
    hookLenis();
    // Lenis reports its own scrolls (native ones included) through runScroll
    if (smoothLenis() && smoothLenis() === lenisOn) return;
    if (!scrollRaf) scrollRaf = requestAnimationFrame(runScroll);
  }, { passive: true });
  function onScrollFrame(fn, signal) {
    scrollFns.add(fn);
    if (signal) signal.addEventListener('abort', () => scrollFns.delete(fn));
    hookLenis();
    fn(window.scrollY);
  }
  /** Where an element sits in the page, ignoring transforms (reveals, the roaming globe). */
  function docBox(el) {
    let x = 0; let y = 0;
    for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  /** Calls measure() now, on resize, and whenever the page changes height (late images, rails, fonts). */
  function measured(measure, signal) {
    let raf = 0;
    const again = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); runScroll(); }); };
    measure();
    window.addEventListener('resize', again, { passive: true, signal });
    window.addEventListener('load', again, { signal });
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(again); ro.observe(document.body); if (signal) signal.addEventListener('abort', () => ro.disconnect()); }
  }

  function bindDepth() {
    const d = document.documentElement;
    let lastY = window.scrollY;
    // the hero's extent and the cover, looked up once per page (kiosk:page) rather than every frame
    let heroEnd = 0; let cover = null; let coverTop = 0; let coverH = 0;
    const measure = () => {
      const hero = $('[data-globe-hero]');
      heroEnd = hero ? hero.offsetTop + hero.offsetHeight * 0.8 : 0;
      cover = $('.k-cover');
      if (cover) { coverTop = cover.offsetTop; coverH = cover.offsetHeight || window.innerHeight; }
    };
    const onScroll = (y) => {
      d.classList.toggle('is-scrolled', y > 8);
      // The nav stays put over the globe hero
      const inHero = y < heroEnd;
      if (Math.abs(y - lastY) > 6) { d.classList.toggle('is-reading', !inHero && y > lastY && y > 160); lastY = y; }
      if (cover && !REDUCED && prefs.depth !== 'off') {
        const p = Math.min(1, Math.max(0, (y - coverTop) / coverH));
        cover.style.setProperty('--hero-p', p.toFixed(3));
      }
    };
    measured(measure);
    document.addEventListener('kiosk:page', () => requestAnimationFrame(() => { measure(); onScroll(window.scrollY); }));
    onScrollFrame(onScroll);

    if (REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const TILT = '.k-card, .k-tile, .k-feature-card, .k-shop-card__media, .k-vimeo__card';
    let el = null;
    document.addEventListener('pointermove', (e) => {
      if (prefs.depth === 'off') return;
      const t = e.target.closest && e.target.closest(TILT);
      if (el && el !== t) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('is-tilt'); }
      el = t;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
      t.classList.add('is-tilt');
      t.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      t.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
    }, { passive: true });
  }

  /* Sections rise into view as you scroll */
  function markRise(root = document) {
    $$('main > section:not(.k-cover):not(.k-gh):not(.k-wl), main > .k-section:not(.k-wl), main > .k-wrap > section', root).forEach((s) => {
      if (!s.hasAttribute('data-reveal')) s.setAttribute('data-reveal', 'rise');
    });
  }

  /* --------------------------------------------------------- shop core
   * Flight numbers and gates for the terminal store, one search across
   * products, Hunt pieces and partner stores, the product panel (PDP) with
   * its full-screen "learn more" view, and Shopify checkout.
   * -------------------------------------------------------------------- */
  const GATE_LETTERS = 'ABCDEFGHJKLMN';
  const gateOf = (catId) => { const i = (C.categories || []).findIndex((c) => c.id === catId); return i < 0 ? '—' : GATE_LETTERS[i] || '—'; };
  const flightOf = (p) => { const m = String(p.title).match(/#(\d{3})/); return `KSK ${m ? m[1] : String(100 + (hash(p.id) % 900))}`; };
  const statusOf = (p, cw) => {
    if (p.pickup) return { key: 'pickup', label: 'Pickup only' };
    if (wayStatus(p, cw) === 'available') return { key: 'boarding', label: isDigitalP(p) ? 'Download' : 'Boarding' };
    return { key: 'soon', label: isDigitalP(p) ? 'Dropping soon' : 'Coming soon' };
  };
  const storeById = (id) => (C.stores || []).find((x) => x.id === id);
  const storeHref = (st) => `store.html?s=${encodeURIComponent(st.id)}`;
  // Partner store links go through /go/<store> so the visit is counted (see functions/go/[store].js)
  const visitHref = (st, p) => (st.url ? `/go/${encodeURIComponent(st.id)}${p ? `?p=${encodeURIComponent(p.id)}` : ''}` : 'vault.html');

  const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  /** Search products, Hunt pieces and stores. Every word must match somewhere. */
  function searchCatalog(q, { kinds = ['product', 'hunt', 'store'], limit = 24 } = {}) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const out = [];
    const score = (fields) => {
      if (!words.length) return 0;
      let total = 0;
      for (const w of words) {
        let best = 0;
        fields.forEach(([txt, weight]) => { const t = fold(txt); if (!t) return; if (t.startsWith(w)) best = Math.max(best, weight * 2); else if (t.includes(` ${w}`) || t.includes(w)) best = Math.max(best, weight); });
        if (!best) return 0;
        total += best;
      }
      return total;
    };
    (C.products || []).forEach((p) => {
      const kind = p.pickup ? 'hunt' : 'product';
      if (!kinds.includes(kind)) return;
      const st = storeOf(p);
      const sc = score([[p.title, 5], [p.design, 4], [categoryLabel(p.category), 3], [(p.colorways || []).map((w) => w.name).join(' '), 2], [p.quote, 1], [p.detail, 1], [st && st.name, 2], [p.pickup && p.pickup.place, 3], [flightOf(p), 2], [(p.vibes || []).join(' '), 1]]);
      if (sc || !words.length) out.push({ kind, p, score: sc });
    });
    if (kinds.includes('store')) {
      (C.stores || []).forEach((st) => {
        const sc = score([[st.name, 6], [st.city, 3], [st.country, 2], [st.note, 1], [(st.tags || []).join(' '), 2]]);
        if (sc || !words.length) out.push({ kind: 'store', st, score: sc + 1 });
      });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  function resultHtml(r) {
    if (r.kind === 'store') {
      return `<a class="k-sr-row" href="${storeHref(r.st)}" role="option"><span class="k-sr-row__img k-sr-row__img--store">${esc((r.st.name || '?').slice(0, 1))}</span><span><b>${esc(r.st.name)}</b><small>Store · ${esc([r.st.city, r.st.country].filter(Boolean).join(', '))}</small></span><i>${icon.arrow}</i></a>`;
    }
    const p = r.p;
    return `<button class="k-sr-row" type="button" data-pdp="${esc(p.id)}" role="option"><span class="k-sr-row__img">${productVisual(p, 0, lifeOf(p, 0).length ? 'life' : '')}</span><span><b>${esc(p.title)}</b><small>${esc(flightOf(p))} · Gate ${esc(gateOf(p.category))} · ${esc(price(p))}${p.pickup ? ` · ${esc(p.pickup.place)}` : ''}</small></span><i>${icon.arrow}</i></button>`;
  }
  /** Wire a search field to a results list (shared by the store, Hunt and store directory). */
  function bindSearch(input, list, opts = {}) {
    if (!input || !list) return;
    const signal = pageAbort.signal;
    const run = () => {
      const q = input.value.trim();
      const res = q ? searchCatalog(q, opts) : [];
      if (opts.onResults) opts.onResults(res, q);
      if (opts.inline === false) return;
      list.innerHTML = q ? (res.length ? res.map(resultHtml).join('') : `<p class="k-sr-empty">Nothing at this terminal matches “${esc(q)}”. Try a colour, a print or a city.</p>`) : '';
      list.hidden = !q;
    };
    input.addEventListener('input', run, { signal });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; run(); }
      if (e.key === 'ArrowDown') { const f = $('.k-sr-row', list); if (f) { e.preventDefault(); f.focus(); } }
    }, { signal });
    list.addEventListener('keydown', (e) => {
      const rows = $$('.k-sr-row', list); const i = rows.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && rows[i + 1]) { e.preventDefault(); rows[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (rows[i - 1] || input).focus(); }
      if (e.key === 'Escape') input.focus();
    }, { signal });
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-search-scope]')) list.hidden = true; else if (input.value.trim() && opts.inline !== false) list.hidden = false; }, { signal });
    run();
    return run;
  }

  /* -- Product panel: a frosted panel that expands into a full product page */
  let pdpEl = null;
  // nSize / nColour: the drop-alert choice ('any' | 'this'; null = default), nEmail: what's typed in it
  const pdpState = { id: '', cw: 0, size: '', img: 0, full: false, nSize: null, nColour: null, nEmail: '' };
  function pdpImages(p, cw) {
    const w = wayOf(p, cw);
    const out = [];
    // No photos yet: every schematic view of the tech sketch
    if (!lifeOf(p, cw).length && !isDigitalP(p) && window.KioskMockup) {
      return window.KioskMockup.sketchViews(p.mockup || { type: 'tee' }).map((view) => ({ view, alt: `${p.title}, ${window.KioskMockup.viewNames[view] || view}` }));
    }
    lifeOf(p, cw).forEach((src, i) => out.push({ src, alt: `${p.title}, ${w.name || ''}, ${(w.lifestyleAlt || [])[i] || (i ? 'in the terminal' : 'on the street')}` }));
    if (w.image) out.push({ src: w.image, alt: `${p.title}, ${w.name || ''}${w.imageFront ? ', back' : ''}`, flat: true });
    if (w.imageFront) out.push({ src: w.imageFront, alt: `${p.title}, ${w.name || ''}, front`, flat: true });
    if (!out.length && p.image) out.push({ src: p.image, alt: p.title, flat: true });
    return out;
  }
  /* -- Garment guide: size chart, fabric, care, colours and FAQ (C.guides) */
  const FITS_CHEST = { XS: '32–34', S: '34–36', M: '38–40', L: '42–44', XL: '46–48', XXL: '50–52' };
  function guideOf(p) {
    const type = (p.mockup || {}).type;
    const base = (C.guides || {})[type];
    return base && !isDigitalP(p) ? { type, ...base, ...(p.guide || {}) } : null;
  }
  const rgbOf = (hex) => { const h = String(hex || '#777').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lightOf = (hex) => { const [r, g, b] = rgbOf(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const near = (a, b) => { const x = rgbOf(a); const y = rgbOf(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 70; };
  /** Colours to wear with a garment colour, from C.pairPalette. */
  function pairsFor(hex) {
    const pal = C.pairPalette || [];
    const L = lightOf(hex);
    const order = L < 0.3 ? ['Hudson Haze', 'Raw Denim', 'Sand', 'Oak Brown', 'Bone', 'Bridge Grey']
      : L > 0.68 ? ['Obsidian', 'Raw Denim', 'Olive', 'Oak Brown', 'Bridge Grey', 'Tail Red']
        : ['Obsidian', 'Hudson Haze', 'Raw Denim', 'Sand', 'Bone', 'Oak Brown'];
    const look = L < 0.3 ? 'Raw or light-wash denim, sand chinos, white leather sneakers and a brown suede layer.'
      : L > 0.68 ? 'Black or raw denim, olive cargos, dark boots and an overshirt for the flight.'
        : 'Black jeans or cream trousers, white sneakers and a navy or brown outer layer.';
    const list = order.map((n) => pal.find((c) => c.name === n)).filter((c) => c && !near(c.hex, hex)).slice(0, 4);
    return { list, look };
  }
  /** The fit-model line ("<name> is <height> and wears an L"), only once the model's real numbers are in. */
  const modelLine = (p) => (p.model && p.model.height && p.model.size ? `${p.model.name || 'Our model'} is ${p.model.height} and wears ${/^[AEFHILMNORSX]/.test(p.model.size) ? 'an' : 'a'} ${p.model.size}.` : '');
  function guideHtml(p, cw) {
    const g = guideOf(p);
    if (!g) return '';
    const w = wayOf(p, cw);
    const unit = pdpState.unit || 'in';
    const num = (v) => (unit === 'cm' ? Math.round(v * 2.54 * 2) / 2 : v);
    const sizes = (p.sizes || []).filter((z) => g.chart && g.chart.rows[z]);
    const fits = g.fitsChest || FITS_CHEST;   // a product graded past XXL brings its own
    const chart = g.chart && sizes.length ? `
      <div class="k-guide__units" role="group" aria-label="Units">${['in', 'cm'].map((u) => `<button type="button" data-pdp-unit="${u}" aria-pressed="${unit === u}">${u}</button>`).join('')}</div>
      <div class="k-guide__table-wrap"><table class="k-guide__table">
        <thead><tr><th scope="col">Size</th>${g.chart.points.map((pt, i) => `<th scope="col"><b>${'ABC'[i]}</b> ${esc(pt)}</th>`).join('')}<th scope="col">Fits chest</th></tr></thead>
        <tbody>${sizes.map((z) => `<tr${z === pdpState.size ? ' class="is-on"' : ''}><th scope="row">${esc(z)}</th>${g.chart.rows[z].map((v) => `<td>${num(v)}</td>`).join('')}<td>${fits[z] ? (unit === 'cm' ? fits[z].split('–').map((v) => Math.round(v * 2.54)).join('–') : fits[z]) : '—'}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="k-guide__note">Measured flat, garment laid on a table, in ${unit === 'cm' ? 'centimetres' : 'inches'}. A, B and C match the tech sketch. Tolerance ±0.5 in / 1 cm.</p>` : '';
    const pair = pairsFor(w.garment || '#777');
    const sw = (hex, name, sub) => `<li><span class="k-guide__sw" style="--sw:${esc(hex)}"></span><span><b>${esc(name)}</b><small>${esc(sub || String(hex).toUpperCase())}</small></span></li>`;
    const finish = p.mockup && p.mockup.quoteFinish === 'stitch' ? 'Embroidered in tonal thread, small, over the right shoulder blade on the back.' : 'Printed small in a hand-lettered script over the right shoulder blade on the back, so it reads like ink from a quill.';
    const faq = [
      ['How does it fit?', g.fit],
      g.chart ? ['Which size should I get?', 'Lay a top you love flat and measure pit to pit (A), then match it to the chart. Between sizes? Size up for room to layer on cold flights.'] : null,
      g.shrink ? ['Will it shrink?', g.shrink] : null,
      p.quote ? ['Is the quote printed or embroidered?', finish] : null,
      ['Is it good for travel?', ['tee', 'longsleeve', 'crew', 'hoodie'].includes(g.type) ? 'Yes. Soft, breathable cotton that packs flat and recovers its shape after a long day in a seat.' : 'Yes. Built to be packed, carried and worn on the road.'],
      [wayStatus(p, cw) === 'available' ? 'How long does shipping take?' : 'When does it drop?', wayStatus(p, cw) === 'available' ? 'See <a href="shipping-returns.html">Shipping &amp; returns</a> for times and costs.' : 'Tap “Notify me” and the Dispatch tells you the moment it lands. Shipping times are on <a href="shipping-returns.html">Shipping &amp; returns</a>.'],
    ].filter(Boolean);
    // One section open at a time (native exclusive <details name>), each
    // with an icon, a one-line preview and a chevron
    const GI = {
      size: '<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
      fabric: '<path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3c-.5 1.6-2 2.5-4 2.5S8.5 5.6 8 4z"/>',
      care: '<path d="M3 7h18l-2 12H5z"/><path d="M6 11c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 3 0"/>',
      palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="16" cy="10" r="1.3"/><path d="M12 21c-1.5 0-2-1-2-2s1-2 2-3"/>',
      pairs: '<path d="M8 3h8l1 5-2 1v12H9V9L7 8z"/><path d="M12 3v3"/>',
      faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7"/><path d="M12 17h.01"/>',
    };
    const gi = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${GI[k]}</svg>`;
    // Laundry symbols for the care lines, matched on their wording
    const careIcon = (line) => {
      const t = line.toLowerCase();
      const no = '<path d="M4 4l16 16M20 4L4 20"/>';
      const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
      if (/dry clean/.test(t)) return svg(`<circle cx="12" cy="12" r="7"/>${/not|never/.test(t) ? no : ''}`);
      if (/iron/.test(t)) return svg(`<path d="M3 17h17l-1.5-6a3 3 0 0 0-3-2.5H8"/><path d="M8 8.5L6 5h9"/>${/never|not|no /.test(t) ? no : '<circle cx="11" cy="14" r=".8"/>'}`);
      if (/bleach/.test(t)) return svg(`<path d="M12 4l9 15H3z"/>${no}`);
      if (/dry/.test(t)) return svg(`<rect x="4" y="4" width="16" height="16" rx="2"/>${/tumble/.test(t) ? '<circle cx="12" cy="12" r="5"/>' : '<path d="M12 7v10"/>'}`);
      return svg('<path d="M3 7h18l-2 12H5z"/><path d="M6 11c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 3 0"/>');
    };
    const sec = (id, title, peek, body) => `<details class="k-guide__sec" name="k-pdp-guide" data-acc="${id}">
      <summary><span class="k-guide__ico">${gi(id)}</span><span class="k-guide__head"><b>${title}</b>${peek ? `<small>${peek}</small>` : ''}</span><i class="k-guide__chev" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 9l6 6 6-6"/></svg></i></summary>
      <div class="k-guide__body">${body}</div>
    </details>`;
    const dots = (hexes) => `<span class="k-guide__dots">${hexes.map((h) => `<span style="--sw:${esc(h)}"></span>`).join('')}</span>`;
    const short = (t, n = 46) => { const x = String(t || '').split(/[,:;.(]/)[0].trim(); return esc(x.length > n ? `${x.slice(0, n - 1)}…` : x); };
    const sizeSpan = sizes.length ? `${sizes[0]}–${sizes[sizes.length - 1]}` : (p.sizes || []).join(' · ');
    const others = (p.colorways || []).filter((x) => x !== w);
    return `<div class="k-guide">
      ${sec('size', g.chart ? 'Size chart &amp; fit' : 'Size &amp; fit', `${short(g.fit, 30)}${sizeSpan ? ` · ${esc(sizeSpan)}` : ''}`, `<p class="k-guide__lede">${esc(g.fit)}</p>${modelLine(p) ? `<p><b>${esc(modelLine(p))}</b></p>` : ''}${chart}`)}
      ${sec('fabric', 'Materials', short(g.fabric[0]), `<ul class="k-guide__spec">${g.fabric.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${sec('care', 'Care', `${g.care.length} steps · ${short(g.care[0], 30)}`, `<ul class="k-guide__care">${g.care.map((x) => `<li>${careIcon(x)}<span>${esc(x)}</span></li>`).join('')}</ul>`)}
      ${sec('palette', 'Colour palette', `${dots([w.garment, w.ink].filter(Boolean))}${esc(w.name || 'Garment')}`, `<ul class="k-guide__sws">${sw(w.garment, w.name || 'Garment', `Garment · ${String(w.garment || '').toUpperCase()}`)}${w.ink ? sw(w.ink, p.quote ? 'Lettering' : 'Print', String(w.ink).toUpperCase()) : ''}</ul>
        ${others.length ? `<div class="k-guide__also"><span class="k-guide__note">Also in</span><span class="k-guide__chips">${others.map((x) => `<button type="button" class="k-guide__chip" data-pdp-cw="${(p.colorways || []).indexOf(x)}"><span style="--sw:${esc(x.garment || '#777')}"></span>${esc(x.name)}</button>`).join('')}</span></div>` : ''}`)}
      ${sec('pairs', 'Pairs well with', `${dots(pair.list.map((c) => c.hex))}${esc(pair.list.slice(0, 2).map((c) => c.name).join(', '))}`, `<ul class="k-guide__sws">${pair.list.map((c) => sw(c.hex, c.name)).join('')}</ul><p class="k-guide__note">${esc(pair.look)}</p>`)}
      ${sec('faq', 'Questions', `${faq.length} answers · fit, sizing, shrink and drops`, `<div class="k-guide__faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}<i aria-hidden="true"></i></summary><p>${/</.test(a) ? a : esc(a)}</p></details>`).join('')}</div>`)}
    </div>`;
  }
  const sketchOf = (p, cw, view) => window.KioskMockup.render(p.mockup || { type: 'tee' }, wayOf(p, cw), { sketch: true, view, code: flightOf(p), title: p.title, category: categoryLabel(p.category), detail: p.detail, sizes: p.sizes, colorways: p.colorways });
  const slideHtml = (p, cw, im, thumb) => (im.view ? sketchOf(p, cw, im.view) : `<img src="${esc(im.src)}" alt="${thumb ? '' : esc(im.alt)}" ${thumb ? 'loading="lazy"' : 'decoding="async"'}>`);
  function pdpHtml(p) {
    const { cw } = pdpState;
    const ways = p.colorways || [];
    const sizes = p.sizes || [];
    const st = storeOf(p);
    const imgs = pdpImages(p, cw);
    const stat = statusOf(p, cw);
    const seen = storiesFor(p);
    const related = (C.products || []).filter((x) => x.id !== p.id && (x.category === p.category || (p.design && x.design))).slice(0, 4);
    return `
      <div class="k-pdp__scrim" data-pdp-close></div>
      <article class="k-pdp__panel" aria-labelledby="k-pdp-title">
        <header class="k-pdp__bar">
          <span class="k-pdp__flight"><b>${esc(flightOf(p))}</b><span>Gate ${esc(gateOf(p.category))}</span><span class="k-board__status k-board__status--${stat.key}">${esc(stat.label)}</span></span>
          <span class="k-pdp__tools">
            <button type="button" class="k-pdp__icon" data-pdp-full aria-label="${pdpState.full ? 'Back to the panel' : 'Open the full product page'}">${pdpState.full ? icon.collapse : icon.expand}</button>
            <button type="button" class="k-pdp__icon" data-pdp-close aria-label="Close">${icon.close}</button>
          </span>
        </header>
        <div class="k-pdp__body">
          <div class="k-pdp__media">
            <div class="k-pdp__stage" data-pdp-stage>${imgs.length ? `
              <div class="k-car" data-car tabindex="0" role="region" aria-roledescription="carousel" aria-label="${esc(p.title)} images">${imgs.map((im, i) => `
                <div class="k-car__slide${im.flat ? ' is-flat' : ''}${im.view ? ' is-sketch' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${imgs.length}: ${esc(im.alt)}">${slideHtml(p, cw, im)}</div>`).join('')}
              </div>
              ${imgs.length > 1 ? `<button class="k-car__nav k-car__nav--prev" type="button" data-car-step="-1" aria-label="Previous image">‹</button><button class="k-car__nav k-car__nav--next" type="button" data-car-step="1" aria-label="Next image">›</button>
              <div class="k-car__dots" aria-hidden="true">${imgs.map((im, i) => `<i${i === pdpState.img ? ' class="is-on"' : ''}></i>`).join('')}</div>` : ''}` : productVisual(p, cw)}</div>
            ${imgs.length > 1 ? `<div class="k-pdp__thumbs" role="group" aria-label="Images">${imgs.map((im, i) => `<button type="button" data-pdp-img="${i}" aria-pressed="${i === pdpState.img}" aria-label="${esc(im.alt)}"${im.view ? ' class="is-sketch"' : ''}>${slideHtml(p, cw, im, true)}</button>`).join('')}</div>` : ''}
          </div>
          <div class="k-pdp__info">
            <p class="k-eyebrow">${esc(categoryLabel(p.category))}${p.design ? ` · ${esc(p.design)}` : ''}${st ? ` · by <a href="${storeHref(st)}">${esc(st.name)}</a>` : ''}</p>
            <h2 class="k-pdp__title" id="k-pdp-title">${esc(p.title)}</h2>
            <p class="k-pdp__price">${esc(price(p))}</p>
            ${ways.length ? `<div class="k-pdp__opt"><p class="k-qv__label"><span>Colour</span><span>${esc((ways[cw] || {}).name || '')}${wayStatus(p, cw) !== 'available' && p.status === 'available' ? ' · coming soon' : ''}</span></p>
              <div class="k-dots" style="gap:12px">${ways.map((w, i) => `<button class="k-swatch" type="button" style="--sw:${esc(w.garment)}" data-pdp-cw="${i}" aria-pressed="${i === cw}" aria-label="${esc(w.name)}"><i></i>${esc(w.name)}</button>`).join('')}</div></div>` : ''}
            ${sizes.length > 1 ? `<div class="k-pdp__opt"><p class="k-qv__label"><span>Size</span><span><a href="#guide-size" data-pdp-guide>Size guide</a> · ${esc(pdpState.size || 'Select a size')}</span></p>
              <div class="k-sizes">${sizes.map((z) => `<button class="k-size" type="button" data-pdp-size="${esc(z)}" aria-pressed="${z === pdpState.size}">${esc(z)}</button>`).join('')}</div></div>` : ''}
            <div class="k-pdp__cta">
              ${canBuy(p, cw)
                ? `<div class="k-pdp__pricebar"><b>${esc(price(p))}</b>
                     <button class="k-btn k-pdp__cart" type="button" data-pdp-cart>Add to bag</button>
                     <button class="k-btn k-btn--solid k-pdp__buy" type="button" data-pdp-buy>Buy now <span class="k-arrow">${icon.arrow}</span></button></div>`
                : notifyHtml(p, cw, sizes, ways)}
              ${pdpState.full ? '' : `<button class="k-btn" type="button" data-pdp-full>Learn more <span class="k-arrow">${icon.expand}</span></button>`}
            </div>
            <div class="k-pdp__sticky" aria-hidden="false">
              <div class="k-pdp__sticky-inner">
                <b>${esc(price(p))}</b>
                <button type="button" class="k-pdp__wish" data-wish-product="${esc(p.id)}" aria-label="Save">${icon.heart}</button>
                ${canBuy(p, cw)
                  ? `<button class="k-btn" type="button" data-pdp-cart>Add to bag</button>`
                  : `<button class="k-btn" type="button" data-pdp-notify-focus>${p.pickup ? 'Reserve' : 'Notify me'}</button>`}
              </div>
            </div>
            <p class="k-form-msg" data-pdp-msg aria-live="polite"></p>
            ${modelLine(p) ? `<p class="k-pdp__model">${esc(modelLine(p))}</p>` : ''}
            ${p.detail ? `<p class="k-pdp__detail">${esc(p.detail)}</p>` : ''}
            ${p.pickup ? `<div class="k-pdp__collect">
              <p class="k-qv__label"><span>How collection works</span></p>
              <ol>
                <li><b>1</b><span>Reserve the piece and join the Dispatch.</span></li>
                <li><b>2</b><span>Exact coordinates drop when you’re cleared to collect.</span></li>
                <li><b>3</b><span>Travel to ${esc(p.pickup.place)}${p.pickup.window ? ` · ${esc(p.pickup.window)}` : ''}.</span></li>
              </ol>
              <p class="k-pickup">${icon.pin}<a href="lost-and-found.html?item=${encodeURIComponent(p.id)}">See it on the Lost &amp; Found map</a></p>
            </div>` : ''}
            <div id="guide-size">${guideHtml(p, cw)}</div>

            <div class="k-pdp__more"${pdpState.full ? '' : ' hidden'}>
              ${p.description ? `<p class="k-pdp__desc">${esc(p.description)}</p>` : ''}
              <dl class="k-qv__list">
                ${p.design ? `<div><dt>Print</dt><dd>${esc(p.design)}</dd></div>` : ''}
                ${p.quote ? `<div><dt>On the back</dt><dd class="k-serif">“${esc(p.quote)}”</dd></div>` : ''}
                ${ways.length ? `<div><dt>Colourways</dt><dd>${ways.map((w) => esc(w.name) + (w.status === 'soon' ? ' (soon)' : '')).join(' · ')}</dd></div>` : ''}
                ${sizes.length ? `<div><dt>Sizes</dt><dd>${sizes.map(esc).join(' · ')}</dd></div>` : ''}
                <div><dt>Delivery</dt><dd>${p.pickup ? `Pickup only · ${esc(p.pickup.place)}` : isDigitalP(p) ? 'Digital download' : st && st.id !== 'kiosk' ? `Ships from ${esc(st.name)}` : 'Ships from the KIOSK store'}</dd></div>
                ${p.pickup ? `<div><dt>Lost &amp; Found</dt><dd>${esc(p.pickup.coords || 'Exact coordinates drop in the Dispatch')} · ${esc(p.pickup.window || '')}. ${esc(p.pickup.note || '')}</dd></div>` : ''}
                <div><dt>Flight</dt><dd>${esc(flightOf(p))} · Gate ${esc(gateOf(p.category))} · ${esc(categoryLabel(p.category))}</dd></div>
              </dl>
              ${seen.length ? `<div><p class="k-qv__label"><span>As seen in</span></p><div class="k-qv__seen">${seen.map((f) => `<a class="k-btn k-btn--sm" href="${storyHref(f)}">${esc(f.title)} · ${esc(f.make)} ${esc(f.code)}</a>`).join('')}</div></div>` : ''}
              ${st ? `<a class="k-pdp__store" href="${storeHref(st)}"><span class="k-sr-row__img k-sr-row__img--store">${esc(st.name.slice(0, 1))}</span><span><small>Sold by</small><b>${esc(st.name)}</b><small>${esc([st.city, st.country].filter(Boolean).join(', '))}</small></span><i>${icon.arrow}</i></a>` : ''}
              ${related.length ? `<div><p class="k-qv__label"><span>More for the trip</span></p><div class="k-pdp__related">${related.map((x) => `<button type="button" data-pdp="${esc(x.id)}"><span>${productVisual(x, 0, lifeOf(x, 0).length ? 'life' : '')}</span><b>${esc(x.title)}</b><small>${esc(price(x))}</small></button>`).join('')}</div></div>` : ''}
            </div>
          </div>
        </div>
      </article>`;
  }
  /* Swipeable image carousel: native scroll-snap, synced to thumbs and dots */
  function carSync(i) {
    pdpState.img = i;
    $$('[data-pdp-img]', pdpEl).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $$('.k-car__dots i', pdpEl).forEach((d, k) => d.classList.toggle('is-on', k === i));
    const t = $(`[data-pdp-img="${i}"]`, pdpEl); if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function carGo(i, instant) {
    const car = pdpEl && $('[data-car]', pdpEl);
    if (!car) return;
    const n = car.children.length;
    const k = Math.max(0, Math.min(n - 1, i));
    car.scrollTo({ left: k * car.clientWidth, behavior: instant || REDUCED ? 'auto' : 'smooth' });
    carSync(k);
  }
  function bindCarousel() {
    const car = pdpEl && $('[data-car]', pdpEl);
    if (!car) return;
    requestAnimationFrame(() => carGo(Math.min(pdpState.img, car.children.length - 1), true));
    let raf = 0;
    car.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const k = Math.round(car.scrollLeft / Math.max(1, car.clientWidth)); if (k !== pdpState.img) carSync(k); });
    }, { passive: true });
    car.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); carGo(pdpState.img + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); carGo(pdpState.img - 1); }
    });
  }
  /**
   * Drop alert for a piece that isn't on sale: any size (default) or the size
   * picked above, any colour or the one shown. A voyager's check-in size is
   * picked for them; their email is filled in.
   */
  function notifyHtml(p, cw, sizes, ways) {
    const way = (ways[cw] || {}).name || '';
    const t = memberTaste();
    const size = sizes.length > 1 ? pdpState.size : '';
    const sizeThis = size && (pdpState.nSize ? pdpState.nSize === 'this' : !!(t && mySizeOn(p, t) === size));
    const colourThis = ways.length > 1 && pdpState.nColour === 'this';
    const chip = (kind, value, label, on, extra = '') => `<button type="button" class="k-chip" data-notify-${kind}="${esc(value)}" aria-pressed="${on}"${extra}>${label}</button>`;
    return `
      <form class="k-pdp__notify" data-dispatch data-pdp-notify novalidate data-interest="${esc(p.id)}" data-title="${esc(p.title)}">
        <p class="k-pdp__notify-lead">${p.pickup ? 'Reserve it: we’ll email the coordinates when you’re cleared to collect.' : 'Coming soon. Tell me when it’s in stock:'}</p>
        ${sizes.length > 1 ? `<div class="k-pdp__notify-opts" role="group" aria-label="Size">
          ${chip('size', '', 'Any size', !sizeThis)}
          ${size ? chip('size', size, `${esc(size)}${t && mySizeOn(p, t) === size ? ' <small>your size</small>' : ''}`, sizeThis) : '<span class="k-pdp__notify-hint">Pick a size above for just yours</span>'}
        </div>` : ''}
        ${ways.length > 1 ? `<div class="k-pdp__notify-opts" role="group" aria-label="Colour">
          ${chip('colour', '', 'Any colour', !colourThis)}
          ${chip('colour', way, `<i style="--sw:${esc((ways[cw] || {}).garment || '#888')}"></i>${esc(way)}`, colourThis)}
        </div>` : ''}
        <div class="k-pdp__notify-row">
          <label class="k-sr" for="k-pdp-notify-${esc(p.id)}">Email</label>
          <input id="k-pdp-notify-${esc(p.id)}" type="email" name="email" placeholder="you@example.com" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" value="${esc(pdpState.nEmail || memberEmail())}" required>
          <button class="k-btn k-btn--solid" type="submit">${p.pickup ? 'Reserve' : 'Notify me'}</button>
        </div>
      </form>
      <p class="k-form-msg k-pdp__notify-msg" aria-live="polite"></p>`;
  }

  // Sign-in state arrives after a product page can already be open (vault.html?p=…):
  // redraw it so a voyager's size and email land in the drop alert
  document.addEventListener('kiosk:account', () => { if (pdpEl && pdpEl.classList.contains('is-open')) renderPDP(); });

  function renderPDP() {
    const p = productById(pdpState.id);
    if (!pdpEl || !p) return;
    const info = $('.k-pdp__info', pdpEl); const top = info ? info.scrollTop : 0;
    const body = $('.k-pdp__body', pdpEl); const btop = body ? body.scrollTop : 0;
    // Keep keyboard focus on the same control across the re-render
    const act = pdpEl.contains(document.activeElement) ? document.activeElement : null;
    const keep = act && ['data-pdp-cw', 'data-pdp-size', 'data-pdp-img', 'data-pdp-full', 'data-pdp-buy', 'data-pdp-cart'].find((a) => act.hasAttribute(a));
    const keepSel = keep ? `[${keep}${act.getAttribute(keep) ? `="${act.getAttribute(keep)}"` : ''}]` : '';
    const opened = $$('[data-acc][open]', pdpEl).map((d) => d.dataset.acc);
    const typed = $('[data-pdp-notify] input[type="email"]', pdpEl);
    if (typed && typed.value) pdpState.nEmail = typed.value;
    pdpEl.innerHTML = pdpHtml(p);
    opened.forEach((a) => { const d = $(`[data-acc="${a}"]`, pdpEl); if (d) d.open = true; });
    bindCarousel();
    if (keepSel) { const again = $(keepSel, pdpEl) || $('.k-pdp__icon', pdpEl); if (again) again.focus({ preventScroll: true }); }
    pdpEl.classList.toggle('is-full', pdpState.full);
    const ni = $('.k-pdp__info', pdpEl); if (ni) ni.scrollTop = top;
    const nb = $('.k-pdp__body', pdpEl); if (nb) nb.scrollTop = btop;
  }
  const urlWithP = (id, cw) => {
    const u = new URL(location.href);
    if (id) { u.searchParams.set('p', id); if (cw) u.searchParams.set('cw', cw); else u.searchParams.delete('cw'); } else { u.searchParams.delete('p'); u.searchParams.delete('cw'); }
    u.searchParams.delete('handle');
    return u.pathname + u.search + u.hash;
  };
  function openPDP(id, { cw = 0, full = false, push = true } = {}) {
    const p = productById(id);
    if (!p) return;
    if (!pdpEl) {
      pdpEl = document.createElement('div');
      pdpEl.className = 'k-pdp';
      pdpEl.setAttribute('role', 'dialog');
      pdpEl.setAttribute('aria-modal', 'true');
      document.body.append(pdpEl);
      bindPDP(pdpEl);
    }
    const wasOpen = pdpEl.classList.contains('is-open');
    const mine = ((taste() || {}).sizes || {}).top;   // the size from check-in, when this piece comes in it
    const fits = mine && (p.sizes || []).find((z) => z.toLowerCase() === mine);
    if (pdpState.id !== id) Object.assign(pdpState, { nSize: null, nColour: null, nEmail: '' });
    Object.assign(pdpState, { id, cw: Math.min(cw, Math.max(0, (p.colorways || []).length - 1)), size: (p.sizes || []).length === 1 ? p.sizes[0] : (fits || ''), img: 0, full });
    if (!wasOpen) pdpEl.__return = document.activeElement;
    renderPDP();
    document.documentElement.classList.add('is-pdp-open');
    requestAnimationFrame(() => {
      pdpEl.classList.add('is-open');
      const f = $('[data-pdp-close].k-pdp__icon', pdpEl); if (f && !wasOpen) f.focus({ preventScroll: true });
    });
    if (full && push) { history.pushState({ kiosk: true, pdp: id }, '', urlWithP(id, pdpState.cw)); }
  }
  function setPDPFull(full) {
    pdpState.full = full;
    renderPDP();
    const want = urlWithP(full ? pdpState.id : '', pdpState.cw);
    if (want !== location.pathname + location.search + location.hash) {
      if (full) history.pushState({ kiosk: true, pdp: pdpState.id }, '', want);
      else history.replaceState(history.state, '', want);
    }
    const b = $('.k-pdp__body', pdpEl); if (b) b.scrollTop = 0;
  }
  function closePDP({ fromHistory = false } = {}) {
    if (!pdpEl || !pdpEl.classList.contains('is-open')) return;
    pdpEl.classList.remove('is-open');
    document.documentElement.classList.remove('is-pdp-open');
    if (!fromHistory && new URLSearchParams(location.search).has('p')) history.replaceState(history.state, '', urlWithP('', 0));
    const back = pdpEl.__return; if (back && back.focus && back.isConnected) back.focus({ preventScroll: true });
  }
  // Keep the panel in step with the address bar (?p=<id> is the full product page)
  function syncPDPFromUrl() {
    const q = new URLSearchParams(location.search);
    const id = q.get('p');
    const handle = q.get('handle');
    if (id && productById(id)) { openPDP(id, { cw: Number(q.get('cw')) || 0, full: true, push: false }); return; }
    if (handle) {
      const p = (C.products || []).find((x) => x.shopifyHandle === handle || (x.colorways || []).some((w) => w.shopifyHandle === handle));
      if (p) { const cw = Math.max(0, (p.colorways || []).findIndex((w) => w.shopifyHandle === handle)); openPDP(p.id, { cw, full: true, push: false }); history.replaceState(history.state, '', urlWithP(p.id, cw)); return; }
    }
    if (!id && pdpEl && pdpEl.classList.contains('is-open') && pdpState.full) closePDP({ fromHistory: true });
  }
  // Escape works wherever focus is while the panel is open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !pdpEl || !pdpEl.classList.contains('is-open') || pdpEl.contains(e.target)) return;
    if (document.documentElement.classList.contains('is-settings-open')) return;
    if (pdpState.full) setPDPFull(false); else closePDP();
  });
  function bindPDP(root) {
    // Opening a guide section closes the open one above it and the page
    // jumps up, so bring the header the reader tapped back into view
    let tapped = null;
    root.addEventListener('toggle', (e) => {
      const d = e.target;
      if (d !== tapped || !d.open) return;
      tapped = null;
      requestAnimationFrame(() => {
        const bar = $('.k-pdp__bar', root);
        const top = bar ? bar.getBoundingClientRect().bottom : 0;
        if (d.getBoundingClientRect().top < top + 8) d.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }, true);
    root.addEventListener('click', (e) => {
      const head = e.target.closest('.k-guide__sec > summary');
      if (head) tapped = head.parentElement;
      if (e.target.closest('[data-pdp-close]')) { closePDP(); return; }
      if (e.target.closest('[data-pdp-full]')) { setPDPFull(!pdpState.full); return; }
      const nc = e.target.closest('[data-notify-size], [data-notify-colour]');
      if (nc) {
        const kind = nc.hasAttribute('data-notify-size') ? 'size' : 'colour';
        $$(`[data-notify-${kind}]`, nc.parentElement).forEach((b) => b.setAttribute('aria-pressed', String(b === nc)));
        pdpState[kind === 'size' ? 'nSize' : 'nColour'] = nc.getAttribute(`data-notify-${kind}`) ? 'this' : 'any';
        return;
      }
      if (e.target.closest('[data-pdp-notify-focus]')) {
        const f = $('[data-pdp-notify]', root);
        if (f) { f.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); setTimeout(() => $('input', f).focus({ preventScroll: true }), REDUCED ? 0 : 350); }
        return;
      }
      const im = e.target.closest('[data-pdp-img]');
      if (im) { carGo(Number(im.dataset.pdpImg)); return; }
      const step = e.target.closest('[data-car-step]');
      if (step) { carGo(pdpState.img + Number(step.dataset.carStep)); return; }
      const c = e.target.closest('[data-pdp-cw]');
      if (c) { pdpState.cw = Number(c.dataset.pdpCw); pdpState.img = 0; renderPDP(); if (pdpState.full) history.replaceState(history.state, '', urlWithP(pdpState.id, pdpState.cw)); return; }
      const z = e.target.closest('[data-pdp-size]');
      if (z) { pdpState.size = z.dataset.pdpSize; renderPDP(); return; }
      const un = e.target.closest('[data-pdp-unit]');
      if (un) { pdpState.unit = un.dataset.pdpUnit; renderPDP(); return; }
      if (e.target.closest('[data-pdp-buy]')) { checkout(productById(pdpState.id), pdpState.cw, pdpState.size); }
      if (e.target.closest('[data-pdp-cart]')) {
        document.dispatchEvent(new CustomEvent('kiosk:add-to-cart', {
          detail: { productId: pdpState.id, cw: pdpState.cw, size: pdpState.size },
        }));
      }
      if (e.target.closest('[data-pdp-guide]')) {
        e.preventDefault();
        const sec = $('[data-acc="size"]', root);
        if (sec) { sec.open = true; sec.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' }); }
      }
      const wish = e.target.closest('[data-wish-product]');
      if (wish) {
        const on = wish.getAttribute('aria-pressed') !== 'true';
        wish.setAttribute('aria-pressed', String(on));
        document.dispatchEvent(new CustomEvent('kiosk:save', { detail: { kind: 'product', ref: wish.dataset.wishProduct, on } }));
      }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (pdpState.full) setPDPFull(false); else closePDP(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button:not([disabled]), a[href], input', $('.k-pdp__panel', root)).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    // Swipe down to dismiss the sheet on phones
    let sy = 0;
    root.addEventListener('touchstart', (e) => { sy = e.target.closest('.k-pdp__bar') ? e.touches[0].clientY : 0; }, { passive: true });
    root.addEventListener('touchend', (e) => { if (sy && e.changedTouches[0].clientY - sy > 80 && !pdpState.full) closePDP(); sy = 0; }, { passive: true });
  }

  /* -- Checkout: find the Shopify variant for the size, make a cart, go */
  async function checkout(p, cw, size) {
    if (!p) return;
    const msg = pdpEl && $('[data-pdp-msg]', pdpEl);
    const say = (t, err) => { if (msg) { msg.textContent = t; msg.classList.toggle('is-error', !!err); } };
    if ((p.sizes || []).length > 1 && !size) { say('Pick a size first.', true); return; }
    // Stripe checkout (no Shopify store yet): kiosk-account.js puts it in the bag and opens Stripe
    const acct = window.KIOSK_ACCOUNT;
    if (acct && acct.buyNow && acct.getState().commerce === 'stripe') { acct.buyNow({ productId: p.id, cw, size }); return; }
    const handle = handleOf(p, cw);
    if (!handle) { if (p.href) location.href = p.href; return; }
    const btn = pdpEl && $('[data-pdp-buy]', pdpEl);
    if (btn) btn.disabled = true;
    say('Opening checkout…');
    try {
      const q = 'query($h:String!){product(handle:$h){variants(first:50){nodes{id availableForSale selectedOptions{name value}}}}}';
      const r = await fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { h: handle } }) });
      const data = await r.json().catch(() => ({}));
      const nodes = (((data.data || {}).product || {}).variants || {}).nodes || [];
      if (!r.ok || !nodes.length) throw new Error('product');
      const want = String(size || '').toUpperCase();
      const v = nodes.find((n) => n.availableForSale && (!want || n.selectedOptions.some((o) => /size/i.test(o.name) && String(o.value).toUpperCase() === want)))
        || (!want && nodes.find((n) => n.availableForSale));
      if (!v) { say(size ? `Size ${size} is sold out in this colour.` : 'Sold out right now.', true); return; }
      const post = (body) => fetch('/api/shopify-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json());
      const created = await post({ action: 'create' });
      const cartId = created.cart && created.cart.id;
      if (!cartId) throw new Error('cart');
      const added = await post({ action: 'add', cartId, variantId: v.id, quantity: 1 });
      const url = (added.cart || {}).checkoutUrl;
      if (!url) throw new Error('checkout');
      if (typeof window.gtag === 'function') window.gtag('event', 'begin_checkout', { items: [{ item_id: p.id, item_name: p.title, item_variant: (wayOf(p, cw).name || ''), price: p.price }] });
      location.href = url;
    } catch (err) {
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      say(local ? 'Checkout only works on the deployed site (it needs the Shopify token).' : 'Checkout is unavailable right now. Please try again in a minute.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ================================================================ PAGES */

  /* ------------------------------------------------------------- home */

  /* ------------------------------------------------------- atlas globe
   * Home page, right under the globe hero. Up to four featured stories are pinned
   * to a spinning wireframe globe at their coordinates (story `geo`), each
   * pin with a thumbnail. Drag to spin, tap a pin.
   * -------------------------------------------------------------------- */
  const HOME_GEO = { lat: 40.71, lon: -74.0 };
  const geoOf = (f) => (f && f.geo) || HOME_GEO;
  const fmtGeo = (g) => `${Math.abs(g.lat).toFixed(2)}° ${g.lat >= 0 ? 'N' : 'S'}, ${Math.abs(g.lon).toFixed(2)}° ${g.lon >= 0 ? 'E' : 'W'}`;
  function worldFeatured() {
    const issue = C.issue || {};
    const slugs = (issue.featured && issue.featured.length) ? issue.featured : [issue.lead].concat((issue.heroSlides || []).map((x) => x.story));
    const list = [];
    slugs.concat(byNewest(features).map((f) => f.slug)).forEach((sl) => { const f = featureBySlug(sl); if (f && !list.includes(f)) list.push(f); });
    return list.slice(0, 4);
  }
  // Thumbnails fan out from their pins so nearby stories never stack
  const NODE_FAN = [[-0.62, -0.5], [0.66, -0.42], [-0.6, 0.48], [0.64, 0.52]];
  function mountWorldLibrary() {
    const sec = $('[data-world-library]');
    if (!sec || sec.dataset.on) return;
    sec.dataset.on = '1';
    const signal = pageAbort.signal;
    const posts = worldFeatured();
    if (!posts.length) { sec.hidden = true; return; }
    const stage = $('[data-wl-stage]', sec);
    const nodesEl = $('[data-wl-nodes]', sec);
    nodesEl.innerHTML = posts.map((f, i) => `
      <a class="k-wl-node${i === 0 ? ' k-wl-node--hero' : ''}" href="${storyHref(f)}" data-wl-node="${i}" aria-label="${esc(f.title || featureName(f))}, ${esc(fmtGeo(geoOf(f)))}">
        <span class="k-wl-node__line" aria-hidden="true"></span>
        <span class="k-wl-node__pin" aria-hidden="true"></span>
        <span class="k-wl-node__card">
          <span class="k-wl-node__thumb" data-wl-thumb="${i}">${featureMedia(f, { meta: '', mark: f.code, cls: 'k-media--clean', style: 'position:absolute;inset:0' })}</span>
          <span class="k-wl-node__label"><b data-wl-title="${i}">${esc(f.title || featureName(f))}</b><small>${esc(fmtGeo(geoOf(f)))}</small></span>
        </span>
      </a>`).join('');
    fill('wl-list', posts.map((f, i) => `<li><a href="${storyHref(f)}" data-wl-item="${i}"><span class="k-wl__n">${pad(i + 1)}</span><span><b>${esc(f.title || featureName(f))}</b><small>${esc([place(f) || f.location, fmtGeo(geoOf(f))].filter(Boolean).join(' · '))}</small></span><span class="k-wl__go" aria-hidden="true">${icon.arrow}</span></a></li>`).join(''));
    const nodes = $$('[data-wl-node]', sec);
    const geos = posts.map(geoOf);

    const first = geos[0];
    let res = 1;
    // The Lost & Found globe's dotted land (KIOSK_WORLD) feeds this globe;
    // if the data cannot load, the wireframe sphere still stands.
    let globe = { stop() {}, face() {}, hold() {} };
    const landReady = window.KIOSK_WORLD && window.KIOSK_WORLD.points
      ? Promise.resolve()
      : loadScript('js/kiosk-world.js').catch(() => {});
    landReady.then(() => {
      if (signal.aborted || !stage.isConnected) return;
      globe = createGlobe($('canvas', stage), {
      interactive: true, max: 3, homeBias: 0.6, scale: 0.36, speed: 0.00012, res: () => res,
      lf: true,
      land: window.KIOSK_WORLD && window.KIOSK_WORLD.points ? window.KIOSK_WORLD.points() : null,
      yaw: -first.lon * Math.PI / 180, pitch: Math.max(0.2, first.lat * Math.PI / 180 * 0.8),
      onFrame: ({ project, R }) => {
        nodes.forEach((n, i) => {
          const g = geos[i];
          const [x, y, z] = project(g.lat, g.lon);
          const d = R * 0.78;
          const ox = NODE_FAN[i][0] * d; const oy = NODE_FAN[i][1] * d;
          const vis = Math.max(0, Math.min(1, (z - 0.05) * 4));
          n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          n.style.setProperty('--ox', `${ox.toFixed(1)}px`); n.style.setProperty('--oy', `${oy.toFixed(1)}px`);
          n.style.setProperty('--len', `${Math.hypot(ox, oy).toFixed(1)}px`);
          n.style.setProperty('--ang', `${Math.atan2(oy, ox).toFixed(4)}rad`);
          n.style.opacity = n.classList.contains('is-holding') ? 1 : vis.toFixed(3);
          n.style.pointerEvents = vis > 0.4 ? '' : 'none';
          n.style.zIndex = String(Math.round(z * 100) + 100);
        });
      },
      });
    });
    signal.addEventListener('abort', () => globe.stop());
    roamGlobe(sec, (r) => { res = r; });
    sec.addEventListener('pointerover', (e) => { const it = e.target.closest('[data-wl-item]'); if (it) { const g = geos[Number(it.dataset.wlItem)]; globe.face(g.lat, g.lon); } }, { signal });
    sec.addEventListener('focusin', (e) => { const it = e.target.closest('[data-wl-item], [data-wl-node]'); if (it) { const g = geos[Number(it.dataset.wlItem || it.dataset.wlNode)]; globe.face(g.lat, g.lon); } }, { signal });

  }

  /* The Atlas globe roams. It settles in the Atlas, then follows the scroll
   * down: it slides out from under the sticky departures board in the Main
   * Concourse and swells into a big faint globe behind the latest stories.
   * Scrolling back up runs the film in reverse. One globe moved FLIP-style:
   * the canvas stays in the Atlas, and a transform on its float carries it
   * to wherever the scroll says it should be (scrubbed between the spots,
   * eased). Reduced motion or Depth: Flat: it just stays in the Atlas. */
  function roamGlobe(sec, setRes) {
    const stage = $('[data-wl-stage]', sec);
    const float = $('[data-wl-float]', sec);
    const nodesEl = $('[data-wl-nodes]', sec);
    const slot = $('[data-roam-slot]');
    const board = $('[data-mount="term-page-board"]');
    const stories = $('[data-home="garage"]');
    if (!stage || !float || REDUCED || prefs.depth === 'off') { if (slot) slot.hidden = true; return; }
    const signal = pageAbort.signal;
    const lerp = (a, b, k) => a + (b - a) * k;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const shown = (el) => el && !el.hidden && el.offsetParent !== null;
    // page geometry, measured on resize (not per frame)
    let G = null;
    const measure = () => {
      G = {
        vh: window.innerHeight, vw: document.documentElement.clientWidth,
        stage: docBox(stage),
        slot: shown(slot) && board ? docBox(slot) : null,
        boardBottom: board ? docBox(board).y + board.offsetHeight : 0,
        stories: shown(stories) ? docBox(stories) : null,
      };
    };
    let lastRes = 1; let wasDocked = null; let shownNodes = -1;
    const update = (y) => {
      if (!G || !G.stage.w) return;
      const { vh, vw } = G; const N = G.stage;
      // every position in page coordinates; only the camera (y) moves
      const ncx = N.x + N.w / 2; const ncy = N.y + N.h / 2;
      const home = { at: ncy - vh / 2, cx: ncx, cy: ncy, w: N.w, o: 1, dock: 1 };
      const spots = [];
      if (G.slot) {
        const S = G.slot;
        // tucked under the board while its bottom edge is low on the screen, out once it's risen past the middle
        const e = clamp01((vh * 0.95 - (G.boardBottom - y)) / (vh * 0.5));
        spots.push({ at: G.boardBottom - vh * 0.45, cx: S.x + S.w / 2, cy: S.y + S.h / 2 - (1 - e) * 0.62 * S.h, w: S.w * (0.8 + 0.2 * e), o: 0.15 + 0.85 * e, dock: 0 });
      }
      if (G.stories) {
        const R = G.stories;
        spots.push({ at: R.y + R.h / 2 - vh / 2, cx: vw / 2, cy: R.y + R.h / 2, w: Math.min(vw * 0.96, Math.max(R.h * 1.25, N.w * 1.3)), o: 0.14, dock: 0 });
      }
      // the full route, top of page to bottom: Atlas home, the slot under
      // the sticky departures board, then the stories backdrop. Whichever
      // way the visitor scrolls, the globe scrubs along the same path.
      const path = [home].concat(spots).sort((m, n) => m.at - n.at);
      let T = path[path.length - 1];
      if (y <= path[0].at) T = path[0];
      else if (y < path[path.length - 1].at) {
        let i = 0; while (y >= path[i + 1].at) i += 1;
        const m = path[i]; const n = path[i + 1];
        const raw = clamp01((y - m.at) / Math.max(1, n.at - m.at));
        const k = ease(raw);
        // cy runs linear, not eased: the spots are about a screen apart, so
        // an eased cy lags the scroll and the globe would drift up behind
        // the sticky board instead of sliding out from under it
        T = { cx: lerp(m.cx, n.cx, k), cy: lerp(m.cy, n.cy, raw), w: lerp(m.w, n.w, k), o: lerp(m.o, n.o, k), dock: lerp(m.dock, n.dock, k) };
      }
      const sc = T.w / N.w;
      const docked = T.dock > 0.999;
      // page-coordinate offsets: the float rides in the page, so the scroll itself never has to be chased
      float.style.transform = docked ? '' : `translate3d(${(T.cx - ncx).toFixed(1)}px, ${(T.cy - ncy).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      float.style.opacity = T.o.toFixed(3);
      if (docked !== wasDocked) { wasDocked = docked; float.style.pointerEvents = docked ? '' : 'none'; sec.classList.toggle('is-docked', docked); }
      // the thumbnails come up as it lands
      const nk = Math.round(clamp01((T.dock - 0.55) / 0.45) * 100) / 100;
      if (nk !== shownNodes) { shownNodes = nk; nodesEl.style.opacity = String(nk); nodesEl.style.visibility = nk < 0.02 ? 'hidden' : ''; }
      // draw finer while it's shown bigger than its canvas (only where the screen isn't already sharp)
      const r2 = sc > 1.15 && (window.devicePixelRatio || 1) < 1.5 ? 1.6 : 1;
      if (r2 !== lastRes) { lastRes = r2; setRes(r2); }
    };
    measured(measure, signal);
    onScrollFrame(update, signal);
    signal.addEventListener('abort', () => { float.style.transform = ''; float.style.opacity = ''; nodesEl.style.opacity = ''; nodesEl.style.visibility = ''; });
  }

  /* The dark stretch of the home page: as the departments come up the
   * screen the page fades to black, stays black through Why the kiosk and
   * fades back as the next section comes up. The black is one fixed layer
   * behind the sections whose opacity follows the scroll (the compositor
   * does that alone, nothing is restyled); the text flips to light once,
   * halfway, with a short CSS transition (html.is-zone-dark). */
  function bindZone() {
    const d = document.documentElement;
    const main = $('main');
    const secs = ['departments', 'about'].map((k) => $(`[data-home="${k}"]`)).filter((s) => s && !s.hidden);
    if (!secs.length || !main) return;
    const signal = pageAbort.signal;
    const layer = document.createElement('div');
    layer.className = 'k-zone'; layer.setAttribute('aria-hidden', 'true');
    main.prepend(layer);
    const c01 = (v) => Math.max(0, Math.min(1, v));
    let boxes = []; let vh = window.innerHeight;
    const measure = () => { vh = window.innerHeight; boxes = secs.map(docBox); };
    let shown = -1; let dark = false;
    const update = (y) => {
      // each dark section: in as its top rises from 90% to 40% of the screen, out as its bottom does
      // (summed, so back-to-back sections hand over without a dip)
      let z = 0;
      boxes.forEach((b) => { const top = b.y - y; z += c01((vh * 0.9 - top) / (vh * 0.5)) * (1 - c01((vh * 0.9 - (top + b.h)) / (vh * 0.5))); });
      z = Math.round(c01(z) * 200) / 200;
      if (z !== shown) { shown = z; layer.style.opacity = String(z); }
      const nowDark = dark ? z > 0.4 : z > 0.6;   // a little hysteresis so it can't flicker at the midpoint
      if (nowDark !== dark) { dark = nowDark; d.classList.toggle('is-zone-dark', dark); }
    };
    measured(measure, signal);
    onScrollFrame(update, signal);
    signal.addEventListener('abort', () => { layer.remove(); d.classList.remove('is-zone-dark'); });
  }

  /* ---------------------------------------------------- why the kiosk
   * Home: a two-sided slider, a quote on one half and a lifestyle photo
   * filling the other (stacked on phones). Readers' own words lead
   * (C.voices), then the KIOSK's: the manifesto line and the Words to wear.
   * It moves on every 7 s (not with reduced motion: play to start it), and
   * holds while hovered, focused, off screen or paused; the arrows (or a
   * swipe) step by hand. */
  const WHY_MS = 7000;
  function mountWhy() {
    const root = mount('why-slider');
    if (!root || root.dataset.on) return;
    root.dataset.on = '1';
    const signal = pageAbort.signal;
    // lifestyle photos: the colourways on location, then the shoots
    const pics = [];
    (C.products || []).forEach((p) => (p.colorways || []).forEach((w) => (w.lifestyle || []).forEach((src) => pics.push(src))));
    features.forEach((f) => (f.gallery || []).slice(0, 2).forEach((g) => pics.push(typeof g === 'string' ? g : g.src)));
    if (!pics.length && features[0] && features[0].image) pics.push(features[0].image);
    const slides = (C.voices || []).filter((v) => v && v.quote)
      .map((v) => ({ quote: v.quote, name: v.name || 'A reader', meta: [v.place, v.role].filter(Boolean).join(' · '), img: v.image || (featureBySlug(v.story) || {}).image }))
      .concat({ quote: 'Pick it up at the kiosk, get lost in a world you never knew existed — then go and find it.', name: 'The KIOSK', meta: 'For anyone, any age, anywhere' })
      .concat((C.products || []).filter((p) => p.quote && p.category === 'quotes').slice(0, 4)
        .map((p) => ({ quote: p.quote, name: 'Words to wear', meta: `On the ${p.title}`, href: `vault.html?c=quotes#${p.id}` })));
    // step through the photos so neighbouring slides never look alike
    slides.forEach((sl, i) => { if (!sl.img && pics.length) sl.img = pics[(i * 5) % pics.length]; });
    const n = slides.length;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Why the kiosk');
    root.innerHTML = `
      <div class="k-why__grid">
        <div class="k-why__media" aria-hidden="true">${slides.map((sl, i) => `<span class="k-why__img${i ? '' : ' is-on'}" data-why-img="${i}">${sl.img ? `<img src="${esc(sl.img)}" alt="" loading="${i ? 'lazy' : 'eager'}" decoding="async">` : ''}</span>`).join('')}</div>
        <div class="k-why__side">
          <div class="k-why__slides" data-why-slides aria-live="off">${slides.map((sl, i) => `
            <figure class="k-why__slide${i ? '' : ' is-on'}" data-why-slide="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}"${i ? ' aria-hidden="true"' : ''}>
              <blockquote class="k-why__quote"><p>“${esc(sl.quote)}”</p></blockquote>
              <figcaption class="k-why__who"><b>${esc(sl.name)}</b>${sl.meta ? `<span>${sl.href ? `<a href="${esc(sl.href)}"${i ? ' tabindex="-1"' : ''}>${esc(sl.meta)}</a>` : esc(sl.meta)}</span>` : ''}</figcaption>
            </figure>`).join('')}</div>
          ${n > 1 ? `<div class="k-why__ui">
            <span class="k-why__count" aria-hidden="true"><b data-why-n>01</b> / ${pad(n)}</span>
            <span class="k-why__bar" aria-hidden="true"><i data-why-bar></i></span>
            <button class="k-hscroll__btn" type="button" data-why-prev aria-label="Previous quote">${ARROW_L}</button>
            <button class="k-hscroll__btn" type="button" data-why-play aria-label="Pause the slides">${icon.pause}</button>
            <button class="k-hscroll__btn" type="button" data-why-next aria-label="Next quote">${ARROW_R}</button>
          </div>` : ''}
        </div>
      </div>`;
    if (n < 2) return;
    const slidesEl = $('[data-why-slides]', root);
    const bar = $('[data-why-bar]', root);
    const playBtn = $('[data-why-play]', root);
    let cur = 0; let elapsed = 0; let last = 0; let raf = 0;
    let paused = REDUCED; let hold = false; let seen = false;
    const go = (i, byHand) => {
      cur = (i + n) % n; elapsed = 0;
      $$('[data-why-slide]', root).forEach((el, k) => {
        const on = k === cur;
        el.classList.toggle('is-on', on);
        if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
        $$('a', el).forEach((a) => { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); });
      });
      $$('[data-why-img]', root).forEach((el, k) => el.classList.toggle('is-on', k === cur));
      $('[data-why-n]', root).textContent = pad(cur + 1);
      // announce a slide someone asked for, not the ones that turn on their own
      slidesEl.setAttribute('aria-live', byHand ? 'polite' : 'off');
      bar.style.transform = 'scaleX(0)';
      wake();
    };
    const running = () => !paused && !hold && seen && !document.hidden;
    const tick = (now) => {
      raf = 0;
      const dt = last ? now - last : 0; last = now;
      if (!running()) { last = 0; return; }
      elapsed += dt;
      bar.style.transform = `scaleX(${Math.min(1, elapsed / WHY_MS).toFixed(4)})`;
      if (elapsed >= WHY_MS) go(cur + 1, false);
      else raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (running() && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
    const setPaused = (v) => {
      paused = v;
      playBtn.innerHTML = v ? icon.play : icon.pause;
      playBtn.setAttribute('aria-label', v ? 'Play the slides' : 'Pause the slides');
      root.classList.toggle('is-paused', v);
      wake();
    };
    setPaused(paused);
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-why-prev]')) go(cur - 1, true);
      else if (e.target.closest('[data-why-next]')) go(cur + 1, true);
      else if (e.target.closest('[data-why-play]')) setPaused(!paused);
    }, { signal });
    // hold while someone's reading or tabbing through it
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hold = true; } }, { signal });
    root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hold = false; wake(); } }, { signal });
    root.addEventListener('focusin', () => { hold = true; }, { signal });
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { hold = false; wake(); } }, { signal });
    // swipe the photo or the quote on touch screens
    let sx = null;
    root.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true, signal });
    root.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 48) go(cur + (dx < 0 ? 1 : -1), true); }, { passive: true, signal });
    document.addEventListener('visibilitychange', wake, { signal });
    const io = new IntersectionObserver(([en]) => { seen = en.isIntersecting; wake(); }, { threshold: 0.35 });
    io.observe(root);
    signal.addEventListener('abort', () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); });
  }

  function pageHome() {
    const issue = C.issue || {};
    const lead = featureBySlug(issue.lead) || features[0];
    if (!lead) return;

    mountGlobeHero();
    mountWorldLibrary();
    mountWhy();
    bindZone();
    fill('hero-dek', esc(issue.dek || ''));
    fill('hero-stats', `
      <div><dt>Now showing</dt><dd>${esc(lead.title)} · ${esc([lead.make, lead.code].filter(Boolean).join(' '))}</dd></div>
      <div><dt>Location</dt><dd>${esc(place(lead) || lead.location)}</dd></div>
      <div><dt>Shot on</dt><dd>${esc(lead.shotOn)}</dd></div>
      <div><dt>Owner</dt><dd>${esc((lead.owner || {}).name || '—')}</dd></div>`);
    fill('hero-aside', `
      <a class="k-feature-card k-glass k-glass--dark" href="${storyHref(lead)}">
        <p class="k-feature-card__title">${esc(featureName(lead))}</p>
        <p class="k-feature-card__sub">${[formatLabel(lead), place(lead), lead.runtime].filter(Boolean).map(esc).join(' · ')}</p>
        ${featureMedia(lead, { meta: '' })}
      </a>
      <a class="k-bar" href="atlas.html">Open the Atlas<span class="k-arrow">${icon.arrow}</span></a>`);
    // Latest stories: the same rail (and card size) as the departments, with a type filter
    const railEl = mount('garage-rail');
    const renderRail = (type) => {
      const list = features.filter((f) => type === 'all' || f.type === type);
      const track = $('[data-hscroll]', railEl);
      if (!track) railEl.innerHTML = railShell(list.map(featureCard).join(''), 'Latest stories', 'k-hscroll-wrap--depts k-hscroll-wrap--stories');
      else {
        track.innerHTML = list.map(featureCard).join('');
        track.scrollLeft = 0;
        track.dispatchEvent(new Event('scroll'));   // re-measure the arrows and progress bar
      }
      reveal(railEl);
    };
    if (railEl) {
      renderRail('all');
      const seg = mount('garage-seg');
      if (seg) {
        seg.addEventListener('click', (e) => {
          const b = e.target.closest('button[data-type]');
          if (!b) return;
          $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          renderRail(b.dataset.type);
        });
      }
    }

    // Films
    const films = features.filter((f) => (f.media || []).includes('film'));
    const filmLead = films[0];
    if (filmLead) {
      fill('films-lead', `
        ${featureMedia(filmLead, { meta: '' })}
        <div class="k-films__lead-over">
          <div class="k-glass k-glass--dark">
            <p class="k-eyebrow">${[`Featured film`, filmLead.runtime].filter(Boolean).map(esc).join(' · ')}</p>
            <p class="k-h3 k-mt-s">${esc(filmLead.title)}</p>
            <p class="k-small k-mt-s">${esc(filmLead.excerpt || filmLead.tagline)}</p>
          </div>
          <button class="k-round" type="button" data-film="${esc(filmLead.slug)}" aria-label="Play ${esc(filmLead.title)}">${icon.play}</button>
        </div>`);
      fill('films-rows', films.slice(0, 5).map(filmRow).join(''));
    }
    fillVimeo('films-vimeo');

    // Magazine: departments rail + mosaic board
    fill('departments', railShell(departmentsHtml(), 'Departments', 'k-hscroll-wrap--depts'));
    fillMosaic('home-mosaic', mosaicItems(null, 24), { label: 'The Mosaic' });

    // Radio
    const radio = fill('radio', radioBlock((C.mixes || [])[0] && C.mixes[0].slug));
    bindRadio(radio);

    // Shop preview — the newest physical drop
    const picks = (C.products || [])
      .filter((p) => !['mixes', 'films', 'luts'].includes(p.category))
      .slice().sort((a, b) => (lifeOf(b, 0).length > 0) - (lifeOf(a, 0).length > 0) || String(b.added || '').localeCompare(String(a.added || '')))
      .slice(0, 8);
    fill('vault', picks.map((p) => termCard(p)).join(''));
    const wall = mount('home-wall');
    if (wall) wall.innerHTML = wallHtml();
  }

  /* ------------------------------------------------------------ films
   * films.html: the screening room. A billboard for the featured film and
   * streaming-style rows (C.filmRows / C.films). Films with no video yet
   * are "Coming soon" placeholders that sign people up for the drop.
   * -------------------------------------------------------------------- */
  const filmStory = (fm) => (fm.story ? featureBySlug(fm.story) : null);
  const filmPlayable = (fm) => { const f = filmStory(fm); return !!(fm.vimeo || fm.youtube || fm.video || (f && (f.vimeo || f.embed || f.video))); };
  function playFilm(fm) {
    const f = filmStory(fm);
    if (fm.vimeo) return openVimeo({ ...fm.vimeo, title: fm.title, story: fm.story, aspect: fm.aspect });
    if (fm.youtube || fm.video) {
      player.pause();
      const screen = fm.youtube
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(fm.youtube)}?autoplay=1&rel=0" title="${esc(fm.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${esc(fm.video)}" ${fm.poster ? `poster="${esc(fm.poster)}"` : ''} controls autoplay playsinline></video>`;
      return openLightbox(`<div class="k-lightbox__head"><div><p class="k-eyebrow">Screening room</p><p class="k-h3 k-mt-s">${esc(fm.title)}</p></div><button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button></div><div class="k-lightbox__screen">${screen}</div>`, fm.title);
    }
    if (f && (f.vimeo || f.embed || f.video)) return f.vimeo ? openVimeo({ ...f.vimeo, title: fm.title, story: f.slug, aspect: fm.aspect }) : openFilm(f);
    return openNotify(`film:${fm.id}`, fm.title);
  }
  function filmTile(fm, i) {
    const f = filmStory(fm);
    const img = fm.poster || (f && f.image) || '';
    const vid = fm.vimeo || (f && f.vimeo);
    const ready = filmPlayable(fm);
    return `<button type="button" class="k-ftile" data-film-id="${esc(fm.id)}" aria-label="${esc(fm.title)}${ready ? '' : ', coming soon'}" style="--i:${i}">
      <span class="k-ftile__media">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">`
        : `<span class="plate plate--${esc(fm.tone || 'graphite')}"${vid ? ` data-film-cover="${esc(vid.id)}" data-film-hash="${esc(vid.hash || '')}"` : ''}><span class="plate__mark">${esc(fm.title.split(/[\s:·]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase())}</span></span>`}
        <span class="k-ftile__play" aria-hidden="true">${ready ? '▶' : '+'}</span>
        ${ready ? '' : '<span class="k-ftile__soon">Coming soon</span>'}
      </span>
      <span class="k-ftile__info"><b>${esc(fm.title)}</b><small>${esc([fm.runtime, fm.year || (f && f.published ? String(f.published).slice(0, 4) : ''), f ? f.city : ''].filter(Boolean).join(' · ') || (ready ? 'Now showing' : 'In production'))}</small></span>
    </button>`;
  }
  function hydrateFilmCovers(root) {
    $$('[data-film-cover]', root).forEach((plate) => {
      vimeoInfo({ id: plate.dataset.filmCover, hash: plate.dataset.filmHash }).then((d) => {
        if (!d || !d.thumbnail_url || !plate.isConnected) return;
        const img = document.createElement('img'); img.src = d.thumbnail_url; img.alt = ''; img.decoding = 'async';
        plate.replaceWith(img);
      }).catch(() => {});
    });
  }
  function pageFilms() {
    const films = C.films || [];
    const signal = pageAbort.signal;
    const lead = films.find((x) => x.featured && filmPlayable(x)) || films.find(filmPlayable) || films[0];
    if (lead) {
      const f = filmStory(lead);
      const img = lead.poster || (f && f.image) || '';
      fill('films-billboard', `
        <div class="k-billboard__media">${img ? `<img src="${esc(img)}" alt="" decoding="async">` : `<span class="plate plate--${esc(lead.tone || 'graphite')}"${lead.vimeo ? ` data-film-cover="${esc(lead.vimeo.id)}" data-film-hash="${esc(lead.vimeo.hash || '')}"` : ''}></span>`}</div>
        <div class="k-billboard__shade" aria-hidden="true"></div>
        <div class="k-wrap k-billboard__inner">
          <p class="k-term__strip"><span class="k-term__t">T2</span><span>Screening room · now showing</span><span class="k-term__clock"><span data-clock>--:--:--</span> <small data-clock-zone></small></span></p>
          <h1 class="k-billboard__title">${esc(lead.title)}</h1>
          <p class="k-billboard__meta">${esc([lead.runtime, f && f.published ? String(f.published).slice(0, 4) : '', f ? f.city : '', 'KIOSK Films'].filter(Boolean).join(' · '))}</p>
          ${lead.blurb ? `<p class="k-billboard__blurb">${esc(lead.blurb)}</p>` : ''}
          <div class="k-billboard__cta">
            <button class="k-btn k-btn--solid" type="button" data-film-id="${esc(lead.id)}"><span aria-hidden="true">▶</span> Play</button>
            ${f ? `<a class="k-btn" href="${storyHref(f)}">Read the story</a>` : ''}
          </div>
        </div>`);
    }
    const rows = (C.filmRows || []).map((r) => ({ ...r, list: films.filter((x) => (x.rows || []).includes(r.id)) })).filter((r) => r.list.length);
    fill('films-rows', rows.map((r) => `
      <div class="k-wrap k-frow" data-reveal>
        <div class="k-frow__head"><h2 class="k-frow__title">${esc(r.title)}</h2><span class="k-frow__count">${r.list.length}</span></div>
        ${railShell(r.list.map(filmTile).join(''), r.title, 'k-hscroll-wrap--films')}
      </div>`).join(''));
    hydrateFilmCovers($('main') || document);
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-film-id]');
      if (!t) return;
      const fm = films.find((x) => x.id === t.dataset.filmId);
      if (fm) playFilm(fm);
    }, { signal });
  }

  /* ------------------------------------------------------------ story */

  function pageStory() {
    const slug = new URLSearchParams(location.search).get('s');
    const f = featureBySlug(slug) || features[0];
    if (!f) return;

    document.title = `${f.title && f.title !== featureName(f) ? `${f.title} — ` : ''}${featureName(f)} · KIOSK`;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', f.excerpt || f.tagline || '');

    const frames = (f.gallery || []).map((g) => (typeof g === 'string' ? { src: g } : g));
    const hasFilm = !!(f.video || f.embed) || (f.media || []).includes('film');
    const soundtrack = mixBySlug(f.soundtrack);
    const lut = productById(f.gradedWith);
    const filmProduct = productById(f.filmProduct);

    // COVER: full-bleed photograph, title out of a mask, byline
    const kicker = [DESKS[f.desk], place(f), formatLabel(f)].filter(Boolean);
    fill('story-hero', `
      <div class="k-ed-hero__media" data-parallax="0.3">${featureMedia(f, { meta: '', mark: '', eager: true, cls: 'k-media--clean' })}</div>
      <div class="k-ed-hero__shade" aria-hidden="true"></div>
      <div class="k-wrap k-ed-hero__inner">
        <p class="k-ed-kicker">${kicker.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
        <h1 class="k-ed-hero__title" data-ed="mask">${esc(f.title || featureName(f))}</h1>
        <p class="k-ed-hero__sub">${featureName(f) !== f.title ? `${esc(featureName(f))} — ` : ''}<em class="k-serif">${esc(f.tagline || '')}</em></p>
        <div class="k-ed-hero__foot">
          <p class="k-ed-meta"><span>Words &amp; pictures <b>${esc(f.author || 'KIOSK')}</b></span>${f.published ? `<span>${esc(longDate(f.published))}</span>` : ''}<span>${readMinutes(f)} min read</span>${f.code ? `<span>KSK ${esc(f.code)}</span>` : ''}</p>
          <div class="k-ed-hero__cta">
            ${hasFilm ? `<button class="k-ed-link" type="button" data-film="${esc(f.slug)}">${icon.play} Watch the film</button>` : ''}
            <a class="k-ed-link" href="#look">Shop the look ${icon.arrow}</a>
          </div>
        </div>
      </div>
      <span class="k-ed-hero__cue" aria-hidden="true"><i></i>Scroll</span>`);

    // STANDFIRST + AT A GLANCE
    fill('story-standfirst', esc(f.excerpt || f.tagline || ''));
    fill('story-specs', (f.specs || []).map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join(''));

    // SHOOT NOTES
    fill('story-aside', `
      <dl class="k-ed-notes">
        <div><dt>Subject</dt><dd>${esc(featureName(f))}</dd></div>
        ${(f.owner || {}).name ? `<div><dt>Owner</dt><dd>${esc(f.owner.name)}</dd></div>` : ''}
        ${f.location ? `<div><dt>Location</dt><dd>${esc(f.location)}</dd></div>` : ''}
        ${place(f) ? `<div><dt>Area</dt><dd>${esc(place(f))}</dd></div>` : ''}
        ${f.coords ? `<div><dt>Coordinates</dt><dd class="k-mono">${esc(f.coords)}</dd></div>` : ''}
        ${f.shotOn ? `<div><dt>Shot on</dt><dd>${esc(f.shotOn)}</dd></div>` : ''}
        ${f.lens ? `<div><dt>Lens</dt><dd>${esc(f.lens)}</dd></div>` : ''}
        ${f.runtime ? `<div><dt>Runtime</dt><dd>${esc(f.runtime)}</dd></div>` : ''}
        ${f.published ? `<div><dt>Shot</dt><dd>${esc(new Date(`${f.published}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</dd></div>` : ''}
      </dl>
      ${soundtrack ? `<button class="k-bar" type="button" data-mix-play="${esc(soundtrack.slug)}" style="width:100%;text-align:left"><span>Soundtrack<small>${esc(soundtrack.title)} ${esc(soundtrack.volume)} · KIOSK Radio</small></span><span class="k-arrow" data-ico>${icon.play}</span></button>` : ''}
      ${lut ? `<a class="k-bar" href="vault.html?c=luts#${esc(lut.id)}"><span>Graded with<small>${esc(lut.title)} · ${esc(price(lut))}</small></span><span class="k-arrow">${icon.arrow}</span></a>` : ''}
      ${filmProduct ? `<button class="k-bar" type="button" data-notify="${esc(filmProduct.id)}" data-notify-title="${esc(filmProduct.title)}" style="width:100%;text-align:left"><span>Own the film<small>${esc(filmProduct.detail)} · ${esc(price(filmProduct))}</small></span><span class="k-arrow">${icon.arrow}</span></button>` : ''}
      <button class="k-btn" type="button" data-save="${esc(f.slug)}" aria-pressed="${saved.has(f.slug)}">${icon.heart.replace('<svg', '<svg width="16" height="16"')} Save to your garage</button>`);

    // THE READ: a text block followed by a photograph becomes a spread (sides
    // alternate); lone photographs go full-bleed then inset in turn; two in a
    // row become a pair. Written chapters each take a gallery frame the body
    // hasn't used, and one more closes the read full-bleed.
    const story = f.story || [];
    const inline = new Set(story.filter((b) => b.type === 'image').map((b) => b.src));
    const spare = frames.filter((fr) => fr.src && !inline.has(fr.src) && fr.src !== f.image);
    let figN = 0; let spreadN = 0; let soloN = 0; let dropCap = true;
    const fig = (b, cls = '') => `
      <figure class="k-ed-fig${cls}">
        <div class="k-ed-fig__media" data-ed="img"><div class="k-ed-par" data-parallax="0.06">${media({ image: b.src, tone: f.tone, alt: b.caption || featureName(f), cls: 'k-media--clean' })}</div></div>
        ${b.caption ? `<figcaption><b>${pad(++figN)}</b><span>${esc(b.caption)}</span></figcaption>` : ''}
      </figure>`;
    const text = (b) => {
      const cls = dropCap ? ' k-ed-text--first' : '';
      dropCap = false;
      return `<div class="k-ed-text${cls}">${b.lead ? `<h3 class="k-ed-sub" data-ed="mask">${esc(b.lead)}</h3>` : ''}<p>${esc(b.body || b.text || '')}</p></div>`;
    };
    const solo = (b) => (soloN++ % 2 === 0 ? fig(b, ' k-ed-fig--full') : `<div class="k-wrap k-ed-inset">${fig(b)}</div>`);
    const quote = (q, cite) => `<blockquote class="k-wrap k-ed-quote"><p data-ed="mask">“${esc(q)}”</p>${cite ? `<cite>— ${esc(cite)}</cite>` : ''}</blockquote>`;
    const flow = [];
    for (let i = 0; i < story.length; i++) {
      const b = story[i];
      const nx = story[i + 1];
      if (b.type === 'image') {
        if (nx && nx.type === 'image') { flow.push(`<div class="k-wrap k-ed-pair">${fig(b)}${fig(nx)}</div>`); i++; } else flow.push(solo(b));
      } else if (b.type === 'quote') flow.push(quote(b.text, b.cite));
      else if (b.type === 'heading') flow.push(`<div class="k-wrap k-ed-measure"><h3 class="k-ed-sub" data-ed="mask">${esc(b.text)}</h3></div>`);
      else if (nx && nx.type === 'image') { flow.push(`<section class="k-wrap k-ed-spread${spreadN++ % 2 ? ' k-ed-spread--l' : ''}">${text(b)}${fig(nx)}</section>`); i++; }
      else flow.push(`<div class="k-wrap k-ed-measure">${text(b)}</div>`);
    }
    if (f.owner && f.owner.quote && !story.some((b) => b.type === 'quote')) flow.splice(Math.min(2, flow.length), 0, quote(f.owner.quote, f.owner.name));
    if (!story.length) flow.push(`<div class="k-wrap k-ed-measure">${text({ lead: f.tagline, body: f.excerpt || '' })}</div>`);

    const done = written(f);
    (f.chapters || []).forEach((c, n) => {
      const body = paragraphs(c.body);
      if (body.length) {
        flow.push(`<section class="k-wrap k-ed-measure k-ed-chapter" id="${esc(c.id)}">
          <p class="k-ed-chapter__num">Chapter ${pad(n + 1)}</p>
          <h3 data-ed="mask">${esc(c.heading)}</h3>
          ${body.map((t) => `<p>${esc(t)}</p>`).join('')}
        </section>`);
        if (spare.length) flow.push(solo(spare.shift()));
      } else if (DRAFT) {
        flow.push(`<section class="k-wrap k-ed-measure"><div class="k-ed-chapter k-ed-chapter--draft" id="${esc(c.id)}">
          <p class="k-ed-chapter__num">Chapter ${pad(n + 1)} · <code>${esc(c.id)}</code> · not written yet</p>
          <h3>${esc(c.heading)}</h3>
          <p>${esc(c.prompt || '')}</p>
        </div></section>`);
      }
    });
    if (spare.length) flow.push(fig(spare[Math.floor(spare.length / 2)], ' k-ed-fig--full'));
    const pending = (f.chapters || []).length - done.length;
    if (DRAFT) flow.unshift(`<p class="k-wrap k-ed-measure k-ed-label">Draft view: ${done.length} of ${(f.chapters || []).length} chapters written</p>`);
    else if (pending > 0) flow.push(`<p class="k-wrap k-ed-measure"><span class="k-ed-note k-small" style="display:block">${done.length ? 'More chapters' : 'The full story'} coming soon, told by ${esc(f.author || 'KIOSK')}.</span></p>`);
    fill('story-body', flow.join(''));

    // TIMELINE
    const tl = f.timeline || [];
    const tlEl = fill('story-timeline', tl.map((t) => `<li><b>${esc(t.year)}</b><span>${esc(t.label)}</span></li>`).join(''));
    if (tlEl) tlEl.style.setProperty('--n', String(Math.max(tl.length, 1)));

    // SPEC SHEET (schematic, numbers and facts per machine)
    const machines = (f.machines || []).map(machineById).filter(Boolean);
    if (machines.length) {
      fill('story-machines', machines.map((m) => `
        <article class="k-machine k-glass" data-reveal>
          ${machinePlates(m)}
          <div class="k-machine__body">
            <p class="k-eyebrow">${esc(m.make)} · ${esc(m.years || '')}</p>
            <h3>${esc(m.model)}</h3>
            <dl class="k-machine__stats">${(m.stats || []).map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
            ${(m.facts || []).length ? `<ul class="k-machine__facts">${m.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            ${m.manual ? `<a class="k-bar k-machine__manual" href="${esc(m.manual.url)}" target="_blank" rel="noopener"><span>Factory drawings<small>${esc(m.manual.label)} · parts-location pages</small></span><span class="k-arrow">${icon.arrow}</span></a>` : ''}
            ${m.street ? `<a class="k-bar k-machine__manual" href="the-garage.html#${esc(m.id)}"><span>Read the Street File<small>${esc(m.street.role)} · strip numbers and lesser-known facts</small></span><span class="k-arrow">${icon.arrow}</span></a>` : ''}
            ${(m.sources || []).length ? `<p class="k-machine__sources">Sources: ${m.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join(' · ')}</p>` : ''}
          </div>
        </article>`).join(''));
      inlineSchematics();
    } else hideSection('machines');

    // SUBJECTS
    const subj = f.subjects || [];
    if (subj.length) {
      fill('story-subjects', subj.map((s) => `
        <article class="k-subject k-glass" data-reveal>
          <span class="k-subject__avatar" aria-hidden="true">${esc((s.name || '?').charAt(0))}</span>
          <div><h3>${esc(s.name)}</h3><p class="k-eyebrow">${esc(s.role || '')}</p></div>
          ${s.bio ? `<p class="k-body">${esc(s.bio)}</p>` : ''}
        </article>`).join(''));
    } else hideSection('subjects');

    // GALLERY: a swipe rail of every frame (palette plates while photos are in post)
    const palette = f.palette || [];
    const slides = frames.length ? frames : palette.slice(0, 6).map((c) => ({
      src: '',
      caption: `${c.name}${c.note ? ` — ${c.note}` : ''}`,
      meta: 'Awaiting upload',
      swatch: c.hex,
    }));
    if (slides.length) {
      const gal = fill('story-gallery', railShell(slides.map((sl, i) => `
        <figure class="k-ed-slide">
          <div class="k-ed-slide__media">${media({ image: sl.src, tone: f.tone, swatch: sl.swatch, alt: sl.caption || featureName(f), cls: 'k-media--clean' })}</div>
          <figcaption><b>${pad(i + 1)}</b><span>${esc(sl.caption || '')}${sl.meta ? `<small>${esc(sl.meta)}</small>` : ''}</span></figcaption>
        </figure>`).join(''), `${featureName(f)} gallery`, 'k-hscroll-wrap--ed'));
      const ui = gal && $('.k-hscroll__ui', gal);
      if (ui) ui.insertAdjacentHTML('afterbegin', `<span class="k-hscroll__count" data-ed-count>01 / ${pad(slides.length)}</span>`);
    } else hideSection('gallery');

    // PALETTE
    if (palette.length) {
      fill('story-palette', palette.map((c) => `
        <button class="k-swatch" type="button" data-copy="${esc(c.hex)}" aria-label="Copy ${esc(c.name)} ${esc(c.hex)}">
          <span class="k-swatch__chip" style="--swatch:${esc(c.hex)}"></span>
          <span class="k-swatch__body">
            <span class="k-swatch__name" style="display:block">${esc(c.name)}</span>
            <span class="k-swatch__hex">${esc(c.hex)} ${icon.copy}</span>
            ${c.note ? `<span class="k-swatch__note" style="display:block">${esc(c.note)}</span>` : ''}
          </span>
        </button>`).join(''));
    } else hideSection('palette');

    // BTS
    const bts = f.bts || {};
    const btsCards = [];
    if ((bts.crew || []).length) btsCards.push(`<div class="k-bts__card k-glass" data-reveal><h3>Crew</h3><ul>${bts.crew.map((c) => `<li><span>${esc(c.role)}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    if ((bts.gear || []).length) btsCards.push(`<div class="k-bts__card k-bts__gear k-glass" data-reveal data-reveal-delay="1"><h3>Kit</h3><ul>${bts.gear.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>`);
    if ((bts.conditions || []).length) btsCards.push(`<div class="k-bts__card k-glass" data-reveal data-reveal-delay="2"><h3>Conditions</h3><ul>${bts.conditions.map((c) => `<li><span>${esc(c.label)}</span>${esc(c.value)}</li>`).join('')}</ul></div>`);
    if (bts.notes) btsCards.push(`<div class="k-bts__card k-bts__notes k-glass" data-reveal><h3>Notes from set</h3><p class="k-prose__text" style="font-size:clamp(16px,1.4vw,19px)">${esc(bts.notes)}</p></div>`);
    if ((bts.driveClips || []).length) {
      const dc = bts.driveClips;
      btsCards.push(`<div class="k-bts__notes"><h3 class="k-bts__label">Raw footage · ${dc.length} clips · ${esc(dc[0].time.slice(0, 5))}–${esc(dc[dc.length - 1].time.slice(0, 5))}</h3>${railShell(dc.map((c, i) => `
        <button class="k-reel__clip" type="button" data-drive-clip="${esc(c.id)}" data-drive-title="${esc(`Clip ${c.clip} · ${c.time}`)}" aria-label="Play clip ${esc(c.clip)} from ${esc(c.time)}">
          <span class="k-reel__time">${esc(c.time.slice(0, 5))}<small>${esc(c.time.slice(6))}s</small></span>
          <span class="k-reel__play" aria-hidden="true">${icon.play}</span>
          <span class="k-reel__meta">Clip ${esc(c.clip)}<small>${pad(i + 1)} / ${pad(dc.length)}</small></span>
        </button>`).join(''), 'Raw footage', 'k-hscroll-wrap--reel')}</div>`);
    }
    if ((bts.clips || []).length) btsCards.push(`<div class="k-bts__notes"><h3 class="k-bts__label">Raw footage</h3><div class="k-grid">${bts.clips.map((c) => `<figure class="k-bts__clip"><div class="k-card"><div class="k-media" style="aspect-ratio:16/9"><video${c.poster ? ` poster="${esc(c.poster)}"` : ''} autoplay muted loop playsinline preload="metadata" aria-label="${esc(c.caption || 'Behind the scenes clip')}">${c.webm ? `<source src="${esc(c.webm)}" type="video/webm">` : ''}<source src="${esc(c.src)}" type="video/mp4"></video></div></div>${c.caption || c.meta ? `<figcaption>${esc(c.caption || '')}${c.meta ? `<span>${esc(c.meta)}</span>` : ''}</figcaption>` : ''}</figure>`).join('')}</div></div>`);
    if ((bts.frames || []).length) btsCards.push(`<div class="k-bts__notes"><div class="k-grid">${bts.frames.map((src) => `<div class="k-card"><div class="k-media" style="aspect-ratio:4/3"><img src="${esc(src)}" alt="Behind the scenes" loading="lazy"></div></div>`).join('')}</div></div>`);
    if (btsCards.length) fill('story-bts', btsCards.join('')); else hideSection('bts');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $$('.k-bts__clip video').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
    }

    // INTERVIEW
    if ((f.interview || []).length) {
      fill('story-qa', f.interview.map((x) => `<div class="k-qa__item" data-reveal><p class="k-qa__q">Q — ${esc(x.q)}</p><p class="k-qa__a">${esc(x.a)}</p></div>`).join(''));
      fill('story-qa-title', `In conversation with <span class="k-serif">${esc((f.owner || {}).name || 'the owner')}</span>`);
    } else hideSection('interview');

    // SHOP THE LOOK
    const look = shopTheLook(f, 4);
    if (look.length) {
      fill('story-look', look.map(({ p, reasons, colorway }) => productCard(p, { reasons, colorway })).join(''));
      fill('story-look-why', `Matched to this story’s ${[f.season, ...(f.vibes || []).slice(0, 2)].filter(Boolean).map(esc).join(', ')} mood and colour guide.`);
    } else hideSection('look');

    // CONTACT SHEET + KEEP READING
    fillMosaic('story-mosaic', mosaicItems(f.slug), { filters: false, label: 'Contact sheet' });
    const others = features.filter((x) => x !== f);
    if (others.length) fill('story-more', railShell(others.map(featureCard).join(''), 'More stories', 'k-hscroll-wrap--cards'));
    else { const m = mount('story-more'); if (m) m.closest('section').hidden = true; }

    // PREV / NEXT
    const idx = features.indexOf(f);
    const prev = features[(idx - 1 + features.length) % features.length];
    const next = features[(idx + 1) % features.length];
    if (features.length > 1) {
      fill('story-pager', `
        <a class="k-ed-next k-dark" href="${storyHref(next)}">
          <span class="k-ed-next__media" data-ed="img">${featureMedia(next, { meta: '', mark: '', cls: 'k-media--clean' })}</span>
          <span class="k-ed-label">Next story</span>
          <span class="k-ed-next__title">${esc(next.title || next.model)}</span>
          <span class="k-ed-next__sub">${esc([featureName(next) !== next.title ? featureName(next) : '', next.tagline].filter(Boolean).join(' — '))}</span>
          <span class="k-ed-link">Read the story ${icon.arrow}</span>
        </a>
        ${prev !== next ? `<a class="k-ed-prev" href="${storyHref(prev)}">← Previous: ${esc(prev.title || prev.model)}</a>` : ''}`);
    }

    // JSON-LD for search engines
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': hasFilm ? 'VideoObject' : 'Article',
      name: `${f.title} — ${featureName(f)}`,
      headline: `${f.title} — ${featureName(f)}`,
      description: f.excerpt || f.tagline,
      datePublished: f.published,
      uploadDate: f.published,
      thumbnailUrl: f.image ? new URL(f.image, location.href).href : undefined,
      contentLocation: { '@type': 'Place', name: [f.location, f.city].filter(Boolean).join(', ') },
      publisher: { '@type': 'Organization', name: 'KIOSK' },
    });
    ld.id = 'k-ld';
    const oldLd = document.getElementById('k-ld');
    if (oldLd) oldLd.remove();
    document.head.append(ld);
  }

  /* ----------------------------------------------------------- garage */

  // Factory drawing (if any) above the dimensioned schematic
  function machinePlates(m) {
    return `<div class="k-machine__plans">
      ${m.factory ? `<figure class="k-machine__factory">
        <div class="k-machine__paper"><img src="${esc(m.factory.src)}" alt="${esc(`${m.make} ${m.model}: ${m.factory.caption}`)}" loading="lazy"></div>
        <figcaption>Factory drawing · ${esc(m.factory.caption)}<span>${esc(m.factory.credit)}</span></figcaption>
      </figure>` : ''}
      <figure class="k-machine__plan">
        <div class="k-machine__svg" data-schematic="${esc(m.schematic)}"><img src="${esc(m.schematic)}" alt="${esc(`${m.make} ${m.model} side-elevation schematic`)}" loading="lazy"></div>
        <figcaption>${esc(`${m.make} ${m.model}`)}${m.drawn ? ` · drawn as ${esc(m.drawn)}` : ''} · dimensions in mm</figcaption>
      </figure>
    </div>`;
  }

  // Swap each schematic <img> for the inline SVG so its lines follow the page ink (day/night)
  function inlineSchematics(root = document) {
    $$('[data-schematic]', root).forEach((el) => {
      fetch(el.dataset.schematic).then((r) => (r.ok ? r.text() : '')).then((svg) => {
        if (svg.trim().startsWith('<svg')) el.innerHTML = svg;
      }).catch(() => {});
    });
  }

  const machineStories = (m) => features.filter((f) => (f.machines || []).includes(m.id));

  function pageGarage() {
    const list = (C.machines || []).filter((m) => m.street);
    const quarter = (m) => (m.street.numbers || []).find((n) => /¼/.test(n.label));
    fill('garage-count', `${list.length} machines`);
    fill('garage-collection', list.map((m, i) => {
      const seen = machineStories(m);
      const lead = (m.street.numbers || [])[0];
      return `<a class="k-coll k-glass" href="#${esc(m.id)}" data-reveal>
        <span class="k-coll__plate"><img src="${esc(m.schematic)}" alt="" loading="lazy"></span>
        <span class="k-coll__meta"><span class="k-coll__num">${pad(i + 1)}</span><span class="k-coll__role">${esc(m.street.role)}</span></span>
        <b class="k-coll__name">${esc(m.model)}</b>
        <small class="k-coll__sub">${esc(m.make)} · ${esc(m.years || '')}${seen.length ? ` · in ${seen.length} ${seen.length === 1 ? 'story' : 'stories'}` : ''}</small>
        ${lead ? `<span class="k-coll__stat"><small>${esc(lead.label)}</small>${esc(lead.value)}</span>` : ''}
      </a>`;
    }).join(''));
    fill('garage-tape', `
      <div class="k-tape__row k-tape__row--head" aria-hidden="true"><span>Machine</span><span>Engine</span><span>Output</span><span>¼ mile</span></div>
      ${list.map((m) => {
        const q = quarter(m);
        const power = (m.stats || []).find((x) => x.label === 'Power');
        return `<a class="k-tape__row" href="#${esc(m.id)}">
          <span><b>${esc(m.model)}</b><small>${esc(m.make)} · ${esc(m.street.role)}</small></span>
          <span>${esc(((m.stats || []).find((x) => x.label === 'Engine') || {}).value || '')}</span>
          <span>${esc(power ? power.value : ((m.street.numbers || []).find((n) => n.label === 'Output') || {}).value || '—')}</span>
          <span>${q ? `${esc(q.value)}<small>${esc(q.note)}</small>` : '<small>Built for the boulevard</small>'}</span>
        </a>`;
      }).join('')}`);

    fill('garage-files', list.map((m, i) => {
      const st = m.street;
      const seen = machineStories(m);
      const sources = [...(st.sources || []), ...(m.sources || [])];
      return `
      <section class="k-section k-file" id="${esc(m.id)}" aria-labelledby="${esc(m.id)}-title">
        <div class="k-wrap">
          <header class="k-file__head" data-reveal>
            <p class="k-file__num">${pad(i + 1)}<small>/ ${pad(list.length)}</small></p>
            <div>
              <p class="k-eyebrow">${esc(st.role)} · ${esc(m.make)} · ${esc(m.years || '')}</p>
              <h2 class="k-file__title" id="${esc(m.id)}-title">${esc(m.model)}</h2>
              <p class="k-lede k-file__dek">${esc(st.dek)}</p>
            </div>
          </header>
          <div class="k-file__plates" data-reveal>${machinePlates(m)}</div>
          <div class="k-file__grid">
            <div>
              <p class="k-eyebrow">Street numbers</p>
              <dl class="k-file__numbers">${(st.numbers || []).map((n) => `<div class="k-glass" data-reveal><dt>${esc(n.label)}</dt><dd>${esc(n.value)}</dd>${n.note ? `<small>${esc(n.note)}</small>` : ''}</div>`).join('')}</dl>
              ${seen.length ? `<p class="k-eyebrow k-mt-l">Seen in</p><div class="k-file__seen">${seen.map((f) => `<a class="k-bar" href="${storyHref(f)}"><span>${esc(f.title || featureName(f))}<small>${esc(featureName(f))}</small></span><span class="k-arrow">${icon.arrow}</span></a>`).join('')}</div>` : ''}
            </div>
            <div>
              <p class="k-eyebrow">What the brochure leaves out</p>
              <ol class="k-file__secrets">${(st.secrets || []).map((x) => `<li data-reveal>${esc(x)}</li>`).join('')}</ol>
              <details class="k-file__sheet">
                <summary>Full spec sheet</summary>
                <dl class="k-machine__stats">${(m.stats || []).map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
                ${m.manual ? `<a class="k-bar k-machine__manual" href="${esc(m.manual.url)}" target="_blank" rel="noopener"><span>Factory owner’s manual<small>${esc(m.manual.label)}</small></span><span class="k-arrow">${icon.arrow}</span></a>` : ''}
              </details>
              <p class="k-machine__sources">Sources: ${sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join(' · ')}</p>
            </div>
          </div>
        </div>
      </section>`;
    }).join(''));
    inlineSchematics();
  }

  function hideSection(name) {
    const el = $(`[data-section="${name}"]`);
    if (el) el.classList.add('k-hide');
  }

  /* ------------------------------------------- cabin shake cockpit
   * The media page's spaceship + crew cutouts, rebuilt for the radio:
   * when CABIN SHAKE is on and music is playing, the cockpit rides the
   * waveform level (the 140 BPM synth for Spotify, the real signal for
   * MP3s); it settles the moment the music pauses. Off by default,
   * remembered per device, and always off for reduced motion.
   * ------------------------------------------------------------------ */
  function mountCabinShake() {
    const root = $('[data-cockpit]');
    if (!root || root.dataset.cabinDone) return;
    root.dataset.cabinDone = '1';
    const btn = $('[data-cabin-toggle]', root);
    const label = $('[data-cabin-label]', root);
    const ship = $('.k-cockpit__ship', root);
    const crew = $('.k-cockpit__crew', root);
    let on = false;
    try { on = localStorage.getItem('kiosk:cabin-shake') === '1'; } catch { on = false; }
    if (REDUCED) on = false;
    let raf = 0;
    const apply = () => {
      if (btn) { btn.setAttribute('aria-checked', String(on)); btn.classList.toggle('is-on', on); }
      if (label) label.textContent = on ? 'On · riding the music' : 'Off · cabin steady';
      root.classList.toggle('cabin-on', on);
      try { localStorage.setItem('kiosk:cabin-shake', on ? '1' : '0'); } catch { /* private mode */ }
      if (on && !raf) raf = requestAnimationFrame(tick);
      if (!on) { if (ship) ship.style.transform = ''; if (crew) crew.style.transform = ''; }
    };
    const tick = (now) => {
      raf = 0;
      if (!on || !root.isConnected) return;
      const level = player.playing ? Math.min(1, wave.level || 0) : 0;
      const beat = Math.sin(now / (60000 / 140 / 2)) * level;
      const y = (-14 * level - 6 * Math.max(0, beat)).toFixed(1);
      const x = (Math.sin(now / 900) * 3 * level).toFixed(1);
      if (ship) ship.style.transform = `translate(${x}px, ${y}px)`;
      if (crew) crew.style.transform = `translate(${(-x * 0.6).toFixed(1)}px, ${(y * 0.55).toFixed(1)}px)`;
      root.style.setProperty('--cabin-glow', (0.25 + level * 0.55).toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    if (btn) btn.addEventListener('click', () => { on = !on; if (REDUCED && on) { toast('Cabin shake is off while reduced motion is on.'); on = false; } apply(); });
    apply();
  }

  /* ------------------------------------------- Spotify connect panel
   * States: unconfigured / guest (become a Voyager) / Voyager not connected
   * / Free (connected, previews) / Premium (full in-page playback).
   * ------------------------------------------------------------------ */
  async function mountSpotifyPanel() {
    const el = mount('spotify-connect');
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    const flag = new URLSearchParams(location.search).get('spotify');
    if (flag === 'connected') toast('Spotify connected. Press play — the whole playlist plays here.');
    if (flag === 'declined') toast('Spotify connection was cancelled.');
    if (flag === 'failed') toast('Spotify connection didn’t finish. Try again.');
    if (flag === 'sign-in-first') toast('Become a Voyager first, then connect Spotify.');
    const st = await spotifySdk.loadStatus(true);
    if (!el.isConnected) return;
    let body = '';
    if (!st.configured) {
      body = `<p class="k-body">Full-track Spotify in the cabin is being fitted. Until then, every playlist below plays previews here — or in full in your Spotify app.</p>`;
    } else if (!st.voyager) {
      body = `<p class="k-body">Become a Voyager (free, one email code) and connect Spotify once. Your playlists then play in full without signing in for every song.</p>
        <div class="k-row-flex"><a class="k-btn k-btn--solid" href="account.html">Become a Voyager</a><a class="k-btn" href="tv.html">Watch KIOSK TV</a></div>`;
    } else if (!st.connected) {
      body = `<p class="k-body">One connect, then press play. Spotify Premium plays full tracks right here; Free still browses your library and hears previews.</p>
        <div class="k-row-flex"><a class="k-btn k-btn--solid" href="/api/spotify/login?returnTo=${encodeURIComponent('/radio.html')}">Connect Spotify</a></div>`;
    } else if (!st.premium) {
      body = `<p class="k-body">Connected${st.displayName ? ` as <b>${esc(st.displayName)}</b>` : ''} (Spotify Free). Your channels are below — previews play here, full tracks open in Spotify. In-page full playback needs Spotify Premium (Spotify’s rule, not ours).</p>
        <div class="k-row-flex"><button class="k-btn" type="button" data-spotify-disconnect>Disconnect Spotify</button></div>
        <div data-spotify-channels></div>`;
    } else {
      body = `<p class="k-body"><span class="k-live" aria-hidden="true"></span> Connected${st.displayName ? ` as <b>${esc(st.displayName)}</b>` : ''} · Spotify Premium. Press play on any playlist — it plays in full on the KIOSK Radio device and follows you around the site.</p>
        <div class="k-row-flex"><button class="k-btn" type="button" data-spotify-disconnect>Disconnect Spotify</button>
        <label class="k-small">Volume <input type="range" min="0" max="100" value="85" data-spotify-volume aria-label="Spotify volume"></label></div>
        <div data-spotify-channels></div>`;
    }
    el.innerHTML = `<div class="k-glass k-spotify-panel" data-reveal>
      <p class="k-eyebrow"><span class="k-live" aria-hidden="true"></span><b>Your Spotify</b> · In-flight entertainment</p>
      <h2 class="k-h2">Connect once. <em class="k-serif">Fly all the way.</em></h2>${body}</div>`;
    reveal(el);
    const dc = $('[data-spotify-disconnect]', el);
    if (dc) dc.addEventListener('click', async () => {
      await fetch('/api/spotify/disconnect', { method: 'POST' }).catch(() => {});
      spotifySdk.status = null; delete el.dataset.done; el.innerHTML = ''; mountSpotifyPanel();
      toast('Spotify disconnected.');
    });
    const vol = $('[data-spotify-volume]', el);
    if (vol) vol.addEventListener('input', () => { if (spotifySdk.player) spotifySdk.player.setVolume(vol.value / 100).catch(() => {}); });
    const channels = $('[data-spotify-channels]', el);
    if (channels && st.connected) loadSpotifyChannels(channels);
  }

  /** The Voyager's own top / recent / liked songs as playable channels. */
  async function loadSpotifyChannels(el) {
    el.innerHTML = '<p class="k-small">Loading your channels…</p>';
    try {
      const kinds = [['top', 'Your top tracks'], ['recent', 'Recently played'], ['liked', 'Liked songs']];
      const lists = await Promise.all(kinds.map(async ([kind, label]) => {
        const r = await fetch(`/api/spotify/library?kind=${kind}`);
        const d = r.ok ? await r.json() : { tracks: [] };
        return { kind, label, tracks: d.tracks || [] };
      }));
      el.innerHTML = lists.filter((l) => l.tracks.length).map((l) => `
        <div class="k-spotify-channel"><p class="k-eyebrow">${esc(l.label)}</p>
        <ol class="k-rows">${l.tracks.slice(0, 8).map((t) => `<li class="k-row" style="grid-template-columns:44px 1fr auto">
          <span class="k-row__num">${t.cover ? `<img src="${esc(t.cover)}" alt="" style="width:36px;height:36px;border-radius:8px;object-fit:cover">` : ''}</span>
          <span style="font-size:15px">${esc(t.title)}<small style="display:block;opacity:.65">${esc(t.artist)}</small></span>
          <a class="k-btn" href="https://open.spotify.com/track/${esc(t.id)}" target="_blank" rel="noopener">Open</a></li>`).join('')}</ol></div>`).join('') || '<p class="k-small">No songs yet — play something in Spotify and it will show up here.</p>';
    } catch { el.innerHTML = '<p class="k-small">Your channels couldn’t load right now.</p>'; }
  }

  /* ------------------------------------------------------------ KIOSK TV
   * Curated official videos (C.tvVideos) for everyone; a Voyager's own
   * Spotify library resolved to videos by /api/tv/feed. A card shows its
   * YouTube thumbnail until tapped, then swaps in the player with sound.
   * Scrolling a playing card mostly out of view stops it.
   * -------------------------------------------------------------------- */
  function tvCard(v, personal) {
    const thumb = v.youtube ? `https://i.ytimg.com/vi/${esc(v.youtube)}/hqdefault.jpg` : (v.cover || '');
    return `<article class="k-tv-card" data-tv-card data-youtube="${esc(v.youtube || '')}" data-track="${esc(v.id || v.spotify || '')}">
      <div class="k-tv-card__frame">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : ''}
        ${v.youtube ? `<button class="k-btn k-btn--solid" type="button" data-tv-play style="position:absolute;inset:auto 12px 12px auto;z-index:2">Play video</button>` : `<span class="k-btn" style="position:absolute;inset:auto 12px 12px auto">Audio only</span>`}
      </div>
      <div class="k-tv-card__body">
        <b data-no-i18n>${esc(v.title || '')}</b>
        <span data-no-i18n>${esc(v.artist || '')}${v.note ? ` · ${esc(v.note)}` : ''}${personal && v.youtube && !v.verified ? ' · matched video — check it’s the right one' : ''}</span>
        <div class="k-row-flex">
          ${v.id || v.spotify ? `<a class="k-btn" href="https://open.spotify.com/track/${esc(v.id || v.spotify)}" target="_blank" rel="noopener">Open in Spotify</a>` : ''}
          ${personal && v.youtube ? `<button class="k-btn" type="button" data-tv-reject>Not this video</button>` : ''}
        </div>
      </div>
    </article>`;
  }

  function bindTvFeed(root) {
    if (!root || root.dataset.tvDone) return;
    root.dataset.tvDone = '1';
    root.addEventListener('click', async (e) => {
      const reject = e.target.closest('[data-tv-reject]');
      if (reject) {
        const card = reject.closest('[data-tv-card]');
        await fetch('/api/tv/not-this-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotifyTrackId: card.dataset.track }) }).catch(() => {});
        card.remove();
        toast('Got it — that match won’t come back.');
        return;
      }
      const btn = e.target.closest('[data-tv-play]');
      if (!btn) return;
      const card = btn.closest('[data-tv-card]');
      const frame = $('.k-tv-card__frame', card);
      const id = card.dataset.youtube;
      if (!id || !frame) return;
      $$('[data-tv-card] iframe', root).forEach((f) => { const c = f.closest('[data-tv-card]'); if (c && c !== card) { f.remove(); const b = $('[data-tv-play]', c); if (b) b.hidden = false; } });
      btn.hidden = true;
      const img = $('img', frame);
      if (img) img.hidden = true;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      f.title = 'Music video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      frame.append(f);
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.intersectionRatio >= 0.25) return;
          const f = $('iframe', en.target);
          if (f) { f.remove(); const b = $('[data-tv-play]', en.target); if (b) b.hidden = false; const img = $('.k-tv-card__frame img', en.target); if (img) img.hidden = false; }
        });
      }, { threshold: [0, 0.25] });
      $$('[data-tv-card]', root).forEach((c) => io.observe(c));
    }
  }

  function pageTv() {
    const curated = fill('tv-curated', (C.tvVideos || []).filter((v) => v.youtube).length
      ? `<div class="k-tv-feed k-tv-scroll">${(C.tvVideos || []).filter((v) => v.youtube).map((v) => tvCard(v, false)).join('')}</div>`
      : `<div class="k-glass" style="padding:22px"><p class="k-eyebrow">First broadcast soon</p><p class="k-body" style="margin-top:8px">The first official videos are being matched to the radio playlists. Add them in <b>js/kiosk-content.js</b> (<i>tvVideos</i>) — see the Content Guide. Meanwhile the songs play on <a href="radio.html" style="text-decoration:underline;text-underline-offset:3px">KIOSK Radio</a>.</p></div>`);
    bindTvFeed(curated);
    mountTvPersonal();
  }

  /** A Voyager's own library as videos; everyone else gets the invite. */
  async function mountTvPersonal() {
    const el = mount('tv-personal');
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    const curatedMap = {};
    (C.tvVideos || []).forEach((v) => { if (v.spotify && v.youtube) curatedMap[v.spotify] = v.youtube; });
    let d = null;
    try {
      const r = await fetch('/api/tv/feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ curated: curatedMap }) });
      d = r.ok ? await r.json() : null;
    } catch { d = null; }
    if (!el.isConnected) return;
    if (!d || !d.enabled) {
      const reason = d && d.reason;
      el.innerHTML = `<div class="k-glass" style="padding:22px"><p class="k-body">${reason === 'unconfigured'
        ? 'Personal TV switches on once Spotify is connected to the site. The curated channel above is on air for everyone.'
        : 'Become a Voyager and connect Spotify once — your top songs, likes and recent plays become a video channel of your own.'}</p>
        <div class="k-row-flex" style="margin-top:12px"><a class="k-btn k-btn--solid" href="${reason === 'not-connected' ? '/api/spotify/login?returnTo=%2Ftv.html' : 'account.html'}">${reason === 'not-connected' ? 'Connect Spotify' : 'Become a Voyager'}</a><a class="k-btn" href="radio.html">KIOSK Radio</a></div></div>`;
      return;
    }
    const withVideo = d.videos.filter((v) => v.youtube);
    el.innerHTML = (withVideo.length
      ? `<div class="k-row-flex" role="group" aria-label="Your Spotify source">${[['top', 'Top tracks'], ['recent', 'Recently played'], ['liked', 'Liked songs']].map(([k, l]) => `<button class="k-btn${(d.source || 'top') === k ? ' k-btn--solid' : ''}" type="button" data-tv-source="${k}">${l}</button>`).join('')}</div>
         <div class="k-tv-feed k-tv-scroll" style="margin-top:14px">${withVideo.map((v) => tvCard(v, true)).join('')}</div>
         <p class="k-small" style="margin-top:10px">Matched from YouTube — a live or cover version can slip in. “Not this video” removes that match for you for good.</p>`
      : '<p class="k-body">No videos matched your Spotify songs yet. The curated channel above is on air.</p>');
    bindTvFeed(el);
    $$('[data-tv-source]', el).forEach((b) => b.addEventListener('click', async () => {
      const r = await fetch(`/api/tv/feed?source=${encodeURIComponent(b.dataset.tvSource)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ curated: curatedMap }) }).catch(() => null);
      const dd = r && r.ok ? await r.json() : null;
      if (!dd || !dd.enabled) return;
      const list = dd.videos.filter((v) => v.youtube);
      const feed = $('.k-tv-feed', el);
      if (feed) { feed.innerHTML = list.map((v) => tvCard(v, true)).join(''); delete feed.dataset.tvDone; }
      $$('[data-tv-source]', el).forEach((x) => x.classList.toggle('k-btn--solid', x === b));
    }));
  }

  /* ------------------------------------------------------------ radio */

  function pageRadio() {
    mountSpotifyPanel();
    mountCabinShake();
    const deck = mount('radio');
    mountWheel(deck, (player.mix && player.mix.slug) || ((C.mixes || [])[0] && C.mixes[0].slug), true);
    if (deck) {
      deck.addEventListener('click', (e) => {
        const b = e.target.closest('[data-wheel-mix]');
        if (!b || b.getAttribute('aria-pressed') === 'true') return;
        mountWheel(deck, b.dataset.wheelMix);
        const again = $(`[data-wheel-mix="${b.dataset.wheelMix}"]`, deck);
        if (again) again.focus();
      });
    }
    fill('tracklists', (C.mixes || []).map((m, n) => {
      const used = features.filter((f) => f.soundtrack === m.slug);
      return `
        <article class="k-radio-card k-glass" data-reveal>
          <div class="k-radio-card__cover">${media({ image: m.cover, tone: m.tone, mark: '' })}</div>
          <div class="k-radio-card__body">
            <div class="k-row-flex" style="justify-content:space-between">
              <p class="k-eyebrow">${pad(n + 1)} / ${esc(m.volume)}</p>
              <p class="k-eyebrow">${esc(mixMeta(m))}</p>
            </div>
            <h3 class="k-h2">${esc(m.title)}</h3>
            <p class="k-body">${esc(m.mood)}</p>
            <canvas class="k-radio-card__wave" data-wave="${esc(m.slug)}" aria-hidden="true"></canvas>
            ${(m.tracks || []).length ? `<ol class="k-rows">
              ${m.tracks.map((t, k) => `<li class="k-row" style="padding:14px 4px;grid-template-columns:44px 1fr"><span class="k-row__num">${pad(k + 1)}</span><span style="font-size:16px">${esc(typeof t === 'string' ? t : [t.title, t.artist].filter(Boolean).join(' — '))}</span></li>`).join('')}
            </ol>` : ''}
            ${used.length ? `<p class="k-small">Scored: ${used.map((f) => `<a href="${storyHref(f)}" style="color:var(--ink);text-decoration:underline;text-underline-offset:3px">${esc(f.title)}</a>`).join(', ')}</p>` : ''}
            <div class="k-row-flex">
              ${mixButton(m)}
              ${sourceLink(m) ? `<a class="k-btn" href="${esc(sourceLink(m).href)}" target="_blank" rel="noopener">Follow on ${esc(sourceName(m) || 'Spotify')}</a>` : ''}
            </div>
          </div>
        </article>`;
    }).join(''));
  }

  /* ---------------------------------------------- magazine: rails + mosaic
   * Two layout pieces used across the site:
   *   railShell()  a horizontal scroller with drag, arrow buttons and a
   *                progress bar (any [data-hscroll] gets the behaviour).
   *   mosaicHtml() a Pinterest-style masonry board that mixes photos,
   *                films, products, playlists, palettes and pull quotes,
   *                each labelled with its department (desk).
   * -------------------------------------------------------------------- */

  const DESKS = { travel: 'Travel', automotive: 'Automotive', music: 'Music', fashion: 'Fashion' };
  const ARROW_L = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /** Gallery images have 720px versions in a thumbs/ folder (scripts: see CONTENT_GUIDE). */
  const thumbOf = (src) => (/^images\/garage\/[^/]+\/\d+\.webp$/.test(src || '') ? src.replace(/\/(\d+\.webp)$/, '/thumbs/$1') : src);

  function railShell(inner, label, cls = '') {
    return `
      <div class="k-hscroll-wrap ${cls}">
        <div class="k-hscroll" data-hscroll tabindex="0" role="region" aria-label="${esc(label)}">${inner}</div>
        <div class="k-hscroll__ui">
          <div class="k-hscroll__bar" aria-hidden="true"><i></i></div>
          <button class="k-hscroll__btn" type="button" data-rail-prev aria-label="Scroll back">${ARROW_L}</button>
          <button class="k-hscroll__btn" type="button" data-rail-next aria-label="Scroll forward">${ARROW_R}</button>
        </div>
      </div>`;
  }

  /** Drag-to-scroll, arrow buttons and progress for every horizontal scroller. */
  function bindRails(root = document) {
    $$('[data-hscroll]', root).forEach((el) => {
      if (el.dataset.railBound) return;
      el.dataset.railBound = '1';
      const wrap = el.closest('.k-hscroll-wrap');
      const bar = wrap && $('.k-hscroll__bar i', wrap);
      const update = () => {
        const max = el.scrollWidth - el.clientWidth;
        const p = max > 0 ? el.scrollLeft / max : 1;
        if (bar) bar.style.transform = `scaleX(${Math.max(0.08, Math.min(1, p))})`;
        if (wrap) {
          wrap.classList.toggle('is-start', el.scrollLeft < 4);
          wrap.classList.toggle('is-end', el.scrollLeft > max - 4);
          // at either end the arrow that can't go further is disabled, not just dimmed
          const prev = $('[data-rail-prev]', wrap); const next = $('[data-rail-next]', wrap);
          if (prev) prev.disabled = el.scrollLeft < 4;
          if (next) next.disabled = el.scrollLeft > max - 4;
          wrap.classList.toggle('is-static', max <= 4);
        }
      };
      el.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true, signal: pageAbort.signal });
      update();
      if (wrap) {
        const step = (dir) => el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: REDUCED ? 'auto' : 'smooth' });
        $('[data-rail-prev]', wrap).addEventListener('click', () => step(-1));
        $('[data-rail-next]', wrap).addEventListener('click', () => step(1));
      }
      el.addEventListener('keydown', (e) => {
        if (e.target !== el) return;
        if (e.key === 'ArrowRight') { el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
      });
      // Mouse drag (touch already scrolls natively)
      let x0 = 0; let s0 = 0; let dragging = false; let moved = false;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        dragging = true; moved = false; x0 = e.clientX; s0 = el.scrollLeft;
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add('is-dragging'); el.setPointerCapture(e.pointerId); }
        if (moved) el.scrollLeft = s0 - dx;
      });
      const end = () => { dragging = false; setTimeout(() => el.classList.remove('is-dragging'), 0); };
      el.addEventListener('pointerup', end);
      el.addEventListener('dragstart', (e) => e.preventDefault());   // links and images would start a native drag
      el.addEventListener('pointercancel', end);
      // A drag shouldn't count as a click on the card underneath
      el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /** Everything the mosaic can show, sorted into departments. */
  function mosaicPool(only) {
    const out = { automotive: [], travel: [], fashion: [], music: [] };
    const push = (desk, item) => (out[DESKS[desk] ? desk : 'automotive']).push({ ...item, desk: DESKS[desk] ? desk : 'automotive' });
    features.filter((f) => !only || f.slug === only).forEach((f) => {
      (f.gallery || []).forEach((g) => {
        const it = typeof g === 'string' ? { src: g } : g;
        push(it.desk || f.desk, { kind: 'photo', src: it.src, thumb: thumbOf(it.src), caption: it.caption || '', meta: it.meta || '', place: place(f) || f.location || '', story: f.slug });
      });
      if (only) return;
      if (f.vimeo && f.vimeo.id) push(f.desk, { kind: 'film', vimeo: f.vimeo, story: f.slug, caption: f.title || featureName(f), place: place(f) || f.location || '' });
      if ((f.palette || []).length >= 4) push('fashion', { kind: 'palette', colors: f.palette.slice(0, 6), story: f.slug, caption: `${f.title || featureName(f)} palette` });
    });
    if (!only) {
      (C.products || []).forEach((p) => {
        const cw = (p.colorways || []).findIndex((w) => w.image);
        if (cw >= 0) push('fashion', { kind: 'product', id: p.id, cw, src: p.colorways[cw].image, caption: p.title, meta: `${p.colorways[cw].name} · ${price(p)}` });
      });
      (C.mixes || []).forEach((m) => push('music', { kind: 'mix', slug: m.slug, src: m.cover, tone: m.tone, caption: m.title, meta: m.mood }));
      // Words to wear: the merch quotes as pull quotes, and their on-location shots
      (C.products || []).filter((p) => p.quote && p.category === 'quotes').slice(0, 4).forEach((p, i) => {
        if (i < 2) push('fashion', { kind: 'quote', text: p.quote, link: `vault.html?c=quotes#${p.id}`, cta: `${p.title} · ${price(p)}` });
        if ((p.lifestyle || [])[0]) push('fashion', { kind: 'photo', src: p.lifestyle[0], thumb: p.lifestyle[0], caption: `${p.title}: “${p.quote}”`, meta: 'Words to wear · on location', place: 'Only at the KIOSK', story: '' });
      });
      push('music', { kind: 'quote', text: 'The phonk behind every film, free on every page.', link: 'radio.html', cta: 'KIOSK Radio' });
      push('travel', { kind: 'quote', text: 'Machines, people & the long way home.', link: 'atlas.html', cta: 'The Journal' });
    }
    return out;
  }

  /** Spread each department evenly through the board instead of in clumps. */
  function mosaicItems(only, limit = Infinity) {
    const pool = mosaicPool(only);
    if (Number.isFinite(limit)) {
      // Every desk gets a fair share (films, playlists and quotes first), photos fill the rest
      const desks = Object.keys(pool).filter((d) => pool[d].length);
      const total = desks.reduce((n, d) => n + pool[d].length, 0);
      const rank = (it) => (it.kind === 'photo' ? 1 : 0);
      desks.forEach((d) => { pool[d] = pool[d].map((it, k) => ({ it, k })).sort((a, b) => rank(a.it) - rank(b.it) || a.k - b.k).map((x) => x.it); });
      const quota = {};
      desks.forEach((d) => { quota[d] = Math.min(pool[d].length, Math.max(4, Math.round((limit * pool[d].length) / total))); });
      let over = desks.reduce((n, d) => n + quota[d], 0) - limit;
      while (over > 0) {
        const big = desks.reduce((a, d) => (quota[d] > quota[a] ? d : a), desks[0]);
        quota[big] -= 1; over -= 1;
      }
      desks.forEach((d) => { pool[d] = pool[d].slice(0, quota[d]); });
    }
    const keyed = [];
    Object.keys(pool).forEach((desk, d) => {
      const list = pool[desk];
      list.forEach((it, k) => keyed.push({ it, key: (k + 0.35 + d * 0.13) / list.length }));
    });
    return keyed.sort((a, b) => a.key - b.key).map((x) => x.it).slice(0, limit);
  }

  function mosaicTile(it, n) {
    const desk = `<span class="k-mosaic__desk">${esc(DESKS[it.desk])}</span>`;
    const cap = (title, sub) => `<span class="k-mosaic__cap">${desk}<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
    const tile = (cls, attrs, inner) => `<li class="k-mosaic__tile k-mosaic__tile--${cls}" data-desk="${esc(it.desk)}" data-reveal>${attrs ? `<button type="button" ${attrs}>` : '<div>'}${inner}${attrs ? '</button>' : '</div>'}</li>`;
    if (it.kind === 'photo') {
      return tile('photo', `data-mosaic-open="${n}" aria-label="${esc(it.caption || 'Photo')}"`,
        `<img src="${esc(it.thumb)}" data-full="${esc(it.src)}" alt="${esc(it.caption)}" loading="lazy" decoding="async">${cap(it.caption, it.place)}`);
    }
    if (it.kind === 'film') {
      return tile('film k-dark', `data-vimeo="${esc(it.vimeo.id)}" aria-label="Play ${esc(it.caption)}"`,
        `<span class="k-mosaic__frame"><span class="plate plate--${esc((featureBySlug(it.story) || {}).tone || 'graphite')}" data-vimeo-cover="${esc(it.vimeo.id)}"><span class="plate__mark">${esc((featureBySlug(it.story) || {}).code || '')}</span></span></span><span class="k-mosaic__play">${icon.play}</span>${cap(it.caption, ['Film', it.place].filter(Boolean).join(' · '))}`);
    }
    if (it.kind === 'product') {
      const p = productById(it.id);
      return tile('product', `data-quickview="${esc(it.id)}" data-cw="${it.cw}" aria-label="${esc(it.caption)}"`,
        `<span class="k-mosaic__product">${p ? productVisual(p, it.cw) : ''}</span>${cap(it.caption, it.meta)}`);
    }
    if (it.kind === 'mix') {
      return tile('mix k-dark', `data-mix-play="${esc(it.slug)}" aria-label="Play ${esc(it.caption)}"`,
        `<span class="k-mosaic__frame">${media({ image: it.src, tone: it.tone, mark: '' })}</span><span class="k-mosaic__play" data-ico>${icon.play}</span><canvas class="k-mosaic__wave" data-wave="${esc(it.slug)}" aria-hidden="true"></canvas>${cap(it.caption, it.meta)}`);
    }
    if (it.kind === 'palette') {
      const f = featureBySlug(it.story);
      return `<li class="k-mosaic__tile k-mosaic__tile--palette" data-desk="${esc(it.desk)}" data-reveal><a href="${f ? storyHref(f) : '#'}">
        <span class="k-mosaic__swatches">${it.colors.map((c) => `<span style="background:${esc(c.hex)}" title="${esc(c.name)}"></span>`).join('')}</span>
        ${cap(it.caption, it.colors.map((c) => c.name).join(' · '))}</a></li>`;
    }
    // quote
    return `<li class="k-mosaic__tile k-mosaic__tile--quote" data-desk="${esc(it.desk)}" data-reveal><a href="${esc(it.link)}">
      ${desk}<q>${esc(it.text)}</q><span class="k-mosaic__more">${esc(it.cta)}<span class="k-arrow">${icon.arrow}</span></span></a></li>`;
  }

  /** Board + department filter chips. */
  function mosaicHtml(items, { filters = true, label = 'Mosaic' } = {}) {
    const present = Object.keys(DESKS).filter((d) => items.some((it) => it.desk === d));
    return `
      ${filters && present.length > 1 ? `<div class="k-mosaic__filters" role="group" aria-label="Filter by department">
        <button class="k-chip" type="button" data-mosaic-filter="all" aria-pressed="true">All</button>
        ${present.map((d) => `<button class="k-chip" type="button" data-mosaic-filter="${d}" aria-pressed="false">${DESKS[d]}</button>`).join('')}
      </div>` : ''}
      <ul class="k-mosaic" data-mosaic aria-label="${esc(label)}">${items.map(mosaicTile).join('')}</ul>`;
  }

  /** Fill a mount with a mosaic and remember its items for the photo viewer. */
  function fillMosaic(name, items, opts) {
    const el = mount(name);
    if (!el) return null;
    if (!items.length) { const sec = el.closest('[data-mosaic-section]'); if (sec) sec.hidden = true; return null; }
    el.innerHTML = mosaicHtml(items, opts);
    el.kItems = items;
    return el;
  }

  let photoNav = null;   // { items, i } while the photo viewer is open

  function openPhoto(items, i) {
    const photos = items.filter((it) => it.kind === 'photo');
    const at = Math.max(0, photos.indexOf(items[i]));
    photoNav = { photos, i: at };
    showPhoto();
  }

  function showPhoto() {
    const { photos, i } = photoNav;
    const it = photos[i];
    const f = featureBySlug(it.story);
    openLightbox(`
      <div class="k-lightbox__head">
        <div><p class="k-eyebrow">${esc(DESKS[it.desk])} · ${pad(i + 1)} / ${pad(photos.length)}</p><p class="k-h3 k-mt-s">${esc(it.caption || (f && f.title) || '')}</p></div>
        <div class="k-row-flex">
          ${f && PAGE !== 'story' ? `<a class="k-btn k-btn--sm" href="${storyHref(f)}">Read the story</a>` : ''}
          <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
        </div>
      </div>
      <figure class="k-photo">
        <img src="${esc(it.src)}" alt="${esc(it.caption)}">
        <figcaption>${[f && (f.title || featureName(f)), it.place, it.meta].filter(Boolean).map(esc).join(' · ')}</figcaption>
        ${photos.length > 1 ? `<button class="k-photo__nav k-photo__nav--prev" type="button" data-photo-step="-1" aria-label="Previous photo">${ARROW_L}</button>
        <button class="k-photo__nav k-photo__nav--next" type="button" data-photo-step="1" aria-label="Next photo">${ARROW_R}</button>` : ''}
      </figure>`, 'Photo');
  }

  function bindMagazine() {
    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-mosaic-open]');
      if (open) {
        const host = open.closest('[data-mount]');
        if (host && host.kItems) openPhoto(host.kItems, Number(open.dataset.mosaicOpen));
        return;
      }
      const stepBtn = e.target.closest('[data-photo-step]');
      if (stepBtn && photoNav) {
        photoNav.i = (photoNav.i + Number(stepBtn.dataset.photoStep) + photoNav.photos.length) % photoNav.photos.length;
        showPhoto();
        return;
      }
      const filter = e.target.closest('[data-mosaic-filter]');
      if (filter) {
        const host = filter.closest('[data-mount]');
        const d = filter.dataset.mosaicFilter;
        $$('[data-mosaic-filter]', host).forEach((b) => b.setAttribute('aria-pressed', String(b === filter)));
        $$('.k-mosaic__tile', host).forEach((t) => { t.hidden = d !== 'all' && t.dataset.desk !== d; });
      }
    });
    document.addEventListener('keydown', (e) => {
      if (!photoNav || !$('.k-lightbox.is-open .k-photo')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        photoNav.i = (photoNav.i + (e.key === 'ArrowRight' ? 1 : -1) + photoNav.photos.length) % photoNav.photos.length;
        showPhoto();
      }
    });
    // Thumbs that haven't been generated fall back to the full image
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (img && img.tagName === 'IMG' && img.dataset.full && img.src.indexOf(img.dataset.full) === -1) img.src = img.dataset.full;
    }, true);
  }

  /** Magazine "departments" rail: one big card per desk. */
  function departmentsHtml() {
    const pool = mosaicPool();
    const firstPhoto = (desk, not) => (pool[desk] || []).find((it) => it.kind === 'photo' && it.story !== not) || (pool[desk] || []).find((it) => it.kind === 'photo');
    const autoPhoto = firstPhoto('automotive');
    const hoodie = (C.products || []).find((p) => (p.colorways || []).some((w) => w.image) && (p.mockup || {}).type === 'hoodie');
    const mix = (C.mixes || [])[0];
    const desks = [
      { id: 'automotive', n: '01', title: 'Automotive', dek: 'Cars, bikes and the people who keep them running.', href: 'atlas.html?desk=automotive', img: (autoPhoto || {}).thumb, count: features.filter((f) => f.desk === 'automotive').length, unit: 'stories' },
      { id: 'travel', n: '02', title: 'Travel', dek: 'Bridges, rivers and cities after dark.', href: 'atlas.html', img: (firstPhoto('travel', autoPhoto && autoPhoto.story) || {}).thumb, count: pool.travel.length, unit: 'frames' },
      { id: 'music', n: '03', title: 'Music', dek: 'Phonk playlists that follow you around the site.', href: 'radio.html', img: mix && mix.cover, tone: mix && mix.tone, count: (C.mixes || []).length, unit: 'playlists' },
      { id: 'fashion', n: '04', title: 'Fashion', dek: 'Streetwear in colourways pulled from the shoots.', href: 'vault.html', product: hoodie, count: (C.products || []).filter((p) => ['apparel', 'headwear'].includes(p.category)).length, unit: 'pieces' },
    ];
    return desks.map((d) => `
      <a class="k-dept k-dept--${d.id}" href="${d.href}" data-reveal>
        <span class="k-dept__media">${d.product ? `<span class="k-dept__product">${productVisual(d.product, (d.product.colorways || []).findIndex((w) => w.image))}</span>` : media({ image: d.img, tone: d.tone || 'graphite', mark: '' })}</span>
        <span class="k-dept__top"><span class="k-dept__n">${d.n}</span><span class="k-eyebrow">${d.count} ${d.unit}</span></span>
        <span class="k-dept__body"><b class="k-dept__title">${esc(d.title)}</b><span class="k-dept__dek">${esc(d.dek)}</span></span>
      </a>`).join('');
  }

  /** Shop lookbook: products shown against the shoot their colourway is named after. */
  function lookbookHtml() {
    const slides = [];
    (C.products || []).forEach((p) => {
      (p.colorways || []).forEach((w, cw) => {
        if (!w.image) return;
        const f = features.find((x) => (x.palette || []).some((c) => c.name.toLowerCase() === w.name.toLowerCase()) && (x.gallery || []).length);
        if (!f) return;
        const g = f.gallery[hash(p.id + w.name) % f.gallery.length];
        const src = typeof g === 'string' ? g : g.src;
        slides.push({ p, w, cw, f, src });
      });
    });
    return slides.map(({ p, w, cw, f, src }) => `
      <article class="k-look" data-reveal>
        <a class="k-look__photo" href="${storyHref(f)}" aria-label="${esc(f.title || featureName(f))}">${media({ image: thumbOf(src), tone: f.tone, alt: f.title })}</a>
        <button class="k-look__product" type="button" data-quickview="${esc(p.id)}" data-cw="${cw}" aria-label="${esc(`${p.title}, ${w.name}`)}">${productVisual(p, cw)}</button>
        <div class="k-look__cap">
          <span class="k-mosaic__desk">Fashion × ${esc(DESKS[f.desk] || 'Automotive')}</span>
          <b>${esc(p.title)} <span class="k-serif">in ${esc(w.name)}</span></b>
          <small>${esc(w.name)} is from the ${esc(f.title || featureName(f))} palette · ${esc(price(p))}</small>
        </div>
      </article>`).join('');
  }

  /* ---------------------------------------------------------- journal */

  /* ------------------------------------------------------------ atlas
   * atlas.html: every post, video or written, in one searchable library.
   * Search covers titles, places, tags and every word in the story and its
   * chapters. Filters: type, desk, author, tag, location. URL-synced.
   * -------------------------------------------------------------------- */
  const POST_TYPES = { video: 'Video', photo: 'Photos', article: 'Article' };
  const postType = (f) => (f.format === 'film' ? 'video' : f.format === 'gallery' ? 'photo' : 'article');
  const postText = (f) => [f.title, f.make, f.model, f.code, f.tagline, f.excerpt, f.city, f.location, f.country, f.author, (f.tags || []).join(' '),
    ...(f.story || []).map((b) => `${b.lead || ''} ${b.body || b.text || ''}`), ...written(f).map((c) => `${c.heading || ''} ${c.body}`),
    ...((f.interview || []).map ? (f.interview || []).map((q) => `${q.q || q.question || ''} ${q.a || q.answer || ''}`) : [])].filter(Boolean).join(' ');
  const postPlace = (f) => f.city || f.location || '';
  function snippet(text, q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return '';
    const a = Math.max(0, i - 60); const b = Math.min(text.length, i + q.length + 80);
    return `${a ? '…' : ''}${esc(text.slice(a, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length, b))}${b < text.length ? '…' : ''}`;
  }
  function libraryCard(f, q) {
    const type = postType(f);
    const title = f.title || featureName(f);
    const text = q ? postText(f) : '';
    const hit = q && !title.toLowerCase().includes(q.toLowerCase()) ? snippet(text, q) : '';
    const meta = type === 'video' ? (f.runtime || 'Film') : type === 'photo' ? `${(f.gallery || []).length || ''} photos`.trim() : `${readMinutes(f)} min read`;
    return `<article class="k-lib-card" data-reveal>
      <a class="k-lib-card__media" href="${storyHref(f)}" aria-label="${esc(title)}">
        ${media({ image: f.image, tone: f.tone, mark: f.code, alt: title, focus: f.focus, vimeo: f.vimeo })}
        <span class="k-lib-card__type k-lib-card__type--${type}">${type === 'video' ? '▶ ' : ''}${esc(POST_TYPES[type])}</span>
      </a>
      <div class="k-lib-card__body">
        <p class="k-lib-card__meta"><span>${esc(shortDate(f.published))}${f.published ? ` ${esc(String(f.published).slice(0, 4))}` : ''}</span>${postPlace(f) ? `<span>${esc(postPlace(f))}</span>` : ''}<span>${esc(meta)}</span></p>
        <h3 class="k-lib-card__title"><a href="${storyHref(f)}">${esc(title)}</a></h3>
        ${f.make || f.model ? `<p class="k-lib-card__sub">${esc([f.make, f.model].filter(Boolean).join(' '))}</p>` : ''}
        ${hit ? `<p class="k-lib-card__hit">${hit}</p>` : f.tagline ? `<p class="k-lib-card__dek">${esc(f.tagline)}</p>` : ''}
        <p class="k-lib-card__foot"><span>By ${esc(f.author || 'KIOSK')}</span>${(f.tags || []).slice(0, 3).map((t) => `<button type="button" class="k-lib-tag" data-lib-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</p>
      </div>
    </article>`;
  }
  /* ---------------------------------------------------------- flights
   * Live flight status on a satellite globe (flights.html). Look a flight
   * up by number or callsign, or let the KIOSK pick one somewhere on Earth.
   * Data comes through /api/flights (functions/api/flights.js); if that
   * can't be reached the page says so and shows sample traffic instead.
   * -------------------------------------------------------------------- */
  // IATA code → [ICAO callsign prefix, airline]
  const AIRLINES = {
    AA: ['AAL', 'American Airlines'], DL: ['DAL', 'Delta Air Lines'], UA: ['UAL', 'United Airlines'], WN: ['SWA', 'Southwest'], B6: ['JBU', 'JetBlue'],
    AS: ['ASA', 'Alaska Airlines'], NK: ['NKS', 'Spirit'], F9: ['FFT', 'Frontier'], AC: ['ACA', 'Air Canada'], WS: ['WJA', 'WestJet'],
    AM: ['AMX', 'Aeroméxico'], AV: ['AVA', 'Avianca'], LA: ['LAN', 'LATAM'], JJ: ['TAM', 'LATAM Brasil'], G3: ['GLO', 'GOL'],
    BA: ['BAW', 'British Airways'], VS: ['VIR', 'Virgin Atlantic'], AF: ['AFR', 'Air France'], KL: ['KLM', 'KLM'], LH: ['DLH', 'Lufthansa'],
    LX: ['SWR', 'SWISS'], OS: ['AUA', 'Austrian'], IB: ['IBE', 'Iberia'], TP: ['TAP', 'TAP Air Portugal'], AZ: ['ITY', 'ITA Airways'],
    SK: ['SAS', 'SAS'], AY: ['FIN', 'Finnair'], FI: ['ICE', 'Icelandair'], EI: ['EIN', 'Aer Lingus'], FR: ['RYR', 'Ryanair'], U2: ['EZY', 'easyJet'],
    TK: ['THY', 'Turkish Airlines'], EK: ['UAE', 'Emirates'], QR: ['QTR', 'Qatar Airways'], EY: ['ETD', 'Etihad'], ET: ['ETH', 'Ethiopian'],
    KQ: ['KQA', 'Kenya Airways'], SA: ['SAA', 'South African'], AI: ['AIC', 'Air India'], '6E': ['IGO', 'IndiGo'], SQ: ['SIA', 'Singapore Airlines'],
    CX: ['CPA', 'Cathay Pacific'], NH: ['ANA', 'ANA'], JL: ['JAL', 'Japan Airlines'], KE: ['KAL', 'Korean Air'], OZ: ['AAR', 'Asiana'],
    CA: ['CCA', 'Air China'], MU: ['CES', 'China Eastern'], CZ: ['CSN', 'China Southern'], QF: ['QFA', 'Qantas'], NZ: ['ANZ', 'Air New Zealand'],
    FX: ['FDX', 'FedEx'], '5X': ['UPS', 'UPS'],
  };
  const BY_ICAO = Object.fromEntries(Object.entries(AIRLINES).map(([iata, [icao, name]]) => [icao, { iata, name }]));
  const FL_HUBS = [
    ['New York', 40.64, -73.78], ['Los Angeles', 33.94, -118.41], ['Chicago', 41.98, -87.9], ['Atlanta', 33.64, -84.43], ['Toronto', 43.68, -79.63],
    ['Mexico City', 19.44, -99.07], ['São Paulo', -23.43, -46.47], ['Bogotá', 4.7, -74.15], ['London', 51.47, -0.45], ['Paris', 49.01, 2.55],
    ['Amsterdam', 52.31, 4.76], ['Frankfurt', 50.04, 8.56], ['Madrid', 40.47, -3.56], ['Istanbul', 41.26, 28.74], ['Reykjavík', 63.98, -22.6],
    ['Lagos', 6.58, 3.32], ['Nairobi', -1.32, 36.93], ['Johannesburg', -26.14, 28.24], ['Cairo', 30.12, 31.41], ['Dubai', 25.25, 55.36],
    ['Doha', 25.27, 51.61], ['Delhi', 28.56, 77.1], ['Mumbai', 19.09, 72.87], ['Singapore', 1.36, 103.99], ['Bangkok', 13.69, 100.75],
    ['Hong Kong', 22.31, 113.91], ['Shanghai', 31.14, 121.81], ['Seoul', 37.46, 126.44], ['Tokyo', 35.55, 139.78], ['Sydney', -33.95, 151.18],
    ['Auckland', -37.01, 174.79], ['Honolulu', 21.32, -157.92], ['Anchorage', 61.17, -149.99], ['Vancouver', 49.19, -123.18], ['Miami', 25.79, -80.29],
    ['Lisbon', 38.77, -9.13],
  ].map(([n, lat, lon]) => ({ n, lat, lon }));
  const toCallsign = (raw) => {
    const q = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const m = q.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);
    if (m && AIRLINES[m[1]] && !/^[A-Z]{3}/.test(q)) return AIRLINES[m[1]][0] + m[2].replace(/^0+(?=\d)/, '');
    return q;
  };
  const airlineOf = (cs) => (BY_ICAO[String(cs || '').slice(0, 3)] || {}).name || '';
  const prettyCs = (cs) => String(cs || '').replace(/^([A-Z]{3})(\d)/, '$1 $2');
  const iataNo = (cs) => { const a = BY_ICAO[String(cs || '').slice(0, 3)]; return a ? `${a.iata} ${cs.slice(3)}` : ''; };
  // Aviationstack times are airport-local wall clock; show them as written
  const asTime = (t) => (t && t.length >= 16 ? t.slice(11, 16) : '');
  const STATUS_LABEL = { scheduled: 'Scheduled', active: 'En route', landed: 'Landed', cancelled: 'Cancelled', incident: 'Incident', diverted: 'Diverted', unknown: 'Status unknown' };
  const iataFor = (cs) => { const a = BY_ICAO[String(cs || '').slice(0, 3)]; return a ? `${a.iata}${cs.slice(3)}` : ''; };
  const compass = (deg) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round((((deg || 0) % 360) + 360) % 360 / 22.5) % 16];
  const kmBetween = (a, b) => {
    const r = Math.PI / 180; const dLa = (b.lat - a.lat) * r; const dLo = (b.lon - a.lon) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  // Sample traffic for when the live feed can't be reached: the fictional KIOSK fleet
  function sampleTraffic(c) {
    let seed = Math.round((c.lat + 90) * 1000 + (c.lon + 180)); const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    return Array.from({ length: 42 }, (_, i) => {
      const alt = rnd() < 0.2 ? 4000 + rnd() * 16000 : 30000 + Math.round(rnd() * 10) * 1000;
      return {
        hex: `k${String(100000 + i).slice(1)}`, callsign: `KSK${100 + Math.floor(rnd() * 899)}`, reg: '', type: ['A20N', 'B38M', 'B789', 'A359', 'A21N', 'E75L'][i % 6], sample: true,
        lat: c.lat + (rnd() - 0.5) * 7, lon: c.lon + (rnd() - 0.5) * 9, alt, gs: alt > 20000 ? 420 + rnd() * 90 : 220 + rnd() * 120,
        track: rnd() * 360, vs: alt > 20000 ? 0 : (rnd() < 0.5 ? -1 : 1) * (800 + rnd() * 1400), squawk: '', seen: rnd() * 8, ground: false,
      };
    });
  }

  function pageFlights() {
    const root = $('[data-flights]');
    if (!root) return;
    const signal = pageAbort.signal;
    const air = $('[data-fl-air]', root);
    const status = $('[data-fl-status]', root);
    const resEl = $('[data-fl-result]', root);
    const listEl = $('[data-fl-list]', root);
    const phone = () => window.innerWidth < 760;
    const S = { field: [], fieldAt: 0, hub: null, sel: null, selAt: 0, route: null, follow: true, live: true, earth: null, status: null, statusOn: true, statusBusy: false };
    const say = (t) => { status.textContent = t; };

    const api = (qs) => fetch(`/api/flights?${qs}`, { signal, headers: { Accept: 'application/json' } }).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(body.error || `HTTP ${r.status}`), { status: r.status });
      return body;
    });

    // Where a plane is now: dead-reckon from its last fix along its track
    const posOf = (a, now) => {
      if (!a || a.ground || !a.gs || a.track == null) return { lat: a.lat, lon: a.lon };
      const hours = Math.min(120, (now - a._at) / 1000 + (a.seen || 0)) / 3600;
      const km = a.gs * 1.852 * hours; const r = Math.PI / 180;
      const lat = a.lat + (km / 111.2) * Math.cos(a.track * r);
      return { lat, lon: a.lon + (km / (111.2 * Math.max(0.2, Math.cos(a.lat * r)))) * Math.sin(a.track * r) };
    };
    const stamp = (list) => { const t = performance.now(); list.forEach((a) => { a._at = t; }); return list; };

    // --- the globe and the air above it
    let ctx = null; let dpr = 1;
    const sizeAir = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); air.width = Math.round(air.clientWidth * dpr); air.height = Math.round(air.clientHeight * dpr); ctx = air.getContext('2d'); };
    const frameView = (lat, lon, close) => (phone()
      ? { lat: lat - (close ? 1.2 : 4), lon, alt: close ? 0.32 : 0.9, tilt: close ? 0.95 : 0.7, px: 0.5, py: close ? 0.3 : 0.32, fov: 0.62 }
      : { lat: lat - (close ? 1 : 3), lon, alt: close ? 0.3 : 0.8, tilt: close ? 0.95 : 0.75, px: 0.64, py: 0.52, fov: 0.55 });
    function plane(x, y, ang, size, color, glow) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(size / 24, size / 24);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(9, -1.4); ctx.lineTo(3, -1.6); ctx.lineTo(-3, -9.5); ctx.lineTo(-5.4, -9.5); ctx.lineTo(-2.2, -1.7); ctx.lineTo(-7.8, -1.6);
      ctx.lineTo(-9.8, -4.6); ctx.lineTo(-11.4, -4.6); ctx.lineTo(-10.2, 0); ctx.lineTo(-11.4, 4.6); ctx.lineTo(-9.8, 4.6); ctx.lineTo(-7.8, 1.6);
      ctx.lineTo(-2.2, 1.7); ctx.lineTo(-5.4, 9.5); ctx.lineTo(-3, 9.5); ctx.lineTo(3, 1.6); ctx.lineTo(9, 1.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const screenAngle = (p, trk) => {
      const r = Math.PI / 180; const e = S.earth;
      const a = e.project(p.lat, p.lon); const b = e.project(p.lat + Math.cos(trk * r) * 0.3, p.lon + Math.sin(trk * r) * 0.3 / Math.max(0.2, Math.cos(p.lat * r)));
      return Math.atan2(b.y - a.y, b.x - a.x);
    };
    function drawAir() {
      if (!ctx || !S.earth) return;
      const e = S.earth; const now = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, air.clientWidth, air.clientHeight);
      // route of the selected flight
      if (S.route && S.route.stops && (S.sel || S.status)) {
        const [o, d] = [S.route.stops[0], S.route.stops[S.route.stops.length - 1]];
        if (o.lat != null && d.lat != null) {
          const pts = window.KioskEarth.arc(o, d, 64, 0);
          const here = S.sel ? posOf(S.sel, now) : null;
          const done = here ? kmBetween(o, here) / Math.max(1, kmBetween(o, here) + kmBetween(here, d)) : (S.status && S.status.status === 'landed' ? 1 : 0);
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          [[0, done, 'rgba(255,255,255,.95)', []], [done, 1, 'rgba(255,255,255,.55)', [5, 6]]].forEach(([t0, t1, col, dash]) => {
            ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.beginPath(); let pen = false;
            pts.forEach((q) => { if (q.t < t0 || q.t > t1) return; const s = e.project(q.lat, q.lon); if (!s.front) { pen = false; return; } if (pen) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); pen = true; });
            ctx.stroke();
          });
          ctx.setLineDash([]);
          [o, d].forEach((ap) => {
            const s = e.project(ap.lat, ap.lon); if (!s.front) return;
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, 6.283); ctx.fill();
            ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace'; ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4; ctx.fillText(ap.iata || ap.icao, s.x + 9, s.y + 4); ctx.shadowBlur = 0;
          });
        }
      }
      // everything else in the air
      S.field.forEach((a) => {
        if (S.sel && a.hex === S.sel.hex) return;
        const p = posOf(a, now); const s = e.project(p.lat, p.lon);
        if (!s.front || s.x < -20 || s.y < -20 || s.x > air.clientWidth + 20 || s.y > air.clientHeight + 20) return;
        plane(s.x, s.y, screenAngle(p, a.track || 0), 13, a.ground ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.88)');
      });
      // the one we're watching
      if (S.sel) {
        const p = posOf(S.sel, now); const s = e.project(p.lat, p.lon);
        if (s.front) {
          const ang = screenAngle(p, S.sel.track || 0);
          ctx.strokeStyle = 'rgba(255,122,61,.55)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(s.x, s.y, 22 + 4 * Math.sin(now / 300), 0, 6.283); ctx.stroke();
          plane(s.x, s.y, ang, 30, '#ff7a3d', 'rgba(255,122,61,.9)');
        }
      }
    }
    let raf = 0; let lastCam = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !S.earth) return;
      if (S.follow && S.sel && now - lastCam > 50) {
        lastCam = now; const p = posOf(S.sel, now); const v = frameView(p.lat, p.lon, true);
        if (!S.flying) { S.earth.view.lat = v.lat; S.earth.view.lon = v.lon; S.earth.invalidate(); }
      }
      drawAir();
    };

    // --- panels
    const fmt = (n, d = 0) => (n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }));
    const phase = (a) => (a.ground ? ['ground', 'On the ground'] : a.vs > 400 ? ['climb', 'Climbing'] : a.vs < -400 ? ['descend', 'Descending'] : a.alt > 18000 ? ['cruise', 'Cruising'] : ['level', 'In the air']);
    // Gates, times and delays from Aviationstack
    function statusHtml(st) {
      const end = (e, label) => {
        const late = (e.estimated || e.actual) && e.scheduled && (e.actual || e.estimated) > e.scheduled;
        const now = e.actual ? ['Actual', asTime(e.actual)] : e.estimated ? ['Expected', asTime(e.estimated)] : null;
        return `<div class="k-fstat__end">
          <small>${label}</small><b>${esc(e.iata || e.icao || '—')}</b><span>${esc(e.airport || '')}</span>
          <dl>
            <div><dt>Scheduled</dt><dd>${esc(asTime(e.scheduled) || '—')}</dd></div>
            ${now ? `<div><dt>${now[0]}</dt><dd class="${late ? 'is-late' : 'is-ok'}">${esc(now[1])}</dd></div>` : ''}
            ${e.terminal ? `<div><dt>Terminal</dt><dd>${esc(e.terminal)}</dd></div>` : ''}
            ${e.gate ? `<div><dt>Gate</dt><dd>${esc(e.gate)}</dd></div>` : ''}
            ${e.baggage ? `<div><dt>Baggage</dt><dd>${esc(e.baggage)}</dd></div>` : ''}
          </dl></div>`;
      };
      const delay = Math.max(st.dep.delay || 0, st.arr.delay || 0);
      const day = st.date ? new Date(`${st.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
      return `<div class="k-fstat">
        <p class="k-fstat__head"><span class="k-fstat__pill k-fstat__pill--${esc(st.status)}">${esc(STATUS_LABEL[st.status] || st.status)}</span>${delay ? `<span class="k-fstat__delay">Delayed ${delay} min</span>` : ''}<span class="k-fstat__day">${esc(day)}</span></p>
        <div class="k-fstat__ends">${end(st.dep, 'Departs')}${end(st.arr, 'Arrives')}</div>
        <p class="k-fstat__note">Local airport times · Aviationstack</p>
      </div>`;
    }
    function card() {
      const a = S.sel;
      if (!a && S.status) {
        const st = S.status;
        resEl.innerHTML = `<article class="k-fcard" aria-live="polite">
          <div class="k-fcard__top"><div><p class="k-fcard__airline">${esc(st.airline.name || 'Flight')}${st.flight.icao ? ` · ${esc(prettyCs(st.flight.icao))}` : ''}</p>
          <h2 class="k-fcard__cs">${esc(st.flight.iata || st.flight.icao)}</h2></div></div>
          ${statusHtml(st)}
          ${st.aircraft && (st.aircraft.type || st.aircraft.reg) ? `<p class="k-fcard__seen">Aircraft ${esc([st.aircraft.type, st.aircraft.reg].filter(Boolean).join(' · '))}</p>` : ''}
          <div class="k-fcard__cta"><button class="k-btn k-btn--sm" type="button" data-fl-random>Another flight</button><button class="k-btn k-btn--sm" type="button" data-fl-share>Copy link</button></div>
        </article>`;
        return;
      }
      if (!a) { resEl.innerHTML = ''; return; }
      const [pk, pl] = phase(a);
      const stops = S.route && S.route.stops; const o = stops && stops[0]; const d = stops && stops[stops.length - 1];
      let prog = '';
      if (o && d && o.lat != null) {
        const here = posOf(a, performance.now()); const k = kmBetween(o, here) / Math.max(1, kmBetween(o, here) + kmBetween(here, d));
        prog = `<div class="k-fcard__route"><div><b>${esc(o.iata || o.icao)}</b><small>${esc(o.city || o.name)}</small></div>
          <div class="k-fcard__track" style="--p:${k.toFixed(3)}"><i></i><span aria-hidden="true">✈</span></div>
          <div><b>${esc(d.iata || d.icao)}</b><small>${esc(d.city || d.name)}</small></div></div>
          <p class="k-fcard__left">${fmt(kmBetween(here, d))} km to go${a.gs ? ` · about ${Math.max(1, Math.round(kmBetween(here, d) / (a.gs * 1.852) * 60))} min at this speed` : ''}${S.route.plausible ? '' : ' · route unconfirmed'}</p>`;
      }
      const ago = Math.max(0, Math.round((performance.now() - a._at) / 1000 + (a.seen || 0)));
      resEl.innerHTML = `<article class="k-fcard" aria-live="polite">
        <div class="k-fcard__top">
          <div><p class="k-fcard__airline">${esc(airlineOf(a.callsign) || (a.sample ? 'KIOSK Air · sample' : a.desc || 'Flight'))}${iataNo(a.callsign) ? ` · ${esc(iataNo(a.callsign))}` : ''}</p>
          <h2 class="k-fcard__cs">${esc(prettyCs(a.callsign) || a.hex.toUpperCase())}</h2></div>
          <span class="k-fcard__state k-fcard__state--${pk}">${pl}</span>
        </div>
        ${prog}
        ${S.status ? statusHtml(S.status) : ''}
        <dl class="k-fcard__grid">
          <div><dt>Altitude</dt><dd>${a.ground ? 'Ground' : `${fmt(a.alt)} ft`}</dd></div>
          <div><dt>Ground speed</dt><dd>${fmt(a.gs)} kt<small>${fmt(a.gs * 1.852)} km/h</small></dd></div>
          <div><dt>Heading</dt><dd>${fmt(a.track)}° ${compass(a.track)}</dd></div>
          <div><dt>Vertical</dt><dd>${a.vs ? `${a.vs > 0 ? '+' : ''}${fmt(a.vs)} ft/min` : 'Level'}</dd></div>
          <div><dt>Aircraft</dt><dd>${esc(a.type || '—')}${a.reg ? `<small>${esc(a.reg)}</small>` : ''}</dd></div>
          <div><dt>Position</dt><dd class="k-mono">${esc(fmtGeo({ lat: a.lat, lon: a.lon }))}</dd></div>
        </dl>
        <p class="k-fcard__seen">${a.sample ? 'Sample traffic · live feed unavailable' : `Last fix ${ago} s ago · ${esc(S.source || 'ADS-B')}${a.squawk ? ` · squawk ${esc(a.squawk)}` : ''}`}</p>
        <div class="k-fcard__cta">
          <button class="k-btn k-btn--sm" type="button" data-fl-follow aria-pressed="${S.follow}">${S.follow ? 'Following' : 'Follow'}</button>
          ${!a.sample && !S.status && S.statusOn && a.callsign ? `<button class="k-btn k-btn--sm" type="button" data-fl-times${S.statusBusy ? ' disabled' : ''}>${S.statusBusy ? 'Checking…' : 'Gate & times'}</button>` : ''}
          <button class="k-btn k-btn--sm" type="button" data-fl-random>Another flight</button>
          ${a.sample ? '' : '<button class="k-btn k-btn--sm" type="button" data-fl-share>Copy link</button>'}
        </div>
      </article>`;
    }
    function list() {
      const items = S.field.filter((a) => a.callsign && !a.ground && (!S.sel || a.hex !== S.sel.hex)).sort((x, y) => (y.alt || 0) - (x.alt || 0)).slice(0, 10);
      listEl.innerHTML = items.length ? `<h3 class="k-flights__list-title">Also in the air${S.hub ? ` near ${esc(S.hub.n)}` : ''}</h3>
        <ul>${items.map((a) => `<li><button type="button" data-fl-pick="${esc(a.hex)}"><span class="k-flights__cs">${esc(prettyCs(a.callsign))}</span><span class="k-flights__al">${esc(airlineOf(a.callsign) || a.type || '')}</span><span class="k-flights__alt">${fmt(a.alt)} ft</span></button></li>`).join('')}</ul>` : '';
    }

    // --- actions
    async function loadField(hub) {
      S.hub = hub;
      try {
        const d = await api(`near=${hub.lat.toFixed(2)},${hub.lon.toFixed(2)}`);
        S.live = true; S.source = d.source; S.field = stamp(d.aircraft || []);
      } catch (e) {
        if (signal.aborted) throw e;
        S.live = false; S.source = 'sample'; S.field = stamp(sampleTraffic(hub));
      }
      S.fieldAt = performance.now();
      return S.field;
    }
    async function routeFor(a) {
      S.route = null;
      if (!a || a.sample || !a.callsign || !S.live) return;
      try { const r = await api(`route=${encodeURIComponent(a.callsign)}&lat=${a.lat.toFixed(3)}&lon=${a.lon.toFixed(3)}`); if (S.sel === a) { S.route = r.route; card(); } } catch (e) { /* routes are a bonus */ }
    }
    // One Aviationstack lookup (cached on the server); only on request, the plan is small
    async function statusLookup(code) {
      if (!S.statusOn || !code) return null;
      try { const d = await api(`status=${encodeURIComponent(code)}`); return d.flight || null; } catch (e) {
        if (e.status === 503) S.statusOn = false;          // no key on this deploy
        else if (e.status === 429) toast(e.message || 'Flight status is busy. Try again later.');
        return null;
      }
    }
    async function select(a, why, status = null) {
      S.sel = a; S.route = null; S.follow = true; S.status = status;
      if (!a) { card(); return; }
      card(); list();
      const p = posOf(a, performance.now());
      S.flying = true; await S.earth.flyTo(frameView(p.lat, p.lon, true), 1800); S.flying = false;
      say(why || (S.live ? `${prettyCs(a.callsign) || 'This aircraft'} is ${phase(a)[1].toLowerCase()}${S.hub ? ` near ${S.hub.n}` : ''}.` : 'The live feed isn’t reachable right now, so this is sample traffic from the KIOSK fleet.'));
      const qs = new URLSearchParams(location.search);
      if (a.callsign && !a.sample) qs.set('f', a.callsign); else qs.delete('f');
      history.replaceState(history.state, '', `${location.pathname}${qs.toString() ? `?${qs}` : ''}`);
      routeFor(a);
    }
    async function random() {
      say('Scanning the skies…');
      const hub = FL_HUBS[Math.floor(Math.random() * FL_HUBS.length)];
      S.flying = true; S.sel = null; card();
      const flight = S.earth.flyTo(frameView(hub.lat, hub.lon, false), 1600);
      const field = await loadField(hub).catch(() => []);
      await flight; S.flying = false;
      const pool = field.filter((a) => a.callsign && !a.ground && a.alt > 8000);
      list();
      if (!pool.length) { say(`Quiet skies over ${hub.n} right now. Try again.`); return; }
      await select(pool[Math.floor(Math.random() * pool.length)]);
    }
    async function search(raw) {
      const cs = toCallsign(raw);
      if (cs.length < 3) { say('Type a flight number like BA117 or a callsign like DAL1.'); return; }
      say(`Looking for ${prettyCs(cs)}…`);
      const typed = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const flightNo = /^[A-Z0-9]{2}\d/.test(typed) && !/^[A-Z]{3}\d/.test(typed) ? typed : (iataFor(cs) || cs);
      const [live, st] = await Promise.all([
        api(`callsign=${encodeURIComponent(cs)}`).then((d) => { S.live = true; S.source = d.source; return stamp(d.aircraft || []).sort((x, y) => (x.seen || 0) - (y.seen || 0))[0] || null; }).catch((e) => (e.status === 429 ? 'busy' : null)),
        statusLookup(flightNo),
      ]);
      if (signal.aborted) return;
      let hit = live && live !== 'busy' ? live : null;
      // In the air per Aviationstack but not on ADS-B: plot its reported position
      if (!hit && st && st.live && st.live.lat != null && !st.live.ground) {
        hit = stamp([{ hex: (st.aircraft && st.aircraft.icao24) || `as${cs}`.toLowerCase().slice(0, 6), callsign: st.flight.icao || cs, reg: (st.aircraft || {}).reg || '', type: (st.aircraft || {}).type || '', lat: st.live.lat, lon: st.live.lon, alt: st.live.alt, gs: st.live.gs, track: st.live.track, vs: 0, seen: 0, ground: false }])[0];
      }
      if (hit) {
        const near = FL_HUBS.slice().sort((x, y) => kmBetween(x, hit) - kmBetween(y, hit))[0];
        S.hub = null;
        loadField({ n: near.n, lat: hit.lat, lon: hit.lon }).then(() => { if (!S.field.some((a) => a.hex === hit.hex)) S.field.push(hit); list(); }).catch(() => {});
        await select(hit, `${prettyCs(hit.callsign)} found${airlineOf(hit.callsign) ? `, ${airlineOf(hit.callsign)}` : ''}.`, st);
        return;
      }
      if (st) {
        // Not in the air: show its status and its route on the globe
        S.sel = null; S.status = st; S.route = null; card();
        const label = `${st.flight.iata || cs} · ${STATUS_LABEL[st.status] || st.status}`;
        say(st.status === 'scheduled' ? `${label}. Departs ${st.dep.iata || ''} at ${asTime(st.dep.estimated || st.dep.scheduled) || '—'} local.` : st.status === 'landed' ? `${label} at ${st.arr.iata || ''}${st.arr.actual ? ` (${asTime(st.arr.actual)} local)` : ''}.` : `${label}.`);
        const qs = new URLSearchParams(location.search); qs.set('f', st.flight.iata || cs);
        history.replaceState(history.state, '', `${location.pathname}?${qs}`);
        try {
          const r = await api(`route=${encodeURIComponent(st.flight.icao || cs)}&lat=0&lon=0`);
          const stops = r.route && r.route.stops;
          if (stops && stops[0].lat != null && S.status === st) {
            S.route = r.route;
            const o = stops[0]; const d = stops[stops.length - 1];
            const mid = window.KioskEarth.arc(o, d, 2, 0)[1];
            S.earth.flyTo(frameView(mid.lat, mid.lon, false), 1600);
          }
        } catch (e) { /* the status card stands on its own */ }
        return;
      }
      if (live === 'busy') { say('Too many lookups at once. Give it a few seconds.'); return; }
      say(`${prettyCs(cs)} isn’t in the air right now${S.statusOn ? ' and has no status today' : ', or it isn’t broadcasting'}. Check the number, or try another.`);
    }
    function above() {
      if (!navigator.geolocation) { say('Your browser can’t share a location.'); return; }
      say('Finding you…');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const hub = { n: 'you', lat: pos.coords.latitude, lon: pos.coords.longitude };
        S.flying = true; S.sel = null; card();
        await Promise.all([S.earth.flyTo(frameView(hub.lat, hub.lon, false), 1600), loadField(hub)]);
        S.flying = false; list();
        const pool = S.field.filter((a) => a.callsign && !a.ground);
        if (!pool.length) { say('Nothing broadcasting overhead right now.'); return; }
        const nearest = pool.sort((x, y) => kmBetween(x, hub) - kmBetween(y, hub))[0];
        await select(nearest, `${prettyCs(nearest.callsign)} is the closest flight to you, ${fmt(kmBetween(nearest, hub))} km away.`);
      }, () => say('Location is off, so we can’t look overhead. Try Surprise me instead.'), { timeout: 10000, maximumAge: 300000 });
    }

    // --- refresh the watched flight and its neighbours
    const tick = setInterval(async () => {
      if (document.hidden || !S.live) return;
      if (S.sel && !S.sel.sample) {
        try { const d = await api(`hex=${S.sel.hex}`); const n = stamp(d.aircraft || [])[0]; if (n) { Object.assign(S.sel, n); card(); } } catch (e) { /* keep dead-reckoning */ }
      }
      if (S.hub && performance.now() - S.fieldAt > 30000) { await loadField(S.hub).catch(() => {}); if (S.sel) { const n = S.field.find((a) => a.hex === S.sel.hex); if (n) Object.assign(S.sel, n); } list(); }
    }, 15000);

    $('[data-fl-form]', root).addEventListener('submit', (e) => { e.preventDefault(); search($('[data-fl-q]', root).value); }, { signal });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-fl-random]')) { random(); return; }
      if (e.target.closest('[data-fl-near]')) { above(); return; }
      if (e.target.closest('[data-fl-times]') && S.sel && !S.statusBusy) {
        const a = S.sel; S.statusBusy = true; card();
        statusLookup(iataFor(a.callsign) || a.callsign).then((st) => {
          S.statusBusy = false;
          if (S.sel !== a) return;
          S.status = st; card();
          if (!st) say(S.statusOn ? `No gate or schedule found for ${prettyCs(a.callsign)}. Private and cargo flights often aren’t listed.` : 'Flight status isn’t set up on this site yet.');
        });
        return;
      }
      const f = e.target.closest('[data-fl-follow]');
      if (f) { S.follow = !S.follow; card(); if (S.follow && S.sel) { const p = posOf(S.sel, performance.now()); S.earth.flyTo(frameView(p.lat, p.lon, true), 900); } return; }
      if (e.target.closest('[data-fl-share]')) { navigator.clipboard && navigator.clipboard.writeText(location.href).then(() => toast('Link copied')); return; }
      const pk = e.target.closest('[data-fl-pick]');
      if (pk) { const a = S.field.find((x) => x.hex === pk.dataset.flPick); if (a) select(a); }
    }, { signal });

    loadScript('js/kiosk-earth.js').then(() => {
      if (signal.aborted || !window.KioskEarth) return;
      const start = FL_HUBS[0];
      let earth = null;
      try { earth = window.KioskEarth.create($('[data-fl-earth]', root), { view: frameView(start.lat + 8, start.lon - 20, false), drag: true, relief: 0.9, onDrag: (on) => { if (on) S.follow = false; } }); } catch (e) { earth = null; }
      if (!earth || !earth.gl) { root.classList.add('is-nogl'); return; }
      S.earth = earth;
      const lbl = window.KioskEarth.labels($('[data-fl-labels]', root), earth);
      earth.onFrame = () => lbl.update();
      earth.ready.then(() => root.classList.add('is-ready'), () => root.classList.add('is-nogl'));
      sizeAir(); window.addEventListener('resize', sizeAir, { signal });
      raf = requestAnimationFrame(loop);
      const want = new URLSearchParams(location.search).get('f');
      if (want) { $('[data-fl-q]', root).value = want; search(want); } else random();
    }).catch(() => root.classList.add('is-nogl'));

    signal.addEventListener('abort', () => { clearInterval(tick); cancelAnimationFrame(raf); if (S.earth) S.earth.destroy(); });
  }

  /* Check-in answers (js/kiosk-onboard.js) and how they pick posts */
  const taste = () => { const t = store.get('kiosk:taste', null); return t && t.completedAt ? t : null; };

  /* Voyagers (signed-in members) get their check-in applied by default:
   * their size on drop alerts, and the shop filtered and sorted for them. */
  const isMember = () => { const a = window.KIOSK_ACCOUNT; const st = a && a.getState ? a.getState() : null; return !!(st && st.user); };
  const memberTaste = () => (isMember() ? taste() : null);
  const memberEmail = () => { const a = window.KIOSK_ACCOUNT; const st = a && a.getState ? a.getState() : null; return (st && st.user && st.user.email) || ''; };
  const LETTER = { xxs: 0, xs: 1, s: 2, m: 3, l: 4, xl: 5, xxl: 6, '2xl': 6, xxxl: 7, '3xl': 7, '4xl': 8 };
  const letterOf = (z) => LETTER[String(z).trim().toLowerCase()];
  /** Does a piece come in their check-in size? Pieces without clothing sizes (bags, decks, one size) always fit. */
  function fitsMe(p, t) {
    const sizes = p.sizes || [];
    const top = t && t.sizes && t.sizes.top;
    const waist = t && t.sizes && t.sizes.bottom;
    const letters = sizes.filter((z) => letterOf(z) != null);
    const waists = sizes.filter((z) => /^\d{2}$/.test(String(z).trim()));
    if (letters.length && top) return letters.some((z) => letterOf(z) === letterOf(top));
    if (waists.length && waist) return waists.some((z) => String(z).trim() === String(waist).replace(/\D/g, ''));
    return true;
  }
  /** The size on a piece that matches their check-in, or ''. */
  const mySizeOn = (p, t) => (t && t.sizes && t.sizes.top ? (p.sizes || []).find((z) => letterOf(z) != null && letterOf(z) === letterOf(t.sizes.top)) || '' : '');
  /** A colourway's family, in check-in terms: black, bone, grey, navy, olive, brown, red or pop. */
  function colourFamily(w) {
    const n = String((w && w.name) || '').toLowerCase();
    const byName = [
      ['black', /black|obsidian|onyx|ink|midnight(?! blue)/], ['bone', /white|bone|oat|sand|cream|ivory|ecru|natural|parchment/],
      ['grey', /grey|gray|charcoal|slate|heather|chrome|gunmetal|asphalt|steel|concrete|silver|ash/], ['navy', /navy|indigo|denim/],
      ['olive', /olive|matcha|moss|sage|army|forest|green|khaki/], ['brown', /brown|espresso|oak|taupe|mocha|coffee|chocolate|tan|camel|rust/],
      ['red', /red|crimson|burgundy|maroon|wine|cherry/],
    ].find(([, re]) => re.test(n));
    if (byName) return byName[0];
    const hex = String((w && w.garment) || '').replace('#', '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const max = Math.max(r, g, b); const min = Math.min(r, g, b);
      if (max < 60) return 'black';
      if (max - min < 24) return max > 200 ? 'bone' : 'grey';
    }
    return 'pop';
  }
  /** How well a piece suits their colours: 1 when a colourway is in a family they wear. */
  const colourScore = (p, t) => ((t && (t.colors || []).length && (p.colorways || []).some((w) => t.colors.includes(colourFamily(w)))) ? 1 : 0);
  const INTEREST_MATCH = {
    cars: { desks: ['automotive'], words: /\b(car|cars|meet|stance|drift|jdm|rollers|build|garage|infiniti|bmw|honda civic|night drive)\b/i },
    motorcycles: { words: /\b(motorcycle|moto|bike|superbike|rider|riders|r1m?|r3|cbr|yamaha|ducati|powersports)\b/i },
    sports: { words: /\b(sport|race|racing|track|skate|ball|game)\b/i },
    travel: { desks: ['travel'], words: /\b(travel|trip|road|city|night drive|vhs)\b/i },
    fashion: { desks: ['fashion'], words: /\b(fashion|streetwear|fit|style|sourcing|thrift)\b/i },
    skate: { words: /\b(skate|board|park)\b/i },
    music: { desks: ['music'], words: /\b(music|mix|phonk|record|tape|vhs|sound)\b/i },
    culture: { words: /\b(culture|people|community|meet|lunar)\b/i },
    food: { words: /\b(food|eat|kitchen|market)\b/i },
    photo: { words: /\b(photo|film|camera|frames?|edit|cinematic)\b/i },
  };
  const FORMAT_MATCH = { films: 'video', vlogs: 'video', interviews: 'video', photo: 'photo', reads: 'article', audio: 'article' };
  function pickedFor(t, posts) {
    const words = (f) => [f.title, f.make, f.model, f.tagline, f.city, (f.tags || []).join(' ')].filter(Boolean).join(' ');
    const types = new Set((t.formats || []).map((x) => FORMAT_MATCH[x]).filter(Boolean));
    return posts.map((f) => {
      let score = 0;
      (t.interests || []).forEach((k) => { const m = INTEREST_MATCH[k]; if (!m) return; if ((m.desks || []).includes(f.desk)) score += 2; if (m.words && m.words.test(words(f))) score += 3; });
      if (types.has(postType(f))) score += 1;
      return { f, score };
    }).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score || String(b.f.published || '').localeCompare(String(a.f.published || ''))).map((x) => x.f);
  }

  /* Netflix-style rows for the Atlas: featured up top, then by type and desk */
  function atlasTile(f, big) {
    const type = postType(f);
    const title = f.title || featureName(f);
    const meta = type === 'video' ? (f.runtime || 'Film') : type === 'photo' ? `${(f.gallery || []).length || ''} photos`.trim() : `${readMinutes(f)} min read`;
    const sub = [postPlace(f), meta].filter(Boolean).join(' · ');
    return `<a class="k-ftile k-atile${big ? ' k-atile--big' : ''}" href="${storyHref(f)}" aria-label="${esc(title)}${sub ? `, ${esc(sub)}` : ''}">
      <span class="k-ftile__media">
        ${media({ image: f.image, tone: f.tone, mark: f.code, alt: '', focus: f.focus, vimeo: f.vimeo })}
        <span class="k-lib-card__type k-lib-card__type--${type}">${type === 'video' ? '▶ ' : ''}${esc(POST_TYPES[type])}</span>
        ${big ? `<span class="k-atile__over"><small>${esc([f.published ? shortDate(f.published) : "", postPlace(f)].filter(Boolean).join(' · '))}</small><b>${esc(title)}</b>${f.tagline ? `<em>${esc(f.tagline)}</em>` : ''}</span>` : ''}
      </span>
      ${big ? '' : `<span class="k-ftile__info"><b>${esc(title)}</b><small>${esc(sub)}</small></span>`}
    </a>`;
  }
  function atlasRows(posts) {
    const newest = byNewest(posts);
    const featured = worldFeatured();
    const t = taste();
    const picks = t ? pickedFor(t, posts) : [];
    const rows = [
      ...(picks.length ? [{ title: t.name ? `Picked for you, ${t.name}` : 'Picked for you', list: picks }] : []),
      { title: 'Featured', list: featured, big: true },
      { title: 'Latest from the road', list: newest },
      { title: 'Films & vlogs', list: newest.filter((f) => postType(f) === 'video') },
      { title: 'Photo diaries', list: newest.filter((f) => postType(f) === 'photo') },
      { title: 'Stories', list: newest.filter((f) => postType(f) === 'article') },
      ...Object.keys(DESKS).map((d) => ({ title: `${DESKS[d]} desk`, list: newest.filter((f) => f.desk === d) })),
    ].filter((r) => r.list.length);
    const nudge = t ? '' : `<div class="k-wrap"><div class="k-atlas-checkin"><p>Tell us what you’re into and the Atlas will pick for you.</p><button class="k-btn k-btn--sm k-btn--solid" type="button" data-onboard-open>Check in · 1 min</button></div></div>`;
    return nudge + rows.map((r) => `
      <div class="k-wrap k-frow k-arow${r.big ? ' k-arow--big' : ''}" data-reveal>
        <div class="k-frow__head"><h2 class="k-frow__title">${esc(r.title)}</h2><span class="k-frow__count">${r.list.length}</span></div>
        ${railShell(r.list.map((f) => atlasTile(f, r.big)).join(''), r.title, `k-hscroll-wrap--films${r.big ? ' k-hscroll-wrap--atlas-big' : ''}`)}
      </div>`).join('');
  }
  /* The Atlas header: a wireframe globe (js/kiosk-wireglobe.js) with real
   * coastlines, cities as plot points, map labels and the stories pinned at
   * their coordinates. Swipe to turn it, pinch / ctrl-scroll / the buttons to
   * zoom, double-tap to fly in; it drifts slowly until someone takes over. */
  function mountAtlasEarth(posts) {
    const hero = $('[data-atlas-hero]');
    const canvas = $('[data-atlas-earth]');
    if (!hero || !canvas) return;
    const signal = pageAbort.signal;
    const pinned = worldFeatured().concat(posts).filter((f, i, a) => f.geo && a.indexOf(f) === i).slice(0, 4);
    const pinsEl = $('[data-atlas-pins]', hero);
    pinsEl.innerHTML = pinned.map((f, i) => `
      <a class="k-wl-node k-atlas-pin" href="${storyHref(f)}" data-atlas-pin="${i}" aria-label="${esc(f.title || featureName(f))}, ${esc(postPlace(f) || fmtGeo(f.geo))}">
        <span class="k-wl-node__line" aria-hidden="true"></span>
        <span class="k-wl-node__pin" aria-hidden="true"></span>
        <span class="k-wl-node__card">
          <span class="k-wl-node__thumb">${featureMedia(f, { meta: '', mark: f.code, cls: 'k-media--clean', style: 'position:absolute;inset:0' })}</span>
          <span class="k-wl-node__label"><b>${esc(f.title || featureName(f))}</b><small>${esc(postPlace(f) || fmtGeo(f.geo))}</small></span>
        </span>
      </a>`).join('');
    const pins = $$('[data-atlas-pin]', pinsEl);
    Promise.all([loadScript('js/kiosk-earth.js'), loadScript('js/kiosk-wireglobe.js')]).then(() => {
      if (signal.aborted || !window.KioskWireGlobe) return;
      const geos = pinned.map((f) => f.geo);
      const c = geos.length ? { lat: geos.reduce((a, g) => a + g.lat, 0) / geos.length, lon: geos.reduce((a, g) => a + g.lon, 0) / geos.length } : HOME_GEO;
      const phone = () => window.innerWidth < 760;
      const home = () => (phone()
        ? { lat: c.lat - 4, lon: c.lon - 6, zoom: 1.5, cx: 0.5, cy: 0.36, fit: 0.46 }
        : { lat: c.lat - 2, lon: c.lon - 10, zoom: 1.25, cx: 0.62, cy: 0.46, fit: 0.42 });
      const cities = (window.KioskEarth ? window.KioskEarth.LABELS : []).filter((l) => l.k === 'city');
      const globe = window.KioskWireGlobe.create(canvas, { view: home(), cities, grabZoom: home().zoom * 1.2 });
      const lbl = window.KioskEarth ? window.KioskEarth.labels($('[data-atlas-labels]', hero), globe, { skip: pinned.map(postPlace) }) : null;
      globe.onFrame = () => {
        const spread = Math.min(hero.clientWidth, hero.clientHeight) * (phone() ? 0.2 : 0.17);
        const avoid = [];
        pins.forEach((n, i) => {
          const p = globe.project(geos[i].lat, geos[i].lon);
          const ox = NODE_FAN[i][0] * spread * (phone() ? 1.5 : 1.7); const oy = NODE_FAN[i][1] * spread * (phone() ? 1.55 : 1.3);
          if (p.front) avoid.push({ x: p.x, y: p.y, r: 14 }, { x: p.x + ox, y: p.y + oy, r: phone() ? 56 : 84 });
          n.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
          n.style.setProperty('--ox', `${ox.toFixed(1)}px`); n.style.setProperty('--oy', `${oy.toFixed(1)}px`);
          n.style.setProperty('--len', `${Math.hypot(ox, oy).toFixed(1)}px`);
          n.style.setProperty('--ang', `${Math.atan2(oy, ox).toFixed(4)}rad`);
          n.style.opacity = p.front ? '' : '0';
          n.style.pointerEvents = p.front ? '' : 'none';
        });
        if (lbl) lbl.update(avoid);
      };
      globe.ready.then(() => hero.classList.add('is-ready'), () => hero.classList.add('is-ready'));

      // A slow drift west to east until someone takes the controls
      let drift = !REDUCED; let t0 = performance.now(); let raf = 0; let seen = true;
      const base = globe.view.lon;
      const spin = (now) => {
        raf = 0;
        if (!drift || !seen || signal.aborted) return;
        globe.view.lon = base + Math.sin((now - t0) / 14000) * 6;
        globe.invalidate();
        raf = requestAnimationFrame(spin);
      };
      if (drift) raf = requestAnimationFrame(spin);
      globe.onGrab = () => { drift = false; };
      const io = new IntersectionObserver(([en]) => { seen = en.isIntersecting; if (seen && drift && !raf) raf = requestAnimationFrame(spin); });
      io.observe(hero);
      // Zoom buttons; the middle one flies back to the stories
      hero.addEventListener('click', (e) => {
        const b = e.target.closest('[data-atlas-zoom]');
        if (!b) return;
        drift = false;
        const k = b.dataset.atlasZoom;
        if (k === 'home') { const h = home(); globe.face(h.lat, h.lon, h.zoom); } else globe.zoomBy(k === 'in' ? 1.6 : 1 / 1.6);
      }, { signal });
      window.addEventListener('resize', () => { if (!drift) return; Object.assign(globe.view, home()); globe.invalidate(); }, { signal });
      signal.addEventListener('abort', () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); globe.destroy(); });
    }).catch(() => hero.classList.add('is-nogl'));
  }
  function pageJournal() {
    const posts = features.slice();
    const params = new URLSearchParams(location.search);
    const st = {
      q: params.get('q') || '', sort: params.get('sort') || 'new', type: params.get('type') || '',
      desk: params.get('desk') || '', author: params.get('author') || '', loc: params.get('loc') || '',
      tags: new Set((params.get('tag') || '').split(',').filter(Boolean)),
    };
    const signal = pageAbort.signal;
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const authors = uniq(posts.map((f) => f.author || 'KIOSK'));
    const tags = uniq([].concat(...posts.map((f) => f.tags || [])));
    const locs = uniq(posts.map(postPlace));
    const desks = uniq(posts.map((f) => f.desk));
    fill('journal-count', `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`);

    const chip = (key, val, label, on) => `<button type="button" class="k-chip" data-lib="${key}" data-val="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    const controls = () => `
      <div class="k-lib__bar">
        <label class="k-sr" for="lib-sort">Sort</label>
        <select class="k-select" id="lib-sort" data-lib-sort>
          ${[['new', 'Newest first'], ['old', 'Oldest first'], ['title', 'Title A–Z'], ['place', 'Location A–Z'], ['author', 'Author A–Z']].map(([v, l]) => `<option value="${v}"${st.sort === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="k-lib__filters">
        <div class="k-lib__group" role="group" aria-label="Type"><span class="k-lib__label">Type</span>${chip('type', '', 'All', !st.type)}${Object.keys(POST_TYPES).map((t) => chip('type', t, POST_TYPES[t], st.type === t)).join('')}</div>
        ${desks.length > 1 ? `<div class="k-lib__group" role="group" aria-label="Desk"><span class="k-lib__label">Desk</span>${chip('desk', '', 'All', !st.desk)}${desks.map((d) => chip('desk', d, DESKS[d] || d, st.desk === d)).join('')}</div>` : ''}
        <div class="k-lib__group" role="group" aria-label="Author"><span class="k-lib__label">Author</span>${chip('author', '', 'All', !st.author)}${authors.map((a) => chip('author', a, a, st.author === a)).join('')}</div>
        <details class="k-lib__more"${st.loc || st.tags.size ? ' open' : ''}><summary>Location &amp; tags${st.loc || st.tags.size ? ` · ${[st.loc, ...[...st.tags].map((t) => `#${t}`)].filter(Boolean).map(esc).join(' ')}` : ''}</summary>
          ${locs.length ? `<div class="k-lib__group" role="group" aria-label="Location"><span class="k-lib__label">Location</span>${chip('loc', '', 'Anywhere', !st.loc)}${locs.map((l) => chip('loc', l, l, st.loc === l)).join('')}</div>` : ''}
          <div class="k-lib__group" role="group" aria-label="Tags"><span class="k-lib__label">Tags</span>${tags.map((t) => chip('tag', t, `#${t}`, st.tags.has(t))).join('')}</div>
        </details>
      </div>`;
    const results = () => {
      const q = st.q.trim().toLowerCase();
      // Browsing (no search or filter): streaming rows. Otherwise: a results grid.
      const active = !!(q || st.type || st.desk || st.author || st.loc || st.tags.size || st.sort !== 'new');
      const rowsEl = mount('atlas-rows'); const resEl = $('[data-atlas-results]');
      if (rowsEl) rowsEl.hidden = active;
      if (resEl) resEl.hidden = !active;
      let list = posts.filter((f) => (!st.type || postType(f) === st.type) && (!st.desk || f.desk === st.desk)
        && (!st.author || (f.author || 'KIOSK') === st.author) && (!st.loc || postPlace(f) === st.loc)
        && [...st.tags].every((t) => (f.tags || []).includes(t))
        && (!q || q.split(/\s+/).every((w) => postText(f).toLowerCase().includes(w))));
      const by = {
        new: (a, b) => String(b.published || '').localeCompare(String(a.published || '')),
        old: (a, b) => String(a.published || '9999').localeCompare(String(b.published || '9999')),
        title: (a, b) => (a.title || featureName(a)).localeCompare(b.title || featureName(b)),
        place: (a, b) => (postPlace(a) || '~').localeCompare(postPlace(b) || '~'),
        author: (a, b) => (a.author || 'KIOSK').localeCompare(b.author || 'KIOSK'),
      }[st.sort] || (() => 0);
      list = list.sort(by);
      const n = mount('lib-count'); if (n) n.textContent = `${list.length} of ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`;
      const grid = mount('journal');
      grid.innerHTML = list.length ? list.map((f) => libraryCard(f, st.q.trim())).join('')
        : `<div class="k-empty" style="grid-column:1/-1"><p class="k-h3">Nothing in the Atlas matches that.</p><p class="k-small k-mt-s">Try another word or clear a filter.</p><button class="k-btn k-mt-m" type="button" data-lib-clear>Clear filters</button></div>`;
      reveal(grid); hydrateCovers(grid);
      const qs = new URLSearchParams();
      if (st.q) qs.set('q', st.q); if (st.sort !== 'new') qs.set('sort', st.sort); if (st.type) qs.set('type', st.type);
      if (st.desk) qs.set('desk', st.desk); if (st.author) qs.set('author', st.author); if (st.loc) qs.set('loc', st.loc); if (st.tags.size) qs.set('tag', [...st.tags].join(','));
      const str = qs.toString();
      history.replaceState(history.state, '', location.pathname + (str ? `?${str}` : '') + location.hash);
      renderedKey = pageKey();
    };
    const paint = () => { fill('lib-controls', controls()); results(); };
    $$('[data-lib-q]').forEach((el) => { el.value = st.q; });
    const paintRows = () => { fill('atlas-rows', atlasRows(posts)); hydrateCovers(mount('atlas-rows') || document); reveal(mount('atlas-rows')); };
    paintRows();
    document.addEventListener('kiosk:taste', paintRows, { signal });
    paint();
    mountAtlasEarth(posts);
    let t = 0;
    document.addEventListener('input', (e) => {
      if (!e.target.matches('[data-lib-q]')) return;
      clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; results(); }, 140);
    }, { signal });
    document.addEventListener('change', (e) => { if (e.target.matches('[data-lib-sort]')) { st.sort = e.target.value; results(); } }, { signal });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-lib]');
      const tg = e.target.closest('[data-lib-tag]');
      if (e.target.closest('[data-lib-clear]')) { Object.assign(st, { q: '', type: '', desk: '', author: '', loc: '' }); st.tags.clear(); paint(); return; }
      if (tg) { e.preventDefault(); st.tags.add(tg.dataset.libTag); paint(); return; }
      if (!c) return;
      const k = c.dataset.lib; const v = c.dataset.val;
      if (k === 'tag') { if (st.tags.has(v)) st.tags.delete(v); else st.tags.add(v); } else st[k] = v;
      paint();
    }, { signal });
    if (fill('atlas-library', libraryHtml(journalVolumes(), { title: 'Monthly volumes' }))) bindLibrary();
  }


  /* ------------------------------------------------------------ vault */

  /** The shop "wall": hero tiles of a few signature mockups. */
  function wallHtml() {
    const pick = [
      ['hoodie-garage', 0, 'Hoodie'], ['deck-hudson', 0, 'Deck', true], ['cap-kmark', 2, 'Cap'],
      ['tee-hudson', 1, 'Tee'], ['beanie-night', 0, 'Beanie'],
    ];
    return pick.map(([id, cw, label, tall]) => {
      const p = productById(id);
      if (!p) return '';
      return `<button class="k-wall__item${tall ? ' k-wall__item--tall' : ''}" type="button" data-quickview="${esc(id)}" aria-label="${esc(p.title)}">${productVisual(p, cw)}<span>${esc(label)}</span></button>`;
    }).join('');
  }

  /* ------------------------------------------------- terminal store
   * The shop as an airport terminal: a frosted header with search and a
   * split-flap departures board of the latest drops, gates for categories,
   * boarding-pass product cards, the lounge (airport lookbook), in-flight
   * downloads and the concourse of partner stores.
   * -------------------------------------------------------------------- */
  function termMedia(p, cw) {
    const life = lifeOf(p, cw);
    const alt = esc(`${p.title}${wayOf(p, cw).name ? `, ${wayOf(p, cw).name}` : ''}`);
    if (life.length) {
      return `<img class="k-tcard__img" src="${esc(life[0])}" alt="${alt}, on the street" loading="lazy" decoding="async">${life[1] ? `<img class="k-tcard__img k-tcard__img--alt" src="${esc(life[1])}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ''}`;
    }
    return `<span class="k-tcard__flat">${productVisual(p, cw)}</span>`;
  }
  function termCard(p, cw = 0) {
    const ways = p.colorways || [];
    const st = statusOf(p, cw);
    const store = storeOf(p);
    const sizes = p.sizes || [];
    const wishOn = window.KIOSK_ACCOUNT && window.KIOSK_ACCOUNT.wishlisted
      ? window.KIOSK_ACCOUNT.wishlisted('product', p.id) : false;
    return `
      <article class="k-tcard" data-tcard="${esc(p.id)}" data-cw="${cw}" data-reveal>
        <button class="k-tcard__media" type="button" data-pdp="${esc(p.id)}" data-cw="${cw}" aria-label="${esc(p.title)}">
          ${termMedia(p, cw)}
          <span class="k-board__status k-board__status--${st.key} k-tcard__status">${esc(st.label)}</span>
          <span class="k-tcard__gate" aria-hidden="true">${esc(gateOf(p.category))}</span>
        </button>
        <button type="button" class="k-tcard__wish" data-wish-product="${esc(p.id)}" aria-pressed="${wishOn}" aria-label="Save ${esc(p.title)}">${icon.heart}</button>
        ${canBuy(p, cw) ? `<button type="button" class="k-tcard__qa" data-qa="${esc(p.id)}" aria-label="Quick add ${esc(p.title)}">${icon.bag}</button>
          <div class="k-qa" data-qa-menu="${esc(p.id)}" hidden>
            <p>${sizes.length > 1 ? 'Choose size' : 'Add to bag'}</p>
            <div class="k-qa__sizes">${(sizes.length ? sizes : ['OS']).map((z) => `<button type="button" data-qa-add="${esc(p.id)}" data-size="${esc(z)}" data-cw="${cw}">${esc(z)}</button>`).join('')}</div>
          </div>` : ''}
        <div class="k-tcard__pass">
          <p class="k-tcard__row"><span>${esc(flightOf(p))}</span><span>Gate ${esc(gateOf(p.category))} · ${esc(categoryLabel(p.category))}</span></p>
          <h3 class="k-tcard__title"><button type="button" data-pdp="${esc(p.id)}" data-cw="${cw}">${esc(p.title)}</button></h3>
          <p class="k-tcard__sub">${[p.design, store && store.id !== 'kiosk' ? `by ${store.name}` : '', p.pickup ? p.pickup.place : ''].filter(Boolean).map(esc).join(' · ') || esc(p.detail || '')}</p>
          <div class="k-tcard__foot">
            <span class="k-tcard__fare">${esc(price(p))}</span>
            ${ways.length > 1 ? `<span class="k-dots" role="group" aria-label="Colourways">${ways.map((w, i) => `<button class="k-dot" type="button" style="--sw:${esc(w.garment)}" data-tdot="${i}" aria-pressed="${i === cw}" aria-label="${esc(w.name)}" title="${esc(w.name)}"></button>`).join('')}</span>` : ''}
          </div>
        </div>
      </article>`;
  }
  const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function flapText(t, n) {
    const txt = String(t).toUpperCase().replace(/[’']/g, '').slice(0, n);
    return `<span class="k-flap" aria-label="${esc(t)}">${Array.from(txt.padEnd(n, ' ')).map((ch) => `<i data-ch="${esc(ch)}">${ch === ' ' ? '&nbsp;' : esc(ch)}</i>`).join('')}</span>`;
  }
  // Split-flap: each letter rattles through the alphabet before it lands
  function flipBoard(root) {
    if (REDUCED || !root) return;
    $$('.k-flap i', root).forEach((el, i) => {
      const final = el.dataset.ch;
      if (final === ' ') return;
      let n = 4 + (i % 7) + Math.floor(Math.random() * 6);
      const tick = () => {
        if (!el.isConnected) return;
        if (n-- <= 0) { el.textContent = final; el.classList.remove('is-flip'); return; }
        el.textContent = FLAP[Math.floor(Math.random() * FLAP.length)];
        el.classList.add('is-flip');
        setTimeout(tick, 45 + Math.random() * 40);
      };
      setTimeout(tick, i * 6);
    });
  }

  /* ---------------------------------------------------- shop carousel
   * vault.html's carousel view: the filtered pieces on a turning 3D drum
   * (spinDrum). The piece in front shows its name, price and status below;
   * tap it, or "View piece", to open it. The list view is the card grid.
   * -------------------------------------------------------------------- */
  const SHOP_VIEW_KEY = 'kiosk:shop-view';

  function shopCarousel(root) {
    root.innerHTML = `
      <div class="k-wheel k-wheel--clear k-shopwheel">
        <div class="k-wheel__ambient" aria-hidden="true"><img alt="" data-sw-ambient hidden></div>
        <div class="k-wheel__stage k-shopwheel__stage" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Pieces. Left and right arrows turn the carousel, Enter opens the piece in front." data-sw-stage>
          <div class="k-wheel__drum" data-sw-drum aria-hidden="true"></div>
        </div>
        <p class="k-shopwheel__empty" data-sw-empty hidden>Nothing matches these filters.</p>
        <div class="k-wheel__now" data-sw-now>
          <button class="k-wheel__step" type="button" data-sw-step="-1" aria-label="Previous piece">${icon.left}</button>
          <div class="k-wheel__info" aria-live="polite" aria-atomic="true">
            <span class="k-mono k-wheel__count" data-sw-count></span>
            <b class="k-wheel__title" data-sw-title></b>
            <span class="k-wheel__artist" data-sw-sub></span>
          </div>
          <button class="k-wheel__step" type="button" data-sw-step="1" aria-label="Next piece">${icon.right}</button>
        </div>
        <div class="k-wheel__controls" data-sw-controls>
          <span class="k-shopwheel__fare" data-sw-fare></span>
          <button class="k-btn k-btn--solid" type="button" data-pdp="" data-cw="0" data-sw-open>View piece<span class="k-arrow">${icon.right}</span></button>
          <button type="button" class="k-tcard__wish k-shopwheel__wish" data-wish-product="" aria-pressed="false" data-sw-wish>${icon.heart}</button>
        </div>
      </div>`;
    const ambient = $('[data-sw-ambient]', root);
    const openBtn = $('[data-sw-open]', root);
    const wish = $('[data-sw-wish]', root);
    let items = [];
    let key = '';

    const describe = (i) => {
      const p = items[i];
      if (!p) return;
      const st = statusOf(p, 0);
      const store = storeOf(p);
      $('[data-sw-count]', root).textContent = `${pad(i + 1)} / ${pad(items.length)} · Gate ${gateOf(p.category)} · ${categoryLabel(p.category)}`;
      $('[data-sw-title]', root).textContent = p.title;
      $('[data-sw-sub]', root).textContent = [p.design, store && store.id !== 'kiosk' ? `by ${store.name}` : '', st.label].filter(Boolean).join(' · ');
      $('[data-sw-fare]', root).textContent = price(p);
      openBtn.dataset.pdp = p.id;
      openBtn.setAttribute('aria-label', `View ${p.title}`);
      wish.dataset.wishProduct = p.id;
      wish.setAttribute('aria-label', `Save ${p.title}`);
      wish.setAttribute('aria-pressed', String(!!(window.KIOSK_ACCOUNT && window.KIOSK_ACCOUNT.wishlisted && window.KIOSK_ACCOUNT.wishlisted('product', p.id))));
      const src = lifeOf(p, 0)[0] || '';
      if (ambient.dataset.src !== src) {
        ambient.dataset.src = src;
        ambient.hidden = true;
        if (src) { ambient.onload = () => { ambient.hidden = false; }; ambient.src = src; }
      }
    };

    const drum = spinDrum({
      stage: $('[data-sw-stage]', root),
      drum: $('[data-sw-drum]', root),
      step: 30,
      span: 4,
      makeCard() {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'k-wheel__card k-shopwheel__card';
        b.tabIndex = -1;
        b.innerHTML = '<span class="k-shopwheel__media"></span><span class="k-board__status k-shopwheel__status"></span>';
        return b;
      },
      paint(card, i) {
        const p = items[i];
        if (!p) return;
        $('.k-shopwheel__media', card).innerHTML = termMedia(p, 0).replace(/ loading="lazy"/g, '');
        const st = statusOf(p, 0);
        const chip = $('.k-shopwheel__status', card);
        chip.className = `k-board__status k-board__status--${st.key} k-shopwheel__status`;
        chip.textContent = st.label;
      },
      onFront: describe,
      onTap: () => openBtn.click(),
    });

    $$('[data-sw-step]', root).forEach((b) => b.addEventListener('click', () => drum.spin(Number(b.dataset.swStep))));

    return {
      /** Show these pieces (spins in only when the selection changed). */
      show(list) {
        const k = list.map((p) => p.id).join(',');
        if (k === key) return;
        const keep = items[drum.front] && list.findIndex((p) => p.id === items[drum.front].id);
        key = k;
        items = list;
        const empty = !list.length;
        $('[data-sw-empty]', root).hidden = !empty;
        ['[data-sw-stage]', '[data-sw-now]', '[data-sw-controls]'].forEach((sel) => { $(sel, root).hidden = empty; });
        drum.setItems(list.length, keep > 0 ? keep : 0, !(keep >= 0));
      },
    };
  }

  /* ------------------------------------------------ shop hero carousel
   * The top of vault.html: promotions (C.promos) and one card per
   * collection on a 3D drum. Tapping the front card (or its button) runs
   * its action: jump to a gate, a sort or an availability filter, or a link.
   * -------------------------------------------------------------------- */
  function heroCarousel(root, items, onPick, label = 'Collections and promotions') {
    root.innerHTML = `
      <div class="k-wheel k-wheel--clear k-herowheel">
        <div class="k-wheel__stage k-herowheel__stage" tabindex="0" role="group" aria-roledescription="carousel" aria-label="${esc(label)}. Left and right arrows turn the carousel, Enter opens the one in front." data-hw-stage>
          <div class="k-wheel__drum" data-hw-drum aria-hidden="true"></div>
        </div>
        <div class="k-herowheel__now">
          <button class="k-wheel__step" type="button" data-hw-step="-1" aria-label="Previous">${icon.left}</button>
          <div class="k-herowheel__info" aria-live="polite" aria-atomic="true">
            <span class="k-mono k-wheel__count" data-hw-count></span>
            <span class="k-herowheel__note" data-hw-note></span>
          </div>
          <button class="k-wheel__step" type="button" data-hw-step="1" aria-label="Next">${icon.right}</button>
        </div>
        <div class="k-herowheel__cta"><button class="k-btn k-btn--solid" type="button" data-hw-go><span data-hw-label></span><span class="k-arrow">${icon.right}</span></button></div>
      </div>`;
    const go = $('[data-hw-go]', root);
    const drum = spinDrum({
      stage: $('[data-hw-stage]', root),
      drum: $('[data-hw-drum]', root),
      step: 32,
      span: 4,
      makeCard() {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'k-wheel__card k-herowheel__card';
        b.tabIndex = -1;
        b.innerHTML = '<span class="k-shopwheel__media"></span><span class="k-herowheel__tag"><small></small><b></b></span>';
        return b;
      },
      paint(card, i) {
        const it = items[i];
        const media = $('.k-shopwheel__media', card);
        card.dataset.item = String(i);
        media.innerHTML = it.image
          ? `<img class="k-tcard__img${it.paper ? ' is-paper' : ''}" src="${esc(it.image)}" alt="" decoding="async">`
          : (it.product ? termMedia(it.product, 0).replace(/ loading="lazy"/g, '') : '');
        const img = $('img', media);
        if (img && it.image) img.addEventListener('error', () => img.remove(), { once: true });   // a cover that won't load leaves the plain card
        // a film with no still of its own takes its Vimeo thumbnail
        if (!it.image && !it.product && it.vimeo) {
          vimeoInfo(it.vimeo).then((d) => {
            if (d && d.thumbnail_url && card.dataset.item === String(i)) media.innerHTML = `<img class="k-tcard__img" src="${esc(d.thumbnail_url)}" alt="" decoding="async">`;
          }).catch(() => {});
        }
        $('.k-herowheel__tag small', card).textContent = it.eyebrow;
        $('.k-herowheel__tag b', card).textContent = it.title;
        card.classList.toggle('is-promo', it.kind === 'promo');
      },
      onFront(i) {
        const it = items[i];
        $('[data-hw-count]', root).textContent = `${pad(i + 1)} / ${pad(items.length)} · ${it.eyebrow}`;
        $('[data-hw-note]', root).textContent = it.note;
        $('[data-hw-label]', root).textContent = it.cta;
        go.setAttribute('aria-label', `${it.cta}: ${it.title}`);
      },
      onTap: (i) => onPick(items[i]),
    });
    $$('[data-hw-step]', root).forEach((b) => b.addEventListener('click', () => drum.spin(Number(b.dataset.hwStep))));
    go.addEventListener('click', () => onPick(items[drum.front]));
    drum.setItems(items.length, 0, true);
  }

  function pageVault() {
    const all = (C.products || []);
    const cats = C.categories || [];
    const params = new URLSearchParams(location.search);
    let cat = params.get('c') || 'all';
    let sort = params.get('sort') || 'featured';
    let page = 1;
    const PAGE = 12;
    /* For you: a voyager's check-in size filters the shop and their colours
     * sort first, unless the link already sets filters or they chose
     * "Show everything" (remembered on this device). */
    const FORME_OFF = 'kiosk:shop-forme-off';
    const linkFilters = ['size', 'colour', 'store', 'avail', 'max'].some((k) => params.has(k));
    let forMe = false;
    const wantForMe = () => !!memberTaste() && !linkFilters && !store.get(FORME_OFF, false);
    const filters = {
      size: new Set((params.get('size') || '').split(',').filter(Boolean)),
      colour: new Set((params.get('colour') || '').split(',').filter(Boolean)),
      store: new Set((params.get('store') || '').split(',').filter(Boolean)),
      avail: new Set((params.get('avail') || '').split(',').filter(Boolean)),
      max: params.get('max') ? Number(params.get('max')) : null,
    };
    const signal = pageAbort.signal;

    const shots = all.flatMap((p) => (p.colorways || []).map((w) => (w.lifestyle || [])[0] || (w.lifestyle || [])[1]).filter(Boolean));
    const heroShot = shots.length ? shots[hash(new Date().toDateString()) % shots.length] : '';
    if (heroShot) {
      fill('term-backdrop', `<img src="${esc(heroShot)}" alt="" decoding="async">`);
    }

    const board = mount('term-board');
    if (board) {
      const latest = all.slice().sort((a, b) => String(b.added || '').localeCompare(String(a.added || ''))).slice(0, 4);
      board.innerHTML = latest.map((p) => {
        const st = statusOf(p, 0);
        return `<li><button type="button" class="k-board__row" data-pdp="${esc(p.id)}">
          <span class="k-board__flight">${flapText(flightOf(p), 7)}</span>
          <span class="k-board__dest">${flapText(p.title, 26)}</span>
          <span class="k-board__gate">${flapText(gateOf(p.category), 1)}</span>
          <span class="k-board__fare">${esc(price(p))}</span>
          <span class="k-board__status k-board__status--${st.key}">${esc(st.label)}</span>
        </button></li>`;
      }).join('');
      flipBoard(board);
    }

    const q = mount('term-q');
    bindSearch(q, mount('term-results'));
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && q && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); q.focus(); }
    }, { signal });

    const count = (id) => all.filter((p) => id === 'all' || p.category === id).length;
    fill('term-gates', [{ id: 'all', label: 'All' }].concat(cats).filter((c) => count(c.id)).map((c) => `
      <button type="button" class="k-gate" data-cat="${esc(c.id)}" aria-pressed="${cat === c.id}">
        <b>${c.id === 'all' ? '★' : esc(gateOf(c.id))}</b><span>${esc(c.label)}</span><small>${count(c.id)}</small>
      </button>`).join(''));

    // Filter rail / sheet
    const sizesAll = [...new Set(all.flatMap((p) => p.sizes || []))];
    const coloursAll = [...new Set(all.flatMap((p) => (p.colorways || []).map((w) => w.name).filter(Boolean)))];
    const storesAll = C.stores || [];
    const prices = all.map((p) => p.price).filter((n) => n != null);
    const priceMax = prices.length ? Math.ceil(Math.max(...prices) / 10) * 10 : 200;
    const filterBody = mount('filter-body');
    const filterRoot = mount('vault-filter');
    if (filterRoot) filterRoot.hidden = false;
    const filterHtml = () => `
      <fieldset class="k-filter__group"><legend>Availability</legend>
        ${[['ships', 'Ships'], ['pickup', 'Pickup only'], ['digital', 'Digital']].map(([v, l]) => `
          <label class="k-filter__opt"><input type="checkbox" data-ff="avail" value="${v}" ${filters.avail.has(v) ? 'checked' : ''}>${l}</label>`).join('')}
      </fieldset>
      ${sizesAll.length ? `<fieldset class="k-filter__group"><legend>Size</legend>
        ${sizesAll.map((z) => `<label class="k-filter__opt"><input type="checkbox" data-ff="size" value="${esc(z)}" ${filters.size.has(z) ? 'checked' : ''}>${esc(z)}</label>`).join('')}
      </fieldset>` : ''}
      ${coloursAll.length ? `<fieldset class="k-filter__group"><legend>Colourway</legend>
        ${coloursAll.map((n) => `<label class="k-filter__opt"><input type="checkbox" data-ff="colour" value="${esc(n)}" ${filters.colour.has(n) ? 'checked' : ''}>${esc(n)}</label>`).join('')}
      </fieldset>` : ''}
      <fieldset class="k-filter__group"><legend>Price up to</legend>
        <div class="k-filter__range">
          <input type="range" min="0" max="${priceMax}" step="5" value="${filters.max != null ? filters.max : priceMax}" data-ff="max" aria-label="Maximum price">
          <span data-mount="filter-max-label">${filters.max != null ? `$${filters.max}` : 'Any'}</span>
        </div>
      </fieldset>
      ${storesAll.length ? `<fieldset class="k-filter__group"><legend>Store</legend>
        ${storesAll.map((s) => `<label class="k-filter__opt"><input type="checkbox" data-ff="store" value="${esc(s.id)}" ${filters.store.has(s.id) ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}
      </fieldset>` : ''}`;
    if (filterBody) filterBody.innerHTML = filterHtml();

    const activeFilterCount = () => filters.size.size + filters.colour.size + filters.store.size + filters.avail.size + (filters.max != null && filters.max < priceMax ? 1 : 0) + (forMe && !filters.size.size ? 1 : 0);
    const syncFilterBadge = () => {
      const n = activeFilterCount();
      const wrap = $('.k-cmd__filter'); if (wrap) wrap.dataset.count = String(n);
      const badge = mount('filter-count'); if (badge) badge.textContent = String(n);
    };

    const sortSel = mount('vault-sort');
    if (sortSel) sortSel.value = sort;
    const availOk = (p, a) => (a === 'pickup' ? !!p.pickup : a === 'digital' ? isDigitalP(p) : a === 'ships' ? !p.pickup && !isDigitalP(p) : true);
    const matches = (p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      // Their size, unless they've picked sizes in the filter themselves
      if (forMe && !filters.size.size && !fitsMe(p, memberTaste())) return false;
      if (filters.size.size && !(p.sizes || []).some((z) => filters.size.has(z))) return false;
      if (filters.colour.size && !(p.colorways || []).some((w) => filters.colour.has(w.name))) return false;
      if (filters.store.size && !filters.store.has(p.store || 'kiosk')) return false;
      if (filters.max != null && p.price != null && p.price > filters.max) return false;
      if (filters.avail.size && ![...filters.avail].some((a) => availOk(p, a))) return false;
      return true;
    };
    const order = (list) => {
      const l = list.slice();
      if (sort === 'new') l.sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));
      if (sort === 'price-asc') l.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
      if (sort === 'price-desc') l.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      if (sort === 'featured') l.sort((a, b) => (lifeOf(b, 0).length > 0) - (lifeOf(a, 0).length > 0));
      if (sort === 'foryou') {
        const t = memberTaste();
        l.sort((a, b) => (colourScore(b, t) - colourScore(a, t)) || ((lifeOf(b, 0).length > 0) - (lifeOf(a, 0).length > 0)));
      }
      return l;
    };
    const grid = mount('vault-grid');
    const moreBtn = mount('vault-more');
    // Carousel or list (the card grid); the choice is remembered on this device
    const carouselRoot = mount('vault-carousel');
    let carousel = null;
    let view = params.get('view') || store.get(SHOP_VIEW_KEY, 'carousel');
    if (view !== 'list' && view !== 'carousel') view = 'carousel';
    if (!carouselRoot) view = 'list';
    /** The "For you" bar above the pieces, and the For you sort option (voyagers only). */
    const paintForMe = () => {
      const t = memberTaste();
      if (sortSel) {
        let opt = $('option[value="foryou"]', sortSel);
        if (t && !opt) { opt = document.createElement('option'); opt.value = 'foryou'; opt.textContent = 'For you'; sortSel.prepend(opt); }
        if (!t && opt) opt.remove();
        if (!t && sort === 'foryou') sort = 'featured';
        sortSel.value = sort;
      }
      const bar = mount('vault-forme');
      if (!bar) return;
      bar.hidden = !t;
      if (!t) return;
      const size = t.sizes && t.sizes.top ? t.sizes.top.toUpperCase() : '';
      const what = [size && `size ${size}`, (t.colors || []).length && 'your colours first'].filter(Boolean).join(' · ') || 'your check-in';
      bar.innerHTML = forMe
        ? `<span class="k-forme__on"><i aria-hidden="true">${icon.user}</i><span><b>For you</b> · ${esc(what)}</span></span><button type="button" class="k-forme__btn" data-forme="off">Show everything</button>`
        : `<span>Showing everything.</span><button type="button" class="k-forme__btn k-forme__btn--on" data-forme="on">Fit to my size${size ? ` · ${esc(size)}` : ''}</button>`;
    };
    const setForMe = (on, remember) => {
      forMe = on;
      if (remember) store.set(FORME_OFF, !on);
      if (on && sort === 'featured') sort = 'foryou';
      if (!on && sort === 'foryou') sort = 'featured';
      page = 1;
    };
    if (wantForMe()) setForMe(true, false);
    // Account and check-in load after the page: apply For you once they do
    const onAccount = () => {
      if (!forMe && wantForMe()) { setForMe(true, false); render(); } else if (forMe && !memberTaste()) { setForMe(false, false); render(); } else paintForMe();
    };
    document.addEventListener('kiosk:account', onAccount, { signal });
    document.addEventListener('kiosk:taste', onAccount, { signal });

    const render = () => {
      paintForMe();
      const list = order(all.filter(matches));
      const shown = list.slice(0, page * PAGE);
      const asCarousel = view === 'carousel';
      $$('[data-shop-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shopView === view)));
      if (carouselRoot) carouselRoot.hidden = !asCarousel;
      if (grid) grid.hidden = asCarousel;
      if (asCarousel) {
        if (!carousel) carousel = shopCarousel(carouselRoot);
        carousel.show(list);
        if (grid) grid.innerHTML = '';
      } else if (grid) grid.innerHTML = shown.map((p) => termCard(p)).join('');
      if (moreBtn) { moreBtn.hidden = asCarousel || shown.length >= list.length; moreBtn.textContent = `Show more · ${list.length - shown.length} left`; }
      const c = cats.find((x) => x.id === cat);
      const lab = mount('term-gate-label'); if (lab) lab.textContent = c ? `Gate ${gateOf(c.id)} · ${c.label}` : 'All gates';
      const n = mount('vault-count'); if (n) n.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
      syncFilterBadge();
      if (grid) reveal(grid);
      const qs = new URLSearchParams(location.search);
      if (cat === 'all') qs.delete('c'); else qs.set('c', cat);
      if (sort === 'featured' || sort === 'foryou') qs.delete('sort'); else qs.set('sort', sort);
      qs.delete('view');
      [['size', filters.size], ['colour', filters.colour], ['store', filters.store], ['avail', filters.avail]].forEach(([k, set]) => {
        if (!set.size) qs.delete(k); else qs.set(k, [...set].join(','));
      });
      if (filters.max == null || filters.max >= priceMax) qs.delete('max'); else qs.set('max', String(filters.max));
      const str = qs.toString();
      history.replaceState(history.state, '', location.pathname + (str ? `?${str}` : '') + location.hash);
      renderedKey = pageKey();
    };

    const setFilterOpen = (on) => {
      if (!filterRoot) return;
      filterRoot.classList.toggle('is-open', on);
      const btn = $('[data-filter-open]'); if (btn) btn.setAttribute('aria-expanded', String(on));
      document.documentElement.classList.toggle('is-filter-open', on);
      const scrim = $('.k-filter__scrim', filterRoot); if (scrim) scrim.hidden = !on;
    };

    document.addEventListener('click', (e) => {
      const fm = e.target.closest('[data-forme]');
      if (fm) { setForMe(fm.dataset.forme === 'on', true); render(); return; }
      const vb = e.target.closest('[data-shop-view]');
      if (vb) {
        if (vb.dataset.shopView === view) return;
        view = vb.dataset.shopView;
        store.set(SHOP_VIEW_KEY, view);
        render();
        return;
      }
      if (e.target.closest('[data-filter-open]')) { setFilterOpen(!filterRoot.classList.contains('is-open')); return; }
      if (e.target.closest('[data-filter-close]')) { setFilterOpen(false); return; }
      const g = e.target.closest('[data-cat]');
      if (g && (g.closest('[data-mount="term-gates"]') || g.closest('.k-gates'))) {
        cat = g.dataset.cat; page = 1;
        $$('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === cat)));
        render();
        const sec = document.getElementById('shop'); if (sec) sec.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      const d = e.target.closest('[data-tdot]');
      if (d) {
        const card = d.closest('[data-tcard]'); const p = productById(card.dataset.tcard); const i = Number(d.dataset.tdot);
        card.dataset.cw = i;
        const media = $('.k-tcard__media', card);
        $$('.k-tcard__img, .k-tcard__flat', media).forEach((x) => x.remove());
        media.insertAdjacentHTML('afterbegin', termMedia(p, i));
        $$('[data-pdp]', card).forEach((x) => { x.dataset.cw = i; });
        $$('[data-qa-add]', card).forEach((x) => { x.dataset.cw = i; });
        $$('[data-tdot]', card).forEach((x) => x.setAttribute('aria-pressed', String(x === d)));
        const st = statusOf(p, i); const chip = $('.k-tcard__status', card);
        if (chip) { chip.className = `k-board__status k-board__status--${st.key} k-tcard__status`; chip.textContent = st.label; }
        return;
      }
      const wish = e.target.closest('[data-wish-product]');
      if (wish) {
        const on = wish.getAttribute('aria-pressed') !== 'true';
        wish.setAttribute('aria-pressed', String(on));
        document.dispatchEvent(new CustomEvent('kiosk:save', { detail: { kind: 'product', ref: wish.dataset.wishProduct, on } }));
        return;
      }
      const qa = e.target.closest('[data-qa]');
      if (qa) {
        const menu = $(`[data-qa-menu="${qa.dataset.qa}"]`);
        $$('[data-qa-menu]').forEach((m) => { if (m !== menu) m.hidden = true; });
        if (menu) menu.hidden = !menu.hidden;
        return;
      }
      const add = e.target.closest('[data-qa-add]');
      if (add) {
        document.dispatchEvent(new CustomEvent('kiosk:add-to-cart', {
          detail: { productId: add.dataset.qaAdd, cw: Number(add.dataset.cw) || 0, size: add.dataset.size === 'OS' ? '' : add.dataset.size },
        }));
        const menu = add.closest('[data-qa-menu]'); if (menu) menu.hidden = true;
        return;
      }
      if (!e.target.closest('[data-qa-menu]') && !e.target.closest('[data-qa]')) {
        $$('[data-qa-menu]').forEach((m) => { m.hidden = true; });
      }
      if (e.target.closest('[data-mount="vault-more"]')) { page += 1; render(); }
    }, { signal });

    if (filterBody) {
      filterBody.addEventListener('change', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLInputElement)) return;
        const kind = t.dataset.ff;
        if (kind === 'max') {
          filters.max = Number(t.value) >= priceMax ? null : Number(t.value);
          const lab = mount('filter-max-label'); if (lab) lab.textContent = filters.max == null ? 'Any' : `$${filters.max}`;
        } else if (filters[kind]) {
          if (t.checked) filters[kind].add(t.value); else filters[kind].delete(t.value);
        }
        page = 1;
        render();
      }, { signal });
    }
    if (sortSel) sortSel.addEventListener('change', () => { sort = sortSel.value; page = 1; render(); }, { signal });
    syncFilterBadge();
    render();

    // Hero carousel: promotions first, then one card per collection
    const heroRoot = mount('term-hero');
    if (heroRoot) {
      const photoOf = (list) => { const p = list.find((x) => lifeOf(x, 0).length) || list[0]; return { product: p, image: p ? lifeOf(p, 0)[0] || '' : '' }; };
      const heroItems = [];
      (C.promos || []).forEach((pr) => {
        let list = all.filter((p) => (!pr.cat || p.category === pr.cat) && (!pr.avail || availOk(p, pr.avail)));
        if (pr.sort === 'new') list = list.slice().sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));
        if (!list.length && !pr.href) return;
        const ph = photoOf(list);
        heroItems.push({ kind: 'promo', eyebrow: pr.eyebrow || 'Featured', title: pr.title, note: pr.note || '', cta: pr.cta || 'Shop now', image: pr.image || ph.image, product: ph.product, action: pr });
      });
      cats.forEach((c) => {
        const list = all.filter((p) => p.category === c.id);
        if (!list.length) return;
        const ph = photoOf(list);
        heroItems.push({ kind: 'collection', eyebrow: `Gate ${gateOf(c.id)} · Collection`, title: c.label, note: `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`, cta: `Shop ${c.label}`, image: ph.image, product: ph.product, action: { cat: c.id } });
      });
      if (heroItems.length) {
        heroCarousel(heroRoot, heroItems, (it) => {
          const a = it.action || {};
          if (a.href) { location.href = a.href; return; }
          cat = a.cat || 'all';
          sort = a.sort || 'featured';
          page = 1;
          filters.size.clear(); filters.colour.clear(); filters.store.clear(); filters.avail.clear(); filters.max = null;
          if (a.avail) filters.avail.add(a.avail);
          if (filterBody) filterBody.innerHTML = filterHtml();
          if (sortSel) sortSel.value = sort;
          $$('[data-mount="term-gates"] [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === cat)));
          render();
          const sec = document.getElementById('shop'); if (sec) sec.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        });
      } else heroRoot.hidden = true;
    }

    const lounge = all.flatMap((p) => (p.colorways || []).map((w, i) => ({ p, i, w })).filter((x) => (x.w.lifestyle || [])[1]));
    if (lounge.length) {
      fill('term-lounge', railShell(lounge.map(({ p, i, w }) => `
        <button type="button" class="k-lounge" data-pdp="${esc(p.id)}" data-cw="${i}">
          <img src="${esc(w.lifestyle[1])}" alt="${esc(`${p.title}, ${w.name}, in the terminal`)}" loading="lazy" decoding="async">
          <span class="k-lounge__tag"><b>${esc(p.design || p.title)}</b><small>${esc(w.name)} · ${esc(price(p))}</small></span>
        </button>`).join(''), 'Lounge', 'k-hscroll-wrap--lounge'));
    } else { const sec = $('[data-mount-section="lounge"]'); if (sec) sec.hidden = true; }

    const digital = all.filter((p) => isDigitalP(p));
    fill('term-digital', digital.map((p) => `
      <button type="button" class="k-inflight__row" data-pdp="${esc(p.id)}">
        <span class="k-inflight__thumb">${productVisual(p, 0)}</span>
        <span><b>${esc(p.title)}</b><small>${esc(categoryLabel(p.category))} · ${esc(p.detail || '')}</small></span>
        <span class="k-inflight__fare">${esc(price(p))}</span>
      </button>`).join(''));

    fill('term-stores', (C.stores || []).map((st) => `<a class="k-store-chip" href="${storeHref(st)}"><span class="k-sr-row__img k-sr-row__img--store">${esc(st.name.slice(0, 1))}</span><span><b>${esc(st.name)}</b><small>${esc([st.city, st.country].filter(Boolean).join(', '))}</small></span></a>`).join(''));

    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }

  /* --------------------------------------------------- partner stores
   * store.html: the directory of stores at the kiosk, or one store's page
   * (?s=<id>) with its pieces and a tracked "Visit store" link.
   * -------------------------------------------------------------------- */
  function storeCard(st) {
    const n = (C.products || []).filter((p) => (p.store || 'kiosk') === st.id).length;
    return `
      <a class="k-scard k-glass-panel" href="${storeHref(st)}" data-reveal>
        <span class="k-scard__cover">${st.cover ? `<img src="${esc(st.cover)}" alt="" loading="lazy" decoding="async">` : ''}</span>
        <span class="k-scard__body">
          <span class="k-sr-row__img k-sr-row__img--store">${esc(st.name.slice(0, 1))}</span>
          <span><b>${esc(st.name)}</b><small>${esc([st.city, st.country].filter(Boolean).join(', '))} · ${n} ${n === 1 ? 'piece' : 'pieces'}</small></span>
        </span>
        ${st.note ? `<span class="k-scard__note">${esc(st.note)}</span>` : ''}
      </a>`;
  }
  function pageStore() {
    const id = new URLSearchParams(location.search).get('s');
    const st = id && storeById(id);
    const dir = $('[data-store-view="directory"]');
    const page = $('[data-store-view="page"]');
    if (!st) {
      if (page) page.hidden = true;
      if (dir) dir.hidden = false;
      const all = C.stores || [];
      const grid = mount('store-grid');
      const show = (list) => { if (grid) grid.innerHTML = list.map(storeCard).join('') + `
        <button class="k-scard k-scard--join" type="button" data-notify="stockist" data-notify-title="Sell at the KIOSK" data-reveal>
          <span class="k-eyebrow">Your store here</span>
          <b class="k-h3">Sell at the <span class="k-serif">KIOSK</span></b>
          <span class="k-small">Get a page at the kiosk, your pieces in search and on the Lost &amp; Found map, and visitors sent to your own store.</span>
        </button>`; reveal(grid); };
      show(all);
      bindSearch(mount('store-q'), mount('store-results'), { kinds: ['store'], inline: false, onResults: (res, q) => show(q ? res.map((r) => r.st) : all) });
      if (id) toast('That store isn’t at the kiosk (yet).');
      return;
    }
    if (dir) dir.hidden = true;
    if (page) page.hidden = false;
    document.title = st.id === 'kiosk' ? 'KIOSK — our own label' : `${st.name} at the KIOSK`;
    const pieces = (C.products || []).filter((p) => (p.store || 'kiosk') === st.id);
    fill('brand-cover', st.cover ? `<img src="${esc(st.cover)}" alt="" decoding="async">` : '');
    fill('brand-logo', esc(st.name.slice(0, 1)));
    fill('brand-where', esc([st.city, st.country].filter(Boolean).join(', ')));
    fill('brand-name', esc(st.name));
    fill('brand-name-2', esc(st.name));
    fill('brand-note', esc(st.note || ''));
    fill('brand-about', st.about ? `<p class="k-lede">${esc(st.about)}</p>` : '');
    fill('brand-count', `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}`);
    const host = st.url ? (() => { try { return new URL(st.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } })() : '';
    fill('brand-cta', st.url
      ? `<a class="k-btn k-btn--solid" href="${visitHref(st)}" rel="noopener" data-visit="${esc(st.id)}" data-hard>Visit store <span class="k-arrow">${icon.arrow}</span></a><small>Opens ${esc(host)} · you’ll arrive as a KIOSK visitor</small>`
      : `<a class="k-btn k-btn--solid" href="vault.html">Shop the kiosk <span class="k-arrow">${icon.arrow}</span></a>${pieces.some((p) => p.pickup) ? '<a class="k-btn" href="lost-and-found.html">On the Hunt map</a>' : ''}`);
    const grid = mount('brand-grid');
    if (grid) { grid.innerHTML = pieces.map((p) => termCard(p)).join(''); reveal(grid); }
    document.addEventListener('click', (e) => {
      const v = e.target.closest('[data-visit]');
      if (v && typeof window.gtag === 'function') window.gtag('event', 'partner_visit', { store_id: v.dataset.visit, link_url: v.href, transport_type: 'beacon' });
    }, { signal: pageAbort.signal });
  }

  /* ------------------------------------------------------------- hunt
   * lost-and-found.html: the Lost & Found map (data-page="hunt"). MapLibre and the map module load only here.
   * Search shows cards around the globe; drops open the product panel.
   * -------------------------------------------------------------------- */
  const HUNT_SCRIPTS = ['js/vendor/maplibre/maplibre-gl.js', 'js/kiosk-world.js', 'js/kiosk-hunt.js'];
  function loadCss(href) {
    if ($(`link[href="${href}"]`)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l);
  }
  function pageHunt() {
    const root = $('.k-hunt-app');
    if (!root) return;
    const signal = pageAbort.signal;
    const items = (C.products || []).filter((p) => p.pickup);
    const thumb = (p) => lifeOf(p, 0)[0] || wayOf(p, 0).image || p.image || 'images/og-kiosk.png';
    const status = (t) => { const el = mount('hunt-status'); if (el) el.textContent = t; };
    status(`${items.length} ${items.length === 1 ? 'drop' : 'drops'} · ${(C.stores || []).length} ${(C.stores || []).length === 1 ? 'store' : 'stores'} · drag to turn the globe, zoom in to a drop zone`);
    document.documentElement.classList.add('is-hunt');
    signal.addEventListener('abort', () => document.documentElement.classList.remove('is-hunt'));

    const fallback = (why) => {
      const fb = mount('hunt-fallback');
      if (!fb) return;
      fb.hidden = false;
      fb.innerHTML = `<div class="k-finds-static"><p class="k-eyebrow">${esc(why)}</p>
        <div class="k-term-grid k-mt-m">${items.map((p) => termCard(p)).join('')}</div></div>`;
      root.classList.add('is-fallback');
      const finds = mount('hunt-finds'); if (finds) finds.hidden = true;
    };
    if (!hasWebGL()) { fallback('This device can’t draw the 3D map. Here are the finds.'); return; }

    loadCss('js/vendor/maplibre/maplibre-gl.css');
    let hunt = null;
    const q = mount('hunt-q');
    const clearBtn = $('[data-hunt-clear]');
    HUNT_SCRIPTS.reduce((pr, src) => pr.then(() => (src.includes('kiosk-world') && window.KIOSK_WORLD) || (src.includes('maplibre') && window.maplibregl) ? null : loadScript(src)), Promise.resolve())
      .then(() => {
        if (signal.aborted) return;
        hunt = window.KioskHunt.mount({ root, map: mount('hunt-map'), drops: mount('hunt-drops') }, {
          products: items, stores: C.stores || [], esc, price, thumb, reduced: REDUCED, status,
          openPDP: (id) => openPDP(id), storeHref,
        });
        signal.addEventListener('abort', () => hunt.destroy());
        const params = new URLSearchParams(location.search);
        const go = params.get('item') || params.get('store');
        if (go) { const it = hunt.find(go); if (it) setTimeout(() => hunt.flyTo(it), 600); }
        if (params.get('q') && q) { q.value = params.get('q'); q.dispatchEvent(new Event('input')); }
        const view = params.get('view');
        if (view && hunt.applyStyle) hunt.applyStyle(view);
      })
      .catch((err) => { console.warn('[KIOSK] hunt map unavailable', err); fallback('The map couldn’t load. Here are the finds.'); });

    // Search: results list in the HUD, cards around the globe
    bindSearch(q, mount('hunt-results'), {
      onResults: (res, text) => {
        if (clearBtn) clearBtn.hidden = !text;
        if (!hunt) return;
        if (!text) { hunt.clearTips(); return; }
        const n = hunt.showTips(res);
        status(res.length ? `${res.length} ${res.length === 1 ? 'match' : 'matches'}${n ? ` · ${n} on the map. Tap a card to fly there` : ''}` : `Nothing matches “${text}”.`);
      },
    });
    if (clearBtn) clearBtn.addEventListener('click', () => { q.value = ''; q.dispatchEvent(new Event('input')); q.focus(); }, { signal });
  }

  /* ------------------------------------------------------------ globe
   * A wireframe globe (parallels + meridians every 15°) that turns on its
   * own and can be dragged. Flights arc between coordinates along great
   * circles, leave a fading trail and pulse where they land.
   * Used by the intro and the "Around the globe" section on the home page.
   * -------------------------------------------------------------------- */
  const GLOBE_PLACES = [
    { n: 'New York', la: 40.71, lo: -74.0, home: true }, { n: 'Tokyo', la: 35.68, lo: 139.69 }, { n: 'London', la: 51.5, lo: -0.12 },
    { n: 'Lisbon', la: 38.72, lo: -9.14 }, { n: 'Lagos', la: 6.52, lo: 3.38 }, { n: 'Mexico City', la: 19.43, lo: -99.13 },
    { n: 'Seoul', la: 37.57, lo: 126.98 }, { n: 'Dubai', la: 25.2, lo: 55.27 }, { n: 'São Paulo', la: -23.55, lo: -46.63 },
    { n: 'Cape Town', la: -33.92, lo: 18.42 }, { n: 'Sydney', la: -33.87, lo: 151.21 }, { n: 'Marrakesh', la: 31.63, lo: -7.99 },
    { n: 'Paris', la: 48.86, lo: 2.35 }, { n: 'Los Angeles', la: 34.05, lo: -118.24 }, { n: 'Reykjavík', la: 64.15, lo: -21.94 },
    { n: 'Mumbai', la: 19.08, lo: 72.88 }, { n: 'Bangkok', la: 13.76, lo: 100.5 }, { n: 'Istanbul', la: 41.01, lo: 28.98 },
    { n: 'Kingston', la: 17.97, lo: -76.79 }, { n: 'Buenos Aires', la: -34.6, lo: -58.38 },
  ];

  const toVec = (la, lo) => {
    const a = (la * Math.PI) / 180; const b = (lo * Math.PI) / 180;
    return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
  };
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function slerp(a, b, u) {
    const d = Math.acos(Math.max(-1, Math.min(1, dot3(a, b))));
    if (d < 1e-6) return a;
    const s = Math.sin(d); const k1 = Math.sin((1 - u) * d) / s; const k2 = Math.sin(u * d) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  /**
   * createGlobe(canvas, { scale, max, homeBias, interactive, yaw, onFlight })
   * Returns { stop }. Stops by itself when the canvas leaves the page.
   */
  function createGlobe(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const places = (opts.places || GLOBE_PLACES).map((p) => ({ ...p, v: toVec(p.la, p.lo) }));
    // Lost & Found look (opts.lf): a dark sphere with dotted land, faint
    // graticule, atmosphere rim and signal-coloured flights/beacons, like
    // the MapLibre night globe in js/kiosk-hunt.js (#06070a ocean, land
    // dots #c9cdd8, sky horizon #151a2b).
    const landVecs = [];
    if (opts.lf && opts.land) {
      for (let i = 0; i + 1 < opts.land.length; i += 2) landVecs.push(toVec(opts.land[i], opts.land[i + 1]));
    }
    const signalCol = (getComputedStyle(document.documentElement).getPropertyValue('--signal') || '#ff5b23').trim();
    const home = places.find((p) => p.home) || places[0];
    const st = { yaw: opts.yaw != null ? opts.yaw : 0.9, /* New York (74° W) starts just left of centre */ pitch: opts.pitch != null ? opts.pitch : 0.38, spin: 0, drag: null, flights: [], spawnAt: 0, last: 0, raf: 0, visible: true, stopped: false };
    const scale = opts.scale || 0.42;

    const rot = (v) => {
      const cy = Math.cos(st.yaw); const sy = Math.sin(st.yaw);
      const x1 = v[0] * cy + v[2] * sy; const z1 = -v[0] * sy + v[2] * cy;
      const cp = Math.cos(st.pitch); const sp = Math.sin(st.pitch);
      return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
    };

    function spawn(now) {
      let a; let b; let tries = 0;
      do {
        a = Math.random() < (opts.homeBias != null ? opts.homeBias : 0.45) ? home : places[Math.floor(Math.random() * places.length)];
        b = places[Math.floor(Math.random() * places.length)];
        tries += 1;
      } while ((a === b || dot3(a.v, b.v) > 0.9 || (tries < 30 && Math.max(rot(a.v)[2], rot(b.v)[2]) < 0.25)) && tries < 40);
      const d = Math.acos(Math.max(-1, Math.min(1, dot3(a.v, b.v))));
      st.flights.push({ a, b, d, t0: now, dur: 1400 + d * 1100 });
      if (opts.onFlight) opts.onFlight(a, b);
    }

    function draw(now) {
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      if (!w || !h) return;
      // (opts.res: an extra factor while the canvas is shown scaled up)
      const dpr = Math.min((window.devicePixelRatio || 1) * (opts.res ? opts.res() : 1), 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ink = getComputedStyle(canvas).color;
      const R = Math.min(w, h) * scale; const cx = w / 2; const cy = h / 2;
      const P = (v, lift = 1) => { const r = rot(v); return [cx + r[0] * R * lift, cy - r[1] * R * lift, r[2]]; };
      if (opts.lf) {
        // Night ocean disc, lit from the upper left like the Hunt globe.
        const disc = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.1, cx, cy, R * 1.06);
        disc.addColorStop(0, '#1a2238');
        disc.addColorStop(0.55, '#0a0d15');
        disc.addColorStop(1, '#06070a');
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = disc;
        ctx.fill();
        // Atmosphere rim.
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120,150,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(90,120,220,0.55)';
        ctx.shadowBlur = 22;
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = opts.lf ? 'rgba(232,236,245,0.9)' : ink; ctx.fillStyle = ink; ctx.lineCap = 'round';

      // Wireframe: back half faint, front half crisp
      // (runs of segments that share an alpha, rounded to 1/16, go down as one
      // stroke: a few dozen strokes a frame instead of ~1,600)
      const line = (pts, front, back, width) => {
        ctx.lineWidth = width;
        let a = -1; let open = false;
        for (let i = 1; i < pts.length; i += 1) {
          const p = pts[i - 1]; const q = pts[i];
          const z = (p[2] + q[2]) / 2;
          const al = Math.round((z > 0 ? front * (0.45 + 0.55 * z) : back) * 16) / 16;
          if (al !== a) {
            if (open) ctx.stroke();
            a = al; ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(p[0], p[1]); open = true;
          }
          ctx.lineTo(q[0], q[1]);
        }
        if (open) ctx.stroke();
      };
      for (let la = -75; la <= 75; la += 15) {
        const pts = [];
        for (let lo = -180; lo <= 180; lo += 5) pts.push(P(toVec(la, lo)));
        line(pts, la === 0 ? 0.6 : 0.32, 0.06, la === 0 ? 1.1 : 0.8);
      }
      for (let lo = -180; lo < 180; lo += 15) {
        const pts = [];
        for (let la = -90; la <= 90; la += 5) pts.push(P(toVec(la, lo)));
        line(pts, lo === 0 ? 0.5 : 0.28, 0.05, 0.8);
      }
      ctx.globalAlpha = opts.lf ? 0.25 : 0.7; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // Dotted land, the Lost & Found dot-matrix (landVecs from KIOSK_WORLD).
      if (landVecs.length) {
        ctx.fillStyle = '#c9cdd8';
        const dr = Math.max(0.7, R / 190);
        landVecs.forEach((v) => {
          const r = rot(v);
          if (r[2] <= 0.03) return;
          ctx.globalAlpha = 0.30 + 0.60 * r[2];
          ctx.beginPath(); ctx.arc(cx + r[0] * R, cy - r[1] * R, dr, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Places
      const active = new Set();
      st.flights.forEach((f) => { active.add(f.a); active.add(f.b); });
      ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
      places.forEach((p) => {
        const [x, y, z] = P(p.v);
        if (z < 0) return;
        const on = active.has(p) || p === home;
        if (opts.lf) ctx.fillStyle = on ? signalCol : '#c9cdd8';
        ctx.globalAlpha = (on ? 1 : 0.45) * Math.min(1, z * 2.5);
        const s = on ? 5 : 3;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        if (on && z > 0.12) ctx.fillText(p.n.toUpperCase(), x + 8, y + 3.5);
      });

      // Flights (signal-coloured on the Lost & Found globe)
      if (opts.lf) { ctx.strokeStyle = signalCol; ctx.fillStyle = signalCol; }
      st.flights = st.flights.filter((f) => now - f.t0 < f.dur * 1.45);
      st.flights.forEach((f) => {
        const u = (now - f.t0) / f.dur;
        const head = Math.min(1, u);
        const tail = Math.max(0, Math.min(1, u > 1 ? (u - 1) * 2.2 + 0.6 : head - 0.6));
        const alt = 0.05 + f.d * 0.11;
        const N = 56; let prev = null;
        ctx.lineWidth = 2;
        for (let i = 0; i <= N; i += 1) {
          const sU = tail + ((head - tail) * i) / N;
          const pt = P(slerp(f.a.v, f.b.v, sU), 1 + alt * Math.sin(Math.PI * sU));
          if (prev) {
            const vis = (pt[2] + prev[2]) / 2 > -0.15 ? 1 : 0.15;
            ctx.globalAlpha = vis * (0.1 + 0.9 * (i / N));
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
          }
          prev = pt;
        }
        if (u <= 1 && prev && prev[2] > -0.15) {
          ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(prev[0], prev[1], 8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(prev[0], prev[1], 3, 0, Math.PI * 2); ctx.fill();
        }
        if (u > 1) {                                // landing pulse
          const [x, y, z] = P(f.b.v);
          if (z > 0) { const k = (u - 1) / 0.45; ctx.globalAlpha = 1 - k; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4 + k * 16, 0, Math.PI * 2); ctx.stroke(); }
        }
      });
      // Home pulse
      const [hx, hy, hz] = P(home.v);
      if (hz > 0) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(hx, hy, 3.5 + 1.5 * Math.sin(now / 260), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (opts.onFrame) opts.onFrame({ project: (la, lo) => P(toVec(la, lo)), R, cx, cy, w, h });
    }

    function frame(now) {
      st.raf = 0;
      if (st.stopped || !canvas.isConnected) return;
      const dt = Math.min(64, now - (st.last || now)); st.last = now;
      if (!st.drag) {
        if (st.target) {
          // Turn to face a point, then carry on spinning
          st.yaw += (st.target.yaw - st.yaw) * 0.08; st.pitch += (st.target.pitch - st.pitch) * 0.08;
          if (Math.abs(st.target.yaw - st.yaw) < 0.002 && Math.abs(st.target.pitch - st.pitch) < 0.002) st.target = null;
        } else if (!st.held) { st.yaw += dt * (opts.speed || 0.00018) + st.spin; st.spin *= 0.95; }
      }
      if (now >= st.spawnAt && st.flights.length < (opts.max || 6)) { spawn(now); st.spawnAt = now + 250 + Math.random() * 600; }
      draw(now);
      if (st.visible) st.raf = requestAnimationFrame(frame);
    }

    if (opts.interactive) {
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', (e) => { st.drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, lx: e.clientX, t: performance.now() }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); });
      canvas.addEventListener('pointermove', (e) => {
        if (!st.drag) return;
        const k = 1 / (Math.min(canvas.clientWidth, canvas.clientHeight) * scale);
        st.yaw = st.drag.yaw + (e.clientX - st.drag.x) * k;
        st.pitch = Math.max(-1.1, Math.min(1.1, st.drag.pitch + (e.clientY - st.drag.y) * k));
        const t = performance.now(); st.spin = ((e.clientX - st.drag.lx) * k) / Math.max(1, (t - st.drag.t) / 16); st.drag.lx = e.clientX; st.drag.t = t;
        if (REDUCED) draw(t);
      });
      const end = () => { st.drag = null; canvas.classList.remove('is-dragging'); };
      canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    }

    if (REDUCED) {
      // One still frame: a few finished routes, no motion
      const now = performance.now();
      for (let i = 0; i < 5; i += 1) { spawn(now); st.flights[i].t0 = now - st.flights[i].dur * 0.99; }
      requestAnimationFrame(() => draw(now));
      return { stop() { st.stopped = true; }, hold() {}, face(la, lo) { st.yaw = -lo * Math.PI / 180; st.pitch = Math.max(-1.1, Math.min(1.1, la * Math.PI / 180)); draw(performance.now()); } };
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        st.visible = en.isIntersecting;
        if (st.visible && !st.raf && !st.stopped) { st.last = 0; st.raf = requestAnimationFrame(frame); }
      }).observe(canvas);
    }
    st.raf = requestAnimationFrame(frame);
    return {
      stop() { st.stopped = true; if (st.raf) cancelAnimationFrame(st.raf); },
      /** Pause or resume the auto-spin. */
      hold(on) { st.held = !!on; },
      /** Turn the globe to bring a latitude/longitude to the front. */
      face(la, lo) {
        let yaw = -lo * Math.PI / 180;
        while (yaw - st.yaw > Math.PI) yaw -= Math.PI * 2;
        while (st.yaw - yaw > Math.PI) yaw += Math.PI * 2;
        st.spin = 0; st.target = { yaw, pitch: Math.max(-1.1, Math.min(1.1, la * Math.PI / 180 * 0.8)) };
      },
    };
  }

  /** Home page section: the globe plus a live "now flying" route readout. */
  function mountGlobes(root = document) {
    $$('[data-globe]', root).forEach((wrap) => {
      if (wrap.dataset.globeOn) return;
      wrap.dataset.globeOn = '1';
      const canvas = $('canvas', wrap);
      const now = $('[data-globe-now]', root) || $('[data-globe-now]');
      let flown = 0;
      createGlobe(canvas, {
        interactive: true,
        max: 7,
        onFlight: (a, b) => {
          flown += 1;
          if (now) now.innerHTML = `<b>${esc(a.n)}</b> → <b>${esc(b.n)}</b>`;
          const c = $('[data-globe-count]');
          if (c) c.textContent = String(flown).padStart(3, '0');
        },
      });
    });
  }

  /* ---------------------------------------------------------- globe hero
   * Top of the home page: the opening flight round the satellite Earth lands
   * on the visitor's town, then the planet settles under the headline with
   * them pinned and everyone else here now pinned too (js/kiosk-globe-hero.js
   * and js/kiosk-earth.js, loaded only here). The flight plays once per
   * session (Settings › Intro animation: Off skips it).
   * -------------------------------------------------------------------- */
  /* Where the visitor roughly is, so the opening flight lands over their town:
   * the city Cloudflare attaches to the request (/api/where, no permission
   * prompt), else a guess from the device's time zone, else New York. */
  const TZ_HOME = {
    'America/New_York': [40.71, -74.0, 'New York'], 'America/Detroit': [42.33, -83.05, 'Detroit'], 'America/Toronto': [43.65, -79.38, 'Toronto'],
    'America/Chicago': [41.88, -87.63, 'Chicago'], 'America/Denver': [39.74, -104.99, 'Denver'], 'America/Phoenix': [33.45, -112.07, 'Phoenix'],
    'America/Los_Angeles': [34.05, -118.24, 'Los Angeles'], 'America/Vancouver': [49.28, -123.12, 'Vancouver'], 'America/Anchorage': [61.22, -149.9, 'Anchorage'],
    'Pacific/Honolulu': [21.31, -157.86, 'Honolulu'], 'America/Halifax': [44.65, -63.57, 'Halifax'], 'America/Mexico_City': [19.43, -99.13, 'Mexico City'],
    'America/Bogota': [4.71, -74.07, 'Bogotá'], 'America/Lima': [-12.05, -77.04, 'Lima'], 'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo'],
    'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires'], 'America/Santiago': [-33.45, -70.67, 'Santiago'], 'America/Puerto_Rico': [18.47, -66.11, 'San Juan'],
    'America/Jamaica': [17.97, -76.79, 'Kingston'], 'Atlantic/Reykjavik': [64.15, -21.94, 'Reykjavík'], 'Europe/London': [51.51, -0.13, 'London'],
    'Europe/Dublin': [53.35, -6.26, 'Dublin'], 'Europe/Lisbon': [38.72, -9.14, 'Lisbon'], 'Europe/Madrid': [40.42, -3.7, 'Madrid'], 'Europe/Paris': [48.86, 2.35, 'Paris'],
    'Europe/Amsterdam': [52.37, 4.9, 'Amsterdam'], 'Europe/Brussels': [50.85, 4.35, 'Brussels'], 'Europe/Berlin': [52.52, 13.4, 'Berlin'], 'Europe/Zurich': [47.38, 8.54, 'Zürich'],
    'Europe/Rome': [41.9, 12.5, 'Rome'], 'Europe/Stockholm': [59.33, 18.07, 'Stockholm'], 'Europe/Oslo': [59.91, 10.75, 'Oslo'], 'Europe/Copenhagen': [55.68, 12.57, 'Copenhagen'],
    'Europe/Warsaw': [52.23, 21.01, 'Warsaw'], 'Europe/Athens': [37.98, 23.73, 'Athens'], 'Europe/Istanbul': [41.01, 28.98, 'Istanbul'], 'Europe/Moscow': [55.76, 37.62, 'Moscow'],
    'Africa/Lagos': [6.52, 3.38, 'Lagos'], 'Africa/Accra': [5.6, -0.19, 'Accra'], 'Africa/Nairobi': [-1.29, 36.82, 'Nairobi'], 'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg'],
    'Africa/Cairo': [30.04, 31.24, 'Cairo'], 'Africa/Casablanca': [33.57, -7.59, 'Casablanca'], 'Africa/Dakar': [14.72, -17.47, 'Dakar'], 'Asia/Dubai': [25.2, 55.27, 'Dubai'],
    'Asia/Riyadh': [24.71, 46.68, 'Riyadh'], 'Asia/Kolkata': [19.08, 72.88, 'Mumbai'], 'Asia/Bangkok': [13.76, 100.5, 'Bangkok'], 'Asia/Singapore': [1.35, 103.82, 'Singapore'],
    'Asia/Jakarta': [-6.2, 106.85, 'Jakarta'], 'Asia/Manila': [14.6, 120.98, 'Manila'], 'Asia/Hong_Kong': [22.32, 114.17, 'Hong Kong'], 'Asia/Shanghai': [31.23, 121.47, 'Shanghai'],
    'Asia/Taipei': [25.03, 121.57, 'Taipei'], 'Asia/Seoul': [37.57, 126.98, 'Seoul'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo'], 'Australia/Sydney': [-33.87, 151.21, 'Sydney'],
    'Australia/Melbourne': [-37.81, 144.96, 'Melbourne'], 'Australia/Perth': [-31.95, 115.86, 'Perth'], 'Pacific/Auckland': [-36.85, 174.76, 'Auckland'],
  };
  function homeFromZone() {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    const hit = TZ_HOME[tz];
    return hit ? { lat: hit[0], lon: hit[1], city: hit[2], approx: true } : null;
  }
  function visitorHome(signal) {
    const t = taste();
    // the home city from check-in, when it came with real coordinates (a city typed
    // in that isn't on the list has none, and older saves turned that into 0,0)
    const h = t && t.home;
    const hl = h && h.lat != null && h.lat !== '' ? Number(h.lat) : NaN; const hn = h && h.lon != null && h.lon !== '' ? Number(h.lon) : NaN;
    if (Number.isFinite(hl) && Number.isFinite(hn) && !(hl === 0 && hn === 0)) return Promise.resolve({ lat: hl, lon: hn, city: h.city });
    const fallback = homeFromZone() || { lat: 40.71, lon: -74.0, city: 'New York', approx: true };
    const ask = fetch('/api/where', { signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.lat != null ? { lat: d.lat, lon: d.lon, city: d.city || fallback.city } : fallback))
      .catch(() => fallback);
    return Promise.race([ask, new Promise((r) => setTimeout(() => r(fallback), 1500))]);
  }

  function mountGlobeHero() {
    const sec = $('[data-globe-hero]');
    if (!sec || sec.dataset.on) return;
    sec.dataset.on = '1';
    const signal = pageAbort.signal;
    let seen = false;
    try { seen = sessionStorage.getItem('kiosk:sky') === '1'; sessionStorage.setItem('kiosk:sky', '1'); } catch (e) { seen = true; }
    const journey = !seen && prefs.intro !== 'off' && !REDUCED;
    const count = $('[data-gh-count]', sec);
    let home = null;
    let hero = null;
    // Live viewers: the chip counts everyone here, the globe pins them
    const showLive = () => {
      if (!count) return;
      const others = live.count > 1 ? live.count - 1 : 0;
      count.textContent = live.enabled && others
        ? `${live.count} travelers here now${home && home.city ? ` · you’re in ${home.city}` : ''}`
        : `You’re here${home && home.city ? ` from ${home.city}` : ''} · travelers from everywhere`;
      // the chip's dot glows the nav's "online" green once the count is real
      const chip = $('[data-gh-live]', sec);
      if (chip) chip.classList.toggle('is-live', live.enabled);
      if (hero) hero.setLive(live.viewers, live.count);
    };
    document.addEventListener('kiosk:live', showLive, { signal });
    if (!hasWebGL()) { sec.classList.add('is-flat'); visitorHome(signal).then((h) => { home = h; showLive(); }); return; }
    Promise.all([
      window.KioskEarth ? null : loadScript('js/kiosk-earth.js'),
      window.KioskGlobeHero ? null : loadScript('js/kiosk-globe-hero.js'),
      visitorHome(signal).then((h) => { home = h; }),
    ])
      .then(() => {
        if (signal.aborted) return;
        hero = window.KioskGlobeHero.mount(sec, { Earth: window.KioskEarth, home, journey, reduced: REDUCED });
        showLive();
        signal.addEventListener('abort', () => hero.stop());
      })
      .catch((err) => { sec.classList.add('is-flat'); console.warn('[KIOSK] globe hero unavailable', err); });
  }

  /* ------------------------------------------------------- live presence
   * Every open tab checks in every half minute (/api/live) so the nav can
   * count who's on the site right now and the home globe can pin them, at
   * city level. Nothing shows where the API isn't there (no database), and a
   * closing tab checks out. */
  const live = { enabled: false, count: 0, viewers: [] };
  const LIVE_BEAT = 30000;
  function bindLive() {
    let id = '';
    try {
      id = sessionStorage.getItem('kiosk:live') || '';
      if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); sessionStorage.setItem('kiosk:live', id); }
    } catch (e) { return; }
    let timer = 0; let off = false; let fails = 0;
    const publish = () => { showNavLive(); document.dispatchEvent(new CustomEvent('kiosk:live', { detail: live })); };
    // a network blip retries; an API that says it's off (or keeps failing) stops for this page
    const miss = () => { fails += 1; if (fails >= 3) off = true; else timer = setTimeout(beat, LIVE_BEAT * 2); };
    const beat = () => {
      clearTimeout(timer);
      if (off || document.hidden) return;
      fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), keepalive: true })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && d.enabled === false) { off = true; live.enabled = false; publish(); return; }
          if (!d || !d.enabled) { miss(); return; }
          fails = 0;
          Object.assign(live, d);
          publish();
          timer = setTimeout(beat, LIVE_BEAT);
        })
        .catch(miss);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    window.addEventListener('pagehide', () => {
      clearTimeout(timer);
      if (!off && navigator.sendBeacon) navigator.sendBeacon('/api/live', new Blob([JSON.stringify({ id, leave: true })], { type: 'application/json' }));
    });
    // back from the back/forward cache: it checked out on the way away, so check in again
    window.addEventListener('pageshow', (e) => { if (e.persisted) beat(); });
    // the nav's dot takes you to the globe; on the home page, down to where the whole planet's in view
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('[data-live-nav]');
      const hero = a && $('[data-globe-hero]');
      if (!hero) return;
      e.preventDefault();
      const top = hero.offsetTop + Math.max(0, hero.offsetHeight - window.innerHeight) * 0.45;
      const lenis = window.KioskEditorial && window.KioskEditorial.lenis;
      if (lenis) lenis.scrollTo(top, { duration: 1.6 }); else window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
    }, true);   // (capture: ahead of the page router, which would reload the home page)
    beat();
  }
  // The nav's glowing dot: everyone on the site right now, you included
  function showNavLive() {
    const n = Math.max(1, live.count || 0);
    const said = n === 1 ? 'You’re the only traveler on KIOSK right now' : `${n} travelers on KIOSK right now`;
    $$('[data-live-nav]').forEach((a) => {
      a.hidden = !live.enabled;
      const c = $('[data-live-count]', a);
      if (c && c.textContent !== String(n)) {
        c.textContent = String(n);
        a.classList.remove('is-bump'); void a.offsetWidth; a.classList.add('is-bump');
      }
      a.title = said;
      a.setAttribute('aria-label', `${said}. See them on the globe`);
    });
    const nav = $('.k-nav');
    if (nav) nav.classList.toggle('has-live', live.enabled);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.append(s);
    });
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  /* ======================================================== the journal
   * One volume a month for the KIOSK Archive, laid out like a monthly field report: a cover,
   * the month in numbers, a section per story with its log, then everything
   * else that happened. A month gets a volume when something in the content
   * file is dated in it (a story published or shot, a timeline milestone, a
   * shop drop), or when it's written up in `journal` (js/kiosk-content.js).
   *
   * archive.html files every volume on a wireframe shelf; archive.html?v=
   * YYYY-MM opens one. gallery.html is every photograph, film and clip.
   * -------------------------------------------------------------------- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = Object.fromEntries(MONTHS.map((m, i) => [m.slice(0, 3).toLowerCase(), i + 1]));
  /** 'YYYY-MM' from '2025-11-28', '28 Nov 2025' or 'Nov 2025'; '' when undated ('Soon', 'Issue 01'). */
  function monthKey(s) {
    const v = String(s || '').trim();
    let m = v.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
    m = v.match(/(?:^|\s)([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
    return m && MON[m[1].toLowerCase()] ? `${m[2]}-${pad(MON[m[1].toLowerCase()])}` : '';
  }
  const monthName = (k) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`;
  const shotMonth = (f) => {
    const c = ((f.bts || {}).conditions || []).find((x) => /^date$/i.test(x.label));
    return monthKey(c && c.value) || monthKey(f.published);
  };
  const upperDate = (d) => (d ? longDate(d).toUpperCase() : '');
  const productImage = (p) => { const w = (p.colorways || []).find((x) => x.image); return (w && w.image) || ''; };

  let volumesCache = null;
  /** Every volume, newest first: { key, no, name, year, stories, notes, drops, report, cover, desks, entries }. */
  function journalVolumes() {
    if (volumesCache) return volumesCache;
    const map = new Map();
    const vol = (k) => {
      if (!map.has(k)) map.set(k, { key: k, stories: [], notes: [], drops: [], report: (C.journal || {})[k] || null });
      return map.get(k);
    };
    features.forEach((f) => {
      const pub = monthKey(f.published);
      const shot = shotMonth(f);
      if (pub) vol(pub).stories.push(f);
      if (shot && shot !== pub) vol(shot).notes.push({ f, when: shot, label: 'Shot' });
      (f.timeline || []).forEach((t) => {
        const k = monthKey(t.year);
        if (k && k !== pub && k !== shot) vol(k).notes.push({ f, when: t.year, label: t.label });
      });
    });
    (C.products || []).forEach((p) => { const k = monthKey(p.added); if (k) vol(k).drops.push(p); });
    Object.keys(C.journal || {}).forEach((k) => { if (/^\d{4}-\d{2}$/.test(k)) vol(k); });
    const list = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    list.forEach((v, i) => {
      v.no = i + 1;
      v.name = monthName(v.key);
      v.year = v.key.slice(0, 4);
      v.stories.sort((a, b) => String(a.published).localeCompare(String(b.published)));
      v.drops.sort((a, b) => String(a.added).localeCompare(String(b.added)));
      const lead = v.stories.find((f) => f.image) || v.notes.map((n) => n.f).find((f) => f.image);
      const r = v.report || {};
      const drop = v.drops.find(productImage);
      v.cover = r.cover ? { src: r.cover, caption: r.caption || '' }
        : lead ? { src: lead.image, focus: lead.focus, caption: `${lead.tagline || lead.title}${lead.author ? ` By ${lead.author}.` : ''}`, story: lead }
          : drop ? { src: productImage(drop), caption: `${drop.title}, new in the shop.`, product: drop } : null;
      v.lead = r.title || (v.stories[0] && (v.stories[0].title || featureName(v.stories[0]))) || (v.notes[0] && v.notes[0].label) || (v.drops.length ? `${v.drops.length} new in the shop` : 'Notes');
      v.desks = Array.from(new Set(v.stories.concat(v.notes.map((n) => n.f)).map((f) => DESKS[f.desk]).concat(v.drops.length ? ['Shop'] : []).filter(Boolean)));
      v.entries = v.stories.length + v.notes.length + v.drops.length;
    });
    volumesCache = list.reverse();
    return volumesCache;
  }

  /** "Bridge roller · 12:07 · 28mm" → { time: '12:07', scene: 'Bridge roller', detail: '28mm' } */
  const TIME_RE = /\b(\d{1,2}:\d{2}|\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?|noon|midnight)\b/i;
  function logRows(f) {
    return (f.story || []).map((b) => {
      if (b.type === 'image' && b.caption) {
        const parts = b.caption.split(/\s+·\s+/);
        const t = parts.findIndex((x) => TIME_RE.test(x));
        return { time: t >= 0 ? parts[t] : '—', scene: parts[0], detail: parts.filter((_, i) => i && i !== t).join(' · ') || 'Frame' };
      }
      if (b.type === 'text' || !b.type) {
        const m = String(b.lead || '').match(TIME_RE);
        return { time: m ? m[0] : '—', scene: String(b.lead || '').replace(/\.$/, '') || '—', detail: b.body || b.text || '' };
      }
      return null;
    }).filter(Boolean);
  }

  /* ------------------------------------------------- the archive (shelf) */

  function libraryHtml(vols, { search = true, years = true, title = 'Every volume' } = {}) {
    const ys = Array.from(new Set(vols.map((v) => v.year)));
    return `
      <section class="k-lib3d" data-lib3d aria-label="${esc(title)}">
        <svg class="k-lib3d__room" data-lib3d-room aria-hidden="true"></svg>
        <div class="k-wrap k-lib3d__inner">
          <div class="k-lib3d__head" data-lib3d-head>
            <p><b>KIOSK Archive</b> — ${esc(title)}</p>
            <div class="k-lib3d__tools">
              ${years && ys.length > 1 ? `<div class="k-lib3d__years" role="group" aria-label="Year">${['all'].concat(ys).map((y, i) => `<button type="button" data-lib3d-year="${y}" aria-pressed="${!i}">${y === 'all' ? 'All' : y}</button>`).join('')}</div>` : ''}
              <button class="k-lib3d__tool" type="button" data-lib3d-previews aria-pressed="true" aria-label="Cover previews" title="Cover previews">${icon.camera}</button>
            </div>
          </div>
          <div class="k-lib3d__table" data-lib3d-table>
            <div class="k-lib3d__cols">
              <span>Year</span><span>Vol.</span><span>Month</span><span class="k-lib3d__lead">Lead</span><span class="k-lib3d__desk">Desks</span>
              ${search ? `<label class="k-lib3d__search"><span class="k-sr">Search the archive</span><input type="search" data-lib3d-q placeholder="Search" autocomplete="off" enterkeyhint="search">${icon.search}</label>` : '<span></span>'}
            </div>
            <ol class="k-lib3d__rows">${vols.map((v, i) => `
              <li data-ed="flip" style="--i:${i % 8}" data-year="${v.year}" data-find="${esc([v.name, v.lead, v.desks.join(' '), v.stories.map((f) => `${f.title} ${featureName(f)} ${place(f)}`).join(' '), v.drops.map((p) => p.title).join(' ')].join(' ').toLowerCase())}">
                <a class="k-lib3d__row" href="archive.html?v=${v.key}"${v.cover ? ` data-cover="${esc(v.cover.src)}"` : ''}>
                  <span>${esc(v.year)}</span><span>${pad(v.no)}</span><span>${esc(MONTHS[Number(v.key.slice(5)) - 1])}</span>
                  <span class="k-lib3d__lead">${esc(v.lead)}</span><span class="k-lib3d__desk">${esc(v.desks.join(' · ') || '—')}</span>
                  <span class="k-lib3d__go" aria-hidden="true">${icon.right}</span>
                </a>
              </li>`).join('')}
            </ol>
            <p class="k-lib3d__empty" data-lib3d-empty hidden>No volume matches that. Try a month, a place or a machine.</p>
          </div>
        </div>
        <span class="k-lib3d__peek" data-lib3d-peek aria-hidden="true"></span>
      </section>`;
  }

  /** Wireframe room, year filter, search and cover previews for every shelf on the page. */
  function bindLibrary(root = document) {
    const signal = pageAbort.signal;
    $$('[data-lib3d]', root).forEach((lib) => {
      const svg = $('[data-lib3d-room]', lib);
      const head = $('[data-lib3d-head]', lib);
      const table = $('[data-lib3d-table]', lib);
      // Perspective lines from the top of the room to the header box and the shelf
      const draw = () => {
        const r = lib.getBoundingClientRect();
        const h = head.getBoundingClientRect();
        const t = table.getBoundingClientRect();
        const W = r.width; const H = r.height;
        const x = (v) => (v - r.left).toFixed(1); const y = (v) => (v - r.top).toFixed(1);
        const back = Math.max(24, (h.top - r.top) * 0.42);
        svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
        svg.innerHTML = `
          <path d="M${(W * 0.16).toFixed(1)} 0 L${x(h.left)} ${y(h.top)} M${(W * 0.84).toFixed(1)} 0 L${x(h.right)} ${y(h.top)}"/>
          <path d="M${(W * 0.19).toFixed(1)} ${back.toFixed(1)} H${(W * 0.81).toFixed(1)} M${(W * 0.19).toFixed(1)} ${back.toFixed(1)} L${x(t.left)} ${y(t.top)} M${(W * 0.81).toFixed(1)} ${back.toFixed(1)} L${x(t.right)} ${y(t.top)}"/>
          <path d="M${x(t.left)} ${y(t.bottom)} L0 ${H.toFixed(1)} M${x(t.right)} ${y(t.bottom)} L${W.toFixed(1)} ${H.toFixed(1)}"/>`;
      };
      draw();
      window.addEventListener('resize', draw, { passive: true, signal });
      if ('ResizeObserver' in window) { const ro = new ResizeObserver(draw); ro.observe(lib); signal.addEventListener('abort', () => ro.disconnect()); }

      const rows = $$('.k-lib3d__rows > li', lib);
      const empty = $('[data-lib3d-empty]', lib);
      const q = $('[data-lib3d-q]', lib);
      let year = 'all';
      const apply = () => {
        const words = (q ? q.value : '').toLowerCase().split(/\s+/).filter(Boolean);
        let n = 0;
        rows.forEach((li) => {
          const ok = (year === 'all' || li.dataset.year === year) && words.every((w) => li.dataset.find.includes(w));
          li.hidden = !ok;
          if (ok) n += 1;
        });
        if (empty) empty.hidden = n > 0;
        draw();
      };
      if (q) q.addEventListener('input', apply);
      $$('[data-lib3d-year]', lib).forEach((b) => b.addEventListener('click', () => {
        year = b.dataset.lib3dYear;
        $$('[data-lib3d-year]', lib).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        apply();
      }));

      // Cover preview that trails the pointer over a row (mouse only)
      const peek = $('[data-lib3d-peek]', lib);
      const toggle = $('[data-lib3d-previews]', lib);
      let previews = true;
      if (toggle) toggle.addEventListener('click', () => { previews = !previews; toggle.setAttribute('aria-pressed', String(previews)); peek.classList.remove('is-on'); });
      lib.addEventListener('pointermove', (e) => {
        const row = e.pointerType === 'mouse' && previews && e.target.closest('.k-lib3d__row[data-cover]');
        if (!row) { peek.classList.remove('is-on'); return; }
        if (peek.dataset.src !== row.dataset.cover) { peek.dataset.src = row.dataset.cover; peek.innerHTML = `<img src="${esc(row.dataset.cover)}" alt="" decoding="async">`; }
        const r = lib.getBoundingClientRect();
        peek.style.transform = `translate(${(e.clientX - r.left + 28).toFixed(0)}px, ${(e.clientY - r.top - 90).toFixed(0)}px)`;
        peek.classList.add('is-on');
      });
      lib.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
  }

  function pageArchive() {
    const key = new URLSearchParams(location.search).get('v');
    const vols = journalVolumes();
    const v = key && vols.find((x) => x.key === key);
    if (v) { renderVolume(v, vols); return; }
    const latest = vols.find((x) => x.cover && !x.cover.product) || vols.find((x) => x.cover);
    const first = vols[vols.length - 1];
    fill('archive', `
      <header class="k-wrap k-arc-hero">
        <p class="k-ed-label">The KIOSK Archive${first ? ` · since ${esc(first.name)}` : ''}</p>
        <h1 class="k-ed-giant" data-ed="mask" data-fit>The Journal</h1>
        <p class="k-lede">One volume every month: what we shot, what we published, where we went and what dropped in the shop. Filed below, newest first.</p>
      </header>
      ${latest && latest.cover ? `
      <a class="k-wrap k-arc-cover" href="archive.html?v=${latest.key}">
        <span class="k-arc-cover__media" data-ed="img"><span class="k-ed-par" data-parallax="0.06">${media({ image: latest.cover.src, focus: latest.cover.focus, alt: latest.cover.caption, cls: 'k-media--clean' })}</span></span>
        <span class="k-arc-cover__cap"><span class="k-ed-label">${latest === vols[0] ? 'Latest' : 'Cover story'} · Volume ${pad(latest.no)}</span><b>${esc(latest.name)}</b><span class="k-ed-link">Read the volume ${icon.arrow}</span></span>
      </a>` : ''}
      ${libraryHtml(vols)}
      <section class="k-wrap k-arc-more">
        <p class="k-ed-label">Every frame</p>
        <p class="k-ed-standfirst">Every photograph, film and clip from every volume is in the Gallery: search it by date, place, issue or story.</p>
        <a class="k-ed-link" href="gallery.html">Open the Gallery ${icon.arrow}</a>
      </section>`);
    bindLibrary();
  }

  /* --------------------------------------------- a volume (monthly report) */

  function renderVolume(v, vols) {
    const i = vols.indexOf(v);
    const newer = vols[i - 1];
    const older = vols[i + 1];
    const r = v.report || {};
    document.title = `Volume ${pad(v.no)} · ${v.name} · The Journal · KIOSK`;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', `The KIOSK Archive for ${v.name}: ${v.lead}.`);

    const frames = v.stories.reduce((n, f) => n + (f.gallery || []).length, 0);
    const clips = v.stories.reduce((n, f) => n + ((f.bts || {}).clips || []).length + ((f.bts || {}).driveClips || []).length, 0);
    const films = v.stories.filter((f) => f.format === 'film').length;
    const places = Array.from(new Set(v.stories.map((f) => place(f) || f.location).filter(Boolean)));
    const H = (t, sub) => `<h2 class="k-jr-h">${esc(t)}${sub ? ` <em>— ${esc(sub)}</em>` : ''}</h2>`;

    // On the road: subjects grouped by type, like a sightings breakdown
    const groups = {};
    v.stories.forEach((f) => { (groups[typeLabel(f.type)] = groups[typeLabel(f.type)] || []).push(f); });
    const roadRows = Object.keys(groups).map((g) => `<tr><th scope="row">${esc(g === 'Meet' ? 'Meets' : `${g}s`)}</th><td>${groups[g].length}</td><td>${groups[g].map((f) => `${esc(featureName(f) || f.title)}${place(f) || f.location ? ` · ${esc(place(f) || f.location)}` : ''}${(f.gallery || []).length ? ` · ${(f.gallery || []).length} frames` : ''}`).join('<br>')}</td></tr>`)
      .concat(v.drops.length ? [`<tr><th scope="row">The shop</th><td>${v.drops.length}</td><td>${v.drops.slice(0, 6).map((p) => esc(p.title)).join(', ')}${v.drops.length > 6 ? ` and ${v.drops.length - 6} more` : ''}</td></tr>`] : []);

    const storySections = v.stories.map((f) => {
      const log = logRows(f);
      const thumbs = (f.gallery || []).slice(0, 3).map((g) => (typeof g === 'string' ? { src: g } : g));
      return `
        <section class="k-jr-sec" id="${esc(f.slug)}">
          ${H(f.title || featureName(f))}
          <p class="k-jr-sub">${esc(featureName(f) || formatLabel(f))}${f.tagline ? ` — <em>${esc(f.tagline)}</em>` : ''}</p>
          ${(f.specs || []).length || (f.subjects || []).length ? `<dl class="k-jr-facts">
            ${(f.specs || []).map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}
            ${(f.subjects || []).map((s) => `<div><dt>${esc(s.role || 'Subject')}</dt><dd>${esc(s.name)}</dd></div>`).join('')}
          </dl>` : ''}
          <dl class="k-jr-seen">
            <div><dt>${(f.gallery || []).length ? `${(f.gallery || []).length} frames` : esc(formatLabel(f))}</dt><dd>${esc([upperDate(f.published), f.shotOn].filter(Boolean).join(' · ') || '—')}</dd></div>
            <div><dt>Generally seen in</dt><dd>${esc([f.location, place(f)].filter(Boolean).join(', ').toUpperCase() || '—')}</dd></div>
          </dl>
          ${log.length ? `<table class="k-jr-table k-jr-log"><thead><tr><th>Time</th><th>Scene</th><th>Details</th></tr></thead><tbody>
            ${log.map((x) => `<tr><td>${esc(x.time)}</td><td>${esc(x.scene)}</td><td>${esc(x.detail)}</td></tr>`).join('')}
          </tbody></table>` : ''}
          ${thumbs.length ? `<div class="k-jr-thumbs">${thumbs.map((t) => `<a href="gallery.html?story=${encodeURIComponent(f.slug)}" class="k-jr-thumb">${media({ image: thumbOf(t.src), alt: t.caption || '', cls: 'k-media--clean' })}</a>`).join('')}</div>` : ''}
          <a class="k-ed-link" href="${storyHref(f)}">Read the story ${icon.arrow}</a>
        </section>`;
    }).join('');

    fill('archive', `
      <article class="k-jr" aria-labelledby="jr-title">
        <header class="k-jr-cover">
          <div class="k-wrap">
            <p class="k-jr-kicker">${esc(v.name.toUpperCase())} · VOLUME ${pad(v.no)}</p>
            <h1 class="k-jr-title" id="jr-title" data-ed="mask"><span>Monthly</span><span>Archive</span></h1>
          </div>
          <figure class="k-jr-lead">
            <div class="k-jr-lead__media" data-ed="img">${v.cover ? media({ image: v.cover.src, focus: v.cover.focus, alt: v.cover.caption, eager: true, cls: 'k-media--clean' }) : `<div class="k-media"><div class="plate plate--graphite"><span class="plate__mark">${pad(v.no)}</span></div></div>`}</div>
            <figcaption>${esc(r.caption || (v.cover && v.cover.caption) || v.lead)}</figcaption>
          </figure>
          <div class="k-wrap k-jr-actions">
            <button class="k-ed-link" type="button" data-print>Download PDF ${icon.arrow}</button>
            <a class="k-ed-link" href="gallery.html?issue=${v.key}">Photos &amp; films ${icon.arrow}</a>
            <a class="k-ed-link" href="archive.html">The archive ${icon.arrow}</a>
          </div>
        </header>

        <div class="k-wrap k-jr-body">
          ${r.note ? `<section class="k-jr-sec"><p class="k-jr-note">${esc(r.note)}</p></section>` : ''}

          <section class="k-jr-sec">
            ${H('Month summary')}
            <table class="k-jr-table k-jr-grid">
              <thead><tr><th>Stories</th><th>Films</th><th>Frames</th><th>Raw clips</th><th>Places</th><th>New in the shop</th></tr></thead>
              <tbody><tr><td>${v.stories.length}</td><td>${films}</td><td>${frames}</td><td>${clips}</td><td>${places.length}</td><td>${v.drops.length}</td></tr></tbody>
            </table>
          </section>

          ${roadRows.length ? `<section class="k-jr-sec">
            ${H('On the road')}
            <table class="k-jr-table k-jr-break"><thead><tr><th colspan="2">Total</th><th>Breakdown</th></tr></thead><tbody>${roadRows.join('')}</tbody></table>
            <p class="k-jr-fine"><b>Note.</b> <em>Frames are photographs published with each story; raw clips are the unedited footage filed with it.</em></p>
          </section>` : ''}

          <section class="k-jr-sec">
            ${H('About this report')}
            <ul class="k-jr-about">
              <li>This volume covers what KIOSK shot, published and released in ${esc(v.name)}.</li>
              <li>Times are local to each shoot and come from the camera.</li>
              <li>Stories still marked “In the edit” have their films being cut; they move to the volume of the month they’re published.</li>
              <li>Every photograph and film in this report is in the Gallery.</li>
            </ul>
          </section>

          ${storySections}

          ${v.notes.length ? `<section class="k-jr-sec">
            ${H('Also this month', 'from earlier and later stories')}
            <table class="k-jr-table"><thead><tr><th>Story</th><th>When</th><th>Details</th></tr></thead><tbody>
              ${v.notes.map((n) => `<tr><td><a href="${storyHref(n.f)}">${esc(n.f.title || featureName(n.f))}</a></td><td>${esc(n.when.length === 7 ? monthName(n.when) : n.when)}</td><td>${esc(n.label)}</td></tr>`).join('')}
            </tbody></table>
          </section>` : ''}

          ${v.drops.length ? `<section class="k-jr-sec">
            ${H('In the shop', 'new this month')}
            <table class="k-jr-table"><thead><tr><th>Piece</th><th>Added</th><th>Details</th></tr></thead><tbody>
              ${v.drops.map((p) => `<tr><td><button type="button" class="k-jr-linkbtn" data-pdp="${esc(p.id)}">${esc(p.title)}</button></td><td>${esc(shortDate(p.added))}</td><td>${esc([categoryLabel(p.category), p.detail, price(p)].filter(Boolean).join(' · '))}</td></tr>`).join('')}
            </tbody></table>
          </section>` : ''}

          <footer class="k-jr-foot">
            <p>Photos and films from this report are in the <a href="gallery.html?issue=${v.key}">Gallery</a> and on <a href="https://www.instagram.com/onlyatthekiosk" target="_blank" rel="noopener noreferrer">Instagram</a>.</p>
            <p class="k-small">Compiled by the KIOSK desk</p>
          </footer>
        </div>

        <nav class="k-wrap k-jr-pager" aria-label="Other volumes">
          ${older ? `<a href="archive.html?v=${older.key}"><span class="k-ed-label">← Volume ${pad(older.no)}</span><b>${esc(older.name)}</b></a>` : '<span></span>'}
          ${newer ? `<a href="archive.html?v=${newer.key}"><span class="k-ed-label">Volume ${pad(newer.no)} →</span><b>${esc(newer.name)}</b></a>` : '<span></span>'}
        </nav>
      </article>`);
    document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); }, { signal: pageAbort.signal });
  }

  /* ---------------------------------------------------------- the gallery */

  const GAL_KINDS = { photo: 'Photographs', film: 'Films', clip: 'Clips', raw: 'Raw footage' };
  let galleryCache = null;
  /** Every photograph, film and clip, each tagged with its story, issue, place, desk and date. */
  function galleryItems() {
    if (galleryCache) return galleryCache;
    const out = [];
    const seen = new Set();
    const add = (it) => { const id = `${it.kind}:${it.src || it.ref}`; if (seen.has(id)) return; seen.add(id); out.push({ ...it, n: out.length }); };
    features.forEach((f) => {
      const issue = monthKey(f.published) || shotMonth(f);
      const base = {
        story: f.slug, storyTitle: f.title || featureName(f), desk: DESKS[f.desk] ? f.desk : 'automotive',
        place: place(f) || f.location || '', date: f.published || '', issue,
        words: [f.title, featureName(f), f.tagline, f.location, f.city, f.country, ...(f.tags || []), ...(f.vibes || []), f.season, typeLabel(f.type), formatLabel(f), DESKS[f.desk], issue ? monthName(issue) : ''].filter(Boolean).join(' '),
      };
      if (f.vimeo || f.embed || f.video) add({ ...base, kind: 'film', ref: f.slug, src: f.poster || f.image || '', caption: f.title || featureName(f), meta: [formatLabel(f), f.runtime].filter(Boolean).join(' · '), vimeo: f.vimeo });
      (f.gallery || []).map((g) => (typeof g === 'string' ? { src: g } : g)).forEach((g) => add({ ...base, kind: 'photo', src: g.src, thumb: thumbOf(g.src), caption: g.caption || base.storyTitle, meta: g.meta || '' }));
      (f.story || []).filter((b) => b.type === 'image' && b.src).forEach((b) => add({ ...base, kind: 'photo', src: b.src, thumb: thumbOf(b.src), caption: b.caption || base.storyTitle, meta: '' }));
      const bts = f.bts || {};
      (bts.frames || []).forEach((src) => add({ ...base, kind: 'photo', src, thumb: src, caption: 'Behind the scenes', meta: '' }));
      (bts.clips || []).forEach((c) => add({ ...base, kind: 'clip', src: c.src, webm: c.webm, poster: c.poster, caption: c.caption || 'Clip', meta: c.meta || '' }));
      (bts.driveClips || []).forEach((c) => add({ ...base, kind: 'raw', ref: c.id, caption: `Clip ${c.clip}`, meta: c.time || '' }));
    });
    galleryCache = out;
    return out;
  }

  function pageGallery() {
    const signal = pageAbort.signal;
    const all = galleryItems();
    const vols = journalVolumes();
    const params = new URLSearchParams(location.search);
    const set = (k) => new Set((params.get(k) || '').split(',').filter(Boolean));
    const st = {
      q: params.get('q') || '', sort: params.get('sort') || 'newest',
      type: set('type'), story: set('story'), issue: set('issue'), place: set('place'), year: set('year'), desk: set('desk'),
    };
    const PAGE_SIZE = 36;
    let shown = PAGE_SIZE;
    let list = [];

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const groups = [
      { key: 'type', label: 'Type', opts: Object.keys(GAL_KINDS).filter((k) => all.some((it) => it.kind === k)).map((k) => [k, GAL_KINDS[k]]) },
      { key: 'story', label: 'Story', opts: uniq(all.map((it) => it.story)).map((s) => [s, (featureBySlug(s) || {}).title || s]) },
      { key: 'issue', label: 'Issue', opts: vols.filter((v) => all.some((it) => it.issue === v.key)).map((v) => [v.key, `Vol. ${pad(v.no)} · ${v.name}`]) },
      { key: 'place', label: 'Location', opts: uniq(all.map((it) => it.place)).sort().map((p) => [p, p]) },
      { key: 'year', label: 'Year', opts: uniq(all.map((it) => it.date.slice(0, 4))).sort().reverse().map((y) => [y, y]) },
      { key: 'desk', label: 'Desk', opts: uniq(all.map((it) => it.desk)).map((d) => [d, DESKS[d]]) },
    ].filter((g) => g.opts.length > 1);
    const labelOf = (key, val) => ((groups.find((g) => g.key === key) || { opts: [] }).opts.find((o) => o[0] === val) || [val, val])[1];
    const count = (key, val) => all.filter((it) => (key === 'year' ? it.date.slice(0, 4) : it[key === 'type' ? 'kind' : key]) === val).length;

    const collections = features.filter((f) => all.some((it) => it.story === f.slug)).map((f) => ({ key: 'story', val: f.slug, title: f.title || featureName(f), sub: [formatLabel(f), place(f) || f.location].filter(Boolean).join(' · '), n: all.filter((it) => it.story === f.slug && it.kind !== 'raw').length, f }))
      .concat(vols.filter((v) => all.some((it) => it.issue === v.key)).map((v) => ({ key: 'issue', val: v.key, title: v.name, sub: `Volume ${pad(v.no)}`, n: all.filter((it) => it.issue === v.key && it.kind !== 'raw').length, v })))
      .filter((c) => c.n > 0);

    fill('gallery', `
      <header class="k-wrap k-gal-hero">
        <p class="k-ed-label">Photographs · films · clips</p>
        <h1 class="k-ed-giant" data-ed="mask" data-fit>Gallery</h1>
        <p class="k-lede">Every frame from every story and every volume of the Journal. Search it, sort it, or narrow it down by date, place, issue and story.</p>
      </header>
      <div class="k-wrap k-gal-bar">
        <label class="k-gal-search">${icon.search}<span class="k-sr">Search the gallery</span><input type="search" data-gal-q placeholder="Search places, machines, stories, months…" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
        <label class="k-gal-sort"><span>Sort</span><select data-gal-sort>
          ${[['newest', 'Newest'], ['oldest', 'Oldest'], ['story', 'Story A–Z'], ['place', 'Location A–Z'], ['type', 'Type']].map(([k, l]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <button class="k-gal-filterbtn" type="button" data-gal-panel-open aria-expanded="false">Filter<span data-gal-nf></span></button>
      </div>
      <div class="k-wrap k-gal-active" data-gal-active></div>
      ${collections.length ? `<section class="k-gal-coll" aria-label="Collections">
        <div class="k-wrap"><p class="k-ed-label">Collections</p></div>
        ${railShell(collections.map((c) => `
          <button type="button" class="k-gal-coll__card" data-gal-coll="${c.key}:${esc(c.val)}">
            <span class="k-gal-coll__media">${c.f ? featureMedia(c.f, { meta: '', cls: 'k-media--clean' }) : media({ image: c.v.cover && c.v.cover.src, alt: '', cls: 'k-media--clean', mark: pad(c.v.no) })}</span>
            <span class="k-ed-label">${esc(c.sub)} · ${c.n}</span>
            <b>${esc(c.title)}</b>
          </button>`).join(''), 'Collections', 'k-hscroll-wrap--coll')}
      </section>` : ''}
      <div class="k-wrap">
        <p class="k-gal-count k-ed-label" data-gal-count aria-live="polite"></p>
        <ul class="k-gal-grid" data-gal-grid></ul>
        <p class="k-gal-empty" data-gal-empty hidden>Nothing matches. Clear a filter or try another word.</p>
        <div class="k-gal-more"><button class="k-ed-link" type="button" data-gal-more hidden>Show more ${icon.arrow}</button></div>
      </div>
      <div class="k-gal-pill" role="group" aria-label="Gallery filters">
        <button type="button" data-gal-clear>All <sup data-gal-total>${all.filter((it) => it.kind !== 'raw').length}</sup></button>
        <button type="button" data-gal-panel-open aria-expanded="false">Filter</button>
      </div>
      <aside class="k-gal-panel" data-gal-panel aria-label="Filter the gallery" aria-hidden="true">
        <div class="k-gal-panel__head"><p class="k-ed-label">Filter</p><button class="k-lightbox__close" type="button" data-gal-panel-close aria-label="Close filters">${icon.close}</button></div>
        <div class="k-gal-panel__body" data-lenis-prevent>
          ${groups.map((g) => `<fieldset class="k-gal-group"><legend>${esc(g.label)}</legend><div>${g.opts.map(([val, lab]) => `<button class="k-chip" type="button" data-gal-chip="${g.key}" data-val="${esc(val)}" aria-pressed="false">${esc(lab)} <span class="k-count">${count(g.key, val)}</span></button>`).join('')}</div></fieldset>`).join('')}
        </div>
        <div class="k-gal-panel__foot"><button class="k-btn" type="button" data-gal-clear>Clear all</button><button class="k-btn k-btn--solid" type="button" data-gal-panel-close data-gal-show>Show results</button></div>
      </aside>`);

    const grid = mount('gallery');
    const $g = (s) => $(s, grid);
    const SPANS = [7, 5, 4, 4, 4, 6, 6];
    const sorters = {
      newest: (a, b) => b.date.localeCompare(a.date) || a.n - b.n,
      oldest: (a, b) => (a.date || '9').localeCompare(b.date || '9') || a.n - b.n,
      story: (a, b) => a.storyTitle.localeCompare(b.storyTitle) || a.n - b.n,
      place: (a, b) => (a.place || '~').localeCompare(b.place || '~') || a.n - b.n,
      type: (a, b) => Object.keys(GAL_KINDS).indexOf(a.kind) - Object.keys(GAL_KINDS).indexOf(b.kind) || a.n - b.n,
    };
    const field = (it, k) => (k === 'type' ? it.kind : k === 'year' ? it.date.slice(0, 4) : it[k]);

    const tile = (it, i) => {
      const span = SPANS[i % SPANS.length];
      let vis;
      if (it.kind === 'photo') vis = `<img src="${esc(it.thumb || it.src)}" data-full="${esc(it.src)}" alt="${esc(it.caption)}" loading="lazy" decoding="async">`;
      else if (it.kind === 'clip') vis = `<video muted loop playsinline preload="none"${it.poster ? ` poster="${esc(it.poster)}"` : ''} aria-hidden="true">${it.webm ? `<source src="${esc(it.webm)}" type="video/webm">` : ''}<source src="${esc(it.src)}" type="video/mp4"></video>`;
      else if (it.kind === 'film') vis = it.src ? `<img src="${esc(it.src)}" alt="" loading="lazy" decoding="async">` : `<span class="plate plate--${esc((featureBySlug(it.story) || {}).tone || 'graphite')}"${it.vimeo ? ` data-vimeo-cover="${esc(it.vimeo.id)}"` : ''}><span class="plate__mark">${esc((featureBySlug(it.story) || {}).code || '')}</span></span>`;
      else vis = `<span class="k-gal-raw"><b>${esc(String(it.meta).slice(0, 5) || '—')}</b><small>${esc(it.caption)}</small></span>`;
      return `<li class="k-gal-tile" style="--span:${span}" data-reveal>
        <button type="button" class="k-gal-tile__open" data-gal-open="${it.n}" aria-label="${esc(`${GAL_KINDS[it.kind]}: ${it.caption}`)}">
          <span class="k-gal-tile__media${it.kind !== 'photo' ? ' k-dark' : ''}">${vis}${it.kind !== 'photo' ? `<span class="k-gal-tile__kind">${it.kind === 'raw' ? 'Raw' : it.kind === 'clip' ? 'Clip' : 'Film'} ${icon.play}</span>` : ''}</span>
        </button>
        <p class="k-gal-tile__meta"><span>${esc(upperDate(it.date) || 'UNDATED')}</span>${it.place ? `<span>${esc(it.place)}</span>` : ''}</p>
        <p class="k-gal-tile__title">${esc(it.caption)}</p>
        <a class="k-gal-tile__story" href="story.html?s=${encodeURIComponent(it.story)}">${esc(it.storyTitle)}</a>
      </li>`;
    };

    const syncUrl = () => {
      const p = new URLSearchParams();
      if (st.q) p.set('q', st.q);
      if (st.sort !== 'newest') p.set('sort', st.sort);
      ['type', 'story', 'issue', 'place', 'year', 'desk'].forEach((k) => { if (st[k].size) p.set(k, Array.from(st[k]).join(',')); });
      const qs = p.toString();
      history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
      renderedKey = pageKey();
    };

    const paint = () => {
      const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      const match = all.filter((it) => ['story', 'issue', 'place', 'year', 'desk'].every((k) => !st[k].size || st[k].has(field(it, k)))
        && words.every((w) => `${it.caption} ${it.meta} ${it.words}`.toLowerCase().includes(w)));
      // Raw footage (dozens of unedited clips a shoot) only shows when asked for,
      // or when it's all there is (a meet still in the edit)
      list = match.filter((it) => (st.type.size ? st.type.has(it.kind) : it.kind !== 'raw'));
      if (!st.type.size && !list.length) list = match;
      list.sort(sorters[st.sort] || sorters.newest);
      $g('[data-gal-grid]').innerHTML = list.slice(0, shown).map(tile).join('');
      $g('[data-gal-empty]').hidden = list.length > 0;
      $g('[data-gal-more]').hidden = list.length <= shown;
      const raw = list.some((it) => it.kind === 'raw') ? 0 : match.filter((it) => it.kind === 'raw').length;
      $g('[data-gal-count]').innerHTML = `${list.length} ${list.length === 1 ? 'item' : 'items'}${raw && !st.type.size ? ` · <button type="button" class="k-gal-rawbtn" data-gal-chip="type" data-val="raw">+ ${raw} raw clips</button>` : ''}`;
      const nf = ['type', 'story', 'issue', 'place', 'year', 'desk'].reduce((n, k) => n + st[k].size, 0);
      $g('[data-gal-nf]').textContent = nf ? ` · ${nf}` : '';
      $$('[data-gal-show]', grid).forEach((b) => { b.textContent = `Show ${list.length}`; });
      $$('[data-gal-chip]', grid).forEach((b) => b.setAttribute('aria-pressed', String(st[b.dataset.galChip].has(b.dataset.val))));
      $$('[data-gal-coll]', grid).forEach((b) => { const [k, val] = b.dataset.galColl.split(':'); b.setAttribute('aria-pressed', String(st[k].has(val))); });
      const chips = [];
      if (st.q) chips.push(`<button class="k-chip is-active" type="button" data-gal-drop="q">“${esc(st.q)}” ${icon.close}</button>`);
      ['type', 'story', 'issue', 'place', 'year', 'desk'].forEach((k) => st[k].forEach((val) => chips.push(`<button class="k-chip is-active" type="button" data-gal-drop="${k}" data-val="${esc(val)}">${esc(labelOf(k, val))} ${icon.close}</button>`)));
      $g('[data-gal-active]').innerHTML = chips.join('');
      hydrateCovers(grid);
      reveal(grid);
      document.dispatchEvent(new CustomEvent('kiosk:page', { detail: { page: PAGE, partial: true } }));
    };
    const update = () => { shown = PAGE_SIZE; syncUrl(); paint(); };

    const panel = $g('[data-gal-panel]');
    const setPanel = (open) => {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('is-filter-open', open);
      $$('[data-gal-panel-open]', grid).forEach((b) => b.setAttribute('aria-expanded', String(open)));
      if (open) { const f = $('[data-gal-chip]', panel); if (f) f.focus(); }
    };

    let qTimer = 0;
    $g('[data-gal-q]').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { st.q = e.target.value.trim(); update(); }, 160); });
    $g('[data-gal-sort]').addEventListener('change', (e) => { st.sort = e.target.value; update(); });
    grid.addEventListener('click', (e) => {
      const t = e.target;
      const chip = t.closest('[data-gal-chip]');
      if (chip) { const s = st[chip.dataset.galChip]; if (s.has(chip.dataset.val)) s.delete(chip.dataset.val); else s.add(chip.dataset.val); update(); return; }
      const coll = t.closest('[data-gal-coll]');
      if (coll) {
        const [k, val] = coll.dataset.galColl.split(':');
        const on = st[k].has(val);
        st.story.clear(); st.issue.clear();
        if (!on) st[k].add(val);
        update();
        $g('[data-gal-count]').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      const drop = t.closest('[data-gal-drop]');
      if (drop) { if (drop.dataset.galDrop === 'q') { st.q = ''; $g('[data-gal-q]').value = ''; } else st[drop.dataset.galDrop].delete(drop.dataset.val); update(); return; }
      if (t.closest('[data-gal-clear]')) { st.q = ''; $g('[data-gal-q]').value = ''; ['type', 'story', 'issue', 'place', 'year', 'desk'].forEach((k) => st[k].clear()); update(); return; }
      if (t.closest('[data-gal-panel-open]')) { setPanel(!panel.classList.contains('is-open')); return; }
      if (t.closest('[data-gal-panel-close]')) { setPanel(false); return; }
      if (t.closest('[data-gal-more]')) { shown += PAGE_SIZE; paint(); return; }
      const open = t.closest('[data-gal-open]');
      if (!open) return;
      const it = all[Number(open.dataset.galOpen)];
      if (it.kind === 'photo') {
        const photos = list.filter((x) => x.kind === 'photo');
        photoNav = { photos, i: Math.max(0, photos.indexOf(it)) };
        showPhoto();
      } else if (it.kind === 'film') {
        const f = featureBySlug(it.story);
        if (f && f.vimeo && !f.embed && !f.video) openVimeo(vimeoById(f.vimeo.id) || f.vimeo); else if (f) openFilm(f);
      } else if (it.kind === 'clip') {
        player.pause();
        openLightbox(`
          <div class="k-lightbox__head"><div><p class="k-eyebrow">${esc(it.storyTitle)} · Clip</p><p class="k-h3 k-mt-s">${esc(it.caption)}</p></div><button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button></div>
          <div class="k-lightbox__screen"><video controls autoplay playsinline${it.poster ? ` poster="${esc(it.poster)}"` : ''}>${it.webm ? `<source src="${esc(it.webm)}" type="video/webm">` : ''}<source src="${esc(it.src)}" type="video/mp4"></video></div>
          ${it.meta ? `<p class="k-small k-mt-s">${esc(it.meta)}</p>` : ''}`, it.caption);
      } else openDriveClip(it.ref, `${it.storyTitle} · ${it.caption}${it.meta ? ` · ${it.meta}` : ''}`);
    }, { signal });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) setPanel(false); }, { signal });
    signal.addEventListener('abort', () => document.documentElement.classList.remove('is-filter-open'));
    // Clips play while the pointer rests on them
    grid.addEventListener('pointerover', (e) => { const v = e.target.closest('.k-gal-tile__open') && $('video', e.target.closest('.k-gal-tile__open')); if (v && !REDUCED) v.play().catch(() => {}); });
    grid.addEventListener('pointerout', (e) => { const v = e.target.closest('.k-gal-tile__open') && $('video', e.target.closest('.k-gal-tile__open')); if (v && !e.target.closest('.k-gal-tile__open').contains(e.relatedTarget)) v.pause(); });
    paint();
  }

  /* --------------------------------------------------------- terminal
   * The whole magazine is an airport. Every page is a terminal with its
   * own sign and split-flap board, stories travel as boarding passes, and
   * the home page is the main concourse with a directory to the rest.
   * -------------------------------------------------------------------- */
  const TERMINALS = [
    { id: 'home', t: 'T0', name: 'Main concourse', href: 'index.html', note: 'Departures from every desk' },
    { id: 'vault', t: 'T1', name: 'Supply terminal', href: 'vault.html', note: 'Clothing, travel goods and rare finds' },
    { id: 'films', t: 'T2', name: 'Screening room', href: 'films.html', note: 'Films, cinematic edits and home movies' },
    { id: 'journal', t: 'T3', name: 'The Atlas', href: 'atlas.html', note: 'Every story, interview, vlog and gallery' },
    { id: 'radio', t: 'T4', name: 'In-flight radio', href: 'radio.html', note: 'Phonk, mixes and audio notes' },
    { id: 'tv', t: 'T4V', name: 'KIOSK TV', href: 'tv.html', note: 'Music videos, curated and yours' },
    { id: 'hunt', t: 'T5', name: 'Lost & Found', href: 'lost-and-found.html', note: 'Rare finds you travel to collect' },
    { id: 'flights', t: 'T6', name: 'Flight deck', href: 'flights.html', note: 'Live flight status from anywhere on Earth' },
    { id: 'garage', t: 'T7', name: 'The Garage', href: 'the-garage.html', note: 'The Street File: schematics, strip numbers and secrets' },
  ];
  const TERMINAL_OF = { story: 'journal', archive: 'journal', gallery: 'journal', store: 'vault', account: 'home', partner: 'vault', tv: 'radio' };
  const DESK_GATE = { automotive: 'A', travel: 'B', music: 'C', fashion: 'D' };
  const shortDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '—');
  const termFor = (page) => TERMINALS.find((x) => x.id === (TERMINAL_OF[page] || page));
  const INFO_PAGES = ['about', 'contact', 'faq', 'shipping-returns', 'members', 'terms-conditions', 'privacy-cookies', 'do-not-sell'];
  const termStrip = (t, label) => `<p class="k-term__strip"><span class="k-term__t">${esc(t.t)}</span><span>${esc(label || t.name)}</span><span class="k-term__clock"><span data-clock>--:--:--</span> <small data-clock-zone></small></span></p>`;
  const PLANE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 16.5l19-6.5-1.2-2.6-6.6 1.8L8.3 3.5 6.6 4.2l3 6.1-4.4 1.3-2.2-2-1.4.5 1.4 3.4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 20.5h18" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  const LANDING = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9.5l17.6 6.2.6-2.8-6.4-2.6-1.4-7-1.8-.4.6 6.7-4.3-1.7-1.3-2.7-1.5-.3.2 3.7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 20.5h18" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  /** A split-flap board. rows: { href | pdp | play, flight, dest, gate, time, status: { key, label } } */
  function boardHtml({ title, sub, icon: ic = PLANE, cols, rows, id }) {
    return `<section class="k-board k-glass-panel" aria-labelledby="${id}">
      <div class="k-board__head"><h2 class="k-board__title" id="${id}">${ic}${esc(title)}</h2><p class="k-board__sub">${esc(sub)}</p></div>
      <div class="k-board__cols" aria-hidden="true">${cols.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
      <ol class="k-board__rows">${rows.map((r) => {
        const inner = `<span class="k-board__flight">${flapText(r.flight, 7)}</span>
          <span class="k-board__dest">${flapText(r.dest, 26)}</span>
          <span class="k-board__gate">${flapText(r.gate, 1)}</span>
          <span class="k-board__fare">${esc(r.time)}</span>
          <span class="k-board__status k-board__status--${esc(r.status.key)}">${esc(r.status.label)}</span>`;
        return `<li>${r.href ? `<a class="k-board__row" href="${esc(r.href)}">${inner}</a>`
          : `<button type="button" class="k-board__row"${r.pdp ? ` data-pdp="${esc(r.pdp)}"` : ''}${r.play ? ` data-mix-play="${esc(r.play)}"` : ''}>${inner}</button>`}</li>`;
      }).join('')}</ol>
    </section>`;
  }
  const storyStatus = (f) => (f.format === 'film' ? { key: 'boarding', label: 'Now showing' }
    : (f.tags || []).includes('In the edit') ? { key: 'soon', label: 'In the edit' }
      : { key: 'landed', label: formatLabel(f) });
  const storyRow = (f) => ({ href: storyHref(f), flight: `KSK ${f.code || ''}`, dest: f.city || f.location || featureName(f), gate: DESK_GATE[f.desk] || 'A', time: shortDate(f.published), status: storyStatus(f) });
  const byNewest = (list) => list.slice().sort((a, b) => String(b.published || b.added || '').localeCompare(String(a.published || a.added || '')));
  const deskBoard = (rows) => rows.slice(0, 8);

  function terminalize() {
    const t = termFor(PAGE);
    if (t) {
      // Every page header becomes terminal signage
      $$('.k-page-head').forEach((head) => {
        head.classList.add('k-page-head--term');
        const wrap = $('.k-wrap', head);
        if (wrap && !$('.k-term__strip', wrap)) wrap.insertAdjacentHTML('afterbegin', termStrip(t));
      });
      const acct = $('.k-acct-page');
      if (acct && !$('.k-term__strip', acct)) acct.insertAdjacentHTML('afterbegin', termStrip({ t: 'PC' }, 'Passport control · your account'));
    } else if (INFO_PAGES.includes(PAGE)) {
      // About, contact, FAQ, shipping and the legal pages: the information desk
      $$('.k-page-head .k-wrap').forEach((wrap) => { if (!$('.k-term__strip', wrap)) wrap.insertAdjacentHTML('afterbegin', termStrip({ t: 'i' }, 'Information desk')); });
    }
    const mountB = mount('term-page-board');
    if (mountB && !mountB.dataset.done) {
      mountB.dataset.done = '1';
      let html = '';
      if (PAGE === 'home') {
        const rows = byNewest(features).slice(0, 5).map(storyRow)
          .concat(byNewest((C.products || []).filter((p) => !isDigitalP(p))).slice(0, 2).map((p) => ({ pdp: p.id, flight: flightOf(p), dest: p.title, gate: gateOf(p.category), time: price(p), status: statusOf(p, 0) })))
          .concat((C.mixes || []).slice(0, 1).map((m) => ({ play: m.slug, flight: 'KR 001', dest: m.title, gate: 'C', time: 'LIVE', status: { key: 'boarding', label: 'On air' } })));
        html = boardHtml({ id: 'home-board', title: 'Departures', sub: 'Every desk · latest first · tap a flight', cols: ['Flight', 'Destination', 'Gate', 'Time', 'Status'], rows: rows });
      } else if (PAGE === 'garage') {
        const rows = (C.machines || []).filter((m) => m.street).map((m, i) => ({ href: `#${m.id}`, flight: `KG ${pad(i + 1)}`, dest: `${m.make} ${m.model}`, gate: m.id.startsWith('infiniti') ? 'A' : 'M', time: (m.street.numbers[0] || {}).value || '', status: { key: i ? 'landed' : 'boarding', label: m.street.role } }));
        html = boardHtml({ id: 'garage-board', title: 'On the lift', sub: 'Five files · tap one to open it', cols: ['File', 'Machine', 'Bay', 'Best', 'Role'], rows });
      } else if (PAGE === 'radio') {
        const rows = (C.mixes || []).map((m, i) => ({ play: m.slug, flight: `KR ${String(i + 1).padStart(3, '0')}`, dest: m.title, gate: 'C', time: m.duration || (i ? 'NEXT' : 'LIVE'), status: i ? { key: 'landed', label: 'Up next' } : { key: 'boarding', label: 'On air' } }));
        html = boardHtml({ id: 'radio-board', title: 'In-flight', sub: 'Channels on board · tap to play', cols: ['Channel', 'Programme', 'Gate', 'Time', 'Status'], rows: deskBoard(rows) });
      }
      if (html) { mountB.innerHTML = html; flipBoard(mountB); }
    }
    const dir = mount('term-directory');
    if (dir && !dir.dataset.done) {
      dir.dataset.done = '1';
      dir.innerHTML = TERMINALS.filter((x) => x.id !== 'home').map((x) => `
        <a class="k-dir__sign" href="${x.href}">
          <span class="k-dir__t">${esc(x.t)}</span>
          <span class="k-dir__name"><b>${esc(x.name)}</b><small>${esc(x.note)}</small></span>
          <span class="k-dir__arrow" aria-hidden="true">${icon.arrow}</span>
        </a>`).join('');
    }
  }

  /* ------------------------------------------------------------- boot */

  const PAGES = { garage: pageGarage, home: pageHome, flights: pageFlights, films: pageFilms, story: pageStory, radio: pageRadio, tv: pageTv, vault: pageVault, journal: pageJournal, archive: pageArchive, gallery: pageGallery, store: pageStore, hunt: pageHunt, account: () => {}, partner: () => {} };
  function runPage() {
    try {
      (PAGES[PAGE] || (() => {}))();
      terminalize();
      applyHome();
      markRise();
      hydrateCovers();
      bindRails();
      mountGlobes();
      document.dispatchEvent(new CustomEvent('kiosk:page', { detail: { page: PAGE } }));
    } catch (err) {
      // Never leave a blank page if content has a typo
      console.error('[KIOSK] render error', err);
    }
  }

  renderChrome();
  bindThemeAndClock();
  bindTips();
  bindGlobal();
  bindMagazine();
  bindSoftNav();
  bindSettingsOpen();
  bindDepth();
  bindLive();
  runPage();
  syncPDPFromUrl();
  bootI18n();
  reveal();
  wave.draw();
  window.KIOSK = {
    openFilm: (s) => openFilm(featureBySlug(s)),
    player,
    toast,
    store,
    icon,
    esc,
    saved,
    saveKey: SAVE_KEY,
    productById: (id) => (typeof productById === 'function' ? productById(id) : (C.products || []).find((p) => p.id === id)),
    featureBySlug: (s) => (typeof featureBySlug === 'function' ? featureBySlug(s) : (C.features || []).find((f) => f.slug === s)),
    handleOf: (p, cw) => (typeof handleOf === 'function' ? handleOf(p, cw) : null),
    wayOf: (p, cw) => (typeof wayOf === 'function' ? wayOf(p, cw) : ((p && p.colorways) || [])[cw] || {}),
    price: (p) => (typeof price === 'function' ? price(p) : (p && p.price != null ? `$${p.price}` : '')),
    content: C,
  };
})();
