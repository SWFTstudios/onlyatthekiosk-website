/**
 * Newsletter forms on the info pages (About, Contact, FAQ, policies):
 * <form class="newsletter-form"> with an email input. Sends them to
 * /api/subscribe as Dispatch signups instead of reloading the page, and
 * shows the answer under the form.
 */
(function () {
  'use strict';

  function message(form, text, isError) {
    let el = form.nextElementSibling;
    if (!el || !el.classList.contains('newsletter-msg')) {
      el = document.createElement('p');
      el.className = 'newsletter-msg';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'margin:10px 0 0;font-size:14px;line-height:1.4';
      form.after(el);
    }
    el.textContent = text;
    el.style.color = isError ? '#d4381b' : 'inherit';
  }

  async function submit(form) {
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('[type="submit"]');
    const email = ((input && input.value) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message(form, 'Please enter a valid email address.', true);
      if (input) input.focus();
      return;
    }
    const label = button && (button.value || button.textContent);
    if (button) { button.disabled = true; if ('value' in button && button.tagName === 'INPUT') button.value = button.dataset.wait || 'Please wait…'; }
    message(form, 'Joining…');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interest: 'dispatch', source: location.pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      form.reset();
      message(form, data.message || 'You’re on the Dispatch. Check your inbox.');
    } catch (err) {
      message(form, err.message || 'Something went wrong. Please try again.', true);
    } finally {
      if (button) { button.disabled = false; if (button.tagName === 'INPUT') button.value = label; }
    }
  }

  document.addEventListener('submit', (e) => {
    const form = e.target.closest && e.target.closest('form.newsletter-form');
    if (!form) return;
    e.preventDefault();
    submit(form);
  });
})();
