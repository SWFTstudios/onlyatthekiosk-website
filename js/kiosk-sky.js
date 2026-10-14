/**
 * KIOSK — "Above the clouds" opening for the home page
 *
 *   1. Around the globe: a dotted Earth turns while a flight hops
 *      New York → Reykjavík → Lisbon → Lagos → Dubai → Tokyo.
 *   2. Up into the sky: the Earth drops away beneath us and we rise into a
 *      golden-hour sky over a heavy bank of clouds sitting low like fog.
 *   3. The ꓘIOSK logo rises up from behind the clouds.
 *   4. Scroll: the camera sinks into the fog until it whites out, then the
 *      layer dissolves onto the rest of the home page (below the clouds).
 *
 * Light on purpose: the globe is ~4k dots on a 2D canvas, the fog is one
 * full-screen WebGL pass of value noise rendered at reduced resolution,
 * and the sky is CSS. Everything stops when the layer is off screen.
 *
 *   KioskSky.mount(section, { gsap, ScrollTrigger, world, quick, reduced }) → { stop() }
 */
(function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ROUTE = [
    { n: 'New York', c: 'JFK', la: 40.71, lo: -74.0 },
    { n: 'Reykjavík', c: 'KEF', la: 64.15, lo: -21.94 },
    { n: 'Lisbon', c: 'LIS', la: 38.72, lo: -9.14 },
    { n: 'Lagos', c: 'LOS', la: 6.52, lo: 3.38 },
    { n: 'Dubai', c: 'DXB', la: 25.2, lo: 55.27 },
    { n: 'Tokyo', c: 'HND', la: 35.68, lo: 139.69 },
  ];
  const vec = (la, lo) => { const a = la * Math.PI / 180; const b = lo * Math.PI / 180; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; };
  function slerp(a, b, u) {
    const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    if (d < 1e-5) return a;
    const s = Math.sin(d); const k1 = Math.sin((1 - u) * d) / s; const k2 = Math.sin(u * d) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  /* ------------------------------------------------------------ globe */
  function globe(canvas, G, world) {
    const ctx = canvas.getContext('2d');
    const raw = world ? world.points() : new Float32Array(0);
    const n = raw.length / 2;
    const P = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) { const v = vec(raw[i * 2], raw[i * 2 + 1]); P[i * 3] = v[0]; P[i * 3 + 1] = v[1]; P[i * 3 + 2] = v[2]; }
    const cities = ROUTE.map((c) => ({ ...c, v: vec(c.la, c.lo) }));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0; let h = 0;
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); };
    resize();

    function draw(now) {
      if (G.alpha <= 0.01) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.34 * G.zoom;
      const cx = w / 2; const cy = h / 2 + G.drop * h;
      const cyw = Math.cos(G.yaw); const syw = Math.sin(G.yaw); const cp = Math.cos(G.pitch); const sp = Math.sin(G.pitch);
      const rot = (x, y, z) => { const x1 = x * cyw + z * syw; const z1 = -x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
      ctx.globalAlpha = G.alpha;
      // Atmosphere
      const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.35);
      glow.addColorStop(0, 'rgba(120,170,255,.28)'); glow.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 6.283); ctx.fill();
      const disc = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      disc.addColorStop(0, 'rgba(26,40,74,.95)'); disc.addColorStop(1, 'rgba(6,10,22,.95)');
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      // Land dots
      const s = Math.max(1, R / 260);
      for (let i = 0; i < n; i += 1) {
        const r = rot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        if (r[2] <= 0.02) continue;
        ctx.globalAlpha = G.alpha * (0.25 + 0.75 * r[2]);
        ctx.fillStyle = r[2] > 0.5 ? '#f3ead8' : '#c9c2b3';
        ctx.fillRect(cx + r[0] * R - s / 2, cy - r[1] * R - s / 2, s, s);
      }
      // Flight: trail from the previous city, glowing head, city pins
      const leg = Math.min(Math.floor(G.leg), cities.length - 2);
      const u = clamp(G.leg - leg, 0, 1);
      const pin = (c, on) => {
        const r = rot(c.v[0], c.v[1], c.v[2]); if (r[2] < 0.05) return;
        const x = cx + r[0] * R; const y = cy - r[1] * R;
        ctx.globalAlpha = G.alpha * (on ? 1 : 0.6);
        ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(x, y, on ? 4 : 2.5, 0, 6.283); ctx.fill();
        if (on) {
          ctx.strokeStyle = 'rgba(255,90,31,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9 + 4 * Math.sin(now / 200), 0, 6.283); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.fillText(`${c.c} · ${c.n.toUpperCase()}`, x + 12, y - 8);
        }
      };
      cities.forEach((c, i) => { if (i <= leg) pin(c, i === leg && u < 0.2); });
      for (let k = 0; k <= leg; k += 1) {
        const a = cities[k].v; const b = cities[k + 1].v;
        const end = k < leg ? 1 : u;
        const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
        let prev = null;
        ctx.lineWidth = 2; ctx.strokeStyle = '#ff7a3d';
        for (let j = 0; j <= 40; j += 1) {
          const t = (j / 40) * end;
          const p = slerp(a, b, t); const lift = 1 + (0.06 + d * 0.08) * Math.sin(Math.PI * t);
          const r = rot(p[0] * lift, p[1] * lift, p[2] * lift);
          const pt = [cx + r[0] * R, cy - r[1] * R, r[2]];
          if (prev && pt[2] > -0.1) { ctx.globalAlpha = G.alpha * (k < leg ? 0.45 : 0.95); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke(); }
          prev = pt;
        }
        if (k === leg && prev && u < 1) {
          ctx.globalAlpha = G.alpha; ctx.fillStyle = 'rgba(255,170,120,.35)'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 9, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 3.2, 0, 6.283); ctx.fill();
        }
      }
      if (u >= 0.8 || G.leg >= cities.length - 1) pin(cities[Math.min(leg + 1, cities.length - 1)], true);
      ctx.globalAlpha = 1;
    }
    return { draw, resize };
  }

  /* -------------------------------------------------------------- fog */
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = (oct) => `
    precision mediump float;
    uniform vec2 r; uniform float t; uniform float level; uniform float dive;
    float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < ${oct}; i++){ v += a * n(p); p = m * p; a *= 0.5; } return v; }
    void main(){
      vec2 uv = gl_FragCoord.xy / r;
      float asp = r.x / r.y;
      float x = (uv.x - 0.5) * asp;
      // Billowing top edge of the cloud bank
      float edge = fbm(vec2(x * 1.4 + t * 0.018, t * 0.03)) - 0.5;
      float top = level + edge * 0.2 + fbm(vec2(x * 4.0 - t * 0.03, 3.0)) * 0.05;
      float inside = top - uv.y;
      // Perspective: the bank stretches toward the horizon
      float depth = 1.0 / max(0.08, top + 0.35 - uv.y);
      vec2 q = vec2(x * depth * 1.1, depth * 1.6 - t * 0.05) * (1.0 + dive * 2.2);
      float body = fbm(q + vec2(t * 0.015, 0.0));
      float puff = fbm(q * 2.7 - vec2(t * 0.03, t * 0.01));
      float shape = inside + (body - 0.5) * 0.3 + (puff - 0.5) * 0.1;
      float a = smoothstep(-0.015, 0.16, shape);
      // Light from the low sun above: bright crowns, blue-grey hollows
      float lightK = smoothstep(0.28, 0.92, body * 0.85 + puff * 0.45 - inside * 0.9 + 0.2);
      vec3 lit = vec3(1.0, 0.96, 0.9);
      vec3 shade = vec3(0.55, 0.62, 0.75);
      vec3 col = mix(shade, lit, lightK);
      col += vec3(1.0, 0.78, 0.5) * smoothstep(0.09, 0.0, abs(shape - 0.03)) * 0.22;   // golden rim
      // Loose wisps drifting above the bank
      float wisp = smoothstep(0.55, 0.85, fbm(vec2(x * 2.2 + t * 0.05, uv.y * 3.0 - t * 0.02))) * smoothstep(top + 0.25, top - 0.05, uv.y) * 0.35;
      a = max(a, wisp);
      // Diving in: the fog closes over everything
      a = clamp(a + smoothstep(0.0, 1.0, dive * 1.4 - (1.0 - uv.y) * 0.4) , 0.0, 1.0);
      col = mix(col, vec3(0.93, 0.94, 0.96), clamp(dive * 1.3 - 0.2, 0.0, 1.0));
      gl_FragColor = vec4(col * a, a);
    }`;
  function fog(canvas, F) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG(small ? 4 : 5)));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = { r: gl.getUniformLocation(prog, 'r'), t: gl.getUniformLocation(prog, 't'), level: gl.getUniformLocation(prog, 'level'), dive: gl.getUniformLocation(prog, 'dive') };
    const scale = small ? 0.5 : 0.62;    // soft fog: render small, let CSS scale it up
    const resize = () => { canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale)); gl.viewport(0, 0, canvas.width, canvas.height); };
    resize();
    return {
      resize,
      draw(time) {
        gl.uniform2f(U.r, canvas.width, canvas.height); gl.uniform1f(U.t, time);
        gl.uniform1f(U.level, F.level); gl.uniform1f(U.dive, F.dive);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  }

  /* ------------------------------------------------------------- mount */
  function mount(section, opts) {
    const { gsap, ScrollTrigger } = opts;
    const layer = section.querySelector('.k-sky__layer');
    const G = { yaw: 1.29, pitch: 0.55, zoom: 0.9, drop: 0, alpha: 1, leg: 0 };
    const F = { level: -0.25, dive: 0 };
    const gv = globe(section.querySelector('.k-sky__globe'), G, opts.world);
    let fv = null;
    try { fv = fog(section.querySelector('.k-sky__fog'), F); } catch (e) { fv = null; }
    if (!fv) section.classList.add('is-nogl');
    const logo = section.querySelector('.k-sky__logo');
    const space = section.querySelector('.k-sky__space');
    const route = section.querySelector('[data-sky-route]');
    let raf = 0; let on = true; let globeDirty = true; const t0 = performance.now();
    const frame = (now) => {
      raf = 0;
      if (!on) return;
      if (G.alpha > 0.01 || globeDirty) { gv.draw(now); globeDirty = G.alpha > 0.01; }
      if (fv) fv.draw((now - t0) / 1000);
      raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (on && !raf) raf = requestAnimationFrame(frame); };
    const onResize = () => { gv.resize(); if (fv) fv.resize(); };
    window.addEventListener('resize', onResize);

    // Face a city: yaw/pitch that bring (la, lo) to the front
    const face = (c) => ({ yaw: -c.lo * Math.PI / 180, pitch: clamp(c.la * Math.PI / 180, -0.9, 0.9) });
    const tl = gsap.timeline();
    const settled = () => { section.classList.add('is-settled'); };
    if (opts.quick || opts.reduced) {
      Object.assign(G, { alpha: 0 }); F.level = 0.36;
      gsap.set(space, { opacity: 0 }); gsap.set(logo, { y: 0, opacity: 1 });
      if (route) route.textContent = 'KSK 001 · Above the clouds';
      settled();
    } else {
      // 1. Around the globe, in the dark above the atmosphere
      gsap.set(space, { opacity: 1 }); gsap.set(logo, { opacity: 0 });
      Object.assign(G, face(ROUTE[0]));
      ROUTE.slice(0, -1).forEach((c, i) => {
        const b = ROUTE[i + 1];
        const mid = face({ la: (c.la + b.la) / 2, lo: (c.lo + b.lo) / 2 });
        tl.call(() => { if (route) route.textContent = `KSK 00${i + 1} · ${c.c} → ${b.c} · ${b.n}`; }, null, i * 0.72);
        tl.to(G, { leg: i + 1, yaw: mid.yaw - 0.15, pitch: mid.pitch * 0.8, duration: 0.72, ease: 'power1.inOut' }, i * 0.72);
      });
      const up = (ROUTE.length - 1) * 0.72 + 0.1;
      // 2. Up into the sky: the Earth drops away, golden hour fades in, the cloud bank rises
      tl.to(G, { zoom: 2.6, drop: 0.95, duration: 1.6, ease: 'power2.in' }, up)
        .to(G, { alpha: 0, duration: 0.6, ease: 'power1.in' }, up + 0.6)
        .to(space, { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, up + 0.4)
        .to(F, { level: 0.36, duration: 1.8, ease: 'power3.out' }, up + 0.6)
        .call(() => { if (route) route.textContent = 'KSK 001 · Above the clouds · 36,000 ft'; }, null, up + 0.8)
      // 3. The logo rises from behind the clouds
        .fromTo(logo, { y: '42vh', opacity: 0 }, { y: 0, opacity: 1, duration: 2.0, ease: 'power3.out' }, up + 1.3)
        .call(settled, null, up + 2.6);
    }

    // 4. Scroll: sink into the clouds, white out, dissolve onto the page
    const st = ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom top', scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        if (p > 0.001 && tl.isActive()) tl.progress(1);
        F.dive = clamp(p / 0.8, 0, 1);
        F.level = 0.36 + F.dive * 0.9;
        gsap.set(logo, { y: `${-p * 30}vh`, opacity: clamp(1 - p * 1.8, 0, 1), scale: 1 + p * 0.25 });
        layer.style.opacity = String(clamp((1 - p) / 0.22, 0, 1));
        const gone = p >= 0.999;
        layer.style.visibility = gone ? 'hidden' : '';
        on = !gone; if (on) wake();
      },
    });
    wake();
    return {
      stop() { on = false; tl.kill(); st.kill(); window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); },
    };
  }

  window.KioskSky = { mount };
})();
