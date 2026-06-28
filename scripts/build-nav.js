#!/usr/bin/env node
/**
 * Build KIOSK underlay navigation into all production pages.
 * Single source of truth: partials/underlay-nav.html + partials/nav-config.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PARTIAL_PATH = path.join(ROOT, 'partials', 'underlay-nav.html');
const CONFIG_PATH = path.join(ROOT, 'partials', 'nav-config.json');

const PAGES = [
  {
    file: 'index.html',
    base: '',
    mainClass: 'is-home',
    wrapStart: '<!-- SEO Copy -->',
    wrapEnd: '<div data-w-id="5844fa33',
  },
  {
    file: 'store.html',
    base: '',
    mainClass: 'is-interior',
    wrapStart: '<div data-w-id="20698eeb',
  },
  {
    file: 'about.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'media.html',
    base: '',
    mainClass: 'is-interior',
    wrapStart: '<div class="old-main"',
  },
  {
    file: 'shop-tshirts-hoodies.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'shop-bracelets-chains.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'contact.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'faq.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'shipping-returns.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'members.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'terms-conditions.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'privacy-cookies.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'do-not-sell.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'carousel-template.html',
    base: '',
    mainClass: 'is-interior',
    wrapStart: '<!-- Collection Title',
  },
  {
    file: 'kiosk-styleguide.html',
    base: '',
    mainClass: 'is-interior',
    transformMain: true,
  },
  {
    file: 'collections/t-shirts.html',
    base: '../',
    mainClass: 'is-interior',
    wrapStart: '<!-- Collection Title',
  },
  {
    file: 'collections/hoodies.html',
    base: '../',
    mainClass: 'is-interior',
    wrapStart: '<!-- Collection Title',
  },
  {
    file: 'collections/chains.html',
    base: '../',
    mainClass: 'is-interior',
    wrapStart: '<!-- Collection Title',
  },
  {
    file: 'collections/bracelets.html',
    base: '../',
    mainClass: 'is-interior',
    wrapStart: '<!-- Collection Title',
  },
];

const NAV_BEGIN = '<!-- NAV:BEGIN -->';
const NAV_END = '<!-- NAV:END -->';
const MAIN_BEGIN = '<!-- MAIN:BEGIN -->';
const MAIN_END = '<!-- MAIN:END -->';

const CONTENT_MARKERS = [
  '<!-- SEO Copy -->',
  '<!-- Collection Title',
  '<!-- Main Content',
  '<div class="coming-soon-page-wrap"',
  '<div data-w-id="5c27ebc6',
  '<div data-w-id="20698eeb',
  '<div class="page-wrap"',
  '<div class="old-main"',
  '<main class="main-wrapper"',
  'carousel="component"',
];

function normalizePagePath(file) {
  return file.replace(/\\/g, '/');
}

function isCurrent(pagePath, matchList) {
  const normalized = normalizePagePath(pagePath);
  return matchList.some((m) => normalized === m || normalized.endsWith('/' + m));
}

function largeLink(item, base, pagePath) {
  const href = base + item.path;
  const current = isCurrent(pagePath, item.match) ? ' aria-current="page"' : '';
  return `<li data-reveal-l><a href="${href}" class="underlay-nav__link-large"${current}><span class="underlay-nav__link-label">${item.label}</span></a></li>`;
}

function smallLink(item, base, pagePath, usePath) {
  if (usePath) {
    const href = base + item.path;
    const current = isCurrent(pagePath, item.match) ? ' aria-current="page"' : '';
    return `<li data-reveal-s><a href="${href}" class="underlay-nav__link-small"${current}>${item.label}</a></li>`;
  }
  const rel = item.external ? ' rel="noopener noreferrer" target="_blank"' : '';
  return `<li data-reveal-s><a href="${item.href}" class="underlay-nav__link-small"${rel}>${item.label}</a></li>`;
}

function buildNavHtml(pagePath, base) {
  const template = fs.readFileSync(PARTIAL_PATH, 'utf8');
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const primaryLinks = config.primary.map((item) => largeLink(item, base, pagePath)).join('\n        ');
  const categoryLinks = config.categories.map((item) => largeLink(item, base, pagePath)).join('\n        ');
  const socialLinks = config.socials.map((item) => smallLink(item, base, pagePath, false)).join('\n            ');
  const quickLinks = config.quickLinks.map((item) => smallLink(item, base, pagePath, true)).join('\n            ');

  return template
    .replace(/\{\{BASE\}\}/g, base)
    .replace('{{PRIMARY_LINKS}}', primaryLinks)
    .replace('{{CATEGORY_LINKS}}', categoryLinks)
    .replace('{{SOCIAL_LINKS}}', socialLinks)
    .replace('{{QUICK_LINKS}}', quickLinks);
}

function findBalancedDivEnd(html, openIdx) {
  let depth = 0;
  let i = openIdx;
  while (i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    i = nextClose + 6;
    if (depth === 0) return i;
  }
  return -1;
}

function removeBalancedTagBlock(html, openTagPattern) {
  const match = html.match(openTagPattern);
  if (!match) return html;
  const start = match.index;
  if (match[0].startsWith('<div')) {
    const end = findBalancedDivEnd(html, start);
    if (end === -1) return html;
    return html.slice(0, start) + html.slice(end);
  }
  if (match[0].startsWith('<nav')) {
    const end = html.indexOf('</nav>', start);
    if (end === -1) return html;
    return html.slice(0, start) + html.slice(end + 6);
  }
  return html;
}

function removeLegacyNavFragments(html) {
  let prev;
  do {
    prev = html;
    html = removeBalancedTagBlock(html, /<div[^>]*class="[^"]*\bnavbar w-nav\b[^"]*"[^>]*>/);
    html = removeBalancedTagBlock(html, /<nav[^>]*class="[^"]*\bnavbar-menu\b[^"]*"[^>]*>/);
    html = removeBalancedTagBlock(html, /<div[^>]*class="[^"]*\bnavbar-fullscreen-component\b[^"]*"[^>]*>/);
  } while (html !== prev);
  return html;
}

function removeOldNav(html) {
  const legacyStart = html.indexOf('<!-- Fullscreen Navigation -->');
  if (legacyStart !== -1) {
    let cutEnd = html.length;
    for (const marker of CONTENT_MARKERS) {
      const idx = html.indexOf(marker, legacyStart + 1);
      if (idx !== -1 && idx < cutEnd) cutEnd = idx;
    }
    html = html.slice(0, legacyStart) + html.slice(cutEnd);
  }

  return removeLegacyNavFragments(html);
}

function swapAssets(html, base) {
  const cssPath = base + 'css/';
  const jsPath = base + 'js/';

  html = html.replace(/<link[^>]+href="(?:\.\.\/)*css\/navigation\.css"[^>]*>\s*/g, '');
  html = html.replace(/\s*<script[^>]+src="(?:\.\.\/)*js\/navigation\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script\s+type="text\/javascript"><\/script>\s*/g, '');

  if (!html.includes('underlay-nav.css')) {
    html = html.replace(
      /(<link[^>]+onlyatthekiosk\.css"[^>]*>)/,
      `$1\n  <link href="${cssPath}underlay-nav.css" rel="stylesheet" type="text/css">`
    );
  }

  const gsapScripts = `  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>\n  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/CustomEase.min.js"></script>\n  <script src="${jsPath}underlay-nav.js" type="text/javascript"></script>`;

  if (!html.includes('underlay-nav.js')) {
    html = html.replace(/<\/body>/, `${gsapScripts}\n</body>`);
  }

  return html;
}

function injectNav(html, navHtml) {
  const block = `${NAV_BEGIN}\n${navHtml}\n  ${NAV_END}`;

  if (html.includes(NAV_BEGIN) && html.includes(NAV_END)) {
    return html.replace(new RegExp(`${NAV_BEGIN}[\\s\\S]*?${NAV_END}`), block);
  }

  return html.replace(/<body([^>]*)>/, `<body$1>\n  ${block}`);
}

function findScriptBoundary(html, fromIdx) {
  const scriptIdx = html.indexOf('<script', fromIdx);
  return scriptIdx === -1 ? html.lastIndexOf('</body>') : scriptIdx;
}

function transformExistingMain(html, mainClass) {
  return html.replace(/<main(\s[^>]*)>/g, (match, attrs) => {
    if (!attrs.includes('main-wrapper') && !attrs.includes('styleguide-container')) {
      return match;
    }
    if (attrs.includes('data-main')) {
      if (!attrs.includes(mainClass)) {
        return match.replace(/class="([^"]*)"/, (m, cls) => `class="${cls} ${mainClass}"`.trim());
      }
      return match;
    }

    let next = attrs;
    if (next.includes('class="')) {
      next = next.replace(/class="([^"]*)"/, (m, cls) => {
        const merged = cls.includes(mainClass) ? cls : `${cls} ${mainClass}`.trim();
        return `class="${merged}"`;
      });
    } else {
      next += ` class="${mainClass}"`;
    }

    next = next.replace(
      /style="([^"]*)"/,
      (m, style) => {
        const cleaned = style
          .replace(/padding-top:\s*6rem;?\s*/g, '')
          .replace(/min-height:\s*calc\(100vh\s*-\s*6rem\)/g, 'min-height: calc(100vh - var(--nav-height))')
          .trim();
        return cleaned ? ` style="${cleaned}"` : '';
      }
    );

    return `<main data-main${next}>`;
  });
}

