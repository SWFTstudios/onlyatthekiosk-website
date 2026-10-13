// Renders tee/hoodie mockups flat at 1600x1920 with transparent backgrounds, one PNG per colourway.
// Usage: python3 -m http.server 8765 (repo root), then: node scripts/render-3d-flat.js <outDir>
// Then shade each with scripts/render-3d-shade.py.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8765/vault.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const jobs = await p.evaluate(() => window.KIOSK_CONTENT.products
    .filter((x) => ['tee', 'hoodie'].includes((x.mockup || {}).type))
    .flatMap((x) => x.colorways.map((c, i) => ({ id: x.id, i, name: c.name }))));
  for (const j of jobs) {
    await p.evaluate(({ id, i }) => {
      const prod = window.KIOSK_CONTENT.products.find((x) => x.id === id);
      document.body.innerHTML = `<div id="r" style="position:fixed;inset:0;width:1600px;height:1920px">${window.KioskMockup.render(prod.mockup, prod.colorways[i])}</div>`;
      document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent';
      document.querySelectorAll('ellipse[fill^="url(#shadow"]').forEach((e) => e.remove());
      document.querySelectorAll('path[stroke-width="16"],path[stroke-width="12"],path[stroke-width="18"]').forEach((e) => { if (/rgba\((255,255,255,\.05|0,0,0,\.035)\)/.test(e.getAttribute('stroke'))) e.remove(); });
      const s = document.querySelector('#r svg'); s.setAttribute('width', 1600); s.setAttribute('height', 1920);
    }, j);
    await p.waitForTimeout(100);
    await p.locator('#r').screenshot({ path: `${out}/${j.id}--${j.i}.png`, omitBackground: true });
  }
  console.log(JSON.stringify(jobs));
  await b.close();
})();
