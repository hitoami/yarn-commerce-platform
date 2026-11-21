const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pickSoldOut, resolvePages } = require('../scripts/proof.cjs');

// #245：缺货页样本在运行时挑选，补货后不再变成误报。
test('picks a priced product whose every variant is sold out', () => {
  const products = [
    { handle: 'in-stock', variants: [{ available: true, price: '680' }] },
    { handle: 'unpriced', variants: [{ available: false, price: '0.00' }] },
    { handle: 'partly', variants: [{ available: false, price: '480' }, { available: true, price: '480' }] },
    { handle: 'sold-out', variants: [{ available: false, price: '980' }, { available: false, price: '980' }] },
  ];
  assert.equal(pickSoldOut(products), '/products/sold-out');
});

test('returns null when nothing is sold out, so the check is skipped instead of failing', () => {
  assert.equal(pickSoldOut([{ handle: 'a', variants: [{ available: true, price: '680' }] }]), null);
});


test('a targeted sold-out run still renders the fixture when live inventory has no sample', async () => {
  const { resolved, skipped } = await resolvePages([{ key: 'yarn-pdp-sold-out', find: 'sold-out-yarn' }], 'https://example.test', async () => ({ ok: true, json: async () => ({ products: [] }) }));
  assert.equal(resolved[0].fixture, 'yarn-sold-out');
  assert.match(skipped[0], /前提未满足/);
});
test('a catalog fetch failure is reported as unknown inventory, not as in-stock inventory', async () => {
  const { resolved, skipped } = await resolvePages([{ key: 'yarn-pdp-sold-out', find: 'sold-out-yarn' }], 'https://example.test', async () => { throw new Error('offline'); });
  assert.equal(resolved[0].fixture, 'yarn-sold-out');
  assert.match(skipped[0], /无法确认真实库存.*offline/);
});
