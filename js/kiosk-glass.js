/**
 * KIOSK — Glass runtime
 * Renders the shared chrome (nav, footer, player, lightbox) and each
 * page's content from window.KIOSK_CONTENT (js/kiosk-content.js).
 *
 * Pages declare themselves with <body class="k" data-page="home|garage|story|radio|vault">
 * and provide empty mount points (data-mount="...") that this file fills.
 */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  const C = window.KIOSK_CONTENT || { features: [], mixes: [], products: [], categories: [], issue: {} };
  const PAGE = document.body.dataset.page || '';

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

  const icon = {
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.5 11.5l7-7M5.5 4.5h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    left: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="M0 1.2v11.6c0 .8.9 1.3 1.6.8l9.4-5.8c.6-.4.6-1.3 0-1.7L1.6.4C.9-.1 0 .4 0 1.2z"/></svg>',
    pause: '<svg viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.3a3 3 0 0 1 6 1.5C14 10 8 13.5 8 13.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
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
  const features = (C.features || []).slice().sort((a, b) => {
    const lead = (C.issue || {}).lead;
    if (a.slug === lead) return -1;
    if (b.slug === lead) return 1;
    return String(b.published).localeCompare(String(a.published));
  });
  const featureBySlug = (slug) => features.find((f) => f.slug === slug);
  const productById = (id) => (C.products || []).find((p) => p.id === id);
  const mixBySlug = (slug) => (C.mixes || []).find((m) => m.slug === slug);
  const spotifyUrl = (m) => (m && m.spotify ? `https://open.spotify.com/playlist/${encodeURIComponent(m.spotify)}` : '');
  /** Spotify's playlist player (dark theme). height 152 = compact, 352 = with tracklist. */
  const spotifyEmbed = (m, height = 152) => `<iframe class="k-spotify" title="${esc(m.title)} on Spotify" src="https://open.spotify.com/embed/playlist/${encodeURIComponent(m.spotify)}?utm_source=generator&theme=0" height="${height}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  const mixMeta = (m) => [m.bpm && `${m.bpm} BPM`, m.length].filter(Boolean).join(' · ') || (m.spotify ? 'Spotify' : '');
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

  const productHref = (p, cw) => {
    if (p.status !== 'available') return '';
    const way = (p.colorways || [])[cw || 0];
    const handle = (way && way.shopifyHandle) || p.shopifyHandle;
    if (handle) return `/products/${encodeURIComponent(handle)}`;
    return p.href || '';
  };

  /** Product visual: real photo when present, otherwise a vector mockup. */
  function productVisual(p, cw = 0) {
    const way = (p.colorways || [])[cw] || {};
    const src = way.image || p.image;
    if (src) return `<img class="k-product-img" src="${esc(src)}" alt="${esc(way.name ? `${p.title}, ${way.name}` : p.title)}" loading="lazy" decoding="async">`;
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
    const { image, video, poster, tone, mark, meta, alt, eager, swatch, cls, style, focus } = opts;
    let inner;
    if (video) {
      inner = `<video src="${esc(video)}" ${poster ? `poster="${esc(poster)}"` : ''} muted loop playsinline autoplay preload="metadata"></video>`;
    } else if (image) {
      inner = `<img src="${esc(image)}" alt="${esc(alt || '')}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${focus ? ` style="object-position:${esc(focus)}"` : ''}>`;
    } else {
      const style = swatch ? ` style="--a:${esc(swatch)};--c:${esc(swatch)}66"` : '';
      inner = `<div class="plate plate--${esc(tone || 'graphite')}"${style} role="img" aria-label="${esc(alt || mark || '')}">${mark ? `<span class="plate__mark">${esc(mark)}</span>` : ''}${meta ? `<span class="plate__meta">${esc(meta)}</span>` : ''}</div>`;
    }
    return `<div class="k-media${cls ? ` ${cls}` : ''}"${style ? ` style="${esc(style)}"` : ''}>${inner}</div>`;
  }

  const featureMedia = (f, extra = {}) => media({
    image: f.image, tone: f.tone, mark: f.code, alt: featureName(f), focus: f.focus,
    meta: extra.meta !== undefined ? extra.meta : `${f.city} · ${f.coords || ''}`,
    ...extra,
  });

  /* ----------------------------------------------------------- chrome */

  const NAV = [
    { id: 'garage', label: 'Garage', href: 'garage.html' },
    { id: 'journal', label: 'Journal', href: 'journal.html' },
    { id: 'films', label: 'Films', href: 'garage.html?format=film' },
    { id: 'radio', label: 'Radio', href: 'radio.html' },
    { id: 'vault', label: 'Shop', href: 'vault.html' },
  ];

  function currentNav() {
    const params = new URLSearchParams(location.search);
    if (PAGE === 'garage' && params.get('format') === 'film') return 'films';
    if (PAGE === 'story') return 'journal';
    return PAGE;
  }

  function renderChrome() {
    const cur = currentNav();
    const links = NAV.map((n) => `<a href="${n.href}"${n.id === cur ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');

    const nav = document.createElement('header');
    nav.className = 'k-nav';
    nav.innerHTML = `
      <div class="k-nav__inner">
        <a class="k-logo" href="index.html" aria-label="KIOSK home"><span class="k-logo__mark">K</span>KIOSK</a>
        <nav class="k-nav__links" aria-label="Primary">${links}</nav>
        <div class="k-nav__actions">
          <a class="k-nav__radio" href="radio.html"><span class="k-live" aria-hidden="true"></span>Radio</a>
          <button class="k-nav__shop" type="button" data-notify="dispatch" data-notify-title="The Dispatch">Join</button>
          <button class="k-nav__menu-btn" type="button" aria-expanded="false" aria-controls="k-sheet" aria-label="Open menu"><span></span></button>
        </div>
      </div>`;

    const sheet = document.createElement('div');
    sheet.className = 'k-sheet';
    sheet.id = 'k-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = `
      <ul class="k-sheet__links">
        <li><a href="index.html">Home <span>00</span></a></li>
        ${NAV.map((n, i) => `<li><a href="${n.href}"${n.id === cur ? ' aria-current="page"' : ''}>${n.label} <span>${pad(i + 1)}</span></a></li>`).join('')}
      </ul>
      <div class="k-sheet__foot">
        <a class="k-btn k-btn--sm" href="https://www.instagram.com/onlyatthekiosk" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a class="k-btn k-btn--sm" href="about.html">About</a>
        <a class="k-btn k-btn--sm" href="contact.html">Contact</a>
      </div>`;

    const guides = document.createElement('div');
    guides.className = 'k-guides';
    guides.setAttribute('aria-hidden', 'true');
    guides.innerHTML = '<span></span><span></span><span></span><span></span>';

    document.body.prepend(guides);
    document.body.prepend(sheet);
    document.body.prepend(nav);

    const btn = $('.k-nav__menu-btn', nav);
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

    const footer = document.createElement('footer');
    footer.className = 'k-footer';
    footer.innerHTML = `
      <div class="k-wrap">
        <div class="k-footer__grid">
          <div>
            <p class="k-eyebrow">Only at the KIOSK</p>
            <p class="k-lede k-mt-s">A travel, streetwear and automotive journal. Cars, motorcycles, the people behind them — shot on location, scored in phonk.</p>
          </div>
          <div><h4>Watch + Listen</h4><ul><li><a href="garage.html">Garage</a></li><li><a href="garage.html?format=film">Films</a></li><li><a href="garage.html?format=gallery">Photo stories</a></li><li><a href="garage.html?format=interview">Interviews</a></li><li><a href="radio.html">KIOSK Radio</a></li></ul></div>
          <div><h4>Shop</h4><ul><li><a href="vault.html?c=apparel">Apparel</a></li><li><a href="vault.html?c=headwear">Headwear</a></li><li><a href="vault.html?c=skate">Skate</a></li><li><a href="vault.html?c=accessories">Accessories</a></li><li><a href="vault.html?c=mixes">Phonk mixes</a></li><li><a href="vault.html?c=luts">LUT packs</a></li><li><a href="store.html">Classic store</a></li></ul></div>
          <div><h4>KIOSK</h4><ul><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li><li><a href="faq.html">FAQ</a></li><li><a href="shipping-returns.html">Shipping + Returns</a></li><li><a href="https://www.instagram.com/onlyatthekiosk" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
        </div>
        <div class="k-footer__mark" aria-hidden="true">KIOSK</div>
        <div class="k-footer__base">
          <span>© ${new Date().getFullYear()} Only at the KIOSK</span>
          <span><a href="terms-conditions.html">Terms</a> · <a href="privacy-cookies.html">Privacy</a> · <a href="do-not-sell.html">Do not sell my info</a></span>
        </div>
      </div>`;
    document.body.append(footer);
  }

  /* ------------------------------------------------------------ toast */

  let toastTimer;
  function toast(msg) {
    let el = $('.k-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'k-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
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
      <div class="k-lightbox__screen">${screen}</div>`, `${featureName(f)} film`);
  }

  function openNotify(id, title) {
    openLightbox(`
      <div class="k-glass k-glass--strong" style="max-width:560px;margin:0 auto;padding:clamp(20px,4vw,32px);border-radius:var(--r-xl)">
        <div class="k-lightbox__head">
          <p class="k-eyebrow">Notify me</p>
          <button class="k-lightbox__close" type="button" data-close aria-label="Close">${icon.close}</button>
        </div>
        ${id === 'dispatch'
          ? `<p class="k-h3">Join <span class="k-serif">the Dispatch.</span></p><p class="k-body k-mt-s">New films, phonk mixes and Supply drops — one email per release.</p>`
          : `<p class="k-h3"><span class="k-serif">${esc(title || 'This drop')}</span> isn’t out yet.</p><p class="k-body k-mt-s">Leave your email and we’ll tell you the moment it drops. No spam, one email per release.</p>`}
        <form class="k-input k-mt-m" data-dispatch novalidate data-interest="${esc(id || '')}">
          <label class="k-sr" for="k-notify-email">Email</label>
          <input id="k-notify-email" type="email" name="email" placeholder="you@example.com" autocomplete="email" required data-autofocus>
          <div class="k-input__row"><span class="k-small" style="color:rgba(13,13,14,.5)">Dispatch · KIOSK</span><button class="k-input__send" type="submit" aria-label="Join">${icon.send}</button></div>
        </form>
        <p class="k-form-msg k-mt-s" aria-live="polite"></p>
      </div>`, 'Notify me');
  }

  /* ------------------------------------------------------------ player */

  const player = {
    audio: null,
    el: null,
    mix: null,
    ensure() {
      if (this.el) return;
      this.audio = new Audio();
      this.audio.preload = 'none';
      this.el = document.createElement('div');
      this.el.className = 'k-player';
      this.el.setAttribute('aria-label', 'KIOSK Radio player');
      this.el.innerHTML = `
        <button class="k-player__btn" type="button" data-player-toggle aria-label="Pause">${icon.pause}</button>
        <div class="k-player__info">
          <div class="k-player__title"></div>
          <div class="k-player__bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="k-player__fill"></div></div>
        </div>
        <span class="k-player__time">0:00</span>
        <button class="k-player__close" type="button" data-player-close aria-label="Close player">${icon.close}</button>`;
      document.body.append(this.el);

      const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : '0:00');
      this.audio.addEventListener('timeupdate', () => {
        const pct = this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0;
        $('.k-player__fill', this.el).style.width = `${pct}%`;
        $('.k-player__bar', this.el).setAttribute('aria-valuenow', String(Math.round(pct)));
        $('.k-player__time', this.el).textContent = fmt(this.audio.currentTime);
      });
      this.audio.addEventListener('play', () => this.sync());
      this.audio.addEventListener('pause', () => this.sync());
      this.audio.addEventListener('error', () => { toast('This mix couldn’t be loaded.'); this.sync(); });
      $('[data-player-toggle]', this.el).addEventListener('click', () => (this.audio.paused ? this.audio.play() : this.audio.pause()));
      $('[data-player-close]', this.el).addEventListener('click', () => { this.audio.pause(); this.el.classList.remove('is-visible'); });
      const bar = $('.k-player__bar', this.el);
      bar.addEventListener('click', (e) => {
        if (!this.audio.duration) return;
        const r = bar.getBoundingClientRect();
        this.audio.currentTime = ((e.clientX - r.left) / r.width) * this.audio.duration;
      });
      bar.addEventListener('keydown', (e) => {
        if (!this.audio.duration) return;
        if (e.key === 'ArrowRight') this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
        if (e.key === 'ArrowLeft') this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
      });
    },
    play(slug) {
      const mix = mixBySlug(slug);
      if (!mix) return;
      if (!mix.audio && mix.spotify) { window.open(spotifyUrl(mix), '_blank', 'noopener'); return; }
      if (!mix.audio) {
        toast(`${mix.title} ${mix.volume} drops soon — join the Dispatch to hear it first.`);
        return;
      }
      this.ensure();
      if (this.mix !== mix) {
        this.mix = mix;
        this.audio.src = mix.audio;
        $('.k-player__title', this.el).innerHTML = `${esc(mix.title)} <span>· ${esc(mix.volume)} · KIOSK Radio</span>`;
      }
      this.el.classList.add('is-visible');
      if (this.audio.paused) this.audio.play().catch(() => {}); else this.audio.pause();
    },
    isPlaying(slug) { return !!(this.mix && this.mix.slug === slug && this.audio && !this.audio.paused); },
    sync() {
      if (this.el) {
        const btn = $('[data-player-toggle]', this.el);
        const playing = !this.audio.paused;
        btn.innerHTML = playing ? icon.pause : icon.play;
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      }
      $$('[data-mix-play]').forEach((b) => {
        const on = this.isPlaying(b.dataset.mixPlay);
        b.setAttribute('aria-pressed', String(on));
        const ico = $('[data-ico]', b);
        if (ico) ico.innerHTML = on ? icon.pause : icon.play;
      });
      $$('[data-radio-deck]').forEach((d) => d.classList.toggle('is-playing', this.isPlaying(d.dataset.radioDeck)));
    },
  };

  /* ------------------------------------------------------------ saves */

  const SAVE_KEY = 'kiosk:saved';
  const saved = new Set(store.get(SAVE_KEY, []));
  function toggleSave(slug, btn) {
    if (saved.has(slug)) saved.delete(slug); else saved.add(slug);
    store.set(SAVE_KEY, Array.from(saved));
    $$(`[data-save="${CSS.escape(slug)}"]`).forEach((b) => b.setAttribute('aria-pressed', String(saved.has(slug))));
    if (btn) toast(saved.has(slug) ? 'Saved to your garage' : 'Removed from your garage');
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
      <article class="k-shop-card" id="${esc(p.id)}" data-product="${esc(p.id)}" data-cw="${cw}" data-reveal>
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
          <p class="k-shop-card__sub">${esc(categoryLabel(p.category))}${ways.length > 1 ? ` · ${ways.length} colours` : ''}</p>
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

  function openQuickView(id, cw = 0) {
    const p = productById(id);
    if (!p) return;
    const ways = p.colorways || [];
    const sizes = p.sizes || [];
    const seen = storiesFor(p);
    const mix = p.category === 'mixes' ? (C.mixes || []).find((m) => m.product === p.id) : null;
    const state = { cw, size: sizes.length === 1 ? sizes[0] : '' };

    openLightbox(`
      <div class="k-qv k-light" data-qv="${esc(p.id)}">
        <div class="k-qv__media">
          <div data-qv-img style="width:100%;height:100%;display:grid;place-items:center">${productVisual(p, cw)}</div>
          ${p.badge ? `<span class="k-badge${p.badge === 'Issue 01' ? ' k-badge--sticker' : ''}" style="top:16px;left:16px">${esc(p.badge)}</span>` : ''}
          ${ways.length > 1 ? `<div class="k-qv__thumbs">${ways.map((w, i) => `<button type="button" data-qv-cw="${i}" aria-pressed="${i === cw}" aria-label="${esc(w.name)}">${productVisual(p, i)}</button>`).join('')}</div>` : ''}
        </div>
        <div class="k-qv__body">
          <div class="k-qv__head">
            <div>
              <p class="k-eyebrow">${esc(categoryLabel(p.category))}${p.status === 'available' ? '' : ' · Coming soon'}</p>
              <h2 class="k-qv__title k-mt-s">${esc(p.title)}</h2>
            </div>
            <button class="k-qv__close" type="button" data-close aria-label="Close">${icon.close}</button>
          </div>
          <p class="k-qv__price">${esc(price(p))}</p>
          ${ways.length ? `<div><p class="k-qv__label"><span>Colour</span><span data-qv-cwname>${esc((ways[cw] || {}).name || '')}</span></p>
            <div class="k-dots">${ways.map((w, i) => `<button class="k-dot k-dot--lg" type="button" style="--sw:${esc(w.garment)}" data-qv-cw="${i}" aria-pressed="${i === cw}" aria-label="${esc(w.name)}" title="${esc(w.name)}"></button>`).join('')}</div></div>` : ''}
          ${sizes.length ? `<div><p class="k-qv__label"><span>Size</span><span data-qv-sizename>${esc(state.size || 'Select a size')}</span></p>
            <div class="k-sizes">${sizes.map((z) => `<button class="k-size" type="button" data-qv-size="${esc(z)}" aria-pressed="${z === state.size}">${esc(z)}</button>`).join('')}</div></div>` : ''}
          <div class="k-qv__cta" data-qv-cta></div>
          <p class="k-form-msg" data-qv-msg aria-live="polite"></p>
          <dl class="k-qv__list">
            ${p.detail ? `<div><dt>Details</dt><dd>${esc(p.detail)}</dd></div>` : ''}
            <div><dt>Delivery</dt><dd>${['mixes', 'films', 'luts'].includes(p.category) ? 'Digital download' : 'Shipped'}</dd></div>
          </dl>
          ${seen.length ? `<div><p class="k-qv__label"><span>As seen in</span></p><div class="k-qv__seen">${seen.map((f) => `<a class="k-btn k-btn--sm" href="${storyHref(f)}">${esc(f.title)} · ${esc(f.make)} ${esc(f.code)}</a>`).join('')}</div></div>` : ''}
        </div>
      </div>`, p.title);

    const root = $('.k-qv');
    const renderCta = () => {
      const href = productHref(p, state.cw);
      const cta = $('[data-qv-cta]', root);
      const needsSize = sizes.length > 1 && !state.size;
      if (href) {
        cta.innerHTML = `<a class="k-btn k-btn--solid" href="${esc(href)}" data-qv-buy>${p.price == null ? 'Shop collection' : `Buy — ${esc(price(p))}`}</a>`;
      } else {
        cta.innerHTML = `<button class="k-btn k-btn--solid" type="button" data-notify="${esc(p.id)}" data-notify-title="${esc(p.title)}">Notify me when it drops</button>`;
      }
      if (mix) cta.innerHTML += `<button class="k-btn" type="button" data-mix-play="${esc(mix.slug)}"><span data-ico style="display:inline-grid">${icon.play}</span> Preview the mix</button>`;
      const buy = $('[data-qv-buy]', cta);
      if (buy && needsSize) {
        buy.addEventListener('click', (e) => {
          e.preventDefault();
          $('[data-qv-msg]', root).textContent = 'Pick a size first.';
        });
      }
    };
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-qv-cw]');
      if (c) {
        state.cw = Number(c.dataset.qvCw);
        $('[data-qv-img]', root).innerHTML = productVisual(p, state.cw);
        $$('[data-qv-cw]', root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.qvCw) === state.cw)));
        const nm = $('[data-qv-cwname]', root);
        if (nm) nm.textContent = ways[state.cw].name;
        renderCta();
        return;
      }
      const z = e.target.closest('[data-qv-size]');
      if (z) {
        state.size = z.dataset.qvSize;
        $$('[data-qv-size]', root).forEach((b) => b.setAttribute('aria-pressed', String(b === z)));
        $('[data-qv-sizename]', root).textContent = state.size;
        $('[data-qv-msg]', root).textContent = '';
        renderCta();
      }
    });
    renderCta();
  }

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

  function waveBars(seed, n = 64) {
    let h = hash(seed);
    let out = '';
    for (let i = 0; i < n; i += 1) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      const env = Math.sin((i / n) * Math.PI) * 0.6 + 0.4;
      const v = Math.max(0.12, ((h % 1000) / 1000) * env);
      out += `<i style="height:${(v * 100).toFixed(1)}%;animation-delay:${((h % 900) / 1000).toFixed(2)}s"${i < n * 0.35 ? ' class="is-on"' : ''}></i>`;
    }
    return out;
  }

  function radioBlock(activeSlug) {
    const mixes = C.mixes || [];
    if (!mixes.length) return '';
    const m = mixBySlug(activeSlug) || mixes[0];
    const product = productById(m.product);
    return `
      <div class="k-radio">
        <div class="k-radio__deck k-glass" data-radio-deck="${esc(m.slug)}" data-reveal>
          <div class="plate plate--${esc(m.tone)}"></div>
          <div class="k-row-flex" style="justify-content:space-between">
            <span class="k-eyebrow"><span class="k-live" aria-hidden="true"></span><b>KIOSK Radio</b> · ${esc(m.volume)}</span>
            <span class="k-eyebrow">${esc(mixMeta(m))}</span>
          </div>
          <div>
            <h3 class="k-radio__now">${esc(m.title)} <span class="k-serif" style="opacity:.6">${esc(m.volume)}</span></h3>
            <p class="k-radio__mood">${esc(m.mood)}</p>
          </div>
          ${m.spotify && !m.audio ? spotifyEmbed(m) : `<div class="k-wave" aria-hidden="true">${waveBars(m.slug)}</div>`}
          <div class="k-radio__controls">
            ${m.spotify && !m.audio
              ? `<a class="k-btn k-btn--solid" href="${esc(spotifyUrl(m))}" target="_blank" rel="noopener">Open in Spotify<span class="k-arrow">${icon.arrow}</span></a>`
              : `<button class="k-round" type="button" data-mix-play="${esc(m.slug)}" aria-pressed="false" aria-label="Play ${esc(m.title)}"><span data-ico>${icon.play}</span></button>`}
            ${product ? (productHref(product)
              ? `<a class="k-btn" href="${esc(productHref(product))}">Download · ${esc(price(product))}</a>`
              : `<button class="k-btn" type="button" data-notify="${esc(product.id)}" data-notify-title="${esc(product.title)}">Get the mix · ${esc(price(product))}</button>`) : ''}
            ${(m.tracks || []).length ? `<span class="k-small">${esc(m.tracks.length)} tracks</span>` : ''}
          </div>
        </div>
        <div class="k-radio__list k-glass" data-reveal data-reveal-delay="1">
          <p class="k-eyebrow" style="padding:12px 10px 8px">On rotation</p>
          ${mixes.map((x) => `
            <button class="k-radio__item${x.slug === m.slug ? ' is-active' : ''}" type="button" data-radio-select="${esc(x.slug)}">
              <span class="k-radio__cover">${media({ image: x.cover, tone: x.tone, mark: '' })}</span>
              <span><b>${esc(x.title)}</b><small>${esc(x.volume)} · ${esc(x.mood)}</small></span>
              <span class="k-mono">${esc(x.length || (x.spotify ? 'Spotify' : ''))}</span>
            </button>`).join('')}
          <div style="padding:10px"><a class="k-bar" href="radio.html">All playlists + tracklists<span class="k-arrow">${icon.arrow}</span></a></div>
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
      player.sync();
    });
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
        body: JSON.stringify({ email }),
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
      const qv = e.target.closest('[data-quickview]');
      if (qv) {
        const card = qv.closest('[data-product]');
        openQuickView(qv.dataset.quickview, card ? Number(card.dataset.cw || 0) : 0);
        return;
      }
      const save = e.target.closest('[data-save]');
      if (save) { e.preventDefault(); toggleSave(save.dataset.save, save); return; }
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

  /* ================================================================ PAGES */

  /* ------------------------------------------------------------- home */

  function pageHome() {
    const issue = C.issue || {};
    const lead = featureBySlug(issue.lead) || features[0];
    if (!lead) return;

    // Hero background
    const fullBleed = { cls: 'k-media--clean', style: 'position:absolute;inset:0' };
    fill('hero-bg', issue.reel
      ? media({ video: issue.reel, poster: issue.reelPoster, alt: 'KIOSK reel', ...fullBleed })
      : featureMedia(lead, { meta: '', mark: '', eager: true, ...fullBleed }));

    fill('hero-issue', `<span class="k-live" aria-hidden="true"></span><b>Issue ${esc(issue.number || '01')}</b> · ${esc(issue.title || '')}`);
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
      <a class="k-bar" href="garage.html">Enter the Garage<span class="k-arrow">${icon.arrow}</span></a>`);
    fill('hero-watch', `
      <button class="k-watch" type="button" data-film="${esc(lead.slug)}">
        <span class="k-watch__thumb">${featureMedia(lead, { meta: '', mark: '', cls: 'k-media--clean', style: 'position:absolute;inset:0' })}<span class="k-play">${icon.play}</span></span>
        <span><b>Watch film</b><small>${[lead.title, lead.runtime].filter(Boolean).map(esc).join(' · ')}</small></span>
      </button>`);

    // Garage rail with type filter
    const railEl = mount('garage-rail');
    const renderRail = (type) => {
      const list = features.filter((f) => type === 'all' || f.type === type);
      railEl.innerHTML = list.map(featureCard).join('');
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

    // Manifesto inline image uses a second feature
    const second = features.find((f) => f.slug !== lead.slug) || lead;
    fill('quote-inline', featureMedia(second, { meta: '', mark: '' }));

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

    // Radio
    const radio = fill('radio', radioBlock((C.mixes || [])[0] && C.mixes[0].slug));
    bindRadio(radio);

    // Shop preview — the newest physical drop
    const picks = (C.products || [])
      .filter((p) => !['mixes', 'films', 'luts'].includes(p.category))
      .slice().sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')))
      .slice(0, 8);
    fill('vault', picks.map((p) => productCard(p)).join(''));
    const wall = mount('home-wall');
    if (wall) wall.innerHTML = wallHtml();
  }

  /* ----------------------------------------------------------- garage */

  function pageGarage() {
    const params = new URLSearchParams(location.search);
    const state = {
      q: params.get('q') || '',
      type: params.get('type') || 'all',
      format: params.get('format') || 'all',
      eras: new Set((params.get('era') || '').split(',').filter(Boolean)),
      seasons: new Set((params.get('season') || '').split(',').filter(Boolean)),
      city: params.get('city') || '',
      saved: params.get('saved') === '1',
    };

    const eras = Array.from(new Set(features.map((f) => f.era).filter(Boolean))).sort();
    const seasons = ['spring', 'summer', 'fall', 'winter'].filter((s) => features.some((f) => f.season === s));
    const cities = Array.from(new Set(features.map((f) => f.city).filter(Boolean))).sort();

    const filters = mount('filters');
    filters.innerHTML = `
      <div class="k-filters__head">
        <h2>Filter</h2>
        <div class="k-row-flex">
          <button class="k-filters__reset" type="button" data-reset>Reset all</button>
          <button class="k-btn k-btn--sm k-filters-toggle" type="button" data-toggle-filters aria-expanded="false">Show filters</button>
        </div>
      </div>
      <div class="k-filter">
        <label class="k-search"><span class="k-sr">Search</span>${icon.search}<input type="search" placeholder="Search make, city, owner…" value="${esc(state.q)}" data-q></label>
      </div>
      <div class="k-filter">
        <span class="k-filter__label">Machine</span>
        <div class="k-seg" data-group="type">
          ${[['all', 'Any'], ['car', 'Cars'], ['motorcycle', 'Motorcycles'], ['meet', 'Meets']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${state.type === v}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="k-filter">
        <span class="k-filter__label">Format</span>
        <div class="k-chips" data-group="format">
          ${[['all', 'Everything'], ['film', 'Films'], ['gallery', 'Photo stories'], ['interview', 'Interviews']].map(([v, l]) => `<button class="k-chip" type="button" data-v="${v}" aria-pressed="${state.format === v}">${l}</button>`).join('')}
        </div>
      </div>
      ${eras.length ? `<div class="k-filter">
        <span class="k-filter__label">Era</span>
        <div class="k-chips" data-group="era">
          ${eras.map((v) => `<button class="k-chip" type="button" data-v="${esc(v)}" aria-pressed="${state.eras.has(v)}">${esc(v)}<span class="k-count">${features.filter((f) => f.era === v).length}</span></button>`).join('')}
        </div>
      </div>` : ''}
      <div class="k-filter">
        <span class="k-filter__label">Season</span>
        <div class="k-chips" data-group="season">
          ${seasons.map((v) => `<button class="k-chip" type="button" data-v="${esc(v)}" aria-pressed="${state.seasons.has(v)}" style="text-transform:capitalize">${esc(v)}</button>`).join('')}
        </div>
      </div>
      <div class="k-filter"${cities.length ? '' : ' hidden'}>
        <span class="k-filter__label">Location</span>
        <div class="k-chips" data-group="city">
          ${cities.map((v) => `<button class="k-chip" type="button" data-v="${esc(v)}" aria-pressed="${state.city === v}">${esc(v)}</button>`).join('')}
        </div>
      </div>
      <div class="k-filter">
        <span class="k-filter__label">Your garage</span>
        <div class="k-chips"><button class="k-chip" type="button" data-saved aria-pressed="${state.saved}">${icon.heart.replace('<svg', '<svg width="14" height="14"')} Saved only</button></div>
      </div>`;
    if (window.matchMedia('(max-width: 999px)').matches) filters.dataset.collapsed = 'true';

    const results = mount('results');
    const count = mount('results-count');

    const matches = (f) => {
      if (state.type !== 'all' && f.type !== state.type) return false;
      if (state.format !== 'all' && f.format !== state.format && !(state.format === 'film' && (f.media || []).includes('film'))) return false;
      if (state.eras.size && !state.eras.has(f.era)) return false;
      if (state.seasons.size && !state.seasons.has(f.season)) return false;
      if (state.city && f.city !== state.city) return false;
      if (state.saved && !saved.has(f.slug)) return false;
      if (state.q) {
        const hay = [f.make, f.model, f.code, f.title, f.city, f.country, f.location, f.tagline, (f.owner || {}).name, (f.tags || []).join(' '), (f.vibes || []).join(' ')].join(' ').toLowerCase();
        if (!state.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    };

    const syncUrl = () => {
      const p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.type !== 'all') p.set('type', state.type);
      if (state.format !== 'all') p.set('format', state.format);
      if (state.eras.size) p.set('era', Array.from(state.eras).join(','));
      if (state.seasons.size) p.set('season', Array.from(state.seasons).join(','));
      if (state.city) p.set('city', state.city);
      if (state.saved) p.set('saved', '1');
      const qs = p.toString();
      history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    };

    const render = () => {
      const list = features.filter(matches);
      const nouns = { film: ['film', 'films'], gallery: ['photo story', 'photo stories'], interview: ['interview', 'interviews'] };
      const [one, many] = nouns[state.format] || ['story', 'stories'];
      count.textContent = `${list.length} ${list.length === 1 ? one : many} in the garage`;
      results.innerHTML = list.length
        ? list.map(featureCard).join('')
        : `<div class="k-empty" style="grid-column:1/-1"><p class="k-h3">Nothing in the garage matches that.</p><p class="k-small k-mt-s">Try removing a filter.</p></div>`;
      reveal(results);
      syncUrl();
    };

    filters.addEventListener('click', (e) => {
      if (e.target.closest('[data-toggle-filters]')) {
        const collapsed = filters.dataset.collapsed === 'true';
        filters.dataset.collapsed = String(!collapsed);
        const t = e.target.closest('[data-toggle-filters]');
        t.setAttribute('aria-expanded', String(collapsed));
        t.textContent = collapsed ? 'Hide filters' : 'Show filters';
        return;
      }
      if (e.target.closest('[data-reset]')) {
        state.q = ''; state.type = 'all'; state.format = 'all'; state.eras.clear(); state.seasons.clear(); state.city = ''; state.saved = false;
        $('[data-q]', filters).value = '';
        $$('[data-group] button', filters).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === 'all')));
        $('[data-saved]', filters).setAttribute('aria-pressed', 'false');
        render();
        return;
      }
      if (e.target.closest('[data-saved]')) {
        state.saved = !state.saved;
        e.target.closest('[data-saved]').setAttribute('aria-pressed', String(state.saved));
        render();
        return;
      }
      const b = e.target.closest('[data-group] button');
      if (!b) return;
      const group = b.closest('[data-group]').dataset.group;
      const v = b.dataset.v;
      if (group === 'type' || group === 'format') {
        state[group] = v;
        $$('button', b.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      } else if (group === 'era' || group === 'season') {
        const set = group === 'era' ? state.eras : state.seasons;
        if (set.has(v)) set.delete(v); else set.add(v);
        b.setAttribute('aria-pressed', String(set.has(v)));
      } else if (group === 'city') {
        state.city = state.city === v ? '' : v;
        $$('button', b.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === state.city)));
      }
      render();
    });

    let t;
    $('[data-q]', filters).addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 160);
    });

    // Saved toggles should refresh the list when filtering by saved
    document.addEventListener('click', (e) => { if (state.saved && e.target.closest('[data-save]')) setTimeout(render, 0); });

    const head = mount('garage-title');
    if (head && state.format === 'film') head.innerHTML = '<span>Films,</span><span>scored in <em class="k-serif">phonk.</em></span>';
    render();
  }

  /* ------------------------------------------------------------ story */

  function pageStory() {
    const slug = new URLSearchParams(location.search).get('s');
    const f = featureBySlug(slug) || features[0];
    if (!f) return;

    document.title = `${f.title ? `${f.title} — ` : ''}${featureName(f)} · KIOSK`;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', f.excerpt || f.tagline || '');

    const frames = (f.gallery || []).map((g) => (typeof g === 'string' ? { src: g } : g));
    const hasFilm = !!(f.video || f.embed) || (f.media || []).includes('film');
    const soundtrack = mixBySlug(f.soundtrack);
    const lut = productById(f.gradedWith);
    const filmProduct = productById(f.filmProduct);

    // HERO
    fill('story-hero', `
      <div class="k-story-hero__frame">
        <div class="k-story-hero__bg">${featureMedia(f, { meta: '', mark: '', eager: true, cls: 'k-media--clean', style: 'position:absolute;inset:0' })}</div>
        <div class="k-story-hero__head">
          <p class="k-eyebrow">${[f.year, f.make].filter(Boolean).length ? `<b>${esc([f.year, f.make].filter(Boolean).join(' '))}</b> · ` : ''}${esc(formatLabel(f))}</p>
          <h1 class="k-story-hero__code">${esc(f.code)}</h1>
          <p class="k-story-hero__tagline">${f.make ? `${esc(f.model)} — ` : ''}<span class="k-serif">${esc(f.tagline)}</span></p>
          <div class="k-story-hero__tags">
            ${place(f) ? `<span class="k-tag">${esc(place(f))}</span>` : ''}
            ${f.runtime ? `<span class="k-tag">${esc(f.runtime)}</span>` : ''}
            ${f.season ? `<span class="k-tag" style="text-transform:capitalize">${esc(f.season)}</span>` : ''}
            ${(f.vibes || []).slice(0, 3).map((v) => `<span class="k-tag" style="text-transform:capitalize">${esc(v.replace(/-/g, ' '))}</span>`).join('')}
          </div>
        </div>
        <div class="k-story-hero__panel k-glass k-glass--dark">
          <p class="k-duo"><strong>${esc(f.title || f.model)}.</strong> ${esc(f.excerpt || '')}</p>
          ${f.palette && f.palette.length ? `<div class="k-palette-strip k-mt-m" aria-hidden="true">${f.palette.map((c) => `<i style="--swatch:${esc(c.hex)}"></i>`).join('')}</div>` : ''}
        </div>
        <div class="k-story-hero__side">
          ${frames.length || (f.palette || []).length ? `<div class="k-story-hero__thumbs">
            ${[0, 1, 2].map((i) => {
              const fr = frames[i];
              const sw = (f.palette || [])[i];
              return `<button type="button" data-goto-slide="${i}" aria-label="View frame ${i + 1}">${media({ image: fr && fr.src, tone: f.tone, swatch: !fr && sw ? sw.hex : '', meta: fr ? '' : `${pad(i + 1)} · ${sw ? sw.name : 'Frame'}`, alt: (fr && fr.caption) || `${featureName(f)} frame ${i + 1}` })}</button>`;
            }).join('')}
          </div>` : ''}
          ${hasFilm ? `<button class="k-bar" type="button" data-film="${esc(f.slug)}" style="width:100%;text-align:left">Watch the film<span class="k-arrow">${icon.play}</span></button>` : ''}
          <a class="k-bar" href="#look">Shop the look<span class="k-arrow">${icon.arrow}</span></a>
        </div>
      </div>`);

    // SPECS
    fill('story-specs', (f.specs || []).map((s) => `<div class="k-spec"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join(''));

    // ASIDE (shoot sheet)
    fill('story-aside', `
      <dl class="k-meta-list k-glass">
        <div><dt>Subject</dt><dd>${esc(featureName(f))}</dd></div>
        ${(f.owner || {}).name ? `<div><dt>Owner</dt><dd>${esc(f.owner.name)}</dd></div>` : ''}
        ${f.location ? `<div><dt>Location</dt><dd>${esc(f.location)}</dd></div>` : ''}
        ${place(f) ? `<div><dt>Area</dt><dd>${esc(place(f))}</dd></div>` : ''}
        ${f.coords ? `<div><dt>Coordinates</dt><dd class="k-mono">${esc(f.coords)}</dd></div>` : ''}
        ${f.shotOn ? `<div><dt>Shot on</dt><dd>${esc(f.shotOn)}</dd></div>` : ''}
        ${f.lens ? `<div><dt>Lens</dt><dd>${esc(f.lens)}</dd></div>` : ''}
        ${f.runtime ? `<div><dt>Runtime</dt><dd>${esc(f.runtime)}</dd></div>` : ''}
        <div><dt>Shot</dt><dd>${esc(new Date(`${f.published}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</dd></div>
      </dl>
      ${soundtrack ? `<button class="k-bar" type="button" data-mix-play="${esc(soundtrack.slug)}" style="width:100%;text-align:left"><span>Soundtrack<small>${esc(soundtrack.title)} ${esc(soundtrack.volume)} · KIOSK Radio</small></span><span class="k-arrow" data-ico>${icon.play}</span></button>` : ''}
      ${lut ? `<a class="k-bar" href="vault.html?c=luts#${esc(lut.id)}"><span>Graded with<small>${esc(lut.title)} · ${esc(price(lut))}</small></span><span class="k-arrow">${icon.arrow}</span></a>` : ''}
      ${filmProduct ? `<button class="k-bar" type="button" data-notify="${esc(filmProduct.id)}" data-notify-title="${esc(filmProduct.title)}" style="width:100%;text-align:left"><span>Own the film<small>${esc(filmProduct.detail)} · ${esc(price(filmProduct))}</small></span><span class="k-arrow">${icon.arrow}</span></button>` : ''}
      <button class="k-btn" type="button" data-save="${esc(f.slug)}" aria-pressed="${saved.has(f.slug)}">${icon.heart.replace('<svg', '<svg width="16" height="16"')} Save to your garage</button>`);

    // STORY BODY
    const blocks = (f.story || []).map((b) => {
      if (b.type === 'quote') return `<blockquote class="k-prose__quote" data-reveal><p>“${esc(b.text)}”</p>${b.cite ? `<cite>— ${esc(b.cite)}</cite>` : ''}</blockquote>`;
      if (b.type === 'heading') return `<h3 class="k-prose__heading" data-reveal>${esc(b.text)}</h3>`;
      if (b.type === 'image') return `<figure class="k-prose__figure" data-reveal>${media({ image: b.src, tone: f.tone, alt: b.caption || '' })}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
      return `<p class="k-prose__text" data-reveal>${b.lead ? `<strong>${esc(b.lead)}</strong> ` : ''}${esc(b.body || b.text || '')}</p>`;
    }).join('');
    const ownerQuote = f.owner && f.owner.quote && !(f.story || []).some((b) => b.type === 'quote')
      ? `<blockquote class="k-prose__quote" data-reveal><p>“${esc(f.owner.quote)}”</p><cite>— ${esc(f.owner.name)}</cite></blockquote>` : '';
    const done = written(f);
    const chapters = (f.chapters || []).map((c, n) => {
      const body = paragraphs(c.body);
      if (body.length) {
        return `<section class="k-chapter" id="${esc(c.id)}" data-reveal>
          <p class="k-chapter__num">Chapter ${pad(n + 1)}</p>
          <h3 class="k-prose__heading">${esc(c.heading)}</h3>
          ${body.map((t) => `<p class="k-prose__text">${esc(t)}</p>`).join('')}
        </section>`;
      }
      return DRAFT ? `<section class="k-chapter k-chapter--draft" id="${esc(c.id)}">
          <p class="k-chapter__num">Chapter ${pad(n + 1)} · <code>${esc(c.id)}</code> · not written yet</p>
          <h3 class="k-prose__heading">${esc(c.heading)}</h3>
          <p class="k-prose__text">${esc(c.prompt || '')}</p>
        </section>` : '';
    }).join('');
    const pending = (f.chapters || []).length - done.length;
    const byline = `<p class="k-byline">By ${esc(f.author || 'KIOSK')}${f.published ? ` · ${esc(longDate(f.published))}` : ''} · ${readMinutes(f)} min read${DRAFT ? ` · <b>Draft view: ${done.length} of ${(f.chapters || []).length} chapters written</b>` : ''}</p>`;
    const more = !DRAFT && pending > 0 ? `<p class="k-small k-chapter__more">${done.length ? 'More chapters' : 'The full story'} coming soon, told by ${esc(f.author || 'KIOSK')}.</p>` : '';
    fill('story-body', byline + ((blocks + ownerQuote) || `<p class="k-prose__text"><strong>${esc(f.tagline)}</strong> ${esc(f.excerpt || '')}</p>`) + chapters + more);

    // TIMELINE
    const tl = f.timeline || [];
    const tlEl = fill('story-timeline', tl.map((t) => `<li><b>${esc(t.year)}</b><span>${esc(t.label)}</span></li>`).join(''));
    if (tlEl) tlEl.style.setProperty('--n', String(Math.max(tl.length, 1)));

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

    // SLIDESHOW
    const palette = f.palette || [];
    if (!frames.length && !palette.length) hideSection('gallery');
    const slides = frames.length ? frames : Array.from({ length: Math.max(3, Math.min(palette.length, 6)) }, (_, i) => ({
      src: '',
      caption: (palette[i] && `${palette[i].name} — ${palette[i].note || ''}`) || `Frame ${pad(i + 1)}`,
      meta: 'Awaiting upload',
      swatch: palette[i] && palette[i].hex,
    }));
    buildSlideshow(mount('story-slideshow'), slides, f);

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

    // PREV / NEXT
    const idx = features.indexOf(f);
    const prev = features[(idx - 1 + features.length) % features.length];
    const next = features[(idx + 1) % features.length];
    if (features.length > 1) {
      fill('story-pager', `
        <a href="${storyHref(prev)}">${featureMedia(prev, { meta: '' })}<span class="k-eyebrow">← Previous</span><span><b>${esc(prev.title || prev.model)}</b><span class="k-small" style="display:block">${esc(featureName(prev))}</span></span></a>
        <a href="${storyHref(next)}">${featureMedia(next, { meta: '' })}<span class="k-eyebrow">Next →</span><span><b>${esc(next.title || next.model)}</b><span class="k-small" style="display:block">${esc(featureName(next))}</span></span></a>`);
    }

    // Hero thumbs jump to slideshow
    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto-slide]');
      if (!g) return;
      const ss = mount('story-slideshow');
      if (ss && ss.kGoto) { ss.kGoto(Number(g.dataset.gotoSlide)); ss.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });

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
      contentLocation: { '@type': 'Place', name: `${f.location}, ${f.city}` },
      publisher: { '@type': 'Organization', name: 'KIOSK' },
    });
    document.head.append(ld);
  }

  function hideSection(name) {
    const el = $(`[data-section="${name}"]`);
    if (el) el.classList.add('k-hide');
  }

  function buildSlideshow(root, slides, f) {
    if (!root || !slides.length) return;
    const DURATION = 6000;
    root.classList.add('k-slideshow');
    root.style.setProperty('--dur', `${DURATION}ms`);
    root.innerHTML = `
      <div class="k-slideshow__stage" aria-roledescription="carousel" aria-label="${esc(featureName(f))} gallery">
        ${slides.map((s, i) => `<div class="k-slide${i === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}" aria-hidden="${i !== 0}">${media({ image: s.src, tone: f.tone, swatch: s.swatch, alt: s.caption || featureName(f), mark: i === 0 ? f.code : '' })}</div>`).join('')}
        <div class="k-slideshow__progress" aria-hidden="true">${slides.map(() => '<i></i>').join('')}</div>
        <div class="k-slideshow__ui">
          <div class="k-slideshow__caption k-glass k-glass--dark" aria-live="polite"><b></b><small></small></div>
          <div class="k-slideshow__nav k-glass k-glass--dark">
            <button type="button" data-ss="prev" aria-label="Previous frame">${icon.left}</button>
            <span class="k-slideshow__count"></span>
            <button type="button" data-ss="toggle" aria-label="Pause slideshow">${icon.pause}</button>
            <button type="button" data-ss="next" aria-label="Next frame">${icon.right}</button>
          </div>
        </div>
      </div>
      <div class="k-thumbs">${slides.map((s, i) => `<button type="button" data-ss-go="${i}" aria-label="Go to frame ${i + 1}">${media({ image: s.src, tone: f.tone, swatch: s.swatch, alt: '' })}</button>`).join('')}</div>`;

    const slideEls = $$('.k-slide', root);
    const bars = $$('.k-slideshow__progress i', root);
    const thumbs = $$('[data-ss-go]', root);
    const cap = $('.k-slideshow__caption', root);
    const cnt = $('.k-slideshow__count', root);
    const toggle = $('[data-ss="toggle"]', root);
    let i = 0;
    let timer = null;
    let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slideEls.forEach((el, k) => { el.classList.toggle('is-active', k === i); el.setAttribute('aria-hidden', String(k !== i)); });
      bars.forEach((b, k) => {
        b.classList.toggle('is-done', k < i);
        b.classList.remove('is-active');
        if (k === i) { void b.offsetWidth; b.classList.add('is-active'); }
      });
      thumbs.forEach((t, k) => t.classList.toggle('is-active', k === i));
      $('b', cap).textContent = slides[i].caption || `Frame ${pad(i + 1)}`;
      $('small', cap).textContent = slides[i].meta || `${f.shotOn} · ${f.lens}`;
      cnt.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!paused) timer = setTimeout(() => show(i + 1), DURATION);
    };
    const setPaused = (p) => {
      paused = p;
      root.classList.toggle('is-paused', p);
      toggle.innerHTML = p ? icon.play : icon.pause;
      toggle.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
      schedule();
    };

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ss]');
      if (b) {
        if (b.dataset.ss === 'prev') show(i - 1);
        if (b.dataset.ss === 'next') show(i + 1);
        if (b.dataset.ss === 'toggle') setPaused(!paused);
        return;
      }
      const g = e.target.closest('[data-ss-go]');
      if (g) show(Number(g.dataset.ssGo));
    });
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });
    // Swipe
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    // Pause when off-screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) clearTimeout(timer); else schedule();
      }).observe(root);
    }

    root.kGoto = show;
    setPaused(paused);
    show(0);
  }

  /* ------------------------------------------------------------ radio */

  function pageRadio() {
    const deck = fill('radio', radioBlock((C.mixes || [])[0] && C.mixes[0].slug));
    bindRadio(deck);
    fill('tracklists', (C.mixes || []).map((m, n) => {
      const used = features.filter((f) => f.soundtrack === m.slug);
      const product = productById(m.product);
      return `
        <article class="k-glass" style="padding:clamp(20px,3vw,28px);border-radius:var(--r-xl)" data-reveal>
          <div class="k-row-flex" style="justify-content:space-between">
            <p class="k-eyebrow">${pad(n + 1)} / ${esc(m.volume)}</p>
            <p class="k-eyebrow">${esc(mixMeta(m))}</p>
          </div>
          <h3 class="k-h2 k-mt-m">${esc(m.title)}</h3>
          <p class="k-body k-mt-s">${esc(m.mood)}</p>
          ${m.spotify ? `<div class="k-mt-m">${spotifyEmbed(m, 352)}</div>` : ''}
          ${(m.tracks || []).length ? `<ol class="k-rows k-mt-m">
            ${m.tracks.map((t, k) => `<li class="k-row" style="padding:14px 4px;grid-template-columns:44px 1fr"><span class="k-row__num">${pad(k + 1)}</span><span style="font-size:16px">${esc(t)}</span></li>`).join('')}
          </ol>` : ''}
          ${used.length ? `<p class="k-small k-mt-m">Scored: ${used.map((f) => `<a href="${storyHref(f)}" style="color:var(--ink);text-decoration:underline;text-underline-offset:3px">${esc(f.title)}</a>`).join(', ')}</p>` : ''}
          <div class="k-row-flex k-mt-m">
            ${m.spotify && !m.audio
              ? `<a class="k-btn k-btn--solid" href="${esc(spotifyUrl(m))}" target="_blank" rel="noopener">Follow on Spotify</a>`
              : `<button class="k-btn k-btn--solid" type="button" data-mix-play="${esc(m.slug)}" aria-pressed="false"><span data-ico style="display:inline-grid;width:12px">${icon.play}</span> Listen</button>`}
            ${product ? (productHref(product)
              ? `<a class="k-btn" href="${esc(productHref(product))}">Download · ${esc(price(product))}</a>`
              : `<button class="k-btn" type="button" data-notify="${esc(product.id)}" data-notify-title="${esc(product.title)}">Get the mix · ${esc(price(product))}</button>`) : ''}
          </div>
        </article>`;
    }).join(''));
  }

  /* ---------------------------------------------------------- journal */

  function pageJournal() {
    const posts = features.slice().sort((a, b) => String(b.published).localeCompare(String(a.published)));
    fill('journal-count', `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`);
    fill('journal', posts.map((f, n) => {
      const total = (f.chapters || []).length;
      const done = written(f).length;
      const status = (f.tags || []).includes('In the edit') ? 'In the edit' : formatLabel(f);
      return `
        <article class="k-post" data-reveal>
          <a class="k-post__media" href="${storyHref(f)}${DRAFT ? '&draft=1' : ''}" aria-label="${esc(f.title || featureName(f))}">
            ${media({ image: f.image, tone: f.tone, mark: f.code, alt: featureName(f), focus: f.focus })}
          </a>
          <div class="k-post__body">
            <p class="k-eyebrow">${pad(posts.length - n)} · ${esc(longDate(f.published))} · ${esc(status)}</p>
            <h2 class="k-h2"><a href="${storyHref(f)}${DRAFT ? '&draft=1' : ''}">${esc(f.title || featureName(f))}</a></h2>
            <p class="k-small">${esc(featureName(f))}${place(f) ? ` · ${esc(place(f))}` : ''}</p>
            <p class="k-body k-mt-s">${esc(f.excerpt || f.tagline || '')}</p>
            ${total ? `<ol class="k-post__chapters" aria-label="Chapters">${(f.chapters || []).map((c) => `<li class="${(c.body || '').trim() ? 'is-done' : ''}">${esc(c.heading)}</li>`).join('')}</ol>` : ''}
            <p class="k-byline">By ${esc(f.author || 'KIOSK')} · ${readMinutes(f)} min read${total ? ` · ${done} of ${total} chapters written` : ''}</p>
          </div>
        </article>`;
    }).join(''));
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

  function pageVault() {
    const params = new URLSearchParams(location.search);
    let cat = params.get('c') || 'all';
    let sort = params.get('sort') || 'featured';
    const cats = C.categories || [];
    const all = C.products || [];
    const chips = mount('vault-cats');
    const grid = mount('vault-grid');
    const count = (id) => all.filter((p) => id === 'all' || p.category === id).length;

    fill('shop-wall', wallHtml());

    // Category tiles use the first product of each category as the icon
    fill('shop-cats', cats.map((c) => {
      const p = all.find((x) => x.category === c.id);
      return `<button class="k-cat" type="button" data-cat="${esc(c.id)}" aria-pressed="${cat === c.id}">${p ? productVisual(p, 0) : ''}<b>${esc(c.label)}</b><small>${count(c.id)}</small></button>`;
    }).join(''));

    chips.innerHTML = [{ id: 'all', label: 'All' }].concat(cats)
      .map((c) => `<button class="k-chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${cat === c.id}">${esc(c.label)}<span class="k-count">${count(c.id)}</span></button>`).join('');

    const sortSel = mount('vault-sort');
    if (sortSel) sortSel.value = sort;

    const order = (list) => {
      const l = list.slice();
      if (sort === 'new') l.sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));
      if (sort === 'price-asc') l.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
      if (sort === 'price-desc') l.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      return l;
    };

    const render = () => {
      const list = order(all.filter((p) => cat === 'all' || p.category === cat));
      grid.innerHTML = list.map((p) => productCard(p)).join('');
      const n = mount('vault-count');
      if (n) n.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
      reveal(grid);
      const q = new URLSearchParams(location.search);
      if (cat === 'all') q.delete('c'); else q.set('c', cat);
      if (sort === 'featured') q.delete('sort'); else q.set('sort', sort);
      const qs = q.toString();
      history.replaceState(null, '', (qs ? `?${qs}` : location.pathname) + location.hash);
    };
    const setCat = (id) => {
      cat = id;
      $$('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === cat || (cat === 'all' && x.dataset.cat === 'all'))));
      render();
    };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      const next = b.classList.contains('k-cat') && cat === b.dataset.cat ? 'all' : b.dataset.cat;
      setCat(next);
      if (b.classList.contains('k-cat')) mount('vault-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (sortSel) sortSel.addEventListener('change', () => { sort = sortSel.value; render(); });
    render();
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    }
  }

  /* ------------------------------------------------------------- boot */

  renderChrome();
  bindGlobal();
  try {
    ({ home: pageHome, garage: pageGarage, story: pageStory, radio: pageRadio, vault: pageVault, journal: pageJournal }[PAGE] || (() => {}))();
  } catch (err) {
    // Never leave a blank page if content has a typo
    console.error('[KIOSK] render error', err);
  }
  reveal();
  window.KIOSK = { openFilm: (s) => openFilm(featureBySlug(s)), player, toast };
})();
