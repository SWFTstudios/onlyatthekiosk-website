#!/bin/bash
# Cloudflare Pages build — inject shared underlay navigation into all pages
set -euo pipefail

echo "Building KIOSK product catalog..."
node scripts/build-product-catalog.js

echo "Building KIOSK collection pages..."
node scripts/build-collection-pages.js

echo "Building KIOSK underlay navigation..."
node scripts/build-nav.js

echo "Build complete."
