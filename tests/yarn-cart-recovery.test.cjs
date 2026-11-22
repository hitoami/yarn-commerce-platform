const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(fetcher, drawer = null) {
  let click;
  const button = { dataset: { cartQuickAdd: '42' }, disabled: false };
  const status = { hidden: true, dataset: { error: 'Rejected', uncertain: 'Check first' } };
  const link = { hidden: true, href: '/en/cart' };
  const navigation = [];
  vm.runInNewContext(fs.readFileSync('assets/yarn-cart.js', 'utf8'), {
    window: { location: { pathname: '/en/', assign: url => navigation.push(url) } },
    document: { addEventListener: (_, fn) => click = fn, querySelector: selector => ({ 'cart-drawer': drawer, '[data-cart-quick-status]': status, '[data-cart-quick-review]': link })[selector] },
    fetch: fetcher, AbortController, setTimeout: () => 1, clearTimeout() {},
  });
  return { button, status, link, navigation, click: () => click({ target: { closest: () => button } }) };
}
test('a confirmed Shopify rejection is visible and permits a deliberate retry', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; return { ok: false, status: 422, json: async () => ({ description: '<inventory>' }) }; });
  await ui.click(); assert.equal(ui.button.disabled, false); assert.equal(ui.status.hidden, false);
  assert.equal(ui.status.textContent, 'Rejected <inventory>'); assert.equal(ui.link.hidden, true);
  await ui.click(); assert.equal(calls, 2);
});
test('transport failure and 5xx remain uncertain and cannot duplicate an accepted add', async () => {
  for (const fetcher of [async () => { throw new TypeError('offline'); }, async () => ({ ok: false, status: 503, json: async () => ({}) })]) {
    let calls = 0;
    const ui = setup(async (...args) => { calls++; return fetcher(...args); });
    await ui.click(); await ui.click();
    assert.equal(calls, 1); assert.equal(ui.button.disabled, true); assert.equal(ui.status.hidden, false);
    assert.equal(ui.status.textContent, 'Check first'); assert.equal(ui.link.hidden, false);
  }
});
test('a confirmed add with missing drawer sections goes to cart without retrying', async () => {
  const ui = setup(async () => ({ ok: true, status: 200, json: async () => ({}) }), { getSectionsToRender: () => [{ id: 'cart-drawer' }] });
  await ui.click(); assert.deepEqual(ui.navigation, ['/en/cart']); assert.equal(ui.button.disabled, true);
});
