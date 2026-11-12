const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Liquid } = require('liquidjs');
async function render({ variants = [{ id: 42, available: true }], threshold = 9900, part = 'addons' } = {}) {
  const engine = new Liquid({ root: path.resolve('snippets'), extname: '.liquid' });
  engine.registerFilter('t', key => key);
  engine.registerFilter('money', value => String(value));
  engine.registerFilter('inline_asset_content', () => '<svg></svg>');
  const product = { id: 1, title: 'Yarn', url: '/en/products/yarn', price: 50000, available: true, variants, selected_or_first_available_variant: variants[0], tags: ['毛糸'] };
  return engine.renderFile('yarn-cart-addons', { part, settings: { yarn_free_shipping_threshold: threshold },
    cart: { total_price: 1000, items: part === 'spare' ? [{ product, variant: variants[0], variant_id: variants[0].id, quantity: 1 }] : [] },
    collections: { yarn: { products: [product] } } });
}
test('multiple variants require a localized product link even when only one is available', async () => {
  const html = await render({ variants: [{ id: 42, available: true }, { id: 43, available: false }] });
  assert.match(html, /href="\/en\/products\/yarn" data-cart-choose-options/);
  assert.doesNotMatch(html, /data-cart-quick-add/);
});
test('one variant and a spare ball retain the explicit variant id', async () => {
  assert.match(await render(), /data-cart-quick-add="42"/);
  assert.match(await render({ part: 'spare' }), /data-cart-quick-add="42"/);
});
test('a disabled free-shipping threshold does not render an offer', async () => {
  const html = await render({ threshold: 0 });
  assert.doesNotMatch(html, /class="yarn-cart-addon"|data-cart-quick-add|data-cart-choose-options/);
});
