#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const FILES = [
  'carousel-template.html',
  'collections/t-shirts.html',
  'collections/hoodies.html',
  'collections/chains.html',
  'collections/bracelets.html',
];

const ROOT = path.join(__dirname, '..');

function patch(content) {
  let next = content;

  next = next.replace(
    /html, body \{[\s\S]*?-webkit-overflow-scrolling: auto;\s*\}/,
    `html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      height: 100svh;
      overflow: hidden;
      position: fixed;
      inset: 0;
      touch-action: none;
      font-family: 'Generalsans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      transition: background-color 0.3s ease, color 0.3s ease;
      overscroll-behavior: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }`
  );

  next = next.replace(
    /transition: background-color 0.3s ease, color 0.3s ease;      height: 100svh;/,
    'transition: background-color 0.3s ease, color 0.3s ease;\n      height: 100svh;'
  );

  next = next.replace(
    /\[carousel="wrap"\] \{[\s\S]*?margin-right: auto;\s*\}/,
    (match) => match.replace(
      'overflow: visible; /* Allow 3D items to extend beyond bounds */',
      'overflow: visible;\n      z-index: 1;\n      pointer-events: none;'
    )
  );

  next = next.replace(
    /\.swiper-slide \{\s*display: flex;\s*flex-direction: column;\s*justify-content: flex-end;\s*padding-bottom: 6rem;\s*align-items: center;\s*text-align: center;\s*padding: 1.5rem 2rem;/,
    `.swiper-slide {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      text-align: center;
      padding: 1.5rem 2rem 6rem;`
  );

  // Remove fixed-height swiper overrides in breakpoints
  next = next.replace(
    /@media screen and \(max-width: 991px\) \{\s*\.swiper \{\s*height: 150px;\s*max-height: 150px;\s*margin-bottom: 0.75rem;\s*\}\s*/,
    '@media screen and (max-width: 991px) {\n      '
  );

  next = next.replace(
    /@media screen and \(max-width: 767px\) \{\s*\.swiper \{\s*height: 130px;\s*max-height: 130px;\s*margin-bottom: 0.75rem;\s*\}\s*/,
    '@media screen and (max-width: 767px) {\n      '
  );

  next = next.replace(
    /@media screen and \(max-width: 479px\) \{\s*\.swiper \{\s*height: 120px;\s*max-height: 120px;\s*margin-bottom: 0.5rem;\s*\}\s*/,
    '@media screen and (max-width: 479px) {\n      '
  );

  return next;
}

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = patch(original);
  fs.writeFileSync(filePath, updated);
  console.log(updated === original ? `No cleanup for ${file}` : `Cleaned ${file}`);
}
