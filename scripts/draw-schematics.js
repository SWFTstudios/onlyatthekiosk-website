// Draws the Garage spec-sheet schematics: side-elevation line drawings of each
// machine, laid out on its published wheelbase, wheel sizes, length, height and
// seat height. One SVG per machine in images/schematics/<id>.svg.
// Lines use currentColor so the story page can tint them for day/night.
// Usage: node scripts/draw-schematics.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'images', 'schematics');
const W = 1200;
const H = 640;
const FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const r1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y) => `${r1(x)} ${r1(y)}`;

/* ---------------------------------------------------------- parts */

// Wheel: tyre, rim, hub and spokes. `wire` draws laced spokes; `disc` a brake rotor.
function wheel(cx, cy, r, { rim, spokes = 10, wire = false, disc = 0, caliper = 0 } = {}) {
  const out = [
    `<circle class="sx-m" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}"/>`,
    `<circle class="sx-d" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r - 4)}"/>`,
    `<circle class="sx-d" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rim)}"/>`,
    `<circle class="sx-f" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rim - 4)}"/>`,
  ];
  if (disc) out.push(`<circle class="sx-f" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(disc)}"/>`, `<circle class="sx-f" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(disc - 9)}"/>`);
  const hub = wire ? rim * 0.2 : rim * 0.18;
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    if (wire) {
      // laced: each spoke leaves the hub flange tangentially
      const b = a + 0.35 * (i % 2 ? 1 : -1);
      out.push(`<line class="sx-f" x1="${r1(cx + Math.cos(a) * hub)}" y1="${r1(cy + Math.sin(a) * hub)}" x2="${r1(cx + Math.cos(b) * (rim - 4))}" y2="${r1(cy + Math.sin(b) * (rim - 4))}"/>`);
    } else {
      const s = 0.07;
      out.push(`<path class="sx-d" d="M ${pt(cx + Math.cos(a - s * 2) * hub, cy + Math.sin(a - s * 2) * hub)} L ${pt(cx + Math.cos(a - s * 0.5) * (rim - 4), cy + Math.sin(a - s * 0.5) * (rim - 4))} M ${pt(cx + Math.cos(a + s * 2) * hub, cy + Math.sin(a + s * 2) * hub)} L ${pt(cx + Math.cos(a + s * 0.5) * (rim - 4), cy + Math.sin(a + s * 0.5) * (rim - 4))}"/>`);
    }
  }
  out.push(`<circle class="sx-d" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(hub)}"/>`, `<circle class="sx-f" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(hub * 0.4)}"/>`);
  if (caliper) {
    // caliper sits on the trailing upper edge of the rotor (vehicles face left)
    const a0 = -Math.PI / 2 + 0.25;
    const a1 = a0 + 0.75;
    const ro = caliper + 6;
    const ri = caliper - 10;
    out.push(`<path class="sx-d" d="M ${pt(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri)} L ${pt(cx + Math.cos(a0) * ro, cy + Math.sin(a0) * ro)} A ${ro} ${ro} 0 0 1 ${pt(cx + Math.cos(a1) * ro, cy + Math.sin(a1) * ro)} L ${pt(cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri)} A ${ri} ${ri} 0 0 0 ${pt(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri)} Z"/>`);
  }
  // centre mark
  out.push(`<path class="sx-c" d="M ${pt(cx - r - 10, cy)} L ${pt(cx + r + 10, cy)} M ${pt(cx, cy - r - 10)} L ${pt(cx, cy + r + 10)}"/>`);
  return out.join('');
}

// Fork or strut drawn as a tube between two points, `w` wide.
function tube(x1, y1, x2, y2, w) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  return `<path class="sx-d" d="M ${pt(x1 + nx, y1 + ny)} L ${pt(x2 + nx, y2 + ny)} L ${pt(x2 - nx, y2 - ny)} L ${pt(x1 - nx, y1 - ny)} Z"/>`;
}

// Point `t` of the way from (x1,y1) to (x2,y2).
const along = (x1, y1, x2, y2, t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];

const arrow = (x, y, dir) => {
  // dir: 'l' | 'r' | 'u' | 'd'
  const s = 7;
  const w = 2.6;
  const m = { l: [s, w, s, -w], r: [-s, w, -s, -w], u: [w, s, -w, s], d: [w, -s, -w, -s] }[dir];
  return `<path class="sx-a" d="M ${pt(x, y)} L ${pt(x + m[0], y + m[1])} L ${pt(x + m[2], y + m[3])} Z"/>`;
};

