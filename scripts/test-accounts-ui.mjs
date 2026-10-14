#!/usr/bin/env node
/**
 * Playwright checks for account sheet + cart drawer (APIs stubbed).
 * Usage: node scripts/test-accounts-ui.mjs [--base-url=http://127.0.0.1:8787]
 *
 * Expects a static server serving the site root (or dist/). If --base-url is
 * omitted, spins up a tiny static server on an ephemeral port.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parseArgs() {
  const args = { baseUrl: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length);
  }
  return args;
}

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

async function main() {
  const args = parseArgs();
  let server = null;
  let baseUrl = args.baseUrl;
  if (!baseUrl) {
    const started = await startStaticServer();
    server = started.server;
    baseUrl = started.baseUrl;
  }

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Playwright not installed. Run: npm install -D playwright && npx playwright install chromium');
    if (server) server.close();
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const meSignedOut = { enabled: true, user: null, wishlist: [], cart: null, orders: [] };
  const meSignedIn = {
    enabled: true,
    user: { id: 'u1', email: 'test@example.com', firstName: 'Tes', shopifyCustomerId: 'gid://shopify/Customer/1' },
    wishlist: [{ kind: 'story', ref: 'demo', createdAt: '2026-01-01' }],
    cart: {
      id: 'gid://shopify/Cart/1',
      checkoutUrl: 'https://example.com/checkout',
      totalQuantity: 1,
      cost: { amount: '40.00', currencyCode: 'USD' },
      lines: [{
        id: 'line1', quantity: 1, title: 'Test Tee', variantTitle: 'M',
        image: null, price: { amount: '40.00', currencyCode: 'USD' }, options: [{ name: 'Size', value: 'M' }],
      }],
    },
    orders: [],
  };

  let signedIn = false;

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/me')) {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedIn ? meSignedIn : meSignedOut),
      });
      return;
    }
    if (url.includes('/api/cart')) {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: meSignedIn.cart }),
      });
      return;
    }
    if (url.includes('/api/wishlist')) {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: meSignedIn.wishlist }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'stub' }),
    });
  });

  page.on('pageerror', (err) => console.error('  pageerror', err.message));

  const failures = [];
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`  ok  ${name}`);
    } catch (err) {
      failures.push(name);
      console.error(`  FAIL ${name}: ${err.message}`);
    }
  };

  const waitReady = async () => {
    await page.waitForFunction(() => window.KIOSK_ACCOUNT && typeof window.KIOSK_ACCOUNT.getState === 'function', null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const s = window.KIOSK_ACCOUNT.getState();
      return s && s.loading === false;
    }, null, { timeout: 10000 });
  };

  console.log(`Accounts UI @ ${baseUrl}`);

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await waitReady();

  await check('account chrome enabled when /api/me says so', async () => {
    const info = await page.evaluate(() => {
      const s = window.KIOSK_ACCOUNT.getState();
      const btn = document.querySelector('header [data-account-open]');
      return {
        enabled: s.enabled,
        hiddenAttr: btn ? btn.hasAttribute('hidden') : null,
        hasHiddenClass: btn ? btn.classList.contains('is-hidden') : null,
      };
    });
    if (!info.enabled) throw new Error(`expected enabled, got ${JSON.stringify(info)}`);
    if (info.hiddenAttr || info.hasHiddenClass) throw new Error(`button still hidden: ${JSON.stringify(info)}`);
  });

  await check('open and close account sheet', async () => {
    await page.evaluate(() => window.KIOSK_ACCOUNT.openAccount());
    await page.locator('#k-account.is-open').waitFor({ timeout: 3000 });
    await page.locator('#k-account [data-account-close]').first().click();
    await page.waitForTimeout(300);
    const open = await page.locator('#k-account.is-open').count();
    if (open) throw new Error('sheet still open');
  });

  await check('open and close cart drawer', async () => {
    signedIn = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady();
    await page.evaluate(() => window.KIOSK_ACCOUNT.openCart());
    await page.locator('#k-cart.is-open').waitFor({ timeout: 3000 });
    await page.locator('#k-cart [data-cart-close]').first().click();
    await page.waitForTimeout(300);
    const open = await page.locator('#k-cart.is-open').count();
    if (open) throw new Error('cart still open');
  });

  await check('no horizontal overflow at 390px', async () => {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    if (overflow) throw new Error('horizontal overflow');
  });

  await check('account page renders signed-in dashboard', async () => {
    signedIn = true;
    await page.goto(`${baseUrl}/account.html`, { waitUntil: 'domcontentloaded' });
    await waitReady();
    const text = await page.locator('[data-mount="account"]').innerText();
    if (!/test@example.com/i.test(text) && !/Wishlist/i.test(text)) {
      throw new Error(`dashboard missing expected content: ${text.slice(0, 200)}`);
    }
  });

  await browser.close();
  if (server) server.close();

  console.log(`\n${failures.length ? 'FAILED' : 'PASSED'} (${failures.length} failures)`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
