/**
 * KIOSK — the globe hero at the top of the home page
 *
 *   1. Opening flight (first visit of the session): the satellite Earth
 *      (js/kiosk-earth.js) turns while a flight hops round the world toward
 *      the visitor's town, each stop closer to home.
 *   2. The camera settles into the hero: a full sphere floating in night sky
 *      under the headline (not a flat horizon strip), the visitor's town
 *      pinned with a sonar pulse, everyone else on the site right now pinned
 *      where they are (/api/live, city level), and flights streaking between them.
 *   3. Idle: the planet turns slowly back and forth under the pins, new
 *      flights keep taking off; everything stops while the hero is off screen.
 *   4. Scroll: the stage stays pinned while the page scrolls through the
 *      section. The headline lifts away, the whole planet rises into view and
 *      turns with the page: clockwise (seen from the north pole) going down,
 *      back again going up. Drag it (or swipe sideways) to spin it by hand.
 *
 * The Earth is real: NASA day and night imagery with the sun where it is
 * right now, so the day/night line is the actual one. Return visits skip the
 * opening flight; reduced motion gets one still frame.
 *
 *   KioskGlobeHero.mount(section, { Earth, home, journey, reduced, onSeen }) → { setLive(viewers, count), stop() }
 */
(function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const D2R = Math.PI / 180;
  const vec = (la, lo) => { const a = la * D2R; const b = lo * D2R; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; };
  const angle = (a, b) => { const p = vec(a.lat, a.lon); const q = vec(b.lat, b.lon); return Math.acos(clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1)) / D2R; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  /* Hubs for the opening flight and for the streaks between pins */
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
  ].map(([n, c, lat, lon]) => ({ n, c, lat, lon }));
  const km = (a, b) => angle(a, b) * 111.19;

  /** A few hops round the world that end over home, each closer than the last. */
  function routeTo(home) {
    const end = { n: home.city || 'Home', c: 'YOU', lat: home.lat, lon: home.lon, home: true };
    const stops = [];
    [[9000, 17000], [5000, 9000], [1800, 5000], [300, 1800]].forEach(([lo, hi]) => {
      const pool = HUBS.filter((x) => { const d = km(x, end); return d >= lo && d < hi && !stops.includes(x); });
      if (!pool.length) return;
      const prev = stops[stops.length - 1];
      stops.push(prev ? pool.sort((a, b) => km(a, prev) - km(b, prev))[Math.floor(Math.random() * Math.min(2, pool.length))]
        : pool[Math.floor(Math.random() * pool.length)]);
    });
    return stops.concat(end);
  }

  /** A tiny tween: animates numeric keys of obj to `to` over ms; resolves when done. */
  function tween(obj, to, ms, fn = ease, live = () => true) {
    const from = {}; Object.keys(to).forEach((k) => { from[k] = obj[k]; });
    const t0 = performance.now();
    return new Promise((done) => {
      const step = (now) => {
        if (!live()) { done(); return; }
        const k = fn(clamp((now - t0) / ms, 0, 1));
        Object.keys(to).forEach((key) => { obj[key] = from[key] + (to[key] - from[key]) * k; });
        if (k < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function mount(section, opts) {
    const { Earth } = opts;
    const home = opts.home && opts.home.lat != null ? opts.home : { lat: 40.71, lon: -74.0, city: 'New York' };
    const earthEl = section.querySelector('[data-gh-earth]');
    const fx = section.querySelector('[data-gh-fx]');
    const route = section.querySelector('[data-gh-route]');
    const pin = section.querySelector('[data-gh-pin]') || section;
    const copy = section.querySelector('.k-gh__copy');
    const reduced = !!opts.reduced;
    const journey = !!opts.journey && !reduced;
    let alive = true;
    const isAlive = () => alive;

    const earth = Earth && earthEl ? Earth.create(earthEl, { view: { lat: home.lat, lon: home.lon, alt: 3, tilt: 0, fov: 0.55, px: 0.5, py: 0.5 }, maxDpr: 1.5, relief: 1 }) : null;
    if (!earth || !earth.gl) { section.classList.add('is-flat'); if (earth) earth.destroy(); return { setLive() {}, stop() {} }; }
    // the tall scroll scene only once there's a planet to turn
    if (!reduced) section.classList.add('is-scene');
    const ctx = fx.getContext('2d');
    let w = 0; let h = 0; let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 2);
      w = fx.clientWidth; h = fx.clientHeight;
      fx.width = Math.max(2, Math.round(w * dpr)); fx.height = Math.max(2, Math.round(h * dpr));
    };
    resize();

    /* Hero framing: a full sphere floating in space under the headline —
     * small enough that the limb reads all the way around (not a flat
     * horizon strip across the bottom of the screen). */
    const V = { lat: home.lat, lon: home.lon, alt: 3, py: 0.5, sway: 0, hero: 0 };
    function heroFrame() {
      const mobile = w < 760;
      // Whole ball in view: leave night sky around the limb
      const R = mobile
        ? Math.min(w * 0.48, h * 0.30)
        : Math.min(w * 0.34, h * 0.38);
      const last = copy && copy.lastElementChild;
      const below = last ? copy.offsetTop + last.offsetTop + last.offsetHeight + 28 : 0;
      // Top of the sphere sits just under the CTAs; keep the bottom limb on screen
      const topPx = Math.max(below, mobile ? h * 0.40 : h * 0.36);
      const maxTop = h - 2 * R - (mobile ? 88 : 48);
      const top = clamp(Math.min(topPx, maxTop) / Math.max(1, h), 0.28, 0.58);
      const rh = R / Math.max(1, h);
      const tanT = 2 * 0.55 * rh;
      const D = 1 / Math.sin(Math.atan(tanT));
      const cap = Math.acos(1 / D) / D2R;
      const py = top + rh;
      // Home near the visual centre of the sphere (slightly above mid)
      const clearBottom = mobile ? 100 : 56;
      const targetY = clamp(top * h + R * 0.28, top * h + R * 0.12, h - clearBottom - R * 0.35);
      const want = 2 * 0.55 * (py - targetY / h);
      let lo = 0; let hi = Math.acos(1 / D) * 0.96;
      for (let i = 0; i < 30; i += 1) { const a = (lo + hi) / 2; if (Math.sin(a) / (D - Math.cos(a)) < want) lo = a; else hi = a; }
      return { alt: D - 1, py, lat: clamp(home.lat - lo / D2R, -75, 75), cap, sway: mobile ? 0.12 : 0.28, top: top * h };
    }
    // the whole planet in frame for the opening flight, whatever the screen shape
    const farAlt = () => { const tanR = 0.55 * 0.62 * Math.min(w, h) / Math.max(1, h); return Math.sqrt(1 + 1 / (tanR * tanR)) - 1; };
    let frame = heroFrame();

    /* Scrolled down: the whole planet, centred in what's left of the screen
     * between the nav and the caption (and the tab bar on phones) */
    function fullFrame() {
      const mobile = w < 760;
      const vh = Math.min(h, window.innerHeight || h);
      const top = (h - vh) + 84; const bottom = mobile ? 168 : 104;
      const avail = Math.max(120, vh - 84 - bottom);
      const R = Math.min(w * 0.46, avail * 0.48);
      const D = 1 / Math.sin(Math.atan(2 * 0.55 * R / Math.max(1, h)));
      return { alt: D - 1, py: (top + avail / 2) / Math.max(1, h), lat: clamp(home.lat * 0.7, -35, 45) };
    }
    let full = fullFrame();

    /* Scroll and drag. P eases after the page's scroll position p; the
     * framing (hero → whole planet) happens over the first stretch, the spin
     * over the whole section. Drag adds its own turn, with a little coast. */
    const SPIN = 320;            // degrees of turn across the section
    const scene = { p: 0, P: 0, s: 0 };
    const D = { lat: 0, lon: 0, vel: 0 };
    let drag = null; let swayOff = false;
    // the section's place in the page, measured on resize: reading it per frame
    // would force a layout in the middle of every scroll
    let secTop = 0; let secH = 0;
    const measureSec = () => { let y = 0; for (let e = section; e; e = e.offsetParent) y += e.offsetTop; secTop = y; secH = section.offsetHeight; };
    measureSec();
    const progress = () => {
      const run = secH - (window.innerHeight || h);
      return run > 1 ? clamp((window.scrollY - secTop) / run, 0, 1) : 0;
    };
    let outShown = -1; let inShown = -1;
    function syncCopy() {
      const out = clamp(scene.P / 0.2, 0, 1);
      const inn = clamp((scene.P - 0.3) / 0.14, 0, 1) * V.hero;
      if (Math.abs(out - outShown) > 0.002) { outShown = out; section.style.setProperty('--gh-out', out.toFixed(3)); section.classList.toggle('is-away', out > 0.5); }
      if (Math.abs(inn - inShown) > 0.002) { inShown = inn; section.style.setProperty('--gh-in', inn.toFixed(3)); }
    }
    // short screens: the pinned stage is taller than the window, so it pins
    // by its bottom edge and the headline scrolls up out of the way first
    const stick = () => { section.style.setProperty('--gh-stick', `${Math.min(0, Math.round((window.innerHeight || 0) - pin.offsetHeight))}px`); };
    stick();

    /* Pins and flights */
    let viewers = [];            // [{ lat, lon, city, n }]
    let count = 0;
    const flights = [];          // { pts, t0, dur, home }
    const SONAR = 2600;
    let lastSpawn = 0;
    const visibleFrom = (p, k = 1.5) => angle(p, earth.view) < (Math.acos(1 / (earth.view.alt + 1)) / D2R) * k;
    function spawn(now) {
      const places = viewers.length ? viewers : [];
      const pool = HUBS.concat(places.map((v) => ({ n: v.city, lat: v.lat, lon: v.lon, viewer: true })));
      const near = pool.filter((p) => visibleFrom(p, 1.9) && angle(p, home) > 3);
      if (near.length < 2) return;
      const pick = () => near[Math.floor(Math.random() * near.length)];
      let a = pick(); let b = Math.random() < 0.45 ? { lat: home.lat, lon: home.lon, home: true } : pick();
      // viewers fly in to the visitor more often than not
      if (places.length && Math.random() < 0.5) { const v = places[Math.floor(Math.random() * places.length)]; a = { lat: v.lat, lon: v.lon }; b = { lat: home.lat, lon: home.lon, home: true }; }
      const d = angle(a, b);
      if (d < 4) return;
      const pts = Earth.arc(a, b, 72, 0.05 + Math.min(0.06, d / 900));
      flights.push({ pts, t0: now, dur: 2400 + d * 28, home: !!b.home });
      if (flights.length > 9) flights.shift();
    }

    const label = (text, x, y, strong) => {
      ctx.font = `${strong ? 600 : 500} ${strong ? 12 : 11}px ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
      const tw = ctx.measureText(text).width;
      const bw = tw + 18; const bh = strong ? 24 : 20;
      let lx = x + 14; let ly = y - bh - 8;
      if (lx + bw > w - 8) lx = x - 14 - bw;
      lx = clamp(lx, 8, Math.max(8, w - bw - 8));
      if (ly < 8) ly = y + 10;
      ctx.fillStyle = strong ? 'rgba(255,255,255,.94)' : 'rgba(8,14,32,.62)';
      ctx.strokeStyle = strong ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx, ly, bw, bh, bh / 2); else ctx.rect(lx, ly, bw, bh);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = strong ? '#0b1020' : 'rgba(255,255,255,.92)';
      ctx.fillText(text, lx + 9, ly + bh / 2 + 4);
    };

    function overlay(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      const heroK = V.hero;
      if (heroK > 0.01) {
        // flights: a bright head with a fading trail that runs out behind it,
        // kept below the planet's edge so they never cross the headline
        ctx.save();
        // (scrolled down to the whole planet there's no headline left to dodge)
        ctx.beginPath(); ctx.rect(0, (frame.top - 36 * (1 - Math.min(1, frame.top / h))) * (1 - scene.s), w, h); ctx.clip();
        flights.forEach((f) => {
          const u = (now - f.t0) / f.dur;
          if (u > 1.45) return;
          const head = clamp(u, 0, 1); const tail = clamp(u - 0.38, 0, 1);
          let prev = null;
          for (let i = 0; i < f.pts.length; i += 1) {
            const q = f.pts[i];
            if (q.t < tail || q.t > head) { prev = null; continue; }
            const s = earth.project(q.lat, q.lon, q.lift);
            if (!s.front) { prev = null; continue; }
            if (prev) {
              const k = (q.t - tail) / Math.max(0.001, head - tail);
              ctx.strokeStyle = f.home ? `rgba(255,138,76,${(0.08 + 0.9 * k) * heroK})` : `rgba(196,222,255,${(0.05 + 0.75 * k) * heroK})`;
              ctx.lineWidth = 0.6 + 1.6 * k;
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(s.x, s.y); ctx.stroke();
            }
            prev = s;
          }
          if (u < 1 && prev) {
            ctx.fillStyle = f.home ? `rgba(255,170,120,${0.35 * heroK})` : `rgba(200,225,255,${0.3 * heroK})`;
            ctx.beginPath(); ctx.arc(prev.x, prev.y, 6, 0, 6.283); ctx.fill();
            ctx.fillStyle = `rgba(255,255,255,${heroK})`;
            ctx.beginPath(); ctx.arc(prev.x, prev.y, 2, 0, 6.283); ctx.fill();
          }
        });
        ctx.restore();
        // everyone else here right now
        let labelled = 0;
        const maxLabels = scene.s > 0.5 ? 5 : 3;
        const labelFrom = lerp(h * 0.5, h - Math.min(h, window.innerHeight || h) + 90, scene.s);
        viewers.forEach((v) => {
          const s = earth.project(v.lat, v.lon);
          if (!s.front || s.x < -20 || s.x > w + 20 || s.y < -20 || s.y > h + 20) return;
          // a glowing green dot, the same "online" green as the dot in the nav,
          // bigger where more people are; a slow ring breathes off it
          const ph = ((now / 3200) + (v.lat * 7 + v.lon) / 97) % 1;
          const r = Math.min(5.5, 2.8 + Math.log2(v.n || 1) * 0.9);
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4.5);
          glow.addColorStop(0, `rgba(46,232,138,${0.55 * heroK})`); glow.addColorStop(1, 'rgba(46,232,138,0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s.x, s.y, r * 4.5, 0, 6.283); ctx.fill();
          ctx.strokeStyle = `rgba(46,232,138,${(1 - ph) * 0.6 * heroK})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(s.x, s.y, r + 2 + ph * 16, 0, 6.283); ctx.stroke();
          ctx.fillStyle = `rgba(46,232,138,${heroK})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(225,255,238,${heroK})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.45, 0, 6.283); ctx.fill();
          if (labelled < maxLabels && v.city && angle(v, home) > 6 && s.y > labelFrom) { labelled += 1; ctx.globalAlpha = heroK; label(`${v.city}${v.n > 1 ? ` · ${v.n}` : ''}`, s.x, s.y, false); ctx.globalAlpha = 1; }
        });
      }
      // the visitor: sonar rings off a bright pin
      const me = earth.project(home.lat, home.lon);
      if (me.front) {
        const k = journey ? Math.max(heroK, HK.v) : 1;
        if (k > 0.01) {
          for (let i = 0; i < 3; i += 1) {
            const ph = reduced ? 0.35 + i * 0.22 : ((now / SONAR) + i / 3) % 1;
            ctx.strokeStyle = `rgba(255,106,46,${(1 - ph) * 0.85 * k})`; ctx.lineWidth = 1.6 * (1 - ph) + 0.4;
            ctx.beginPath(); ctx.arc(me.x, me.y, 6 + ph * 46, 0, 6.283); ctx.stroke();
          }
          ctx.fillStyle = `rgba(255,106,46,${0.3 * k})`; ctx.beginPath(); ctx.arc(me.x, me.y, 10, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.beginPath(); ctx.arc(me.x, me.y, 5, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,90,31,${k})`; ctx.beginPath(); ctx.arc(me.x, me.y, 3.4, 0, 6.283); ctx.fill();
          // (no label pinned to the screen edge once the town has turned out of view)
          if (heroK > 0.5 && me.x > 0 && me.x < w && me.y > 0 && me.y < h) { ctx.globalAlpha = heroK; label(`You · ${home.city || 'here'}`, me.x, me.y, true); ctx.globalAlpha = 1; }
        }
      }
      if (journeyDraw) journeyDraw(now);
    }
    const HK = { v: 0 };         // the home pin fades in as the opening flight lands
    let journeyDraw = null;

    /* The loop: move the camera, let the Earth repaint, draw on top */
    let raf = 0; let on = true; let lastT = 0; let prevT = 0; const t0 = performance.now();
    // The camera: the flight/hero framing in V, eased toward the whole planet
    // as the page scrolls, turned by the scroll and by hand. Scroll and drag
    // only count once the planet has settled (V.hero), so nothing jumps.
    const apply = () => {
      scene.s = ease(clamp((scene.P - 0.02) / 0.36, 0, 1)) * V.hero;
      const s = scene.s;
      Object.assign(earth.view, {
        lat: clamp(lerp(V.lat, full.lat, s) + D.lat * V.hero, -72, 72),
        lon: V.lon + V.sway * (1 - s) + (scene.P * SPIN + D.lon) * V.hero,
        alt: lerp(V.alt, full.alt, s),
        py: lerp(V.py, full.py, s),
        px: 0.5,
        tilt: 0,
      });
      earth.invalidate();
    };
    earth.onFrame = () => overlay(performance.now());
    const loop = (now) => {
      raf = 0;
      if (!alive || !on) return;
      if (reduced) { apply(); return; }   // one still frame (repainted when textures, pins or a drag arrive)
      const dt = Math.min(64, now - (prevT || now)); prevT = now;
      scene.p = progress();
      // following the scroll or a hand: every frame; idling: half rate is
      // plenty for a slow planet, and kind to phones
      const busy = drag || Math.abs(scene.p - scene.P) > 0.0004 || Math.abs(D.vel) > 0.0004;
      if (busy || now - lastT > (w < 760 ? 50 : 30)) {
        lastT = now;
        // Lenis already eases the page; easing again on top would leave the planet trailing it
        const smooth = !!(window.KioskEditorial && window.KioskEditorial.lenis);
        scene.P = smooth ? scene.p : scene.P + (scene.p - scene.P) * (1 - Math.pow(0.7, dt / 16));
        if (Math.abs(scene.p - scene.P) < 0.0004) scene.P = scene.p;
        if (!drag && D.vel) { D.lon += D.vel * dt; D.vel *= Math.pow(0.94, dt / 16); if (Math.abs(D.vel) < 0.0004) D.vel = 0; }
        if (V.hero > 0.99) {
          if (!swayOff) V.sway = Math.sin((now - t0) / 9000) * frame.cap * frame.sway;
          if (now - lastSpawn > 900) { lastSpawn = now; spawn(now); }
        }
        syncCopy();
        apply();
      }
      raf = requestAnimationFrame(loop);
    };
    const wake = () => { if (alive && on && !raf) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) wake(); }, { threshold: 0 });
    io.observe(section);
    const onResize = () => { resize(); stick(); measureSec(); frame = heroFrame(); full = fullFrame(); if (V.hero >= 1) Object.assign(V, { alt: frame.alt, py: frame.py, lat: frame.lat }); apply(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', wake, { passive: true });

    /* Drag to spin: sideways turns the planet under the finger (touch keeps
     * vertical swipes for scrolling the page); a mouse can tip it north and
     * south too. Let go mid-swipe and it coasts to a stop. */
    fx.style.touchAction = 'pan-y';
    const how = section.querySelector('.k-gh__hint-how');
    if (how && window.matchMedia('(pointer: coarse)').matches) how.textContent = 'Swipe sideways or scroll to spin the globe';
    const nowEl = section.querySelector('[data-gh-now]');
    const dragK = () => 60 * earth.view.alt / Math.max(240, Math.min(w, h));
    const onDown = (e) => {
      if (e.button > 0 || V.hero < 0.99 || drag) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), mouse: e.pointerType === 'mouse' };
      D.vel = 0;
      // fold the idle sway into the hand's turn so the planet doesn't jump
      if (!swayOff) { swayOff = true; D.lon += V.sway * (1 - scene.s); V.sway = 0; }
      try { fx.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      section.classList.add('is-dragging');
      wake();
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const now = performance.now(); const k = dragK();
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
      D.lon -= dx * k;
      if (drag.mouse) D.lat = clamp(D.lat + dy * k * 0.6, -50, 50);
      D.vel = reduced ? 0 : (-dx * k) / Math.max(8, now - drag.t);
      Object.assign(drag, { x: e.clientX, y: e.clientY, t: now });
      wake();
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      // a hand that stopped before letting go doesn't coast
      if (e.type === 'pointercancel' || performance.now() - drag.t > 90) D.vel = 0;
      drag = null;
      section.classList.remove('is-dragging');
      wake();
    };
    fx.addEventListener('pointerdown', onDown);
    fx.addEventListener('pointermove', onMove);
    fx.addEventListener('pointerup', onUp);
    fx.addEventListener('pointercancel', onUp);

    const onSeen = typeof opts.onSeen === 'function' ? opts.onSeen : null;
    let seenMarked = false;
    const markSeen = () => {
      if (seenMarked) return;
      seenMarked = true;
      try { onSeen && onSeen(); } catch (e) { /* prefs / storage */ }
    };

    async function settle(ms) {
      frame = heroFrame();
      if (route) route.classList.remove('is-on');
      section.classList.add('is-hero');
      await tween(V, { lat: frame.lat, lon: home.lon, alt: frame.alt, py: frame.py, hero: 1 }, ms, ease, isAlive);
      if (!alive) return;
      section.classList.add('is-settled');
      markSeen();
    }

    async function opening() {
      const ROUTE = routeTo(home);
      const legs = ROUTE.slice(0, -1).map((a, i) => Earth.arc(a, ROUTE[i + 1], 48, 0.12));
      const J = { leg: 0 };
      const startAlt = farAlt();
      Object.assign(V, { lat: ROUTE[0].lat * 0.6, lon: ROUTE[0].lon, alt: startAlt, py: 0.5, hero: 0 });
      journeyDraw = (now) => {
        const fade = 1 - V.hero;
        if (fade <= 0.01) return;
        const leg = Math.min(Math.floor(J.leg), legs.length - 1);
        const u = clamp(J.leg - leg, 0, 1);
        ctx.lineWidth = 2;
        let head = null;
        for (let k = 0; k <= leg; k += 1) {
          const end = k < leg ? 1 : u; let prev = null;
          ctx.strokeStyle = k < leg ? `rgba(255,122,61,${0.55 * fade})` : `rgba(255,122,61,${fade})`;
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
          ctx.fillStyle = `rgba(255,170,120,${0.35 * fade})`; ctx.beginPath(); ctx.arc(head.x, head.y, 9, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, 6.283); ctx.fill();
        }
        ROUTE.slice(0, -1).forEach((c, i) => {
          if (i > leg) return;
          const s = earth.project(c.lat, c.lon); if (!s.front) return;
          ctx.fillStyle = `rgba(255,90,31,${0.8 * fade})`; ctx.beginPath(); ctx.arc(s.x, s.y, i === leg && u < 0.25 ? 4.5 : 2.5, 0, 6.283); ctx.fill();
          if (i === leg && u < 0.25) { ctx.globalAlpha = fade; label(`${c.c} · ${c.n}`, s.x, s.y, false); ctx.globalAlpha = 1; }
        });
      };
      await Promise.race([earth.ready.catch(() => {}), wait(2500)]);
      if (!alive) return;
      section.classList.add('is-flying');
      if (route) route.classList.add('is-on');
      const LEG = 1050;
      const hops = Math.max(1, ROUTE.length - 1);
      const end = heroFrame();
      for (let i = 0; i < ROUTE.length - 1 && alive; i += 1) {
        const a = ROUTE[i]; const b = ROUTE[i + 1];
        if (route) route.textContent = `KSK 00${i + 1} · ${a.c} → ${b.c} · ${b.n}`;
        // Glide toward each stop while easing alt/py toward the floating hero
        const k = (i + 1) / hops;
        const midAlt = lerp(startAlt, end.alt, ease(k * 0.72));
        const midPy = lerp(0.5, end.py, ease(k * 0.55));
        let dl = (b.lon - V.lon) % 360; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
        tween(V, {
          lat: clamp(b.lat * 0.75, -60, 60),
          lon: V.lon + dl,
          alt: midAlt,
          py: midPy,
        }, LEG * 1.15, ease, isAlive);
        // eslint-disable-next-line no-await-in-loop
        await tween(J, { leg: i + 1 }, LEG, (x) => x, isAlive);
      }
      if (!alive) return;
      if (route) route.textContent = `KSK 00${ROUTE.length} · Arrived · ${home.city || 'Home'}`;
      tween(HK, { v: 1 }, 600, easeOut, isAlive);
      await wait(350);
      await settle(3000);
      journeyDraw = null;
    }

    if (journey) { opening(); }
    else {
      frame = heroFrame();
      Object.assign(V, { lat: frame.lat, lon: home.lon, alt: frame.alt, py: frame.py, hero: reduced ? 1 : 0 });
      HK.v = 1;
      section.classList.add('is-hero');
      if (reduced) {
        section.classList.add('is-settled');
        markSeen();
      } else {
        // return visits: no flight, the planet just rises into place
        V.py = frame.py + 0.25;
        Promise.race([earth.ready.catch(() => {}), wait(1500)])
          .then(() => alive && tween(V, { py: frame.py, hero: 1 }, 1600, easeOut, isAlive))
          .then(() => {
            if (!alive) return;
            section.classList.add('is-settled');
            markSeen();
          });
      }
    }
    apply();
    wake();
    earth.ready.then(() => { if (alive) apply(); }).catch(() => {});

    return {
      setLive(list, n) {
        viewers = (list || []).filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon)); count = n || 0;
        if (nowEl) nowEl.textContent = count > 1 ? `${count} travelers on the map right now` : 'You’re on the map';
        if (reduced) apply();
        return count;
      },
      stop() {
        alive = false; io.disconnect(); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', wake);
        section.classList.remove('is-scene', 'is-away', 'is-dragging');
        if (raf) cancelAnimationFrame(raf);
        earth.destroy();
      },
    };
  }

  window.KioskGlobeHero = { mount };
})();
