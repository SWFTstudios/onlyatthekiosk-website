#!/usr/bin/env node
/**
 * Mobile screenshot audit for KIOSK production pages.
 * Usage: node scripts/mobile-screenshot-audit.js [--phase=before|after] [--base-url=http://localhost:3000]
 */

const fs = require('fs');
const path = require('path');

const PAGES = [
  'index.html',
  'store.html',
  'media.html',
  'about.html',
  'contact.html',
  'faq.html',
  'members.html',
  'privacy-cookies.html',
  'shipping-returns.html',
  'terms-conditions.html',
  'do-not-sell.html',
  'shop-tshirts-hoodies.html',
  'shop-bracelets-chains.html',
  'carousel-template.html',
  'kiosk-styleguide.html',
  'collections/t-shirts.html',
  'collections/hoodies.html',
  'collections/chains.html',
  'collections/bracelets.html',
];

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
];

function parseArgs() {
  const args = { phase: 'after', baseUrl: 'http://localhost:3000' };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--phase=')) args.phase = arg.split('=')[1];
    if (arg.startsWith('--base-url=')) args.baseUrl = arg.replace('--base-url=', '');
  }
  return args;
}

function slugFromPage(page) {
  return page.replace(/\.html$/, '').replace(/\//g, '-');
}

async function main() {
  const { phase, baseUrl } = parseArgs();
  const outRoot = path.join(__dirname, '..', 'artifacts', 'screenshots', phase);
  fs.mkdirSync(outRoot, { recursive: true });

  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.error('Playwright not installed. Run: npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const results = [];

  for (const pagePath of PAGES) {
    const slug = slugFromPage(pagePath);
    const pageDir = path.join(outRoot, slug);
    fs.mkdirSync(pageDir, { recursive: true });

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      const url = `${baseUrl}/${pagePath}`;

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);

        const defaultPath = path.join(pageDir, `${vp.name}-default.png`);
        await page.screenshot({ path: defaultPath, fullPage: true });

        const hasOverflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth > el.clientWidth + 1;
        });

        results.push({ page: pagePath, viewport: vp.name, state: 'default', overflow: hasOverflow, file: defaultPath });

        // Menu open state
        const menuToggle = page.locator('[data-underlay-nav-toggle]');
        if (await menuToggle.count()) {
          await menuToggle.click();
          await page.waitForTimeout(600);
          const menuPath = path.join(pageDir, `${vp.name}-menu-open.png`);
          await page.screenshot({ path: menuPath, fullPage: true });
          results.push({ page: pagePath, viewport: vp.name, state: 'menu-open', file: menuPath });
          await menuToggle.click();
          await page.waitForTimeout(400);
        }

        // Email modal (index only)
        if (pagePath === 'index.html' && vp.name === '375') {
          const notifyBtn = page.locator('#notify-me-btn');
          if (await notifyBtn.count()) {
            await notifyBtn.click();
            await page.waitForTimeout(500);
            const modalPath = path.join(pageDir, `${vp.name}-email-modal.png`);
            await page.screenshot({ path: modalPath, fullPage: true });
            results.push({ page: pagePath, viewport: vp.name, state: 'email-modal', file: modalPath });
            const closeBtn = page.locator('.email-modal-close, [data-email-modal-close]');
            if (await closeBtn.count()) await closeBtn.first().click();
          }
        }
      } catch (err) {
        results.push({ page: pagePath, viewport: vp.name, error: err.message });
        console.error(`Failed: ${pagePath} @ ${vp.name}px — ${err.message}`);
      }

      await context.close();
    }
  }

  await browser.close();

  const reportPath = path.join(outRoot, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const overflows = results.filter((r) => r.overflow);
  console.log(`\nScreenshot audit (${phase}) complete. ${results.length} captures.`);
  if (overflows.length) {
    console.log(`Horizontal overflow detected on ${overflows.length} page/viewport combos:`);
    overflows.forEach((r) => console.log(`  - ${r.page} @ ${r.viewport}px`));
  } else {
    console.log('No horizontal overflow detected at tested viewports.');
  }
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