// Horizontal dimension at height `y`, extension lines dropping from `from`.
function dimH(x1, x2, y, label, sub, from = []) {
  const ext = from.map(([x, fy]) => `<line class="sx-x" x1="${r1(x)}" y1="${r1(fy + 6)}" x2="${r1(x)}" y2="${r1(y + 8)}"/>`).join('');
  const mid = (x1 + x2) / 2;
  const tw = (label.length + (sub ? sub.length + 3 : 0)) * 7.6 + 18;
  return `${ext}<line class="sx-x" x1="${r1(x1)}" y1="${r1(y)}" x2="${r1(mid - tw / 2)}" y2="${r1(y)}"/><line class="sx-x" x1="${r1(mid + tw / 2)}" y1="${r1(y)}" x2="${r1(x2)}" y2="${r1(y)}"/>${arrow(x1, y, 'l')}${arrow(x2, y, 'r')}<text class="sx-t" x="${r1(mid)}" y="${r1(y + 4.5)}" text-anchor="middle">${label}${sub ? `<tspan class="sx-ts"> · ${sub}</tspan>` : ''}</text>`;
}

// Vertical dimension at `x` from the ground up to `y1`; `from` is the point it measures.
function dimV(x, y1, y2, label, sub, from) {
  const ext = from ? `<line class="sx-x" x1="${r1(from[0] + 6)}" y1="${r1(from[1])}" x2="${r1(x + 8)}" y2="${r1(from[1])}"/>` : '';
  const mid = (y1 + y2) / 2;
  return `${ext}<line class="sx-x" x1="${r1(x)}" y1="${r1(y1)}" x2="${r1(x)}" y2="${r1(mid - 34)}"/><line class="sx-x" x1="${r1(x)}" y1="${r1(mid + 34)}" x2="${r1(x)}" y2="${r1(y2)}"/>${arrow(x, y1, 'u')}${arrow(x, y2, 'd')}<text class="sx-t" x="${r1(x)}" y="${r1(mid - 4)}" text-anchor="middle">${label}</text>${sub ? `<text class="sx-ts" x="${r1(x)}" y="${r1(mid + 12)}" text-anchor="middle">${sub}</text>` : ''}`;
}

function titleBlock({ name, sub, sheet }) {
  const x = 812;
  const y = 586;
  return `<g class="sx-tb">
    <rect class="sx-d" x="${x}" y="${y}" width="364" height="44"/>
    <line class="sx-f" x1="${x + 262}" y1="${y}" x2="${x + 262}" y2="${y + 44}"/>
    <text class="sx-t sx-tn" x="${x + 12}" y="${y + 19}">${name}</text>
    <text class="sx-ts" x="${x + 12}" y="${y + 35}">${sub}</text>
    <text class="sx-ts" x="${x + 274}" y="${y + 19}">KIOSK GARAGE</text>
    <text class="sx-ts" x="${x + 274}" y="${y + 35}">${sheet}</text>
  </g>`;
}

