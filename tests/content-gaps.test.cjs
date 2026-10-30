const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findGaps, renderGaps } = require('../scripts/content-gaps.cjs');

const yarn = (overrides = {}) => ({
  handle: 'yarn-a', title: '莫兰迪羊毛线', productType: '毛线', tags: ['catalog-2026-10'],
  descriptionHtml: '<p>适合毛线帽</p>', tracksInventory: true, totalInventory: 12,
  variantsCount: 4, mediaCount: 3,
  metafields: [
    { key: 'composition', value: '100%美利奴羊毛' }, { key: 'ball_weight_g', value: '50' },
    { key: 'ball_length_m', value: '75.0' }, { key: 'spec_line', value: '50g · 约75m' },
    { key: 'short_description', value: '适合毛线帽' },
  ],
  translations: [{ key: 'title', value: 'メリノ', outdated: false }, { key: 'body_html', value: '<p>帽子</p>', outdated: false }],
  ...overrides,
});

const field = (key, value, references) => ({ key, value, references: references ? { nodes: references } : null });
const kit = (fields, displayName = '流苏围巾') => ({ handle: 'kit-a', displayName, fields });
const finished = yarn({ handle: 'piece', title: '手编杯垫', productType: '手工成品', tags: [] });

test('a complete yarn and a finished piece produce no questions', () => {
  const gaps = findGaps({ products: [yarn(), finished], projects: [] });
  assert.deepEqual(gaps.ask, {});
  assert.deepEqual(gaps.dev, {});
});

test('single default variant, untracked stock and missing specs become questions for sourcing', () => {
  const product = yarn({ variantsCount: 1, tracksInventory: false, mediaCount: 1, metafields: [] });
  const gaps = findGaps({ products: [product, finished], projects: [] });
  assert.deepEqual(Object.keys(gaps.ask), ['colors', 'untracked', 'composition', 'ballWeight', 'ballLength', 'photos']);
  assert.deepEqual(gaps.ask.colors, [{ item: '莫兰迪羊毛线' }]);
});

test('tracked stock at zero asks about restock instead of tracking', () => {
  const gaps = findGaps({ products: [yarn({ totalInventory: 0 }), finished], projects: [] });
  assert.deepEqual(Object.keys(gaps.ask), ['soldOut']);
});

test('translations, summary and spec line are dev tasks, never questions', () => {
  const product = yarn({
    translations: [{ key: 'title', value: 'old', outdated: true }],
    metafields: [{ key: 'composition', value: '羊毛' }, { key: 'ball_weight_g', value: '50' }, { key: 'ball_length_m', value: '75' }],
  });
  const gaps = findGaps({ products: [product, finished], projects: [] });
  assert.deepEqual(gaps.ask, {});
  assert.deepEqual(Object.keys(gaps.dev), ['translateTitle', 'translateBody', 'shortDescription', 'specLine']);
});

test('only public kits are checked: reference cover, contact-page tutorial and incomplete yarn rows', () => {
  const yarnRow = (title, variant, quantity) => ({ handle: title, fields: [
    { key: 'title', value: title }, { key: 'component_type', value: '毛线' },
    { key: 'variant', value: variant }, { key: 'quantity', value: quantity },
  ] });
  const tool = { handle: 'hook', fields: [{ key: 'title', value: '钩针' }, { key: 'component_type', value: '工具' }] };
  const publicKit = kit([
    field('release_scope', '已核实可公开'),
    field('cover', 'gid://shopify/MediaImage/1'),
    field('source_credit', '参考图来自小红书；正式上线前替换'),
    field('tutorial_url', 'https://hitoami.com/pages/contact'),
    field('components', '[]', [yarnRow('主线', 'gid://shopify/ProductVariant/1', null), yarnRow('配线', null, '2'), tool]),
  ]);
  const internalKit = kit([field('release_scope', '仅内部原型')], '内部样例');
  const gaps = findGaps({ products: [finished], projects: [publicKit, internalKit] });
  assert.equal(gaps.kitCount, 1);
  assert.deepEqual(gaps.ask.kitCover, [{ item: '流苏围巾', note: '参考图来自小红书；正式上线前替换' }]);
  assert.deepEqual(gaps.ask.kitTutorial, [{ item: '流苏围巾' }]);
  assert.deepEqual(gaps.ask.kitBalls, [{ item: '流苏围巾 · 主线' }]);
  assert.deepEqual(gaps.ask.kitYarn, [{ item: '流苏围巾 · 配线' }]);
});

test('no finished piece in the store asks when the first batch arrives', () => {
  const gaps = findGaps({ products: [yarn()], projects: [] });
  assert.deepEqual(Object.keys(gaps.ask), ['noFinished']);
});

test('report groups one fill-in table per question and lists dev tasks separately', () => {
  const products = [
    yarn({ variantsCount: 1, title: '圈圈|纱' }),
    yarn({ handle: 'yarn-b', title: '雪宝', variantsCount: 1, translations: [] }),
    finished,
  ];
  const md = renderGaps(findGaps({ products, projects: [] }), '2026-10-17');
  assert.match(md, /^# 内容缺口报告（2026-10-17）/);
  assert.match(md, /### 1\. 现在卖哪几个色号？（2 项）/);
  assert.match(md, /\| 圈圈｜纱 \| \|/);
  assert.match(md, /## 开发自己补\n\n- 翻译日文商品名：1 款（yarn-b）/);
  assert.ok(md.indexOf('## 请选品回答') < md.indexOf('## 开发自己补'));
});
