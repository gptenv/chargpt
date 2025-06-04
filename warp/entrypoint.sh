#!/bin/bash

set -e

warp-cli --accept-tos register
warp-cli --accept-tos set-mode warp
warp-cli --accept-tos connect

# Just to show IP routing works (dev only, comment later)
ip a

# Keep container alive
tail -f /dev/null

