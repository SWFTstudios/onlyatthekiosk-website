/**
 * KIOSK — Lost & Found map
 *
 * A dark globe (MapLibre GL, js/vendor/maplibre/) with the KIOSK land dots,
 * glowing beacons for Hunt drops and partner stores, and a HUD. Zooming in
 * (or tapping a search card) flies down to a top-down depth map: terrain
 * shading and elevation colours from open elevation tiles, plus streets and
 * places from OpenFreeMap. If those online layers can't load, the globe,
 * land, beacons and drop zones still work from local data.
 *
 *   KioskHunt.mount(els, api) → { destroy() }
 *
 * Loaded by pageHunt() in js/kiosk-glass.js, which passes the data and the
 * product panel in `api`.
 */
(function () {
  'use strict';

  const VECTOR = 'https://tiles.openfreemap.org/planet';
  const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const DEM_ATTR = 'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen / AWS Open Data</a>';
  const SAT = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2016_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg';
  const SAT_ATTR = 'Imagery: <a href="https://s2maps.eu" target="_blank" rel="noopener">EOX Sentinel-2 cloudless 2016</a> (CC BY 4.0)';
  const EARTH_DAY = 'images/earth/day-2k.jpg';
  const NEAR = 7.5;          // from here on, beacons show their cards and the depth map takes over
  const R_EARTH = 6371;
  const STYLES = ['night', 'day', 'satellite', 'blueprint', 'terrain'];

  const rad = (d) => (d * Math.PI) / 180;
  function km(a, b) {
    const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.sqrt(h));
  }
  function circle(lon, lat, radiusKm, n = 72) {
    const out = [];
    for (let i = 0; i <= n; i += 1) {
      const t = (i / n) * Math.PI * 2;
      const dLat = (radiusKm / R_EARTH) * (180 / Math.PI) * Math.sin(t);
      const dLon = ((radiusKm / R_EARTH) * (180 / Math.PI) * Math.cos(t)) / Math.cos(rad(lat));
      out.push([lon + dLon, lat + dLat]);
    }
    return out;
  }
  function graticule() {
    const lines = [];
    for (let lat = -75; lat <= 75; lat += 15) { const l = []; for (let lon = -180; lon <= 180; lon += 3) l.push([lon, lat]); lines.push(l); }
    for (let lon = -180; lon < 180; lon += 15) { const l = []; for (let lat = -85; lat <= 85; lat += 3) l.push([lon, lat]); lines.push(l); }
    return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } };
  }
  function dots() {
    const W = window.KIOSK_WORLD;
    if (!W) return { type: 'FeatureCollection', features: [] };
    const pts = W.points(); const coords = [];
    for (let i = 0; i < pts.length; i += 2) coords.push([pts[i + 1], pts[i]]);
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: coords } }] };
  }
  const fmt = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  const short = (t, n = 18) => { const s = String(t).replace(/\s*#\d+$/, ''); if (s.length <= n) return s; const cut = s.slice(0, n); return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 4)).trim()}…`; };
  // Exact coordinates ("40.85, -73.95") once announced, else the drop zone's centre
  function where(p) {
    const pk = p.pickup || {};
    const m = String(pk.coords || '').match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: +m[1], lon: +m[2], exact: true, radiusKm: 0.15 };
    if (pk.area) return { lat: pk.area.lat, lon: pk.area.lon, exact: false, radiusKm: pk.area.radiusKm || 5 };
    return null;
  }
  const zoomFor = (radiusKm) => Math.max(8.5, Math.min(15, 14.2 - Math.log2(Math.max(radiusKm, 0.2))));

  function mount(els, api) {
    const ml = window.maplibregl;
    if (!ml) throw new Error('MapLibre missing');
    const { esc } = api;
    const signal = (getComputedStyle(document.documentElement).getPropertyValue('--signal') || '#ff5b23').trim();

    // Things on the map
    const drops = api.products.map((p) => ({ kind: 'hunt', id: p.id, p, ...where(p) })).filter((x) => x.lat != null);
    const stores = api.stores.filter((s) => s.lat != null && s.lon != null).map((s) => ({ kind: 'store', id: s.id, st: s, lat: s.lat, lon: s.lon }));
    const zones = { type: 'FeatureCollection', features: drops.map((d) => ({ type: 'Feature', properties: { id: d.id, exact: d.exact }, geometry: { type: 'Polygon', coordinates: [circle(d.lon, d.lat, d.radiusKm)] } })) };

    const themeDefault = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'day' : 'night');
    const readPref = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('kiosk:mapstyle') || 'null');
        if (raw && STYLES.includes(raw.style)) return raw;
      } catch (e) { /* ignore */ }
      const q = new URLSearchParams(location.search).get('view');
      if (q && STYLES.includes(q)) return { style: q, globe: true };
      return { style: themeDefault(), globe: true };
    };
    let { style: mapStyle, globe: isGlobe } = readPref();
    if (typeof isGlobe !== 'boolean') isGlobe = true;

    const map = new ml.Map({
      container: els.map,
      style: {
        version: 8,
        glyphs: GLYPHS,
        projection: { type: isGlobe ? 'globe' : 'mercator' },
        sources: {
          land: { type: 'geojson', data: 'data/land-110m.geojson', attribution: 'Land: Natural Earth' },
          dots: { type: 'geojson', data: dots() },
          grat: { type: 'geojson', data: graticule() },
          zones: { type: 'geojson', data: zones },
          omt: { type: 'vector', url: VECTOR },
          dem: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: DEM_ATTR },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#06070a' } },
          { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#0f1116', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.8, 9, 0.35] } },
          { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', minzoom: 4, paint: { 'fill-color': '#05080f', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 6, 1] } },
          { id: 'hillshade', type: 'hillshade', source: 'dem', minzoom: 5, paint: { 'hillshade-shadow-color': '#000000', 'hillshade-highlight-color': '#ffd9c4', 'hillshade-accent-color': '#1b2030', 'hillshade-exaggeration': 0.55 } },
          { id: 'grat', type: 'line', source: 'grat', maxzoom: 7, paint: { 'line-color': '#ffffff', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.07, 6, 0] , 'line-width': 0.6 } },
          { id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary', minzoom: 3, filter: ['<=', ['get', 'admin_level'], 4], paint: { 'line-color': '#ffffff', 'line-opacity': 0.14, 'line-width': 0.6, 'line-dasharray': [2, 2] } },
          { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8, paint: { 'line-color': '#9aa3b8', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.12, 14, 0.35], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 15, 1.6] } },
          { id: 'buildings', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.06 } },
          { id: 'dots', type: 'circle', source: 'dots', paint: { 'circle-color': '#c9cdd8', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.1, 3, 2.1, 5, 3], 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 4, 0.45, 5.6, 0] } },
          { id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': signal, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.25, 9, 0.1] } },
          { id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': signal, 'line-width': 1.4, 'line-dasharray': [2, 2], 'line-opacity': 0.9 } },
          { id: 'places', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 5, layout: { 'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 12, 13], 'text-letter-spacing': 0.08, 'text-transform': 'uppercase' }, paint: { 'text-color': 'rgba(235,238,245,0.6)', 'text-halo-color': '#05060a', 'text-halo-width': 1.2 } },
        ],
      },
      center: [-40, 30],
      zoom: window.innerWidth < 700 ? 0.9 : 1.6,
      minZoom: 0.4,
      maxZoom: 16,
      maxPitch: 70,
      attributionControl: { compact: true },
      renderWorldCopies: false,
    });
    els.map.__map = map;

    // Satellite + elevation layers (skipped if unsupported)
    map.on('load', () => {
      try {
        map.addSource('sat', { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 14, attribution: SAT_ATTR });
        map.addLayer({ id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'none' }, paint: { 'raster-opacity': 1 } }, 'land');
      } catch (e) { /* no sat */ }
      try {
        map.addSource('earth', {
          type: 'image',
          url: EARTH_DAY,
          coordinates: [[-180, 85], [180, 85], [180, -85], [-180, -85]],
        });
        map.addLayer({ id: 'earth', type: 'raster', source: 'earth', maxzoom: 4.5, layout: { visibility: 'none' }, paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } }, 'land');
      } catch (e) { /* no earth texture */ }
      try {
        map.addLayer({ id: 'relief', type: 'color-relief', source: 'dem', minzoom: 5, paint: {
          'color-relief-opacity': 0.55,
          'color-relief-color': ['interpolate', ['linear'], ['elevation'], -10, '#071022', 0, '#0d1b2a', 50, '#123047', 200, '#1f4f4a', 500, '#3d5a2c', 1000, '#6b5a2a', 2000, '#8a4b2a', 3500, '#c96a3c', 5000, '#ffd9c4'],
        } }, 'hillshade');
      } catch (e) { /* older renderer: hillshade alone still reads as depth */ }
      try { map.setSky({ 'sky-color': '#05060a', 'horizon-color': '#151a2b', 'fog-color': '#05060a', 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 5, 0.5, 8, 0] }); } catch (e) { /* no sky */ }
      applyStyle(mapStyle);
      els.root.classList.add('is-ready');
      hud();
    });
    const failed = {};
    map.on('error', (e) => {
      const src = e && (e.sourceId || (e.source && e.source.id));
      if ((src !== 'omt' && src !== 'dem') || failed[src]) return;
      failed[src] = true;
      api.status(failed.omt && failed.dem ? 'Online map layers are offline right now. Showing the KIOSK globe.'
        : failed.omt ? 'Street and place names are offline right now; terrain still works.'
          : 'Terrain is offline right now; streets and places still work.');
    });

    /* ---- beacons: glowing icons for drops and stores ---- */
    const beacons = [];
    function beacon(item) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `k-beacon k-beacon--${item.kind}`;
      const title = item.kind === 'hunt' ? item.p.title : item.st.name;
      el.setAttribute('aria-label', `${title}${item.kind === 'hunt' ? `, ${item.p.pickup.place}` : ', store'}`);
      el.innerHTML = `<i class="k-beacon__pulse"></i><i class="k-beacon__core"></i>
        <span class="k-beacon__card">${item.kind === 'hunt'
          ? `<img src="${esc(api.thumb(item.p))}" alt="" loading="lazy"><span><b>${esc(short(item.p.title, 22))}</b><small>${esc(api.price(item.p))} · ${item.exact ? 'Exact spot' : 'Drop zone'}</small></span>`
          : `<span class="k-beacon__logo">${esc(item.st.name.slice(0, 1))}</span><span><b>${esc(item.st.name)}</b><small>Store · ${esc(item.st.city || '')}</small></span>`}</span>`;
      el.addEventListener('click', () => {
        stopSpin();
        if (map.getZoom() < NEAR) { flyTo(item); return; }
        if (item.kind === 'hunt') api.openPDP(item.p.id); else location.href = api.storeHref(item.st);
      });
      const mk = new ml.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat([item.lon, item.lat]).addTo(map);
      beacons.push({ item, el, mk });
    }
    drops.forEach(beacon);
    stores.forEach(beacon);
    const layersOn = { hunt: true, store: true };
    function showLayers() { beacons.forEach((b) => { b.el.hidden = !layersOn[b.item.kind]; }); tips.forEach((t) => { t.el.hidden = !layersOn[t.item.kind]; }); }

    /* ---- search tooltips: small cards around the globe ---- */
    let tips = [];
    function clearTips() { tips.forEach((t) => t.mk.remove()); tips = []; }
    function showTips(results) {
      clearTips();
      const located = results.map((r) => (r.kind === 'store' ? stores.find((s) => s.id === r.st.id) : drops.find((d) => d.id === (r.p && r.p.id)))).filter(Boolean);
      // Fan the cards out around their point so neighbours don't stack
      located.forEach((item, i) => {
        const n = located.length;
        const ang = (-90 + (360 / Math.max(n, 1)) * i + (n > 1 ? 20 : 0)) * (Math.PI / 180);
        const dist = 86 + (i % 2) * 24;
        const dx = Math.round(Math.cos(ang) * dist); const dy = Math.round(Math.sin(ang) * dist * 0.75);
        const el = document.createElement('div');
        el.className = 'k-tip';
        const title = item.kind === 'hunt' ? item.p.title : item.st.name;
        el.innerHTML = `<svg class="k-tip__line" width="1" height="1" aria-hidden="true" style="overflow:visible"><line x1="0" y1="0" x2="${dx}" y2="${dy}"/></svg>
          <button type="button" class="k-tip__card" style="transform:translate(calc(${dx}px - 50%), calc(${dy}px - 50%))" aria-label="${esc(title)}: fly there">
            ${item.kind === 'hunt' ? `<img src="${esc(api.thumb(item.p))}" alt="" loading="lazy">` : `<span class="k-beacon__logo">${esc(item.st.name.slice(0, 1))}</span>`}
            <span><b>${esc(short(title))}</b><small>${item.kind === 'hunt' ? esc(item.p.pickup.place.split(',')[0]) : 'Store'}</small></span>
          </button>`;
        $('.k-tip__card', el).addEventListener('click', () => { stopSpin(); flyTo(item); });
        const mk = new ml.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat([item.lon, item.lat]).addTo(map);
        tips.push({ item, el, mk });
      });
      showLayers();
      if (located.length) {
        // Turn the globe to face the results
        const lon = located.reduce((s, x) => s + x.lon, 0) / located.length;
        const lat = located.reduce((s, x) => s + x.lat, 0) / located.length;
        map.easeTo({ center: [lon, lat], zoom: Math.min(map.getZoom(), 2.6), pitch: 0, duration: api.reduced ? 0 : 1400 });
      }
      return located.length;
    }
    const $ = (sel, root) => root.querySelector(sel);

    /* ---- flying in: down to a top-down depth map around the item ---- */
    function flyTo(item) {
      stopSpin();
      const z = item.kind === 'store' ? 12 : zoomFor(item.radiusKm);
      map.flyTo({ center: [item.lon, item.lat], zoom: z, pitch: tilted ? 55 : 0, bearing: 0, speed: 1.1, curve: 1.5, essential: true, ...(api.reduced ? { duration: 0 } : {}) });
      api.status(item.kind === 'hunt'
        ? `${item.p.title} · ${item.exact ? 'exact pickup spot' : `drop zone, about ${Math.round(item.radiusKm)} km across. Exact coordinates drop in the Dispatch`}.`
        : `${item.st.name} · ${item.st.city || ''}. Tap the beacon for the store page.`);
      els.root.dataset.focus = item.id;
    }
    function home() {
      map.flyTo({ center: [-40, 30], zoom: window.innerWidth < 700 ? 0.9 : 1.6, pitch: 0, bearing: 0, duration: api.reduced ? 0 : 1800, essential: true });
      delete els.root.dataset.focus;
    }

    /* ---- slow spin until someone touches the globe ---- */
    let spinning = !api.reduced; let raf = 0; let last = 0;
    function spin(t) {
      if (!spinning) return;
      if (last && map.getZoom() < 3 && !map.isMoving()) { const c = map.getCenter(); map.setCenter([c.lng + (t - last) * 0.004, c.lat]); }
      last = t; raf = requestAnimationFrame(spin);
    }
    function stopSpin() { spinning = false; cancelAnimationFrame(raf); }
    ['mousedown', 'touchstart', 'wheel'].forEach((ev) => map.on(ev, stopSpin));
    map.on('load', () => { if (spinning) raf = requestAnimationFrame(spin); });

    /* ---- HUD readout ---- */
    // Only touch the text when the value changes, so translations aren't redrawn every frame
    const set = (k, v) => { const el = els.root.querySelector(`[data-hud="${k}"]`); if (el && el.dataset.v !== v) { el.dataset.v = v; el.textContent = v; } };
    function hud() {
      const c = map.getCenter(); const z = map.getZoom();
      set('lat', fmt(c.lat, 'N', 'S')); set('lon', fmt(c.lng, 'E', 'W')); set('zoom', z.toFixed(1));
      const altKm = ((40075 * Math.cos(rad(c.lat))) / 2 ** z) * (els.map.clientHeight / 512);
      set('alt', altKm > 1000 ? `${Math.round(altKm / 100) / 10}k km` : altKm > 10 ? `${Math.round(altKm)} km` : `${Math.round(altKm * 1000)} m`);
      set('mode', z < NEAR ? 'Globe' : map.getPitch() > 10 ? '3D terrain' : 'Top-down');
      const comp = els.root.querySelector('[data-hud="compass"]'); if (comp) comp.style.transform = `rotate(${-map.getBearing()}deg)`;
      els.root.classList.toggle('is-near', z >= NEAR);
    }
    map.on('move', hud);

    /* ---- map styles (Night / Day / Satellite / Blueprint / Terrain) ---- */
    let tilted = mapStyle === 'terrain';
    let depth = mapStyle === 'terrain' || mapStyle === 'night';
    let sortBy = 'nearest';
    let focusId = '';

    const setVis = (id, on) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    const paint = (id, prop, val) => { try { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); } catch (e) { /* skip */ } };
    const savePref = () => {
      try { localStorage.setItem('kiosk:mapstyle', JSON.stringify({ style: mapStyle, globe: isGlobe })); } catch (e) { /* ignore */ }
      const u = new URL(location.href);
      u.searchParams.set('view', mapStyle);
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    };

    function applyStyle(name) {
      mapStyle = STYLES.includes(name) ? name : 'night';
      const sat = mapStyle === 'satellite';
      const blue = mapStyle === 'blueprint';
      const day = mapStyle === 'day';
      const terr = mapStyle === 'terrain';
      depth = terr || mapStyle === 'night';
      setVis('earth', sat);
      setVis('sat', sat);
      setVis('land', !sat);
      setVis('water', !sat && !blue);
      setVis('dots', !sat || map.getZoom() < 4);
      setVis('hillshade', depth || terr);
      setVis('relief', terr);
      setVis('grat', true);
      setVis('boundary', true);
      setVis('roads', !blue);
      setVis('buildings', !blue && !sat);
      setVis('places', true);

      if (day) {
        paint('bg', 'background-color', '#e8e6e1');
        paint('land', 'fill-color', '#f4f1ea');
        paint('water', 'fill-color', '#ffffff');
        paint('boundary', 'line-color', '#1a1a1c');
        paint('boundary', 'line-opacity', 0.28);
        paint('roads', 'line-color', '#2a2a2e');
        paint('places', 'text-color', 'rgba(20,20,22,0.7)');
        paint('places', 'text-halo-color', '#f4f1ea');
        paint('grat', 'line-color', '#1a1a1c');
        paint('grat', 'line-opacity', ['interpolate', ['linear'], ['zoom'], 0, 0.12, 6, 0]);
        paint('dots', 'circle-color', '#3a3a40');
        try { map.setSky({ 'sky-color': '#d8e4f0', 'horizon-color': '#f0ebe3', 'fog-color': '#e8e6e1', 'atmosphere-blend': 0.6 }); } catch (e) { /* */ }
      } else if (blue) {
        paint('bg', 'background-color', '#fafafa');
        paint('land', 'fill-color', '#fafafa');
        paint('land', 'fill-opacity', 0.15);
        paint('boundary', 'line-color', '#111111');
        paint('boundary', 'line-opacity', 0.85);
        paint('boundary', 'line-dasharray', [1, 0]);
        paint('grat', 'line-color', '#111111');
        paint('grat', 'line-opacity', ['interpolate', ['linear'], ['zoom'], 0, 0.35, 7, 0.1]);
        paint('zones-line', 'line-dasharray', [1, 1]);
        paint('places', 'text-color', '#111111');
        paint('places', 'text-halo-color', '#fafafa');
        paint('dots', 'circle-color', '#111111');
        try { map.setSky({ 'sky-color': '#f5f5f5', 'horizon-color': '#ffffff', 'fog-color': '#fafafa', 'atmosphere-blend': 0.2 }); } catch (e) { /* */ }
      } else if (sat) {
        paint('bg', 'background-color', '#0a1210');
        paint('boundary', 'line-color', '#ffffff');
        paint('boundary', 'line-opacity', 0.35);
        paint('roads', 'line-color', '#ffffff');
        paint('places', 'text-color', 'rgba(255,255,255,0.85)');
        paint('places', 'text-halo-color', '#0a1210');
        paint('grat', 'line-opacity', 0);
        try { map.setSky({ 'sky-color': '#02080f', 'horizon-color': '#1a3040', 'fog-color': '#02080f', 'atmosphere-blend': 0.75 }); } catch (e) { /* */ }
      } else {
        // night (default)
        paint('bg', 'background-color', '#06070a');
        paint('land', 'fill-color', '#0f1116');
        paint('land', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.8, 9, 0.35]);
        paint('water', 'fill-color', '#05080f');
        paint('boundary', 'line-color', '#ffffff');
        paint('boundary', 'line-opacity', 0.14);
        paint('boundary', 'line-dasharray', [2, 2]);
        paint('roads', 'line-color', '#9aa3b8');
        paint('places', 'text-color', 'rgba(235,238,245,0.6)');
        paint('places', 'text-halo-color', '#05060a');
        paint('grat', 'line-color', '#ffffff');
        paint('grat', 'line-opacity', ['interpolate', ['linear'], ['zoom'], 0, 0.07, 6, 0]);
        paint('dots', 'circle-color', '#c9cdd8');
        paint('zones-line', 'line-dasharray', [2, 2]);
        try { map.setSky({ 'sky-color': '#05060a', 'horizon-color': '#151a2b', 'fog-color': '#05060a', 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 5, 0.5, 8, 0] }); } catch (e) { /* */ }
      }

      if (terr && !tilted) {
        tilted = true;
        const tb = els.root.querySelector('[data-hunt-tilt]'); if (tb) tb.setAttribute('aria-pressed', 'true');
        try { map.setTerrain({ source: 'dem', exaggeration: 1.3 }); } catch (e) { /* */ }
        map.easeTo({ pitch: 55, duration: api.reduced ? 0 : 600 });
      } else if (!terr) {
        try { map.setTerrain(tilted && depth ? { source: 'dem', exaggeration: 1.3 } : null); } catch (e) { /* */ }
      }

      els.root.querySelectorAll('[data-map-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapStyle === mapStyle)));
      savePref();
    }

    function setGlobe(on) {
      isGlobe = on;
      try { map.setProjection({ type: on ? 'globe' : 'mercator' }); } catch (e) { /* */ }
      const btn = els.root.querySelector('[data-hunt-proj]');
      if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Globe' : 'Flat'; }
      savePref();
      hud();
    }

    const onClick = (e) => {
      const z = e.target.closest('[data-hunt-zoom]');
      if (z) { stopSpin(); map.zoomTo(map.getZoom() + Number(z.dataset.huntZoom), { duration: api.reduced ? 0 : 400 }); return; }
      if (e.target.closest('[data-hunt-north]')) { map.easeTo({ bearing: 0, pitch: tilted ? 55 : 0 }); return; }
      if (e.target.closest('[data-hunt-home]')) { home(); return; }
      const t = e.target.closest('[data-hunt-tilt]');
      if (t) {
        tilted = !tilted; t.setAttribute('aria-pressed', String(tilted));
        try { map.setTerrain(tilted && depth ? { source: 'dem', exaggeration: 1.3 } : null); } catch (err) { /* no terrain */ }
        map.easeTo({ pitch: tilted ? 55 : 0, duration: api.reduced ? 0 : 800 });
        return;
      }
      const stBtn = e.target.closest('[data-map-style]');
      if (stBtn) { applyStyle(stBtn.dataset.mapStyle); return; }
      if (e.target.closest('[data-hunt-proj]')) { setGlobe(!isGlobe); return; }
      const stylesToggle = e.target.closest('[data-hunt-styles]');
      if (stylesToggle) {
        const panel = els.root.querySelector('.k-mapstyle');
        const on = !(panel && panel.classList.contains('is-open'));
        if (panel) panel.classList.toggle('is-open', on);
        stylesToggle.setAttribute('aria-expanded', String(on));
        return;
      }
      const tele = e.target.closest('[data-hunt-tele]');
      if (tele) {
        const aside = els.root.querySelector('.k-hud__tele');
        const on = !(aside && aside.classList.contains('is-open'));
        if (aside) aside.classList.toggle('is-open', on);
        tele.setAttribute('aria-expanded', String(on));
        return;
      }
      const l = e.target.closest('[data-hunt-layer]');
      if (l) {
        layersOn[l.dataset.huntLayer] = !layersOn[l.dataset.huntLayer];
        els.root.querySelectorAll(`[data-hunt-layer="${l.dataset.huntLayer}"]`).forEach((b) => b.setAttribute('aria-pressed', String(layersOn[l.dataset.huntLayer])));
        showLayers(); renderDrops();
        return;
      }
      if (e.target.closest('[data-hunt-locate]')) { locate(); return; }
      const fly = e.target.closest('[data-hunt-fly]');
      if (fly) {
        const item = drops.concat(stores).find((x) => x.id === fly.dataset.huntFly);
        if (item) { focusId = item.id; flyTo(item); renderDrops(); scrollFind(item.id); }
        return;
      }
      const reserve = e.target.closest('[data-hunt-reserve]');
      if (reserve) { api.openPDP(reserve.dataset.huntReserve); return; }
    };
    els.root.addEventListener('click', onClick);

    /* ---- where am I: distance to every drop ---- */
    let me = null; let meMk = null;
    function locate() {
      if (!navigator.geolocation) { api.status('Location isn’t available in this browser.'); return; }
      api.status('Finding you…');
      navigator.geolocation.getCurrentPosition((pos) => {
        me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (!meMk) { const el = document.createElement('div'); el.className = 'k-me'; meMk = new ml.Marker({ element: el }).setLngLat([me.lon, me.lat]).addTo(map); } else meMk.setLngLat([me.lon, me.lat]);
        stopSpin();
        map.flyTo({ center: [me.lon, me.lat], zoom: Math.max(map.getZoom(), 4), duration: api.reduced ? 0 : 1600 });
        const near = drops.map((d) => ({ d, k: km(me, d) })).sort((a, b) => a.k - b.k)[0];
        api.status(near ? `Nearest drop: ${near.d.p.title}, about ${Math.round(near.k).toLocaleString()} km away.` : 'Located.');
        renderDrops();
      }, () => api.status('Couldn’t get your location.'), { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    }

    /* ---- finds panel ---- */
    function scrollFind(id) {
      const el = els.drops && els.drops.querySelector(`[data-hunt-fly="${id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: api.reduced ? 'auto' : 'smooth' });
    }
    function renderDrops() {
      if (!els.drops) return;
      let list = drops.concat(stores).filter((x) => layersOn[x.kind]);
      if (sortBy === 'nearest' && me) list = list.slice().sort((a, b) => km(me, a) - km(me, b));
      else if (sortBy === 'newest') list = list.slice().sort((a, b) => String((b.p && b.p.added) || '').localeCompare(String((a.p && a.p.added) || '')));
      else if (sortBy === 'price') list = list.slice().sort((a, b) => ((a.p && a.p.price) ?? 1e9) - ((b.p && b.p.price) ?? 1e9));
      els.drops.innerHTML = list.map((x) => {
        const dist = me ? `${Math.round(km(me, x)).toLocaleString()} km` : '';
        const on = focusId === x.id ? ' is-on' : '';
        if (x.kind === 'hunt') {
          return `<article class="k-find${on}" role="listitem">
            <img src="${esc(api.thumb(x.p))}" alt="" loading="lazy">
            <div>
              <b>${esc(short(x.p.title, 28))}</b>
              <small>${esc(x.p.pickup.place)}${x.p.pickup.window ? ` · ${esc(x.p.pickup.window)}` : ''}${dist ? ` · ${dist}` : ''}</small>
              <small>${esc(api.price(x.p))}</small>
            </div>
            <div class="k-find__acts">
              <button type="button" class="k-btn k-btn--sm k-btn--solid" data-hunt-reserve="${esc(x.id)}">Reserve</button>
              <button type="button" class="k-btn k-btn--sm" data-hunt-fly="${esc(x.id)}">Fly to</button>
            </div>
          </article>`;
        }
        return `<article class="k-find${on}" role="listitem">
          <span class="k-find__logo">${esc(x.st.name.slice(0, 1))}</span>
          <div>
            <b>${esc(x.st.name)}</b>
            <small>Store · ${esc(x.st.city || '')}${dist ? ` · ${dist}` : ''}</small>
          </div>
          <div class="k-find__acts">
            <button type="button" class="k-btn k-btn--sm" data-hunt-fly="${esc(x.id)}">Fly to</button>
          </div>
        </article>`;
      }).join('');
    }
    renderDrops();

    const sortSel = els.root.querySelector('[data-mount="finds-sort"]');
    if (sortSel) sortSel.addEventListener('change', () => { sortBy = sortSel.value; renderDrops(); });

    // Mobile finds sheet snap
    const finds = els.root.querySelector('[data-mount="hunt-finds"]');
    if (finds) {
      let startY = 0;
      finds.addEventListener('touchstart', (e) => { if (e.target.closest('[data-finds-grab]') || e.target === finds.querySelector('.k-finds__grab')) startY = e.touches[0].clientY; else startY = 0; }, { passive: true });
      finds.addEventListener('touchend', (e) => {
        if (!startY) return;
        const dy = e.changedTouches[0].clientY - startY;
        const cur = finds.dataset.snap || 'peek';
        if (dy < -40) finds.dataset.snap = cur === 'peek' ? 'half' : 'full';
        else if (dy > 40) finds.dataset.snap = cur === 'full' ? 'half' : 'peek';
        startY = 0;
      }, { passive: true });
    }

    // Sync projection button + initial style once map is ready
    map.once('load', () => {
      setGlobe(isGlobe);
      const tiltBtn = els.root.querySelector('[data-hunt-tilt]');
      if (tiltBtn) tiltBtn.setAttribute('aria-pressed', String(tilted));
    });

    // Highlight beacon selection → panel
    const origFly = flyTo;
    flyTo = function (item) {
      focusId = item.id;
      origFly(item);
      renderDrops();
      scrollFind(item.id);
      beacons.forEach((b) => b.el.classList.toggle('is-on', b.item.id === item.id));
    };

    function destroy() {
      stopSpin();
      els.root.removeEventListener('click', onClick);
      clearTips();
      try { map.remove(); } catch (e) { /* already gone */ }
    }
    return { map, showTips, clearTips, flyTo, find: (id) => drops.concat(stores).find((x) => x.id === id), destroy, home, applyStyle };
  }

  window.KioskHunt = { mount };
})();
