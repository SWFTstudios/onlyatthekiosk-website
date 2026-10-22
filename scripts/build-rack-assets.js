// Builds the clothing-rack cutouts for the shop's Rack view (vault.html):
// transparent front + side views of each launch piece on one shared KIOSK
// hanger, every one on the same 1086x1448 canvas so hooks land on the rail
// at the same point. Fronts come from the existing transparent renders in
// images/shop/3d/ where they exist, otherwise from the vector mockups
// (js/kiosk-mockups.js) rasterised like scripts/render-3d-flat.js. Sides are
// derived profiles of the front (see docs note in data/rack-manifest.json):
// a true photographed side replaces a file with the same name, no code change.
//
// Usage: node scripts/build-rack-assets.js [product-id-filter]
// Writes: images/shop/rack/<id>-0-front.webp, <id>-0-side.webp,
//         images/shop/rack/hanger-master.png, hanger-side-master.png,
//         data/rack-manifest.json (hook/neck/hem measurements per piece)
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'images/shop/rack');
const W = 1086;
const H = 1448;
const HOOK_X = 543;            // hook contact point, px (50% of canvas)
const GARMENT_TOP = 216;       // garment content top, px
const SPLIT_Y = 262;           // crest/body split, px (= neckY 18.1%)
const FRONT_CONTENT_W = 880;   // garment width in the front view, px
const SIDE_CONTENT_W = 500;    // garment width inside the side canvas, px
const INK = '#2b2b30';
const INK_HI = '#7a7a82';

// Launch set: one hanger per product, lead colourway (index 0).
// source: an existing transparent render, or 'mockup' to rasterise the
// product's vector mockup. `sideSource` only when it differs from source.
const PIECES = [
  { id: 'ess-tee', source: 'images/shop/3d/ess-tee-0.webp' },
  { id: 'ess-hoodie', source: 'images/shop/3d/ess-hoodie-0.webp' },
  { id: 'hoodie-garage', source: 'images/shop/3d/hoodie-garage-0.webp' },
  { id: 'tee-hudson', source: 'images/shop/3d/tee-hudson-0.webp' },
  { id: 'tee-phonk', source: 'images/shop/3d/tee-phonk-0.webp' },
  { id: 'tee-q-direction', source: 'images/shop/3d/tee-q-direction-0-back.webp', sideSource: 'images/shop/3d/tee-q-direction-0-front.webp' },
  { id: 'hoodie-q-exist', source: 'images/shop/3d/hoodie-q-exist-0-back.webp', sideSource: 'images/shop/3d/hoodie-q-exist-0-front.webp' },
  { id: 'ls-issue01', source: 'mockup' },
  { id: 'crew-cafe', source: 'mockup' },
  { id: 'tee-002-stack', source: 'mockup' },
  { id: 'tee-003-terminal', source: 'mockup' },
  { id: 'tee-004-orbit', source: 'mockup' },
  { id: 'tee-005-liftoff', source: 'mockup' },
  { id: 'hoodie-002-stamp', source: 'mockup' },
  { id: 'hoodie-003-bar', source: 'mockup' },
  { id: 'globe-hoodie', source: 'mockup' },
];

