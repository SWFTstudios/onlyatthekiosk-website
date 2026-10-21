/**
 * KIOSK — Partner Hub (partner.html)
 * ------------------------------------------------------------
 * Stores, brands and sponsors sign in with their KIOSK account (email
 * code, js/kiosk-account.js) and keep a partner profile: who they are,
 * their links and images, the pieces they list and how they're paid.
 * Data lives in D1 through /api/partner and /api/partner/products
 * (functions/api/partner/); new profiles go live once KIOSK approves them.
 *
 *   partner.html             the hub (overview, profile, pieces, settings, media kit, directory)
 *   partner.html?p=<handle>  a live partner's public page
 *
 * Requires js/kiosk-glass.js (window.KIOSK) and js/kiosk-account.js.
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-mount="partner"]');
  if (!root) return;
  const K = window.KIOSK || {};
  const C = window.KIOSK_CONTENT || {};
  const esc = K.esc || ((v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const icon = K.icon || {};
  const toast = (m) => (K.toast ? K.toast(m) : null);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const TABS = [
    ['overview', 'Overview'],
    ['profile', 'Profile'],
    ['pieces', 'Pieces'],
    ['settings', 'Settings'],
    ['media', 'Media kit'],
    ['directory', 'On the kiosk'],
  ];
  const KINDS = {
    store: { label: 'Store', note: 'Shops, thrift curators and stockists', gets: ['A store page and a pin on the Lost & Found map', 'Your pieces in the shop and in search', 'Visits tagged so your Shopify sees where they came from'] },
    brand: { label: 'Brand', note: 'Labels, makers and independents', gets: ['A brand page and a feature slot in the shop', 'Pieces matched to stories through "Shop the look"', 'A seat at the table for collaborations and drops'] },
    sponsor: { label: 'Sponsor', note: 'Companies backing films, stories and radio', gets: ['Credits on the films and stories you back', 'Placements in the monthly Journal', 'A media kit and a direct line to the KIOSK desk'] },
  };
  const PAYOUTS = {
    collective: ['Shopify Collective', 'You list to KIOSK’s Shopify; it sells, you ship, Shopify splits the payout.'],
    link: ['Link out', 'Pieces link to your own shop with a KIOSK referral tag; commission is settled with you directly.'],
    marketplace: ['Marketplace app', 'A multi-vendor app handles your vendor account, commission and payouts.'],
    sponsor: ['Sponsorship', 'No sales on the kiosk; you back content and are invoiced for it.'],
  };

  const st = { me: null, partner: null, products: [], loading: true, tab: 'overview', editing: null, msg: '' };
  const signedIn = () => !!(st.me && st.me.user);
  const accountsOn = () => !!(st.me && st.me.enabled);

  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status})`); e.status = res.status; e.data = data; throw e; }
    return data;
  }

  async function load() {
    st.loading = true;
    try { st.me = await api('/api/me'); } catch (e) { st.me = { enabled: false, user: null }; }
    if (signedIn()) {
      try { const d = await api('/api/partner'); st.partner = d.partner; st.products = d.products || []; } catch (e) { st.partner = null; st.products = []; }
    } else { st.partner = null; st.products = []; }
    st.loading = false;
    paint();
  }

  /* --------------------------------------------------------------- views */

  const field = (name, label, value, opts = {}) => `
    <label class="k-ph-field${opts.wide ? ' k-ph-field--wide' : ''}">
      <span>${esc(label)}${opts.hint ? ` <small>${esc(opts.hint)}</small>` : ''}</span>
      ${opts.area ? `<textarea name="${name}" rows="${opts.rows || 5}" maxlength="${opts.max || 2000}"${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}>${esc(value || '')}</textarea>`
        : `<input name="${name}" type="${opts.type || 'text'}" value="${esc(value == null ? '' : value)}"${opts.max ? ` maxlength="${opts.max}"` : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}${opts.step ? ` step="${opts.step}"` : ''}${opts.required ? ' required' : ''} autocomplete="off">`}
    </label>`;
  const statusTag = (s) => `<span class="k-ph-status k-ph-status--${esc(s)}">${esc({ pending: 'In review', live: 'Live', paused: 'Paused' }[s] || s)}</span>`;
  const money = (p) => (p.price == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format(p.price));

  function gate(what) {
    if (st.loading) return '<p class="k-ph-note">Loading…</p>';
    if (!accountsOn()) {
      return `<div class="k-ph-gate">
        <p class="k-ed-standfirst">Partner accounts open soon.</p>
        <p class="k-lede">Leave your email and the KIOSK desk will set you up as a store, brand or sponsor.</p>
        <button class="k-btn k-btn--solid" type="button" data-notify="partner" data-notify-title="Partner with the KIOSK">Apply to partner</button>
      </div>`;
    }
    if (!signedIn()) {
      return `<div class="k-ph-gate">
        <p class="k-ed-standfirst">Sign in to ${esc(what)}.</p>
        <p class="k-lede">Your KIOSK account is your partner login: enter your email and we send a six-digit code. No passwords.</p>
        <button class="k-btn k-btn--solid" type="button" data-account-open>Sign in or create an account</button>
      </div>`;
    }
    return '';
  }

  function overview() {
    const p = st.partner;
    return `
      ${p ? `<div class="k-ph-card k-ph-hello">
        <div><p class="k-ed-label">${esc(KINDS[p.kind] ? KINDS[p.kind].label : p.kind)} · @${esc(p.handle)}</p><p class="k-ph-hello__name">${esc(p.name)}</p></div>
        ${statusTag(p.status)}
        <p class="k-small">${p.status === 'live' ? `Your page is live: <a href="partner.html?p=${encodeURIComponent(p.handle)}">onlyatthekiosk.com/partner.html?p=${esc(p.handle)}</a>` : p.status === 'paused' ? 'Your page is paused. Write to the desk to switch it back on.' : 'The KIOSK desk reviews new partners and switches your page on, usually within a few days.'}</p>
        <div class="k-ph-stats"><div><b>${st.products.length}</b><span>pieces</span></div><div><b>${st.products.filter((x) => x.status === 'live').length}</b><span>live</span></div><div><b>${p.settings && p.settings.listed === false ? 'Hidden' : 'Listed'}</b><span>in the directory</span></div></div>
      </div>` : ''}
      <div class="k-ph-kinds">${Object.entries(KINDS).map(([k, v], i) => `
        <article class="k-ph-kind">
          <p class="k-ed-label">${String(i + 1).padStart(2, '0')}</p>
          <h3>${esc(v.label)}s</h3>
          <p class="k-small">${esc(v.note)}</p>
          <ul>${v.gets.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        </article>`).join('')}
      </div>
      <ol class="k-ph-steps">
        <li><b>Sign in</b><span>With your email: a six-digit code, no passwords.</span></li>
        <li><b>Set up your profile</b><span>Your name, story, links and the pieces you sell.</span></li>
        <li><b>Go live</b><span>The KIOSK desk reviews it and switches your page on.</span></li>
      </ol>
      ${signedIn() ? (p ? '' : '<button class="k-btn k-btn--solid" type="button" data-ph-tab="profile">Set up your partner profile</button>') : gate('the Partner Hub')}`;
  }

  function profile() {
    const g = gate('edit your profile');
    if (g) return g;
    const p = st.partner || { kind: 'store', settings: {} };
    return `
      <form class="k-ph-form" data-ph-form="profile" novalidate>
        <fieldset class="k-ph-kindpick"><legend>I’m a</legend>
          ${Object.entries(KINDS).map(([k, v]) => `<label><input type="radio" name="kind" value="${k}"${p.kind === k ? ' checked' : ''}><span><b>${esc(v.label)}</b><small>${esc(v.note)}</small></span></label>`).join('')}
        </fieldset>
        <div class="k-ph-grid">
          ${field('name', 'Name', p.name, { max: 80, required: true, placeholder: 'Store, brand or company' })}
          ${field('handle', 'Handle', p.handle, { max: 40, hint: 'your page: partner.html?p=handle', placeholder: 'casa-lisboa' })}
          ${field('tagline', 'Tagline', p.tagline, { max: 120, wide: true, placeholder: 'One line: what you make, sell or back' })}
          ${field('bio', 'Bio', p.bio, { area: true, wide: true, max: 2000, rows: 7, placeholder: 'Your story, in your words. Where you are, what you look for, why the kiosk.' })}
          ${field('city', 'City', p.city, { max: 60 })}
          ${field('country', 'Country', p.country, { max: 60 })}
          ${field('website', 'Website', p.website, { type: 'url', placeholder: 'https://' })}
          ${field('instagram', 'Instagram', p.instagram, { placeholder: '@handle' })}
          ${field('logo', 'Logo image', p.logo, { type: 'url', placeholder: 'https:// link to a square image' })}
          ${field('cover', 'Cover image', p.cover, { type: 'url', placeholder: 'https:// link to a wide photo' })}
        </div>
        <p class="k-ph-msg" data-ph-msg aria-live="polite"></p>
        <div class="k-ph-actions"><button class="k-btn k-btn--solid" type="submit">${st.partner ? 'Save profile' : 'Create profile'}</button>${st.partner ? `<a class="k-ed-link" href="partner.html?p=${encodeURIComponent(st.partner.handle)}">Preview your page ${icon.arrow || ''}</a>` : ''}</div>
      </form>
      <aside class="k-ph-preview" data-ph-preview aria-label="Preview">${card(p)}</aside>`;
  }

  function card(p) {
    return `<div class="k-ph-pcard">
      <div class="k-ph-pcard__cover">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : ''}</div>
      <div class="k-ph-pcard__body">
        <span class="k-ph-pcard__logo">${p.logo ? `<img src="${esc(p.logo)}" alt="" loading="lazy">` : esc((p.name || 'K').charAt(0))}</span>
        <p class="k-ed-label">${esc([KINDS[p.kind] ? KINDS[p.kind].label : '', [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p>
        <p class="k-ph-pcard__name">${esc(p.name || 'Your name')}</p>
        <p class="k-small">${esc(p.tagline || 'Your tagline')}</p>
      </div>
    </div>`;
  }

  function pieces() {
    const g = gate('list your pieces');
    if (g) return g;
    if (!st.partner) return '<div class="k-ph-gate"><p class="k-ed-standfirst">Set up your profile first.</p><button class="k-btn k-btn--solid" type="button" data-ph-tab="profile">Create your profile</button></div>';
    const ed = st.editing && st.editing !== 'new' ? st.products.find((x) => x.id === st.editing) : null;
    const showForm = st.editing === 'new' || ed;
    const v = ed || { currency: 'USD', status: 'draft' };
    return `
      <div class="k-ph-listhead"><p class="k-ed-label">${st.products.length} ${st.products.length === 1 ? 'piece' : 'pieces'}</p>${showForm ? '' : '<button class="k-btn k-btn--solid" type="button" data-ph-new>Add a piece</button>'}</div>
      ${showForm ? `<form class="k-ph-form k-ph-form--piece" data-ph-form="piece" data-id="${esc(ed ? ed.id : '')}" novalidate>
        <div class="k-ph-grid">
          ${field('title', 'Name of the piece', v.title, { max: 120, wide: true, required: true })}
          ${field('price', 'Price', v.price, { type: 'number', step: '0.01' })}
          <label class="k-ph-field"><span>Currency</span><select name="currency">${['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((c) => `<option${v.currency === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
          ${field('url', 'Link to buy', v.url, { type: 'url', wide: true, placeholder: 'https:// your product page' })}
          ${field('image', 'Image', v.image, { type: 'url', wide: true, placeholder: 'https:// link to a photo' })}
          ${field('description', 'Description', v.description, { area: true, wide: true, max: 1200, rows: 4 })}
          <label class="k-ph-switch k-ph-field--wide"><input type="checkbox" name="live"${v.status === 'live' ? ' checked' : ''}><span>Show it on the kiosk <small>Drafts stay private. Live pieces appear once your page is live.</small></span></label>
        </div>
        <p class="k-ph-msg" data-ph-msg aria-live="polite"></p>
        <div class="k-ph-actions"><button class="k-btn k-btn--solid" type="submit">${ed ? 'Save piece' : 'Add piece'}</button><button class="k-btn" type="button" data-ph-cancel>Cancel</button></div>
      </form>` : ''}
      <ol class="k-ph-pieces">${st.products.map((x, i) => `
        <li class="k-ph-piece">
          <span class="k-ph-piece__img">${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy">` : ''}</span>
          <span class="k-ph-piece__body"><b>${esc(x.title)}</b><small>${esc(money(x))}${x.url ? ' · linked' : ''}</small></span>
          ${statusTag(x.status === 'live' ? 'live' : 'draft')}
          <span class="k-ph-piece__tools">
            <button type="button" data-ph-move="${esc(x.id)}" data-dir="-1" aria-label="Move up"${i ? '' : ' disabled'}>↑</button>
            <button type="button" data-ph-move="${esc(x.id)}" data-dir="1" aria-label="Move down"${i < st.products.length - 1 ? '' : ' disabled'}>↓</button>
            <button type="button" data-ph-edit="${esc(x.id)}">Edit</button>
            <button type="button" data-ph-del="${esc(x.id)}">Remove</button>
          </span>
        </li>`).join('')}</ol>
      ${st.products.length || showForm ? '' : '<p class="k-ph-note">Nothing listed yet. Add your first piece: a name, a price, a photo and the link to buy it.</p>'}`;
  }

  function settings() {
    const g = gate('change your settings');
    if (g) return g;
    if (!st.partner) return '<div class="k-ph-gate"><p class="k-ed-standfirst">Set up your profile first.</p><button class="k-btn k-btn--solid" type="button" data-ph-tab="profile">Create your profile</button></div>';
    const s = st.partner.settings || {};
    return `
      <form class="k-ph-form" data-ph-form="settings" novalidate>
        <div class="k-ph-grid">
          ${field('contactEmail', 'Contact email', s.contactEmail, { type: 'email', wide: true, hint: 'where the desk and buyers reach you' })}
          <label class="k-ph-switch k-ph-field--wide"><input type="checkbox" name="listed"${s.listed !== false ? ' checked' : ''}><span>List me in the directory <small>Turn off to keep your page reachable by link only.</small></span></label>
          <label class="k-ph-switch k-ph-field--wide"><input type="checkbox" name="notifyMessages"${s.notifyMessages !== false ? ' checked' : ''}><span>Email me messages from the desk</span></label>
          <label class="k-ph-switch k-ph-field--wide"><input type="checkbox" name="notifyOrders"${s.notifyOrders !== false ? ' checked' : ''}><span>Email me about visits and orders</span></label>
        </div>
        <fieldset class="k-ph-kindpick k-ph-kindpick--payout"><legend>How you’re paid</legend>
          ${Object.entries(PAYOUTS).map(([k, [lab, note]]) => `<label><input type="radio" name="payout" value="${k}"${(s.payout || 'link') === k ? ' checked' : ''}><span><b>${esc(lab)}</b><small>${esc(note)}</small></span></label>`).join('')}
        </fieldset>
        <p class="k-ph-msg" data-ph-msg aria-live="polite"></p>
        <div class="k-ph-actions"><button class="k-btn k-btn--solid" type="submit">Save settings</button></div>
      </form>
      <section class="k-ph-danger">
        <p class="k-ed-label">Leave the hub</p>
        <p class="k-small">Removing your partner profile deletes your page and every piece listed with it. Your KIOSK account stays.</p>
        <div class="k-ph-actions"><button class="k-btn" type="button" data-ph-remove>Remove partner profile</button><button class="k-btn" type="button" data-signout>Sign out</button></div>
      </section>`;
  }

  function mediaKit() {
    const files = [
      ['images/brand/kiosk-k-star.svg', 'K star logo', 'SVG · any size'],
      ['images/brand/kiosk-k-star-black-1024.png', 'K star, black', 'PNG · 1024 px'],
      ['images/brand/kiosk-k-star-white-1024.png', 'K star, white', 'PNG · 1024 px'],
    ];
    return `
      <p class="k-lede">Use these on your shop, posts and packaging when you sell or sponsor at the kiosk. Keep clear space around the K star, and don’t recolour or stretch it.</p>
      <ul class="k-ph-files">${files.map(([href, name, meta]) => `
        <li><a href="${href}" download>
          <span class="k-ph-files__thumb${/white/.test(href) ? ' k-dark' : ''}"><img src="${href}" alt="" loading="lazy"></span>
          <span><b>${esc(name)}</b><small>${esc(meta)}</small></span>
          <span class="k-ph-files__dl" aria-hidden="true">↓</span>
        </a></li>`).join('')}
      </ul>
      <p class="k-small">Need photographs from a story for a feature or a stockist page? Every frame is in the <a href="gallery.html">Gallery</a>; ask the desk before using one.</p>`;
  }

  let directory = null;
  function directoryView() {
    if (!directory) {
      directory = { loading: true, list: [] };
      api('/api/partners').then((d) => { directory = { list: d.partners || [] }; if (st.tab === 'directory') paint(); }).catch(() => { directory = { list: [] }; if (st.tab === 'directory') paint(); });
    }
    const stores = (C.stores || []).map((s) => ({ name: s.name, kind: 'store', tagline: s.note, city: s.city, country: s.country, cover: s.cover, href: `store.html?s=${encodeURIComponent(s.id)}` }));
    const partners = (directory.list || []).map((p) => ({ ...p, href: `partner.html?p=${encodeURIComponent(p.handle)}` }));
    const all = stores.concat(partners);
    return `
      <ul class="k-ph-dir">${all.map((p) => `<li><a href="${esc(p.href)}">${card(p)}</a></li>`).join('')}</ul>
      ${directory.loading ? '<p class="k-ph-note">Loading partners…</p>' : ''}`;
  }

  function paint() {
    if (publicHandle) return;
    const views = { overview, profile, pieces, settings, media: mediaKit, directory: directoryView };
    const signed = signedIn();
    root.innerHTML = `
      <aside class="k-ph-side">
        <div class="k-ph-side__card">
          <p class="k-ph-side__who">${signed ? esc(st.partner ? st.partner.name : (st.me.user.email || 'Signed in')) : 'Partner Hub'}${st.partner ? ` <sup>${st.products.length}</sup>` : ''}</p>
          <nav aria-label="Partner Hub"><ul>${TABS.map(([k, label]) => `<li><button type="button" data-ph-tab="${k}"${st.tab === k ? ' aria-current="page"' : ''}>${esc(label)}</button></li>`).join('')}</ul></nav>
        </div>
      </aside>
      <section class="k-ph-main" aria-live="polite">
        <h2 class="k-ph-title">${esc((TABS.find((t) => t[0] === st.tab) || TABS[0])[1])}</h2>
        <div class="k-ph-panel k-ph-panel--${st.tab}">${views[st.tab]()}</div>
      </section>`;
  }

  /* ------------------------------------------------------------ actions */

  const say = (form, msg, bad) => { const el = $('[data-ph-msg]', form); if (el) { el.textContent = msg; el.classList.toggle('is-error', !!bad); } };
  const busy = (form, on) => $$('button[type="submit"]', form).forEach((b) => { b.disabled = on; });
  const values = (form) => Object.fromEntries(new FormData(form).entries());

  async function submit(form) {
    const kind = form.dataset.phForm;
    const v = values(form);
    busy(form, true);
    say(form, 'Saving…');
    try {
      let d;
      if (kind === 'profile') {
        d = await api('/api/partner', { method: 'PUT', body: JSON.stringify({ partner: { ...v, settings: st.partner ? st.partner.settings : {} } }) });
      } else if (kind === 'settings') {
        const settings = { contactEmail: v.contactEmail, listed: !!v.listed, notifyMessages: !!v.notifyMessages, notifyOrders: !!v.notifyOrders, payout: v.payout };
        d = await api('/api/partner', { method: 'PUT', body: JSON.stringify({ partner: { ...st.partner, settings } }) });
      } else {
        const product = { title: v.title, price: v.price, currency: v.currency, url: v.url, image: v.image, description: v.description, status: v.live ? 'live' : 'draft' };
        const id = form.dataset.id;
        d = await api('/api/partner/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(id ? { id, product } : { product }) });
        st.editing = null;
      }
      const created = kind === 'profile' && !st.partner;
      st.partner = d.partner; st.products = d.products || [];
      if (created) st.tab = 'overview';
      paint();
      toast(created ? 'Profile created. The desk will review it.' : 'Saved');
    } catch (err) {
      busy(form, false);
      say(form, err.message || 'Could not save.', true);
      const bad = err.data && err.data.field && $(`[name="${err.data.field}"]`, form);
      if (bad) bad.focus();
    }
  }

  async function act(fn) {
    try { const d = await fn(); st.partner = d.partner; st.products = d.products || []; paint(); } catch (err) { toast(err.message || 'Something went wrong.'); }
  }

  const go = (tab) => {
    if (!TABS.some((t) => t[0] === tab)) return;
    st.tab = tab; st.editing = null;
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${tab}`);
    paint();
    const top = root.getBoundingClientRect().top + window.scrollY - 110;
    if (window.scrollY > top) window.scrollTo({ top });
  };

  root.addEventListener('click', (e) => {
    const t = e.target;
    const tab = t.closest('[data-ph-tab]');
    if (tab) { go(tab.dataset.phTab); return; }
    if (t.closest('[data-ph-new]')) { st.editing = 'new'; paint(); const f = $('[data-ph-form="piece"] input', root); if (f) f.focus(); return; }
    if (t.closest('[data-ph-cancel]')) { st.editing = null; paint(); return; }
    const ed = t.closest('[data-ph-edit]');
    if (ed) { st.editing = ed.dataset.phEdit; paint(); return; }
    const del = t.closest('[data-ph-del]');
    if (del) {
      const x = st.products.find((p) => p.id === del.dataset.phDel);
      if (x && window.confirm(`Remove “${x.title}”?`)) act(() => api(`/api/partner/products?id=${encodeURIComponent(x.id)}`, { method: 'DELETE' }));
      return;
    }
    const mv = t.closest('[data-ph-move]');
    if (mv) {
      const ids = st.products.map((p) => p.id);
      const i = ids.indexOf(mv.dataset.phMove); const j = i + Number(mv.dataset.dir);
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      act(() => api('/api/partner/products', { method: 'PUT', body: JSON.stringify({ order: ids }) }));
      return;
    }
    if (t.closest('[data-ph-remove]')) {
      if (window.confirm('Remove your partner profile and every piece you’ve listed? Your KIOSK account stays.')) {
        act(() => api('/api/partner', { method: 'DELETE' })).then(() => { st.tab = 'overview'; paint(); });
      }
    }
  });
  root.addEventListener('submit', (e) => { const f = e.target.closest('[data-ph-form]'); if (f) { e.preventDefault(); submit(f); } });
  // Live preview while editing the profile
  root.addEventListener('input', (e) => {
    const form = e.target.closest('[data-ph-form="profile"]');
    const prev = $('[data-ph-preview]', root);
    if (form && prev) prev.innerHTML = card(values(form));
  });
  document.addEventListener('kiosk:account', () => { if (!publicHandle) load(); });

  /* --------------------------------------------------- a partner's page */

  const publicHandle = new URLSearchParams(location.search).get('p');
  async function showPublic(handle) {
    root.classList.add('k-ph--public');
    root.innerHTML = '<p class="k-ph-note">Loading…</p>';
    let p = null;
    try { p = ((await api(`/api/partners?handle=${encodeURIComponent(handle)}`)).partners || [])[0]; } catch (e) { p = null; }
    const head = $('[data-ph-head]');
    if (!p) {
      root.innerHTML = `<div class="k-ph-gate"><p class="k-ed-standfirst">This partner page isn’t live yet.</p><a class="k-ed-link" href="partner.html#directory">See who’s on the kiosk ${icon.arrow || ''}</a></div>`;
      return;
    }
    document.title = `${p.name} · Partner · KIOSK`;
    if (head) {
      head.innerHTML = `<p class="k-ed-label">${esc([KINDS[p.kind] ? KINDS[p.kind].label : '', [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p><h1 class="k-ed-giant" data-fit>${esc(p.name)}</h1>${p.tagline ? `<p class="k-lede">${esc(p.tagline)}</p>` : ''}`;
    }
    root.innerHTML = `
      ${p.cover ? `<figure class="k-ph-cover"><img src="${esc(p.cover)}" alt=""></figure>` : ''}
      <div class="k-ed-grid k-ph-about">
        <p class="k-ed-label">About</p>
        <div>
          ${p.bio ? p.bio.split(/\n\s*\n/).map((t) => `<p class="k-ph-bio">${esc(t)}</p>`).join('') : ''}
          <p class="k-ph-links">${p.website ? `<a class="k-ed-link" href="${esc(p.website)}" target="_blank" rel="noopener">Website ${icon.arrow || ''}</a>` : ''}${p.instagram ? `<a class="k-ed-link" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}" target="_blank" rel="noopener">@${esc(p.instagram)} ${icon.arrow || ''}</a>` : ''}</p>
        </div>
      </div>
      ${(p.products || []).length ? `<section class="k-ph-shop"><p class="k-ed-label">Pieces</p><ul class="k-ph-shop__grid">${p.products.map((x) => `
        <li><a href="${esc(x.url || '#')}"${x.url ? ' target="_blank" rel="noopener"' : ''}>
          <span class="k-ph-shop__img">${x.image ? `<img src="${esc(x.image)}" alt="${esc(x.title)}" loading="lazy">` : ''}</span>
          <b>${esc(x.title)}</b><small>${esc(money(x))}</small>
        </a></li>`).join('')}</ul></section>` : ''}`;
    document.dispatchEvent(new CustomEvent('kiosk:page', { detail: { page: 'partner', partial: true } }));
  }

  if (publicHandle) showPublic(publicHandle);
  else {
    const h = location.hash.slice(1);
    if (TABS.some((t) => t[0] === h)) st.tab = h;
    paint();
    load();
  }
})();
