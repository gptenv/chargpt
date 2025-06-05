FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN if [ ! -f "package.json" ]; then npm init -y; fi; npm i

COPY . .

EXPOSE 8842

CMD ["node", "index.js"]

