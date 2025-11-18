// Email Signup Modal Functionality
(function() {
  'use strict';

  // Get DOM elements
  const notifyBtn = document.getElementById('notify-me-btn');
  const modal = document.getElementById('email-modal');
  const closeBtn = document.getElementById('close-modal');
  const overlay = modal.querySelector('.email-modal-overlay');
  const form = document.getElementById('email-signup-form');
  const emailInput = document.getElementById('email-input');
  const submitBtn = form.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById('form-message');

  // Open modal function
  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    emailInput.focus();
  }

  // Close modal function
  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    form.reset();
    messageDiv.className = 'form-message';
    messageDiv.textContent = '';
    messageDiv.style.display = 'none';
  }

  // Show message function
  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing Up...';

    try {
      // Call Cloudflare Worker
      // Update this URL to your Worker's URL after deployment
      // Format: https://kiosk-form-submission-handler.YOUR_SUBDOMAIN.workers.dev
      const workerUrl = 'https://kiosk-form-submission-handler.YOUR_SUBDOMAIN.workers.dev';
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, formType: 'email-signup' }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Thank you! You\'ll be the first to know when we launch.', 'success');
        form.reset();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        showMessage(data.error || 'Something went wrong. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  }

  // Event listeners
  if (notifyBtn) {
    notifyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', closeModal);
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });
})();

