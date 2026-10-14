/**
 * KIOSK — K-flight intro (first home visit per session)
 *
 * Above the clouds, flights hop airport to airport: JFK → KEF → LIS draws
 * the stem of a backwards K (the KIOSK wordmark's first letter), then KEF → HND and KEF → CPT draw its arm and leg. The
 * contrails turn into the outline of the K, the camera pulls back to show
 * it is the first letter of KIOSK, I-O-S-K draw in, every letter fills
 * solid, and the overlay flies through the clouds into the hero slideshow.
 *
 *   KioskIntro.run(el, { onDone }) → { stop() }
 *
 * Needs GSAP (js/vendor/gsap). The clouds are drawn procedurally on a
 * canvas, so there are no image downloads.
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 46;                                   // letter stroke width (word units)
  const BOARD = { w: 1180, h: 400 };   // the word's own coordinates

  // Monoline letters on a 1180 × 400 board. K, I, O, S, K.
  const LETTERS = [
    { id: 'K1', paths: ['M262,50 L262,350', 'M258,218 L82,50', 'M258,212 L70,350'] },   // backwards K
    { id: 'I', paths: ['M330,50 L330,350'] },
    { id: 'O', paths: ['M495,50 C553,50 600,117 600,200 C600,283 553,350 495,350 C437,350 390,283 390,200 C390,117 437,50 495,50 Z'] },
    { id: 'S', paths: ['M846,96 C820,58 772,48 734,58 C694,70 676,110 694,146 C712,180 770,186 808,204 C850,224 866,268 846,306 C824,346 762,358 718,340 C694,330 680,314 672,298'] },
    { id: 'K2', paths: ['M920,50 L920,350', 'M924,218 L1100,50', 'M924,212 L1112,350'] },
  ];
  // The flights that draw the first K (airport → airport)
  const AIRPORTS = {
    JFK: { x: 262, y: 50, city: 'New York' },
    KEF: { x: 262, y: 215, city: 'Reykjavík' },
    LIS: { x: 262, y: 350, city: 'Lisbon' },
    HND: { x: 82, y: 50, city: 'Tokyo' },
    CPT: { x: 70, y: 350, city: 'Cape Town' },
  };
  const FLIGHTS = [['JFK', 'KEF'], ['KEF', 'LIS'], ['KEF', 'HND'], ['KEF', 'CPT']];

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ------------------------------------------------------------ clouds
   * Looking straight down from cruising altitude: fields and roads far
   * below, cumulus drifting past with their shadows. */
  function clouds(canvas) {
    const ctx = canvas.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0; let h = 0; let ground = null; let puff = null; let shade = null; let raf = 0; let t0 = 0;
    let speed = 1;
    const list = [];

    // A cumulus cluster: a flat-ish base of puffs, cauliflower tops, lit from above
    function sprite(shadow) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const puffs = [];
      for (let i = 0; i < 26; i += 1) {
        const a = Math.random() * Math.PI * 2; const d = Math.sqrt(Math.random());
        puffs.push({ x: 128 + Math.cos(a) * d * 78, y: 132 + Math.sin(a) * d * 46, r: rnd(14, 34) * (1.15 - d * 0.5) });
      }
      puffs.sort((p, q) => p.y - q.y);
      g.filter = shadow ? 'blur(7px)' : 'blur(1.2px)';
      puffs.forEach((p) => {
        const grd = g.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
        if (shadow) { grd.addColorStop(0, 'rgba(6,14,10,.5)'); grd.addColorStop(1, 'rgba(6,14,10,0)'); }
        else { grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(244,246,248,.97)'); grd.addColorStop(0.85, 'rgba(206,214,222,.9)'); grd.addColorStop(1, 'rgba(190,200,210,0)'); }
        g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      });
      if (!shadow) {
        // Grey undersides
        g.globalCompositeOperation = 'source-atop';
        const under = g.createLinearGradient(0, 90, 0, 190);
        under.addColorStop(0, 'rgba(120,135,150,0)'); under.addColorStop(1, 'rgba(120,135,150,.35)');
        g.fillStyle = under; g.fillRect(0, 0, 256, 256);
      }
      return c;
    }
    function paintGround() {
      ground = document.createElement('canvas');
      ground.width = Math.ceil(w * dpr); ground.height = Math.ceil(h * 2 * dpr);
      const g = ground.getContext('2d');
      g.scale(dpr, dpr);
      const base = g.createLinearGradient(0, 0, w, h * 2);
      base.addColorStop(0, '#2c4336'); base.addColorStop(0.5, '#33503f'); base.addColorStop(1, '#2a3f3d');
      g.fillStyle = base; g.fillRect(0, 0, w, h * 2);
      const tones = ['rgba(120,104,70,.12)', 'rgba(70,96,58,.18)', 'rgba(150,140,96,.09)', 'rgba(40,62,48,.2)'];
      for (let i = 0; i < 260; i += 1) {
        g.save(); g.translate(rnd(0, w), rnd(0, h * 2)); g.rotate(rnd(-0.5, 0.5));
        g.fillStyle = tones[i % tones.length]; g.fillRect(0, 0, rnd(30, 140), rnd(20, 90)); g.restore();
      }
      g.strokeStyle = 'rgba(220,214,190,.12)'; g.lineWidth = 1;
      for (let i = 0; i < 9; i += 1) {
        g.beginPath(); let x = rnd(0, w); let y = 0; g.moveTo(x, y);
        while (y < h * 2) { x += rnd(-40, 40); y += rnd(40, 90); g.lineTo(x, y); }
        g.stroke();
      }
    }
    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      paintGround();
      if (!puff) {
        puff = []; shade = [];
        for (let i = 0; i < 6; i += 1) { puff.push(sprite(false)); shade.push(sprite(true)); }
      }
      list.length = 0;
      const n = Math.round((w * h) / 30000) + 14;
      const base = Math.max(w, h) / 1400;
      for (let i = 0; i < n; i += 1) list.push({ x: rnd(-0.1, 1.1) * w, y: rnd(-0.2, 1.2) * h, s: rnd(0.35, 1.15) * base, v: rnd(0.7, 1.3), k: i % 6, sx: rnd(0.8, 1.4) });
      list.sort((a, b) => a.s - b.s);
    }
    function frame(now) {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gy = -((t * 14 * speed) % h);
      ctx.drawImage(ground, 0, gy * dpr, ground.width, ground.height, 0, gy, w, h * 2);
      list.forEach((c) => {
        c.y += 0.6 * c.v * c.s * speed;
        const size = 256 * c.s; const sw = size * c.sx;
        if (c.y - size > h) { c.y = -size; c.x = rnd(-0.1, 1.1) * w; }
        ctx.globalAlpha = 0.9; ctx.drawImage(shade[c.k], c.x - sw / 2 + size * 0.22, c.y - size / 2 + size * 0.3, sw, size);
        ctx.globalAlpha = 1; ctx.drawImage(puff[c.k], c.x - sw / 2, c.y - size / 2, sw, size);
      });
      // Haze toward the horizon (top) and a cool vignette
      const haze = ctx.createLinearGradient(0, 0, 0, h);
      haze.addColorStop(0, 'rgba(200,220,240,.35)'); haze.addColorStop(0.35, 'rgba(200,220,240,.06)'); haze.addColorStop(1, 'rgba(10,16,20,.25)');
      ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return {
      boost(v) { speed = v; },
      stop() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
    };
  }

  /* --------------------------------------------------------------- run */
  function run(root, opts = {}) {
    const gsap = window.gsap;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('k-kfly');
    root.insertAdjacentHTML('afterbegin', `
      <canvas class="k-kfly__sky" aria-hidden="true"></canvas>
      <div class="k-kfly__shade" aria-hidden="true"></div>
      <svg class="k-kfly__svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
      <div class="k-kfly__pass" aria-hidden="true"><span>Flight KSK 001</span><b data-kfly-route>JFK</b><small data-kfly-city>New York</small></div>`);
    const sky = clouds(root.querySelector('.k-kfly__sky'));
    const svg = root.querySelector('svg');
    // The frame follows the screen: wide on desktop, tall on phones
    const aspect = (root.clientHeight || window.innerHeight) / (root.clientWidth || window.innerWidth);
    const VB = aspect > 1 ? { w: 640, h: Math.round(640 * aspect) } : { w: 1180, h: Math.round(1180 * aspect) };
    svg.setAttribute('viewBox', `0 0 ${VB.w} ${VB.h}`);
    const kStart = Math.min((VB.h * 0.72) / 300, (VB.w * 0.62) / 230);   // the first K fills the frame
    const kEnd = Math.min((VB.w * 0.86) / BOARD.w, (VB.h * 0.5) / 300);  // the whole word fits
    const route = root.querySelector('[data-kfly-route]');
    const city = root.querySelector('[data-kfly-city]');

    // Camera group, letters (outline via a mask), flights
    const defs = el('defs', {}, svg);
    const mask = el('mask', { id: 'kfly-hollow', maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 6000, height: 6000 }, defs);
    el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: '#fff' }, mask);
    const cam = el('g', {}, svg);
    const word = el('g', { mask: 'url(#kfly-hollow)' }, cam);
    const trails = el('g', {}, cam);
    const ports = el('g', {}, cam);
    const plane = el('g', { opacity: 0 }, cam);
    el('path', { d: 'M0,-9 L2.4,-2 L10,2.6 L10,4.6 L2.4,2.6 L2,8 L4.6,10 L4.6,11.4 L0,10.2 L-4.6,11.4 L-4.6,10 L-2,8 L-2.4,2.6 L-10,4.6 L-10,2.6 L-2.4,-2 Z', fill: '#fff' }, plane);

    const letter = {};
    LETTERS.forEach((L) => {
      letter[L.id] = L.paths.map((d) => {
        const outer = el('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': W, 'stroke-linejoin': 'miter', 'stroke-linecap': 'square' }, word);
        const inner = el('path', { d, fill: 'none', stroke: '#000', 'stroke-width': W - 5, 'stroke-linejoin': 'miter', 'stroke-linecap': 'square' }, mask);
        const len = outer.getTotalLength() + W;
        [outer, inner].forEach((p) => { p.style.strokeDasharray = `${len} ${len}`; p.style.strokeDashoffset = String(len); });
        return { outer, inner, len };
      });
    });
    // Airports
    const portEls = {};
    Object.keys(AIRPORTS).forEach((code) => {
      const a = AIRPORTS[code];
      const g = el('g', { transform: `translate(${a.x} ${a.y})`, opacity: 0 }, ports);
      el('circle', { r: 9, fill: 'none', stroke: '#fff', 'stroke-width': 1.4, opacity: 0.6 }, g);
      el('circle', { r: 3.6, fill: '#ff5a1f' }, g);
      const left = code === 'HND' || code === 'CPT';
      const tx = el('text', { x: left ? -14 : 14, y: 4, 'text-anchor': left ? 'end' : 'start', fill: '#fff', 'font-size': 13, 'font-family': 'ui-monospace, "SF Mono", Menlo, monospace', 'letter-spacing': 1.5 }, g);
      tx.textContent = code;
      portEls[code] = g;
    });

    // Camera: centre a point of the board at a given zoom
    const camState = { x: 166, y: 200, k: kStart };
    const applyCam = () => {
      cam.setAttribute('transform', `translate(${VB.w / 2} ${VB.h / 2}) scale(${camState.k}) translate(${-camState.x} ${-camState.y})`);
      const inv = (VB.w > 1000 ? 1.25 : 0.8) / camState.k;
      Object.keys(portEls).forEach((c) => portEls[c].setAttribute('transform', `translate(${AIRPORTS[c].x} ${AIRPORTS[c].y}) scale(${inv})`));
      plane.dataset.k = String(inv);
    };
    applyCam();

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => opts.onDone && opts.onDone() });
    if (reduced) tl.timeScale(3);

    // 1. Airports light up
    tl.to(Object.values(portEls), { opacity: 1, duration: 0.5, stagger: 0.08 }, 0.2);

    // 2. Flights draw the K: each contrail follows the letter's centre line
    FLIGHTS.forEach(([from, to], i) => {
      const a = AIRPORTS[from]; const b = AIRPORTS[to];
      const trail = el('path', { d: `M${a.x},${a.y} L${b.x},${b.y}`, fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-dasharray': '1 0' }, trails);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      trail.style.strokeDasharray = `${len} ${len}`; trail.style.strokeDashoffset = String(len);
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
      const p = { u: 0 };
      const at = 0.7 + (i < 2 ? i * 0.85 : 1.7 + (i - 2) * 0.55);
      tl.call(() => { route.textContent = `${from} → ${to}`; city.textContent = `${a.city} → ${b.city}`; }, null, at);
      tl.set(plane, { opacity: 1 }, at);
      tl.to(p, {
        u: 1, duration: 0.8, ease: 'power1.inOut',
        onUpdate: () => {
          const x = a.x + (b.x - a.x) * p.u; const y = a.y + (b.y - a.y) * p.u;
          plane.setAttribute('transform', `translate(${x} ${y}) rotate(${ang}) scale(${(Number(plane.dataset.k) || 1) * 1.6})`);
          trail.style.strokeDashoffset = String(len * (1 - p.u));
        },
      }, at);
      const ring = portEls[to].querySelector('circle');
      tl.fromTo(ring, { attr: { r: 22 }, opacity: 1 }, { attr: { r: 9 }, opacity: 0.6, duration: 0.45, ease: 'back.out(2)' }, at + 0.8);
    });
    tl.to(plane, { opacity: 0, duration: 0.3 }, '>-0.1');

    // 3. The contrails become the outline of the K
    const K1 = letter.K1;
    const outlineAt = tl.duration();
    K1.forEach((s, i) => {
      tl.to([s.outer, s.inner], { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, outlineAt + i * 0.12);
    });
    tl.to([trails, ports], { opacity: 0, duration: 0.6 }, outlineAt + 0.4);
    tl.call(() => { route.textContent = 'KSK 001'; city.textContent = 'Only at the KIOSK'; }, null, outlineAt + 0.5);

    // 4. Pull back: the K is the first letter of KIOSK
    tl.to(camState, { x: BOARD.w / 2, y: BOARD.h / 2, k: kEnd, duration: 1.4, ease: 'power3.inOut', onUpdate: applyCam }, outlineAt + 0.7);

    // 5. I-O-S-K draw in as outlines, then every letter fills solid
    const rest = ['I', 'O', 'S', 'K2'];
    const drawAt = outlineAt + 1.5;
    rest.forEach((id, i) => {
      letter[id].forEach((s, j) => tl.to([s.outer, s.inner], { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, drawAt + i * 0.16 + j * 0.06));
    });
    const fillAt = drawAt + 1.1;
    rest.concat(['K1']).forEach((id, i) => {
      tl.to(letter[id].map((s) => s.inner), { attr: { 'stroke-width': 0 }, duration: 0.45, ease: 'power2.in' }, fillAt + i * 0.1);
    });

    // 6. Fly through the clouds into the hero
    const outAt = fillAt + 1.0;
    tl.call(() => sky.boost(5), null, outAt);
    tl.to(camState, { k: kEnd * 10, duration: 0.9, ease: 'power3.in', onUpdate: applyCam }, outAt);
    tl.to(svg, { opacity: 0, duration: 0.5, ease: 'power1.in' }, outAt + 0.35);
    tl.to(root.querySelector('.k-kfly__pass'), { opacity: 0, duration: 0.3 }, outAt);

    return {
      stop() { tl.kill(); sky.stop(); },
    };
  }

  window.KioskIntro = { run };
})();
