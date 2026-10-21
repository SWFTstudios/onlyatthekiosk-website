/**
 * KIOSK — product mockups
 * Vector flat-lay mockups for the shop: garments, headwear, skate,
 * accessories and the physical "containers" for digital goods
 * (cassette = mix, VHS = film, box = LUT pack).
 *
 *   KioskMockup.render({ type: 'hoodie', print: 'arch', label, sub, swatches },
 *                      { garment: '#141414', ink: '#f2f0eb' })
 *
 * Returns an inline SVG string (viewBox 0 0 400 480). Pass
 * { sketch: true, code, title, … } as a third argument for the black-and-
 * white tech-pack flat (viewBox 0 0 360 480). Real photography always wins.
 */
(function () {
  'use strict';

  let uid = 0;
  const SANS = "'General Sans', 'Generalsans', ui-sans-serif, system-ui, sans-serif";
  const SERIF = "'Instrument Serif', Georgia, serif";
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /** Perceived lightness 0–1 for picking seam/shadow strength. */
  function lum(hex) {
    const h = String(hex || '#777').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
    const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  const star = (x, y, r, fill) =>
    `<path d="M${x},${y - r} Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y} Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r} Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y} Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r}Z" fill="${fill}"/>`;

  /**
   * The KIOSK wordmark with its first K facing backwards (ꓘIOSK), as SVG.
   * Centred on (x, y) unless anchor is 'start'. Glyph widths approximate
   * General Sans caps so the mirrored K sits tight against "IOSK".
   */
  function wordmark(x, y, size, ls, attrs, anchor = 'middle') {
    const kw = size * 0.66;
    const total = size * (0.66 + 0.27 + 0.8 + 0.64 + 0.66) + ls * 4;
    const x0 = anchor === 'start' ? x : x - total / 2;
    return `<g transform="translate(${(x0).toFixed(2)} ${y})"><text transform="scale(-1 1)" x="${(-kw).toFixed(2)}" y="0" font-size="${size}" ${attrs}>K</text><text x="${(kw + ls).toFixed(2)}" y="0" font-size="${size}" letter-spacing="${ls}" ${attrs}>IOSK</text></g>`;
  }

  /* ------------------------------------------------------------- prints
   * Each print is drawn on a 100-unit-wide canvas centred on (0,0) and
   * scaled into place by the garment.                                    */
  const PRINTS = {
    wordmark: (ink) => `
      <text x="0" y="-14" text-anchor="middle" font-family="${SANS}" font-size="6.2" letter-spacing="2.6" fill="${ink}" opacity=".8">ONLY AT THE</text>
      ${wordmark(0, 12, 31, -1.6, `font-family="${SANS}" font-weight="600" fill="${ink}"`)}`,

    kmark: (ink, bg) => `
      <circle cx="0" cy="0" r="30" fill="${ink}"/>
      <text x="1" y="15" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="46" fill="${bg}">K</text>`,

    wangan: (ink) => `
      <text x="0" y="-16" text-anchor="middle" font-family="${SANS}" font-size="6" letter-spacing="2.4" fill="${ink}" opacity=".75">TOKYO — BAYSHORE ROUTE</text>
      <text x="0" y="8" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="24" letter-spacing="-.8" fill="${ink}">WANGAN</text>
      <rect x="-40" y="15" width="80" height=".9" fill="${ink}" opacity=".6"/>
      <text x="-40" y="26" font-family="${SANS}" font-size="6" letter-spacing="1.4" fill="${ink}">R32 · 1991</text>
      <text x="40" y="26" text-anchor="end" font-family="${SERIF}" font-style="italic" font-size="9" fill="${ink}">night shift</text>`,

    issue: (ink) => `
      <text x="0" y="-6" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="22" letter-spacing="-.6" fill="${ink}">ISSUE 01</text>
      <text x="0" y="16" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="17" fill="${ink}">Hudson Line</text>
      ${star(-38, 10, 3.5, ink)}${star(38, 10, 3.5, ink)}`,

    hudson: (ink) => `
      <text x="0" y="-17" text-anchor="middle" font-family="${SANS}" font-size="6" letter-spacing="2.4" fill="${ink}" opacity=".75">NEW YORK — NEW JERSEY</text>
      <text x="0" y="7" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="24" letter-spacing="-.8" fill="${ink}">HUDSON</text>
      <rect x="-40" y="14" width="80" height=".9" fill="${ink}" opacity=".6"/>
      <text x="-40" y="25" font-family="${SANS}" font-size="6" letter-spacing="1.4" fill="${ink}">ISSUE 01</text>
      <text x="40" y="25" text-anchor="end" font-family="${SERIF}" font-style="italic" font-size="9" fill="${ink}">line</text>`,

    arch: (ink, bg, id) => `
      <defs><path id="arc${id}" d="M-42,6 A42,42 0 0 1 42,6"/></defs>
      <text font-family="${SANS}" font-weight="600" font-size="10.5" letter-spacing="2.2" fill="${ink}"><textPath href="#arc${id}" startOffset="50%" text-anchor="middle">ONLY AT THE KIOSK</textPath></text>
      <circle cx="0" cy="8" r="16" fill="${ink}"/>
      <text x="0.5" y="16.5" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="25" fill="${bg}">K</text>
      <text x="0" y="38" text-anchor="middle" font-family="${SANS}" font-size="5.6" letter-spacing="2" fill="${ink}" opacity=".8">MIDNIGHT GARAGE CLUB</text>`,

    phonk: (ink) => `
      <text x="0" y="6" text-anchor="middle" font-family="${SANS}" font-weight="600" font-style="italic" font-size="27" letter-spacing="-1" fill="${ink}">PHONK</text>
      ${star(-44, -12, 4, ink)}${star(44, 2, 3, ink)}
      <text x="0" y="20" text-anchor="middle" font-family="${SANS}" font-size="6" letter-spacing="2.6" fill="${ink}" opacity=".8">KIOSK RADIO · 24/7</text>`,

    cafe: (ink) => `
      <text x="0" y="-12" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="15" fill="${ink}">Café Racer</text>
      <text x="0" y="10" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="20" letter-spacing="2" fill="${ink}">CLUB</text>
      <text x="0" y="22" text-anchor="middle" font-family="${SANS}" font-size="5.6" letter-spacing="2" fill="${ink}" opacity=".8">BROOKLYN · SUNDAYS ONLY</text>`,

    // The KIOSK globe mark: gridded globe, orbit ring and star, the
    // wordmark in a box across the equator (the Globe Hoodie)
    globe: (ink, bg) => {
      const sw = 'stroke-width="1.6"';
      let grid = '';
      [-0.75, -0.4, 0, 0.4, 0.75].forEach((k) => { const y = 30 * k; const hw = 30 * Math.sqrt(1 - k * k); grid += `<path d="M${-hw},${y} L${hw},${y}" stroke="${ink}" ${sw} fill="none"/>`; });
      [0.32, 0.68].forEach((k) => { grid += `<ellipse cx="0" cy="0" rx="${(30 * k).toFixed(1)}" ry="30" fill="none" stroke="${ink}" ${sw}/>`; });
      return `
      <path d="M-46,10 Q0,-14 46,-4" fill="none" stroke="${ink}" stroke-width="5" opacity=".9"/>
      <circle cx="0" cy="0" r="30" fill="${bg}" stroke="${ink}" stroke-width="2.6"/>
      ${grid}
      <path d="M0,-30 L0,30" stroke="${ink}" ${sw}/>
      <path d="M-14,-18 q6,-6 12,-2 q4,6 -2,10 q-8,2 -10,-8 Z M6,-12 q10,-4 14,4 q-2,8 -10,6 q-6,-4 -4,-10 Z M-6,8 q6,-2 8,6 q-2,10 -6,12 q-4,-8 -2,-18 Z" fill="${ink}" opacity=".85"/>
      <rect x="-44" y="-8" width="88" height="16" rx="2" fill="${bg}" stroke="${ink}" stroke-width="1.8"/>
      ${wordmark(0, 5.6, 14.5, 1.2, `font-family="${SANS}" font-weight="700" fill="${ink}"`)}
      <path d="M-46,14 Q0,36 50,-2" fill="none" stroke="${ink}" stroke-width="3.2"/>
      ${star(42, -26, 6, ink)}`;
    },

    // The orbit wordmark (images/brand/kiosk-orbit-logo.png): the real
    // artwork used as a mask so it takes any ink colour (the Orbit Ringer Tee)
    orbit: (ink) => {
      const id = `orb${(uid += 1)}`;
      return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-50" y="-25" width="100" height="50"><image href="/images/brand/kiosk-orbit-logo.png" x="-50" y="-24.43" width="100" height="48.86"/></mask>
      <rect x="-50" y="-25" width="100" height="50" fill="${ink}" mask="url(#${id})"/>`;
    },

    // The retro orbit mark: a tall italic K with IOSK tucked beside it, an
    // orbit swoosh round the K to a star, cracked like an old print. A
    // colourway's mockup.stripes adds racing stripes under it (the Retro Tee)
    retro: (ink, bg, id, spec = {}) => {
      const m = `rt${(uid += 1)}`;
      const bands = [ink].concat(spec.stripes || []);
      const stripes = spec.stripes ? bands.map((col, i) => { const y = 11 + i * 5.6; return `<path d="M${-6 - i * 4},${y} L50,${y} L50,${y + 4.4} L${-7 - i * 4},${y + 4.4} Z" fill="${col}"/>`; }).join('') : '';
      return `<filter id="${m}f" filterUnits="userSpaceOnUse" x="-60" y="-45" width="120" height="85"><feTurbulence type="fractalNoise" baseFrequency=".35 .9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -40 30"/></filter>
      <mask id="${m}" maskUnits="userSpaceOnUse" x="-60" y="-45" width="120" height="85"><rect x="-60" y="-45" width="120" height="85" fill="#fff" filter="url(#${m}f)"/></mask>
      <g mask="url(#${m})">
        ${stripes}
        <path d="M-18,25 Q-54,24 -42,2 Q-28,-22 18,-25 Q42,-26 47,-15 Q40,-21 18,-20.5 Q-22,-18 -36,3 Q-44,19 -18,25 Z" fill="${ink}"/>
        <path d="M44,-19 Q53,-6 41,9 Q45,-5 40,-16 Z" fill="${ink}"/>
        ${star(17, -29, 8.5, ink)}
        <text x="-25" y="22" text-anchor="middle" font-family="${SANS}" font-weight="700" font-style="italic" font-size="56" fill="${ink}">K</text>
        <text x="18" y="5" text-anchor="middle" font-family="${SANS}" font-weight="700" font-style="italic" font-size="23" letter-spacing="-.3" fill="${ink}">IOSK</text>
      </g>`;
    },

    checker: (ink, bg) => {
      let squares = '';
      for (let r = 0; r < 3; r += 1) for (let c = 0; c < 10; c += 1) if ((r + c) % 2 === 0) squares += `<rect x="${-50 + c * 10}" y="${-26 + r * 10}" width="10" height="10" fill="${ink}"/>`;
      return `${squares}${wordmark(0, 22, 15, 3, `font-family="${SANS}" font-weight="600" fill="${ink}"`)}`;
    },
  };

  /** Word-wrap a quote into lines of roughly `max` characters. */
  function wrap(text, max) {
    const lines = [];
    String(text || '').split(/\s+/).forEach((word) => {
      const last = lines[lines.length - 1];
      if (last && (last + ' ' + word).length <= max) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    });
    return lines;
  }

  /**
   * Quote print for the back of tees and hoodies (and totes): the line
   * itself, set as an editorial block, signed ONLY AT THE KIOSK.
   * spec.quote = text, spec.quoteStyle = 'serif' | 'grotesk', spec.quoteBy = attribution
   */
  PRINTS.quote = (ink, bg, id, spec = {}) => {
    if (spec.quoteFont) {
      const h = quoteBox(spec);
      return `<g transform="translate(-34 ${fx(-h / 2)}) scale(1.5)">${quoteLettering(spec, 0, 4, ink, bg)}</g>`;
    }
    const serif = spec.quoteStyle !== 'grotesk';
    const text = serif ? spec.quote : String(spec.quote || '').toUpperCase();
    const lines = wrap(text, serif ? 13 : 14);
    const longest = Math.max(...lines.map((l) => l.length), 6);
    const size = Math.min(serif ? 21 : 15, (serif ? 188 : 152) / longest);
    const lh = size * (serif ? 1.02 : 1.06);
    const top = -((lines.length - 1) * lh) / 2 - 6;
    const font = serif
      ? `font-family="${SERIF}" font-size="${size.toFixed(2)}"`
      : `font-family="${SANS}" font-weight="600" font-size="${size.toFixed(2)}" letter-spacing="-.2"`;
    const body = lines.map((l, i) => `<text x="0" y="${(top + i * lh).toFixed(2)}" text-anchor="middle" ${font} fill="${ink}">${esc(l)}</text>`).join('');
    const foot = top + (lines.length - 1) * lh + 14;
    return `${body}
      <rect x="-24" y="${(foot - 6).toFixed(2)}" width="48" height=".7" fill="${ink}" opacity=".55"/>
      <text x="0" y="${(foot + 3).toFixed(2)}" text-anchor="middle" font-family="${SANS}" font-size="3.6" letter-spacing="1.6" fill="${ink}" opacity=".8">${esc(spec.quoteBy ? String(spec.quoteBy).toUpperCase() + ' · ' : '')}ONLY AT THE KIOSK</text>`;
  };

  const print = (name, ink, bg, x, y, w, id, spec) => {
    const fn = PRINTS[name] || PRINTS.wordmark;
    return `<g transform="translate(${x} ${y}) scale(${w / 100})">${fn(ink, bg, id, spec)}</g>`;
  };

  /** Small K mark on the left chest (wearer's left = viewer's right). */
  const chestMark = (c, x, y, spec) => {
    const name = (spec && spec.chestPrint) || 'kmark';
    return `<g transform="translate(${x} ${y}) scale(${name === 'kmark' ? 0.3 : 0.24})">${(PRINTS[name] || PRINTS.kmark)(c.ink, c.garment)}</g>`;
  };

  /** A ringer's contrast neck rib (colourway `rib`), front and back. */
  const ringFront = (c) => (c.rib ? `<path d="M150,56.5 Q200,107 250,56.5 L241,58 Q200,95 159,58 Z" fill="${c.rib}"/>` : '');
  const ringBack = (c) => (c.rib ? `<path d="M156,57 Q200,73 244,57" stroke="${c.rib}" stroke-width="7" fill="none" stroke-linecap="round"/>` : '');

  /* --------------------------------------------------------- shared defs */
  function defs(id, g) {
    const dark = lum(g) < 0.35;
    return `
      <defs>
        <linearGradient id="side${id}" x1="0" x2="1">
          <stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.28 : 0.12}"/>
          <stop offset=".32" stop-color="#000" stop-opacity="0"/>
          <stop offset=".68" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="${dark ? 0.3 : 0.14}"/>
        </linearGradient>
        <linearGradient id="top${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.1 : 0.22}"/>
          <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="${dark ? 0.18 : 0.06}"/>
        </linearGradient>
        <radialGradient id="shadow${id}">
          <stop offset="0" stop-color="#000" stop-opacity=".22"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="metal${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
          <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
          <stop offset=".55" stop-color="#000" stop-opacity=".15"/>
          <stop offset="1" stop-color="#fff" stop-opacity=".35"/>
        </linearGradient>
      </defs>`;
  }

  const seam = (g) => (lum(g) < 0.35 ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.14)');
  const fold = (g) => (lum(g) < 0.35 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)');
  const shadow = (id, cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow${id})"/>`;
  const shade = (id, d) => `<path d="${d}" fill="url(#side${id})"/><path d="${d}" fill="url(#top${id})"/>`;

  /* ------------------------------------------------------------ garments */
  const TEE = 'M158,58 Q200,92 242,58 L304,76 L378,150 L340,186 L304,160 L308,438 Q200,450 92,438 L96,160 L60,186 L22,150 L96,76 Z';
  const LONG = 'M158,58 Q200,92 242,58 L304,76 Q338,98 350,170 L372,420 L330,428 L306,200 L308,438 Q200,450 92,438 L94,200 L70,428 L28,420 L50,170 Q62,98 96,76 Z';
  const HOOD_BODY = 'M150,66 Q200,84 250,66 L306,82 Q340,104 352,176 L374,420 L332,428 L308,206 L310,438 Q200,450 90,438 L92,206 L68,428 L26,420 L48,176 Q60,104 94,82 Z';

  const garments = {
    tee(spec, c, id) {
      const s = seam(c.garment);
      if (spec.side === 'back') {
        return `${shadow(id, 200, 452, 140, 14)}
        <path d="${TEE}" fill="${c.garment}"/>
        <path d="M128,210 Q142,320 126,430" stroke="${fold(c.garment)}" stroke-width="16" fill="none"/>
        ${print(spec.backPrint || 'quote', c.ink, c.garment, 200, 200, spec.backW || 132, id, spec)}
        ${shade(id, TEE)}
        ${ringBack(c)}
        <path d="M158,58 Q200,70 242,58" stroke="${s}" stroke-width="2.4" fill="none"/>
        <path d="M96,76 Q106,118 96,160 M304,76 Q294,118 304,160" stroke="${s}" stroke-width="1.2" fill="none"/>
        <path d="M33,139 L70,175 M367,139 L330,175 M94,424 Q200,436 306,424" stroke="${s}" stroke-width="1.2" fill="none"/>`;
      }
      if (spec.chest) {
        return `${shadow(id, 200, 452, 140, 14)}
        <path d="${TEE}" fill="${c.garment}"/>
        <path d="M128,210 Q142,320 126,430" stroke="${fold(c.garment)}" stroke-width="16" fill="none"/>
        ${chestMark(c, 250, 130, spec)}
        ${shade(id, TEE)}
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.28)"/>
        ${ringFront(c)}
        <path d="M158,58 Q200,96 242,58" stroke="${s}" stroke-width="2" fill="none"/>
        <path d="M152,57 Q200,104 248,57" stroke="${s}" stroke-width="1" fill="none" opacity=".6"/>
        <path d="M96,76 Q106,118 96,160 M304,76 Q294,118 304,160" stroke="${s}" stroke-width="1.2" fill="none"/>
        <path d="M33,139 L70,175 M367,139 L330,175 M94,424 Q200,436 306,424" stroke="${s}" stroke-width="1.2" fill="none"/>`;
      }
      return `${shadow(id, 200, 452, 140, 14)}
        <path d="${TEE}" fill="${c.garment}"/>
        <path d="M128,210 Q142,320 126,430" stroke="${fold(c.garment)}" stroke-width="16" fill="none"/>
        <path d="M262,200 Q276,320 262,432" stroke="${fold(c.garment)}" stroke-width="12" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 205, spec.printW || 120, id, spec)}
        ${shade(id, TEE)}
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.28)"/>
        ${ringFront(c)}
        <path d="M158,58 Q200,96 242,58" stroke="${s}" stroke-width="2" fill="none"/>
        <path d="M152,57 Q200,104 248,57" stroke="${s}" stroke-width="1" fill="none" opacity=".6"/>
        <path d="M96,76 Q106,118 96,160 M304,76 Q294,118 304,160" stroke="${s}" stroke-width="1.2" fill="none"/>
        <path d="M33,139 L70,175 M367,139 L330,175 M94,424 Q200,436 306,424" stroke="${s}" stroke-width="1.2" fill="none"/>`;
    },

    longsleeve(spec, c, id) {
      const s = seam(c.garment);
      return `${shadow(id, 200, 452, 170, 14)}
        <path d="${LONG}" fill="${c.garment}"/>
        <path d="M130,220 Q142,320 126,430" stroke="${fold(c.garment)}" stroke-width="16" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 205, spec.printW || 118, id, spec)}
        ${spec.sleevePrint ? `<text transform="translate(338 300) rotate(84)" text-anchor="middle" font-family="${SANS}" font-size="9" letter-spacing="3" fill="${c.ink}">${esc(spec.sleevePrint)}</text>` : ''}
        ${shade(id, LONG)}
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.28)"/>
        <path d="M158,58 Q200,96 242,58" stroke="${s}" stroke-width="2" fill="none"/>
        <path d="M96,76 Q108,120 94,200 M304,76 Q292,120 306,200" stroke="${s}" stroke-width="1.2" fill="none"/>
        <path d="M31,402 L72,409 M369,402 L328,409 M94,424 Q200,436 306,424" stroke="${s}" stroke-width="1.2" fill="none"/>`;
    },

    crew(spec, c, id) {
      const s = seam(c.garment);
      return `${shadow(id, 200, 452, 170, 14)}
        <path d="${LONG}" fill="${c.garment}"/>
        <path d="M132,220 Q144,320 128,410" stroke="${fold(c.garment)}" stroke-width="18" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 210, spec.printW || 120, id, spec)}
        ${shade(id, LONG)}
        <path d="M92,410 L308,410 L308,438 Q200,450 92,438 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M30,398 L72,405 L70,428 L28,420 Z M370,398 L328,405 L330,428 L372,420 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.3)"/>
        <path d="M156,58 Q200,100 244,58" stroke="${s}" stroke-width="9" fill="none" opacity=".35"/>
        <path d="M96,76 Q108,120 94,200 M304,76 Q292,120 306,200" stroke="${s}" stroke-width="1.2" fill="none"/>`;
    },

    hoodie(spec, c, id) {
      const s = seam(c.garment);
      if (spec.side === 'back') {
        const hoodBack = 'M136,92 Q124,8 200,2 Q276,8 264,92 Q200,110 136,92 Z';
        return `${shadow(id, 200, 452, 172, 14)}
        <path d="${HOOD_BODY}" fill="${c.garment}"/>
        <path d="M130,230 Q144,320 128,404" stroke="${fold(c.garment)}" stroke-width="18" fill="none"/>
        ${print(spec.backPrint || 'quote', c.ink, c.garment, 200, 250, spec.backW || 132, id, spec)}
        ${shade(id, HOOD_BODY)}
        <path d="M90,410 L310,410 L310,438 Q200,450 90,438 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M28,398 L70,405 L68,428 L26,420 Z M372,398 L330,405 L332,428 L374,420 Z" fill="rgba(0,0,0,.08)"/>
        <path d="${hoodBack}" fill="${c.garment}"/>${shade(id, hoodBack)}
        <path d="M200,6 Q204,50 200,104" stroke="${s}" stroke-width="1.4" fill="none"/>
        <path d="M136,92 Q200,110 264,92" stroke="${s}" stroke-width="2" fill="none"/>
        <path d="M94,82 Q108,130 92,206 M306,82 Q292,130 308,206" stroke="${s}" stroke-width="1.2" fill="none"/>`;
      }
      const hood = 'M142,76 Q134,12 200,6 Q266,12 258,76 Z';
      const opening = 'M160,70 Q162,26 200,22 Q238,26 240,70 Q222,100 200,102 Q178,100 160,70 Z';
      const string = lum(c.garment) < 0.35 ? '#e9e6df' : '#1a1a1a';
      return `${shadow(id, 200, 452, 172, 14)}
        <path d="${hood}" fill="${c.garment}"/>${shade(id, hood)}
        <path d="${HOOD_BODY}" fill="${c.garment}"/>
        <path d="M130,230 Q144,320 128,404" stroke="${fold(c.garment)}" stroke-width="18" fill="none"/>
        ${spec.chest ? chestMark(c, 248, 170, spec) : print(spec.print, c.ink, c.garment, 200, 236, spec.printW || 108, id, spec)}
        <path d="M128,326 L272,326 L294,404 L106,404 Z" fill="rgba(0,0,0,.05)"/>
        ${shade(id, HOOD_BODY)}
        <path d="M128,326 L272,326 M128,326 Q112,360 106,404 M272,326 Q288,360 294,404" stroke="${s}" stroke-width="1.4" fill="none"/>
        <path d="M90,410 L310,410 L310,438 Q200,450 90,438 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M28,398 L70,405 L68,428 L26,420 Z M372,398 L330,405 L332,428 L374,420 Z" fill="rgba(0,0,0,.08)"/>
        <path d="${opening}" fill="rgba(0,0,0,.42)"/>
        <path d="${opening}" stroke="${s}" stroke-width="3" fill="none"/>
        ${spec.drawcord === false ? '' : `<path d="M188,100 L184,176 M212,100 L216,178" stroke="${string}" stroke-width="3" stroke-linecap="round"/>
        <rect x="181" y="174" width="6" height="12" rx="2" fill="${string}"/><rect x="213" y="176" width="6" height="12" rx="2" fill="${string}"/>`}
        <path d="M94,82 Q108,130 92,206 M306,82 Q292,130 308,206" stroke="${s}" stroke-width="1.2" fill="none"/>`;
    },

    cap(spec, c, id) {
      const s = seam(c.garment);
      const crown = 'M88,300 Q80,150 206,132 Q332,150 324,300 Q206,282 88,300 Z';
      const visor = 'M112,292 Q206,276 300,292 Q318,330 300,350 Q206,378 112,350 Q94,330 112,292 Z';
      return `${shadow(id, 206, 392, 150, 14)}
        <path d="${crown}" fill="${c.garment}"/>
        ${print(spec.print, c.ink, c.garment, 206, 214, spec.printW || 80, id)}
        ${shade(id, crown)}
        <path d="M206,134 L206,284 M206,134 Q150,200 132,292 M206,134 Q262,200 280,292" stroke="${s}" stroke-width="1.3" fill="none"/>
        <circle cx="150" cy="176" r="3.2" fill="rgba(0,0,0,.35)"/><circle cx="262" cy="176" r="3.2" fill="rgba(0,0,0,.35)"/>
        <ellipse cx="206" cy="133" rx="14" ry="6" fill="${c.garment}"/><ellipse cx="206" cy="133" rx="14" ry="6" fill="url(#top${id})"/>
        <path d="M100,300 Q206,282 312,300 L312,306 Q206,290 100,306 Z" fill="rgba(0,0,0,.18)"/>
        <path d="${visor}" fill="${c.brim || c.garment}"/>
        <path d="${visor}" fill="url(#top${id})"/>
        <path d="M112,292 Q206,276 300,292" stroke="${s}" stroke-width="1.6" fill="none"/>
        <path d="M118,316 Q206,302 294,316 M116,334 Q206,322 296,334" stroke="${s}" stroke-width="1" stroke-dasharray="3 4" fill="none" opacity=".7"/>
        <path d="M112,350 Q206,378 300,350" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>`;
    },

    beanie(spec, c, id) {
      const crown = 'M112,314 Q102,152 200,138 Q298,152 288,314 Z';
      const cuff = 'M100,300 L300,300 L304,392 Q200,404 96,392 Z';
      let ribs = '';
      for (let x = 108; x <= 292; x += 9) ribs += `<path d="M${x},${304} L${x + (x - 200) * 0.02},${392}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`;
      let crownRibs = '';
      for (let x = 122; x <= 278; x += 13) crownRibs += `<path d="M${x},310 Q${x + (x - 200) * -0.25},210 200,${150}" stroke="rgba(0,0,0,.06)" stroke-width="2" fill="none"/>`;
      return `${shadow(id, 200, 404, 130, 12)}
        <path d="${crown}" fill="${c.garment}"/>${crownRibs}${shade(id, crown)}
        <path d="${cuff}" fill="${c.garment}"/>${ribs}${shade(id, cuff)}
        <path d="M100,300 L300,300" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
        <rect x="158" y="322" width="84" height="44" rx="3" fill="${c.ink}"/>
        ${print(spec.print, c.garment, c.ink, 200, 346, 64, id)}`;
    },

    socks(spec, c, id) {
      const sock = 'M168,40 L240,40 L240,300 Q244,338 288,352 Q338,368 330,408 Q320,442 268,432 L190,414 Q156,404 162,360 Z';
      const one = (dx, rot, dim) => `
        <g transform="translate(${dx} 0) rotate(${rot} 220 240)">
          <clipPath id="sock${id}${dx}"><path d="${sock}"/></clipPath>
          <path d="${sock}" fill="${c.garment}"/>
          <g clip-path="url(#sock${id}${dx})">
            <rect x="150" y="40" width="110" height="52" fill="rgba(0,0,0,.06)"/>
            ${Array.from({ length: 8 }, (_, i) => `<rect x="${172 + i * 9}" y="40" width="2" height="52" fill="rgba(0,0,0,.1)"/>`).join('')}
            <rect x="150" y="106" width="110" height="12" fill="${c.ink}"/>
            <rect x="150" y="128" width="110" height="12" fill="${c.ink}"/>
            <circle cx="304" cy="404" r="42" fill="rgba(0,0,0,.1)"/>
            <circle cx="236" cy="330" r="30" fill="rgba(0,0,0,.08)"/>
          </g>
          ${print('kmark', c.ink, c.garment, 204, 214, 40, id)}
          ${shade(id, sock)}
          ${dim ? `<path d="${sock}" fill="rgba(0,0,0,.12)"/>` : ''}
        </g>`;
      return `${shadow(id, 230, 452, 120, 12)}${one(-46, -6, true)}${one(26, 4, false)}`;
    },

    tote(spec, c, id) {
      const bag = 'M110,186 L290,186 L300,442 L100,442 Z';
      return `${shadow(id, 200, 452, 130, 12)}
        <path d="M148,196 Q146,78 200,76 Q254,78 252,196" stroke="${c.garment}" stroke-width="16" fill="none"/>
        <path d="M148,196 Q146,78 200,76 Q254,78 252,196" stroke="rgba(0,0,0,.18)" stroke-width="16" fill="none"/>
        <path d="${bag}" fill="${c.garment}"/>
        <path d="M150,230 Q160,330 146,440" stroke="${fold(c.garment)}" stroke-width="18" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 312, spec.printW || 130, id, spec)}
        ${shade(id, bag)}
        <path d="M110,200 L290,200" stroke="${seam(c.garment)}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    },

    deck(spec, c, id) {
      const deck = (x, y, fill) => `<rect x="${x}" y="${y}" width="96" height="420" rx="48" fill="${fill}"/>`;
      const bolts = (x, y) => [0, 1].map((r) => [0, 1].map((k) => `<circle cx="${x + 34 + k * 28}" cy="${y + r * 22}" r="2.6" fill="rgba(0,0,0,.35)"/>`).join('')).join('');
      let graphic = '';
      if (spec.print === 'checker') {
        for (let r = 0; r < 42; r += 1) for (let k = 0; k < 8; k += 1) if ((r + k) % 2 === 0) graphic += `<rect x="${176 + k * 12}" y="${30 + r * 10}" width="12" height="10" fill="${c.ink}"/>`;
        graphic = `<clipPath id="dk${id}"><rect x="176" y="30" width="96" height="420" rx="48"/></clipPath><g clip-path="url(#dk${id})">${graphic}<rect x="176" y="180" width="96" height="120" fill="${c.garment}"/></g>
          <g transform="translate(224 240) rotate(-90)">${wordmark(0, 12, 34, -1, `font-family="${SANS}" font-weight="600" fill="${c.ink}"`)}</g>`;
      } else {
        graphic = `${spec.deckText ? `<text transform="translate(232 240) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-weight="600" font-size="58" letter-spacing="-2" fill="${c.ink}">${esc(spec.deckText)}</text>` : `<g transform="translate(232 240) rotate(-90)">${wordmark(0, 20, 58, -2, `font-family="${SANS}" font-weight="600" fill="${c.ink}"`)}</g>`}
          <text transform="translate(198 240) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-family="${SERIF}" font-style="italic" font-size="16" fill="${c.ink}">${esc(spec.deckSub || 'issue 01')}</text>
          <circle cx="224" cy="96" r="14" fill="${c.ink}"/><text x="224.5" y="104" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="22" fill="${c.garment}">K</text>`;
      }
      return `${shadow(id, 240, 462, 110, 10)}
        <g transform="rotate(8 270 240)">${deck(222, 30, '#1c1c1d')}<rect x="222" y="30" width="96" height="420" rx="48" fill="url(#side${id})" opacity=".6"/>${bolts(222, 94)}${bolts(222, 364)}</g>
        ${deck(176, 30, c.garment)}
        ${graphic}
        <rect x="176" y="30" width="96" height="420" rx="48" fill="url(#side${id})"/>
        <rect x="176" y="30" width="96" height="420" rx="48" fill="url(#top${id})"/>
        ${bolts(176, 94)}${bolts(176, 364)}`;
    },

    keytag(spec, c, id) {
      return `${shadow(id, 200, 420, 90, 10)}
        <circle cx="200" cy="120" r="34" stroke="#b9bcc1" stroke-width="7" fill="none"/>
        <circle cx="200" cy="120" r="34" stroke="url(#metal${id})" stroke-width="7" fill="none"/>
        <rect x="132" y="150" width="136" height="240" rx="24" fill="${c.garment}"/>
        <rect x="132" y="150" width="136" height="240" rx="24" fill="url(#metal${id})" opacity=".55"/>
        <circle cx="200" cy="176" r="9" fill="#e9e8e4" stroke="rgba(0,0,0,.2)"/>
        ${print('kmark', c.ink, c.garment, 200, 250, 70, id)}
        <text x="200" y="320" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="15" letter-spacing="3" fill="${c.ink}">GARAGE</text>
        <text x="200" y="342" text-anchor="middle" font-family="${SANS}" font-size="8" letter-spacing="2" fill="${c.ink}" opacity=".75">NO. 001 / KIOSK</text>`;
    },

    stickers(spec, c, id) {
      const sticker = (x, y, rot, body) => `<g transform="translate(${x} ${y}) rotate(${rot})">${body}</g>`;
      return `${shadow(id, 200, 430, 150, 12)}
        ${sticker(140, 170, -10, `<circle r="70" fill="#fff"/><circle r="62" fill="${c.ink}"/><text x="2" y="22" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="68" fill="${c.garment}">K</text>`)}
        ${sticker(250, 230, 9, `<rect x="-92" y="-38" width="184" height="76" rx="18" fill="#fff"/><rect x="-84" y="-30" width="168" height="60" rx="12" fill="${c.garment}"/>${wordmark(0, 12, 34, -1.4, `font-family="${SANS}" font-weight="600" fill="${c.ink}"`)}`)}
        ${sticker(170, 330, -4, `<rect x="-86" y="-36" width="172" height="72" rx="10" fill="#fff"/><rect x="-78" y="-28" width="156" height="56" rx="6" fill="#141414"/>${print('hudson', '#f2f0eb', '#141414', 0, 2, 120, id)}`)}
        ${sticker(300, 360, 14, `<circle r="44" fill="#fff"/><circle r="37" fill="#e8892b"/>${star(0, 0, 20, '#141414')}`)}`;
    },

    chain(spec, c, id) {
      let links = '';
      const n = spec.links || 46;
      const rx = spec.rx || 120; const ry = spec.ry || 160; const cy = spec.cy || 240;
      for (let i = 0; i < n; i += 1) {
        const t = (i / n) * Math.PI * 2;
        const x = 200 + Math.sin(t) * rx; const y = cy - Math.cos(t) * ry;
        const ang = (Math.atan2(Math.sin(t) * ry, Math.cos(t) * rx) * 180) / Math.PI;
        links += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${spec.linkW || 12}" ry="${(spec.linkW || 12) * 0.64}" transform="rotate(${(-ang + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="${c.garment}" stroke-width="${spec.linkT || 6}"/>`;
      }
      return `${shadow(id, 200, cy + ry + 22, rx, 10)}
        <g>${links}</g>
        <g opacity=".55" style="mix-blend-mode:screen">${links.replace(/stroke="[^"]+"/g, `stroke="url(#metal${id})"`)}</g>
        <rect x="190" y="${cy - ry - 12}" width="22" height="14" rx="6" fill="${c.garment}"/>`;
    },

    /* ---- containers for digital goods ---- */
    cassette(spec, c, id) {
      const label = c.ink;
      return `${shadow(id, 200, 392, 160, 14)}
        <g transform="rotate(-6 200 240)">
          <rect x="58" y="146" width="284" height="182" rx="14" fill="${c.garment}"/>
          <rect x="58" y="146" width="284" height="182" rx="14" fill="url(#top${id})"/>
          <rect x="82" y="164" width="236" height="104" rx="6" fill="${label}"/>
          <rect x="82" y="164" width="236" height="18" rx="6" fill="${c.garment}" opacity=".9"/>
          <text x="92" y="177" font-family="${SANS}" font-size="9" letter-spacing="2" fill="${label}">KIOSK RADIO · ${esc(spec.sub || 'SIDE A')}</text>
          <text x="92" y="206" font-family="${SANS}" font-weight="600" font-size="20" letter-spacing="-.6" fill="${c.garment}">${esc(spec.label || 'MIX')}</text>
          <rect x="140" y="216" width="120" height="38" rx="19" fill="rgba(0,0,0,.72)"/>
          <circle cx="166" cy="235" r="13" fill="#efeee9"/><circle cx="234" cy="235" r="13" fill="#efeee9"/>
          <circle cx="166" cy="235" r="5" fill="rgba(0,0,0,.55)"/><circle cx="234" cy="235" r="5" fill="rgba(0,0,0,.55)"/>
          <rect x="182" y="226" width="36" height="18" rx="2" fill="rgba(110,70,40,.75)"/>
          <path d="M108,328 L128,290 L272,290 L292,328 Z" fill="rgba(0,0,0,.14)"/>
          ${[[70, 158], [330, 158], [70, 316], [330, 316]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="rgba(0,0,0,.35)"/>`).join('')}
          <circle cx="160" cy="312" r="5" fill="rgba(0,0,0,.4)"/><circle cx="240" cy="312" r="5" fill="rgba(0,0,0,.4)"/>
        </g>`;
    },

    vhs(spec, c, id) {
      return `${shadow(id, 200, 380, 168, 14)}
        <g transform="rotate(4 200 240)">
          <rect x="44" y="148" width="312" height="190" rx="8" fill="#151516"/>
          <rect x="44" y="148" width="312" height="190" rx="8" fill="url(#top${id})"/>
          <rect x="64" y="164" width="272" height="78" rx="4" fill="${c.ink}"/>
          <rect x="64" y="164" width="12" height="78" fill="${c.garment}"/>
          <text x="88" y="190" font-family="${SANS}" font-size="9" letter-spacing="2.2" fill="#141414" opacity=".7">KIOSK FILMS · ${esc(spec.sub || '4K')}</text>
          <text x="88" y="222" font-family="${SERIF}" font-style="italic" font-size="26" fill="#141414">${esc(spec.label || 'Film')}</text>
          <rect x="112" y="258" width="176" height="56" rx="6" fill="rgba(255,255,255,.08)"/>
          <circle cx="152" cy="286" r="20" fill="rgba(255,255,255,.12)"/><circle cx="248" cy="286" r="20" fill="rgba(255,255,255,.12)"/>
          <circle cx="152" cy="286" r="8" fill="#151516"/><circle cx="248" cy="286" r="8" fill="#151516"/>
          <text x="336" y="330" text-anchor="end" font-family="${SANS}" font-weight="600" font-size="11" letter-spacing="1" fill="rgba(255,255,255,.5)">VHS</text>
        </g>`;
    },

    lutbox(spec, c, id) {
      const sw = (spec.swatches || []).slice(0, 5);
      const w = 150 / Math.max(sw.length, 1);
      return `${shadow(id, 210, 392, 130, 12)}
        <path d="M116,112 L150,88 L324,92 L290,116 Z" fill="${c.garment}"/><path d="M116,112 L150,88 L324,92 L290,116 Z" fill="rgba(255,255,255,.18)"/>
        <path d="M290,116 L324,92 L324,350 L290,376 Z" fill="${c.garment}"/><path d="M290,116 L324,92 L324,350 L290,376 Z" fill="rgba(0,0,0,.28)"/>
        <rect x="116" y="116" width="174" height="260" fill="${c.garment}"/>
        <rect x="116" y="116" width="174" height="260" fill="url(#top${id})"/>
        <text x="130" y="146" font-family="${SANS}" font-size="9" letter-spacing="2.2" fill="${c.ink}" opacity=".8">KIOSK GRADE</text>
        <text x="130" y="206" font-family="${SANS}" font-weight="600" font-size="34" letter-spacing="-1.2" fill="${c.ink}">.CUBE</text>
        <text x="130" y="240" font-family="${SERIF}" font-style="italic" font-size="24" fill="${c.ink}">${esc(spec.label || 'LUT')}</text>
        <text x="130" y="260" font-family="${SANS}" font-size="8.5" letter-spacing="1.6" fill="${c.ink}" opacity=".75">${esc(spec.sub || '')}</text>
        ${sw.map((hex, i) => `<rect x="${130 + i * w}" y="300" width="${w}" height="44" fill="${esc(hex)}"/>`).join('')}
        <rect x="130" y="300" width="150" height="44" fill="none" stroke="rgba(0,0,0,.15)"/>`;
    },
  };

  function render(spec, colorway, opts) {
    // a colourway can change the artwork, e.g. { mockup: { chest: false, stripes } }
    if (colorway && colorway.mockup) spec = { ...spec, ...colorway.mockup };
    if (opts && opts.sketch) {
      // the flats are one ink: stripes become ink-coloured line art
      if (spec.stripes) spec = { ...spec, stripes: spec.stripes.map(() => INK) };
      return sketch(spec, colorway, opts);
    }
    const id = `m${(uid += 1)}`;
    const c = { garment: '#141414', ink: '#f2f0eb', ...(colorway || {}) };
    const draw = garments[spec.type] || garments.tee;
    return `<svg class="k-mockup" viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">${defs(id, c.garment)}${draw(spec, c, id)}</svg>`;
  }

  /* ------------------------------------------------------- tech sketch
   * Factory tech-pack flats for pieces with no real photos yet: front and
   * back line drawings, points of measure, zoomed construction details and
   * a spec block. Pure vector, one ink and one paper colour; the site CSS
   * swaps them per theme (.k-mockup--sketch in css/kiosk-glass.css).
   *
   *   KioskMockup.render(spec, colorway, { sketch: true, code, title, category, detail, sizes, colorways })
   */
  const INK = '#111111';
  const PAPER = '#ffffff';
  const BLANK = '#fefefd';   // stand-in garment colour while converting a mockup to line art

  const attr = (a, name) => (a.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
  const setAttr = (a, name, v) => (attr(a, name) != null ? a.replace(new RegExp(`\\s${name}="[^"]*"`), v == null ? '' : ` ${name}="${v}"`) : (v == null ? a : `${a} ${name}="${v}"`));
  const alpha = (col) => { const m = /^rgba\([^)]*,\s*([\d.]+)\)$/.exec(col || ''); return m ? Number(m[1]) : null; };

  /** Turn a filled, shaded mockup into black-and-white line art. */
  function lineArt(svg) {
    const line = (a, w, dash) => setAttr(setAttr(setAttr(setAttr(a, 'stroke', INK), 'stroke-width', w), 'stroke-linejoin', 'round'), 'stroke-dasharray', dash);
    return svg
      .replace(/<(path|rect|circle|ellipse)\b[^>]*="url\(#(side|top|shadow|metal)[^"]*\)"[^>]*\/>/g, '')
      .replace(/<(path|rect|circle|ellipse)\b([^>]*?)\/>/g, (m, tag, a) => {
        const fill = attr(a, 'fill');
        const stroke = attr(a, 'stroke');
        if (stroke && stroke !== 'none') {
          const w = Number(attr(a, 'stroke-width') || 1);
          const al = alpha(stroke);
          if (al != null && al <= 0.06) return '';
          if (al != null) return `<${tag}${line(setAttr(a, 'opacity', null), w >= 2 ? 1.8 : 1, w >= 2 && !attr(a, 'stroke-dasharray') ? null : '4 2.5')}/>`;
          if (stroke === INK || w <= 3.2) return `<${tag}${line(a, Math.max(1.4, Math.min(w, 2)), null)}/>`;
          return `<${tag}${line(a, w + 3.6, null)}/><${tag}${setAttr(a, 'stroke', PAPER)}/>`;
        }
        if (!fill || fill === 'none' || fill === INK) return m;
        const al = alpha(fill);
        if (al != null) return al < 0.05 ? '' : `<${tag}${line(setAttr(a, 'fill', 'none'), 1, null)}/>`;
        if (/^rgba\(255/.test(fill)) return '';
        return `<${tag}${line(setAttr(a, 'fill', PAPER), 2, null)}/>`;
      })
      .replace(/<g opacity="[^"]*" style="mix-blend-mode:screen">/g, '<g>')
      .replace(/(<text\b[^>]*?\sfill=")([^"]*)(")/g, (m, a, v, b) => `${a}${v === BLANK ? PAPER : INK}${b}`)
      .split(BLANK).join(PAPER);
  }

  /* ---- geometry helpers for the apparel flats (each view is a 200 × 232 box) */
  const fx = (n) => Math.round(n * 10) / 10;
  const pt = (p) => `${fx(p[0])},${fx(p[1])}`;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const along = (a, b, d) => lerp(a, b, d / Math.hypot(b[0] - a[0], b[1] - a[1]));
  const mir = (p) => [200 - p[0], p[1]];
  const both = (fn) => fn((p) => p) + fn(mir);
  const OUT = `fill="${PAPER}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
  const SEAM = `fill="none" stroke="${INK}" stroke-width=".8" stroke-linecap="round"`;
  const STITCH = `fill="none" stroke="${INK}" stroke-width=".6" stroke-dasharray="2.2 1.6"`;
  const RIB = `fill="none" stroke="${INK}" stroke-width=".45"`;

  /* Body blocks: N neck point, SP shoulder point, SO/SU sleeve end (outer/under), UA underarm, H hem side. */
  const BLOCKS = {
    tee: { N: [70, 16], SP: [32, 30], SO: [4, 86], SU: [28, 102], UA: [42, 80], H: [42, 216], neck: 30, long: false },
    longsleeve: { N: [70, 16], SP: [33, 30], SO: [8, 202], SU: [30, 206], UA: [42, 84], H: [42, 216], neck: 28, long: true },
    crew: { N: [70, 16], SP: [33, 30], SO: [8, 202], SU: [30, 206], UA: [42, 84], H: [42, 216], neck: 26, long: true, rib: true },
    hoodie: { N: [66, 36], SP: [31, 48], SO: [6, 208], SU: [28, 212], UA: [42, 100], H: [42, 224], neck: 26, long: true, rib: true, hood: true },
  };

  /* Quote lettering: small, over the wearer's right shoulder blade, as if
   * written with a dipped quill or embroidered. spec.quoteFont picks the hand,
   * spec.quoteFinish is 'ink' (default) or 'stitch'. */
  const QUOTE_FONTS = {
    quill: { family: "'Pinyon Script', 'Snell Roundhand', cursive", size: 9.6, lh: 1.08, max: 17 },
    hand: { family: "'Homemade Apple', 'Bradley Hand', cursive", size: 5.6, lh: 1.75, max: 19 },
    fell: { family: "'IM Fell English', Georgia, serif", italic: true, size: 7.4, lh: 1.12, max: 19 },
    flourish: { family: "'Mrs Saint Delafield', 'Snell Roundhand', cursive", size: 12, lh: 0.92, max: 15 },
    serif: { family: SERIF, italic: true, size: 8.2, lh: 1.05, max: 18 },
    grotesk: { family: SANS, weight: 600, size: 5.4, lh: 1.2, max: 18, upper: true },
  };
  function quoteLettering(spec, x, y, ink, paper, scale = 1) {
    const f = QUOTE_FONTS[spec.quoteFont] || QUOTE_FONTS[spec.quoteStyle] || QUOTE_FONTS.quill;
    const text = f.upper ? String(spec.quote || '').toUpperCase() : String(spec.quote || '');
    const lines = wrap(text, f.max);
    const font = `font-family="${f.family}"${f.italic ? ' font-style="italic"' : ''}${f.weight ? ` font-weight="${f.weight}"` : ''} font-size="${f.size * scale}"`;
    const set = (extra) => lines.map((l, i) => `<text x="${x}" y="${fx(y + i * f.size * f.lh * scale)}" ${font} ${extra}>${esc(l)}</text>`).join('');
    const stitch = spec.quoteFinish === 'stitch'
      ? set(`fill="none" stroke="${paper}" stroke-width="${0.24 * scale}" stroke-dasharray="${0.7 * scale} ${0.55 * scale}"`)
      : '';
    return `<g transform="rotate(-4 ${x} ${y})">${set(`fill="${ink}"`)}${stitch}</g>`;
  }
  const quoteBox = (spec) => { const f = QUOTE_FONTS[spec.quoteFont] || QUOTE_FONTS[spec.quoteStyle] || QUOTE_FONTS.quill; return wrap(spec.quote, f.max).length * f.size * f.lh; };

  function apparelFlat(type, side, spec) {
    const b = BLOCKS[type];
    const { N, SP, SO, SU, UA, H } = b;
    const back = side === 'back';
    const hemY = H[1];
    const neckD = back ? 7 : b.neck;
    const out = [];
    // silhouette
    out.push(`<path d="M${pt(N)} L${pt(SP)} L${pt(SO)} L${pt(SU)} L${pt(UA)} L${pt(H)} Q100,${hemY + 2} ${pt(mir(H))} L${pt(mir(UA))} L${pt(mir(SU))} L${pt(mir(SO))} L${pt(mir(SP))} L${pt(mir(N))} Q100,${fx(N[1] + neckD * 1.1)} ${pt(N)} Z" ${OUT}/>`);
    // armhole (drop shoulder) seams
    out.push(both((m) => `<path d="M${pt(m(SP))} Q${pt(m([SP[0] + 11, (SP[1] + UA[1]) / 2]))} ${pt(m(UA))}" ${SEAM}/>`));
    // neck rib: the band between the opening and the seam
    if (!b.hood) {
      const a = [N[0] + 5, N[1] - 1.5];
      if (back) {
        out.push(`<path d="M${pt(N)} Q100,${N[1] + 16} ${pt(mir(N))}" ${SEAM}/><path d="M${pt([N[0] + 2, N[1] + 3.2])} Q100,${N[1] + 19} ${pt([198 - N[0], N[1] + 3.2])}" ${STITCH}/>`);
      } else {
        out.push(`<path d="M${pt(a)} Q100,${N[1] + 4} ${pt(mir(a))}" ${SEAM}/>`);
        out.push(`<path d="M${pt(a)} Q100,${fx(N[1] + neckD * 0.62)} ${pt(mir(a))}" ${SEAM}/>`);
        out.push(`<path d="M${pt([N[0] - 2, N[1] + 1.5])} Q100,${fx(N[1] + neckD * 1.1 + 6)} ${pt([202 - N[0], N[1] + 1.5])}" ${STITCH}/>`);
      }
    }
    // sleeve ends
    const band = (d) => [along(SO, SP, d), along(SU, UA, d)];
    if (b.rib) {
      const [p, q] = band(14);
      out.push(both((m) => {
        let r = `<path d="M${pt(m(p))} L${pt(m(q))}" ${SEAM}/>`;
        for (let i = 1; i < 8; i += 1) r += `<path d="M${pt(m(lerp(SO, SU, i / 8)))} L${pt(m(lerp(p, q, i / 8)))}" ${RIB}/>`;
        return r;
      }));
    } else {
      out.push(both((m) => [4, 6.5].map((d) => { const [p, q] = band(d); return `<path d="M${pt(m(p))} L${pt(m(q))}" ${STITCH}/>`; }).join('')));
    }
    // bottom
    if (b.rib) {
      let r = `<path d="M${H[0]},${hemY - 15} L${200 - H[0]},${hemY - 15}" ${SEAM}/>`;
      for (let x = H[0] + 5; x < 200 - H[0]; x += 5) r += `<path d="M${x},${hemY - 14.5} L${x},${hemY + 0.6}" ${RIB}/>`;
      out.push(r);
    } else {
      out.push([5, 7.5].map((d) => `<path d="M${H[0]},${hemY - d} Q100,${hemY - d + 2} ${200 - H[0]},${hemY - d}" ${STITCH}/>`).join(''));
    }
    // hood, drawcords and pocket
    if (b.hood) {
      if (back) {
        out.push(`<path d="M${pt(N)} C56,-4 144,-4 ${pt(mir(N))} Q100,${N[1] + 12} ${pt(N)} Z" ${OUT}/><path d="M100,3 Q101.5,22 100,${N[1] + 5}" ${SEAM}/><path d="M${N[0] + 4},${N[1] + 1} Q100,${N[1] + 8} ${196 - N[0]},${N[1] + 1}" ${STITCH}/>`);
      } else {
        out.push(`<path d="M${pt(N)} C58,0 142,0 ${pt(mir(N))} Q118,${N[1] + 26} 100,${N[1] + 34} Q82,${N[1] + 26} ${pt(N)} Z" ${OUT}/>`);
        out.push(`<path d="M78,${N[1] + 2} C80,10 120,10 122,${N[1] + 2} Q112,${N[1] + 20} 100,${N[1] + 26} Q88,${N[1] + 20} 78,${N[1] + 2} Z" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`);
        out.push(`<path d="M74,${N[1]} C76,6 124,6 126,${N[1]}" ${STITCH}/>`);
        if (spec.drawcord !== false) {
          out.push(`<path d="M90,${N[1] + 19} L88,${N[1] + 76} M110,${N[1] + 19} L112,${N[1] + 76}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`);
          out.push(`<circle cx="90" cy="${N[1] + 19}" r="1.7" ${OUT}/><circle cx="110" cy="${N[1] + 19}" r="1.7" ${OUT}/><rect x="86.2" y="${N[1] + 75}" width="3.6" height="8" rx="1" ${OUT}/><rect x="110.2" y="${N[1] + 75}" width="3.6" height="8" rx="1" ${OUT}/>`);
        }
        const top = hemY - 76; const bot = hemY - 15;
        out.push(`<path d="M70,${top} L130,${top} L150,${bot} L50,${bot} Z" ${OUT}/><path d="M72,${top + 3} L128,${top + 3} M70.6,${top + 3} L54,${bot} M129.4,${top + 3} L146,${bot}" ${STITCH}/>`);
      }
    }
    // artwork, in ink
    const p = (name, x, y, w) => `<g transform="translate(${x} ${y}) scale(${w / 100})">${(PRINTS[name] || PRINTS.wordmark)(INK, PAPER, `sk${uid}`, spec)}</g>`;
    if (back) {
      if (spec.backPrint) out.push(p(spec.backPrint, 100, N[1] + 70, 74));
      else if (spec.quote) out.push(quoteLettering(spec, 110, N[1] + (b.hood ? 30 : 38), INK, PAPER));
    } else if (spec.chest) {
      const cp = spec.chestPrint || 'kmark';
      out.push(`<g transform="translate(126 ${N[1] + 34}) scale(${cp === 'kmark' ? 0.2 : 0.17})">${(PRINTS[cp] || PRINTS.kmark)(INK, PAPER)}</g>`);
    } else if (spec.print) {
      out.push(p(spec.print, 100, N[1] + (b.hood ? 58 : 66), b.hood ? 64 : 70));
    }
    if (!back && spec.sleevePrint) out.push(`<text transform="translate(176 120) rotate(82)" text-anchor="middle" font-family="${SANS}" font-size="5.5" letter-spacing="1.8" fill="${INK}">${esc(spec.sleevePrint)}</text>`);
    return out.join('');
  }

  /* Points of measure and the zoomed construction details per block. */
  const DETAILS = {
    tee: [['front', [78, 24], '1x1 rib neck'], ['back', [38, 38], 'Drop shoulder'], ['front', [16, 92], 'Twin needle sleeve hem'], ['back', [48, 210], 'Twin needle bottom hem']],
    longsleeve: [['front', [78, 22], '1x1 rib neck'], ['back', [38, 38], 'Drop shoulder'], ['front', [19, 200], 'Twin needle cuff'], ['back', [48, 210], 'Twin needle bottom hem']],
    crew: [['front', [78, 22], '1x1 rib neck'], ['back', [38, 38], 'Drop shoulder'], ['front', [19, 197], '1x1 rib cuff'], ['back', [48, 214], '1x1 rib waistband']],
    hoodie: [['front', [80, 40], 'Lined hood'], ['front', [94, 112], 'Drawcord + aglets'], ['front', [56, 170], 'Kangaroo pocket'], ['back', [48, 218], '1x1 rib waistband']],
  };

  const quoteCentre = (spec) => { const b = BLOCKS[spec.type]; return [137, b.N[1] + (b.hood ? 30 : 38) + quoteBox(spec) / 2 - 3]; };
  function detailsFor(spec) {
    const details = DETAILS[spec.type].slice();
    if (spec.quote && !spec.backPrint) details[1] = ['back', quoteCentre(spec), spec.quoteFinish === 'stitch' ? 'Embroidered quote' : 'Hand-lettered quote', 1.35];
    if (spec.type === 'hoodie' && spec.drawcord === false) details[1] = ['front', [100, 52], 'Clean hood · no drawcord'];
    return details;
  }
  /** The schematic views a product gets, in carousel order. */
  function sketchViews(spec) {
    if (!BLOCKS[spec.type]) return ['sheet', 'flat'];
    return ['sheet', 'front', 'back', 'details'].concat(spec.quote && !spec.backPrint ? ['lettering'] : []);
  }
  const VIEW_NAMES = { sheet: 'Tech sheet', front: 'Front view', back: 'Back view', details: 'Construction details', lettering: 'Lettering detail', flat: 'Flat view' };

  function sketch(spec, colorway, opts = {}) {
    const id = `s${(uid += 1)}`;
    const c = { garment: '#141414', ...(colorway || {}) };
    const apparel = !!BLOCKS[spec.type];
    const parts = [];
    const S = 0.78; const Y = 46; const FX = 12; const BX = 188;
    const label = (x, y, t, anchor = 'middle', size = 6.4, fill = INK) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${SANS}" font-weight="600" font-size="${size}" letter-spacing="1.1" fill="${fill}">${esc(String(t).toUpperCase())}</text>`;
    const value = (x, y, t, size = 7.4) => `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}" letter-spacing=".5" fill="${INK}">${esc(String(t).toUpperCase())}</text>`;
    const arrow = (x1, y1, x2, y2, tag) => {
      const a = Math.atan2(y2 - y1, x2 - x1); const h = (x, y, d) => `M${fx(x)},${fx(y)} l${fx(Math.cos(a + d) * 4)},${fx(Math.sin(a + d) * 4)} M${fx(x)},${fx(y)} l${fx(Math.cos(a - d) * 4)},${fx(Math.sin(a - d) * 4)}`;
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
      return `<path d="M${fx(x1)},${fx(y1)} L${fx(x2)},${fx(y2)} ${h(x1, y1, 0.45)} ${h(x2, y2, Math.PI + 0.45)} ${h(x2, y2, Math.PI - 0.45)}" fill="none" stroke="${INK}" stroke-width=".6"/>
        <rect x="${fx(mx - 5)}" y="${fx(my - 5)}" width="10" height="10" fill="none"/><text x="${fx(mx)}" y="${fx(my + 2.6)}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="7.5" fill="${INK}">${tag}</text>`;
    };
    const view = opts.view || 'sheet';
    if (view !== 'sheet') {
      const out = [];
      const b = BLOCKS[spec.type];
      if (apparel && (view === 'front' || view === 'back')) {
        const k = 1.42; const ox = 180 - 100 * k; const oy = 50;
        const at = (p) => [ox + p[0] * k, oy + p[1] * k];
        out.push(`<g transform="translate(${fx(ox)} ${oy}) scale(${k})">${apparelFlat(spec.type, view, spec)}</g>`);
        if (view === 'front') {
          const a1 = at([b.H[0], b.H[1] + 8]); const a2 = at([200 - b.H[0], b.H[1] + 8]);
          out.push(arrow(a1[0] + 1, a1[1], a2[0] - 1, a2[1], 'A'));
          const s1 = at(b.SP); const s2 = at(b.SO); const nx = s2[1] - s1[1]; const ny = -(s2[0] - s1[0]); const nl = Math.hypot(nx, ny) || 1;
          out.push(arrow(s1[0] - nx / nl * 9, s1[1] - ny / nl * 9, s2[0] - nx / nl * 9, s2[1] - ny / nl * 9, 'C'));
        } else {
          const t = at([200 - b.H[0] + 10, b.N[1]]); const u = at([200 - b.H[0] + 10, b.H[1]]);
          out.push(arrow(t[0], t[1], u[0], u[1], 'B'));
        }
      } else if (apparel && view === 'details') {
        detailsFor(spec).forEach(([side, p, text, zoom], i) => {
          const cx = i % 2 ? 268 : 92; const cy = i < 2 ? 128 : 300; const R = 72;
          const body = apparelFlat(spec.type, side, spec);
          out.push(`<clipPath id="${id}d${i}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${R}" fill="none"/>
            <g clip-path="url(#${id}d${i})"><g transform="translate(${cx} ${cy}) scale(${fx((zoom ? zoom * 2.1 : 5.2) * 100) / 100}) translate(${fx(-p[0])} ${fx(-p[1])})">${body}</g></g>
            <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${INK}" stroke-width="1"/>
            <text x="${cx}" y="${cy + R + 14}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="7" letter-spacing="1.2" fill="${INK}">${i + 1}  ${esc(text.toUpperCase())}</text>`);
        });
      } else if (apparel && view === 'lettering') {
        const q = quoteCentre(spec); const R = 150;
        out.push(`<clipPath id="${id}q"><circle cx="180" cy="220" r="${R}"/></clipPath>
          <g clip-path="url(#${id}q)"><g transform="translate(180 220) scale(4.6) translate(${-q[0]} ${fx(-q[1])})">${apparelFlat(spec.type, 'back', spec)}</g></g>
          <circle cx="180" cy="220" r="${R}" fill="none" stroke="${INK}" stroke-width="1"/>
          ${label(180, 396, spec.quoteFinish === 'stitch' ? 'Satin-stitch embroidery · tonal thread' : 'Screen-printed hand lettering · one colour', 'middle', 6.6)}
          ${label(180, 410, 'Placement: right shoulder blade, 3 in below collar seam', 'middle', 5.6)}`);
      } else {
        const draw = garments[spec.type] || garments.tee; const k = 0.8;
        out.push(`<g transform="translate(${fx(180 - 200 * k)} 34) scale(${k})">${lineArt(draw(spec, { ...c, garment: BLANK, ink: INK, brim: undefined }, id))}</g>`);
      }
      out.push(label(16, 26, VIEW_NAMES[view] || view, 'start', 6.6), label(344, 26, 'Not to scale', 'end', 5.4));
      out.push(`<rect x="8" y="432" width="344" height="40" fill="none" stroke="${INK}" stroke-width=".8"/><path d="M80,432 L80,472 M262,432 L262,472" stroke="${INK}" stroke-width=".5"/>
        ${label(14, 444, 'Style no.', 'start', 5)}${value(14, 460, opts.code || '—')}
        ${label(86, 444, 'Description', 'start', 5)}${value(86, 460, String(opts.title || '').slice(0, 28), 6.8)}
        ${label(268, 444, 'View', 'start', 5)}${value(268, 460, String(VIEW_NAMES[view] || view).slice(0, 16), 6.4)}`);
      return `<svg class="k-mockup k-mockup--sketch" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">
        ${out.join('')}</svg>`;
    }
    let poms = [];
    if (apparel) {
      const b = BLOCKS[spec.type];
      const front = apparelFlat(spec.type, 'front', spec);
      const backV = apparelFlat(spec.type, 'back', spec);
      const g = (x, body) => `<g transform="translate(${x} ${Y}) scale(${S})">${body}</g>`;
      parts.push(g(FX, front), g(BX, backV));
      parts.push(label(FX + 100 * S, Y + 254 * S, 'Front'), label(BX + 100 * S, Y + 254 * S, 'Back'));
      // points of measure: A chest, B body length, C sleeve
      const at = (x0, p) => [x0 + p[0] * S, Y + p[1] * S];
      const ca = at(FX, [b.H[0], b.H[1] + 7]); const cb = at(FX, [200 - b.H[0], b.H[1] + 7]);
      parts.push(arrow(ca[0] + 1, ca[1], cb[0] - 1, cb[1], 'A'));
      const bt = at(BX, [200 - b.H[0] + 12, b.N[1]]); const bb = at(BX, [200 - b.H[0] + 12, b.H[1]]);
      parts.push(arrow(bt[0], bt[1], bb[0], bb[1], 'B'));
      const s1 = at(FX, b.SP); const s2 = at(FX, b.SO);
      const nx = (s2[1] - s1[1]); const ny = -(s2[0] - s1[0]); const nl = Math.hypot(nx, ny) || 1; const o = 7;
      parts.push(arrow(s1[0] - nx / nl * o, s1[1] - ny / nl * o, s2[0] - nx / nl * o, s2[1] - ny / nl * o, 'C'));
      poms = ['A Body width', 'B Body length (HPS)', `C ${b.long ? 'Sleeve length' : 'Sleeve length'}`];
      // zoomed construction details
      const R = 25; const CY = 292; const Z = 3;
      detailsFor(spec).forEach(([view, p, text, zoom], i) => {
        const cx = 50 + i * 86.7;
        const x0 = view === 'back' ? BX : FX;
        const body = view === 'back' ? backV : front;
        const [px, py] = at(x0, p);
        parts.push(`<path d="M${fx(px)},${fx(py)} L${fx(cx)},${CY - R}" fill="none" stroke="${INK}" stroke-width=".35" stroke-dasharray="1.5 1.5"/><circle cx="${fx(px)}" cy="${fx(py)}" r="1.4" fill="${INK}"/>`);
        parts.push(`<clipPath id="${id}c${i}"><circle cx="${cx}" cy="${CY}" r="${R}"/></clipPath>
          <circle cx="${cx}" cy="${CY}" r="${R}" fill="none"/>
          <g clip-path="url(#${id}c${i})"><g transform="translate(${fx(cx)} ${CY}) scale(${fx(S * (zoom || Z) * 100) / 100}) translate(${fx(-p[0])} ${fx(-p[1])})">${body}</g></g>
          <circle cx="${cx}" cy="${CY}" r="${R}" fill="none" stroke="${INK}" stroke-width=".8"/>`);
        const words = text.toUpperCase().split(' ');
        const l1 = []; const l2 = [];
        words.forEach((w) => ((l1.join(' ') + ' ' + w).trim().length <= 13 && !l2.length ? l1 : l2).push(w));
        parts.push(`<text x="${cx}" y="${CY + R + 10}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="5.6" letter-spacing=".9" fill="${INK}">${esc(l1.join(' '))}</text>`);
        if (l2.length) parts.push(`<text x="${cx}" y="${CY + R + 17}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="5.6" letter-spacing=".9" fill="${INK}">${esc(l2.join(' '))}</text>`);
      });
    } else {
      // everything else: the product mockup, redrawn as line art
      const draw = garments[spec.type] || garments.tee;
      const k = 0.6;
      parts.push(`<g transform="translate(${fx(180 - 200 * k)} 48) scale(${k})">${lineArt(draw(spec, { ...c, garment: BLANK, ink: INK, brim: undefined }, id))}</g>`);
      parts.push(label(180, 340, 'Flat'));
    }
    // spec block
    const T = 352; const ways = (opts.colorways && opts.colorways.length ? opts.colorways : [c]).slice(0, 4);
    const sizes = (opts.sizes || []).join(' – ') || 'One size';
    const notes = [].concat(...String(opts.detail || '').split('·').map((x) => x.trim()).filter(Boolean).map((x) => wrap(x, 34))).slice(0, 4);
    parts.push(`<g>
      <rect x="8" y="${T}" width="344" height="${472 - T}" fill="none" stroke="${INK}" stroke-width=".8"/>
      <path d="M8,${T + 24} L352,${T + 24} M8,${T + 74} L352,${T + 74} M70,${T} L70,${T + 24} M206,${T} L206,${T + 24} M300,${T} L300,${T + 24} M190,${T + 24} L190,${T + 120}" fill="none" stroke="${INK}" stroke-width=".5"/>
      ${label(14, T + 9, 'Style no.', 'start', 5)}${value(14, T + 19, opts.code || '—')}
      ${label(76, T + 9, 'Description', 'start', 5)}${value(76, T + 19, String(opts.title || '').slice(0, 28), 6.6)}
      ${label(212, T + 9, 'Category', 'start', 5)}${value(212, T + 19, String(opts.category || '').slice(0, 15), 6.6)}
      ${label(306, T + 9, 'Stage', 'start', 5)}${value(306, T + 19, 'Sample')}
      ${label(14, T + 35, 'Colourways', 'start', 5)}
      ${ways.map((w, i) => {
        const x = 14 + (i % 2) * 88; const y = T + 42 + Math.floor(i / 2) * 15; const on = w.name === c.name;
        return `<rect x="${x}" y="${y}" width="10" height="10" fill="${esc(w.garment || '#888')}" stroke="${INK}" stroke-width="${on ? 1.4 : 0.5}"/><text x="${x + 14}" y="${y + 8}" font-family="${SANS}" font-weight="${on ? 600 : 400}" font-size="6.6" letter-spacing=".5" fill="${INK}">${esc(String(w.name || '').toUpperCase().slice(0, 15))}</text>`;
      }).join('')}
      ${label(196, T + 35, 'Size range', 'start', 5)}${value(196, T + 47, sizes, 7)}
      ${label(196, T + 60, 'View', 'start', 5)}${value(196, T + 70, apparel ? 'Front · Back' : 'Flat', 7)}
      ${label(14, T + 85, 'Notes', 'start', 5)}
      ${notes.map((n, i) => value(14, T + 94 + i * 7.6, n.slice(0, 36), 5.8)).join('')}
      ${label(196, T + 85, apparel ? 'Points of measure' : 'Construction', 'start', 5)}
      ${(apparel ? poms : ['Per factory sample']).map((n, i) => value(196, T + 96 + i * 9, n, 6.2)).join('')}
    </g>`);
    return `<svg class="k-mockup k-mockup--sketch" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">
      ${parts.join('')}</svg>`;
  }

  window.KioskMockup = { render, sketchViews, viewNames: VIEW_NAMES, types: Object.keys(garments), prints: Object.keys(PRINTS) };
})();
