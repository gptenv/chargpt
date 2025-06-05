#!/bin/bash
set -e
curl -fsSL https://get.docker.com/ | sh
cp .env.example .env
chmod 600 .env
echo "CHARGPT_ACCESS_TOKEN=${CHARGPT_ACCESS_TOKEN}" >> .env
echo "CHARGPT_API_BASE=${CHARGPT_API_BASE}" >> .env
export CHARGPT_ACCESS_TOKEN=""
export CHARGPT_API_BASE=""
unset CHARGPT_ACCESS_TOKEN
unset CHARGPT_API_BASE
./up.sh
