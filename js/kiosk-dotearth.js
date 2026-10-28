/**
 * KIOSK — dotted Earth
 *
 * The planet as a ball of dots, the same style as the home page's load intro
 * (inline in index.html): an even scatter of points over the sphere (a
 * Fibonacci lattice), the ones on land drawn as dots that shrink and fade
 * toward the edge, the far side showing faintly through a dark glassy ocean,
 * and a soft atmosphere round the rim. Plain 2D canvas: no WebGL, no images
 * to download, so it's ready the moment it's created.
 *
 * It has the same camera and API as js/kiosk-earth.js (the satellite Earth),
 * so the globe hero (js/kiosk-globe-hero.js) drives it unchanged:
 *
 *   const earth = KioskDotEarth.create(canvas, { view: { lat, lon, alt, tilt, px, py, fov }, maxDpr })
 *   earth.view.lat = …; earth.invalidate();
 *   earth.project(lat, lon, lift?) → { x, y, front } in CSS pixels
 *   earth.onFrame = (earth) => { … }   // runs after every repaint
 *   earth.destroy()
 *   KioskDotEarth.arc(a, b, n, height) → points along the great circle a → b
 *
 * Land: which lattice points are on land is the bitset below, written from
 * the Natural Earth coastlines by `node scripts/build-intro-land.js`.
 */