const hangerSvg = (side) => {
  const half = side ? 48 : 326;
  const bar = side ? '' : `M${HOOK_X - half} 292 L${HOOK_X + half} 292`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g fill="none" stroke="${INK}" stroke-linecap="round">
    <path d="M${HOOK_X} 148 C${HOOK_X} 104 ${HOOK_X - 40} 100 ${HOOK_X - 40} 62 C${HOOK_X - 40} 36 ${HOOK_X - 20} 20 ${HOOK_X} 20 C${HOOK_X + 20} 20 ${HOOK_X + 36} 32 ${HOOK_X + 36} 48" stroke-width="13"/>
    <path d="M${HOOK_X} 148 L${HOOK_X - half} 292 M${HOOK_X} 148 L${HOOK_X + half} 292 ${bar}" stroke-width="17"/>
  </g>
  <g fill="none" stroke="${INK_HI}" stroke-linecap="round" opacity="0.65">
    <path d="M${HOOK_X - 4} 144 L${HOOK_X - half + 4} 286 M${HOOK_X - 4} 144 L${HOOK_X + half - 4} 286" stroke-width="4"/>
  </g>
  <circle cx="${HOOK_X}" cy="150" r="11" fill="${INK}"/>
</svg>`;
};

const blank = () => sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

async function garmentBuffer(srcPath) {
  // Cut the soft drop shadow baked into the source renders: faint alpha
  // would otherwise hang around each garment as a dark halo on the rail.
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) data[i] = 0; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function buildView(garmentPng, contentW, contentH, hangerPng, hookCropPng) {
  const garment = await sharp(garmentPng).resize(contentW, contentH).png().toBuffer();
  // Hanger behind the garment (it sits inside the piece, as on a real rail);
  // only the hook and post are redrawn over the collar.
  const out = await blank()
    .composite([
      { input: hangerPng, left: 0, top: 0 },
      { input: garment, left: Math.round(HOOK_X - contentW / 2), top: GARMENT_TOP },
      { input: hookCropPng, left: HOOK_X - 73, top: 0 },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, bottomY: ((GARMENT_TOP + contentH) / H) * 100 };
}

const hookCrop = (hangerPng) => sharp(hangerPng).extract({ left: HOOK_X - 73, top: 0, width: 146, height: 236 }).png().toBuffer();

async function mockupSources(ids) {
  const { chromium } = require('playwright');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(8971, r));
  const tmp = fs.mkdtempSync(path.join(OUT, '.mock-'));
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1920 } });
    await page.goto('http://localhost:8971/vault.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const id of ids) {
      await page.evaluate((pid) => {
        const prod = window.KIOSK_CONTENT.products.find((x) => x.id === pid);
        const way = prod.colorways[0] || {};
        const spec = way.mockup ? { ...prod.mockup, ...way.mockup } : prod.mockup;
        document.body.innerHTML = `<div id="r" style="position:fixed;inset:0;width:1600px;height:1920px">${window.KioskMockup.render(spec, way)}</div>`;
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
        document.querySelectorAll('ellipse[fill^="url(#shadow"]').forEach((e) => e.remove());
        document.querySelectorAll('path[stroke-width="16"],path[stroke-width="12"],path[stroke-width="18"]').forEach((e) => { if (/rgba\((255,255,255,\.05|0,0,0,\.035)\)/.test(e.getAttribute('stroke'))) e.remove(); });
        const s = document.querySelector('#r svg');
        s.setAttribute('width', 1600);
        s.setAttribute('height', 1920);
      }, id);
      await page.waitForTimeout(120);
      await page.locator('#r').screenshot({ path: path.join(tmp, `${id}.png`), omitBackground: true });
    }
    await browser.close();
  } finally {
    server.close();
  }
  return tmp;
}

(async () => {
  const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
  const pieces = PIECES.filter((p) => !filter || filter.test(p.id));
  fs.mkdirSync(OUT, { recursive: true });

  const hangerFront = await sharp(Buffer.from(hangerSvg(false))).png().toBuffer();
  const hangerSide = await sharp(Buffer.from(hangerSvg(true))).png().toBuffer();
  fs.writeFileSync(path.join(OUT, 'hanger-master.png'), hangerFront);
  fs.writeFileSync(path.join(OUT, 'hanger-side-master.png'), hangerSide);

  const mockIds = pieces.filter((p) => p.source === 'mockup').map((p) => p.id);
  const tmp = mockIds.length ? await mockupSources(mockIds) : null;

  const manifestPath = path.join(ROOT, 'data/rack-manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  manifest.canvas = { width: W, height: H };
  manifest.note = 'hookX/neckY/bottomY in % of the 1086x1448 canvas. Side views are derived profiles of the front; replace a -side.webp with a photographed/true side of the same name when one exists.';
  manifest.pieces = manifest.pieces || {};

  for (const piece of pieces) {
    const frontSrc = piece.source === 'mockup' ? path.join(tmp, `${piece.id}.png`) : path.join(ROOT, piece.source);
    const sideSrc = piece.sideSource ? path.join(ROOT, piece.sideSource) : frontSrc;
    const frontGarment = await garmentBuffer(frontSrc);
    const sideGarment = sideSrc === frontSrc ? frontGarment : await garmentBuffer(sideSrc);
    const frontH = Math.round((frontGarment.info.height / frontGarment.info.width) * FRONT_CONTENT_W);
    const front = await buildView(frontGarment.data, FRONT_CONTENT_W, frontH, hangerFront, await hookCrop(hangerFront));
    const side = await buildView(sideGarment.data, SIDE_CONTENT_W, Math.round(frontH * 0.99), hangerSide, await hookCrop(hangerSide));
    const base = path.join(OUT, `${piece.id}-0`);
    // Exported at 900px wide (2x the widest the rack ever shows a garment);
    // the 1086x1448 template percentages in the manifest still hold.
    await sharp(front.buffer).resize(900).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(`${base}-front.webp`);
    await sharp(side.buffer).resize(900).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(`${base}-side.webp`);
    manifest.pieces[piece.id] = {
      front: `images/shop/rack/${piece.id}-0-front.webp`,
      side: `images/shop/rack/${piece.id}-0-side.webp`,
      hookX: 50,
      neckY: Math.round((SPLIT_Y / H) * 1000) / 10,
      bottomY: Math.round(Math.max(front.bottomY, side.bottomY) * 10) / 10,
      source: piece.source,
    };
    console.log(piece.id, 'bottomY', manifest.pieces[piece.id].bottomY);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Rack assets written to images/shop/rack/, measurements in data/rack-manifest.json');
})().catch((e) => { console.error(e); process.exit(1); });
