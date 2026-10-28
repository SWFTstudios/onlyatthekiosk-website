/* KIOSK Club home — Forge-style sticky scroll chapters
 * Requires: GSAP + ScrollTrigger (vendored), Lenis optional via window.__kioskLenis
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-club-scroll]');
  if (!root || !window.gsap || !window.ScrollTrigger) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduced';

  const chapters = Array.from(root.querySelectorAll('[data-club-chapter]'));
  const progress = root.querySelector('[data-club-progress] > i');
  const pip = root.querySelector('[data-club-pip]');
  const pipImg = pip && pip.querySelector('img');
  const pipLabel = pip && pip.querySelector('[data-club-pip-label]');

  if (window.Lenis) {
    // Prefer an existing Lenis from editorial/glass if present
    const lenis = window.__kioskLenis || window.lenis;
    if (lenis && lenis.on) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  function syncPip(index) {
    if (!pip || !chapters.length) return;
    const next = chapters[Math.min(index + 1, chapters.length - 1)];
    const media = next && next.querySelector('[data-club-media] img, [data-club-media] video');
    const label = next && (next.getAttribute('data-club-label') || next.querySelector('.k-club__eyebrow')?.textContent || 'Next');
    if (index >= chapters.length - 1) {
      pip.classList.remove('is-on');
      return;
    }
    if (media && pipImg) {
      const src = media.currentSrc || media.src || media.getAttribute('src') || media.getAttribute('poster');
      if (src) pipImg.src = src;
    }
    if (pipLabel) pipLabel.textContent = label;
    pip.href = `#${next.id || ''}`;
    pip.classList.add('is-on');
  }

  if (reduced) {
    syncPip(0);
    if (progress) progress.style.width = '100%';
    return;
  }

  chapters.forEach((chapter, i) => {
    const media = chapter.querySelector('[data-club-media] img, [data-club-media] video');
    const copy = chapter.querySelector('[data-club-copy]');
    if (media) {
      gsap.fromTo(
        media,
        { scale: 1.08, opacity: 0.85 },
        {
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: chapter,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        }
      );
    }
    if (copy) {
      gsap.fromTo(
        copy,
        { y: 36, opacity: 0.35 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: chapter,
            start: 'top 70%',
            end: 'top 20%',
            scrub: true,
          },
        }
      );
    }

    ScrollTrigger.create({
      trigger: chapter,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => syncPip(i),
      onEnterBack: () => syncPip(i),
    });
  });

  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      if (progress) progress.style.width = `${Math.round(self.progress * 1000) / 10}%`;
    },
  });

  syncPip(0);
})();
