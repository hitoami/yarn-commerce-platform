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

test('keeps the selected variant and redesigned #394 catalog/search facet state while dropping retired keys', () => {
  const current = 'https://hitoami.com/collections/yarn?variant=42&ycb_thick=fine&ycb_color=variegated&ycb_fiber=wool&ycb_works=scarf&ycb_grams=mid&ycb_feature=fluffy&ycb_beginner=1&filter.v.availability=1&filter.v.price.gte=500&sort_by=price-ascending&ycb_view=map&ycb_weight=3';
  const next = new URL(languageUrl('/en/collections/yarn', current));
  assert.equal(next.searchParams.get('variant'), '42');
  assert.equal(next.searchParams.get('ycb_thick'), 'fine');
  assert.equal(next.searchParams.get('ycb_color'), 'variegated');
  assert.equal(next.searchParams.get('ycb_fiber'), 'wool');
  assert.equal(next.searchParams.get('ycb_works'), 'scarf');
  assert.equal(next.searchParams.get('ycb_grams'), 'mid');
  assert.equal(next.searchParams.get('ycb_feature'), 'fluffy');
  assert.equal(next.searchParams.get('ycb_beginner'), '1');
  assert.equal(next.searchParams.get('filter.v.availability'), '1');
  assert.equal(next.searchParams.get('filter.v.price.gte'), '500');
  assert.equal(next.searchParams.get('sort_by'), 'price-ascending');
  for (const retired of ['ycb_view', 'ycb_weight']) assert.equal(next.searchParams.has(retired), false);
});

test('never copies state to a cross-origin destination', () => {
  assert.equal(languageUrl('https://evil.test', 'https://hitoami.com/?q=private'), 'https://evil.test');
});
