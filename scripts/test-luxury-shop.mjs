#!/usr/bin/env node
/**
 * Luxury shop + Lost & Found visual / a11y smoke checks.
 * Usage: node scripts/test-luxury-shop.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'screenshots', 'luxury-shop');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.geojson': 'application/geo+json',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/') rel = '/index.html';
      const file = path.join(root, rel.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '820', width: 820, height: 1180 },
  { name: '1440', width: 1440, height: 900 },
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Playwright missing. Run: npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  const { server, baseUrl } = await startStaticServer();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true });
  let failed = 0;
  const log = (ok, msg) => {
    console.log(`${ok ? '  ok' : 'FAIL'}  ${msg}`);
    if (!ok) failed += 1;
  };

  for (const theme of ['light', 'dark']) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      await context.addInitScript((t) => {
        localStorage.setItem('kiosk:theme', JSON.stringify(t));
      }, theme);

      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      // Shop
      await page.goto(`${baseUrl}/vault.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1500);
      log(await page.locator('.k-cmd').count() > 0, `shop command bar (${theme}/${vp.name})`);
      log(await page.locator('.k-tcard').count() > 0, `shop cards (${theme}/${vp.name})`);
      const touch = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.k-tcard__wish, .k-cmd__filter .k-btn, .k-gate')];
        return btns.every((b) => {
          const r = b.getBoundingClientRect();
          return r.width >= 36 && r.height >= 36;
        });
      });
      log(touch, `shop touch targets (${theme}/${vp.name})`);
      await page.screenshot({ path: path.join(outDir, `vault-${theme}-${vp.name}.png`), fullPage: false });

      // Open first PDP if present
      const card = page.locator('[data-pdp]').first();
      if (await card.count()) {
        await card.click();
        await page.waitForTimeout(600);
        log(await page.locator('.k-pdp.is-open').count() > 0, `pdp open (${theme}/${vp.name})`);
        await page.screenshot({ path: path.join(outDir, `pdp-${theme}-${vp.name}.png`), fullPage: false });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // Filter sheet on mobile
      if (vp.width < 1000) {
        await page.locator('[data-filter-open]').click();
        await page.waitForTimeout(400);
        log(await page.locator('.k-filter.is-open').count() > 0, `filter sheet (${theme}/${vp.name})`);
        await page.screenshot({ path: path.join(outDir, `filter-${theme}-${vp.name}.png`), fullPage: false });
        await page.locator('[data-filter-close]').first().click().catch(() => {});
      }

      // Lost & Found
      await page.goto(`${baseUrl}/lost-and-found.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2500);
      log(await page.locator('.k-hmap, .k-hunt-fallback').count() > 0, `lnf map shell (${theme}/${vp.name})`);
      log(await page.locator('[data-map-style]').count() >= 5, `lnf map styles (${theme}/${vp.name})`);
      log(await page.locator('[data-mount="hunt-finds"]').count() > 0, `lnf finds panel (${theme}/${vp.name})`);
      await page.screenshot({ path: path.join(outDir, `lnf-${theme}-${vp.name}.png`), fullPage: false });

      // Switch a map style if controls exist
      const dayBtn = page.locator('[data-map-style="day"]');
      if (await dayBtn.count()) {
        await dayBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }

      const serious = errors.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
      log(serious.length === 0, `no console errors (${theme}/${vp.name})${serious.length ? ': ' + serious.slice(0, 2).join(' | ') : ''}`);

      await context.close();
    }
  }

  await browser.close();
  server.close();
  console.log(`\nScreenshots → ${outDir}`);
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
