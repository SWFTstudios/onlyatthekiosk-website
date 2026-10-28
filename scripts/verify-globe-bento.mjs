import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
const OUT = path.resolve('artifacts/globe-bento');
fs.mkdirSync(OUT, { recursive: true });

const widths = [
  { name: '390', width: 390, height: 844 },
  { name: '820', width: 820, height: 1180 },
  { name: '1440', width: 1440, height: 900 },
];
const phases = [
  { name: '0-hero', p: 0 },
  { name: '02-pull', p: 0.2 },
  { name: '05-spin', p: 0.5 },
  { name: '08-dive', p: 0.8 },
  { name: '1-black', p: 1 },
  { name: 'bento', p: 'bento' },
];

async function shot(page, label) {
  const file = path.join(OUT, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('shot', label);
}

async function scrollHero(page, p) {
  const y = await page.evaluate((progress) => {
    const hero = document.querySelector('[data-globe-hero]');
    if (!hero) return 0;
    if (progress === 'bento') {
      const b = document.querySelector('.k-bento');
      return b ? b.offsetTop + 40 : 0;
    }
    const run = Math.max(0, hero.offsetHeight - window.innerHeight);
    return hero.offsetTop + run * progress;
  }, p);
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(700);
}

async function runCase(browser, { name, width, height }, mode) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    // Local python http.server has no /api/* — ignore those resource failures
    if (/\/api\/|501 \(Unsupported|404 \(File not found\)/.test(t)) return;
    errors.push(t);
  });

  // First visit: clear sky flag so flight can run; return visit: set it
  await page.addInitScript((m) => {
    try {
      if (m === 'return') sessionStorage.setItem('kiosk:sky', '1');
      else sessionStorage.removeItem('kiosk:sky');
      if (m === 'reduced') {
        localStorage.setItem('kiosk:prefs', JSON.stringify({ motion: 'reduced', intro: 'off' }));
      } else {
        const prefs = JSON.parse(localStorage.getItem('kiosk:prefs') || '{}');
        prefs.motion = 'full';
        prefs.intro = 'on';
        localStorage.setItem('kiosk:prefs', JSON.stringify(prefs));
      }
    } catch (e) {}
  }, mode);

  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for globe hero mount
  await page.waitForSelector('[data-globe-hero]', { timeout: 15000 });
  await page.waitForTimeout(mode === 'first' ? 3500 : 1800);

  const hasEarth = await page.evaluate(() => {
    const c = document.querySelector('[data-gh-earth]');
    return !!(c && c.classList.contains('is-ready'));
  });
  const modeAttr = await page.getAttribute('[data-globe-hero]', 'data-gh-mode');
  const classes = await page.getAttribute('[data-globe-hero]', 'class');
  console.log(`[${name}/${mode}] earth=${hasEarth} mode=${modeAttr} class=${classes}`);

  for (const ph of phases) {
    await scrollHero(page, ph.p);
    await shot(page, `${name}-${mode}-${ph.name}`);
  }

  // Drag sanity: pointer on fx canvas
  if (mode !== 'reduced') {
    const box = await page.locator('[data-gh-fx]').boundingBox();
    if (box) {
      await scrollHero(page, 0.45);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      const dragging = await page.evaluate(() => document.querySelector('[data-globe-hero]')?.classList.contains('is-dragging'));
      console.log(`[${name}/${mode}] after-drag is-dragging=${dragging}`);
    }
  }

  const tileCount = await page.locator('.k-bento__tile').count();
  console.log(`[${name}/${mode}] bento tiles=${tileCount} errors=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 8).join('\n'));
  await context.close();
  return { name, mode, hasEarth, tileCount, errors };
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const vp of widths) {
  for (const mode of ['return', 'first', 'reduced']) {
    // Only full matrix for 390; narrower set for others to save time
    if (vp.name !== '390' && mode === 'first') continue;
    results.push(await runCase(browser, vp, mode));
  }
}
await browser.close();
const bad = results.filter((r) => r.errors.length || r.tileCount < 7 || (r.mode !== 'reduced' && !r.hasEarth));
console.log('SUMMARY', JSON.stringify(results.map((r) => ({ ...r, errors: r.errors.length })), null, 2));
if (bad.length) {
  console.error('FAIL', bad.map((b) => `${b.name}/${b.mode}`).join(', '));
  process.exit(1);
}
console.log('PASS');
