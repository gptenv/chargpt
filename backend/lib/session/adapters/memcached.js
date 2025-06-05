import Memcached from 'memcached';

export default class MemcachedStore {
  async init() {
    const servers = process.env.CHARGPT_MEMCACHED_SERVERS || 'localhost:11211';
    this.client = new Memcached(servers);
  }

  async get(token) {
    return new Promise((resolve) => {
      this.client.get(token, (err, val) => {
        if (err || !val) return resolve(null);
        const { data, expires } = val;
        if (expires && expires < Date.now()) {
          this.delete(token).then(() => {
            console.log(`[SESSION] Expired session removed for token:${token.slice(0,6)}…`);
          });
          return resolve(null);
        }
        resolve(data);
      });
    });
  }

  async set(token, data, ttl) {
    const expires = ttl ? Date.now() + ttl * 1000 : null;
    return new Promise((resolve, reject) => {
      this.client.set(token, { data, expires }, ttl || 0, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async delete(token) {
    return new Promise((resolve) => {
      this.client.del(token, () => resolve());
    });
  }
}
