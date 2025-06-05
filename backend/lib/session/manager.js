import crypto from 'crypto';
import { getStore } from './store.js';

export default class SessionManager {
  constructor() {
    this.defaultTTL = parseInt(process.env.CHARGPT_SESSION_TTL || '86400', 10);
  }

  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  _extractTTL(token) {
    try {
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          return ttl > 0 ? ttl : 0;
        }
      }
    } catch {}
    return this.defaultTTL;
  }

  async getConversation(token, thread) {
    const store = await getStore();
    const key = `${this._hashToken(token)}:${thread}`;
    const data = await store.get(key);
    return data && typeof data.conversationId !== 'undefined' ? data.conversationId : null;
  }

  async storeConversation(token, thread, conversationId) {
    const store = await getStore();
    const key = `${this._hashToken(token)}:${thread}`;
    const ttl = this._extractTTL(token);
    await store.set(key, { conversationId }, ttl);
  }

  async touchSession(token, thread) {
    const store = await getStore();
    const key = `${this._hashToken(token)}:${thread}`;
    const ttl = this._extractTTL(token);
    const existing = await store.get(key);
    const data = existing || {};
    await store.set(key, data, ttl);
  }
}
