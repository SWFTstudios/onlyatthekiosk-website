#!/bin/bash
# Cloudflare Pages build — inject shared underlay navigation into all pages
set -euo pipefail

echo "Building KIOSK underlay navigation..."
node scripts/build-nav.js

echo "Build complete."
