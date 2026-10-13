// Renders tee/hoodie mockups flat at 1600x1920 with transparent backgrounds, one PNG per colourway.
// Usage: python3 -m http.server 8765 (repo root), then: node scripts/render-3d-flat.js <outDir>
// Then shade each with scripts/render-3d-shade.py.
const { chromium } = require('playwright');
const out = process.argv[2];
const ONLY = process.argv[3] ? new RegExp(process.argv[3]) : null;   // optional product id filter
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8765/vault.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const all = await p.evaluate(() => window.KIOSK_CONTENT.products
    .filter((x) => ['tee', 'hoodie'].includes((x.mockup || {}).type))
    // Quote pieces render twice: front (small chest K) and back (the quote)
    .flatMap((x) => x.colorways.flatMap((c, i) => (x.mockup.quote ? ['front', 'back'] : ['']).map((side) => ({ id: x.id, i, name: c.name, side })))));
  const jobs = all.filter((j) => !ONLY || ONLY.test(j.id));
  for (const j of jobs) {
    await p.evaluate(({ id, i, side }) => {
      const prod = window.KIOSK_CONTENT.products.find((x) => x.id === id);
      const spec = side === 'back' ? { ...prod.mockup, side: 'back' } : prod.mockup;
      document.body.innerHTML = `<div id="r" style="position:fixed;inset:0;width:1600px;height:1920px">${window.KioskMockup.render(spec, prod.colorways[i])}</div>`;
      document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent';
      document.querySelectorAll('ellipse[fill^="url(#shadow"]').forEach((e) => e.remove());
      document.querySelectorAll('path[stroke-width="16"],path[stroke-width="12"],path[stroke-width="18"]').forEach((e) => { if (/rgba\((255,255,255,\.05|0,0,0,\.035)\)/.test(e.getAttribute('stroke'))) e.remove(); });
      const s = document.querySelector('#r svg'); s.setAttribute('width', 1600); s.setAttribute('height', 1920);
    }, j);
    await p.waitForTimeout(100);
    await p.locator('#r').screenshot({ path: `${out}/${j.id}--${j.i}${j.side ? `--${j.side}` : ''}.png`, omitBackground: true });
  }
  console.log(JSON.stringify(jobs));
  await b.close();
})();
