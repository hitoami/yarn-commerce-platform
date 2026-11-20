const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { applyBand, activeBand, readState, writeState, matches, countOptions, isFiltered, readEntry } = require('../assets/yarn-collection-browse.js');

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

test('the collection template uses the catalogue section, one entry per nav / homepage entrance, and LINE help', () => {
  const template = JSON.parse(fs.readFileSync('templates/collection.json', 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  assert.deepEqual(template.order.map((key) => template.sections[key].type), ['yarn-collection-browse', 'yarn-line-contact']);
  const browse = template.sections[template.order[0]];
  assert.equal(browse.settings.handmade_collections, 'finished-goods');
  const entries = Object.values(browse.blocks).filter((block) => block.type === 'entry');
  const filters = entries.map((block) => block.settings.filter);
  for (const f of ['beginner:yes', 'color:variegated', 'color:solid', 'thick:fine', 'thick:medium', 'thick:chunky', 'works:sweater', 'works:hat', 'works:scarf', 'works:blanket', 'works:bag', 'works:doll']) assert.ok(filters.includes(f), f);
  for (const block of entries) for (const key of ['title', 'title_zh', 'title_en', 'lead', 'lead_zh', 'lead_en']) assert.ok(block.settings[key]?.trim(), `${block.settings.filter} ${key}`);
});

test('catalogue section reuses the shared yarn card and never invents placeholder products', () => {
  const liquid = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(liquid, /render 'yarn-pick-card', card_product: product, eager: cb_eager, clean_title: true, card_line: true/);
  assert.match(liquid, /collection\.all_products_count == 0/);
  const placeholder = liquid.slice(liquid.indexOf('ycb-grid--placeholder'), liquid.indexOf('ycb-exits'));
  assert.doesNotMatch(placeholder, /product\.|price|money/);
  assert.doesNotMatch(liquid.split('{% schema %}')[0], /\| t: count:/, 'count triggers Shopify plural keys');
  const card = fs.readFileSync('snippets/yarn-pick-card.liquid', 'utf8');
  assert.match(card, /if card_line and card_product\.metafields\.yarn\.card_line\.value != blank/);
});

const NONE = { thick: [], color: [], fiber: [], works: [], grams: [], feature: [] };
const items = [
  ' thick:fine fiber:wool_blend color:solid grams:small feature:fluffy ',
  ' thick:fine fiber:wool works:hat beginner:yes grams:mid ',
  ' thick:medium fiber:wool works:hat grams:big ',
  ' thick:chunky fiber:synthetic grams:big beginner:yes ',
  ' fiber:cotton ',
];

test('2026-11-20: the top chips and the hand-feel map are gone; entry head, circles and refine rows replace them', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8').split('{% schema %}')[0];
  for (const gone of ['data-ycb-chip=', 'data-ycb-view', 'yarn-collection-map', 'ycb-chips', 'data-ycb-cat=', 'all_categories']) assert.ok(!section.includes(gone), gone);
  for (const file of ['snippets/yarn-collection-map.liquid', 'snippets/yarn-pdp-map-link.liquid', 'snippets/yarn-weight-strand.liquid']) assert.ok(!fs.existsSync(file), file);
  assert.doesNotMatch(fs.readFileSync('sections/main-product.liquid', 'utf8'), /yarn-pdp-map-link/);
  // 页头换成入口；圆图按组切换；细筛每组一行、与导航同一组值。
  assert.match(section, /data-ycb-title/);
  assert.match(section, /<template data-ycb-entries>/);
  assert.match(section, /data-ycb-circles="\{\{ cb_circle_group \}\}"/);
  assert.match(section, /data-ycb-row="\{\{ cb_group \}\}"/);
  assert.match(section, /data-ycb-opt="\{\{ cb_group \}\}:\{\{ cb_value \}\}"/);
  assert.match(section, /data-ycb-near/);
  const nav = fs.readFileSync('snippets/yarn-nav-facet-links.liquid', 'utf8');
  for (const [group, values] of Object.entries({ thick: 'fine,medium,chunky', color: 'solid,variegated', fiber: 'wool,wool_blend,cotton,synthetic', works: 'sweater,hat,scarf,blanket,bag,doll' })) {
    assert.ok(nav.includes(values.split(',').map((v) => `${group}:${v}`).join(',')), group);
    assert.ok(section.includes(`${group}:${values}`), group);
  }
});

test('2026-11-20: the entry is the first ycb_* filter in the URL; options in one row OR, rows AND', () => {
  assert.equal(readEntry(params('ycb_color=variegated&ycb_fiber=wool,cotton')), 'color:variegated');
  assert.equal(readEntry(params('ycb_beginner=1&ycb_thick=fine')), 'beginner:yes');
  assert.equal(readEntry(params('sort_by=manual')), '');
  const state = readState(params('ycb_works=hat&ycb_fiber=wool,wool_blend&ycb_color=<script>'));
  assert.deepEqual(state.facets, { ...NONE, works: ['hat'], fiber: ['wool', 'wool_blend'] });
  assert.equal(state.entry, 'works:hat');
  assert.equal(matches(' fiber:wool_blend works:hat ', state), true, '同一行多选取并集');
  assert.equal(matches(' fiber:cotton works:hat ', state), false);
  assert.equal(matches(' fiber:wool ', state), false, '不同行取交集');
  assert.equal(matches(' fiber:wool ', readState(params('ycb_beginner=1'))), false);
  assert.equal(isFiltered(readState(params(''))), false);
  assert.equal(isFiltered(readState(params('ycb_thick=fine'))), true);
});

test('counts follow the other active filters (navigation and the collection page agree)', () => {
  const none = countOptions(items, readState(params('')));
  assert.equal(none.all, 5);
  assert.equal(none['thick:fine'], 2);
  assert.equal(none['beginner:yes'], 2);
  const wool = countOptions(items, readState(params('ycb_fiber=wool')));
  assert.equal(wool.all, 2);
  assert.equal(wool['thick:fine'], 1, '粗细的款数只算羊毛');
  assert.equal(wool['thick:chunky'] || 0, 0);
  assert.equal(wool['fiber:wool_blend'], 1, '同组的其他选项不被本组条件压成 0');
});

test('state rides the URL with the entry first; retired map / compare params are dropped', () => {
  const state = { ...readState(params('ycb_view=map&ycb_here=x&ycb_fiber=cotton&ycb_color=variegated')), entry: 'color:variegated' };
  const link = writeState(params('filter.v.availability=1&ycb_weight=3&ycb_cmp=a,b&ycb_view=map&ycb_here=x'), state);
  assert.equal(link.toString(), 'filter.v.availability=1&ycb_color=variegated&ycb_fiber=cotton');
  assert.equal(readEntry(link), 'color:variegated', '重开页面仍认得入口');
  assert.equal(writeState(params(''), { facets: { ...NONE, fiber: ['wool', 'cotton'] }, beginner: false, entry: '' }).toString(), 'ycb_fiber=wool%2Ccotton');
});

test('284: beginner row only renders when a yarn has a beginner reason; reasons show when it is on', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(section, /cb_tokens contains ' beginner:yes '/);
  assert.match(section, /data-ycb-opt="beginner:yes"/);
  assert.match(fs.readFileSync('assets/yarn-collection-browse.css', 'utf8'), /\.ycb\[data-ycb-beginner-on\] \.ycb-reason \{ display: block; \}/);
});

test('355: list cards carry yarn-facets tokens; price and stock live in the drawer', () => {
  const section = fs.readFileSync('sections/yarn-collection-browse.liquid', 'utf8');
  assert.match(section, /data-ycb-facets="\{%- render 'yarn-facets', product: product -%\}"/);
  assert.match(section, /grams:small,mid,big/);
  assert.match(section, /data-ycb-facet="\{\{ cb_facet_pair\[0\] \}\}:\{\{ cb_facet_value \}\}"/);
  assert.match(section, /'yarn_collection\.more_filters' \| t/);
  const facets = fs.readFileSync('snippets/yarn-facets.liquid', 'utf8');
  for (const field of ['thickness', 'ball_length_m', 'ball_weight_g', 'composition', 'color_type', 'works', 'fluffy', 'crochet']) assert.match(facets, new RegExp(`metafields\\.yarn\\.${field}`), field);
});

test('366: collection pages use the translated collection name in <title>', () => {
  assert.match(fs.readFileSync('layout/theme.liquid', 'utf8'), /template\.name == 'collection' and collection\.title != blank/);
});
