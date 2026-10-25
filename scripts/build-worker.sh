#!/usr/bin/env bash
# Build the site for the "onlyatthekiosk" Cloudflare Worker (static assets + /api functions).
#
#   dist/             public files only (no docs, scripts, exports or CSVs)
#   dist/_worker.js/  the functions/ folder compiled into the Worker's code
#
# Cloudflare Workers Builds runs this, then `npx wrangler deploy` (see wrangler.jsonc).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building KIOSK underlay navigation..."
node scripts/build-nav.js

echo "Copying public files to dist/..."
rm -rf dist
mkdir -p dist
cp ./*.html _redirects _headers site.webmanifest dist/
for dir in css js images videos fonts; do
  cp -R "$dir" dist/
done

# /js/* and /css/* are cached for a year under fixed names (_headers): give
# every reference a ?v= that changes with the file's content
node scripts/stamp-assets.js dist

echo "Compiling functions/ into the Worker..."
npx --yes wrangler@4 pages functions build --outdir=dist/_worker.js

# The Worker's code must not be served as a public file
echo "_worker.js" > dist/.assetsignore

echo "Build complete: $(find dist -type f | wc -l | tr -d ' ') files."
