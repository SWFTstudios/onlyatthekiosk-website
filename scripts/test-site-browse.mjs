#!/usr/bin/env node
/**
 * Site-wide browse smoke: home globe intro + primary pages load without pageerrors.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = process.cwd();
const PORT = 8771;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const PAGES = [
  'index.html',
  'atlas.html',
  'films.html',
  'radio.html',
  'vault.html',
  'store.html',
  'archive.html',
  'about.html',
  'contact.html',
  'faq.html',
  'members.html',
  'the-garage.html',
  'partner.html',
  'lost-and-found.html',
  'account.html',
];

const noise = (e) => {
  const s = String(e);
  return /\/api\//.test(s) || /favicon/.test(s) || /Failed to load resource/i.test(s)
    || /\b404\b/.test(s) || /net::ERR/i.test(s) || /spotify/i.test(s);
};

const server = createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = join(ROOT, url.replace(/^\//, ''));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ],
});
const fails = [];
const ok = (name) => console.log('  ✓', name);
const bad = (name, err) => { console.log('  ✗', name, err); fails.push(name); };
const skip = (name, why) => console.log('  ~', name, `(${why})`);

console.log('Site browse smoke');

/* ---- Home globe intro (first visit this session) ---- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.removeItem('kiosk:sky');
      localStorage.setItem('kiosk:prefs', JSON.stringify({ intro: 'once', motion: 'full' }));
      localStorage.setItem('kiosk:onboarded', 'true');
    } catch (e) { /* storage blocked */ }
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const webgl = await p.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  });

  if (!webgl) {
    skip('home intro', 'WebGL unavailable in this browser — page browse still runs');
    await p.waitForSelector('.k-gh', { timeout: 5000 });
    ok('home: globe section present (flat fallback ok)');
  } else {
    try {
      await p.waitForSelector('.k-gh.is-flying', { timeout: 12000 });
      ok('home intro: is-flying');
    } catch (e) {
      bad('home intro: is-flying', e.message || e);
    }
    try {
      await p.waitForSelector('.k-gh.is-hero', { timeout: 20000 });
      ok('home intro: is-hero');
    } catch (e) {
      bad('home intro: is-hero', e.message || e);
    }
    try {
      await p.waitForSelector('.k-gh.is-settled', { timeout: 8000 });
      ok('home intro: is-settled');
    } catch (e) {
      bad('home intro: is-settled', e.message || e);
    }
    const earth = await p.locator('[data-gh-earth]').count();
    if (earth) ok('home intro: earth present');
    else bad('home intro: earth present', 'missing');
    const sky = await p.evaluate(() => sessionStorage.getItem('kiosk:sky'));
    if (sky === '1') ok('home intro: kiosk:sky marked after settle');
    else bad('home intro: kiosk:sky', `got ${sky}`);
  }

  const api = errors.filter((e) => !noise(e));
  if (api.length) bad('home console', api.slice(0, 3).join('; '));
  else ok('home: no console errors');
  await ctx.close();
}

/* ---- Home load intro (forced with ?intro=1: automated browsers skip it) ----
 * Its own browser without WebGL, so the software-rendered hero doesn't starve
 * the intro's timers; the location and live answers are stubbed. */
{
  const plain = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-webgl'] });
  const ctx = await plain.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('kiosk:onboarded', 'true'); } catch (e) { /* storage blocked */ }
  });
  const calls = { where: 0, live: 0 };
  await ctx.route('**/api/where', (r) => { calls.where += 1; return r.fulfill({ json: { lat: 40.68, lon: -73.94, city: 'Brooklyn', country: 'US' } }); });
  await ctx.route('**/api/live', (r) => {
    if (r.request().method() === 'POST') calls.live += 1;
    return r.fulfill({ json: { enabled: true, count: 4, viewers: [{ lat: 51.5, lon: -0.1, city: 'London', country: 'GB', n: 2 }, { lat: 34.1, lon: -118.2, city: 'Los Angeles', country: 'US', n: 1 }] } });
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  try {
    await p.goto(`${base}/index.html?intro=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForSelector('.k-intro', { state: 'visible', timeout: 3000 });
    ok('intro: shows on first visit');
    await p.waitForFunction(() => /Brooklyn/.test((document.querySelector('[data-intro-status]') || {}).textContent || ''), null, { timeout: 4000 });
    ok('intro: beacon on the visitor (Brooklyn)');
    await p.waitForFunction(() => /4 travelers/.test((document.querySelector('[data-intro-sub]') || {}).textContent || ''), null, { timeout: 4000 });
    ok('intro: live travelers counted');
    await p.waitForFunction(() => !document.querySelector('[data-intro]') && !document.documentElement.classList.contains('has-intro'), null, { timeout: 9000 });
    ok('intro: hands over to the page and removes itself');
    await p.waitForTimeout(800);
    if (calls.where === 1 && calls.live === 1) ok('intro: hero and heartbeat reuse its requests');
    else bad('intro: request reuse', `where ${calls.where}, live POST ${calls.live}`);
    const again = await p.evaluate(() => sessionStorage.getItem('kiosk:intro'));
    if (again === '1') ok('intro: marked seen for the session');
    else bad('intro: kiosk:intro', `got ${again}`);
  } catch (e) {
    bad('intro', e.message || e);
  }
  const errs = errors.filter((e) => !noise(e));
  if (errs.length) bad('intro console', errs.slice(0, 3).join('; '));
  await plain.close();
}

/* ---- Browse primary pages ---- */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('kiosk:sky', '1');
      localStorage.setItem('kiosk:onboarded', 'true');
    } catch (e) { /* storage blocked */ }
  });

  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      const res = await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!res || !res.ok()) bad(`browse ${path}`, `status ${res && res.status()}`);
      else {
        await page.waitForTimeout(500);
        const api = errors.filter((e) => !noise(e));
        if (api.length) bad(`browse ${path}`, api.slice(0, 2).join('; '));
        else ok(`browse ${path}`);
      }
    } catch (e) {
      bad(`browse ${path}`, e.message || e);
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();
server.close();

if (fails.length) {
  console.log(`\n${fails.length} failed`);
  process.exit(1);
}
console.log('\nAll browse checks passed');
