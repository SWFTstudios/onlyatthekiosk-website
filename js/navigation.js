/**
 * Fullscreen Navigation Overlay
 * Handles navigation toggle, animations, and theme toggle
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const navToggle = document.querySelector('.nav-toggle-wrapper');
    const navbarFullscreen = document.querySelector('.navbar-fullscreen-component');
    const navbarMenu = document.querySelector('.navbar-menu');
    const body = document.body;
    const html = document.documentElement;

    if (!navToggle || !navbarFullscreen || !navbarMenu) {
      console.warn('Navigation elements not found');
      return;
    }

    // Navigation Toggle
    navToggle.addEventListener('click', function() {
      const isOpen = navbarFullscreen.classList.contains('w--open');
      
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Close button inside the fullscreen nav
    const navCloseButton = navbarFullscreen.querySelector('.navbar-open .nav-toggle-wrapper');
    if (navCloseButton) {
      navCloseButton.addEventListener('click', closeNav);
    }

    // Close on link click
    const navLinks = navbarFullscreen.querySelectorAll('.nav-link-item');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        setTimeout(closeNav, 300);
      });
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navbarFullscreen.classList.contains('w--open')) {
        closeNav();
      }
    });

    // Close on outside click (click on overlay background)
    navbarFullscreen.addEventListener('click', function(e) {
      if (e.target === navbarFullscreen) {
        closeNav();
      }
    });

    function openNav() {
      // Show the fullscreen component
      navbarFullscreen.style.display = 'flex';
      
      // Trigger reflow to ensure display change is applied
      navbarFullscreen.offsetHeight;
      
      // Add open class
      navbarFullscreen.classList.add('w--open');
      navToggle.classList.add('w--open');
      navbarMenu.style.display = 'flex';
      
      // Lock body scroll
      body.classList.add('nav-open');
      
      // Prevent scrolling on touch devices
      document.addEventListener('touchmove', preventScroll, { passive: false });
    }

    function closeNav() {
      // Remove open class
      navbarFullscreen.classList.remove('w--open');
      navToggle.classList.remove('w--open');
      
      // Hide menu after animation
      setTimeout(function() {
        if (!navbarFullscreen.classList.contains('w--open')) {
          navbarMenu.style.display = 'none';
          navbarFullscreen.style.display = 'none';
        }
      }, 600); // Match animation duration
      
      // Unlock body scroll
      body.classList.remove('nav-open');
      
      // Re-enable scrolling
      document.removeEventListener('touchmove', preventScroll);
    }

    function preventScroll(e) {
      if (!navbarFullscreen.classList.contains('w--open')) {
        return;
      }
      
      // Allow scrolling within the navigation menu
      if (e.target.closest('.navbar-menu')) {
        return;
      }
      
      e.preventDefault();
    }

    // Theme Toggle - Initialize theme first before setting up toggle
    // Initialize theme on page load (this runs for all pages)
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      savedTheme = 'light'; // Default to light theme
      localStorage.setItem('theme', savedTheme);
    }
    html.setAttribute('data-theme', savedTheme);

    // Theme Toggle Button - Support both click and touch events for mobile
    const themeToggle = document.querySelector('.navbar-theme-toggle');
    if (themeToggle) {
      function toggleTheme(e) {
        // Prevent default and stop propagation to avoid conflicts
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update toggle button state
        if (newTheme === 'dark') {
          themeToggle.classList.add('is-dark');
        } else {
          themeToggle.classList.remove('is-dark');
        }
        
        // Dispatch a custom event so other components can listen for theme changes
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
      }
      
      // Add click event (desktop)
      themeToggle.addEventListener('click', toggleTheme);
      
      // Add touch events (mobile)
      themeToggle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme(e);
      }, { passive: false });
      
      // Also handle touchend to ensure it works on all mobile devices
      let touchStartTime = 0;
      themeToggle.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const touchEndTime = Date.now();
        // Only trigger if it was a quick tap (not a swipe)
        if (touchEndTime - touchStartTime < 300) {
          toggleTheme(e);
        }
      }, { passive: false });
      
      themeToggle.addEventListener('touchstart', function() {
        touchStartTime = Date.now();
      }, { passive: true });
      
      // Initialize toggle button state based on current theme
      const currentTheme = html.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        themeToggle.classList.add('is-dark');
      } else {
        themeToggle.classList.remove('is-dark');
      }
    }

    // Initialize Promotional Slider
    // Wait for Swiper to be available (it might load after this script)
    function initPromoSlider() {
      if (typeof Swiper !== 'undefined') {
        const promoSlider = document.querySelector('.promo-slider');
        if (promoSlider && !promoSlider.swiper) {
          new Swiper('.promo-slider', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            autoplay: {
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            },
            pagination: {
              el: '.promo-slider-pagination',
              clickable: true,
              type: 'bullets'
            },
            navigation: {
              nextEl: '.promo-slider-button-next',
              prevEl: '.promo-slider-button-prev',
              disabledClass: 'swiper-button-disabled'
            },
            effect: 'fade',
            fadeEffect: {
              crossFade: true
            },
            speed: 800,
            // Touch gestures
            grabCursor: true,
            touchRatio: 1,
            touchAngle: 45,
            simulateTouch: true,
            allowTouchMove: true
          });
        }
      } else {
        // If Swiper isn't loaded yet, try again after a short delay
        setTimeout(initPromoSlider, 100);
      }
    }

    // Initialize slider when DOM is ready and Swiper is available
    initPromoSlider();
  }
})();

