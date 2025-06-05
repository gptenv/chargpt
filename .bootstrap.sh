#!/bin/bash
sudo apt-get update && sudo apt-get upgrade -y && sudo apt-get dist-upgrade -y && sudo apt-get autoremove 
sudo apt-get install -y apt-utils nodejs
pushd backend
npm i
popd
curl -fsSL https://get.docker.com/ | sh
cp .env.example .env
chmod 600 .env
echo "CHARGPT_ACCESS_TOKEN=${CHARGPT_ACCESS_TOKEN}" >> .env
echo "CHARGPT_API_BASE=${CHARGPT_API_BASE}" >> .env
export CHARGPT_ACCESS_TOKEN=""
export CHARGPT_API_BASE=""
unset CHARGPT_ACCESS_TOKEN
unset CHARGPT_API_BASE
sudo gpasswd -a $(whoami) docker
sudo dockerd &
sleep 15
docker ps || echo "ERROR: dockerd not running or not accessible (see line above)"
docker build -t gptenv/chargpt-backend:latest .
docker build -t gptenv/chargpt-warp:latest .
docker exec -it chargpt-backend '/bin/bash -c "node backend/dev/test-chat-completions.js"'
