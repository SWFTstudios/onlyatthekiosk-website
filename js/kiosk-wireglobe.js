/**
 * KIOSK — wireframe globe for the Atlas header
 * ------------------------------------------------------------
 * An orthographic globe drawn on a 2D canvas: Natural Earth coastlines
 * (data/land-110m.geojson, public domain), a graticule that gets finer as
 * you zoom in, and real cities as plot points. The far side shows through,
 * faintly, like a wireframe. Swipe or drag to turn it (with momentum),
 * pinch, ctrl/⌘-scroll or the zoom buttons to zoom, double-tap to fly in.
 *
 * It answers project(lat, lon) → { x, y, front } like KioskEarth, so
 * KioskEarth.labels() and the story pins work on it unchanged.
 *
 *   KioskWireGlobe.create(canvas, { view: { lat, lon, zoom, cx, cy, fit }, cities, grabZoom, onFrame })
 *     → { view, project, invalidate, zoomTo(z), zoomBy(k), face(lat, lon, zoom?), destroy(), ready, onFrame }
 *   view.cx / view.cy   globe centre as a fraction of the canvas
 *   view.fit            radius at zoom 1 as a fraction of min(width, height)
 *   grabZoom            above this zoom the globe takes every touch gesture;
 *                       below it vertical swipes still scroll the page
 */
