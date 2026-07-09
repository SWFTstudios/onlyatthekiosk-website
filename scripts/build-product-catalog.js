#!/usr/bin/env node
/**
 * Generate data/product-catalog.json with premium copy for active products.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'product-catalog.json');

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const JEWELRY_NUMS = ['001', '002', '003', '004', '005', '006'];
const TOP_NUMS = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'];

const CHAIN_STYLES = [
  'Cuban Curb', 'Rope Twist', 'Figaro Link', 'Box Chain', 'Snake Chain', 'Paperclip',
];
const BRACELET_STYLES = [
  'Cuban Cuff', 'Rope Wrap', 'Figaro Flex', 'Box Bangle', 'Snake Coil', 'Paperclip Stack',
];

function jewelryCopy(type, num, material) {
  const styles = type === 'chain' ? CHAIN_STYLES : BRACELET_STYLES;
  const idx = parseInt(num, 10) - 1;
  const style = styles[idx] || styles[0];
  const isGold = material === 'gold';
  const materialLabel = isGold ? 'Gold Plated' : 'Stainless Steel';
  const finish = isGold
    ? 'warm mirror finish over a hypoallergenic stainless core'
    : 'brushed stainless finish with a cool, understated shine';

  return {
    tagline: `${style} — built for everyday elevation.`,
    material: isGold ? 'Gold-plated stainless steel' : '316L stainless steel',
    finish: materialLabel,
    weight: type === 'chain' ? 'Light to medium — layers without pulling' : 'Substantial but comfortable all-day wear',
    fit: type === 'chain' ? 'Sits clean on chest or over a tee' : 'Flexible cuff — secure without pinching',
    colors: materialLabel,
    styleNotes: `${style} profile. Street-to-studio versatile.`,
    wearSeason: 'Year-round. Layer in winter, solo in summer evenings.',
    descriptionHtml: `<p>${materialLabel} ${style.toLowerCase()} ${type} with a ${finish}. Layer it over a tee or wear solo — built for transit, nights out, and everything between.</p><p>Hypoallergenic core. ${isGold ? 'Water-resistant plating — wipe dry after sweat or rain.' : 'Tarnish-resistant — wipe with a soft cloth after wear.'}</p><p><em>Only at The Kiosk.</em></p>`,
    careHtml: `<ul><li>Avoid harsh chemicals, chlorine, and perfume directly on metal</li><li>Store dry in the included pouch</li><li>${isGold ? 'Re-plate annually for best shine' : 'Polish gently with a microfiber cloth'}</li></ul>`,
    deliveryHtml: '<p>Free EU shipping on qualifying orders. Standard 5–7 business days. Express 2–3 days.</p>',
    sizeGuideHtml: type === 'chain'
      ? '<p>Necklace lengths by size: XXS 40cm · XS 42cm · S 45cm · M 48cm · L 52cm · XL 55cm · XXL 58cm · 3XL 62cm</p>'
      : '<p>Wrist circumference: XXS 14cm · XS 15cm · S 16cm · M 17cm · L 18cm · XL 19cm · XXL 20cm · 3XL 21cm</p>',
  };
}

function topCopy(kind, num, color) {
  const isHoodie = kind === 'hoodie';
  const colorLabel = color === 'black' ? 'Black' : 'White';
  const gsm = isHoodie ? '280gsm brushed fleece' : '220gsm cotton-modal jersey';
  const fit = isHoodie ? 'Relaxed dropped shoulder — size down for closer line' : 'Easy relaxed fit — true to size';

  return {
    tagline: isHoodie ? 'Premium weight. Perfect drape.' : 'Essential cut. Premium hand-feel.',
    material: isHoodie ? `${gsm} cotton-modal blend` : `${gsm}`,
    finish: colorLabel,
    weight: isHoodie ? 'Substantial but breathable' : 'Light enough for warm evenings, substantial enough to hold shape',
    fit,
    colors: colorLabel,
    styleNotes: isHoodie ? 'Kangaroo pocket, ribbed cuffs, cozy loose silhouette' : 'Crew neck, clean hem, minimal branding',
    wearSeason: isHoodie ? 'Cool mornings, layered transit, evening chill' : 'Spring through fall solo; layer under hoodies in winter',
    descriptionHtml: `<p>Premium ${gsm}. Breathable enough for warm evenings, substantial enough to hold its drape. ${fit}.</p><p>${colorLabel} essential — pairs with chains, denim, or nothing but confidence.</p><p><em>Only at The Kiosk.</em></p>`,
    careHtml: '<ul><li>Machine wash cold, inside out</li><li>Hang dry — low heat tumble if needed</li><li>Do not bleach</li><li>Iron low on reverse if required</li></ul>',
    deliveryHtml: '<p>Free EU shipping on qualifying orders. Standard 5–7 business days.</p>',
    sizeGuideHtml: '<p>Relaxed fit — chest (cm): XXS 88 · XS 92 · S 96 · M 100 · L 104 · XL 108 · XXL 112 · 3XL 118</p>',
  };
}

function build() {
  const catalog = {};

  JEWELRY_NUMS.forEach((num, i) => {
    ['gold', 'silver'].forEach((mat) => {
      ['chain', 'bracelet'].forEach((type) => {
        const handle = `${num}-${mat}-${type}`;
        catalog[handle] = {
          handle,
          sizes: SIZES,
          ...jewelryCopy(type, num, mat),
        };
      });
    });
  });

  TOP_NUMS.forEach((num) => {
    ['black', 'white'].forEach((color) => {
      ['hoodie', 'tshirt'].forEach((kind) => {
        const handle = `${num}-${color}-${kind}`;
        catalog[handle] = {
          handle,
          sizes: SIZES,
          ...topCopy(kind, num, color),
        };
      });
    });
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');

  const jsOut = path.join(ROOT, 'js', 'product-catalog-data.js');
  fs.writeFileSync(jsOut, `window.PRODUCT_CATALOG = ${JSON.stringify(catalog)};\n`);

  console.log(`Wrote ${Object.keys(catalog).length} products to ${OUT}`);
}

build();
