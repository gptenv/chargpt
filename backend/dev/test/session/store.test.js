import assert from 'assert';
import { getStore } from '../../../lib/session/store.js';

(async () => {
  const store = await getStore();
  await store.set('token', { conversationId: 'abc' }, 1);
  const val = await store.get('token');
  assert.deepStrictEqual(val, { conversationId: 'abc' });
  console.log('store test passed');
  await new Promise(r => setTimeout(r, 1100));
  const expired = await store.get('token');
  assert.strictEqual(expired, null);
  console.log('ttl expiry test passed');
})();
