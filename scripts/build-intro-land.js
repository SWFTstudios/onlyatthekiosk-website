#!/usr/bin/env node
/**
 * Land mask for the home page's load intro (the dotted globe inline in
 * index.html). The intro scatters N points evenly over the sphere (a
 * Fibonacci lattice, which the page rebuilds from the index alone) and draws
 * the ones on land, and so does the dotted Earth under the globe hero
 * (js/kiosk-dotearth.js). This marks which ones those are, from the Natural
 * Earth coastlines in data/land-110m.geojson, as a base64 bitset (1 bit per
 * point, ~1.5 KB) and writes it into both files between the LAND markers.
 *
 *   node scripts/build-intro-land.js
 *
 * Re-run only if N changes (keep it in step with N in both files).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const N = 9000;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Point i of the lattice as [lat, lon] in degrees (same formula as the page)
function point(i) {
  const y = 1 - ((i + 0.5) / N) * 2;
  const lon = ((((i * GOLDEN) * 180) / Math.PI) % 360 + 540) % 360 - 180;
  return [(Math.asin(y) * 180) / Math.PI, lon];
}

// Even-odd ray cast over every ring (holes included)
const gj = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'land-110m.geojson'), 'utf8'));
const rings = [];
gj.features.forEach((f) => {
  const g = f.geometry || {};
  const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
  polys.forEach((poly) => poly.forEach((ring) => rings.push(ring)));
});
function onLand(lat, lon) {
  let inside = false;
  rings.forEach((ring) => {
    for (let a = 0, b = ring.length - 1; a < ring.length; b = a, a += 1) {
      const [xa, ya] = ring[a]; const [xb, yb] = ring[b];
      if ((ya > lat) !== (yb > lat) && lon < ((xb - xa) * (lat - ya)) / (yb - ya) + xa) inside = !inside;
    }
  });
  return inside;
}

const bits = Buffer.alloc(Math.ceil(N / 8));
let land = 0;
for (let i = 0; i < N; i += 1) {
  const [lat, lon] = point(i);
  // Antarctica's dots crowd the bottom of the ball without adding much
  if (lat > -62 && onLand(lat, lon)) { bits[i >> 3] |= 1 << (i & 7); land += 1; }
}
const b64 = bits.toString('base64');

const re = /(\/\*LAND\*\/')[A-Za-z0-9+/=]*('\/\*LAND\*\/)/;
['index.html', 'js/kiosk-dotearth.js'].forEach((rel) => {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  if (!re.test(src)) { console.error(`LAND markers not found in ${rel}`); process.exit(1); }
  fs.writeFileSync(file, src.replace(re, `$1${b64}$2`));
});
console.log(`intro land mask: ${land}/${N} points on land, ${b64.length} chars`);
