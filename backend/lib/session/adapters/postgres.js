import pkg from 'pg';
const { Client } = pkg;

export default class PostgresStore {
  async init() {
    this.client = new Client({ connectionString: process.env.CHARGPT_PG_DSN });
    await this.client.connect();
    await this.client.query(`CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      data jsonb,
      expires bigint
    )`);
  }

  async get(token) {
    const { rows } = await this.client.query('SELECT data, expires FROM sessions WHERE token=$1', [token]);
    const row = rows[0];
    if (!row) return null;
    if (row.expires && Number(row.expires) < Date.now()) {
      await this.delete(token);
      console.log(`[SESSION] Expired session removed for token:${token.slice(0,6)}…`);
      return null;
    }
    return row.data;
  }

  async set(token, data, ttl) {
    const expires = ttl ? Date.now() + ttl * 1000 : null;
    await this.client.query(
      'INSERT INTO sessions(token,data,expires) VALUES($1,$2,$3) ON CONFLICT(token) DO UPDATE SET data=$2, expires=$3',
      [token, data, expires]
    );
  }

  async delete(token) {
    await this.client.query('DELETE FROM sessions WHERE token=$1', [token]);
  }
}
