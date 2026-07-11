#!/usr/bin/env bash
set -euo pipefail
echo "=== dist js ==="
ls -la /opt/plugNmeet/client/dist/assets/js/ | head -20
echo "=== index.html module ==="
grep -o 'main-module[^"]*' /opt/plugNmeet/client/dist/index.html || true
echo "=== live curl module ==="
curl -fsS https://meet.zenleader.xyz/ | grep -o 'main-module[^"]*' || true
echo "=== hashes ==="
md5sum /opt/plugNmeet/client/dist/assets/imgs/favicon.png /opt/plugNmeet/client/dist/assets/imgs/favicon.ico /opt/plugNmeet/client/dist/assets/imgs/main-logo-light.png
curl -fsS https://meet.zenleader.xyz/assets/imgs/favicon.png -o /tmp/f.png
curl -fsS https://meet.zenleader.xyz/assets/js/favicon.png -o /tmp/fj.png 2>/dev/null || true
md5sum /tmp/f.png /tmp/fj.png 2>/dev/null || true
file /tmp/f.png /tmp/fj.png 2>/dev/null || true
echo "=== portal imgs ==="
ls -la /var/www/portal.zenleader.xyz/assets/imgs/ 2>/dev/null || echo no_portal
echo "=== copyright ==="
grep -A6 copyright_conf /opt/plugNmeet/config.yaml