function doc(id, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
<title id="${id}-t">${title}</title>
<desc id="${id}-d">${desc}</desc>
<style>
.sx-m{stroke-width:2.4}.sx-d{stroke-width:1.4}.sx-f{stroke-width:.9;opacity:.75}
.sx-c{stroke-width:.8;stroke-dasharray:14 4 3 4;opacity:.5}.sx-x{stroke-width:.8;opacity:.7}.sx-a{fill:currentColor;stroke:none;opacity:.8}
.sx-o{fill:var(--sx-paper,#fbfaf8)}.sx-n{stroke:none}.sx-g{stroke-width:1.2;opacity:.55}.sx-h{stroke-width:.6;opacity:.35}
.sx-t{fill:currentColor;stroke:none;font:600 13px/1 ${FONT};letter-spacing:.04em}.sx-ts{fill:currentColor;stroke:none;font:500 11px/1 ${FONT};letter-spacing:.06em;opacity:.7}
.sx-tn{font-size:14px}
</style>
${body}
</svg>
`;
}

const ground = (x1, x2, y) => `<line class="sx-g" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>${Array.from({ length: Math.floor((x2 - x1) / 18) }, (_, i) => `<line class="sx-h" x1="${x1 + 8 + i * 18}" y1="${y + 2}" x2="${x1 + i * 18}" y2="${y + 10}"/>`).join('')}`;

const mmIn = (mm) => `${(mm / 25.4).toFixed(1)} in`;

/* ---------------------------------------------------------- machines */

const MACHINES = {};

/* Infiniti Q50 (V37) — 1 px = 5 mm. Faces left. */
MACHINES['infiniti-q50'] = () => {
  const G = 440;
  const fx = 313;
  const rx = 883;            // wheelbase 2850 mm
  const r = 68;              // 245/40R19 ≈ 680 mm
  const cy = G - r;
  const body = `
  <path class="sx-m" d="M 152 410 C 134 408 123 398 121 382 L 120 338 C 120 326 126 316 140 312 C 230 296 340 280 478 258 C 560 206 600 172 640 157 C 700 146 790 146 840 156 C 900 170 950 205 985 238 C 1020 240 1050 241 1068 244 C 1076 248 1080 256 1081 266 L 1083 330 C 1083 360 1078 392 1062 406 L 949 410 A 76 76 0 1 0 817 410 L 379 410 A 76 76 0 1 0 247 410 Z"/>
  <path class="sx-d" d="M 506 262 C 570 214 612 186 652 171 C 712 161 790 161 830 169 C 882 182 928 220 950 246 C 938 251 918 253 898 253 L 506 262 Z"/>
  <path class="sx-d" d="M 701 164 L 708 258 M 717 164 L 723 257"/>
  <path class="sx-d" d="M 492 262 C 484 250 496 240 516 242 L 528 258 Z"/>
  <path class="sx-f" d="M 196 324 C 420 292 760 274 1080 266"/>
  <path class="sx-f" d="M 222 356 C 250 316 360 302 410 340"/>
  <path class="sx-f" d="M 790 340 C 830 318 930 316 966 346"/>
  <path class="sx-f" d="M 386 394 L 812 394"/>
  <path class="sx-d" d="M 494 268 L 492 402 M 714 262 L 714 402 M 868 254 C 868 300 846 330 826 346"/>
  <path class="sx-d" d="M 606 284 L 642 283 M 796 280 L 830 279"/>
  <path class="sx-d" d="M 128 322 C 160 312 205 305 246 302 C 236 318 204 330 172 336 C 150 338 134 334 128 322 Z"/>
  <path class="sx-f" d="M 122 370 C 142 368 164 372 176 384"/>
  <path class="sx-d" d="M 1036 250 C 1058 250 1074 255 1080 265 L 1081 290 C 1064 290 1048 284 1036 274 Z"/>
  <path class="sx-f" d="M 1082 334 C 1056 336 1000 338 962 342"/>
  <path class="sx-d" d="M 1022 404 L 1060 404 L 1060 410 L 1022 410"/>
  <path class="sx-d" d="M 900 180 C 906 170 918 168 930 178"/>
  `;
  return {
    title: 'Infiniti Q50 — side elevation',
    desc: 'Line drawing of the Infiniti Q50 sports sedan in profile, with wheelbase, length and height dimensions.',
    body: `${ground(80, 1150, G)}${body}
    ${wheel(fx, cy, r, { rim: 48, spokes: 10, disc: 40, caliper: 40 })}
    ${wheel(rx, cy, r, { rim: 48, spokes: 10, disc: 38, caliper: 38 })}
    ${dimH(fx, rx, 482, 'WHEELBASE 2850', mmIn(2850), [[fx, cy + r], [rx, cy + r]])}
    ${dimH(120, 1083, 522, 'LENGTH 4816', mmIn(4816), [[120, 382], [1083, 330]])}
    ${dimV(1134, 147, G, '1453', mmIn(1453), [790, 147])}
    ${titleBlock({ name: 'INFINITI Q50 · V37', sub: '2014–2024 · SEDAN · MM', sheet: 'SHEET 01' })}`,
  };
};

/* Shared motorcycle sheet: 1 px = 2.78 mm unless the bike sets its own `k`. Faces left.
 * `parts` gets the wheel, fork and fender strings and returns the drawing in paint
 * order, back to front; filled panels (.sx-o) hide whatever sits behind them. */
function bike({ k = 0.36, G = 500, fx = 380, wb, fr, rr, rakeDeg, trail, top, seat, len, height, rimR, wire = false, frontDisc, rearDisc, frontSpokes = 10, rearSpokes = 10, fender = [215, 305], parts, name, sub, sheet }) {
  const rx = fx + wb * k;
  const rf = (fr / 2) * k;
  const rrp = (rr / 2) * k;
  const fcy = G - rf;
  const rcy = G - rrp;
  const t = Math.tan((rakeDeg * Math.PI) / 180);
  // fork runs from the front axle up along the rake to the top clamp at `top`
  const forkTop = [fx + (fcy - top) * t, top];
  const legH = (fcy - top) * 0.42;
  const fork = `${tube(fx, fcy, fx + legH * t, fcy - legH, 22)}${tube(fx + (legH - 6) * t, fcy - legH + 6, forkTop[0], forkTop[1], 14)}`;
  const fa = (d) => (d * Math.PI) / 180;
  const fp = (d, r) => pt(fx + Math.cos(fa(d)) * r, fcy + Math.sin(fa(d)) * r);
  const fenderPath = `<path class="sx-d sx-o" d="M ${fp(fender[0], rf + 5)} A ${r1(rf + 5)} ${r1(rf + 5)} 0 0 1 ${fp(fender[1], rf + 5)} L ${fp(fender[1], rf + 12)} A ${r1(rf + 12)} ${r1(rf + 12)} 0 0 0 ${fp(fender[0], rf + 12)} Z"/>`;
  const P = parts({
    fx, rx, rf, rrp, fcy, rcy, forkTop, t, G, k,
    rearWheel: wheel(rx, rcy, rrp, { rim: rimR.rear, spokes: rearSpokes, wire, disc: rearDisc }),
    frontWheel: wheel(fx, fcy, rf, { rim: rimR.front, spokes: frontSpokes, wire, disc: frontDisc, caliper: frontDisc }),
    fork,
    fender: fenderPath,
  });
  const seatY = G - seat * k;
  const topY = height ? G - height * k : 0;
  const frontEdge = fx - rf;
  const lenEnd = len ? frontEdge + len * k : 0;
  // steering axis: meets the ground `trail` ahead of the contact patch
  const sx0 = fx - trail * k;
  return {
    body: `${ground(80, 1150, G)}
    <line class="sx-c" x1="${r1(sx0 - 20 * t)}" y1="${G + 20}" x2="${r1(sx0 + (G - top + 50) * t)}" y2="${top - 50}"/>
    ${P.body}
    ${dimH(fx, rx, 538, `WHEELBASE ${wb}`, mmIn(wb), [[fx, G], [rx, G]])}
    ${len ? dimH(frontEdge, lenEnd, 572, `LENGTH ${len}`, mmIn(len), [[frontEdge, fcy], [lenEnd, P.tailY || rcy]]) : ''}
    ${height ? dimV(1120, topY, G, `${height}`, mmIn(height), P.topPt) : ''}
    ${dimV(height ? 1052 : 1100, seatY, G, `SEAT ${seat}`, mmIn(seat), P.seatPt)}
    <text class="sx-ts" x="${r1(sx0 + (G - top + 50) * t + 8)}" y="${top - 52}">${String(rakeDeg).replace('.7', '°40′').replace(/^(\d+)$/, '$1.0°')} RAKE · ${trail} TRAIL</text>
    ${titleBlock({ name, sub, sheet })}`,
  };
}

/* Yamaha YZF-R1M (2015–) */
MACHINES['yamaha-r1m'] = () => bike({
  wb: 1405, fr: 600, rr: 652, rakeDeg: 24, trail: 102, top: 160, seat: 861, len: 2055, height: 1166,
  rimR: { front: 76, rear: 76 }, frontDisc: 58, rearDisc: 40,
  name: 'YAMAHA YZF-R1M', sub: '2015– · 998 CC CROSSPLANE · MM', sheet: 'SHEET 02',
  parts: ({ rx, rcy, rearWheel, frontWheel, fork, fender }) => ({
    seatPt: [790, 194],
    topPt: [468, 84],
    tailY: 383,
    body: `
    ${rearWheel}
    <path class="sx-d sx-o" d="M 700 336 L ${rx - 2} ${rcy - 16} C ${rx + 12} ${rcy - 14} ${rx + 14} ${rcy + 12} ${rx + 2} ${rcy + 14} L 708 366 Z"/>
    <circle class="sx-d" cx="${rx}" cy="${rcy}" r="9"/>
    <circle class="sx-d sx-o" cx="708" cy="350" r="12"/>
    <path class="sx-d sx-o" d="M 724 432 L 806 400 C 816 397 822 408 814 414 L 738 450 C 728 454 718 442 724 432 Z"/>
    <path class="sx-f" d="M 742 436 L 806 408"/>
    ${frontWheel}${fork}${fender}
    <path class="sx-d sx-o" d="M 590 248 L 704 244 L 720 330 C 720 380 708 420 684 440 L 630 452 L 600 300 Z"/>
    <circle class="sx-d" cx="668" cy="384" r="30"/><circle class="sx-f" cx="668" cy="384" r="20"/>
    <path class="sx-f" d="M 640 268 L 700 264 M 636 290 L 708 286"/>
    ${tube(650, 250, 708, 350, 18)}
    <path class="sx-m sx-o" d="M 468 84 C 446 102 418 136 392 170 C 378 188 360 204 344 216 L 338 226 C 352 236 368 242 386 246 C 420 252 452 262 478 280 C 494 300 500 330 504 360 C 508 392 516 420 530 440 C 560 452 606 454 636 448 C 646 440 650 430 648 418 L 610 300 L 640 248 L 560 240 L 540 160 L 512 152 C 500 118 486 98 468 84 Z"/>
    <path class="sx-d" d="M 512 152 C 520 186 530 220 542 252"/>
    <path class="sx-d sx-o" d="M 352 222 C 370 214 396 212 420 218 C 410 230 386 236 364 234 Z"/>
    <path class="sx-d" d="M 410 238 C 444 244 472 256 492 272"/>
    <path class="sx-d sx-o" d="M 546 292 C 588 286 628 292 660 314 C 630 328 590 332 552 328 Z"/>
    <path class="sx-f" d="M 552 302 C 590 298 624 302 650 316"/>
    <path class="sx-f" d="M 528 372 C 560 368 590 370 620 380 M 536 400 C 566 396 600 398 630 408"/>
    <path class="sx-o sx-n" d="M 506 152 C 548 134 610 130 652 146 C 676 156 694 172 706 188 L 704 240 L 600 252 L 520 238 Z"/>
    <path class="sx-m" d="M 506 152 C 548 134 610 130 652 146 C 676 156 694 172 706 188"/>
    <path class="sx-d" d="M 520 238 L 640 250"/>
    <path class="sx-f" d="M 600 150 C 630 170 648 200 652 240"/>
    <path class="sx-o sx-n" d="M 706 188 L 790 194 C 806 195 818 189 832 181 C 872 160 912 140 950 127 L 944 140 C 904 168 862 198 822 222 L 760 232 L 702 240 Z"/>
    <path class="sx-m" d="M 706 188 L 790 194 C 806 195 818 189 832 181 C 872 160 912 140 950 127 L 944 140 C 904 168 862 198 822 222 L 760 232 L 704 240"/>
    <path class="sx-f" d="M 762 204 C 800 212 832 204 866 186"/>
    <path class="sx-d" d="M 924 144 L 940 136"/>
    <circle class="sx-d sx-o" cx="744" cy="302" r="5"/><path class="sx-d" d="M 740 304 L 714 316 M 748 300 L 772 292"/>
    `,
  }),
});

/* Yamaha YZF-R3 (2019–) */
MACHINES['yamaha-r3'] = () => bike({
  wb: 1380, fr: 586, rr: 628, rakeDeg: 25, trail: 94, top: 176, seat: 780, len: 2090, height: 1140,
  rimR: { front: 76, rear: 76 }, frontDisc: 54, rearDisc: 40,
  name: 'YAMAHA YZF-R3', sub: '2015– · 321 CC TWIN · MM', sheet: 'SHEET 03',
  parts: ({ rx, rcy, rearWheel, frontWheel, fork, fender }) => ({
    seatPt: [790, 220],
    topPt: [470, 92],
    tailY: 304,
    body: `
    ${rearWheel}
    <path class="sx-d sx-o" d="M 744 254 L 776 352 L 762 356 L 732 258 Z"/>
    <path class="sx-f" d="M 742 272 L 752 268 M 746 284 L 756 280 M 750 296 L 760 292 M 754 308 L 764 304 M 758 320 L 768 316 M 762 332 L 772 328"/>
    <path class="sx-d sx-o" d="M 696 348 L ${rx - 2} ${rcy - 14} C ${rx + 12} ${rcy - 12} ${rx + 14} ${rcy + 12} ${rx + 2} ${rcy + 13} L 708 372 Z"/>
    <circle class="sx-d" cx="${rx}" cy="${rcy}" r="9"/>
    <circle class="sx-d sx-o" cx="704" cy="360" r="11"/>
    <path class="sx-d sx-o" d="M 520 378 L 700 370 L 712 400 C 706 430 680 450 640 452 L 560 450 C 536 446 522 420 520 378 Z"/>
    <path class="sx-f" d="M 540 410 C 590 404 650 404 700 412"/>
    <path class="sx-d" d="M 514 336 C 512 390 522 440 560 460 L 664 460 C 676 458 684 452 690 446"/>
    <path class="sx-d sx-o" d="M 676 440 L 784 372 C 794 366 806 376 800 386 L 694 456 C 684 462 670 450 676 440 Z"/>
    <path class="sx-f" d="M 694 440 L 786 382"/>
    ${frontWheel}${fork}${fender}
    ${tube(670, 252, 702, 352, 16)}
    <path class="sx-m sx-o" d="M 470 92 C 450 110 424 140 400 172 C 386 190 370 206 356 220 L 352 230 C 366 242 384 250 402 254 C 432 260 462 270 482 286 C 496 306 502 336 506 366 C 512 384 520 396 530 404 L 600 410 C 620 396 636 370 646 344 L 676 252 L 600 252 L 560 248 L 540 168 L 512 160 C 500 126 488 106 470 92 Z"/>
    <path class="sx-d" d="M 512 160 C 520 196 528 230 538 262"/>
    <path class="sx-d sx-o" d="M 364 226 C 380 218 404 216 428 222 C 416 234 394 240 374 238 Z"/>
    <path class="sx-d" d="M 418 244 C 450 252 474 264 492 280"/>
    <path class="sx-d sx-o" d="M 548 300 C 584 294 616 300 640 318 C 618 330 584 334 552 330 Z"/>
    <path class="sx-f" d="M 536 370 C 566 364 596 366 624 376"/>
    <path class="sx-o sx-n" d="M 506 160 C 550 144 612 142 656 160 C 678 172 694 190 704 208 L 690 250 L 600 254 L 524 246 Z"/>
    <path class="sx-m" d="M 506 160 C 550 144 612 142 656 160 C 678 172 694 190 704 208"/>
    <path class="sx-d" d="M 524 246 L 676 252"/>
    <path class="sx-f" d="M 604 160 C 632 182 646 214 648 248"/>
    <path class="sx-d sx-o" d="M 896 220 C 926 250 956 266 988 272 L 990 282 C 956 278 924 260 890 230 Z"/>
    <path class="sx-d sx-o" d="M 986 266 L 1026 268 L 1024 304 L 984 302 Z"/>
    <path class="sx-d" d="M 950 254 L 966 244"/>
    <path class="sx-o sx-n" d="M 704 208 L 790 220 C 808 221 822 214 836 206 C 880 190 918 178 950 169 L 946 180 C 906 200 866 224 832 240 L 772 248 L 690 250 Z"/>
    <path class="sx-m" d="M 704 208 L 790 220 C 808 221 822 214 836 206 C 880 190 918 178 950 169 L 946 180 C 906 200 866 224 832 240 L 772 248 L 692 250"/>
    <path class="sx-f" d="M 770 232 C 806 238 840 230 872 214"/>
    <circle class="sx-d sx-o" cx="742" cy="318" r="5"/><path class="sx-d" d="M 738 320 L 712 330"/>
    `,
  }),
});

/* Honda CBR600F4i (2001–2006) — Honda's sheets give wheelbase and seat height, so length and height are left off. */
MACHINES['honda-cbr600f4i'] = () => bike({
  wb: 1385, fr: 600, rr: 630, rakeDeg: 24, trail: 96, top: 168, seat: 805,
  rimR: { front: 76, rear: 76 }, frontDisc: 54, rearDisc: 39, frontSpokes: 6, rearSpokes: 6,
  name: 'HONDA CBR600F4i', sub: '2001–2006 · 599 CC FOUR · MM', sheet: 'SHEET 04',
  parts: ({ rx, rcy, rearWheel, frontWheel, fork, fender }) => ({
    seatPt: [782, 210],
    body: `
    ${rearWheel}
    <path class="sx-d sx-o" d="M 698 342 L ${rx - 2} ${rcy - 15} C ${rx + 12} ${rcy - 13} ${rx + 14} ${rcy + 12} ${rx + 2} ${rcy + 13} L 706 368 Z"/>
    <circle class="sx-d" cx="${rx}" cy="${rcy}" r="9"/>
    <circle class="sx-d sx-o" cx="706" cy="354" r="12"/>
    <path class="sx-d" d="M 686 442 C 716 430 734 412 750 394"/>
    <path class="sx-d sx-o" d="M 738 384 L 846 314 C 858 308 872 318 864 330 L 758 404 C 748 410 732 396 738 384 Z"/>
    <path class="sx-f" d="M 756 384 L 850 322 M 764 396 L 856 334"/>
    ${frontWheel}${fork}${fender}
    ${tube(676, 250, 704, 348, 18)}
    <path class="sx-m sx-o" d="M 462 98 C 436 118 408 152 386 186 C 372 206 362 222 358 236 C 360 250 372 256 390 258 C 426 262 458 272 480 290 C 494 310 502 340 506 372 C 510 410 524 436 548 446 C 600 456 656 454 688 442 C 700 420 700 380 690 340 L 684 252 L 600 252 L 560 246 L 540 164 L 514 156 C 500 128 484 108 462 98 Z"/>
    <path class="sx-d" d="M 514 156 C 522 190 530 222 540 254"/>
    <path class="sx-d sx-o" d="M 366 222 C 376 208 404 204 428 212 C 424 228 404 240 382 240 C 370 238 364 230 366 222 Z"/>
    <path class="sx-f" d="M 396 208 C 398 220 396 232 390 240"/>
    <path class="sx-d" d="M 436 248 C 466 256 490 270 506 288"/>
    <path class="sx-d sx-o" d="M 548 290 C 590 284 630 290 664 312 C 640 330 592 336 554 330 Z"/>
    <path class="sx-f" d="M 562 300 L 572 326 M 580 296 L 590 328 M 598 294 L 608 330 M 616 296 L 626 330 M 634 300 L 644 326"/>
    <path class="sx-f" d="M 530 384 C 580 376 640 380 688 396 M 544 420 C 590 414 640 416 690 424"/>
    <path class="sx-o sx-n" d="M 508 156 C 552 140 614 138 656 156 C 680 168 696 184 706 198 L 694 250 L 600 254 L 520 242 Z"/>
    <path class="sx-m" d="M 508 156 C 552 140 614 138 656 156 C 680 168 696 184 706 198"/>
    <path class="sx-d" d="M 520 242 L 684 252"/>
    <path class="sx-f" d="M 604 156 C 634 178 650 212 652 248"/>
    <path class="sx-o sx-n" d="M 706 198 L 782 208 C 790 204 794 198 800 194 L 852 186 C 880 176 904 166 926 158 C 934 160 934 172 926 180 C 892 204 852 226 812 236 L 694 250 Z"/>
    <path class="sx-m" d="M 706 198 L 782 208 C 790 204 794 198 800 194 L 852 186 C 880 176 904 166 926 158 C 934 160 934 172 926 180 C 892 204 852 226 812 236 L 696 250"/>
    <path class="sx-d" d="M 800 194 L 806 210 L 782 208"/>
    <path class="sx-f" d="M 790 228 C 830 228 870 214 904 194"/>
    <path class="sx-d" d="M 908 178 L 922 172"/>
    <circle class="sx-d sx-o" cx="744" cy="304" r="5"/><path class="sx-d" d="M 740 306 L 714 318"/>
    `,
  }),
});

/* Honda Shadow 1100 — drawn as the VT1100C Shadow Spirit (1997–2007). 1 px = 3.13 mm. */
MACHINES['honda-shadow-1100'] = () => bike({
  k: 0.32, fx: 330, wb: 1651, fr: 663, rr: 653, rakeDeg: 32.7, trail: 152.5, top: 200, seat: 729, len: 2450, height: 1145,
  rimR: { front: 77, rear: 61 }, wire: true, frontSpokes: 40, rearSpokes: 40, frontDisc: 46, rearDisc: 0, fender: [200, 300],
  name: 'HONDA SHADOW 1100', sub: 'VT1100C SPIRIT · 1099 CC V-TWIN', sheet: 'SHEET 05',
  parts: ({ fx, rx, rcy, fcy, forkTop, t, rearWheel, frontWheel, fork, fender }) => {
    // 45° V-twin: crank at (C), each cylinder 22.5° either side of vertical
    const C = [622, 404];
    const cyl = (dir) => {
      const a = (22.5 * Math.PI) / 180;
      const ax = [Math.sin(a) * dir, -Math.cos(a)];
      const nx = [Math.cos(a), Math.sin(a) * dir];
      const at = (d, w) => pt(C[0] + ax[0] * d + nx[0] * w, C[1] + ax[1] * d + nx[1] * w);
      const fins = [52, 61, 70, 79, 88, 106, 114].map((d) => `M ${at(d, -30)} L ${at(d, 30)}`).join(' ');
      return `<path class="sx-m sx-o" d="M ${at(40, -24)} L ${at(96, -27)} L ${at(98, -31)} L ${at(122, -31)} L ${at(126, -25)} L ${at(132, -25)} L ${at(132, 25)} L ${at(126, 25)} L ${at(122, 31)} L ${at(98, 31)} L ${at(96, 27)} L ${at(40, 24)} Z"/>
      <path class="sx-f" d="${fins}"/><path class="sx-d" d="M ${at(98, -31)} L ${at(98, 31)} M ${at(122, -31)} L ${at(122, 31)}"/>`;
    };
    const hl = [forkTop[0] - 38, forkTop[1] + 34];
    return {
      seatPt: [716, 267],
      topPt: [470, 134],
      tailY: 352,
      body: `
      <path class="sx-d" d="M 470 222 L 560 252 L 720 262 M 452 252 L 532 438 L 690 446 L 712 392 L 720 262"/>
      ${rearWheel}
      <path class="sx-d sx-o" d="M 690 380 L ${rx - 4} ${rcy - 12} L ${rx + 4} ${rcy + 12} L 694 400 Z"/>
      <circle class="sx-d sx-o" cx="${rx}" cy="${rcy}" r="26"/><circle class="sx-f" cx="${rx}" cy="${rcy}" r="17"/>
      ${tube(782, 278, rx - 26, rcy - 34, 16)}
      <path class="sx-f" d="${Array.from({ length: 7 }, (_, i) => { const [x, y] = along(786, 284, rx - 28, rcy - 38, 0.12 + i * 0.1); return `M ${pt(x - 9, y + 4)} L ${pt(x + 9, y - 4)}`; }).join(' ')}"/>
      ${frontWheel}
      <circle class="sx-d sx-o" cx="${r1(hl[0])}" cy="${r1(hl[1])}" r="27"/><circle class="sx-f" cx="${r1(hl[0])}" cy="${r1(hl[1])}" r="19"/>
      <path class="sx-d" d="M ${pt(hl[0] - 27, hl[1])} L ${pt(hl[0] - 34, hl[1] - 2)}"/>
      ${fork}${fender}
      ${cyl(-1)}${cyl(1)}
      <path class="sx-m sx-o" d="M 566 392 C 562 420 576 444 604 448 L 692 446 C 710 440 718 420 716 396 L 704 372 L 654 388 L 590 388 Z"/>
      <circle class="sx-d" cx="${C[0]}" cy="${C[1] + 14}" r="20"/><circle class="sx-f" cx="${C[0]}" cy="${C[1] + 14}" r="12"/>
      <path class="sx-m sx-o" d="M 468 228 C 484 202 530 188 576 188 C 622 188 654 208 666 240 C 630 254 540 256 496 248 C 480 244 468 238 468 228 Z"/>
      <path class="sx-f" d="M 516 214 C 560 204 616 206 648 222"/>
      <path class="sx-d sx-o" d="M 580 228 C 592 222 608 222 618 228 C 608 236 592 236 580 228 Z"/>
      <path class="sx-m sx-o" d="M 664 240 C 680 262 704 268 744 266 C 770 264 786 252 806 244 C 830 236 860 238 878 252 L 884 268 C 846 272 800 280 760 288 L 680 292 L 666 262 Z"/>
      <path class="sx-m sx-o" d="M 796 262 C 860 244 940 252 988 292 C 1000 304 1008 324 1008 352 L 992 354 C 980 314 948 284 896 272 C 860 266 828 270 796 278 Z"/>
      <path class="sx-d sx-o" d="M 994 302 L 1010 306 L 1008 320 L 994 318 Z"/>
      <path class="sx-d sx-o" d="M 556 336 C 540 372 552 420 600 436 L 760 432 L 998 410 C 1012 410 1014 424 1000 426 L 760 448 L 596 452 C 534 436 520 384 544 330 Z"/>
      <path class="sx-d sx-o" d="M 690 326 C 712 360 740 390 790 396 L 996 384 C 1010 384 1012 398 998 400 L 790 412 C 732 410 698 380 676 338 Z"/>
      <path class="sx-f" d="M 820 392 L 830 410 M 860 390 L 870 408"/>
      <circle class="sx-d sx-o" cx="520" cy="420" r="6"/><path class="sx-d" d="M 520 420 L 556 412"/>
      <circle class="sx-d sx-o" cx="772" cy="404" r="5"/>
      <path class="sx-m" d="M ${pt(forkTop[0] - 4, forkTop[1] + 6)} L ${pt(forkTop[0] + 10, forkTop[1] - 18)} C ${pt(forkTop[0] + 20, forkTop[1] - 50)} ${pt(forkTop[0] + 40, forkTop[1] - 50)} ${pt(forkTop[0] + 70, forkTop[1] - 44)} L ${pt(forkTop[0] + 96, forkTop[1] - 34)}"/>
      <path class="sx-d" d="M ${pt(forkTop[0] + 78, forkTop[1] - 41)} L ${pt(forkTop[0] + 98, forkTop[1] - 33)}"/>
      <path class="sx-d" d="M ${pt(forkTop[0] + 14, forkTop[1] - 30)} L 470 140"/><path class="sx-d sx-o" d="M 458 136 C 462 128 476 128 482 136 C 478 142 464 142 458 136 Z"/>
      `,
    };
  },
});


/* ---------------------------------------------------------- write */

const META = {
  'infiniti-q50': 'Infiniti Q50',
  'yamaha-r1m': 'Yamaha YZF-R1M',
  'yamaha-r3': 'Yamaha YZF-R3',
  'honda-cbr600f4i': 'Honda CBR600F4i',
  'honda-shadow-1100': 'Honda Shadow 1100',
};

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
for (const [id, draw] of Object.entries(MACHINES)) {
  if (only && only !== id) continue;
  const d = draw();
  const title = d.title || `${META[id]} — side elevation`;
  const desc = d.desc || `Line drawing of the ${META[id]} in profile, with wheelbase, seat height and overall dimensions.`;
  fs.writeFileSync(path.join(OUT, `${id}.svg`), doc(id, title, desc, d.body));
  console.log(`images/schematics/${id}.svg`);
}
