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

const { metresPer100g, weightBand, readState, writeState } = require('../assets/yarn-collection-browse.js');

test('243: weight comes only from grams and metres in the localized spec line', () => {
  assert.equal(metresPer100g('50g · 約75m'), 150);
  assert.equal(metresPer100g('100g · 约160m'), 160);
  assert.equal(metresPer100g('50g · Approx. 330m'), 660);
  assert.equal(metresPer100g('50g｜约120m/团（±2m）'), 240);
  assert.equal(metresPer100g('200g · 约458±20m'), 229);
  assert.equal(metresPer100g('350g｜6股｜约1750米；500g｜6股｜约2500米'), 500);
  for (const missing of ['50g', '50g（±2g）', '330～350g/筒', '规格见商品详情', '', undefined]) assert.equal(metresPer100g(missing), null);
  assert.deepEqual([68, 100, 101, 200, 350, 351, 800, 1040, null].map(weightBand), [0, 0, 1, 1, 2, 3, 3, 4, null]);
});

test('243: view and weight survive category links; compare and "you are here" do not', () => {
  const state = readState(new URLSearchParams('ycb_view=map&ycb_weight=3&ycb_cmp=fluffy,loop-fancy&ycb_here=mvp-yarn-01'));
  assert.deepEqual(state, { view: 'map', weight: 3, beginner: false, cmp: ['fluffy', 'loop-fancy'], here: 'mvp-yarn-01' });
  const link = writeState(new URLSearchParams('filter.p.m.yarn.texture=gid%3A1'), state, { keepVisit: false });
  assert.equal(link.toString(), 'filter.p.m.yarn.texture=gid%3A1&ycb_view=map&ycb_weight=3');
  assert.equal(readState(new URLSearchParams('ycb_weight=9')).weight, null);
  assert.equal(readState(new URLSearchParams('ycb_weight=0')).weight, 0);
});

test('284: the beginner filter is kept in the URL and survives category links like the weight filter', () => {
  const state = readState(new URLSearchParams('ycb_beginner=1&ycb_weight=1'));
  assert.equal(state.beginner, true);
  assert.equal(readState(new URLSearchParams('ycb_beginner=yes')).beginner, false);
  const link = writeState(new URLSearchParams('filter.p.m.yarn.texture=gid%3A1'), state, { keepVisit: false });
  assert.equal(link.get('ycb_beginner'), '1');
  assert.equal(link.get('ycb_weight'), '1');
});

test('284: beginner chip and header entry only render when a yarn has a beginner reason', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(section, /if cb_beginner_first != blank/);
  assert.match(section, /data-ycb-beginner-item/);
  const header = fs.readFileSync('sections/header.liquid', 'utf8');
  assert.match(header, /render 'yarn-beginner-first', beginner_collection: section.settings.drawer_yarn_collection/);
  for (const file of ['snippets/yarn-header-menu.liquid', 'snippets/yarn-header-drawer.liquid']) {
    assert.match(fs.readFileSync(file, 'utf8'), /first_time != blank[\s\S]*\?ycb_beginner=1/);
  }
});
