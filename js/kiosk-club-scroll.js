/* KIOSK Club home — progress bar across the globe → stream journey
 * Requires: GSAP + ScrollTrigger (vendored), Lenis optional via window.__kioskLenis
 *
 * The globe hero (js/kiosk-globe-hero.js) owns pin / dive / Z-fly.
 * Featured slideshow + rails are mounted from js/kiosk-glass.js.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-club-scroll]');
  const progress = document.querySelector('[data-club-progress] > i');
  const stream = document.querySelector('.k-stream');

  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduced';

  if (reduced) {
    if (progress) progress.style.width = '100%';
    return;
  }

  if (!window.gsap || !window.ScrollTrigger) return;

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

  // Soft fade-in for the featured show as it enters after the dive
  const feature = stream && stream.querySelector('[data-club-feature]');
  if (feature) {
    gsap.fromTo(
      feature.querySelector('.k-feature__copy'),
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        duration: 0.9,
        scrollTrigger: {
          trigger: feature,
          start: 'top 80%',
          once: true,
        },
      }
    );
  }
})();
