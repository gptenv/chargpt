#!/bin/bash
set -e

# Start the daemon first
warp-svc --log-level error &
sleep 2

# Only register if no registration exists yet
if ! warp-cli --accept-tos registration show >/dev/null 2>&1; then
  echo "[INFO] No registration found, creating new..."
  warp-cli --accept-tos registration new
else
  echo "[INFO] Existing registration detected, skipping re-registration."
fi

warp-cli --accept-tos mode proxy

# No more set-mode — Cloudflare now manages it internally
# Just connect
warp-cli --accept-tos connect || true

# Wait and inspect status
sleep 2
warp-cli --accept-tos status

# Live forever like a docker demon
tail -f /dev/null

