import assert from 'assert';
import SessionManager from '../../../lib/session/manager.js';

(async () => {
  const mgr = new SessionManager();
  const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({exp: Math.floor(Date.now()/1000)+1})).toString('base64') + '.sig';
  const thread = 't1';
  await mgr.storeConversation(fakeJwt, thread, 'cid1');
  const cid = await mgr.getConversation(fakeJwt, thread);
  assert.strictEqual(cid, 'cid1');
  console.log('manager store/get passed');
  await new Promise(r => setTimeout(r, 1100));
  const expired = await mgr.getConversation(fakeJwt, thread);
  assert.strictEqual(expired, null);
  console.log('manager ttl passed');

  const plain = 'plain-token';
  await mgr.touchSession(plain, thread);
  const none = await mgr.getConversation(plain, thread);
  assert.strictEqual(none, null);
  await mgr.storeConversation(plain, thread, 'cid2');
  await mgr.touchSession(plain, thread);
  const still = await mgr.getConversation(plain, thread);
  assert.strictEqual(still, 'cid2');
  console.log('manager touch passed');
})();
