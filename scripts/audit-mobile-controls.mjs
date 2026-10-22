#!/usr/bin/env node
/**
 * Mobile controls audit: on every KIOSK page, at four phone widths, each
 * visible link, button and field is scrolled into view and checked:
 *
 *   cut off    part of it falls outside the screen or its scrolling box
 *   covered    another element sits on top of it (taps would hit that instead)
 *   small      smaller than 24 × 24 px (WCAG 2.2 target size, minimum)
 *   untappable shown but set to ignore taps (pointer-events: none)
 *   overflow   the page scrolls sideways
 *
 * Then the menu, settings, account and page-specific panels are opened and
 * their controls checked the same way.
 *
 *   node scripts/audit-mobile-controls.mjs [--base-url=http://localhost:8099] [--pages=index.html,vault.html] [--json=out.json] [--live]
 * --live answers /api/live with a handful of travelers, so the nav's live
 * count and the globe pins (hidden without the API) get checked too.
 * Needs Playwright with Chromium, and the site served (e.g. python3 -m http.server 8099).
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const BASE = arg('base-url', 'http://localhost:8099');
const PAGES = arg('pages', [
  'index.html', 'atlas.html', 'archive.html', 'archive.html?v=2025-11', 'gallery.html', 'partner.html', 'films.html',
  'radio.html', 'vault.html', 'store.html', 'lost-and-found.html', 'account.html', 'story.html?s=andy-q50', 'the-garage.html',
].join(',')).split(',');
const VIEWPORTS = [[320, 568], [360, 740], [390, 844], [430, 932]];
const LIVE = process.argv.includes('--live');
const LIVE_REPLY = JSON.stringify({ enabled: true, count: 128, viewers: [{ lat: 51.5, lon: -0.1, city: 'London', country: 'GB', n: 4 }, { lat: 6.5, lon: 3.4, city: 'Lagos', country: 'NG', n: 2 }] });

// Panels to open on every page: [label, opener(s), panel]; on phones settings
// and account are reached from the menu, so their openers go through it
const PANELS = [
  ['menu', ['[data-tab-more]'], '.k-sheet'],
  ['settings', ['[data-tab-more]', '.k-sheet [data-settings-open]'], '.k-set'],
  ['account', ['[data-tab-more]', '.k-sheet [data-account-open]'], '.k-acct'],
];
const PAGE_PANELS = {
  'vault.html': [['product', ['[data-pdp], [data-quickview]'], '.k-pdp']],
  'gallery.html': [['filters', ['.k-gal-filterbtn'], '.k-gal-panel'], ['photo', ['.k-gal-tile__open'], '.k-lightbox']],
};

/* Runs in the page: checks every control inside `scope` (a selector, or the document) */
function auditInPage({ scope, fixedScope }) {
  const vw = window.innerWidth; const vh = window.innerHeight;
  // measure the settled page: scroll reveals done, no transitions mid-way
  if (!document.getElementById('audit-still')) {
    const st = document.createElement('style'); st.id = 'audit-still';
    st.textContent = '*, *::before, *::after { transition: none !important; animation-duration: 0s !important; animation-delay: 0s !important; }';
    document.head.append(st);
  }
  document.querySelectorAll('[data-reveal], [data-ed], [data-ed-seen]').forEach((el) => el.classList.add('is-in'));
  const root = scope ? document.querySelector(scope) : document;
  if (!root) return { missing: scope, issues: [] };
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.value || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const c = typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${c ? `.${c}` : ''}${t ? ` “${t}”` : ''}`;
  };
  const opacity = (el) => { let o = 1; for (let n = el; n && n !== document; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
  const visible = (el) => {
    if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    // inside a closed <details> (other than its own summary) it isn't rendered
    // at all, nested ones included
    for (let d = el.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) {
      const sum = d.querySelector(':scope > summary');
      if (!sum || !sum.contains(el)) return false;
    }
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && opacity(el) > 0.05;
  };
  const clippers = (el) => {
    const out = [];
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) out.push(n);
    }
    return out;
  };
  const els = Array.from(root.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], summary'))
    .filter((el) => !el.classList.contains('k-skip'))   // the skip link waits off screen until focused
    .filter(visible);
  const issues = [];
  const y0 = window.scrollY;
  els.forEach((el) => {
    const fixedHost = el.closest(fixedScope || '.k-nav, .k-tabbar, .k-dock, .k-sheet, .k-set, .k-acct, .k-cart, .k-pdp, .k-gal-panel, .k-gal-pill, .k-lightbox');
    if (!scope && fixedHost) return;   // chrome is audited on its own
    // bring it to the middle: its sideways scrollers first, then the page
    // (computed by hand: scrollIntoView is unreliable on some elements)
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) {
        const a = el.getBoundingClientRect(); const b = n.getBoundingClientRect();
        n.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2);
      }
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) {
        const a = el.getBoundingClientRect(); const b = n.getBoundingClientRect();
        n.scrollTop += (a.top + a.height / 2) - (b.top + b.height / 2);
      }
    }
    if (!scope) { const a = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + a.top + a.height / 2 - vh / 2); }
    const r = el.getBoundingClientRect();
    const id = name(el);
    if (getComputedStyle(el).pointerEvents === 'none' && !el.disabled && el.getAttribute('aria-disabled') !== 'true') issues.push({ kind: 'untappable', el: id, by: 'pointer-events: none' });
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) issues.push({ kind: 'cut off', el: id, by: 'screen', rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
    else {
      for (const c of clippers(el)) {
        const b = c.getBoundingClientRect();
        const ix = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left));
        const iy = Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
        if (ix * iy < r.width * r.height * 0.9) { issues.push({ kind: 'cut off', el: id, by: name(c) }); break; }
      }
    }
    // what a tap at its centre (and just inside each side) would hit
    const pts = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5]];
    let blocker = null;
    for (const [fx, fy] of pts) {
      const x = r.left + r.width * fx; const y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x > vw || y > vh) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el) || (el.labels && Array.from(el.labels).some((l) => l.contains(hit)))) continue;
      const via = hit.closest('a[href]');   // a card's caption link over its cover link: same place either way
      if (via && el.matches('a[href]') && via.getAttribute('href') === el.getAttribute('href')) continue;
      blocker = hit; break;
    }
    if (blocker) issues.push({ kind: 'covered', el: id, by: name(blocker.closest('a, button, section, nav, header, footer, aside, div') || blocker) });
    // a field that opens from its label (search behind an icon) is tapped through the label
    const viaLabel = el.labels && Array.from(el.labels).some((l) => { const b = l.getBoundingClientRect(); return b.width >= 24 && b.height >= 24; });
    if ((r.width < 24 || r.height < 24) && !viaLabel && !el.closest('p, li > p, dd, .k-prose, .k-ed-text, .k-jr-table')) issues.push({ kind: 'small', el: id, size: `${Math.round(r.width)}×${Math.round(r.height)}` });
  });
  window.scrollTo(0, y0);
  const overflow = !scope && document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0;
  return { count: els.length, overflow, issues };
}

const report = [];
const browser = await chromium.launch();
for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('kiosk:onboarded', 'true'); sessionStorage.setItem('kiosk:sky', '1'); } catch (e) { /* storage blocked */ } });
  if (LIVE) await ctx.route('**/api/live', (r) => r.fulfill({ contentType: 'application/json', body: LIVE_REPLY }));
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' }).catch(() => {});
    // Phones scroll natively (no Lenis), so html's scroll-behavior: smooth would animate
    // every scroll the audit makes and it would measure before the page arrives
    await page.addStyleTag({ content: 'html, html * { scroll-behavior: auto !important; }' }).catch(() => {});
    await page.waitForTimeout(1500);
    const main = await page.evaluate(auditInPage, { scope: '' });
    const chrome = await page.evaluate(auditInPage, { scope: '.k-nav', fixedScope: '#none' });
    const tabbar = await page.evaluate(auditInPage, { scope: '.k-tabbar', fixedScope: '#none' });
    const panels = [];
    for (const [label, openers, panel] of PANELS.concat(PAGE_PANELS[path.split('?')[0]] || [])) {
      try {
        for (const opener of openers) {
          const btn = page.locator(opener).filter({ visible: true }).first();
          if (!(await btn.count())) throw new Error(`no visible ${opener}`);
          // a dispatched click: busy pages (maps, 3D) can starve Playwright's
          // stability wait, and covering is checked by the audit itself
          await btn.evaluate((el) => el.click());
          await page.waitForTimeout(700);
        }
        await page.waitForTimeout(300);
        panels.push({ label, ...(await page.evaluate(auditInPage, { scope: panel, fixedScope: '#none' })) });
      } catch (e) { panels.push({ label, error: String(e).split('\n')[0] }); }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
    report.push({ viewport: `${w}×${h}`, path, errors, main, chrome, tabbar, panels });
    const n = main.issues.length + chrome.issues.length + tabbar.issues.length + panels.reduce((k, p) => k + ((p.issues || []).length), 0);
    console.log(`${w}×${h} ${path}: ${n} issues${main.overflow ? `, page ${main.overflow}px wide` : ''}${errors.length ? `, ${errors.length} errors` : ''}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// Summary: each problem once, with the widths it shows up at
const seen = new Map();
report.forEach((r) => {
  const add = (where, i) => {
    const key = `${r.path} | ${where} | ${i.kind} | ${i.el} | ${i.by || i.size || ''}`;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key).add(r.viewport);
  };
  r.main.issues.forEach((i) => add('page', i));
  r.chrome.issues.forEach((i) => add('nav', i));
  r.tabbar.issues.forEach((i) => add('tab bar', i));
  r.panels.forEach((p) => { (p.issues || []).forEach((i) => add(p.label, i)); if (p.error) add(p.label, { kind: 'could not open', el: p.error.slice(0, 100) }); if (p.missing) add(p.label, { kind: 'could not open', el: `${p.missing} not found` }); });
  if (r.main.overflow) add('page', { kind: 'overflow', el: `${r.main.overflow}px wide` });
  r.errors.forEach((e) => add('page', { kind: 'error', el: e.slice(0, 120) }));
});
console.log(`\n${seen.size} distinct issues`);
[...seen.entries()].sort().forEach(([k, v]) => console.log(`  ${k} @ ${[...v].join(', ')}`));
const out = arg('json', '');
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
process.exit(0);
