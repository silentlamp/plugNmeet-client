#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/home/dev/zen-leader/.env"
COMPOSE_DIR="/home/dev/zen-leader"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi

# Ensure meet origin is allowed for the React portal
if sudo grep -q '^CORS_ALLOWED_ORIGIN_PROD=' "$ENV_FILE"; then
  CURRENT="$(sudo grep '^CORS_ALLOWED_ORIGIN_PROD=' "$ENV_FILE" | head -1)"
  if echo "$CURRENT" | grep -q 'meet.zenleader.xyz'; then
    echo "CORS already includes meet.zenleader.xyz"
  else
    # Append meet origin to existing prod list
    sudo sed -i "s|^CORS_ALLOWED_ORIGIN_PROD=\(.*\)$|CORS_ALLOWED_ORIGIN_PROD=\1,https://meet.zenleader.xyz|" "$ENV_FILE"
    echo "Updated CORS_ALLOWED_ORIGIN_PROD"
  fi
else
  echo 'CORS_ALLOWED_ORIGIN_PROD=https://admin.zenleader.xyz,https://zenleader.xyz,https://meet.zenleader.xyz' | sudo tee -a "$ENV_FILE" >/dev/null
  echo "Appended CORS_ALLOWED_ORIGIN_PROD"
fi

sudo grep '^CORS_ALLOWED_ORIGIN_PROD=' "$ENV_FILE"

cd "$COMPOSE_DIR"
# Recreate only java-backend so CORS env is picked up
if [[ -x ./scripts/ci-deploy-java.sh ]]; then
  sudo -u dev bash ./scripts/ci-deploy-java.sh || sudo docker compose up -d --force-recreate --no-deps java-backend
else
  sudo docker compose up -d --force-recreate --no-deps java-backend
fi

sleep 5
docker ps --filter name=zenleader-java --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
curl -fsS https://api.zenleader.xyz/actuator/health || true
echo
