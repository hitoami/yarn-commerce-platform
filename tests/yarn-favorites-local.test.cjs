const test = require('node:test');
const assert = require('node:assert/strict');
const { readLocal, toggleLocal, MAX_LOCAL } = require('../assets/yarn-favorites.js');

const storage = (value) => ({ getItem: () => value });

test('local favorites ignore corrupt storage, invalid entities and duplicates', () => {
  assert.deepEqual(readLocal(storage('not json')), []);
  assert.deepEqual(readLocal(storage('{"type":"product"}')), []);
  assert.deepEqual(readLocal(storage(JSON.stringify([
    { type: 'product', id: '12' }, { type: 'product', id: 12 }, { type: 'order', id: '3' }, { type: 'project', id: '0' }, { type: 'project', id: '12' },
  ]))), [{ type: 'product', id: '12' }, { type: 'project', id: '12' }]);
});

test('toggling saves newest first, removes by type and id, and refuses past the cap', () => {
  const product = { type: 'product', id: '7' };
  const added = toggleLocal([{ type: 'project', id: '7' }], product);
  assert.deepEqual(added, { saved: true, list: [product, { type: 'project', id: '7' }] });
  assert.deepEqual(toggleLocal(added.list, product), { saved: false, list: [{ type: 'project', id: '7' }] });
  const full = Array.from({ length: MAX_LOCAL }, (_, i) => ({ type: 'product', id: String(i + 1) }));
  assert.equal(toggleLocal(full, { type: 'product', id: '999' }), null);
  assert.equal(toggleLocal(full, { type: 'product', id: '1' }).saved, false);
});
