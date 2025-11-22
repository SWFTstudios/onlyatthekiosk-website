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
      // Check if we're in local development (Cloudflare Pages Functions don't work locally)
      const isLocalDev = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port !== '';
      
      // Call Cloudflare Pages Function
      // The function is automatically deployed at /api/subscribe when using Cloudflare Pages
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      // Check if response is OK and has content
      if (!response.ok) {
        // Handle 405 (Method Not Allowed) - likely local development
        if (response.status === 405 || response.status === 404) {
          if (isLocalDev) {
            showMessage('⚠️ This feature only works when deployed to Cloudflare Pages. In local development, use: wrangler pages dev', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
          }
        }
        
        // Try to parse error response, but handle empty responses
        let errorMessage = 'Something went wrong. Please try again.';
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            errorMessage = data.error || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse, use default message
          console.error('Error parsing response:', parseError);
        }
        
        showMessage(errorMessage, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
        return;
      }

      // Parse successful response
      let data;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response');
        }
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        // If parsing fails but status is OK, still show success
        if (response.ok) {
          showMessage('Thank you! You\'ll be the first to know when we launch.', 'success');
          form.reset();
          setTimeout(() => {
            closeModal();
          }, 2000);
          return;
        }
        throw parseError;
      }

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
      
      // Provide more specific error messages
      if (error.message && error.message.includes('fetch')) {
        showMessage('Network error. Please check your connection and try again.', 'error');
      } else if (error.message && error.message.includes('JSON')) {
        showMessage('Server response error. This may work when deployed to Cloudflare Pages.', 'error');
      } else {
        showMessage('Network error. Please check your connection and try again.', 'error');
      }
      
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