(function () {
  'use strict';

  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MIN_ZOOM = 0.8;
  const MAX_ZOOM = 6;   // past this the 110m coastlines run out of detail
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let landReady = null;
  // Coastline rings as [lat, lon] radians, fetched once per page
  function loadLand() {
    if (!landReady) {
      landReady = fetch('data/land-110m.geojson').then((r) => r.json()).then((gj) => {
        const rings = [];
        (gj.features || []).forEach((f) => {
          const g = f.geometry || {};
          const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
          polys.forEach((poly) => poly.forEach((ring) => {
            const out = new Float32Array(ring.length * 2);
            ring.forEach(([lo, la], i) => { out[i * 2] = la * D2R; out[i * 2 + 1] = lo * D2R; });
            rings.push(out);
          }));
        });
        return rings;
      });
    }
    return landReady;
  }

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const view = Object.assign({ lat: 30, lon: -40, zoom: 1, cx: 0.5, cy: 0.5, fit: 0.42 }, opts.view || {});
    const cities = opts.cities || [];
    let land = [];
    let W = 0; let H = 0; let dpr = 1;
    let raf = 0; let dirty = true; let alive = true; let seen = true;
    let vLon = 0; let vLat = 0;                 // momentum, degrees per frame
    let target = null;                           // { lat, lon, zoom } easing toward
    const api = { view, onFrame: opts.onFrame || null };

    const R = () => Math.min(W, H) * view.fit * view.zoom;
    const centre = () => [W * view.cx, H * view.cy];
    // Orthographic projection about (view.lat, view.lon)
    const proj = (la, lo, out) => {
      const c0 = Math.cos(view.lat * D2R); const s0 = Math.sin(view.lat * D2R);
      const cl = Math.cos(la); const dl = lo - view.lon * D2R;
      const x = cl * Math.sin(dl);
      const y = c0 * Math.sin(la) - s0 * cl * Math.cos(dl);
      const z = s0 * Math.sin(la) + c0 * cl * Math.cos(dl);
      const r = R(); const [cx, cy] = centre();
      out[0] = cx + x * r; out[1] = cy - y * r; out[2] = z;
      return out;
    };
    const tmp = [0, 0, 0];
    api.project = (lat, lon) => { proj(lat * D2R, lon * D2R, tmp); return { x: tmp[0], y: tmp[1], front: tmp[2] > 0.02, z: tmp[2] }; };

    function resize() {
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== W || h !== H || canvas.width !== Math.round(w * dpr)) {
        W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
    }

    // A polyline on the sphere, front half crisp and back half faint, in two passes
    const p = [0, 0, 0]; const q = [0, 0, 0];
    function strokeRing(pts, step, front) {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < pts.length; i += step) {
        proj(pts[i], pts[i + 1], p);
        if ((p[2] > 0) === front) { if (pen) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); pen = true; } else pen = false;
      }
      ctx.stroke();
    }
    function strokeLine(fn, n, front) {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i += 1) {
        const [la, lo] = fn(i / n);
        proj(la, lo, q);
        if ((q[2] > 0) === front) { if (pen) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); pen = true; } else pen = false;
      }
      ctx.stroke();
    }

    function draw() {
      resize();
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const r = R(); const [cx, cy] = centre();
      const ink = getComputedStyle(canvas).color || '#fff';

      // The sphere: a dark body with a lit rim (blue by default; accent shade when chosen)
      const accentOn = !!document.documentElement.dataset.accent;
      let ar = 120; let ag = 170; let ab = 255;
      if (accentOn) {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim() || '#ff5b23';
        const probe = document.createElement('canvas'); probe.width = 1; probe.height = 1;
        const pc = probe.getContext('2d'); pc.fillStyle = raw; pc.fillRect(0, 0, 1, 1);
        const px = pc.getImageData(0, 0, 1, 1).data;
        ar = px[0]; ag = px[1]; ab = px[2];
      }
      const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      if (accentOn) {
        body.addColorStop(0, `rgba(${Math.round(ar * 0.22)}, ${Math.round(ag * 0.22)}, ${Math.round(ab * 0.22)}, 0.62)`);
        body.addColorStop(1, 'rgba(4, 5, 8, 0.92)');
      } else {
        body.addColorStop(0, 'rgba(40, 60, 96, 0.55)'); body.addColorStop(1, 'rgba(6, 10, 22, 0.85)');
      }
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.12);
      halo.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${accentOn ? 0.34 : 0.28})`);
      halo.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // Graticule: 15° whole-globe, 5° once zoomed, 1° close in
      const g = view.zoom > 5 ? 1 : view.zoom > 2.2 ? 5 : 15;
      const major = (deg) => Math.abs(deg % 15) < 1e-6;
      [false, true].forEach((front) => {
        for (let la = -90 + g; la < 90; la += g) {
          ctx.globalAlpha = front ? (la === 0 ? 0.42 : major(la) ? 0.2 : 0.09) : 0.05;
          ctx.lineWidth = la === 0 ? 1 : 0.7;
          strokeLine((t) => [la * D2R, (-180 + 360 * t) * D2R], 120, front);
        }
        for (let lo = -180; lo < 180; lo += g) {
          ctx.globalAlpha = front ? (lo === 0 ? 0.36 : major(lo) ? 0.18 : 0.08) : 0.04;
          ctx.lineWidth = 0.7;
          strokeLine((t) => [(-90 + 180 * t) * D2R, lo * D2R], 90, front);
        }
      });

      // Coastlines: the far side shows through faintly
      const step = view.zoom > 2 ? 2 : view.zoom > 1.2 ? 4 : 6;     // vertices × 2 per step
      ctx.lineWidth = 0.6; ctx.globalAlpha = 0.13;
      land.forEach((ring) => strokeRing(ring, step, false));
      ctx.lineWidth = view.zoom > 3 ? 1.4 : 1.1; ctx.globalAlpha = 0.85;
      land.forEach((ring) => strokeRing(ring, view.zoom > 2 ? 2 : 4, true));

      // Rim
      ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

      // City plot points
      ctx.fillStyle = ink;
      cities.forEach((c) => {
        proj(c.lat * D2R, c.lon * D2R, p);
        if (p[2] <= 0.02) return;
        ctx.globalAlpha = Math.min(1, p[2] * 3) * 0.9;
        const s = view.zoom > 2.5 ? 4 : 3;
        ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
      });
      ctx.globalAlpha = 1;
      if (api.onFrame) api.onFrame();
    }

    function frame() {
      raf = 0;
      if (!alive) return;
      let moving = false;
      if (target) {
        const k = 0.12;
        let dLon = ((target.lon - view.lon + 540) % 360) - 180;
        view.lon += dLon * k; view.lat += (target.lat - view.lat) * k;
        if (target.zoom != null) view.zoom += (target.zoom - view.zoom) * k;
        if (Math.abs(dLon) < 0.05 && Math.abs(target.lat - view.lat) < 0.05 && (target.zoom == null || Math.abs(target.zoom - view.zoom) < 0.005)) target = null;
        moving = true;
      } else if (!drag && (Math.abs(vLon) > 0.005 || Math.abs(vLat) > 0.005)) {
        view.lon += vLon; view.lat = clamp(view.lat + vLat, -80, 80);
        vLon *= 0.94; vLat *= 0.94; moving = true;
      }
      if (moving || dirty) { draw(); dirty = false; }
      if ((moving || dirty) && seen) raf = requestAnimationFrame(frame);
    }
    const invalidate = () => { dirty = true; if (!raf && alive && seen) raf = requestAnimationFrame(frame); };
    api.invalidate = invalidate;
    const wrap = (lo) => ((lo + 540) % 360) - 180;

    api.zoomTo = (z) => { target = { lat: view.lat, lon: view.lon, zoom: clamp(z, MIN_ZOOM, MAX_ZOOM) }; if (REDUCED) { view.zoom = target.zoom; target = null; } invalidate(); };
    api.zoomBy = (k) => api.zoomTo((target && target.zoom != null ? target.zoom : view.zoom) * k);
    api.face = (lat, lon, zoom) => { target = { lat: clamp(lat, -80, 80), lon, zoom: zoom != null ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : null }; if (REDUCED) { Object.assign(view, { lat: target.lat, lon: target.lon }); if (zoom != null) view.zoom = target.zoom; target = null; } invalidate(); };

    // The point under the finger, for double-tap
    function unproject(x, y) {
      const r = R(); const [cx, cy] = centre();
      const px = (x - cx) / r; const py = (cy - y) / r;
      const rho = Math.hypot(px, py);
      if (rho > 1) return null;
      const c = Math.asin(rho); const sc = Math.sin(c); const cc = Math.cos(c);
      const l0 = view.lat * D2R;
      const lat = rho ? Math.asin(cc * Math.sin(l0) + (py * sc * Math.cos(l0)) / rho) : l0;
      const lon = view.lon * D2R + Math.atan2(px * sc, rho * Math.cos(l0) * cc - py * Math.sin(l0) * sc);
      return { lat: lat / D2R, lon: wrap(lon / D2R) };
    }

    /* Gestures: one pointer turns the globe, two pinch to zoom. On touch
     * the page still scrolls with vertical swipes until you zoom in; then
     * the globe takes every gesture. */
    const pointers = new Map();
    let drag = null; let pinch = null; let lastTap = 0;
    const grabZoom = opts.grabZoom || 1.25;
    const setTouch = () => { canvas.style.touchAction = view.zoom > grabZoom ? 'none' : 'pan-y'; };
    setTouch();
    const rect = () => canvas.getBoundingClientRect();
    canvas.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      target = null; vLon = 0; vLat = 0;
      if (pointers.size === 1) {
        const now = performance.now();
        if (now - lastTap < 300) {        // double-tap / double-click: fly in where you tapped
          const b = rect(); const at = unproject(e.clientX - b.left, e.clientY - b.top);
          if (at) api.face(at.lat, at.lon, view.zoom * 2);
          lastTap = 0; return;
        }
        lastTap = now;
        drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: now, lat: view.lat, lon: view.lon, moved: false };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
        drag = null;
      }
      if (api.onGrab) api.onGrab();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        view.zoom = clamp(pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), MIN_ZOOM, MAX_ZOOM);
        setTouch(); invalidate(); return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        // On touch at the default zoom a mostly vertical swipe belongs to the page
        if (e.pointerType === 'touch' && canvas.style.touchAction === 'pan-y' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.moved = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
        canvas.classList.add('is-dragging');
      }
      const per = 1 / (R() * D2R);                       // degrees per pixel at the centre
      view.lon = wrap(drag.lon - dx * per);
      view.lat = clamp(drag.lat + dy * per, -80, 80);
      const now = performance.now(); const dt = Math.max(1, now - drag.t) / 16.7;
      vLon = (-(e.clientX - drag.lx) * per) / dt; vLat = ((e.clientY - drag.ly) * per) / dt;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
      invalidate();
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        if (drag && performance.now() - drag.t > 80) { vLon = 0; vLat = 0; }   // held still before letting go
        drag = null; canvas.classList.remove('is-dragging');
        if (REDUCED) { vLon = 0; vLat = 0; }
        invalidate();
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    // Trackpad pinch (ctrl + wheel) and ⌘/ctrl-scroll zoom; a plain scroll keeps scrolling the page
    canvas.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      target = null;
      view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
      setTouch(); invalidate();
      if (api.onGrab) api.onGrab();
    }, { passive: false });
    const onResize = () => invalidate();
    window.addEventListener('resize', onResize);
    const onPrefs = () => invalidate();
    document.addEventListener('kiosk:prefs', onPrefs);
    const io = new IntersectionObserver(([en]) => { seen = en.isIntersecting; if (seen) invalidate(); });
    io.observe(canvas);

    const origZoomTo = api.zoomTo;
    api.zoomTo = (z) => { origZoomTo(z); setTouch(); };
    api.ready = loadLand().then((rings) => { land = rings; invalidate(); });
    api.destroy = () => { alive = false; io.disconnect(); window.removeEventListener('resize', onResize); document.removeEventListener('kiosk:prefs', onPrefs); if (raf) cancelAnimationFrame(raf); };
    invalidate();
    return api;
  }

  window.KioskWireGlobe = { create, MIN_ZOOM, MAX_ZOOM };
})();
