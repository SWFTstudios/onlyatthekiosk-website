#!/usr/bin/env node
/**
 * Smoke tests for accent glow, Atlas tint, Voyager nudge, radio window, TV/Flights removal.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const PORT = 8766;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
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
const browser = await chromium.launch({ headless: true });
const fails = [];
const ok = (name) => console.log('  ✓', name);
const bad = (name, err) => { console.log('  ✗', name, err); fails.push(name); };

async function page(path, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  if (opts.storage) await ctx.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, opts.storage);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(900);
  return { p, ctx, errors };
}

console.log('Accent / Radio / Removals smoke');

// 1. Guest default: no data-accent, no space glow visible
{
  const { p, ctx, errors } = await page('index.html');
  const accent = await p.evaluate(() => document.documentElement.getAttribute('data-accent'));
  const spaceOp = await p.evaluate(() => {
    const el = document.querySelector('.k-space');
    return el ? getComputedStyle(el).opacity : null;
  });
  if (!accent && spaceOp === '0') ok('guest default: no accent / space hidden');
  else bad('guest default', `accent=${accent} opacity=${spaceOp}`);
  const api = errors.filter((e) => {
    const s = String(e);
    return !/\/api\//.test(s) && !/favicon/.test(s) && !/Failed to load resource/i.test(s) && !/\b404\b/.test(s) && !/net::ERR/i.test(s);
  });
  if (api.length) bad('home console', api.slice(0, 3).join('; '));
  else ok('home: no console errors');
  await ctx.close();
}

// 2. Accent saved: glow on + voyager nudge after picking
{
  const { p, ctx } = await page('atlas.html');
  await p.click('[data-settings-open]');
  await p.waitForTimeout(300);
  await p.click('[data-pref="accent"][data-value="cobalt"]');
  await p.waitForFunction(() => {
    const a = document.documentElement.getAttribute('data-accent');
    const el = document.querySelector('.k-space');
    return a === 'cobalt' && el && Number(getComputedStyle(el).opacity) > 0.95;
  }, { timeout: 3000 });
  const accent = await p.evaluate(() => document.documentElement.getAttribute('data-accent'));
  const spaceOp = await p.evaluate(() => getComputedStyle(document.querySelector('.k-space')).opacity);
  if (accent === 'cobalt' && Number(spaceOp) > 0.9) ok('accent cobalt: glow visible');
  else bad('accent cobalt', `accent=${accent} opacity=${spaceOp}`);
  await p.click('[data-settings-close]');
  await p.waitForTimeout(900);
  const nudge = await p.locator('.k-voyager-nudge.is-open').count();
  if (nudge === 1) ok('voyager nudge shown for guest');
  else bad('voyager nudge', `count=${nudge}`);
  await p.click('[data-voyager-dismiss]');
  await p.waitForTimeout(400);
  const seen = await p.evaluate(() => localStorage.getItem('kiosk:voyager-nudge'));
  if (seen) ok('nudge flag set');
  else bad('nudge flag', 'missing');
  // second pick should not re-nag
  await p.click('[data-settings-open]');
  await p.waitForTimeout(200);
  await p.click('[data-pref="accent"][data-value="rose"]');
  await p.click('[data-settings-close]');
  await p.waitForTimeout(900);
  const nudge2 = await p.locator('.k-voyager-nudge.is-open').count();
  if (nudge2 === 0) ok('nudge does not reappear');
  else bad('nudge reappear', `count=${nudge2}`);
  await ctx.close();
}

// 3. Radio window scene
{
  const { p, ctx, errors } = await page('radio.html', { reducedMotion: 'reduce' });
  const win = await p.locator('[data-window]').count();
  const frame = await p.evaluate(() => getComputedStyle(document.querySelector('.k-window__frame')).backgroundImage);
  const cabin = await p.locator('[data-cockpit], .k-cockpit').count();
  const rick = await p.evaluate(() => [...document.styleSheets].some(() => false) || !document.body.innerHTML.includes('rick-and-morty'));
  if (win === 1 && frame.includes('window-frame') && cabin === 0) ok('radio: plane window scene');
  else bad('radio window', `win=${win} frame=${frame} cabin=${cabin}`);
  if (rick) ok('radio: no rick-and-morty in DOM');
  else bad('radio rick', 'still present');
  const settled = await p.locator('.k-window.is-settled').count();
  if (settled === 1) ok('radio: reduced motion lands settled');
  else bad('radio settled', `count=${settled}`);
  const badErr = errors.filter((e) => !/\/api\//.test(e) && !/Failed to load resource/.test(e));
  if (!badErr.length) ok('radio: no console errors');
  else bad('radio console', badErr.slice(0, 3).join('; '));
  // network: no spaceship/rick requests
  await ctx.close();
}

// 4. Removals
{
  const { p, ctx } = await page('index.html');
  await p.click('.k-nav__menu-btn');
  await p.waitForTimeout(400);
  const html = await p.locator('#k-sheet').innerHTML();
  if (!/KIOSK TV/i.test(html) && !/>Flights</i.test(html) && !/flights\.html/.test(html) && !/tv\.html/.test(html)) {
    ok('menu: no TV / Flights');
  } else bad('menu removals', 'still listed');
  await ctx.close();
}

// 5. Assets exist and small
{
  const files = ['images/radio/window-frame.webp', 'images/radio/clouds.webp', 'images/radio/below.webp'];
  let all = true;
  for (const f of files) {
    const st = statSync(join(ROOT, f));
    if (st.size > 150 * 1024) { bad('asset size', `${f} ${st.size}`); all = false; }
  }
  if (all) ok('radio assets ≤ 150KB');
}

await browser.close();
server.close();
console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