function wrapContent(html, page) {
  if (html.includes(MAIN_BEGIN) && html.includes(MAIN_END)) {
    if (page.transformMain) {
      return transformExistingMain(html, page.mainClass);
    }
    return html.replace(
      /<main([^>]*?)data-main([^>]*?)>/,
      (match) => {
        if (match.includes(page.mainClass)) return match;
        if (match.includes('class=')) {
          return match.replace(/class="([^"]*)"/, (m, cls) => {
            const next = cls.includes(page.mainClass) ? cls : `${cls} ${page.mainClass}`.trim();
            return `class="${next}"`;
          });
        }
        return match.replace('>', ` class="${page.mainClass}">`);
      }
    );
  }

  if (page.transformMain) {
    let transformed = transformExistingMain(html, page.mainClass);
    const mainIdx = transformed.indexOf('<main data-main');
    if (mainIdx !== -1 && !transformed.includes(MAIN_BEGIN)) {
      const navEndIdx = transformed.indexOf(NAV_END);
      if (mainIdx > navEndIdx) {
        const mainCloseIdx = transformed.indexOf('</main>', mainIdx);
        if (mainCloseIdx !== -1) {
          const before = transformed.slice(0, mainIdx);
          const mainBlock = transformed.slice(mainIdx, mainCloseIdx + 7);
          const after = transformed.slice(mainCloseIdx + 7);
          return `${before}\n  ${MAIN_BEGIN}\n  ${mainBlock}\n  ${MAIN_END}${after}`;
        }
      }
    }
    return transformed;
  }

  const navEndIdx = html.indexOf(NAV_END);
  if (navEndIdx === -1) return html;

  const wrapStart = page.wrapStart;
  if (!wrapStart) return html;

  const contentStart = html.indexOf(wrapStart, navEndIdx);
  if (contentStart === -1) {
    console.warn(`Wrap start not found in ${page.file}: ${wrapStart}`);
    return html;
  }

  let contentEnd;
  if (page.wrapEnd) {
    contentEnd = html.indexOf(page.wrapEnd, contentStart);
    if (contentEnd === -1) contentEnd = findScriptBoundary(html, contentStart);
  } else {
    contentEnd = findScriptBoundary(html, contentStart);
  }

  const content = html.slice(contentStart, contentEnd).trim();
  const wrapped = `\n  ${MAIN_BEGIN}\n  <main data-main class="${page.mainClass}">\n${content}\n  </main>\n  ${MAIN_END}\n  `;

  return html.slice(0, contentStart) + wrapped + html.slice(contentEnd);
}

function processPage(page) {
  const filePath = path.join(ROOT, page.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip missing: ${page.file}`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  html = removeOldNav(html);
  html = swapAssets(html, page.base);

  const navHtml = buildNavHtml(page.file, page.base);
  html = injectNav(html, navHtml);
  html = wrapContent(html, page);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Built nav: ${page.file}`);
}

PAGES.forEach(processPage);
console.log('Navigation build complete.');
