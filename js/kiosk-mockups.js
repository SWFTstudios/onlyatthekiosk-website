/**
 * KIOSK — product mockups
 * Vector flat-lay mockups for the shop: garments, headwear, skate,
 * accessories and the physical "containers" for digital goods
 * (cassette = mix, VHS = film, box = LUT pack).
 *
 *   KioskMockup.render({ type: 'hoodie', print: 'arch', label, sub, swatches },
 *                      { garment: '#141414', ink: '#f2f0eb' })
 *
 * Returns an inline SVG string (viewBox 0 0 400 480). Real product
 * photography always wins: set `image` on a product to replace this.
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

  /* ------------------------------------------------------------- prints
   * Each print is drawn on a 100-unit-wide canvas centred on (0,0) and
   * scaled into place by the garment.                                    */
  const PRINTS = {
    wordmark: (ink) => `
      <text x="0" y="-14" text-anchor="middle" font-family="${SANS}" font-size="6.2" letter-spacing="2.6" fill="${ink}" opacity=".8">ONLY AT THE</text>
      <text x="0" y="12" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="31" letter-spacing="-1.6" fill="${ink}">KIOSK</text>`,

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

    checker: (ink, bg) => {
      let squares = '';
      for (let r = 0; r < 3; r += 1) for (let c = 0; c < 10; c += 1) if ((r + c) % 2 === 0) squares += `<rect x="${-50 + c * 10}" y="${-26 + r * 10}" width="10" height="10" fill="${ink}"/>`;
      return `${squares}<text x="0" y="22" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="15" letter-spacing="3" fill="${ink}">KIOSK</text>`;
    },
  };

  const print = (name, ink, bg, x, y, w, id) => {
    const fn = PRINTS[name] || PRINTS.wordmark;
    return `<g transform="translate(${x} ${y}) scale(${w / 100})">${fn(ink, bg, id)}</g>`;
  };

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
      return `${shadow(id, 200, 452, 140, 14)}
        <path d="${TEE}" fill="${c.garment}"/>
        <path d="M128,210 Q142,320 126,430" stroke="${fold(c.garment)}" stroke-width="16" fill="none"/>
        <path d="M262,200 Q276,320 262,432" stroke="${fold(c.garment)}" stroke-width="12" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 205, spec.printW || 120, id)}
        ${shade(id, TEE)}
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.28)"/>
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
        ${print(spec.print, c.ink, c.garment, 200, 205, spec.printW || 118, id)}
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
        ${print(spec.print, c.ink, c.garment, 200, 210, spec.printW || 120, id)}
        ${shade(id, LONG)}
        <path d="M92,410 L308,410 L308,438 Q200,450 92,438 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M30,398 L72,405 L70,428 L28,420 Z M370,398 L328,405 L330,428 L372,420 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M164,60 Q200,72 236,60 Q200,86 164,60 Z" fill="rgba(0,0,0,.3)"/>
        <path d="M156,58 Q200,100 244,58" stroke="${s}" stroke-width="9" fill="none" opacity=".35"/>
        <path d="M96,76 Q108,120 94,200 M304,76 Q292,120 306,200" stroke="${s}" stroke-width="1.2" fill="none"/>`;
    },

    hoodie(spec, c, id) {
      const s = seam(c.garment);
      const hood = 'M142,76 Q134,12 200,6 Q266,12 258,76 Z';
      const opening = 'M160,70 Q162,26 200,22 Q238,26 240,70 Q222,100 200,102 Q178,100 160,70 Z';
      const string = lum(c.garment) < 0.35 ? '#e9e6df' : '#1a1a1a';
      return `${shadow(id, 200, 452, 172, 14)}
        <path d="${hood}" fill="${c.garment}"/>${shade(id, hood)}
        <path d="${HOOD_BODY}" fill="${c.garment}"/>
        <path d="M130,230 Q144,320 128,404" stroke="${fold(c.garment)}" stroke-width="18" fill="none"/>
        ${print(spec.print, c.ink, c.garment, 200, 236, spec.printW || 108, id)}
        <path d="M128,326 L272,326 L294,404 L106,404 Z" fill="rgba(0,0,0,.05)"/>
        ${shade(id, HOOD_BODY)}
        <path d="M128,326 L272,326 M128,326 Q112,360 106,404 M272,326 Q288,360 294,404" stroke="${s}" stroke-width="1.4" fill="none"/>
        <path d="M90,410 L310,410 L310,438 Q200,450 90,438 Z" fill="rgba(0,0,0,.08)"/>
        <path d="M28,398 L70,405 L68,428 L26,420 Z M372,398 L330,405 L332,428 L374,420 Z" fill="rgba(0,0,0,.08)"/>
        <path d="${opening}" fill="rgba(0,0,0,.42)"/>
        <path d="${opening}" stroke="${s}" stroke-width="3" fill="none"/>
        <path d="M188,100 L184,176 M212,100 L216,178" stroke="${string}" stroke-width="3" stroke-linecap="round"/>
        <rect x="181" y="174" width="6" height="12" rx="2" fill="${string}"/><rect x="213" y="176" width="6" height="12" rx="2" fill="${string}"/>
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
        ${print(spec.print, c.ink, c.garment, 200, 312, spec.printW || 130, id)}
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
          <text transform="translate(224 240) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-weight="600" font-size="34" letter-spacing="-1" fill="${c.ink}">KIOSK</text>`;
      } else {
        graphic = `<text transform="translate(232 240) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-weight="600" font-size="58" letter-spacing="-2" fill="${c.ink}">${esc(spec.deckText || 'KIOSK')}</text>
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
        ${sticker(250, 230, 9, `<rect x="-92" y="-38" width="184" height="76" rx="18" fill="#fff"/><rect x="-84" y="-30" width="168" height="60" rx="12" fill="${c.garment}"/><text y="12" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="34" letter-spacing="-1.4" fill="${c.ink}">KIOSK</text>`)}
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

  function render(spec, colorway) {
    const id = `m${(uid += 1)}`;
    const c = { garment: '#141414', ink: '#f2f0eb', ...(colorway || {}) };
    const draw = garments[spec.type] || garments.tee;
    return `<svg class="k-mockup" viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">${defs(id, c.garment)}${draw(spec, c, id)}</svg>`;
  }

  window.KioskMockup = { render, types: Object.keys(garments), prints: Object.keys(PRINTS) };
})();
