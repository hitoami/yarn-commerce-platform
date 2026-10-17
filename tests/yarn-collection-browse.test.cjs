const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { applyBand, activeBand, nextPageUrl } = require('../assets/yarn-collection-browse.js');

const params = (value) => new URLSearchParams(value);
const bands = ['filter.v.price.lte=499', 'filter.v.price.gte=500&filter.v.price.lte=1499', 'filter.v.price.gte=1500'];

test('a price band replaces both bounds and keeps category, stock and sort', () => {
  const next = applyBand(params('filter.p.m.yarn.texture=gid%3A1&filter.v.availability=1&filter.v.price.lte=499&sort_by=price-ascending&page=3&ycb_price=x'), bands[2]);
  assert.equal(next.get('filter.v.price.gte'), '1500');
  assert.equal(next.has('filter.v.price.lte'), false);
  assert.equal(next.get('filter.p.m.yarn.texture'), 'gid:1');
  assert.equal(next.get('filter.v.availability'), '1');
  assert.equal(next.get('sort_by'), 'price-ascending');
  assert.equal(next.has('page'), false);
  assert.equal(next.has('ycb_price'), false);
  assert.equal(applyBand(params('filter.v.price.gte=500'), '').has('filter.v.price.gte'), false);
});

test('the active band survives Shopify rewriting 500 as 500.0 and never matches a partial range', () => {
  assert.equal(activeBand(params('filter.v.price.gte=500.0&filter.v.price.lte=1499.0'), bands), bands[1]);
  assert.equal(activeBand(params('filter.v.price.gte=500'), bands), null);
  assert.equal(activeBand(params(''), bands), null);
});

test('show more only appends pages of the same collection and keeps the draft preview', () => {
  const href = 'https://shop.example/zh/collections/yarn?preview_theme_id=42';
  assert.equal(nextPageUrl('/zh/collections/yarn?page=2', href).searchParams.get('preview_theme_id'), '42');
  for (const target of ['https://evil.example/zh/collections/yarn?page=2', '/zh/collections/other?page=2']) assert.throws(() => nextPageUrl(target, href));
});

test('the collection template uses the catalogue section with the approved category order and LINE help', () => {
  const template = JSON.parse(fs.readFileSync('templates/collection.json', 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  assert.deepEqual(template.order.map((key) => template.sections[key].type), ['yarn-collection-browse', 'yarn-line-contact']);
  const browse = template.sections[template.order[0]];
  assert.match(browse.settings.category_order, /^gradient,fluffy,loop-fancy,fine-airy,basic-solid/);
  assert.equal(browse.settings.handmade_collections, 'finished-goods');
});

test('catalogue section reuses the shared yarn card, hides empty categories and never invents placeholder products', () => {
  const liquid = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(liquid, /render 'yarn-pick-card', card_product: product/);
  assert.match(liquid, /value\.count == 0 and value\.active == false/);
  assert.match(liquid, /collection\.all_products_count == 0/);
  const placeholder = liquid.slice(liquid.indexOf('ycb-grid--placeholder'), liquid.indexOf('ycb-exits'));
  assert.doesNotMatch(placeholder, /product\.|price|money/);
  assert.doesNotMatch(liquid.split('{% schema %}')[0], /\| t: count:/, 'count triggers Shopify plural keys');
});
