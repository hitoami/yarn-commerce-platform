const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { applyBand, activeBand, readState, writeState, matches, countOptions, isFiltered } = require('../assets/yarn-collection-browse.js');

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

test('the collection template uses the catalogue section with the approved category order and LINE help', () => {
  const template = JSON.parse(fs.readFileSync('templates/collection.json', 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  assert.deepEqual(template.order.map((key) => template.sections[key].type), ['yarn-collection-browse', 'yarn-line-contact']);
  const browse = template.sections[template.order[0]];
  assert.match(browse.settings.category_order, /^gradient,fluffy,loop-fancy,fine-airy,basic-solid/);
  assert.equal(browse.settings.handmade_collections, 'finished-goods');
});

test('catalogue section reuses the shared yarn card and never invents placeholder products', () => {
  const liquid = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(liquid, /render 'yarn-pick-card', card_product: product/);
  assert.match(liquid, /collection\.all_products_count == 0/);
  const placeholder = liquid.slice(liquid.indexOf('ycb-grid--placeholder'), liquid.indexOf('ycb-exits'));
  assert.doesNotMatch(placeholder, /product\.|price|money/);
  assert.doesNotMatch(liquid.split('{% schema %}')[0], /\| t: count:/, 'count triggers Shopify plural keys');
});

const NONE = { thick: '', color: '', fiber: '', works: '', grams: '' };
const items = [
  ' thick:fine fiber:mohair color:solid grams:small ',
  ' thick:fine fiber:wool works:hat beginner:yes grams:mid ',
  ' thick:medium fiber:wool works:hat grams:big ',
  ' thick:chunky fiber:synthetic grams:big beginner:yes ',
  ' fiber:cotton ',
];

test('366: one filter set — the old category chips, 5-band weight and 「全部分类」 are gone', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8').split('{% schema %}')[0];
  for (const gone of ['data-ycb-cat=', 'data-ycb-weight', 'data-ycb-cats-open', 'all_categories', 'yarn-beginner-first']) assert.ok(!section.includes(gone), gone);
  const map = fs.readFileSync('snippets/yarn-collection-map.liquid', 'utf8');
  for (const gone of ['data-ycb-weight-sheet', 'data-ycb-cats-sheet', 'band_']) assert.ok(!map.includes(gone), gone);
  // 顶部胶囊名字与导航一致（同一组文案键），抽屉选项与 yarn-nav-facet-links 同一组值。
  assert.match(section, /data-ycb-chip="thick:\{\{ cb_value \}\}"/);
  assert.match(section, /'yarn_collection\.facet_thick_' \| append: cb_value/);
  const nav = fs.readFileSync('snippets/yarn-nav-facet-links.liquid', 'utf8');
  for (const values of ['fine,medium,chunky', 'solid,variegated,gradient,heather,rainbow', 'wool,wool_blend,mohair,synthetic,cotton', 'sweater,hat,scarf,blanket,bag,doll']) {
    assert.ok(nav.includes(values), values);
    assert.ok(section.includes(values), values);
  }
  // 「显示更多」不再请求未筛过的下一页。
  assert.doesNotMatch(fs.readFileSync('assets/yarn-collection-browse.js', 'utf8'), /data-ycb-next\]'\)\?\.addEventListener|nextPageUrl/);
});

test('366: filters match whole tokens and combine across groups', () => {
  const state = readState(new URLSearchParams('ycb_fiber=wool&ycb_works=hat&ycb_color=<script>'));
  assert.deepEqual(state.facets, { ...NONE, fiber: 'wool', works: 'hat' });
  assert.equal(matches(' fiber:wool_blend works:hat ', state), false, '「羊毛」不能把「羊毛混纺」也筛进来');
  assert.equal(matches(' thick:fine fiber:wool works:sweater works:hat ', state), true);
  assert.equal(matches(' fiber:wool ', state), false);
  assert.equal(matches('', readState(new URLSearchParams(''))), true);
  assert.equal(matches(' fiber:wool ', readState(new URLSearchParams('ycb_beginner=1'))), false);
  assert.equal(isFiltered(readState(new URLSearchParams('ycb_view=map'))), false);
  assert.equal(isFiltered(readState(new URLSearchParams('ycb_thick=fine'))), true);
});

test('366: counts follow the other active filters (navigation and the collection page agree)', () => {
  const none = countOptions(items, readState(new URLSearchParams('')));
  assert.equal(none.all, 5);
  assert.equal(none['thick:fine'], 2);
  assert.equal(none['beginner:yes'], 2);
  const wool = countOptions(items, readState(new URLSearchParams('ycb_fiber=wool')));
  assert.equal(wool.all, 2);
  assert.equal(wool['thick:fine'], 1, '粗细的款数只算羊毛');
  assert.equal(wool['thick:chunky'] || 0, 0);
  assert.equal(wool['fiber:mohair'], 1, '同组的其他选项不被本组条件压成 0');
  const fine = countOptions(items, readState(new URLSearchParams('ycb_thick=fine')));
  assert.equal(fine['thick:medium'], 1);
  assert.equal(fine.all, 2);
});

test('366: state rides the URL; old weight / compare params are dropped and "you are here" stays out of links', () => {
  const state = readState(new URLSearchParams('ycb_view=map&ycb_thick=fine&ycb_beginner=1&ycb_here=mvp-yarn-01'));
  assert.deepEqual(state, { facets: { ...NONE, thick: 'fine' }, view: 'map', beginner: true, here: 'mvp-yarn-01' });
  const link = writeState(new URLSearchParams('filter.v.availability=1&ycb_weight=3&ycb_cmp=a,b'), state, { keepVisit: false });
  assert.equal(link.toString(), 'filter.v.availability=1&ycb_view=map&ycb_beginner=1&ycb_thick=fine');
  assert.equal(writeState(new URLSearchParams(), state).get('ycb_here'), 'mvp-yarn-01');
  assert.equal(readState(new URLSearchParams('ycb_beginner=yes')).beginner, false);
});

test('284: beginner chip only renders when a yarn has a beginner reason; the header links it from 想织什么 (#365)', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(section, /cb_tokens contains ' beginner:yes '/);
  assert.match(section, /data-ycb-chip="beginner:yes"/);
});

test('355: list cards carry yarn-facets tokens; ball weight / big balls live in the filter drawer', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(section, /data-ycb-facets="\{%- render 'yarn-facets', product: product -%\}"/);
  assert.match(section, /name="ycb_\{\{ cb_group \}\}" value="\{\{ cb_value \}\}" data-ycb-facet-input/);
  assert.match(section, /grams:small,mid,big/);
  assert.match(section, /data-ycb-facet="\{\{ cb_facet_pair\[0\] \}\}:\{\{ cb_facet_value \}\}"/);
  const facets = fs.readFileSync('snippets/yarn-facets.liquid', 'utf8');
  for (const field of ['ball_length_m', 'ball_weight_g', 'composition', 'color_type', 'works']) assert.match(facets, new RegExp(`metafields\\.yarn\\.${field}`), field);
  for (const word of ['ウール', 'wool', 'モヘア', 'コットン', 'cotton', '綿']) assert.ok(facets.includes(word), word);
});

test('366: collection pages use the translated collection name in <title>', () => {
  assert.match(fs.readFileSync('layout/theme.liquid', 'utf8'), /template\.name == 'collection' and collection\.title != blank/);
});
