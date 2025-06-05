import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy load adapters
const adapters = {
  sqlite: './adapters/sqlite.js',
  postgres: './adapters/postgres.js',
  redis: './adapters/redis.js',
  memcached: './adapters/memcached.js',
};

let instance = null;

export async function getStore() {
  if (instance) return instance;
  const env = process.env.CHARGPT_SESSION_BACKEND || 'sqlite';
  const order = ['sqlite', 'postgres', 'redis', 'memcached'];
  const backends = [...new Set([env, ...order])];

  for (const name of backends) {
    const adapterPath = adapters[name];
    if (!adapterPath) continue;
    const fullPath = path.join(__dirname, adapterPath);
    if (fs.existsSync(fullPath)) {
      const mod = await import(fullPath);
      const Adapter = mod.default;
      try {
        instance = new Adapter();
        await instance.init();
        console.log(`[SESSION] Using ${name} session store`);
        return instance;
      } catch (err) {
        console.log(`[SESSION] Failed to init ${name} store: ${err.message}`);
      }
    }
  }

  console.error('[SESSION] No valid session store available');
  process.exit(101);
}
