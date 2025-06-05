import { createClient } from 'redis';

export default class RedisStore {
  async init() {
    this.client = createClient({ url: process.env.CHARGPT_REDIS_URL });
    await this.client.connect();
  }

  async get(token) {
    const val = await this.client.get(token);
    if (!val) return null;
    const { data, expires } = JSON.parse(val);
    if (expires && expires < Date.now()) {
      await this.delete(token);
      console.log(`[SESSION] Expired session removed for token:${token.slice(0,6)}…`);
      return null;
    }
    return data;
  }

  async set(token, data, ttl) {
    const expires = ttl ? Date.now() + ttl * 1000 : null;
    const payload = JSON.stringify({ data, expires });
    if (ttl) {
      await this.client.set(token, payload, { EX: ttl });
    } else {
      await this.client.set(token, payload);
    }
  }

  async delete(token) {
    await this.client.del(token);
  }
}
