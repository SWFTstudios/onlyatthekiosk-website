import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
const OUT = path.resolve('artifacts/globe-bento');
fs.mkdirSync(OUT, { recursive: true });

async function cardOverflow(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.k-stream__card')];
    const issues = [];
    for (const card of cards.slice(0, 40)) {
      const media = card.querySelector('.k-stream__card-media');
      const meta = card.querySelector('.k-stream__card-meta');
      const cr = card.getBoundingClientRect();
      if (cr.width < 40) issues.push({ type: 'narrow-card', w: cr.width });
      if (media) {
        const mr = media.getBoundingClientRect();
        if (mr.width > cr.width + 2) issues.push({ type: 'media-wider', mw: mr.width, cw: cr.width });
      }
      if (meta) {
        const b = meta.querySelector('b');
        if (b && b.scrollWidth > b.clientWidth + 4 && getComputedStyle(b).textOverflow !== 'ellipsis') {
          issues.push({ type: 'title-spill' });
        }
      }
    }
    // Adjacent cards in first rail should not overlap
    const firstRail = document.querySelector('.k-stream__row .k-hscroll');
    if (firstRail) {
      const kids = [...firstRail.children].slice(0, 4).map((el) => el.getBoundingClientRect());
      for (let i = 1; i < kids.length; i++) {
        if (kids[i].left < kids[i - 1].right - 1) {
          issues.push({
            type: 'overlap',
            a: kids[i - 1].right,
            b: kids[i].left,
          });
        }
      }
    }
    return issues.slice(0, 8);
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of [
  { name: '390', width: 390, height: 844 },
  { name: '820', width: 820, height: 1180 },
  { name: '1440', width: 1440, height: 900 },
]) {
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('kiosk:sky', '1');
    } catch (e) {}
  });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-globe-hero]', { timeout: 15000 });
  await page.waitForTimeout(1800);

  await page.screenshot({ path: path.join(OUT, `stream-${vp.name}-hero.png`) });

  await page.evaluate(() => {
    const hero = document.querySelector('[data-globe-hero]');
    const run = Math.max(0, hero.offsetHeight - innerHeight);
    scrollTo(0, hero.offsetTop + run * 0.75);
  });
  await page.waitForTimeout(700);
  const fly = await page.evaluate(() =>
    document.querySelector('[data-globe-hero]')?.style.getPropertyValue('--gh-fly')
  );
  await page.screenshot({ path: path.join(OUT, `stream-${vp.name}-fly.png`) });

  await page.evaluate(() => {
    const f = document.querySelector('[data-club-feature]');
    if (f) f.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(800);
  const slides = await page.locator('[data-feature-slide]').count();
  const rows = await page.locator('.k-stream__row').count();
  const featureW = await page.evaluate(() => {
    const f = document.querySelector('[data-club-feature]');
    return f ? f.getBoundingClientRect().width : 0;
  });
  await page.screenshot({ path: path.join(OUT, `stream-${vp.name}-feature.png`) });

  await page.evaluate(() => {
    const r = document.querySelector('[data-club-rails]');
    if (r) r.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  const overflow = await cardOverflow(page);
  await page.screenshot({ path: path.join(OUT, `stream-${vp.name}-rails.png`) });

  results.push({
    vp: vp.name,
    fly,
    slides,
    rows,
    featureW,
    overflow,
    errors: errors.length,
    errSample: errors.slice(0, 3),
  });
  await context.close();
}

// Light smoke: other key pages load + have hscroll without pageerrors
const smokePages = ['films.html', 'atlas.html', 'the-garage.html', 'radio.html', 'vault.html'];
const smoke = [];
for (const name of smokePages) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${name}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  const hscroll = await page.locator('.k-hscroll').count();
  await page.screenshot({ path: path.join(OUT, `smoke-390-${name.replace('.html', '')}.png`) });
  smoke.push({ name, hscroll, errors: errors.length, errSample: errors.slice(0, 2) });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ results, smoke }, null, 2));

const failHome = results.filter(
  (r) =>
    r.slides < 3 ||
    r.rows < 3 ||
    (r.vp === '1440' && r.featureW < 1000) ||
    r.errors ||
    (r.overflow && r.overflow.length)
);
const failSmoke = smoke.filter((s) => s.errors);
if (failHome.length || failSmoke.length) {
  console.error('FAIL', { failHome, failSmoke });
  process.exit(1);
}
console.log('PASS');
