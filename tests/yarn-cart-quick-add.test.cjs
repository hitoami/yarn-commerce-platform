const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(button) {
  let listener;
  const requests = [];
  vm.runInNewContext(fs.readFileSync('assets/yarn-cart.js', 'utf8'), {
    window: { location: { pathname: '/en/products/yarn', reload() {}, assign() {} }, routes: { cart_add_url: '/en/cart/add' } },
    document: { addEventListener: (_, fn) => listener = fn, querySelector: () => null },
    AbortController, setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({}) }; },
  });
  return { requests, click: () => listener({ target: { closest: () => button } }) };
}
test('choice links never invoke cart add', async () => {
  const ui = setup(null); await ui.click(); assert.equal(ui.requests.length, 0);
});
test('quick add sends exactly one of the explicit variant and prevents duplicate activation', async () => {
  const button = { dataset: { cartQuickAdd: '42' }, disabled: false };
  const ui = setup(button);
  await Promise.all([ui.click(), ui.click()]);
  assert.deepEqual(ui.requests, [{ url: '/en/cart/add.js', body: { items: [{ id: 42, quantity: 1 }] } }]);
});
