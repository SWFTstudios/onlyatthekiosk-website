/**
 * KIOSK Fixed Underlay Navigation
 * GSAP-powered page slide reveals menu underneath
 */

(function () {
  'use strict';

  function initThemeToggle() {
    const html = document.documentElement;
    const themeToggle = document.querySelector('.underlay-nav__theme-toggle');

    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      savedTheme = 'light';
      localStorage.setItem('theme', savedTheme);
    }
    html.setAttribute('data-theme', savedTheme);

    if (!themeToggle) return;

    if (savedTheme === 'dark') {
      themeToggle.classList.add('is-dark');
    }

    function toggleTheme(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeToggle.classList.toggle('is-dark', newTheme === 'dark');
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
    }

    let touchStarted = false;
    themeToggle.addEventListener('click', (e) => {
      if (!touchStarted) toggleTheme(e);
      touchStarted = false;
    });
    themeToggle.addEventListener('touchstart', () => { touchStarted = true; }, { passive: true });
    themeToggle.addEventListener('touchend', (e) => {
      if (touchStarted) toggleTheme(e);
    }, { passive: false });
  }

  function initFixedUnderlayNavigation() {
    if (typeof gsap === 'undefined' || typeof CustomEase === 'undefined') {
      console.warn('GSAP or CustomEase not loaded — underlay nav disabled');
      return;
    }

    CustomEase.create('energy', 'M0,0 C0.32,0.72 0,1 1,1');

    const toggleBtn = document.querySelector('[data-underlay-nav-toggle]');
    const toggleLabels = document.querySelectorAll('.underlay-nav__toggle-label');
    const toggleBars = document.querySelectorAll('.underlay-nav__toggle-bar');
    const menuEl = document.querySelector('[data-underlay-nav-menu]');
    const largeItems = document.querySelectorAll('[data-reveal-l]');
    const smallItems = document.querySelectorAll('[data-reveal-s]');
    const menuBorder = document.querySelector('.underlay-nav__bottom-border');
    const mainEl = document.querySelector('[data-main]');
    const overlayEl = document.querySelector('[data-underlay-nav-overlay]');
    const darkEl = document.querySelector('.underlay-nav__dark');
    const corners = document.querySelectorAll('.underlay-nav__corner');
    const overlayBorders = document.querySelectorAll('.underlay-nav__border-row');

    if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

    const closedColor = getComputedStyle(toggleBtn).color;
    const openColor = getComputedStyle(menuEl).color;

    let isOpen = false;
    let tl;
    let enterEndTime = 0;
    let lenisInstance = null;

    const getMenuOffset = () => -menuEl.offsetWidth;

    gsap.set(overlayEl, { visibility: 'hidden', pointerEvents: 'none' });
    gsap.set(darkEl, { autoAlpha: 0 });
    gsap.set(mainEl, { x: 0 });
    gsap.set(toggleLabels, { yPercent: 0 });
    gsap.set(toggleBars, { y: 0, rotation: 0 });
    if (menuBorder) gsap.set(menuBorder, { scaleX: 0 });
    if (overlayBorders[0]) gsap.set(overlayBorders[0], { yPercent: -100 });
    if (overlayBorders[1]) gsap.set(overlayBorders[1], { yPercent: 100 });
    gsap.set(corners, { scale: 0 });

    function pauseLenis() {
      if (window.lenis && typeof window.lenis.stop === 'function') {
        lenisInstance = window.lenis;
        window.lenis.stop();
      }
    }

    function resumeLenis() {
      if (lenisInstance && typeof lenisInstance.start === 'function') {
        lenisInstance.start();
      }
    }

    function buildTimeline() {
      tl = gsap.timeline({
        paused: true,
        defaults: {
          ease: 'energy',
          easeReverse: 'power2.inOut'
        }
      });

      tl.set(overlayEl, { visibility: 'visible', pointerEvents: 'auto' }, 0);

      tl.to([mainEl, overlayEl], { x: getMenuOffset, duration: 0.7 }, 0);

      tl.to(darkEl, { autoAlpha: 1, duration: 0.5 }, 0);

      tl.to(corners, { scale: 1, duration: 0.5 }, 0);

      tl.to(overlayBorders, { yPercent: 0, duration: 0.5 }, 0);

      tl.to(toggleLabels, { yPercent: -100, duration: 0.4 }, 0);

      tl.to(toggleBtn, { color: openColor, duration: 0.4 }, 0);

      tl.to(toggleBars[0], {
        y: '0.25em',
        rotation: 45,
        duration: 0.35,
        ease: 'back.out(1.4)',
        easeReverse: 'power3.out'
      }, 0.05);

      tl.to(toggleBars[1], {
        y: '-0.25em',
        rotation: -45,
        duration: 0.35,
        ease: 'back.out(1.4)',
        easeReverse: 'power3.out'
      }, 0.05);

      if (largeItems.length) {
        tl.fromTo(largeItems,
          { autoAlpha: 0, xPercent: 25 },
          { autoAlpha: 1, xPercent: 0, duration: 0.7, stagger: 0.05 },
          0
        );
      }

      if (smallItems.length) {
        tl.fromTo(smallItems,
          { autoAlpha: 0, yPercent: 100 },
          { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out' },
          0.3
        );
      }

      if (menuBorder) {
        tl.to(menuBorder, { scaleX: 1, duration: 0.5 }, '<');
      }

      enterEndTime = tl.duration();
      tl.addPause();

      const fadeTargets = [...largeItems, ...smallItems];
      if (fadeTargets.length) {
        tl.to(fadeTargets, { autoAlpha: 0, duration: 0.3 }, '<');
      }

      tl.to([mainEl, overlayEl], { x: 0, duration: 0.6 }, '<');

      tl.to(darkEl, { autoAlpha: 0, duration: 0.35, ease: 'power2.inOut' }, '<');

      tl.to(corners, { scale: 0, duration: 0.5 }, '<');

      if (overlayBorders[0]) {
        tl.to(overlayBorders[0], { yPercent: -100, duration: 0.5 }, '<');
      }
      if (overlayBorders[1]) {
        tl.to(overlayBorders[1], { yPercent: 100, duration: 0.5 }, '<');
      }

      tl.to(toggleBtn, { color: closedColor, duration: 0.25 }, '<+=0.1');

      tl.to(toggleLabels, { yPercent: 0, duration: 0.25, ease: 'power3.in' }, '<');

      tl.to(toggleBars, { y: 0, rotation: 0, duration: 0.25, ease: 'power3.in' }, '<');

      tl.set(overlayEl, { visibility: 'hidden', pointerEvents: 'none' });
    }

    function setMenuStatus(open) {
      document.body.setAttribute('data-menu-status', open ? 'open' : '');
    }

    function toggle() {
      isOpen = !isOpen;
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.setAttribute('aria-label', isOpen ? 'close menu' : 'open menu');
      setMenuStatus(isOpen);

      if (isOpen) {
        pauseLenis();
        tl.invalidate();
        if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
        else tl.timeScale(1).play();
      } else {
        resumeLenis();
        if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
        else tl.timeScale(1).play();
      }
    }

    buildTimeline();
    toggleBtn.addEventListener('click', toggle);

    overlayEl.addEventListener('click', () => {
      if (isOpen) toggle();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggle();
        toggleBtn.focus();
      }
    });

    menuEl.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (isOpen) setTimeout(toggle, 200);
      });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isOpen) {
          gsap.set([mainEl, overlayEl], { x: getMenuOffset() });
        } else {
          tl.invalidate();
        }
      }, 150);
    });
  }

  function init() {
    initThemeToggle();
    initFixedUnderlayNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
