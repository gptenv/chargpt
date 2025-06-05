import crypto from 'crypto';
//import fs from 'fs';

const threadCache = new Map(); // key: hashed auth token -> { conversationId, parentMessageId }

export function getSessionKey(req) {
  // You could scope this by user IP, auth header, or custom header
  const auth = req.headers['authorization'] || '';
  return crypto.createHash('sha256').update(auth).digest('hex');
}

export function getThread(req) {
  const key = getSessionKey(req);
  return threadCache.get(key) || null;
}

export function updateThread(req, conversationId, parentMessageId) {
  const key = getSessionKey(req);
  threadCache.set(key, { conversationId, parentMessageId });
}

export function clearThread(req) {
  const key = getSessionKey(req);
  threadCache.delete(key);
}

