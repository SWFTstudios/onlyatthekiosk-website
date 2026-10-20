/**
 * KIOSK — Editorial motion
 * ------------------------------------------------------------
 * The magazine layer over KIOSK Glass, on every page:
 *   - smooth wheel scrolling (Lenis; touch stays native)
 *   - headlines that rise out of a mask, photographs that open like
 *     a curtain, cover images that drift (parallax)
 *   - standfirsts that fill with ink as you read
 *   - swipe rails that glide on after a drag, with a "Drag" cursor
 *   - the in-story index and reading progress
 *
 * Page-to-page curtains are CSS view transitions (css/kiosk-editorial.css)
 * run by the soft navigation in js/kiosk-glass.js, which fires
 * `kiosk:page` after every render so this file can pick up new content.
 *
 * Hooks in markup:
 *   data-ed="mask"     headline rises out of a mask
 *   data-ed="img"      photograph opens bottom-up, settling from a zoom
 *   data-ed="fill"     text fills with ink as it scrolls through
 *   data-parallax="k"  drifts at k × scroll speed (0.06 inline, 0.3 covers)
 *   data-ed-chapter    a section listed in the story index (data-ed-title)
 *   data-ed-article    the element reading progress is measured against
 *
 * Nothing is hidden until html.k-ed-on is set here, and reduced motion
 * (system setting or Settings › Motion) leaves every page static.
 */
