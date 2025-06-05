let sqlite3, open;
try {
  ({ default: sqlite3 } = await import('sqlite3'));
  ({ open } = await import('sqlite'));
} catch {
  sqlite3 = null;
}

export default class SQLiteStore {
  async init() {
    if (sqlite3) {
      this.db = await open({ filename: 'session.db', driver: sqlite3.Database });
      await this.db.run(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        data TEXT,
        expires INTEGER
      )`);
    } else {
      this.map = new Map();
    }
  }

  async get(token) {
    if (this.db) {
      const row = await this.db.get('SELECT data, expires FROM sessions WHERE token=?', token);
      if (!row) return null;
      if (row.expires && row.expires < Date.now()) {
        await this.delete(token);
        console.log(`[SESSION] Expired session removed for token:${token.slice(0,6)}…`);
        return null;
      }
      return JSON.parse(row.data);
    }
    const entry = this.map.get(token);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.map.delete(token);
      console.log(`[SESSION] Expired session removed for token:${token.slice(0,6)}…`);
      return null;
    }
    return entry.data;
  }

  async set(token, data, ttl) {
    const expires = ttl ? Date.now() + ttl * 1000 : null;
    if (this.db) {
      const json = JSON.stringify(data);
      await this.db.run('REPLACE INTO sessions(token,data,expires) VALUES(?,?,?)', token, json, expires);
    } else {
      this.map.set(token, { data, expires });
    }
  }

  async delete(token) {
    if (this.db) {
      await this.db.run('DELETE FROM sessions WHERE token=?', token);
    } else {
      this.map.delete(token);
    }
  }
}
