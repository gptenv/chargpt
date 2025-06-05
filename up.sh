#!/bin/bash
set -e

docker build -t gptenv/chargpt-backend:latest .
docker build -t gptenv/chargpt-warp:latest .
docker compose up --build -d