(() => {
  'use strict';

  const d = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  const sysReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => d.dataset.motion === 'reduced' || (sysReduced.matches && d.dataset.motion !== 'full');

  // Overlays that lock the page; while one is open the wheel belongs to it
  const LOCKS = ['is-sheet-open', 'is-settings-open', 'is-pdp-open', 'is-account-open', 'is-cart-open', 'is-filter-open', 'is-onboard-open'];
  const locked = () => LOCKS.some((c) => d.classList.contains(c)) || document.body.style.overflow === 'hidden';

  /* ------------------------------------------------------- smooth scroll */

  let lenis = null;
  function smooth() {
    const want = !reduced() && typeof window.Lenis === 'function';
    if (want && !lenis) {
      lenis = new window.Lenis({
        autoRaf: true,
        lerp: 0.09,
        wheelMultiplier: 0.95,
        allowNestedScroll: true,
        // Maps, embeds and open panels keep their own wheel. Canvases don't: the
        // home page is mostly canvas (hero planet, Atlas globe), and scrolling
        // natively over them but smoothly everywhere else made the page jump
        // back and forth. The ones that zoom or turn on the wheel take it with
        // preventDefault, which virtualScroll below respects.
        prevent: (node) => locked() || !!(node.closest && node.closest('iframe, .maplibregl-map, [data-lenis-prevent]')),
        // A component that already handled the wheel (preventDefault) wins
        virtualScroll: (e) => !e.event.defaultPrevented,
      });
    } else if (!want && lenis) {
      lenis.destroy();
      lenis = null;
    }
  }
  // Lazy photographs above the target can grow on the way down: re-aim when the scroll lands
  const scrollToEl = (el, tries = 3) => {
    const top = el.getBoundingClientRect().top + window.scrollY - 24;
    if (!lenis) { window.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' }); return; }
    lenis.scrollTo(top, {
      duration: tries === 3 ? 1.4 : 0.6,
      onComplete: () => { if (tries > 1 && Math.abs(el.getBoundingClientRect().top - 24) > 4) scrollToEl(el, tries - 1); },
    });
  };

  /* ------------------------------------------------------------- reveals */

  // A masked headline or photograph is clipped to nothing until it shows, and
  // browsers count clip-path when measuring visibility, so each one is watched
  // through its (unclipped) parent instead of itself.
  let io = null;
  const waiting = new Map();   // parent → elements it reveals
  function observe(els) {
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduced()) { els.forEach((el) => el.classList.add('is-in')); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          (waiting.get(en.target) || []).forEach((el) => el.classList.add('is-in'));
          waiting.delete(en.target);
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    }
    els.forEach((el) => {
      const host = el.parentElement || el;
      if (!waiting.has(host)) { waiting.set(host, new Set()); io.observe(host); }
      waiting.get(host).add(el);
    });
  }

  // Site-wide: section headlines rise, photographs in cards settle
  function tag(root) {
    $$('.k-section-head .k-h2, .k-page-head .k-display', root).forEach((el) => { if (!el.dataset.ed) el.dataset.ed = 'mask'; });
    $$('main .k-media', root).forEach((el) => {
      if ('edSeen' in el.dataset || el.closest('[data-ed="img"], .k-ed-hero, .k-ed-slide, .k-hero, .k-cover, .k-gh')) return;
      el.dataset.edSeen = '';
    });
  }

  /* ------------------------------------------- scroll-linked: per frame */

  const live = { par: [], fill: [], article: null, bar: null, index: null, links: [], chapters: [] };
  let ticking = false;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const still = reduced();
    live.par.forEach((el) => {
      if (still) { el.style.translate = ''; return; }
      const box = (el.parentElement || el).getBoundingClientRect();
      if (box.bottom < -vh * 0.5 || box.top > vh * 1.5) return;
      const k = parseFloat(el.dataset.parallax) || 0.1;
      // Covers (k ≥ 0.2) drift from the top of the page; inline photos around the middle of the screen
      const c = k >= 0.2 ? box.top : box.top + box.height / 2 - vh / 2;
      el.style.translate = `0 ${(-c * k).toFixed(1)}px`;
    });
    live.fill.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = still ? 1 : clamp((vh * 0.92 - r.top) / (r.height + vh * 0.4), 0, 1);
      el.style.setProperty('--fill', `${(p * 118).toFixed(1)}%`);
    });
    if (live.article && live.bar) {
      const r = live.article.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      live.bar.style.transform = `scaleX(${p.toFixed(4)})`;
      live.bar.classList.toggle('is-on', r.top < 0 && r.bottom > vh * 0.5);
    }
    if (live.index) {
      let cur = -1;
      live.chapters.forEach((el, i) => { if (el.getBoundingClientRect().top < vh * 0.45) cur = i; });
      const last = live.chapters[live.chapters.length - 1];
      const past = !last || last.getBoundingClientRect().bottom < vh * 0.3;
      live.links.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      live.index.classList.toggle('is-on', cur >= 0 && !past);
    }
  }

  /* ------------------------------------------------ story index + progress */

  function buildIndex() {
    live.index = $('[data-ed-index]');
    live.article = $('[data-ed-article]');
    if (live.article && !live.bar) {
      live.bar = document.createElement('div');
      live.bar.className = 'k-ed-progress';
      live.bar.setAttribute('aria-hidden', 'true');
      document.body.append(live.bar);
    }
    if (!live.article && live.bar) { live.bar.remove(); live.bar = null; }
    live.chapters = [];
    live.links = [];
    if (!live.index) return;
    live.chapters = $$('[data-ed-chapter]').filter((el) => !el.classList.contains('k-hide') && !el.hidden && el.offsetParent !== null);
    live.index.innerHTML = `<ol>${live.chapters.map((el, i) => {
      if (!el.id) el.id = `ed-${i + 1}`;
      return `<li><a href="#${el.id}"><i aria-hidden="true">${pad(i + 1)}</i><span>${el.dataset.edTitle || ''}</span></a></li>`;
    }).join('')}</ol>`;
    live.links = $$('a', live.index);
  }

  // Same-page links (#look, the index, the skip link) glide to their target
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    const id = a && decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.replaceState(history.state, '', `#${id}`);
    scrollToEl(el);
    if (el.matches('main, [tabindex]')) el.focus({ preventScroll: true });
  });

  /* ----------------------------------------------------------- swipe rails */

  // Every rail glides on after a mouse drag; the story gallery also counts
  // frames and pans each photograph a little as it slides past.
  function rails(root) {
    $$('[data-hscroll]', root).forEach((el) => {
      if (el.dataset.edRail) return;
      el.dataset.edRail = '1';
      const wrap = el.closest('.k-hscroll-wrap');
      const story = !!(wrap && wrap.classList.contains('k-hscroll-wrap--ed'));
      const count = wrap && $('[data-ed-count]', wrap);
      const slides = story ? $$('.k-ed-slide', el) : [];

      let lastX = 0; let lastT = 0; let v = 0;
      el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { lastX = e.clientX; lastT = performance.now(); v = 0; } });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !el.classList.contains('is-dragging')) return;
        const t = performance.now();
        const dt = Math.max(1, t - lastT);
        v = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * v;
        lastX = e.clientX; lastT = t;
      });
      el.addEventListener('pointerup', (e) => {
        if (e.pointerType !== 'mouse' || !el.classList.contains('is-dragging') || reduced()) return;
        // Throw: carry the drag's speed on, then let the snap settle it
        if (performance.now() - lastT < 80 && Math.abs(v) > 0.2) el.scrollTo({ left: el.scrollLeft - v * 420, behavior: 'smooth' });
      });

      // "Drag" cursor that follows the pointer over the rail
      if (finePointer.matches && wrap && !reduced()) {
        const cur = document.createElement('span');
        cur.className = 'k-ed-cursor';
        cur.setAttribute('aria-hidden', 'true');
        cur.innerHTML = '<span>Drag</span>';
        wrap.append(cur);
        el.addEventListener('pointerenter', () => cur.classList.add('is-on'));
        el.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
        el.addEventListener('pointermove', (e) => {
          const r = wrap.getBoundingClientRect();
          cur.style.transform = `translate(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px)`;
          cur.classList.toggle('is-down', el.classList.contains('is-dragging'));
        });
      }

      if (!story) return;
      slides.forEach((s, i) => s.style.setProperty('--i', String(i % 6)));
      let raf = 0;
      const paint = () => {
        raf = 0;
        const box = el.getBoundingClientRect();
        let best = 0; let bd = Infinity;
        slides.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          const dist = Math.abs(r.left - box.left);
          if (dist < bd) { bd = dist; best = i; }
          if (r.right < box.left - 200 || r.left > box.right + 200) return;
          const img = $('img', s);
          const c = (r.left + r.width / 2 - (box.left + box.width / 2)) / box.width;
          if (img && !reduced()) img.style.translate = `${(-c * 7).toFixed(2)}% 0`;
        });
        if (el.scrollLeft > el.scrollWidth - el.clientWidth - 4) best = slides.length - 1;
        if (count) count.textContent = `${pad(best + 1)} / ${pad(slides.length)}`;
      };
      el.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
      paint();
    });
    $$('.k-hscroll-wrap--ed', root).forEach((w) => { if (!w.dataset.ed) w.dataset.ed = 'rail'; });
  }

  /* ------------------------------------------------- titles set edge to edge */

  // [data-fit]: one line of capitals scaled to fill its column exactly
  function fit() {
    $$('[data-fit]').forEach((el) => {
      el.style.fontSize = '';
      const r = document.createRange();
      r.selectNodeContents(el);
      const w = r.getBoundingClientRect().width;
      const avail = el.clientWidth;
      if (!w || !avail) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${Math.min(size * (avail / w) * 0.985, window.innerHeight * 0.42).toFixed(1)}px`;   // glyphs overhang their box a little
    });
  }
  window.addEventListener('resize', fit, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* ---------------------------------------------------------------- refresh */

  function refresh() {
    const on = !reduced();
    d.classList.toggle('k-ed-on', on);
    smooth();
    const main = $('main') || document.body;
    tag(main);
    rails(main);
    observe($$('[data-ed]:not(.is-in), [data-ed-seen]:not(.is-in)', main));
    live.par = $$('[data-parallax]', main);
    live.fill = $$('[data-ed="fill"]', main);
    buildIndex();
    fit();
    // The soft navigation swapped <main> and jumped to the top: start Lenis from there
    if (lenis) { lenis.resize(); lenis.scrollTo(window.scrollY, { immediate: true, force: true }); }
    frame();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('kiosk:page', refresh);
  // Settings › Motion flips html[data-motion]; the OS setting can change too
  new MutationObserver(refresh).observe(d, { attributes: true, attributeFilter: ['data-motion'] });
  if (sysReduced.addEventListener) sysReduced.addEventListener('change', refresh);
  // Late images change the page height under Lenis
  window.addEventListener('load', () => { if (lenis) lenis.resize(); onScroll(); });

  refresh();
  window.KioskEditorial = { refresh, get lenis() { return lenis; }, scrollTo: scrollToEl };
})();
