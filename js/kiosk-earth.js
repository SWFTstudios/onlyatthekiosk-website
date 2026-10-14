/**
 * KIOSK — satellite Earth
 *
 * A photographic globe in one full-screen WebGL2 pass: NASA Blue Marble
 * for the day side, Black Marble city lights on the night side, a relief
 * map for terrain shading (exaggerated a touch so mountains read), ocean
 * glint, a lit atmosphere rim and a few stars. The sun sits where it really
 * is right now, so the day/night line moves with the clock.
 *
 * The camera hangs above a point on the surface and tilts toward the
 * horizon, giving the "quarter view" of a flight tracker. Pages put their
 * own pins, labels and arcs on top using project().
 *
 *   const earth = KioskEarth.create(canvas, { view: { lat, lon, alt, tilt, px, py }, hd, relief, drag, sun })
 *   earth.view.lat = …; earth.invalidate();
 *   earth.project(lat, lon, lift?) → { x, y, front } in CSS pixels
 *   earth.onFrame = (earth) => { … }   // runs after every repaint
 *   earth.destroy()
 *
 * Textures: images/earth/ (NASA Visible Earth, public domain).
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

  /** Where the sun is overhead right now (approximate, plenty for a terminator). */
  function subsolar(date = new Date()) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const doy = (date.getTime() - start) / 864e5;
    const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (doy + 10));
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    let lon = (12 - hours) * 15;
    lon = ((lon + 540) % 360) - 180;
    return { lat: decl, lon };
  }

  const VERT = `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
    precision highp float;
    uniform vec2 res; uniform vec3 cam; uniform vec3 fw; uniform vec3 rt; uniform vec3 upv;
    uniform float fov; uniform float px; uniform float py; uniform vec3 sun; uniform float relief; uniform float nightK;
    uniform sampler2D dayT; uniform sampler2D nightT; uniform sampler2D reliefT; uniform sampler2D waterT;
    out vec4 o;
    const float PI = 3.14159265;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    vec4 tex(sampler2D t, vec2 uv) {
      // the longitude seam: take derivatives from whichever wrap is continuous
      vec2 uvB = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
      vec2 dx = dFdx(uv), dy = dFdy(uv), dxB = dFdx(uvB), dyB = dFdy(uvB);
      if (dot(dx, dx) + dot(dy, dy) > dot(dxB, dxB) + dot(dyB, dyB)) { dx = dxB; dy = dyB; }
      return textureGrad(t, uv, dx, dy);
    }
    void main() {
      vec2 f = gl_FragCoord.xy / res;
      float sx = (f.x - px) * 2.0;
      float sy = (py - (1.0 - f.y)) * 2.0;
      float asp = res.x / res.y;
      vec3 d = normalize(fw + rt * sx * fov * asp + upv * sy * fov);
      float b = dot(cam, d); float c = dot(cam, cam) - 1.0; float h = b * b - c;
      vec3 col = vec3(0.0); float a = 1.0;
      vec3 sunN = normalize(sun);
      vec3 rim = vec3(0.32, 0.58, 1.0);
      if (h > 0.0 && b < 0.0) {
        vec3 P = normalize(cam + d * (-b - sqrt(h)));
        float lat = asin(clamp(P.y, -1.0, 1.0)); float lon = atan(P.x, P.z);
        vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
        // terrain: tilt the normal along the relief gradient
        vec3 E = normalize(vec3(cos(lon), 0.0, -sin(lon)));
        vec3 N = cross(P, E);
        vec2 px = vec2(1.0 / 2048.0, 1.0 / 1024.0);
        float hE = texture(reliefT, uv + vec2(px.x, 0.0)).r - texture(reliefT, uv - vec2(px.x, 0.0)).r;
        float hN = texture(reliefT, uv - vec2(0.0, px.y)).r - texture(reliefT, uv + vec2(0.0, px.y)).r;
        vec3 n = normalize(P - (E * hE / max(cos(lat), 0.15) + N * hN) * relief);
        float water = tex(waterT, uv).r;
        vec3 day = pow(tex(dayT, uv).rgb, vec3(1.08));
        float sunUp = dot(P, sunN);
        float lit = smoothstep(-0.10, 0.22, sunUp);
        float diff = clamp(dot(n, sunN) * 1.15 + 0.08, 0.0, 1.2);
        col = day * (0.06 + diff) * lit;
        // a little relief light on the night side too, so land still reads
        float lum = dot(day, vec3(0.3, 0.5, 0.2));
        col += vec3(lum) * vec3(0.32, 0.42, 0.66) * (1.0 - lit) * (0.4 + 0.6 * clamp(dot(n, normalize(-cam)), 0.0, 1.0)) * 0.42;
        // ocean glint
        vec3 rf = reflect(-sunN, P);
        col += vec3(1.0, 0.92, 0.78) * pow(max(dot(rf, -d), 0.0), 90.0) * 0.4 * water * lit;
        // city lights after dark
        float lights = pow(smoothstep(0.2, 0.62, tex(nightT, uv).r), 1.3);   // skip the faint land in the texture
        col += vec3(1.0, 0.8, 0.45) * lights * 2.6 * nightK * (1.0 - smoothstep(-0.12, 0.08, sunUp)) * (1.0 - water * 0.8);
        // atmosphere: thin blue at the limb, lit by the sun
        float mu = clamp(dot(P, -d), 0.0, 1.0);
        float fr = pow(1.0 - mu, 3.0);
        col = mix(col, rim * (0.25 + 1.2 * smoothstep(-0.25, 0.5, sunUp)), fr * 0.75);
        col += rim * 0.06 * lit;
      } else {
        // halo just beyond the limb, then space
        float dmin = sqrt(max(dot(cam, cam) - b * b, 0.0));
        vec3 closest = normalize(cam + d * max(-b, 0.0));
        float g = b < 0.0 ? exp(-(dmin - 1.0) * 26.0) : 0.0;
        float sl = smoothstep(-0.35, 0.45, dot(closest, sunN));
        col = rim * g * (0.15 + 1.1 * sl);
        vec3 q = floor(d * 380.0);
        float s = hash(q);
        col += vec3(smoothstep(0.9982, 1.0, s)) * 0.7 * (1.0 - g);
      }
      col = col / (1.0 + col * 0.18);                  // soft shoulder
      o = vec4(pow(col, vec3(1.0 / 1.1)), a);
    }`;

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }

  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    const view = Object.assign({ lat: 40, lon: -80, alt: 1.6, tilt: 0.55, px: 0.5, py: 0.5, fov: 0.55 }, opts.view || {});
    const state = { relief: opts.relief == null ? 0.9 : opts.relief, sun: subsolar(), nightK: 1 };
    const api = { view, state, gl: !!gl, onFrame: null, ready: null, invalidate, project, destroy, resize, camera };
    if (!gl) { canvas.classList.add('is-nogl'); api.ready = Promise.reject(new Error('no webgl2')); api.ready.catch(() => {}); return api; }

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['res', 'cam', 'fw', 'rt', 'upv', 'fov', 'px', 'py', 'sun', 'relief', 'nightK', 'dayT', 'nightT', 'reliefT', 'waterT'].forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });

    // Placeholder pixels until the images arrive
    const textures = {};
    ['dayT', 'nightT', 'reliefT', 'waterT'].forEach((k, i) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(k === 'dayT' ? [10, 22, 44, 255] : [0, 0, 0, 255]));
      gl.uniform1i(U[k], i); textures[k] = t;
    });
    const upload = (k, im) => {
      const i = ['dayT', 'nightT', 'reliefT', 'waterT'].indexOf(k);
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, textures[k]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      invalidate();
    };
    const base = opts.base || 'images/earth/';
    const hd = opts.hd != null ? opts.hd : Math.min(window.innerWidth, window.innerHeight) > 700;
    api.ready = Promise.all([
      loadImage(`${base}${hd ? 'day-4k' : 'day-2k'}.jpg`).then((im) => upload('dayT', im)),
      loadImage(`${base}relief.jpg`).then((im) => upload('reliefT', im)),
      loadImage(`${base}water.jpg`).then((im) => upload('waterT', im)),
      loadImage(`${base}night.jpg`).then((im) => upload('nightT', im)),
    ]).then(() => { canvas.classList.add('is-ready'); });
    api.ready.catch(() => {});

    let w = 0; let h = 0; let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.75);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(2, Math.round(w * dpr)); canvas.height = Math.max(2, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      invalidate();
    }

    /* Camera: hang above a point south of the target and look at it, tilted
     * toward the horizon by view.tilt (0 straight down … ~1.2 grazing). */
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

    let raf = 0; let alive = true;
    function draw() {
      raf = 0;
      if (!alive) return;
      camera();
      // opts.sun(view) can stage the light (e.g. late afternoon over the view); default is the real sun
      const sp = typeof opts.sun === 'function' ? opts.sun(view, state.sun) : state.sun;
      const s = vec(sp.lat, sp.lon);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform3fv(U.cam, C); gl.uniform3fv(U.fw, F); gl.uniform3fv(U.rt, R); gl.uniform3fv(U.upv, UP);
      gl.uniform1f(U.fov, view.fov); gl.uniform1f(U.px, view.px); gl.uniform1f(U.py, view.py);
      gl.uniform3fv(U.sun, s); gl.uniform1f(U.relief, state.relief); gl.uniform1f(U.nightK, state.nightK);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (api.onFrame) api.onFrame(api);
    }
    function invalidate() { if (alive && !raf) raf = requestAnimationFrame(draw); }

    // The sun keeps moving
    const tick = setInterval(() => { state.sun = subsolar(); invalidate(); }, 60000);

    // Drag to look around
    if (opts.drag) {
      let down = null;
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, lat: view.lat, lon: view.lon }; canvas.setPointerCapture(e.pointerId); if (opts.onDrag) opts.onDrag(true); });
      canvas.addEventListener('pointermove', (e) => {
        if (!down) return;
        const k = 60 * view.alt / Math.max(240, Math.min(w, h));
        view.lon = down.lon - (e.clientX - down.x) * k;
        view.lat = clamp(down.lat + (e.clientY - down.y) * k * 0.6, -70, 75);
        invalidate();
      });
      const up = () => { if (down && opts.onDrag) opts.onDrag(false); down = null; };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    }

    /** Glide the camera to a new view (lon takes the short way round). */
    let fly = 0;
    api.flyTo = (to, ms = 1400) => {
      cancelAnimationFrame(fly);
      const from = { ...view }; const t0 = performance.now();
      let dl = ((to.lon == null ? view.lon : to.lon) - from.lon) % 360; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      return new Promise((done) => {
        const step = (now) => {
          const k = ease(clamp((now - t0) / ms, 0, 1));
          Object.keys(to).forEach((key) => { if (key !== 'lon') view[key] = from[key] + (to[key] - from[key]) * k; });
          view.lon = from.lon + dl * k;
          invalidate();
          if (k < 1) fly = requestAnimationFrame(step); else done();
        };
        fly = requestAnimationFrame(step);
      });
    };

    window.addEventListener('resize', resize);
    resize();
    function destroy() {
      alive = false; clearInterval(tick); window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
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

  /* Map labels in the style of a flight tracker: spaced caps for continents
   * and oceans, a dot and a name for cities. */
  const LABELS = [
    { t: 'North America', lat: 47, lon: -100, k: 'land' }, { t: 'South America', lat: -12, lon: -60, k: 'land' },
    { t: 'Europe', lat: 51, lon: 15, k: 'land' }, { t: 'Africa', lat: 6, lon: 20, k: 'land' }, { t: 'Asia', lat: 47, lon: 90, k: 'land' },
    { t: 'Australia', lat: -24, lon: 134, k: 'land' }, { t: 'Antarctica', lat: -78, lon: 20, k: 'land' },
    { t: 'Atlantic Ocean', lat: 30, lon: -42, k: 'sea' }, { t: 'Pacific Ocean', lat: 15, lon: -150, k: 'sea' }, { t: 'Indian Ocean', lat: -20, lon: 78, k: 'sea' },
    { t: 'Arctic Ocean', lat: 82, lon: -30, k: 'sea' }, { t: 'Hudson Bay', lat: 59, lon: -85.5, k: 'sea' }, { t: 'Gulf of Mexico', lat: 25, lon: -90, k: 'sea' },
    { t: 'Caribbean Sea', lat: 15, lon: -75, k: 'sea' }, { t: 'Mediterranean Sea', lat: 35, lon: 18, k: 'sea' },
    { t: 'New York', lat: 40.71, lon: -74.0, k: 'city' }, { t: 'Toronto', lat: 43.65, lon: -79.38, k: 'city' }, { t: 'Montréal', lat: 45.5, lon: -73.57, k: 'city' },
    { t: 'Chicago', lat: 41.88, lon: -87.63, k: 'city' }, { t: 'Washington', lat: 38.9, lon: -77.04, k: 'city' }, { t: 'Miami', lat: 25.76, lon: -80.19, k: 'city' },
    { t: 'Dallas', lat: 32.78, lon: -96.8, k: 'city' }, { t: 'Houston', lat: 29.76, lon: -95.37, k: 'city' }, { t: 'Los Angeles', lat: 34.05, lon: -118.24, k: 'city' },
    { t: 'San Francisco', lat: 37.77, lon: -122.42, k: 'city' }, { t: 'Vancouver', lat: 49.28, lon: -123.12, k: 'city' }, { t: 'Mexico City', lat: 19.43, lon: -99.13, k: 'city' },
    { t: 'Caracas', lat: 10.48, lon: -66.9, k: 'city' }, { t: 'São Paulo', lat: -23.55, lon: -46.63, k: 'city' }, { t: 'Reykjavík', lat: 64.15, lon: -21.94, k: 'city' },
    { t: 'London', lat: 51.51, lon: -0.13, k: 'city' }, { t: 'Paris', lat: 48.86, lon: 2.35, k: 'city' }, { t: 'Lisbon', lat: 38.72, lon: -9.14, k: 'city' },
    { t: 'Lagos', lat: 6.52, lon: 3.38, k: 'city' }, { t: 'Cairo', lat: 30.04, lon: 31.24, k: 'city' }, { t: 'Dubai', lat: 25.2, lon: 55.27, k: 'city' },
    { t: 'Mumbai', lat: 19.08, lon: 72.88, k: 'city' }, { t: 'Singapore', lat: 1.35, lon: 103.82, k: 'city' }, { t: 'Tokyo', lat: 35.68, lon: 139.69, k: 'city' },
    { t: 'Seoul', lat: 37.57, lon: 126.98, k: 'city' }, { t: 'Sydney', lat: -33.87, lon: 151.21, k: 'city' }, { t: 'Johannesburg', lat: -26.2, lon: 28.05, k: 'city' },
  ];
  /** Put LABELS into `layer` and keep them pinned to the globe. Call update() from onFrame. */
  function labels(layer, earth, opts = {}) {
    const list = (opts.list || LABELS).filter((l) => !(opts.skip || []).includes(l.t));
    layer.innerHTML = list.map((l, i) => `<span class="k-earth-label k-earth-label--${l.k}" data-i="${i}">${l.k === 'city' ? '<i></i>' : ''}${l.t}</span>`).join('');
    const els = Array.from(layer.children);
    return {
      // avoid: [{ x, y, r }] spots to keep clear (pins, cards)
      update(avoid = []) {
        const W = layer.clientWidth; const H = layer.clientHeight;
        els.forEach((el, i) => {
          const l = list[i]; const p = earth.project(l.lat, l.lon);
          const on = p.front && p.x > -60 && p.x < W + 60 && p.y > -20 && p.y < H + 20
            && !avoid.some((q) => Math.abs(q.x - p.x) < q.r + 40 && Math.abs(q.y - p.y) < q.r * 0.75 + 10);
          el.style.opacity = on ? '' : '0';
          if (on) el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        });
      },
    };
  }

  window.KioskEarth = { create, subsolar, arc, labels, LABELS };
})();
