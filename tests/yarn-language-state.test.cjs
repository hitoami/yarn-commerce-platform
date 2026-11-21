const { test } = require('node:test');
const assert = require('node:assert/strict');
const { languageUrl } = require('../assets/yarn-language-state.js');

test('language links keep repeated filters, search grouping and preview while dropping request internals', () => {
  const current = 'https://hitoami.com/zh/search?q=%E7%BA%BF&group=yarn&filter.p.tag=a&filter.p.tag=b&preview_theme_id=123&section_id=x&page=3&return_url=https://evil.test';
  const next = new URL(languageUrl('/en/search', current));
  assert.equal(next.pathname, '/en/search');
  assert.equal(next.searchParams.get('q'), '线');
  assert.equal(next.searchParams.get('group'), 'yarn');
  assert.deepEqual(next.searchParams.getAll('filter.p.tag'), ['a', 'b']);
  assert.equal(next.searchParams.get('preview_theme_id'), '123');
  for (const key of ['section_id', 'page', 'return_url']) assert.equal(next.searchParams.has(key), false);
});
test('keeps the selected variant and live catalog state', () => {
  const next = new URL(languageUrl('/en/products/yarn', 'https://hitoami.com/products/yarn?variant=42&ycb_view=map&ycb_weight=3&ycb_beginner=1&sort_by=price-ascending'));
  assert.equal(next.searchParams.get('variant'), '42');
  assert.equal(next.searchParams.get('ycb_view'), 'map');
  assert.equal(next.searchParams.get('ycb_weight'), '3');
  assert.equal(next.searchParams.get('ycb_beginner'), '1');
  assert.equal(next.searchParams.get('sort_by'), 'price-ascending');
});
test('never copies state to a cross-origin destination', () => {
  assert.equal(languageUrl('https://evil.test', 'https://hitoami.com/?q=private'), 'https://evil.test');
});
