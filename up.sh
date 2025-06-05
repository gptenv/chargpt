#!/bin/bash
set -e

docker build -t gptenv/chargpt-backend:latest ./backend/
docker build -t gptenv/chargpt-warp:latest ./warp/
docker compose up --build -d

