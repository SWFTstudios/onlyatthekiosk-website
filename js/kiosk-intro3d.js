/**
 * KIOSK — 3D world traveler intro
 *
 * A dotted Earth (Natural Earth land, js/kiosk-world.js) in three.js. A
 * traveler flies a great-circle route New York → Reykjavík → London →
 * Marrakesh → Dubai → Tokyo while the camera chases them; passport stamps
 * land at each stop and a boarding pass updates. The camera then pulls
 * back and the KIOSK title lands.
 *
 *   KioskIntro3D.run(rootEl, { onDone, signal }) → { stop() }
 *
 * Needs window.THREE (js/vendor/three-r149.min.js) and window.KIOSK_WORLD.
 * Throws if WebGL is unavailable, so the caller can fall back.
 */
(function () {
  'use strict';

  const ROUTE = [
    { n: 'New York', code: 'JFK', la: 40.64, lo: -73.78, local: 'America/New_York', stamp: 'NYC' },
    { n: 'Reykjavík', code: 'KEF', la: 63.98, lo: -22.6, local: 'Atlantic/Reykjavik', stamp: 'ÍSLAND' },
    { n: 'London', code: 'LHR', la: 51.47, lo: -0.45, local: 'Europe/London', stamp: 'LONDON' },
    { n: 'Marrakesh', code: 'RAK', la: 31.6, lo: -8.04, local: 'Africa/Casablanca', stamp: 'مراكش' },
    { n: 'Dubai', code: 'DXB', la: 25.25, lo: 55.36, local: 'Asia/Dubai', stamp: 'دبي' },
    { n: 'Tokyo', code: 'HND', la: 35.55, lo: 139.78, local: 'Asia/Tokyo', stamp: '東京' },
  ];

  const T_IN = 1100;          // globe arrives
  const T_LEG = 1050;         // each flight
  const T_OUT = 1700;         // pull back + title
  const TOTAL = T_IN + T_LEG * (ROUTE.length - 1) + T_OUT;

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function vec(THREE, la, lo, r = 1) {
    const a = (la * Math.PI) / 180; const b = (lo * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
  }

  /** Point on the great circle a→b at u, lifted into a flight arc. */
  function arcPoint(THREE, a, b, u, out) {
    const d = a.angleTo(b);
    const s = Math.sin(d) || 1;
    const k1 = Math.sin((1 - u) * d) / s; const k2 = Math.sin(u * d) / s;
    out.set(a.x * k1 + b.x * k2, a.y * k1 + b.y * k2, a.z * k1 + b.z * k2).normalize();
    return out.multiplyScalar(1 + (0.035 + 0.11 * (d / Math.PI)) * Math.sin(Math.PI * u));
  }

  function dotTexture(THREE) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  function glowTexture(THREE) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  function run(root, opts = {}) {
    const THREE = window.THREE;
    if (!THREE || !window.KIOSK_WORLD) throw new Error('three.js or world data missing');
    const css = getComputedStyle(document.documentElement);
    const ink = new THREE.Color((css.getPropertyValue('--ink') || '#0f0f10').trim());
    const bg = new THREE.Color((css.getPropertyValue('--bg') || '#ffffff').trim());
    const signal = new THREE.Color((css.getPropertyValue('--signal') || '#ff5b23').trim());
    const dark = bg.getHSL({}).l < 0.5;

    const canvas = root.querySelector('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);

    const resize = () => {
      const w = root.clientWidth; const h = root.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < h ? 52 : 38;          // phones get a wider lens
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // Earth: occluder + land dots + graticule + rim
    const earth = new THREE.Group();
    scene.add(earth);
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(0.985, 64, 48), new THREE.MeshBasicMaterial({ color: bg })));

    const pts = window.KIOSK_WORLD.points();
    const pos = new Float32Array((pts.length / 2) * 3);
    for (let i = 0, j = 0; i < pts.length; i += 2, j += 3) {
      const v = vec(THREE, pts[i], pts[i + 1], 1.0);
      pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z;
    }
    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const landMat = new THREE.PointsMaterial({ color: ink, size: 0.0115, map: dotTexture(THREE), alphaTest: 0.4, transparent: true, opacity: 0 });
    earth.add(new THREE.Points(landGeo, landMat));

    const gridPts = [];
    for (let la = -60; la <= 60; la += 30) for (let lo = -180; lo < 180; lo += 3) gridPts.push(vec(THREE, la, lo, 1.001), vec(THREE, la, lo + 3, 1.001));
    for (let lo = -180; lo < 180; lo += 30) for (let la = -84; la < 84; la += 3) gridPts.push(vec(THREE, la, lo, 1.001), vec(THREE, la + 3, lo, 1.001));
    const gridMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0 });
    earth.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), gridMat));

    const rimMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: dark ? new THREE.Color('#9fb6ff') : ink }, uAlpha: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(uColor, f * uAlpha); }',
      transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 48), rimMat));

    // Route, pins, traveler
    const stops = ROUTE.map((c) => vec(THREE, c.la, c.lo, 1));
    const legs = [];
    const N = 90;
    for (let i = 0; i < stops.length - 1; i += 1) {
      const p = new Float32Array((N + 1) * 3); const tmp = new THREE.Vector3();
      for (let k = 0; k <= N; k += 1) { arcPoint(THREE, stops[i], stops[i + 1], k / N, tmp); p.set([tmp.x, tmp.y, tmp.z], k * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setDrawRange(0, 0);
      const m = new THREE.LineBasicMaterial({ color: signal, transparent: true, opacity: 1 });
      scene.add(new THREE.Line(g, m));
      legs.push({ g, m });
    }
    const pins = stops.map((s) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.022, 40), new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.copy(s).multiplyScalar(1.004);
      ring.lookAt(s.clone().multiplyScalar(2));
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.007, 20), new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      dot.position.copy(ring.position); dot.quaternion.copy(ring.quaternion);
      scene.add(ring, dot);
      return { ring, dot, hit: -1 };
    });
    const traveler = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 3), new THREE.MeshBasicMaterial({ color: signal }));
    body.rotation.x = Math.PI / 2;                       // cone points along +z (direction of travel)
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE), color: signal, transparent: true, depthWrite: false, opacity: 0.85 }));
    glow.scale.set(0.12, 0.12, 0.12);
    traveler.add(body, glow);
    traveler.visible = false;
    scene.add(traveler);

    // HTML overlay bits
    const labels = root.querySelector('[data-i3d-labels]');
    const stampEls = ROUTE.map((c, i) => {
      const el = document.createElement('div');
      el.className = 'k-i3d__stamp';
      el.innerHTML = `<b>${c.stamp}</b><span>${c.code} · ${String(i).padStart(2, '0')}</span>`;
      labels.append(el);
      return el;
    });
    const pass = root.querySelector('[data-i3d-pass]');
    const setPass = (i) => {
      const a = ROUTE[i]; const b = ROUTE[Math.min(i + 1, ROUTE.length - 1)];
      let local = '';
      try { local = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: b.local }).format(new Date()); } catch (e) { /* unknown zone */ }
      pass.innerHTML = `
        <span class="k-i3d__pass-k">KIOSK AIR · KSK 00${i + 1}</span>
        <span class="k-i3d__pass-row"><b>${a.code}</b><i>✈</i><b>${b.code}</b></span>
        <span class="k-i3d__pass-meta"><span>${a.n} → ${b.n}</span><span>Leg ${i + 1}/${ROUTE.length - 1}${local ? ` · ${local} local` : ''}</span></span>`;
    };
    setPass(0);

    // Camera rig
    const camPos = new THREE.Vector3(); const camLook = new THREE.Vector3(); const camUp = new THREE.Vector3(0, 1, 0);
    const want = new THREE.Vector3(); const wantLook = new THREE.Vector3(); const wantUp = new THREE.Vector3();
    const cur = new THREE.Vector3(); const ahead = new THREE.Vector3(); const behind = new THREE.Vector3();
    const mid = new THREE.Vector3(); const focus = new THREE.Vector3(); const back = new THREE.Vector3();
    camPos.copy(stops[0]).multiplyScalar(7).add(new THREE.Vector3(0, 1.5, 0));
    camLook.set(0, 0, 0);

    const t0 = performance.now();
    let raf = 0; let stopped = false; let disposed = false; let lastLeg = -1; let last = t0;

    function frame(now) {
      if (stopped) return;
      const t = now - t0;
      const dt = Math.min(64, now - last); last = now;
      // Smoothing per 60fps frame, scaled so slow devices don't trail behind
      const follow = (k) => 1 - Math.pow(1 - k, dt / 16.7);
      const fadeIn = clamp(t / T_IN, 0, 1);
      landMat.opacity = 0.92 * fadeIn; gridMat.opacity = (dark ? 0.16 : 0.11) * fadeIn; rimMat.uniforms.uAlpha.value = (dark ? 0.9 : 0.2) * fadeIn;

      const tJ = t - T_IN;
      const legF = tJ / T_LEG;
      const leg = clamp(Math.floor(legF), 0, legs.length - 1);
      const outT = clamp((t - T_IN - T_LEG * legs.length) / T_OUT, 0, 1);

      if (tJ < 0) {
        // Arrival: swing in over New York
        const e = ease(fadeIn);
        want.copy(stops[0]).multiplyScalar(7 - 4.6 * e).add(new THREE.Vector3(0, 1.5 * (1 - e) + 0.35, 0));
        wantLook.set(0, 0, 0).lerp(stops[0], 0.55 * e);
        wantUp.set(0, 1, 0);
        pins[0].ring.material.opacity = pins[0].dot.material.opacity = e;
      } else if (outT <= 0) {
        // Flights: chase cam rides behind and above the traveler
        const u = ease(clamp(legF - leg, 0, 1));
        if (leg !== lastLeg) { lastLeg = leg; setPass(leg); }
        const a = stops[leg]; const b = stops[leg + 1];
        arcPoint(THREE, a, b, u, cur);
        arcPoint(THREE, a, b, Math.min(1, u + 0.04), ahead);
        arcPoint(THREE, a, b, Math.max(0, u - 0.22), behind);
        traveler.visible = true;
        traveler.position.copy(cur);
        traveler.up.copy(cur).normalize();
        traveler.lookAt(ahead);
        legs[leg].g.setDrawRange(0, Math.round(u * N) + 1);
        for (let k = 0; k < leg; k += 1) { legs[k].g.setDrawRange(0, N + 1); legs[k].m.opacity = 0.55; }
        // Frame the whole leg: higher for long hops, eased toward its midpoint,
        // set back a little behind the traveler so the horizon shows
        const d = a.angleTo(b);
        arcPoint(THREE, a, b, 0.5, mid).normalize();
        focus.copy(cur).normalize().lerp(mid, 0.3 + 0.25 * (d / Math.PI)).normalize();
        back.copy(behind).sub(cur).normalize();
        want.copy(focus).multiplyScalar(1.7 + 1.1 * (d / Math.PI)).addScaledVector(back, 0.3);
        wantLook.copy(cur).multiplyScalar(0.55);
        wantUp.copy(focus);
        if (u > 0.98 && pins[leg + 1].hit < 0) pins[leg + 1].hit = now;
      } else {
        // Pull back: whole route on show, title lands
        const e = ease(outT);
        traveler.position.copy(stops[stops.length - 1]).multiplyScalar(1.01);
        legs.forEach((l) => { l.g.setDrawRange(0, N + 1); l.m.opacity = 0.9; });
        want.set(0.35, 0.55, 1).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.9 + e * 0.35).multiplyScalar(2.3 + 1.3 * e);
        wantLook.set(0, 0, 0);
        wantUp.set(0, 1, 0);
        root.classList.add('is-landed');
      }

      const k = follow(tJ < 0 ? 0.12 : 0.09);
      camPos.lerp(want, k); camLook.lerp(wantLook, k); camUp.lerp(wantUp, follow(0.06)).normalize();
      camera.position.copy(camPos); camera.up.copy(camUp); camera.lookAt(camLook);
      glow.material.opacity = 0.65 + 0.3 * Math.sin(now / 90);

      // Pins pulse when reached; stamps follow their city on screen
      const w = root.clientWidth; const h = root.clientHeight;
      pins.forEach((p, i) => {
        if (i > 0 && p.hit > 0) {
          const s = clamp((now - p.hit) / 700, 0, 1);
          p.ring.scale.setScalar(1 + s * 2.2); p.ring.material.opacity = 1 - s * 0.6; p.dot.material.opacity = 1;
        }
        const v = stops[i].clone().project(camera);
        const facing = stops[i].clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
        const shown = (i === 0 && fadeIn > 0.6) || p.hit > 0;
        const el = stampEls[i];
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
        el.classList.toggle('is-on', shown && facing && v.z < 1);
      });

      renderer.render(scene, camera);
      // Hold the last frame on screen; the caller fades out, then calls stop()
      if (t >= TOTAL) { stopped = true; if (opts.onDone) opts.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (disposed) return;
      disposed = true;
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    }

    raf = requestAnimationFrame(frame);
    return { stop, duration: TOTAL };
  }

  window.KioskIntro3D = { run, route: ROUTE };
})();
