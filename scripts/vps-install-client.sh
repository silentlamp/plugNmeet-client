#!/usr/bin/env bash
# Install meeting SPA only into Fiber client path.
# Portal HTML is hosted separately at portal.zenleader.xyz — strip it from meet dist.
set -euo pipefail

SRC="${HOME}/client-dist.tgz"
DEST="/opt/plugNmeet/client/dist"

if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

sudo mkdir -p /opt/plugNmeet/client
if [[ -d "$DEST" ]]; then
  sudo mv "$DEST" "/opt/plugNmeet/client/dist.bak.$(date +%Y%m%d%H%M%S)"
fi
sudo mkdir -p "$DEST"
sudo tar -xzf "$SRC" -C "$DEST"

# Meeting room only: do not serve learner portal from Fiber.
sudo rm -f "$DEST/login.html"
sudo rm -f "$DEST"/assets/js/login-module.*.js
sudo rm -f "$DEST"/assets/css/login.*.css
# Portal-only OAuth env must never live under Meet dist
sudo rm -f "$DEST/assets/portal-env.js" "$DEST/assets/portal-env.sample.js"

if [[ -f "$DEST/assets/config_sample.js" ]]; then
  sudo cp "$DEST/assets/config_sample.js" "$DEST/assets/config.js"
  sudo sed -i "s|serverUrl:.*|serverUrl: 'https://meet.zenleader.xyz',|" "$DEST/assets/config.js"
  sudo sed -i "s|portalUrl:.*|portalUrl: 'https://portal.zenleader.xyz',|" "$DEST/assets/config.js"
fi

{
  echo "client_commit=$(git -C /opt/plugNmeet rev-parse --short HEAD 2>/dev/null || echo manual)"
  echo "client_remote=silentlamp/plugNmeet-client"
  echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "installed_by=manual-gcloud"
  echo "portal_host=portal.zenleader.xyz"
} | sudo tee /opt/plugNmeet/.zenleader-client-info >/dev/null

echo "=== meet config (room SPA) ==="
grep -E 'serverUrl|portalUrl' "$DEST/assets/config.js" || true
echo "=== portal artifacts stripped ==="
test ! -f "$DEST/login.html" && echo "login.html=absent (ok)"
echo "=== http ==="
curl -fsS -o /dev/null -w "meet_home=%{http_code}\n" https://meet.zenleader.xyz/
# Nginx (primary) or Fiber redirect → portal
LOC=$(curl -fsSI https://meet.zenleader.xyz/login 2>/dev/null | tr -d '\r' | awk 'tolower($1)=="location:"{print $2; exit}')
CODE=$(curl -fsSI -o /dev/null -w "%{http_code}" https://meet.zenleader.xyz/login || true)
echo "meet_login=${CODE} location=${LOC}"
