const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pickSoldOut } = require('../scripts/proof.cjs');

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
