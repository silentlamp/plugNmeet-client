#!/usr/bin/env bash
# Build portal-only artifact from plugNmeet-client dist (MPA login entry).
# Usage: from plugNmeet-client after `pnpm build`
#   bash scripts/package-portal-dist.sh
#
# Portal Google/Apple Sign-In IDs come from Vite `.env` / `.env.production`
# (VITE_PORTAL_GOOGLE_CLIENT_ID, VITE_PORTAL_APPLE_CLIENT_ID) at build time —
# already baked into the login bundle. This script only packages URLs into
# portal config.js and must never write OAuth into Meet config.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
OUT="${ROOT}/portal-dist"
TGZ="${ROOT}/portal-dist.tgz"

if [[ ! -f "$DIST/login.html" ]]; then
  echo "missing $DIST/login.html — run pnpm build first" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/assets"

# SPA shell
cp "$DIST/login.html" "$OUT/index.html"

# Copy hashed bundles + shared assets referenced by portal
if [[ -d "$DIST/assets" ]]; then
  cp -a "$DIST/assets/." "$OUT/assets/"
fi

# Production config for portal subdomain (URLs only — no OAuth)
if [[ -f "$OUT/assets/config_sample.js" ]]; then
  cp "$OUT/assets/config_sample.js" "$OUT/assets/config.js"
  # portable sed
  if sed --version >/dev/null 2>&1; then
    sed -i "s|serverUrl:.*|serverUrl: 'https://meet.zenleader.xyz',|" "$OUT/assets/config.js"
    sed -i "s|meetHomeUrl:.*|meetHomeUrl: 'https://meet.zenleader.xyz/',|" "$OUT/assets/config.js"
    sed -i "s|portalUrl:.*|portalUrl: 'https://portal.zenleader.xyz',|" "$OUT/assets/config.js"
    sed -i "s|apiBaseUrl:.*|apiBaseUrl: 'https://api.zenleader.xyz',|" "$OUT/assets/config.js"
  else
    sed -i '' "s|serverUrl:.*|serverUrl: 'https://meet.zenleader.xyz',|" "$OUT/assets/config.js"
    sed -i '' "s|meetHomeUrl:.*|meetHomeUrl: 'https://meet.zenleader.xyz/',|" "$OUT/assets/config.js"
    sed -i '' "s|portalUrl:.*|portalUrl: 'https://portal.zenleader.xyz',|" "$OUT/assets/config.js"
    sed -i '' "s|apiBaseUrl:.*|apiBaseUrl: 'https://api.zenleader.xyz',|" "$OUT/assets/config.js"
  fi
fi

# Drop any leftover portal-env artifacts from older builds (legacy removed)
rm -f "$OUT/assets/portal-env.js" "$OUT/assets/portal-env.sample.js"

rm -f "$TGZ"
tar -czf "$TGZ" -C "$OUT" .
echo "wrote $TGZ"
