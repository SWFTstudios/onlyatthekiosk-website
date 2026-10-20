/**
 * KIOSK — the logo globe under the departures board on the home page
 * ------------------------------------------------------------
 * A vector globe drawn like the KIOSK mark: a heavy outline, a bold
 * graticule, solid continents (Natural Earth, data/land-110m.geojson), an
 * orbit ring that passes behind the planet and back across the front, and a
 * four-point star. Ink and paper come from the theme (--ink / --bg), so it
 * turns white-on-black at night.
 *
 * It starts tucked under the board and slides out from beneath it as the
 * board scrolls up the screen (CSS var --vg-p, 0 → 1 on the element), turning
 * slowly the whole time and a little faster with the scroll. Reduced motion:
 * already out, standing still.
 *
 *   KioskLogoGlobe.mount(el, { anchor, reduced }) → { stop() }
 *   el      wrapper holding a <canvas>
 *   anchor  the element it hides under (the board); the slide follows its bottom edge
 */
(function () {
  'use strict';

  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let landReady = null;
  // Coastline rings as flat [lat, lon, lat, lon, …] in radians, fetched once per page
  function loadLand() {
    if (!landReady) {
      landReady = fetch('data/land-110m.geojson').then((r) => r.json()).then((gj) => {
        const rings = [];
        (gj.features || []).forEach((f) => {
          const g = f.geometry || {};
          const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
          // outer rings only: the logo's continents are solid, lakes and all
          polys.forEach((poly) => {
            const ring = poly[0];
            if (!ring || ring.length < 4) return;
            const out = new Float32Array(ring.length * 2);
            ring.forEach(([lo, la], i) => { out[i * 2] = la * D2R; out[i * 2 + 1] = lo * D2R; });
            rings.push(out);
          });
        });
        return rings;
      }).catch(() => []);
    }
    return landReady;
  }

  function mount(el, opts = {}) {
    const canvas = el.querySelector('canvas');
    if (!canvas || !canvas.getContext) return { stop() {} };
    const ctx = canvas.getContext('2d');
    const anchor = opts.anchor || el;
    const reduced = !!opts.reduced;
    let rings = [];
    let alive = true;
    let on = false;
    let raf = 0;
    let w = 0; let h = 0; let dpr = 1;
    let ink = '#0f0f10'; let paper = '#ffffff';

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = (cs.getPropertyValue('--ink') || '').trim() || ink;
      paper = (cs.getPropertyValue('--bg') || '').trim() || paper;
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(2, Math.round(w * dpr)); canvas.height = Math.max(2, Math.round(h * dpr));
    };

    // Camera: north up, seen from a little above the equator
    const VIEW_LAT = 16 * D2R;
    const sinV = Math.sin(VIEW_LAT); const cosV = Math.cos(VIEW_LAT);
    let lon0 = -62 * D2R;   // the Americas face front first, like the mark
    // orthographic: → [x, y, z] with z > 0 facing us (unit sphere)
    const proj = (la, lo) => {
      const cl = Math.cos(la); const dl = lo - lon0;
      const x = cl * Math.sin(dl);
      const y = cosV * Math.sin(la) - sinV * cl * Math.cos(dl);
      const z = sinV * Math.sin(la) + cosV * cl * Math.cos(dl);
      return [x, y, z];
    };

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w / 2.9, h / 2.35);
      const cx = w * 0.48; const cy = h * 0.53;
      const line = Math.max(1.4, R * 0.022);
      const X = (p) => cx + p[0] * R; const Y = (p) => cy - p[1] * R;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      // the orbit ring: a band (ink, with a paper line down its middle) on a tilted ellipse
      const ring = (from, to) => {
        const rx = R * 1.36; const ry = R * 0.38; const rot = -16 * D2R;
        const path = () => { ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.06, rx, ry, rot, from, to); };
        path(); ctx.strokeStyle = paper; ctx.lineWidth = R * 0.16; ctx.stroke();      // a gap round it
        path(); ctx.strokeStyle = ink; ctx.lineWidth = R * 0.095; ctx.stroke();
        path(); ctx.strokeStyle = paper; ctx.lineWidth = R * 0.026; ctx.stroke();
      };
      ring(Math.PI, Math.PI * 2);   // the half behind the planet

      // the sphere: paper inside a heavy ink outline (with a paper gap so the ring reads as behind)
      ctx.beginPath(); ctx.arc(cx, cy, R + line * 2.2, 0, Math.PI * 2); ctx.fillStyle = paper; ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = paper; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // continents: solid ink; points round the back are pulled onto the rim so the fill stays whole
      ctx.fillStyle = ink;
      rings.forEach((rg) => {
        let any = false; let started = false;
        for (let i = 0; i < rg.length; i += 2) { if (proj(rg[i], rg[i + 1])[2] > 0) { any = true; break; } }
        if (!any) return;
        ctx.beginPath();
        for (let i = 0; i < rg.length; i += 2) {
          const p = proj(rg[i], rg[i + 1]);
          if (p[2] < 0) { const m = Math.hypot(p[0], p[1]) || 1; p[0] /= m; p[1] /= m; }
          if (started) ctx.lineTo(X(p), Y(p)); else { ctx.moveTo(X(p), Y(p)); started = true; }
        }
        ctx.closePath();
        ctx.fill();
      });

      // graticule: bold lines every 30°, front side only, a paper edge where they cross land
      const graticule = (style, width) => {
        ctx.strokeStyle = style; ctx.lineWidth = width;
        ctx.beginPath();
        const seg = (pts) => { let pen = false; pts.forEach((p) => { if (p[2] > -0.02) { if (pen) ctx.lineTo(X(p), Y(p)); else { ctx.moveTo(X(p), Y(p)); pen = true; } } else pen = false; }); };
        for (let lo = -180; lo < 180; lo += 30) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push(proj(la * D2R, lo * D2R)); seg(pts); }
        for (let la = -60; la <= 60; la += 30) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push(proj(la * D2R, lo * D2R)); seg(pts); }
        ctx.stroke();
      };
      graticule(ink, line * 0.9);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.strokeStyle = ink; ctx.lineWidth = line * 2.2; ctx.stroke();

      ring(0, Math.PI);             // and back across the front

      // the four-point star, twinkling
      const star = (sx, sy, s) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const a = (i * Math.PI) / 4 - Math.PI / 2; const r = i % 2 ? s * 0.18 : s;
          ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.lineWidth = R * 0.05; ctx.strokeStyle = paper; ctx.stroke();
        ctx.fillStyle = ink; ctx.fill();
      };
      const tw = reduced ? 1 : 0.86 + 0.14 * Math.sin(now / 520);
      star(cx + R * 1.22, cy - R * 0.62, R * 0.2 * tw);
      star(cx - R * 1.18, cy - R * 0.92, R * 0.09 * (reduced ? 1 : 0.8 + 0.2 * Math.sin(now / 410 + 2)));
    }

    // how far out from under the board: 0 while its bottom edge is low on the
    // screen, 1 once it has risen past the middle
    const emerge = () => {
      const vh = window.innerHeight || 1;
      const b = anchor.getBoundingClientRect().bottom;
      return clamp((vh * 0.95 - b) / (vh * 0.5), 0, 1);
    };
    let shownP = -1;
    let lastY = window.scrollY; let lastT = 0;
    const SPIN = 7 * D2R;        // per second, idling
    const loop = (now) => {
      raf = 0;
      if (!alive || !on) return;
      const dt = Math.min(64, now - (lastT || now)); lastT = now;
      if (!reduced) {
        const y = window.scrollY;
        lon0 += SPIN * dt / 1000 + (y - lastY) * 0.12 * D2R;   // scrolling turns it too
        lastY = y;
        const p = emerge();
        if (Math.abs(p - shownP) > 0.002) { shownP = p; el.style.setProperty('--vg-p', p.toFixed(3)); }
      }
      draw(now);
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    const wake = () => { if (alive && on && !raf) raf = requestAnimationFrame(loop); };

    readTheme();
    resize();
    if (reduced) el.style.setProperty('--vg-p', '1');
    else el.style.setProperty('--vg-p', emerge().toFixed(3));
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; lastT = 0; lastY = window.scrollY; wake(); }, { rootMargin: '120px 0px' });
    io.observe(el);
    const onResize = () => { resize(); if (reduced) wake(); };
    window.addEventListener('resize', onResize);
    // day/night: re-read the ink when the theme flips
    const mo = new MutationObserver(() => { readTheme(); wake(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    loadLand().then((r) => { rings = r; wake(); });

    return {
      stop() {
        alive = false; io.disconnect(); mo.disconnect();
        window.removeEventListener('resize', onResize);
        if (raf) cancelAnimationFrame(raf);
      },
    };
  }

  window.KioskLogoGlobe = { mount };
})();
