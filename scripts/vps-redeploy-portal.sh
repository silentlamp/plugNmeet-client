#!/usr/bin/env bash
# Redeploy meeting SPA (strip portal) + portal SPA artifact.
set -euo pipefail
sed -i 's/\r$//' vps-install-client.sh 2>/dev/null || true
cp -f "$HOME/ci-deploy-portal.sh" /tmp/ci-deploy-portal.sh 2>/dev/null || true
if [[ -f "$HOME/ci-deploy-portal.sh" ]]; then
  sed -i 's/\r$//' "$HOME/ci-deploy-portal.sh"
fi

bash vps-install-client.sh

if [[ -f "$HOME/portal-dist.tgz" ]]; then
  if [[ -f /home/dev/zen-leader/scripts/ci-deploy-portal.sh ]]; then
    sudo bash /home/dev/zen-leader/scripts/ci-deploy-portal.sh "$HOME/portal-dist.tgz"
  elif [[ -f "$HOME/ci-deploy-portal.sh" ]]; then
    bash "$HOME/ci-deploy-portal.sh" "$HOME/portal-dist.tgz"
  else
    sudo mkdir -p /var/www/portal.zenleader.xyz
    sudo rm -rf /var/www/portal.zenleader.xyz/*
    sudo tar -xzf "$HOME/portal-dist.tgz" -C /var/www/portal.zenleader.xyz
    sudo chown -R www-data:www-data /var/www/portal.zenleader.xyz || true
    echo "portal extracted to /var/www/portal.zenleader.xyz"
  fi
fi

sudo docker restart plugnmeet-plugnmeet-1 >/dev/null || true
curl -fsS -o /dev/null -w "portal=%{http_code}\n" https://portal.zenleader.xyz/login
test ! -f /opt/plugNmeet/client/dist/login.html && echo "meet_dist_login.html=stripped"
echo DONE
