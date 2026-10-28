#!/usr/bin/env node
/**
 * Cache-busting for the Worker build (scripts/build-worker.sh runs it on dist/).
 *
 * /js/* and /css/* are served immutable for a year (_headers) under fixed
 * names, so a returning visitor only sees a changed file if its URL changes.
 * This rewrites every quoted reference to a script or stylesheet, in the
 * pages and in the scripts and stylesheets themselves ("js/kiosk-glass.js",
 * loadScript('js/kiosk-earth.js'), '/css/x.css?v=old'), to end in
 * ?v=<hash>, so URLs change exactly when content does.
 *
 * A file's hash covers its own content and that of every file it references,
 * all the way down: change a script that kiosk-glass.js loads on demand and
 * kiosk-glass.js gets a new URL too, so nobody is left with a cached copy
 * that still points at the old one. Only references to files that exist are
 * touched; paths built at runtime (`${base}…`) are left alone.
 *
 *   node scripts/stamp-assets.js dist
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = path.resolve(process.argv[2] || 'dist');
// a quoted path from the site root to a script or stylesheet, with any old ?v=
const REF = /(["'`])(\/?)((?:js|css)\/[A-Za-z0-9_./-]+?\.(?:js|css))(?:\?v=[^"'`#\s]*)?(?=\1)/g;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const rel = (p) => path.relative(OUT, p).split(path.sep).join('/');

// every script and stylesheet, keyed by its path from the site root
const assets = new Map();
['js', 'css'].forEach((top) => {
  const dir = path.join(OUT, top);
  if (!fs.existsSync(dir)) return;
  walk(dir).filter((p) => /\.(js|css)$/.test(p)).forEach((p) => assets.set(rel(p), fs.readFileSync(p, 'utf8')));
});

const refsOf = (src) => {
  const out = new Set();
  for (const m of src.matchAll(REF)) if (assets.has(m[3])) out.add(m[3]);
  return out;
};
const refs = new Map([...assets].map(([k, src]) => [k, refsOf(src)]));

// hash of a file and everything reachable from it (cycles are fine: a set),
// over the content with any old ?v= taken off, so running it twice changes nothing
const bare = (src) => src.replace(REF, (all, q, slash, key) => `${q}${slash}${key}`);
const hashes = new Map();
function hashOf(key) {
  if (hashes.has(key)) return hashes.get(key);
  const seen = new Set(); const stack = [key];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    refs.get(k).forEach((r) => stack.push(r));
  }
  const h = crypto.createHash('sha256');
  [...seen].sort().forEach((k) => { h.update(k); h.update('\0'); h.update(bare(assets.get(k))); h.update('\0'); });
  const v = h.digest('hex').slice(0, 10);
  hashes.set(key, v);
  return v;
}

const stamp = (src) => src.replace(REF, (all, q, slash, key) => (assets.has(key) ? `${q}${slash}${key}?v=${hashOf(key)}` : all));

const pages = fs.readdirSync(OUT).filter((f) => f.endsWith('.html')).map((f) => path.join(OUT, f));
let changed = 0;
pages.forEach((p) => {
  const src = fs.readFileSync(p, 'utf8'); const out = stamp(src);
  if (out !== src) { fs.writeFileSync(p, out); changed += 1; }
});
assets.forEach((src, key) => {
  const out = stamp(src);
  if (out !== src) { fs.writeFileSync(path.join(OUT, key), out); changed += 1; }
});
console.log(`Stamped asset URLs: ${hashes.size} scripts/stylesheets referenced, ${changed} files rewritten.`);
