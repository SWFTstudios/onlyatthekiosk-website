/**
 * KIOSK — Check-in (onboarding)
 *
 * A short, skippable set of questions that tells the KIOSK what a reader is
 * into: interests, formats, home city and dream destinations, style and
 * sizes, and what they want to hear about. It ends on a boarding pass.
 *
 * Answers save as you go on this device ('kiosk:taste'); signed-in members
 * also get them saved to their account through js/kiosk-account.js
 * (/api/profile, validated by functions/_lib/taste.js — keep TASTE in sync).
 * Pages read them back to personalise: "Picked for you" in the Atlas, the
 * home intro landing on your home city, your size pre-picked in the shop.
 *
 *   KioskOnboard.open({ step })   KioskOnboard.read()   KioskOnboard.write(taste)
 * Fires `kiosk:taste` on document with { detail: taste } after every save.
 */
(function () {
  'use strict';

  const KEY = 'kiosk:taste';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const K = () => window.KIOSK || {};
  const A = () => window.KIOSK_ACCOUNT || null;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TASTE = {
    interests: [
      ['cars', 'Cars', 'Builds, meets, night drives'], ['motorcycles', 'Motorcycles', 'Two wheels, open roads'],
      ['sports', 'Sports', 'Race days and pickup games'], ['travel', 'Travel', 'The long way round'],
      ['fashion', 'Fashion', 'Streetwear, sourcing, fits'], ['skate', 'Skate', 'Parks, spots, boards'],
      ['music', 'Music', 'Mixes, records, sounds'], ['culture', 'Culture', 'People and how they live'],
      ['food', 'Food', 'Where the locals eat'], ['photo', 'Photo & film', 'Cameras, edits, frames'],
    ],
    formats: [['films', 'Films'], ['vlogs', 'Vlogs'], ['interviews', 'Interviews'], ['photo', 'Photo diaries'], ['reads', 'Long reads'], ['audio', 'Audio notes'], ['playlists', 'Playlists']],
    pace: [['quick', 'Quick hits'], ['both', 'A bit of both'], ['deep', 'Deep dives']],
    travel: [['road', 'Road trips'], ['backpack', 'Backpacking'], ['city', 'City breaks'], ['work', 'Work trips'], ['homebody', 'Mostly home']],
    dream: [['tokyo', 'Tokyo'], ['lisbon', 'Lisbon'], ['lagos', 'Lagos'], ['reykjavik', 'Reykjavík'], ['mexico-city', 'Mexico City'], ['seoul', 'Seoul'], ['marrakech', 'Marrakech'],
      ['new-york', 'New York'], ['los-angeles', 'Los Angeles'], ['london', 'London'], ['paris', 'Paris'], ['cape-town', 'Cape Town'], ['bali', 'Bali'], ['rio', 'Rio']],
    style: [['streetwear', 'Streetwear'], ['skate', 'Skate'], ['vintage', 'Vintage'], ['minimal', 'Minimal'], ['workwear', 'Workwear'], ['outdoor', 'Outdoor'], ['motorsport', 'Motorsport'], ['tailored', 'Tailored']],
    top: [['xs', 'XS'], ['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL'], ['xxl', 'XXL']],
    bottom: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'].map((v) => [v, v]),
    fit: [['relaxed', 'Relaxed'], ['true', 'True to size'], ['fitted', 'Fitted']],
    colors: [['black', 'Black', '#111'], ['bone', 'Bone', '#e9e2d3'], ['grey', 'Grey', '#8b8d90'], ['navy', 'Navy', '#1d2a44'], ['olive', 'Olive', '#55603a'], ['brown', 'Brown', '#6b4a33'], ['red', 'Red', '#b3261e'], ['pop', 'Colour pop', 'conic-gradient(#ff5a1f, #ffd23f, #3ec1d3, #a15cff, #ff5a1f)']],
    updates: [['drops', 'New drops', 'Clothing and gear when it lands'], ['stories', 'New stories', 'Films, interviews and diaries'], ['finds', 'Rare finds', 'Lost & Found pieces near you'], ['radio', 'Radio', 'New mixes and audio notes'], ['events', 'Meets & events', 'Pop-ups, meets and rides']],
  };
  // Cities we can place on the globe (home city suggestions)
  const CITIES = [
    ['New York', 40.71, -74.0], ['Brooklyn', 40.68, -73.94], ['Los Angeles', 34.05, -118.24], ['Chicago', 41.88, -87.63], ['Houston', 29.76, -95.37], ['Atlanta', 33.75, -84.39],
    ['Miami', 25.76, -80.19], ['Washington', 38.9, -77.04], ['Philadelphia', 39.95, -75.17], ['Boston', 42.36, -71.06], ['Detroit', 42.33, -83.05], ['Dallas', 32.78, -96.8],
    ['Denver', 39.74, -104.99], ['Phoenix', 33.45, -112.07], ['Seattle', 47.61, -122.33], ['San Francisco', 37.77, -122.42], ['Toronto', 43.65, -79.38], ['Montréal', 45.5, -73.57],
    ['Vancouver', 49.28, -123.12], ['Mexico City', 19.43, -99.13], ['Bogotá', 4.71, -74.07], ['São Paulo', -23.55, -46.63], ['Rio de Janeiro', -22.91, -43.17], ['Buenos Aires', -34.6, -58.38],
    ['London', 51.51, -0.13], ['Paris', 48.86, 2.35], ['Berlin', 52.52, 13.4], ['Amsterdam', 52.37, 4.9], ['Lisbon', 38.72, -9.14], ['Madrid', 40.42, -3.7], ['Barcelona', 41.39, 2.17],
    ['Milan', 45.46, 9.19], ['Rome', 41.9, 12.5], ['Stockholm', 59.33, 18.07], ['Copenhagen', 55.68, 12.57], ['Reykjavík', 64.15, -21.94], ['Istanbul', 41.01, 28.98],
    ['Lagos', 6.52, 3.38], ['Accra', 5.6, -0.19], ['Nairobi', -1.29, 36.82], ['Johannesburg', -26.2, 28.05], ['Cape Town', -33.92, 18.42], ['Cairo', 30.04, 31.24], ['Marrakech', 31.63, -7.98],
    ['Dubai', 25.2, 55.27], ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Bangkok', 13.76, 100.5], ['Singapore', 1.35, 103.82], ['Hong Kong', 22.32, 114.17], ['Shanghai', 31.23, 121.47],
    ['Seoul', 37.57, 126.98], ['Tokyo', 35.68, 139.69], ['Osaka', 34.69, 135.5], ['Sydney', -33.87, 151.21], ['Melbourne', -37.81, 144.96], ['Auckland', -36.85, 174.76], ['Honolulu', 21.31, -157.86],
  ];
  const cityLookup = (name) => {
    const n = String(name || '').trim().toLowerCase();
    const hit = CITIES.find((c) => c[0].toLowerCase() === n);
    return hit ? { city: hit[0], lat: hit[1], lon: hit[2] } : null;
  };

  const blank = () => ({ v: 1, name: '', interests: [], formats: [], pace: '', home: null, travel: [], dream: [], style: [], sizes: { top: '', bottom: '', shoe: '' }, fit: '', colors: [], updates: [], completedAt: '' });
  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? Object.assign(blank(), v, { sizes: Object.assign(blank().sizes, v.sizes || {}) }) : null; } catch (e) { return null; }
  }
  function write(t) {
    try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('kiosk:taste', { detail: t }));
  }
  const labelOf = (group, id) => { const o = (TASTE[group] || []).find((x) => x[0] === id); return o ? o[1] : id; };

  /* ------------------------------------------------------------ steps */
  const STEPS = ['hello', 'interests', 'formats', 'world', 'fit', 'updates', 'pass'];
  const chip = (group, id, label, on, extra = '') => `<button type="button" class="k-ob__chip" data-ob="${group}" data-v="${esc(id)}" aria-pressed="${on}"${extra}>${label}</button>`;
  const one = (group, id, label, on) => `<button type="button" class="k-ob__seg" role="radio" data-ob1="${group}" data-v="${esc(id)}" aria-checked="${on}">${esc(label)}</button>`;

  function stepHtml(id, t, ctx) {
    const has = (g, v) => (t[g] || []).includes(v);
    switch (id) {
      case 'hello': return {
        title: 'Welcome aboard.',
        sub: 'A few quick questions so the KIOSK feels like yours: what you’re into, where you’re from, how you dress. About a minute. Skip anything.',
        body: `<label class="k-ob__field"><span>What should we call you?</span><input type="text" data-ob-name maxlength="40" autocomplete="given-name" placeholder="First name or nickname" value="${esc(t.name)}"></label>
          ${ctx.signedIn ? '' : '<p class="k-ob__fine">Your answers stay on this device unless you make an account.</p>'}`,
      };
      case 'interests': return {
        title: 'What gets you out the door?',
        sub: 'Pick as many as you like. We’ll lead with these.',
        body: `<div class="k-ob__tiles">${TASTE.interests.map(([v, l, d]) => `<button type="button" class="k-ob__tile" data-ob="interests" data-v="${v}" aria-pressed="${has('interests', v)}"><b>${l}</b><small>${d}</small><i aria-hidden="true"></i></button>`).join('')}</div>`,
      };
      case 'formats': return {
        title: 'How do you like your stories?',
        sub: 'Films on the couch, photo diaries on the train, long reads on a long flight.',
        body: `<div class="k-ob__chips">${TASTE.formats.map(([v, l]) => chip('formats', v, l, has('formats', v))).join('')}</div>
          <p class="k-ob__label">Pace</p><div class="k-ob__segs" role="radiogroup" aria-label="Pace">${TASTE.pace.map(([v, l]) => one('pace', v, l, t.pace === v)).join('')}</div>`,
      };
      case 'world': return {
        title: 'Where in the world?',
        sub: 'Where you call home, how you move, and where you’d go tomorrow.',
        body: `<label class="k-ob__field"><span>Home city</span><input type="text" data-ob-home list="k-ob-cities" maxlength="60" autocomplete="address-level2" placeholder="Start typing your city" value="${esc((t.home && t.home.city) || ctx.guessCity || '')}"></label>
          <datalist id="k-ob-cities">${CITIES.map((c) => `<option value="${esc(c[0])}"></option>`).join('')}</datalist>
          <p class="k-ob__label">How you travel</p><div class="k-ob__chips">${TASTE.travel.map(([v, l]) => chip('travel', v, l, has('travel', v))).join('')}</div>
          <p class="k-ob__label">Dream destinations <small>up to six</small></p><div class="k-ob__chips">${TASTE.dream.map(([v, l]) => chip('dream', v, l, has('dream', v))).join('')}</div>`,
      };
      case 'fit': return {
        title: 'Your fit.',
        sub: 'For the Supply: we’ll pre-pick your size and lean on your colours.',
        body: `<p class="k-ob__label">Style</p><div class="k-ob__chips">${TASTE.style.map(([v, l]) => chip('style', v, l, has('style', v))).join('')}</div>
          <p class="k-ob__label">Tops</p><div class="k-ob__segs k-ob__segs--sizes" role="radiogroup" aria-label="Top size">${TASTE.top.map(([v, l]) => one('top', v, l, t.sizes.top === v)).join('')}</div>
          <p class="k-ob__label">Bottoms <small>waist</small></p><div class="k-ob__segs k-ob__segs--sizes" role="radiogroup" aria-label="Waist size">${TASTE.bottom.map(([v, l]) => one('bottom', v, l, t.sizes.bottom === v)).join('')}</div>
          <p class="k-ob__label">Fit</p><div class="k-ob__segs" role="radiogroup" aria-label="Fit">${TASTE.fit.map(([v, l]) => one('fit', v, l, t.fit === v)).join('')}</div>
          <p class="k-ob__label">Colours you wear</p><div class="k-ob__swatches">${TASTE.colors.map(([v, l, c]) => `<button type="button" class="k-ob__sw" data-ob="colors" data-v="${v}" aria-pressed="${has('colors', v)}" style="--sw:${c}"><i aria-hidden="true"></i><span>${l}</span></button>`).join('')}</div>`,
      };
      case 'updates': return {
        title: 'What should we tell you about?',
        sub: 'We’ll only nudge you about these. Change it any time.',
        body: `<div class="k-ob__toggles">${TASTE.updates.map(([v, l, d]) => `<button type="button" class="k-ob__toggle" data-ob="updates" data-v="${v}" aria-pressed="${has('updates', v)}"><span><b>${l}</b><small>${d}</small></span><i aria-hidden="true"></i></button>`).join('')}</div>`,
      };
      default: {
        const from = (t.home && t.home.city) || 'Anywhere';
        const to = t.dream.length ? labelOf('dream', t.dream[0]) : 'Everywhere';
        const cls = t.interests.length ? labelOf('interests', t.interests[0]) : 'Open seat';
        const code = (s) => String(s).normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'KSK';
        const tags = [...t.interests.map((v) => labelOf('interests', v)), ...t.formats.map((v) => labelOf('formats', v)), ...t.style.map((v) => labelOf('style', v))];
        return {
          title: 'You’re checked in.',
          sub: ctx.signedIn ? 'Saved to your account. Change any of it from your account page.' : ctx.enabled ? 'Saved on this device. Make an account to keep it everywhere you sign in.' : 'Saved on this device. Change any of it from your account page.',
          body: `<div class="k-ob__pass" aria-label="Your boarding pass">
              <div class="k-ob__pass-top"><span>KIOSK · Boarding pass</span><span>KSK ${String(new Date().getDate()).padStart(2, '0')}${String(new Date().getMonth() + 1).padStart(2, '0')}</span></div>
              <p class="k-ob__pass-name"><small>Passenger</small>${esc(t.name || 'Traveller')}</p>
              <div class="k-ob__pass-route"><div><b>${esc(code(from))}</b><small>${esc(from)}</small></div><span aria-hidden="true">✈</span><div><b>${esc(code(to))}</b><small>${esc(to)}</small></div></div>
              <dl class="k-ob__pass-grid"><div><dt>Class</dt><dd>${esc(cls)}</dd></div><div><dt>Seat</dt><dd>${esc((t.sizes.top || '—').toUpperCase())}</dd></div><div><dt>Gate</dt><dd>${esc(t.style.length ? labelOf('style', t.style[0]) : 'Open')}</dd></div><div><dt>Boarding</dt><dd>Now</dd></div></dl>
              ${tags.length ? `<p class="k-ob__pass-tags">${tags.slice(0, 9).map((x) => `<span>${esc(x)}</span>`).join('')}</p>` : ''}
              <div class="k-ob__pass-code" aria-hidden="true"></div>
            </div>`,
        };
      }
    }
  }

  /* ---------------------------------------------------------- the sheet */
  let el = null; let t = null; let i = 0; let ctx = {}; let returnFocus = null; let onDone = null;
  function render() {
    const id = STEPS[i];
    const s = stepHtml(id, t, ctx);
    const last = id === 'pass';
    const steps = STEPS.length - 1;
    el.innerHTML = `
      <div class="k-ob__scrim" data-ob-close></div>
      <div class="k-ob__panel" role="document">
        <header class="k-ob__head">
          <p class="k-ob__step"><span class="k-term__t">CHK</span>${last ? 'Boarding' : `Check-in · ${String(i + 1).padStart(2, '0')} / ${String(steps).padStart(2, '0')}`}</p>
          <ol class="k-ob__route" aria-hidden="true">${STEPS.map((_, n) => `<li class="${n < i ? 'is-done' : n === i ? 'is-now' : ''}"></li>`).join('')}</ol>
          <button type="button" class="k-ob__x" data-ob-close aria-label="Close check-in">${(K().icon || {}).close || '×'}</button>
        </header>
        <div class="k-ob__body" data-ob-body>
          <h2 class="k-ob__title" id="k-ob-title" tabindex="-1">${s.title}</h2>
          <p class="k-ob__sub">${s.sub}</p>
          ${s.body}
        </div>
        <footer class="k-ob__foot">
          ${i > 0 && !last ? '<button type="button" class="k-btn" data-ob-back>Back</button>' : '<span></span>'}
          ${last
            ? `${ctx.enabled && !ctx.signedIn ? '<button type="button" class="k-btn" data-ob-finish>Keep on this device</button><button type="button" class="k-btn k-btn--solid" data-ob-account>Save with an account</button>' : '<button type="button" class="k-btn k-btn--solid" data-ob-finish>Start exploring</button>'}`
            : `<span class="k-ob__right">${id === 'hello' ? '' : '<button type="button" class="k-ob__skip" data-ob-next>Skip</button>'}<button type="button" class="k-btn k-btn--solid" data-ob-next>${id === 'hello' ? 'Let’s go' : 'Continue'}</button></span>`}
        </footer>
      </div>`;
    const title = $('#k-ob-title', el); if (title) title.focus({ preventScroll: true });
    const body = $('[data-ob-body]', el); if (body) body.scrollTop = 0;
  }
  function save(final) {
    if (final && !t.completedAt) t.completedAt = new Date().toISOString();
    const home = $('[data-ob-home]', el);
    if (home) { const v = home.value.trim(); t.home = v ? (cityLookup(v) || { city: v.slice(0, 60), lat: null, lon: null }) : null; }
    const name = $('[data-ob-name]', el); if (name) t.name = name.value.trim().slice(0, 40);
    write(t);
    if (ctx.signedIn && A() && A().saveTaste && (final || t.completedAt)) A().saveTaste(t);
  }
  function go(n) { save(false); i = Math.max(0, Math.min(STEPS.length - 1, n)); if (STEPS[i] === 'pass') save(true); render(); }
  function close() {
    if (!el) return;
    save(false);
    el.classList.remove('is-open');
    document.documentElement.classList.remove('is-onboard-open');
    if (returnFocus && returnFocus.focus) returnFocus.focus();
    if (t.completedAt && onDone) { const f = onDone; onDone = null; f(t); }
  }
  function onClick(e) {
    const b = e.target.closest('button');
    if (e.target.closest('[data-ob-close]')) { close(); return; }
    if (!b) return;
    if (b.matches('[data-ob-next]')) { go(i + 1); return; }
    if (b.matches('[data-ob-back]')) { go(i - 1); return; }
    if (b.matches('[data-ob-finish]')) { save(true); close(); if (K().toast) K().toast(t.name ? `Checked in. Welcome, ${t.name}.` : 'Checked in. Welcome aboard.'); return; }
    if (b.matches('[data-ob-account]')) { save(true); const ret = location.pathname + location.search; location.href = `/api/auth/login?return_to=${encodeURIComponent(ret || '/account.html')}`; return; }
    if (b.dataset.ob) {
      const g = b.dataset.ob; const v = b.dataset.v; const list = t[g] || (t[g] = []);
      const on = list.includes(v);
      if (on) list.splice(list.indexOf(v), 1);
      else { if (g === 'dream' && list.length >= 6) { if (K().toast) K().toast('Six is plenty. Drop one to add another.'); return; } list.push(v); }
      b.setAttribute('aria-pressed', String(!on));
      save(false); return;
    }
    if (b.dataset.ob1) {
      const g = b.dataset.ob1; const v = b.dataset.v;
      if (g === 'top' || g === 'bottom') t.sizes[g] = t.sizes[g] === v ? '' : v; else t[g] = t[g] === v ? '' : v;
      $$(`[data-ob1="${g}"]`, el).forEach((x) => x.setAttribute('aria-checked', String(x.dataset.v === (g === 'top' || g === 'bottom' ? t.sizes[g] : t[g]))));
      save(false);
    }
  }
  function onKey(e) {
    if (!el || !el.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); go(i + 1); return; }
    if (e.key === 'Tab') {   // keep focus inside the sheet
      const f = $$('button, input, [tabindex="0"]', el).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }

  function open(opts = {}) {
    const st = A() && A().getState ? A().getState() : {};
    ctx = { signedIn: !!st.user, enabled: !!st.enabled, guessCity: opts.guessCity || '' };
    t = read() || blank();
    if (!t.name && st.user && st.user.firstName) t.name = st.user.firstName;
    onDone = opts.onDone || null;
    i = opts.step != null ? Math.max(0, STEPS.indexOf(opts.step)) : (t.completedAt ? 1 : 0);
    if (!el) {
      el = document.createElement('div');
      el.className = 'k-ob';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'k-ob-title');
      document.body.append(el);
      el.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
    }
    returnFocus = document.activeElement;
    render();
    document.documentElement.classList.add('is-onboard-open');
    requestAnimationFrame(() => el.classList.add('is-open'));
    // Suggest the home city from the request's approximate location
    if (!(t.home && t.home.city) && !ctx.guessCity) {
      fetch('/api/where').then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (!d || !d.city) return; ctx.guessCity = d.city;
        const h = $('[data-ob-home]', el); if (h && !h.value) h.value = d.city;
      }).catch(() => {});
    }
  }

  /** One-line summary for account panels: "Cars · Travel · Films · Tokyo" */
  function summary(taste) {
    const x = taste || read();
    if (!x) return '';
    return [...x.interests.map((v) => labelOf('interests', v)), ...x.formats.slice(0, 2).map((v) => labelOf('formats', v)), ...x.dream.slice(0, 2).map((v) => labelOf('dream', v))].join(' · ');
  }

  window.KioskOnboard = { open, read, write, summary, TASTE, cityLookup };
})();
