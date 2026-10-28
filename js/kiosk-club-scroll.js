/* KIOSK Club home — progress bar + bento magazine reveal
 * Requires: GSAP + ScrollTrigger (vendored), Lenis optional via window.__kioskLenis
 *
 * The globe hero (js/kiosk-globe-hero.js) owns its own pin / dive scroll.
 * This file only drives the site progress bar and staggers the bento tiles
 * in from black once the dive hands off.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-club-scroll]');
  const progress = document.querySelector('[data-club-progress] > i');
  const bento = document.querySelector('.k-bento');
  const tiles = bento ? Array.from(bento.querySelectorAll('[data-bento-tile]')) : [];

  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduced';

  if (reduced) {
    tiles.forEach((t) => t.classList.add('is-in'));
    if (progress) progress.style.width = '100%';
    return;
  }

  if (!window.gsap || !window.ScrollTrigger) {
    // No GSAP: show tiles immediately so the magazine is still usable
    tiles.forEach((t) => t.classList.add('is-in'));
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    const lenis = window.__kioskLenis || window.lenis;
    if (lenis && lenis.on) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // Progress across the whole home story (globe hero + bento)
  const track = document.getElementById('main') || root;
  if (track && progress) {
    ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.style.width = `${Math.round(self.progress * 1000) / 10}%`;
      },
    });
  }

  if (tiles.length) {
    // Start slightly opaque so the first row is already easing in as the
    // dive mask finishes filling the screen.
    gsap.set(tiles, { opacity: 0, y: 24 });
    ScrollTrigger.batch(tiles, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'power2.out',
          stagger: 0.08,
          overwrite: true,
          onStart() {
            batch.forEach((el) => el.classList.add('is-in'));
          },
        });
      },
    });
  }
})();