(function () {
  'use strict';

  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vec = (la, lo) => { const a = la * D2R; const b = lo * D2R; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const norm = (a) => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  /* Land dots as unit vectors, built once per page */
  const N = 9000;
  const LAND = /*LAND*/'AAAAAICQEJJCBkJICggIIUMg5gAMhIADMnIAJsyElphxEvP2JKyhhHSAgBoSEAJiQEIJCYH3ytp9f3t/f+2tvL2Vt/v3Vt7Oyln5Oysz5+ak3J2VlTNzWmbOyMm5OSE75+70zJyQnzNzen5OzM25OTk35+b03JyWm3Nzem5Oze25OTUn5+b0nJyak3Nzek5Oze25OTUnp+Z23Jyak3Nzam5Ozci4OT0nJ2bUnJyYkzEyek5Pzag4GTGn5ubUnJyYU3FyYkZNyKk4OTGnZsTknJiQUzFiYkZNyYkYMTGnZuTEjJyQkTNiakZMyOgZOSWjZ8TUjJiQUTNiSkZPiKkZMSWjJsSUjJ6SUXNiSkZNyCk5NSWnpsSUnJqSU3NqSk5BiSk5JSWnpMSUnJISU3NKSk5BqSkpJSWjoJSUnJISU1BKSk5BKSkoJSWipJQUnJJSUVJKCkxJKSkoJYWippQUkJJSQ0FKCgxJKSkgNYWCpJQUmJJSQUBqCgwJKSkgJYWCgNQUEBJSQUBKCg8BqSkgJIWCgNQUEIJSUkBoCgkBqSkgFIWAgNAUFoJSQkAoCgkBKSggBIWEgBAUEgJSQEAoCgsBIaAgBIWEgpBQEgJSUlEoKgkBIaEgBKSEghBQEgpSUkEIKAkFIaAoBJSEghBQEApSUkEIKAlFIaAgBJSEggBQEAoKUEEAKEhFBaAgABSAggBQEIoKUEEAKEgFBaAgEBWgggBQEIoKQFEgKkAFAaAgFBWggkBUAAoKQEEgKkJFBaAAFBWggkJUAAqKQAEhKkJFRaCAFBShAkJQAIqKQAEhKABFxaCAFBSBAmJQQAqKQAEhKAAHxaiAFBShAmJQQAqKQAEhKgBFhKCAFBSAAmJQAAoKQAEpKAAFhKAAFBSAAkJQAAoKQAEpKAAFhKAIFBSBIlJQAAoIQFEoKAAFhKAAFBSBIlBQAIoIQFEoKJLxEl/3OxiBolBQAIoIQBEoIgJFIaAIFBGBolBABIoIQBEoIgJFIagIFBGBIlBEBIoCUBEoIgJFoIgIFAWhIlBEBIoCUBEoAkJFoIgIFAWhIlAEBIrAEREoAkJFoAgIFAEhIlAEBIpAEREoAkJFoAgIFAEjIlAEBIpAERAoAkJEoAgIFAEjIFAEhIhAERAoAEZAoAAIEAAiIFAAhIBAARAgAARAgAAIAAACIEAACAAAARAgAARAgAAIAAACIEAACAAAARAAAAQCAAAQAAACAAAACAAAABAAAAQCAAAQAAACIAAACAAAAAAAAAQAAAAQAAAAACAACAAAACAAAAAAAAAQAAAAQAAACAAAACAAAAAAAAAQAAAAQAAAAAAAACAAAAAAAAAAAAAAQAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'/*LAND*/;
  let land = null;
  function landPoints() {
    if (land) return land;
    const bits = atob(LAND); const ga = Math.PI * (3 - Math.sqrt(5)); const out = [];
    for (let i = 0; i < N; i += 1) {
      if (!((bits.charCodeAt(i >> 3) >> (i & 7)) & 1)) continue;
      const y = 1 - ((i + 0.5) / N) * 2; const r = Math.sqrt(1 - y * y);
      out.push(r * Math.sin(i * ga), y, r * Math.cos(i * ga));
    }
    land = new Float32Array(out);
    return land;
  }

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const view = Object.assign({ lat: 40, lon: -80, alt: 1.6, tilt: 0.55, px: 0.5, py: 0.5, fov: 0.55 }, opts.view || {});
    const api = { view, gl: !!ctx, onFrame: null, ready: null, invalidate, project, destroy, resize, camera };
    if (!ctx) { api.ready = Promise.reject(new Error('no canvas')); api.ready.catch(() => {}); return api; }
    const pts = landPoints();
    // nothing to download: ready as soon as it exists
    api.ready = Promise.resolve();
    canvas.classList.add('is-ready');

    let raf = 0; let alive = true;
    function invalidate() { if (alive && !raf) raf = requestAnimationFrame(draw); }

    let w = 0; let h = 0; let dpr = 1;
    function resize() {
      const maxDpr = window.innerWidth < 760 ? 1.5 : (opts.maxDpr || 2);
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(2, Math.round(w * dpr)); canvas.height = Math.max(2, Math.round(h * dpr));
      invalidate();
    }

    /* Camera: the same as the satellite Earth's. Hang above a point south of
     * the target and look at it, tilted toward the horizon by view.tilt. */
    let C; let F; let R; let UP;
    function camera() {
      const P0 = vec(view.lat, view.lon);
      const a = view.lat * D2R; const bb = view.lon * D2R;
      const Nn = [-Math.sin(a) * Math.sin(bb), Math.cos(a), -Math.sin(a) * Math.cos(bb)];
      const off = add(scale(P0, Math.cos(view.tilt)), Nn, -Math.sin(view.tilt));
      C = add(P0, off, view.alt);
      F = norm(add(P0, C, -1));
      R = norm(cross(F, Nn));
      UP = cross(R, F);
      return { C, F, R, U: UP };
    }

    /** Screen position of (lat, lon) lifted `lift` globe radii off the ground. */
    function project(lat, lon, lift = 0) {
      if (!C) camera();
      const p = scale(vec(lat, lon), 1 + lift);
      const v = add(p, C, -1);
      const z = dot(v, F);
      if (z <= 0.0001) return { x: -1e4, y: -1e4, front: false };
      // hidden if the sight line from the camera meets the globe first
      const len = Math.hypot(v[0], v[1], v[2]); const dd = scale(v, 1 / len);
      const b = dot(C, dd); const c = dot(C, C) - 1; const disc = b * b - c;
      const front = !(disc > 0 && (-b - Math.sqrt(disc)) < len - 1e-4);
      const asp = w / h;
      const sx = dot(v, R) / (z * view.fov * asp); const sy = dot(v, UP) / (z * view.fov);
      return { x: (view.px + sx / 2) * w, y: (view.py - sy / 2) * h, front };
    }

    function draw() {
      raf = 0;
      if (!alive) return;
      camera();
      const f = h / (2 * view.fov);              // pixels per unit of v·R / z
      const ox = view.px * w; const oy = view.py * h;
      const D = Math.hypot(C[0], C[1], C[2]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (D <= 1.001) { if (api.onFrame) api.onFrame(api); return; }

      // the rim: the circle where sight lines graze the ball, projected
      const cn = scale(C, 1 / D); const lc = scale(cn, 1 / D); const lr = Math.sqrt(1 - 1 / (D * D));
      const e1 = norm(cross(Math.abs(cn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], cn)); const e2 = cross(cn, e1);
      const rim = new Path2D(); const ring = []; const K = 72;
      for (let i = 0; i < K; i += 1) {
        const t = (i / K) * 6.2832; const ct = Math.cos(t) * lr; const st = Math.sin(t) * lr;
        const v = [lc[0] + e1[0] * ct + e2[0] * st - C[0], lc[1] + e1[1] * ct + e2[1] * st - C[1], lc[2] + e1[2] * ct + e2[2] * st - C[2]];
        const z = Math.max(1e-4, dot(v, F));
        const x = ox + (dot(v, R) / z) * f; const y = oy - (dot(v, UP) / z) * f;
        if (i) rim.lineTo(x, y); else rim.moveTo(x, y);
        ring.push(x, y);
      }
      rim.closePath();
      // the ball's centre and size on screen, for the glow and the shading
      let bx = 0; let by = 0; let rr = 0;
      for (let i = 0; i < ring.length; i += 2) { bx += ring[i]; by += ring[i + 1]; }
      bx /= K; by /= K;
      for (let i = 0; i < ring.length; i += 2) rr += Math.hypot(ring[i] - bx, ring[i + 1] - by);
      rr = Math.max(1, rr / K);

      // atmosphere
      const g = ctx.createRadialGradient(bx, by, rr * 0.92, bx, by, rr * 1.3);
      g.addColorStop(0, 'rgba(70,140,255,.3)'); g.addColorStop(1, 'rgba(70,140,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rr * 1.3, 0, 6.2832); ctx.fill();

      // the dots: far side faint, near side bright, smaller and dimmer toward
      // the rim; dots well off screen are skipped (the camera can get close)
      const back = new Path2D(); const front = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const size = 0.0062 * f;                   // dot radius at unit depth, in px
      const pad = 12;
      for (let j = 0; j < pts.length; j += 3) {
        const px = pts[j]; const py = pts[j + 1]; const pz = pts[j + 2];
        const vx = px - C[0]; const vy = py - C[1]; const vz = pz - C[2];
        const z = vx * F[0] + vy * F[1] + vz * F[2];
        if (z <= 0.01) continue;
        const x = ox + ((vx * R[0] + vy * R[1] + vz * R[2]) / z) * f;
        const y = oy - ((vx * UP[0] + vy * UP[1] + vz * UP[2]) / z) * f;
        if (x < -pad || x > w + pad || y < -pad || y > h + pad) continue;
        const face = px * C[0] + py * C[1] + pz * C[2] - 1;   // > 0: this side of the rim
        if (face <= 0) { const s = Math.max(0.5, (size / z) * 0.5); back.rect(x - s, y - s, s * 2, s * 2); continue; }
        const k = Math.min(3, ((face / (D - 1)) * 4) | 0);
        const r = Math.max(0.6, (size / z) * (0.55 + 0.15 * k));
        front[k].moveTo(x + r, y); front[k].arc(x, y, r, 0, 6.2832);
      }
      ctx.fillStyle = 'rgba(140,175,255,.4)'; ctx.fill(back);
      const o = ctx.createRadialGradient(bx - rr * 0.35, by - rr * 0.4, rr * 0.1, bx, by, rr);
      o.addColorStop(0, 'rgba(22,40,84,.8)'); o.addColorStop(1, 'rgba(4,8,20,.84)');
      ctx.fillStyle = o; ctx.fill(rim);
      ctx.strokeStyle = 'rgba(150,190,255,.35)'; ctx.lineWidth = 1; ctx.stroke(rim);
      [0.3, 0.5, 0.72, 0.95].forEach((a, k) => { ctx.fillStyle = `rgba(214,228,255,${a})`; ctx.fill(front[k]); });

      if (api.onFrame) api.onFrame(api);
    }

    window.addEventListener('resize', resize);
    resize();
    function destroy() {
      alive = false; window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    }
    return api;
  }

  /** Points along the great circle a → b, bowed up off the ground. */
  function arc(a, b, n = 48, height = 0.08) {
    const A = vec(a.lat, a.lon); const B = vec(b.lat, b.lon);
    const d = Math.acos(clamp(dot(A, B), -1, 1));
    const out = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      let p;
      if (d < 1e-6) p = A; else { const s = Math.sin(d); p = add(scale(A, Math.sin((1 - t) * d) / s), B, Math.sin(t * d) / s); }
      out.push({ lat: Math.asin(clamp(p[1], -1, 1)) / D2R, lon: Math.atan2(p[0], p[2]) / D2R, lift: height * Math.min(1, d) * Math.sin(Math.PI * t), t });
    }
    return out;
  }

  window.KioskDotEarth = { create, arc };
})();
