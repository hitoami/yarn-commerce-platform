const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stateFromSearch, queryState, urlWithState, matchesEntity, categoryForQuery, paginationUrl, fill } = require('../assets/yarn-search.js');
const { endpointUrl } = require('../assets/yarn-favorites.js');

const sunrise = { type: 'product', id: '1', group: 'yarn', title: '印象·日出', summary: '长段染 段染渐变 100g', tags: '毛糸' };
const scarf = { type: 'project', id: '2', group: 'kit', title: '雪宝段染｜流苏围巾', summary: '秋冬的流苏长围巾', tags: '' };
const bag = { type: 'project', id: '3', group: 'kit', title: '小怪兽斜挎包', summary: '彩色段染', tags: '' };
const categories = [
  { name: '段染渐变', aliases: ['グラデーション', 'gradient'], href: '/collections/yarn?filter=g' },
  { name: '毛绒绒', aliases: [], href: '/collections/yarn?filter=f' },
];

test('a keyword matches each entity own copy across yarn, kit and finished groups', () => {
  assert.equal(matchesEntity(sunrise, queryState('段染')), true);
  assert.equal(matchesEntity(bag, queryState('段染')), true);
  assert.equal(matchesEntity(scarf, queryState('围巾')), true);
  assert.equal(matchesEntity(sunrise, queryState('围巾')), false);
  assert.equal(matchesEntity(sunrise, queryState('段染 100G')), true);
});

test('group tabs narrow results without dropping the keyword', () => {
  const state = { ...queryState('段染'), group: 'kit' };
  assert.equal(matchesEntity(sunrise, state), false);
  assert.equal(matchesEntity(bag, state), true);
  assert.deepEqual(stateFromSearch(urlWithState('https://example.com/zh/search?q=段染', state).search), state);
});

test('legacy purchase and category filters are dropped from the URL and ignored on load', () => {
  const href = 'https://example.com/zh/search?q=x&category=home&purchase=finished&project_q=old&page_a=2&section_id=s&preview_theme_id=42';
  const next = urlWithState(href, queryState('cotton'));
  assert.equal(next.searchParams.get('preview_theme_id'), '42');
  for (const key of ['category', 'purchase', 'project_q', 'page_a', 'section_id', 'group']) assert.equal(next.searchParams.has(key), false);
  assert.deepEqual(stateFromSearch('?group=bag&browse=projects&purchase=finished'), queryState(''));
});

test('only keywords naming a yarn category link to the catalogue', () => {
  assert.equal(categoryForQuery('段染', categories)?.name, '段染渐变');
  assert.equal(categoryForQuery('段染渐变', categories)?.name, '段染渐变');
  assert.equal(categoryForQuery('Gradient', categories)?.name, '段染渐变');
  assert.equal(categoryForQuery('毛绒绒的围巾', categories)?.name, '毛绒绒');
  for (const query of ['蓝色', '马海毛', '段', '', '围巾']) assert.equal(categoryForQuery(query, categories), null);
});

test('templates fill every placeholder', () => {
  assert.equal(fill('找到 [count] 个和「[query]」有关的结果', { count: 6, query: '段染' }), '找到 6 个和「段染」有关的结果');
  assert.equal(fill('[name]分类 →', { name: '段染渐变' }), '段染渐变分类 →');
});

test('favorites filter keys keep projects and products with identical IDs distinct', () => {
  const state = { ...queryState(''), browse: 'favorites' };
  assert.equal(matchesEntity({ ...scarf, id: '1' }, state, new Set(['product:1'])), false);
  assert.equal(matchesEntity(sunrise, state, new Set(['product:1'])), true);
});

test('pagination cannot leave the localized route or section and retains draft preview', () => {
  const href = 'https://example.com/zh/search?q=basket&preview_theme_id=42';
  assert.equal(paginationUrl('?page_a=2&section_id=s', href, 's').searchParams.get('preview_theme_id'), '42');
  for (const target of ['https://evil.example/zh/search?section_id=s', '/search?section_id=s', '?section_id=other']) assert.throws(() => paginationUrl(target, href, 's'));
});

test('favorites endpoint must stay on the shop proxy path without credential-bearing query strings', () => {
  const href = 'https://shop.example/zh/search';
  assert.equal(endpointUrl('/apps/yarn-favorites', href).origin, 'https://shop.example');
  for (const value of ['', 'https://evil.example/apps/favorites', '/admin', '/apps/favorites?token=secret']) assert.throws(() => endpointUrl(value, href));
});

test('search section renders the three groups and no longer ships the old filters', () => {
  const liquid = fs.readFileSync(path.join(__dirname, '../sections/yarn-search.liquid'), 'utf8');
  for (const group of ['yarn', 'kit', 'finished']) {
    assert.match(liquid, new RegExp(`data-search-group="${group}"`));
    assert.match(liquid, new RegExp(`data-search-tab="${group}"`));
  }
  assert.match(liquid, /render 'yarn-kit-visible'/);
  assert.doesNotMatch(liquid, /inline_purchase|data-search-filter|'all,bag,scarf,home,toy'/);
});
