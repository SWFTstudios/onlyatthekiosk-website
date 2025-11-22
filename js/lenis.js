/**
 * Lenis Smooth Scroll Integration
 * Initialize Lenis for smooth scrolling across all pages
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLenis);
  } else {
    initLenis();
  }

  function initLenis() {
    // Check if Lenis is available
    if (typeof Lenis === 'undefined') {
      console.warn('Lenis library not loaded. Please include Lenis script.');
      return;
    }

    // Check if we're on the carousel page (which has special GSAP integration)
    const isCarouselPage = document.querySelector('[carousel="component"]');
    const hasGSAP = typeof gsap !== 'undefined';

    // Initialize Lenis with options
    const lenis = new Lenis({
      duration: 1.2, // Smooth scroll duration
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
      smooth: true, // Enable smooth scrolling
      smoothTouch: false, // Disable smooth touch on mobile (can cause issues)
      touchMultiplier: 2, // Touch scroll sensitivity
      autoRaf: true, // Auto requestAnimationFrame
      // Prevent smooth scroll on drawer and carousel images
      prevent: (node) => {
        return node.closest && (
          node.closest('.products_collection-drawer') ||
          node.closest('.products_drawer-wrapper') ||
          node.closest('.carousel_list') ||
          node.closest('.carousel_item') ||
          node.hasAttribute('data-lenis-prevent')
        );
      },
      // Enable anchors for smooth anchor link scrolling
      anchors: true
    });

    // Integrate with GSAP if available (especially for carousel page)
    if (hasGSAP) {
      // Sync Lenis with GSAP ticker
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000); // Convert time from seconds to milliseconds
      });

      // Disable lag smoothing in GSAP for better scroll performance
      gsap.ticker.lagSmoothing(0);

      // If ScrollTrigger is available, sync it
      if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
      }
    } else {
      // Basic RAF loop if GSAP is not available
      // Note: autoRaf is already true, but we can also manually call if needed
    }

    // Handle drawer open/close to pause/resume Lenis
    if (typeof jQuery !== 'undefined') {
      $(document).on('drawerOpen', function() {
        lenis.stop();
      });

      $(document).on('drawerClose', function() {
        lenis.start();
      });
    } else {
      // Use native events if jQuery is not available
      document.addEventListener('drawerOpen', function() {
        lenis.stop();
      });

      document.addEventListener('drawerClose', function() {
        lenis.start();
      });
    }

    // Handle navigation menu open/close
    const navbarFullscreen = document.querySelector('.navbar-fullscreen-component');
    if (navbarFullscreen) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (navbarFullscreen.classList.contains('w--open')) {
              lenis.stop();
            } else {
              lenis.start();
            }
          }
        });
      });

      observer.observe(navbarFullscreen, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Make lenis instance globally available for debugging
    window.lenis = lenis;

    // Log scroll events (optional, can be removed in production)
    // lenis.on('scroll', (e) => {
    //   console.log('Scroll:', e);
    // });
  }
})();

