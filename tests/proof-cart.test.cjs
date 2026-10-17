const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cartAjaxUrl } = require('../scripts/proof.cjs');

// #154：本地代理的日文页 routes 带 /ja/，但 /ja/cart/add.js 是 404；购物车请求必须落到店铺根路径。
test('cart Ajax URLs drop the locale subfolder so every locale hits the shop-root endpoint', () => {
  assert.equal(cartAjaxUrl('/ja/cart/add', '/ja/'), '/cart/add.js');
  assert.equal(cartAjaxUrl('/ja/cart', '/ja/'), '/cart.js');
  assert.equal(cartAjaxUrl('/en/cart/add', '/en/'), '/cart/add.js');
  assert.equal(cartAjaxUrl('/zh/cart/add', '/zh'), '/cart/add.js');
  assert.equal(cartAjaxUrl('/cart/add', '/'), '/cart/add.js');
});
