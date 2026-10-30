const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../shopify-app/extensions/tutorial-claim/src/kit-match.js');

const yarn = (variantId, quantity, extra = {}) => ({ variantId, quantity, supply: '本店提供', type: '毛线', ...extra });
const scarf = {
  handle: 'kit-xuebao-fringe-scarf', title: '十刻雪宝｜流苏围巾', scope: '已核实可公开',
  materials: [yarn('gid://shopify/ProductVariant/1', 4), { variantId: null, quantity: 0, supply: '需自行准备', type: '工具' }],
};

// #244：买齐作品所需毛线才显示「领取教程」，不够、不公开都不显示。
test('a kit counts as bought only when every shop-supplied yarn reaches its quantity', async () => {
  const { matchKits } = await load();
  const line = quantity => [{ merchandise: { id: 'gid://shopify/ProductVariant/1' }, quantity }];
  assert.deepEqual(matchKits(line(4), [scarf]).map(k => k.handle), ['kit-xuebao-fringe-scarf']);
  assert.deepEqual(matchKits(line(3), [scarf]), []);
  // 同一 Variant 分成两行也要合计。
  assert.equal(matchKits([...line(2), ...line(2)], [scarf]).length, 1);
});

test('internal-only kits and kits without comparable yarn never match', async () => {
  const { matchKits } = await load();
  const lines = [{ merchandise: { id: 'gid://shopify/ProductVariant/1' }, quantity: 9 }];
  assert.deepEqual(matchKits(lines, [{ ...scarf, scope: '仅内部原型' }]), []);
  assert.deepEqual(matchKits(lines, [{ ...scarf, materials: [yarn(null, 1)] }]), []);
  assert.deepEqual(matchKits(lines, [{ ...scarf, materials: [yarn('gid://shopify/ProductVariant/1', 1, { supply: '信息待补充' })] }]), []);
});

test('a yarn without a stated quantity still needs at least one ball', async () => {
  const { matchKits } = await load();
  const kit = { ...scarf, materials: [yarn('gid://shopify/ProductVariant/1', 0)] };
  assert.equal(matchKits([], [kit]).length, 0);
  assert.equal(matchKits([{ merchandise: { id: 'gid://shopify/ProductVariant/1' }, quantity: 1 }], [kit]).length, 1);
});

test('storefront data is flattened and the LINE link carries the prefilled message', async () => {
  const { kitsFromStorefront, claimMessage, lineUrl } = await load();
  const kits = kitsFromStorefront({ metaobjects: { nodes: [{
    handle: 'k', title: { value: '围巾' }, scope: { value: '已核实可公开' }, onlineStoreUrl: 'https://hitoami.com/pages/projects/k',
    components: { references: { nodes: [{ variant: { reference: { id: 'v1' } }, quantity: { value: '4' }, supply: { value: '本店提供' }, type: { value: '毛线' } }] } },
  }] } });
  assert.deepEqual(kits[0].materials, [{ variantId: 'v1', quantity: 4, supply: '本店提供', type: '毛线' }]);
  const text = claimMessage('订单号：{order}\n作品：{kit}', { order: '#1042', kit: '围巾' });
  assert.equal(text, '订单号：#1042\n作品：围巾');
  assert.equal(lineUrl('hitoami', text), `https://line.me/R/oaMessage/%40hitoami/?${encodeURIComponent(text)}`);
});
