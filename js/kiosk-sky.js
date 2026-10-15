/**
 * KIOSK — "Above the clouds" opening for the home page
 *
 *   1. Around the globe: the satellite Earth (js/kiosk-earth.js) turns while
 *      a flight hops across the world toward the visitor's own town
 *      (opts.home, from /api/where), each stop closer to home.
 *   2. Re-entry: the camera locks onto home and drops out of orbit, the
 *      land rushing up, the air thickening into the sky of the hour,
 *      until we break out high over the cloud sea and level off above it.
 *   3. The spelled-out ꓘIOSK rises from behind the clouds, tagline below.
 *   4. Scroll: ꓘIOSK flies up into the nav icon while the camera sinks into
 *      the fog until it whites out, then the layer dissolves onto the rest
 *      of the home page (below the clouds).
 *
 * Light on purpose: the globe is one WebGL2 pass (a ~4k-dot 2D globe
 * stands in without WebGL2, and on return visits nothing is loaded), the fog is one
 * full-screen WebGL pass of value noise rendered at reduced resolution,
 * and the sky is CSS. Everything stops when the layer is off screen.
 *
 *   KioskSky.mount(section, { gsap, ScrollTrigger, world, Earth, home, quick, reduced }) → { stop() }
 */
(function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* The opening flight: a few hops round the world that finish over the
   * visitor's own town (opts.home), each stop closer to home than the last. */
  const HUBS = [
    ['New York', 'JFK', 40.64, -73.78], ['Los Angeles', 'LAX', 33.94, -118.41], ['Chicago', 'ORD', 41.98, -87.9], ['Miami', 'MIA', 25.79, -80.29],
    ['Toronto', 'YYZ', 43.68, -79.63], ['Vancouver', 'YVR', 49.19, -123.18], ['Mexico City', 'MEX', 19.44, -99.07], ['Bogotá', 'BOG', 4.7, -74.15],
    ['Lima', 'LIM', -12.02, -77.11], ['São Paulo', 'GRU', -23.43, -46.47], ['Buenos Aires', 'EZE', -34.82, -58.54], ['Reykjavík', 'KEF', 63.98, -22.6],
    ['London', 'LHR', 51.47, -0.45], ['Paris', 'CDG', 49.01, 2.55], ['Lisbon', 'LIS', 38.77, -9.13], ['Madrid', 'MAD', 40.47, -3.56],
    ['Berlin', 'BER', 52.36, 13.5], ['Rome', 'FCO', 41.8, 12.25], ['Istanbul', 'IST', 41.26, 28.74], ['Lagos', 'LOS', 6.58, 3.32],
    ['Accra', 'ACC', 5.6, -0.17], ['Dakar', 'DSS', 14.67, -17.07], ['Nairobi', 'NBO', -1.32, 36.93], ['Johannesburg', 'JNB', -26.14, 28.24],
    ['Cairo', 'CAI', 30.12, 31.41], ['Casablanca', 'CMN', 33.37, -7.59], ['Dubai', 'DXB', 25.25, 55.36], ['Delhi', 'DEL', 28.56, 77.1],
    ['Mumbai', 'BOM', 19.09, 72.87], ['Bangkok', 'BKK', 13.69, 100.75], ['Singapore', 'SIN', 1.36, 103.99], ['Hong Kong', 'HKG', 22.31, 113.91],
    ['Shanghai', 'PVG', 31.14, 121.81], ['Seoul', 'ICN', 37.46, 126.44], ['Tokyo', 'HND', 35.55, 139.78], ['Sydney', 'SYD', -33.95, 151.18],
    ['Auckland', 'AKL', -37.01, 174.79], ['Honolulu', 'HNL', 21.32, -157.92], ['Anchorage', 'ANC', 61.17, -149.99],
  ].map(([n, c, la, lo]) => ({ n, c, la, lo }));
  const km = (a, b) => {
    const r = Math.PI / 180; const dLa = (b.la - a.la) * r; const dLo = (b.lo - a.lo) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dLo / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  function routeTo(home) {
    const end = { n: home.city || 'Home', c: 'YOU', la: home.lat, lo: home.lon, home: true };
    const near = HUBS.slice().sort((a, b) => km(a, end) - km(b, end))[0];
    if (km(near, end) < 60) end.c = near.c;
    const stops = [];
    // far side of the world → another continent → the region → the last hop home
    [[9000, 17000], [5000, 9000], [1800, 5000], [300, 1800]].forEach(([lo, hi]) => {
      const pool = HUBS.filter((x) => { const d = km(x, end); return d >= lo && d < hi && !stops.includes(x); });
      if (!pool.length) return;
      const prev = stops[stops.length - 1];
      stops.push(prev ? pool.sort((a, b) => km(a, prev) - km(b, prev))[Math.floor(Math.random() * Math.min(2, pool.length))]
        : pool[Math.floor(Math.random() * pool.length)]);
    });
    return stops.concat(end);
  }
  const DEFAULT_HOME = { lat: 40.71, lon: -74.0, city: 'New York' };
  const vec = (la, lo) => { const a = la * Math.PI / 180; const b = lo * Math.PI / 180; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; };
  function slerp(a, b, u) {
    const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    if (d < 1e-5) return a;
    const s = Math.sin(d); const k1 = Math.sin((1 - u) * d) / s; const k2 = Math.sin(u * d) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  /* ------------------------------------------------------- time of day
   * The sky follows the visitor's local clock: first light, sunrise, noon,
   * evening, sunset and midnight, blended smoothly between keyframes.
   * Preview any of them with ?sky=firstlight|sunrise|noon|evening|sunset|midnight
   * (or ?hour=19.5). */
  const PALETTES = {
    midnight:   { top: '#02040b', mid: '#071026', low: '#14234a', hor: '#2a3a63', sun: 'rgba(214,226,255,.42)', sx: 76, sy: 16, ss: 30, lit: [0.56, 0.63, 0.82], shade: [0.09, 0.12, 0.21], haze: [0.2, 0.27, 0.42], gnd: [0.02, 0.04, 0.05], dir: [-0.3, 0.7, 0.5], stars: 1, streak: 'rgba(160,180,230,.25)', ink: '#e9eeff' },
    firstlight: { top: '#0b1430', mid: '#28305f', low: '#8a6f9c', hor: '#f2b5a7', sun: 'rgba(255,190,170,.7)', sx: 26, sy: 58, ss: 55, lit: [0.96, 0.8, 0.84], shade: [0.29, 0.29, 0.44], haze: [0.8, 0.67, 0.73], gnd: [0.1, 0.12, 0.14], dir: [0.62, 0.12, 0.6], stars: 0.45, streak: 'rgba(255,200,210,.5)', ink: '#2a2140' },
    sunrise:    { top: '#234a8f', mid: '#6a8cc8', low: '#f0b48c', hor: '#ffd29a', sun: 'rgba(255,206,130,1)', sx: 26, sy: 55, ss: 50, lit: [1.0, 0.86, 0.69], shade: [0.44, 0.42, 0.55], haze: [0.98, 0.83, 0.71], gnd: [0.16, 0.22, 0.18], dir: [0.66, 0.24, 0.6], stars: 0, streak: 'rgba(255,225,190,.65)', ink: '#3a2826' },
    noon:       { top: '#154aa6', mid: '#2a68c9', low: '#6c9fe0', hor: '#dbe7f4', sun: 'rgba(255,255,255,.32)', sx: 78, sy: 8, ss: 70, lit: [1.0, 0.995, 0.98], shade: [0.44, 0.52, 0.66], haze: [0.8, 0.87, 0.95], gnd: [0.17, 0.29, 0.21], dir: [-0.45, 0.8, 0.4], stars: 0, streak: 'rgba(255,255,255,.7)', ink: '#13223d' },
    evening:    { top: '#1d4f9e', mid: '#4f86c9', low: '#b9c9d8', hor: '#f5dcb2', sun: 'rgba(255,214,150,.95)', sx: 74, sy: 44, ss: 60, lit: [1.0, 0.93, 0.8], shade: [0.48, 0.5, 0.6], haze: [0.93, 0.87, 0.78], gnd: [0.18, 0.26, 0.18], dir: [-0.6, 0.42, 0.6], stars: 0, streak: 'rgba(255,240,215,.7)', ink: '#2f2a24' },
    sunset:     { top: '#23305f', mid: '#6a4a86', low: '#e2766a', hor: '#ffb36b', sun: 'rgba(255,150,80,1)', sx: 70, sy: 56, ss: 55, lit: [1.0, 0.7, 0.5], shade: [0.37, 0.29, 0.45], haze: [0.98, 0.66, 0.53], gnd: [0.12, 0.1, 0.12], dir: [-0.7, 0.17, 0.7], stars: 0.1, streak: 'rgba(255,190,150,.7)', ink: '#2b1735' },
  };
  const NAMES = { midnight: 'Midnight', firstlight: 'First light', sunrise: 'Sunrise', noon: 'Noon', evening: 'Evening', sunset: 'Sunset' };
  // [hour, palette]: linear blends between neighbours
  const DAY = [[0, 'midnight'], [4, 'midnight'], [5.1, 'firstlight'], [6.0, 'firstlight'], [6.8, 'sunrise'], [7.6, 'sunrise'], [9.2, 'noon'], [15.4, 'noon'], [16.6, 'evening'], [18.1, 'evening'], [19.0, 'sunset'], [20.1, 'sunset'], [21.4, 'midnight'], [24, 'midnight']];
  const phaseAt = (h) => (h >= 4.5 && h < 6.25 ? 'firstlight' : h < 8 && h >= 6.25 ? 'sunrise' : h >= 8 && h < 16 ? 'noon' : h >= 16 && h < 18.5 ? 'evening' : h >= 18.5 && h < 20.75 ? 'sunset' : 'midnight');
  const rgb = (c) => { if (Array.isArray(c)) return c; if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; } const m = c.match(/[\d.]+/g).map(Number); return [m[0] / 255, m[1] / 255, m[2] / 255, m[3] == null ? 1 : m[3]]; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixArr = (a, b, k) => a.map((v, i) => lerp(v, b[i] == null ? v : b[i], k));
  const css = (c) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${(c[3] == null ? 1 : c[3]).toFixed(3)})`;
  function skyAt(h) {
    let i = 0; while (i < DAY.length - 2 && DAY[i + 1][0] <= h) i += 1;
    const [h0, p0] = DAY[i]; const [h1, p1] = DAY[i + 1];
    const k = h1 === h0 ? 0 : clamp((h - h0) / (h1 - h0), 0, 1);
    const A = PALETTES[p0]; const B = PALETTES[p1];
    const out = { phase: phaseAt(h) };
    ['top', 'mid', 'low', 'hor', 'sun', 'streak', 'ink'].forEach((key) => { out[key] = css(mixArr(rgb(A[key]), rgb(B[key]), k)); });
    ['lit', 'shade', 'haze', 'gnd', 'dir'].forEach((key) => { out[key] = mixArr(A[key], B[key], k); });
    ['sx', 'sy', 'ss', 'stars'].forEach((key) => { out[key] = lerp(A[key], B[key], k); });
    return out;
  }
  function localHour() {
    const q = new URLSearchParams(location.search);
    const named = { midnight: 1, firstlight: 5.4, sunrise: 7.0, noon: 12, evening: 17.2, sunset: 19.5 }[q.get('sky')];
    if (named != null) return named;
    if (q.get('hour') != null && !Number.isNaN(Number(q.get('hour')))) return ((Number(q.get('hour')) % 24) + 24) % 24;
    const d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }

  /* ------------------------------------------------------------ globe */
  function globe(canvas, G, world, ROUTE) {
    const ctx = canvas.getContext('2d');
    const raw = world ? world.points() : new Float32Array(0);
    const n = raw.length / 2;
    const P = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) { const v = vec(raw[i * 2], raw[i * 2 + 1]); P[i * 3] = v[0]; P[i * 3 + 1] = v[1]; P[i * 3 + 2] = v[2]; }
    const cities = ROUTE.map((c) => ({ ...c, v: vec(c.la, c.lo) }));
    // Close-up detail: land near the last stop gets extra jittered dots,
    // faded in as we drop toward it, so the ground never thins out
    const goal = cities[cities.length - 1].v; const near = [];
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i += 1) {
      if (P[i * 3] * goal[0] + P[i * 3 + 1] * goal[1] + P[i * 3 + 2] * goal[2] < Math.cos(0.3)) continue;
      for (let j = 0; j < 8; j += 1) {
        const la = raw[i * 2] + (rnd() - 0.5) * 1.6; const lo = raw[i * 2 + 1] + (rnd() - 0.5) * 1.6;
        near.push(...vec(la, lo));
      }
    }
    const Q = new Float32Array(near);
    // A fine lat/long survey grid around the last stop: on the way down it
    // sweeps outward and keeps the sense of speed over open ocean
    const grid = [];
    const gl0 = ROUTE[ROUTE.length - 1];
    for (let k = -12; k <= 12; k += 1) {
      const la = Math.round(gl0.la / 2) * 2 + k * 2; const lo = Math.round(gl0.lo / 2) * 2 + k * 2;
      const par = []; const mer = [];
      for (let j = -60; j <= 60; j += 1) { par.push(vec(la, gl0.lo + j * 0.5)); mer.push(vec(gl0.la + j * 0.4, lo)); }
      grid.push(par, mer);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0; let h = 0;
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); };
    resize();

    /* Perspective camera D globe radii from the centre, looking at it.
     * Far out (6) it reads as the flat dotted globe; diving toward 1 the
     * surface rushes up and the land streams out past the edges. */
    const D0 = 6; const K0 = Math.sqrt(D0 * D0 - 1); const ALT1 = 0.03;
    // G.fall 0 … 1: altitude drops on a log scale, so the plunge never stalls
    // or jumps; the globe swells to fill the screen, then the land skims past
    const dist = () => 1 + (D0 - 1) * Math.pow(ALT1 / (D0 - 1), clamp(G.fall, 0, 1));
    let lastD = dist();
    function draw(now) {
      if (G.alpha <= 0.01) { ctx.clearRect(0, 0, canvas.width, canvas.height); lastD = dist(); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const D = dist();
      const f = Math.min(w, h) * 0.34 * G.zoom * K0;           // focal length: disc radius f/sqrt(D²-1)
      const cx = w / 2; const cy = h / 2 + G.drop * h;
      const R = f / Math.sqrt(D * D - 1);                        // apparent disc radius
      const diag = Math.hypot(w, h);
      const yaw = -G.lon * Math.PI / 180; const pitch = clamp(G.lat * Math.PI / 180, -0.9, 0.9);
      const cyw = Math.cos(yaw); const syw = Math.sin(yaw); const cp = Math.cos(pitch); const sp = Math.sin(pitch);
      const rot = (x, y, z) => { const x1 = x * cyw + z * syw; const z1 = -x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
      // screen position of a rotated point at camera distance d (null when over the horizon)
      const proj = (r, d) => { const q = r[0] * r[0] + r[1] * r[1] + r[2] * r[2]; if (r[2] * d <= q + 0.002) return null; const k = f / (d - r[2]); return [cx + r[0] * k, cy - r[1] * k, k]; };
      ctx.globalAlpha = G.alpha;
      // Atmosphere halo and the night-side disc
      if (R < diag * 2) {
        const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.35);
        glow.addColorStop(0, 'rgba(120,170,255,.28)'); glow.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 6.283); ctx.fill();
        const disc = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
        disc.addColorStop(0, 'rgba(26,40,74,.95)'); disc.addColorStop(1, 'rgba(6,10,22,.95)');
        ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      } else { ctx.fillStyle = 'rgba(16,26,52,.95)'; ctx.fillRect(0, 0, w, h); }
      // Land dots; while plunging each one draws a short streak outward
      const streak = (lastD - D) / Math.max(D - 1, 0.02) > 0.004;
      const dTrail = D + (lastD - D) * 2.2;
      ctx.lineCap = 'round';
      const dots = (A, fade) => {
        for (let i = 0; i < A.length; i += 3) {
          const r = rot(A[i], A[i + 1], A[i + 2]);
          const a = proj(r, D); if (!a) continue;
          if (a[0] < -40 || a[0] > w + 40 || a[1] < -40 || a[1] > h + 40) continue;
          const s = clamp(a[2] / 260, 1, 3.4);
          const facing = clamp((r[2] * D - 1) / (D - 1), 0, 1);  // 1 straight below us, 0 at the horizon
          ctx.globalAlpha = G.alpha * fade * (0.25 + 0.75 * facing);
          if (streak) {
            const b = proj(r, dTrail);
            if (b) { ctx.strokeStyle = '#f3ead8'; ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke(); continue; }
          }
          ctx.fillStyle = facing > 0.5 ? '#f3ead8' : '#c9c2b3';
          ctx.fillRect(a[0] - s / 2, a[1] - s / 2, s, s);
        }
      };
      const gridA = clamp((2.2 - D) / 1.0, 0, 1) * 0.16;
      if (gridA > 0) {
        ctx.globalAlpha = G.alpha * gridA; ctx.strokeStyle = '#9fb8ff'; ctx.lineWidth = 1;
        ctx.beginPath();
        grid.forEach((line) => {
          let pen = false;
          line.forEach((v) => { const q = proj(rot(v[0], v[1], v[2]), D); if (!q) { pen = false; return; } if (pen) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); pen = true; });
        });
        ctx.stroke();
      }
      dots(P, 1);
      const detail = clamp((1.6 - D) / 0.9, 0, 1);
      if (detail > 0) dots(Q, detail * 0.9);
      lastD = D;
      // Flight: trail from the previous city, glowing head, city pins
      const leg = Math.min(Math.floor(G.leg), cities.length - 2);
      const u = clamp(G.leg - leg, 0, 1);
      const pin = (c, on) => {
        const pp = proj(rot(c.v[0], c.v[1], c.v[2]), D); if (!pp) return;
        const x = pp[0]; const y = pp[1];
        ctx.globalAlpha = G.alpha * (on ? 1 : 0.6);
        ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(x, y, on ? 4 : 2.5, 0, 6.283); ctx.fill();
        if (on) {
          ctx.strokeStyle = 'rgba(255,90,31,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9 + 4 * Math.sin(now / 200), 0, 6.283); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.fillText(`${c.c} · ${c.n.toUpperCase()}`, x + 12, y - 8);
        }
      };
      cities.forEach((c, i) => { if (i <= leg) pin(c, i === leg && u < 0.2); });
      ctx.lineWidth = 2;
      for (let k = 0; k <= leg; k += 1) {
        const a = cities[k].v; const b = cities[k + 1].v;
        const end = k < leg ? 1 : u;
        const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
        let prev = null;
        ctx.strokeStyle = '#ff7a3d';
        for (let j = 0; j <= 40; j += 1) {
          const t = (j / 40) * end;
          const p = slerp(a, b, t); const lift = 1 + (0.06 + d * 0.08) * Math.sin(Math.PI * t);
          const pt = proj(rot(p[0] * lift, p[1] * lift, p[2] * lift), D);
          if (prev && pt) { ctx.globalAlpha = G.alpha * (k < leg ? 0.45 : 0.95); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke(); }
          prev = pt;
        }
        if (k === leg && prev && u < 1) {
          ctx.globalAlpha = G.alpha; ctx.fillStyle = 'rgba(255,170,120,.35)'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 9, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 3.2, 0, 6.283); ctx.fill();
        }
      }
      if (u >= 0.8 || G.leg >= cities.length - 1) pin(cities[Math.min(leg + 1, cities.length - 1)], true);
      // Entry: the air thickens into the colour of the sky below
      if (G.atmo > 0.001 && G.tint) {
        const [lo, hi] = G.tint;
        const air = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag * 0.7);
        air.addColorStop(0, css([hi[0], hi[1], hi[2], 1])); air.addColorStop(1, css([lo[0], lo[1], lo[2], 1]));
        ctx.globalAlpha = G.alpha * clamp(G.atmo, 0, 1);
        ctx.fillStyle = air; ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
    }
    return { draw, resize };
  }

  /* ------------------------------------------------- satellite globe
   * The same photographic Earth as the Atlas and Flights (js/kiosk-earth.js),
   * driven by the timeline: G.lat/G.lon is the point under the camera and
   * G.fall 0 … 1 the drop from orbit (log altitude, tilting toward the
   * horizon near the ground). Flight arcs, pins and the thickening air are
   * drawn on the 2D canvas above it. */
  function satellite(earthCanvas, canvas, G, Earth, ROUTE) {
    const earth = Earth.create(earthCanvas, { view: { lat: G.lat, lon: G.lon, alt: 2, tilt: 0, fov: 0.55 }, maxDpr: 1.5, relief: 1 });
    if (!earth.gl) return null;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0; let h = 0; let alive = true;
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); };
    resize();
    const legs = ROUTE.slice(0, -1).map((a, i) => Earth.arc({ lat: a.la, lon: a.lo }, { lat: ROUTE[i + 1].la, lon: ROUTE[i + 1].lo }, 48, 0.12));
    const NEAR = 0.045;  // ~290 km up when the air takes over (lower and the imagery runs out of detail)
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    function overlay(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = G.alpha;
      const leg = Math.min(Math.floor(G.leg), legs.length - 1);
      const u = clamp(G.leg - leg, 0, 1);
      ctx.lineCap = 'round'; ctx.lineWidth = 2;
      let head = null;
      for (let k = 0; k <= leg; k += 1) {
        const end = k < leg ? 1 : u; let prev = null;
        ctx.strokeStyle = k < leg ? 'rgba(255,122,61,.55)' : '#ff7a3d';
        ctx.beginPath();
        legs[k].forEach((q) => {
          if (q.t > end) return;
          const s = earth.project(q.lat, q.lon, q.lift);
          if (!s.front) { prev = null; return; }
          if (prev) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y);
          prev = s;
        });
        ctx.stroke();
        if (k === leg && u < 1 && prev) head = prev;
      }
      if (head) {
        ctx.fillStyle = 'rgba(255,170,120,.35)'; ctx.beginPath(); ctx.arc(head.x, head.y, 9, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, 6.283); ctx.fill();
      }
      const pin = (c, on) => {
        const s = earth.project(c.la, c.lo); if (!s.front) return;
        ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(s.x, s.y, on ? 4.5 : 2.5, 0, 6.283); ctx.fill();
        if (!on) return;
        ctx.strokeStyle = 'rgba(255,90,31,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, 10 + 4 * Math.sin(now / 200), 0, 6.283); ctx.stroke();
        ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace'; ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 4;
        ctx.fillText(`${c.c} · ${String(c.n).toUpperCase()}`, s.x + 13, s.y - 9); ctx.shadowBlur = 0;
      };
      ROUTE.forEach((c, i) => { if (i <= leg) pin(c, i === leg && u < 0.2); });
      if (u >= 0.8 || G.leg >= ROUTE.length - 1) pin(ROUTE[Math.min(leg + 1, ROUTE.length - 1)], true);
      // Entry: the air thickens into the colour of the sky below
      if (G.atmo > 0.001 && G.tint) {
        const [lo, hi] = G.tint; const diag = Math.hypot(w, h);
        const air = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, diag * 0.7);
        air.addColorStop(0, css([hi[0], hi[1], hi[2], 1])); air.addColorStop(1, css([lo[0], lo[1], lo[2], 1]));
        ctx.globalAlpha = G.alpha * clamp(G.atmo, 0, 1);
        ctx.fillStyle = air; ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
    }
    earth.onFrame = () => overlay(performance.now());
    return {
      ready: earth.ready,
      resize() { resize(); earth.invalidate(); },
      draw() {
        if (!alive) return;
        earthCanvas.style.opacity = G.alpha.toFixed(3);
        canvas.style.opacity = '';
        if (G.alpha <= 0.01) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
        // whole planet in frame at the start, whatever the screen shape
        const tanR = 0.55 * 0.612 * Math.min(w, h) / Math.max(1, h);
        const far = Math.sqrt(1 + 1 / (tanR * tanR)) - 1;
        const f = clamp(G.fall, 0, 1);
        Object.assign(earth.view, { lat: G.lat, lon: G.lon, alt: far * Math.pow(NEAR / far, f), tilt: 1.15 * smooth(0.35, 1, f), px: 0.5, py: 0.5 });
        earth.invalidate();
      },
      destroy() { if (!alive) return; alive = false; earth.destroy(); earthCanvas.style.opacity = '0'; ctx.clearRect(0, 0, canvas.width, canvas.height); },
    };
  }

  /* ----------------------------------------------------------- clouds
   * A sea of cumulus seen from above, ray-marched as a heightfield in one
   * full-screen WebGL pass: billowing tops lit by the sun, blue-grey
   * hollows, haze toward the horizon, green fields through the gaps and
   * loose wisps drifting past the camera. Noise is baked once into a small
   * tileable texture, so each step is a texture read, not noise maths.
   *   F.hz   horizon height on screen (0 bottom … 1 top; < 0 looks up at sky)
   *   F.pit  camera tilted down by this many radians (looking down on the sea)
   *   F.cam  camera altitude above the cloud tops
   *   F.dive 0 … 1 descending into the clouds (white-out at 1)
   */
  function bakeNoise(size) {
    const perm = new Uint8Array(512); const base = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) base[i] = i;
    for (let i = 255; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
    for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];
    const lat = (x, y, p) => perm[(perm[((x % p) + p) % p] + (((y % p) + p) % p)) & 511] / 255;
    const vnoise = (x, y, p) => {
      const xi = Math.floor(x); const yi = Math.floor(y); let xf = x - xi; let yf = y - yi;
      xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
      const a = lat(xi, yi, p); const b = lat(xi + 1, yi, p); const c = lat(xi, yi + 1, p); const d = lat(xi + 1, yi + 1, p);
      return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    const fbm = (x, y, cells, oct) => { let v = 0; let amp = 0.5; let f = cells; let norm = 0; for (let o = 0; o < oct; o += 1) { v += amp * vnoise(x * f, y * f, f); norm += amp; amp *= 0.5; f *= 2; } return v / norm; };
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const u = x / size; const v = y / size; const i = (y * size + x) * 4;
      data[i] = Math.round(fbm(u, v, 4, 5) * 255);       // big cloud masses
      data[i + 1] = Math.round(fbm(u, v, 16, 4) * 255);  // billows
      data[i + 2] = Math.round(fbm(u, v, 8, 3) * 255);   // ground and wisps
      data[i + 3] = 255;
    }
    return data;
  }
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = (steps) => `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 r; uniform float t; uniform float hz; uniform float pit; uniform float cam; uniform float dive; uniform sampler2D nz;
    uniform vec3 lit; uniform vec3 shade; uniform vec3 hazeC; uniform vec3 gnd; uniform vec3 sunv;
    const float FOV = 1.15;
    vec2 wind;
    float H(vec2 xz) {
      float a = texture2D(nz, xz * 0.028 + wind).r;          // big cloud heads
      float b = texture2D(nz, xz * 0.085 + wind * 1.5).g;    // billows on them
      float s = clamp((a * 1.0 + b * 0.24 - 0.44) * 2.4, 0.0, 1.0);
      return -1.0 + pow(s, 0.55);                    // rounded, cauliflower tops; layer top at 0
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      float asp = r.x / r.y;
      wind = vec2(t * 0.0012, t * 0.0075);
      vec3 d = normalize(vec3((uv.x - 0.5) * asp * FOV, (uv.y - hz) * FOV, 1.0));
      d = vec3(d.x, d.y * cos(pit) - d.z * sin(pit), d.y * sin(pit) + d.z * cos(pit));   // tilt the camera down
      vec3 col = vec3(0.0); float a = 0.0;
      vec3 haze = hazeC;
      if (d.y < -0.0005) {
        float t0 = cam / -d.y; float t1 = (cam + 1.0) / -d.y;
        float far = 90.0;
        if (t0 < far) {
          t1 = min(t1, far);
          float hit = -1.0; float prev = t0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < ${steps}; i++) {
            float tt = mix(t0, t1, (float(i) + jit) / float(${steps}));
            vec3 p = vec3(0.0, cam, 0.0) + d * tt;
            if (p.y < H(p.xz)) { hit = tt; break; }
            prev = tt;
          }
          if (hit > 0.0) {
            // one refinement step between the last miss and the hit
            float mid = (prev + hit) * 0.5; vec3 pm = vec3(0.0, cam, 0.0) + d * mid;
            if (pm.y < H(pm.xz)) hit = mid;
            vec3 p = vec3(0.0, cam, 0.0) + d * hit;
            float e = 0.06 + hit * 0.004;
            vec3 n = normalize(vec3(H(p.xz - vec2(e, 0.0)) - H(p.xz + vec2(e, 0.0)), 2.0 * e, H(p.xz - vec2(0.0, e)) - H(p.xz + vec2(0.0, e))));
            vec3 sun = normalize(sunv);
            float diff = clamp(dot(n, sun), 0.0, 1.0);
            float up = clamp(p.y + 1.0, 0.0, 1.0);                 // 0 deep in a hollow, 1 a crown
            // neighbouring heads cast shade toward the sun-facing side
            vec2 toward = normalize(sun.xz + 1e-4) * 0.45;
            float occl = clamp((H(p.xz + toward) - p.y - sun.y * 0.45) * 2.5, 0.0, 1.0);
            float lightK = clamp(diff * 0.75 + up * 0.5 - 0.15, 0.0, 1.0) * (1.0 - occl * 0.55);
            col = mix(shade, lit, lightK);
            col += lit * 0.08 * pow(1.0 - clamp(n.y, 0.0, 1.0), 2.0);   // bright rims
            col = mix(col, haze, smoothstep(8.0, 82.0, hit));
            a = smoothstep(0.0, 0.03, -d.y);                    // feather into the sky at the horizon
          } else {
            // A gap: fields far below, through the haze
            float tg = (cam + 6.0) / -d.y; vec2 g = (d * tg).xz;
            float k = texture2D(nz, g * 0.018 + wind * 0.4).b;
            // A gap: a deep hollow with the ground faint far below
            col = mix(shade * 0.72, gnd * 1.4, 0.3 + k * 0.25);
            col = mix(col, mix(shade, haze, 0.5), smoothstep(6.0, 60.0, tg) * 0.8);
            a = smoothstep(0.0, 0.03, -d.y);
          }
        } else {
          col = haze; a = smoothstep(0.0, 0.03, -d.y);            // soft horizon
        }
      }
      // Wisps drifting past the camera
      float w = texture2D(nz, vec2(uv.x * asp * 0.55 + t * 0.012, uv.y * 0.7 - t * 0.004)).b;
      float wa = smoothstep(0.52, 0.78, w) * 0.5 * smoothstep(hz + 0.35, hz - 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.6, pit));
      col = col * a * (1.0 - wa) + mix(haze, lit, 0.6) * wa; a = a + wa * (1.0 - a);
      // Descending into the clouds: white-out
      float white = smoothstep(0.35, 0.95, dive);
      vec3 fogc = mix(haze, lit, 0.55);
      col = mix(col, fogc * max(a, white), white); a = max(a, white);
      gl_FragColor = vec4(col, a);
    }`;
  function fog(canvas, F) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG(small ? 14 : 22)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const SIZE = 256;
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIZE, SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, bakeNoise(SIZE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const U = {};
    ['r', 't', 'hz', 'pit', 'cam', 'dive', 'nz', 'lit', 'shade', 'hazeC', 'gnd', 'sunv'].forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1i(U.nz, 0);
    const scale = small ? 0.45 : 0.55;    // soft clouds: render small, CSS scales up
    const resize = () => { canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale)); gl.viewport(0, 0, canvas.width, canvas.height); };
    resize();
    return {
      resize,
      draw(time) {
        gl.uniform2f(U.r, canvas.width, canvas.height); gl.uniform1f(U.t, time);
        gl.uniform1f(U.hz, F.hz); gl.uniform1f(U.pit, F.pit); gl.uniform1f(U.cam, F.cam); gl.uniform1f(U.dive, F.dive);
        const P = F.pal;
        gl.uniform3fv(U.lit, P.lit); gl.uniform3fv(U.shade, P.shade); gl.uniform3fv(U.hazeC, P.haze); gl.uniform3fv(U.gnd, P.gnd); gl.uniform3fv(U.sunv, P.dir);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  }

  const SETTLED_HZ = 0.42;   // horizon height once we're above the clouds

  /* ------------------------------------------------------------- mount */
  function mount(section, opts) {
    const { gsap, ScrollTrigger } = opts;
    const layer = section.querySelector('.k-sky__layer');
    const G = { lat: 0, lon: 0, zoom: 0.9, drop: 0, alpha: 1, leg: 0, fall: 0, atmo: 0, tint: null };
    const ROUTE = routeTo(opts.home && opts.home.lat != null ? opts.home : DEFAULT_HOME);
    const journey = !(opts.quick || opts.reduced);
    const F = { hz: -0.6, pit: 0, cam: 1.5, dive: 0, pal: skyAt(localHour()) };
    const zone = (() => { try { return (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop().replace(/_/g, ' '); } catch (e) { return ''; } })();
    const paint = () => {
      const P = F.pal;
      [['--sky-top', P.top], ['--sky-mid', P.mid], ['--sky-low', P.low], ['--sky-hor', P.hor], ['--sky-sun', P.sun], ['--sky-sun-x', `${P.sx}%`], ['--sky-sun-y', `${P.sy}%`], ['--sky-sun-s', `${P.ss}%`], ['--sky-streak', P.streak], ['--sky-ink', P.ink]]
        .forEach(([k, v]) => section.style.setProperty(k, v));
      section.dataset.phase = P.phase;
      const fogc = F.pal.haze.map((v, i) => v + (F.pal.lit[i] - v) * 0.55);
      section.style.setProperty('--sky-fog', css(fogc));
    };
    paint();
    const caption = () => `KSK 001 · ${NAMES[F.pal.phase]} above the clouds${zone ? ` · ${zone}` : ''} · 36,000 ft`;
    const tick = setInterval(() => { F.pal = skyAt(localHour()); paint(); if (section.classList.contains('is-settled') && route) route.textContent = caption(); }, 60000);
    // The satellite Earth when the journey plays and WebGL2 is there; the dotted globe otherwise
    let sat = null;
    const earthEl = section.querySelector('.k-sky__earth');
    if (journey && opts.Earth && earthEl) { try { sat = satellite(earthEl, section.querySelector('.k-sky__globe'), G, opts.Earth, ROUTE); } catch (e) { sat = null; } }
    const gv = sat ? null : globe(section.querySelector('.k-sky__globe'), G, opts.world, ROUTE);
    let fv = null;
    try { fv = fog(section.querySelector('.k-sky__fog'), F); } catch (e) { fv = null; }
    if (!fv) section.classList.add('is-nogl');
    const space = section.querySelector('.k-sky__space');
    const fogEl = section.querySelector('.k-sky__fog');
    const route = section.querySelector('[data-sky-route]');
    const tagline = section.querySelector('.k-sky__tagline');

    /* The ꓘIOSK wordmark lives above everything (it flies into the nav), so
     * the clouds that cover its feet are a mask that follows the horizon. */
    const title = section.querySelector('.k-sky__title');
    const word = title.querySelector('.k-sky__word');
    const navMark = document.querySelector('.k-nav .k-logo__mark');
    const T = { rise: 0, fly: 0, fade: 1 };     // rise: 0 → 1 out of the clouds; fly: 0 → 1 into the nav icon
    let base = null; let wasPending = null;
    const measure = () => {
      word.style.transform = 'none';
      const r = word.getBoundingClientRect();
      base = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top };
    };
    const ease = (x) => x * x * (3 - 2 * x);
    function applyTitle() {
      if (!base) measure();
      const vh = window.innerHeight;
      const k = ease(clamp(T.fly, 0, 1));
      let tx = 0; let ty = (1 - T.rise) * vh * 0.42; let sc = 1;
      if (navMark && k > 0) {
        const m = navMark.getBoundingClientRect();
        const target = (m.width || 40) / base.w;
        sc = Math.exp(Math.log(target) * k);
        tx = (m.left + m.width / 2 - base.x) * k;
        ty = ty * (1 - k) + (m.top + m.height / 2 - base.y) * k;
      }
      word.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      // Cloud line in the word's own (scaled) coordinates
      const horizon = (1 - F.hz) * vh + vh * 0.015;
      const topNow = base.y - (base.h / 2) * sc + ty;
      word.style.setProperty('--cut', `${((horizon - topNow) / sc).toFixed(1)}px`);
      word.style.setProperty('--feather', `${(vh * 0.05 / sc).toFixed(1)}px`);
      const op = T.fade * clamp(T.rise * 3, 0, 1) * (1 - clamp((k - 0.78) / 0.2, 0, 1));
      word.style.opacity = op.toFixed(3);
      if (navMark) {
        const n = clamp((k - 0.72) / 0.28, 0, 1);
        navMark.style.opacity = n.toFixed(3);
        navMark.style.transform = `scale(${(0.7 + 0.3 * n).toFixed(3)})`;
        // the header pill only takes shape once the icon has formed inside it
        const pending = n < 0.9;
        if (pending !== wasPending) { document.documentElement.classList.toggle('is-mark-pending', pending); wasPending = pending; }
      }
    }

    let raf = 0; let on = true; let globeDirty = true; const t0 = performance.now();
    const frame = (now) => {
      raf = 0;
      if (!on) return;
      if (G.alpha > 0.01 || globeDirty) { if (sat) sat.draw(now); else gv.draw(now); globeDirty = G.alpha > 0.01; }
      if (fv) fv.draw((now - t0) / 1000);
      applyTitle();
      raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (on && !raf) raf = requestAnimationFrame(frame); };
    const onResize = () => { if (sat) sat.resize(); else gv.resize(); if (fv) fv.resize(); measure(); applyTitle(); };
    window.addEventListener('resize', onResize);

    // Face a city; longitudes stay continuous so no tween swings the long way round
    let lonNow = 0;
    const face = (c) => { let d = (c.lo - lonNow) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; lonNow += d; return { lat: c.la, lon: lonNow }; };
    const midOf = (a, b) => { const p = vec(a.la, a.lo); const q = vec(b.la, b.lo); const m = [p[0] + q[0], p[1] + q[1], p[2] + q[2]]; return { la: Math.atan2(m[1], Math.hypot(m[0], m[2])) * 180 / Math.PI, lo: Math.atan2(m[0], m[2]) * 180 / Math.PI }; };
    const tl = gsap.timeline();
    const settled = () => { section.classList.add('is-settled'); if (sat) sat.destroy(); };
    if (!journey) {
      Object.assign(G, { alpha: 0 }); F.hz = SETTLED_HZ; T.rise = 1;
      gsap.set(space, { opacity: F.pal.stars });
      gsap.set(tagline, { opacity: 1, y: 0 });
      if (route) route.textContent = caption();
      settled();
    } else {
      // 1. Around the globe, in the dark above the atmosphere
      gsap.set(space, { opacity: 1 }); gsap.set(tagline, { opacity: 0, y: 14 });
      Object.assign(G, face(ROUTE[0]));
      const LEG = 0.9;
      ROUTE.slice(0, -1).forEach((c, i) => {
        const b = ROUTE[i + 1];
        const mid = midOf(c, b); const at = face({ la: mid.la * 0.8, lo: mid.lo + 8.6 });
        tl.call(() => { if (route) route.textContent = `KSK 00${i + 1} · ${c.c} → ${b.c} · ${b.n}`; }, null, i * LEG);
        tl.to(G, { leg: i + 1, lat: at.lat, lon: at.lon, duration: LEG, ease: 'power1.inOut' }, i * LEG);
      });
      const up = (ROUTE.length - 1) * LEG + 0.1;
      const last = ROUTE[ROUTE.length - 1];
      const P = F.pal;
      G.tint = [P.haze, P.lit.map((v, i) => v + (P.haze[i] - v) * 0.25)];
      gsap.set(fogEl, { opacity: 0 });
      // 2. Re-entry: lock onto the last stop and drop out of orbit toward it.
      //    The land rushes past, the air thickens into the sky of the hour,
      //    and we break out high above the cloud sea, looking down on it…
      tl.call(() => { if (route) route.textContent = `KSK 00${ROUTE.length} · Descent · ${last.home ? 'Home' : last.c} · ${last.n}`; }, null, up)
        .to(G, { ...face(last), duration: 1.3, ease: 'power2.inOut' }, up)
        .to(G, { fall: 1, duration: 3.3, ease: 'sine.in' }, up + 0.1)
        .to(G, { atmo: 1, duration: 1.0, ease: 'power2.in' }, up + 2.4)
        .to(space, { opacity: P.stars, duration: 0.8, ease: 'power1.inOut' }, up + 2.6)
        .set(F, { hz: 0.5, pit: 1.2, cam: 12 }, up + 2.9)
        .to(fogEl, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, up + 3.0)
        .to(G, { alpha: 0, duration: 0.4, ease: 'power1.in' }, up + 3.4)
      //    …then pull up and level out just above the tops
        .to(F, { cam: 1.5, duration: 2.8, ease: 'power3.out' }, up + 3.1)
        .to(F, { pit: 0, hz: SETTLED_HZ, duration: 2.6, ease: 'power2.inOut' }, up + 3.1)
        .call(() => { if (route) route.textContent = caption(); }, null, up + 3.9)
      // 3. ꓘIOSK rises out of the clouds, the tagline settles in front of them
        .to(T, { rise: 1, duration: 2.4, ease: 'power3.out' }, up + 4.7)
        .to(tagline, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, up + 6.1)
        .call(settled, null, up + 6.3);
    }

    // Hold the journey until the planet's textures are in (or 2.5 s, whichever is first)
    if (journey && sat) {
      tl.pause();
      Promise.race([sat.ready.catch(() => {}), new Promise((r) => setTimeout(r, 2500))]).then(() => { if (tl.progress() < 1) tl.play(); });
    }

    // 4. Scroll: ꓘIOSK flies up into the nav icon while the camera sinks into the clouds
    const st = ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom top', scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        if (p > 0.001 && tl.progress() < 1) tl.progress(1);
        T.fly = clamp(p / 0.5, 0, 1);
        F.dive = clamp(p / 0.8, 0, 1);
        if (!tl.isActive()) { F.hz = SETTLED_HZ + F.dive * 0.42; F.cam = 1.5 - F.dive * 1.55; }
        tagline.style.opacity = String(clamp(1 - p * 6, 0, 1));
        layer.style.opacity = String(clamp((1 - p) / 0.22, 0, 1));
        const gone = p >= 0.999;
        layer.style.visibility = gone ? 'hidden' : '';
        title.style.visibility = T.fly >= 1 ? 'hidden' : '';
        on = !gone; if (on) wake(); else applyTitle();
      },
    });
    measure(); applyTitle();
    wake();
    return {
      stop() {
        on = false; clearInterval(tick); tl.kill(); st.kill(); if (sat) sat.destroy(); window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf);
        if (navMark) { navMark.style.opacity = ''; navMark.style.transform = ''; }
        document.documentElement.classList.remove('is-mark-pending');
      },
    };
  }

  window.KioskSky = { mount };
})();
