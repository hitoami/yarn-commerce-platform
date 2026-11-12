const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectLeak } = require('../scripts/proof-lang.cjs');

test('Japanese page: flags simplified Chinese and English phrases, keeps Japanese and shared kanji', () => {
  assert.equal(detectLeak('毛糸を選ぶ', 'ja'), null);
  assert.equal(detectLeak('商品一覧', 'ja'), null);
  assert.equal(detectLeak('挑选毛线', 'ja'), 'zh');
  assert.equal(detectLeak('Add to cart', 'ja'), 'en');
  assert.equal(detectLeak('Mokomoko', 'ja'), null);
  assert.equal(detectLeak('50g / 120cm', 'ja'), null);
});

test('Chinese page: flags kana, Japanese-only kanji and English phrases', () => {
  assert.equal(detectLeak('挑一团好线', 'zh'), null);
  assert.equal(detectLeak('カートに追加', 'zh'), 'ja');
  assert.equal(detectLeak('検索', 'zh'), 'ja');
  assert.equal(detectLeak('SHOPPING GUIDE', 'zh'), 'en');
  assert.equal(detectLeak('联系 hello@example.com', 'zh'), null);
});

test('English page: flags any CJK text and names the likely source', () => {
  assert.equal(detectLeak('Pick a good yarn', 'en'), null);
  assert.equal(detectLeak('颜色', 'en'), 'zh');
  assert.equal(detectLeak('毛糸', 'en'), 'ja');
  assert.equal(detectLeak('商品', 'en'), 'zh/ja');
});

const { validateFlows } = require('../scripts/proof.cjs');
const proofConfig = require('../scripts/proof.config.cjs');

test('277: every configured click flow is well formed', () => {
  assert.doesNotThrow(() => validateFlows(proofConfig.pages));
  assert.ok(proofConfig.pages.some(page => (page.flows || []).length), 'at least one page has a flow');
});

test('277: a flow step must do exactly one thing and expectations need a minimum and a label', () => {
  const page = (steps) => [{ key: 'p', flows: [{ key: 'f', label: 'F', steps }] }];
  assert.throws(() => validateFlows(page([{ click: 'a', wait: 1 }])), /只能有一种动作/);
  assert.throws(() => validateFlows(page([{ jump: 'a' }])), /只能有一种动作/);
  assert.throws(() => validateFlows(page([{ expect: '.x', label: 'x' }])), /minimum/);
  assert.throws(() => validateFlows([{ key: 'p', flows: [{ key: 'f', steps: [] }] }]), /缺 key/);
});
