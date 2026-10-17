const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const section = fs.readFileSync('sections/yarn-project-discovery.liquid', 'utf8');
const card = fs.readFileSync('snippets/yarn-work-card.liquid', 'utf8');
const schema = JSON.parse(section.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const index = JSON.parse(fs.readFileSync('templates/index.json', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
const source = fs.readFileSync('assets/yarn-project-discovery.js', 'utf8');
const context = { HTMLElement: class {}, customElements: { get: () => true }, URL };
vm.createContext(context);
const Discovery = vm.runInContext(source + '\nYarnProjectDiscovery', context);
const instance = () => {
  const view = new Discovery();
  view.dataset = { defaultType: 'kit' };
  view.queryInput = { value: '' };
  const values = { type: ['', 'kit', 'yarn', 'tool', 'finished', 'bundle'], project: ['', 'bag', 'shawl', 'blanket', 'toy', 'fan', 'gift'], quantity: ['', 'one-ball', 'large-ball'], season: ['', 'spring', 'summer', 'cold'], style: ['', 'gradient', 'flower', 'lace', 'sparkle'] };
  view.filters = Object.entries(values).map(([key, options]) => ({ dataset: { yarnFilter: key }, value: key === 'type' ? 'kit' : '', options: options.map(value => ({ value })) }));
  return view;
};

test('all literal and dynamic UI translations exist in the three section locales', () => {
  const keys = new Set([...`${section.split('{% schema %}')[0]}${card}`.matchAll(/'sections\.yarn-project-discovery\.([a-z_]+)'/g)].map(match => match[1]));
  for (const key of ['bag', 'shawl', 'blanket', 'toy', 'kit', 'yarn', 'tool', 'finished', 'bundle', 'fan', 'gift', 'quantity', 'season', 'style', 'one_ball', 'large_ball', 'spring', 'summer', 'cold', 'gradient', 'flower', 'lace', 'sparkle']) keys.add(key);
  for (const locale of ['en', 'zh-CN', 'ja']) {
    for (const key of keys) assert.ok(schema.locales[locale][key]?.trim(), `${locale}.${key}`);
    assert.deepEqual(Object.keys(schema.locales[locale]).sort(), Object.keys(schema.locales.en).sort());
    assert.match(schema.locales[locale].count, /\{shown\}/);
    assert.match(schema.locales[locale].count, /\{total\}/);
  }
});

test('homepage follows the #131 IA: yarn first, then season feature, yarn sets and handmade pieces', () => {
  // #131（2026-10-10 锦晨确认）：活动图 → 品牌介绍（附 LINE）→ 挑毛线 → 本季主推（编辑专题）→ 用我们的毛线可以织（材料包）→ 手工成品精选。
  // 导览条、新手友好编织包、底部 LINE 帮助条停用而不删除，编辑器里可重新打开。
  const live = index.order.filter(id => !index.sections[id].disabled);
  assert.deepEqual(live, ['hero', 'story', 'yarn-entries', 'catalog', 'season', 'guide', 'project-picks', 'picks-finished', 'faq']);
  for (const retired of ['guide-strip', 'beginner-kits', 'line-support', 'sale-picks', 'filter-switch', 'yarn-hero']) assert.equal(index.sections[retired].disabled, true, retired);
  assert.equal(index.sections.hero.type, 'hitoami-hero');
  assert.equal(index.sections.story.type, 'hitoami-story');
  assert.equal(index.sections.season.type, 'yarn-season-feature');
  assert.equal(index.sections.season.settings.link, '/pages/season?view=season');
  assert.equal(index.sections['project-picks'].type, 'yarn-project-picks');
  assert.equal(index.sections['picks-finished'].settings.collection, 'finished-goods');
  assert.equal(index.sections['picks-finished'].settings.mode, 'handmade');
  for (const retired of ['picks-yarn', 'picks-kits', 'picks-tools', 'content-pick']) assert.equal(index.sections[retired], undefined);
  // 解耦：首屏脚本不读导览条，导览条脚本不读首屏。
  assert.doesNotMatch(fs.readFileSync('assets/hitoami-hero.js', 'utf8'), /yarn-guide|data-category/);
  assert.doesNotMatch(fs.readFileSync('assets/yarn-guide-strip.js', 'utf8'), /hitoami|data-slide/);

  // 真实数据边界：优惠只取有划线价的商品；新手标签必须有理由；成品库存只读 Shopify 真实库存；本季主推的选品标签不显示在页面上。
  const picks = fs.readFileSync('sections/yarn-picks.liquid', 'utf8');
  const pickCard = fs.readFileSync('snippets/yarn-pick-card.liquid', 'utf8');
  const season = fs.readFileSync('sections/yarn-season-page.liquid', 'utf8');
  const seasonCard = fs.readFileSync('sections/yarn-season-feature.liquid', 'utf8');
  const kitCard = fs.readFileSync('snippets/yarn-project-pick-card.liquid', 'utf8');
  assert.match(picks, /sale_product\.compare_at_price > sale_product\.price/);
  // #140（用户 2026-10-16）：集合为空时只有开启占位才显示「准备中」占位卡，占位里不得出现商品资料。
  assert.match(picks, /\{%- if picks_count == 0 and section\.settings\.placeholder_count > 0 -%\}/);
  assert.match(picks, /\{%- elsif picks_count == 0 -%\}/);
  const placeholder = picks.slice(picks.indexOf('placeholder_count > 0 -%}'), picks.indexOf('{%- elsif picks_count == 0 -%}'));
  assert.doesNotMatch(placeholder, /price|card_product|yarn-pick-card|inventory/);
  assert.match(pickCard, /metafields\.yarn\.beginner_reason/);
  assert.match(pickCard, /\{%- if card_reason != blank -%\}/);
  assert.match(pickCard, /card_variant\.inventory_management == 'shopify'/);
  // 本季主推：首页只放一张整块可点的入口卡，7 款毛线在专题页（page.season）；价格为 0 或多颜色时不在专题页直接加购。
  assert.doesNotMatch(seasonCard, /data-group|sf_note/);
  assert.match(seasonCard, /<\{\{ sf_tag \}\} class="yx-season"/);
  // #131（用户 2026-10-16）：专题页选品与顺序按 Figma「02 季节主推」画布，用选品列表锁定；标签只在列表为空时兜底。
  const seasonTemplate = JSON.parse(fs.readFileSync('templates/page.season.json', 'utf8')).sections.main;
  assert.deepEqual(seasonTemplate.settings.products, ['mvp-yarn-26', 'mvp-yarn-24', 'mvp-yarn-18', 'mvp-yarn-16', 'mvp-yarn-11', 'mvp-yarn-05', 'mvp-yarn-04']);
  assert.deepEqual(seasonTemplate.block_order.map(id => seasonTemplate.blocks[id].settings.product), seasonTemplate.settings.products);
  for (const id of seasonTemplate.block_order) {
    for (const asset of seasonTemplate.blocks[id].settings.assets.split(',')) assert.ok(fs.existsSync(`assets/${asset}`), asset);
  }
  assert.ok(fs.existsSync(`assets/${seasonTemplate.settings.cover_asset}`));
  assert.equal(seasonTemplate.settings.tag, 'catalog-2026-10-season');
  assert.match(season, /sp_product\.tags contains sp_tag/);
  assert.doesNotMatch(season.match(/<ol class="yx-season-page__list">[\s\S]*<\/ol>/)[0], /sp_tag/);
  // #131（用户 2026-10-16 选 E）：专题页每款用首页商品卡的横排版，不直接加购。
  assert.match(season, /render 'yarn-pick-card', card_product: sp_item, layout: 'row'/);
  assert.doesNotMatch(season, /form 'product'/);
  // 材料包卡只汇总关联了 Variant 的「毛线」配件，价格 = Variant 价格 × 团数。
  // #131：集合还没有商品时（手工成品上架前）不显示「0/0 件」和价格带，改为三语「准备中」说明。
  const grid = fs.readFileSync('sections/main-collection-product-grid.liquid', 'utf8');
  const toolbar = fs.readFileSync('sections/yarn-browse-toolbar.liquid', 'utf8');
  assert.match(grid, /\{%- if collection_preparing -%\}[\s\S]*yarn_project\.collection_preparing_title/);
  assert.match(toolbar, /\{%- unless tb_preparing -%\}[\s\S]*yx-toolbar__count[\s\S]*\{%- endunless -%\}/);
  for (const locale of ['ja', 'zh-CN', 'en.default']) {
    const text = fs.readFileSync(`locales/${locale}.json`, 'utf8');
    for (const key of ['collection_preparing_title', 'collection_preparing_text', 'collection_preparing_link']) assert.match(text, new RegExp(`"${key}": "[^"]+"`));
  }
  assert.match(kitCard, /component_type\.value == '毛线' and kit_component\.variant\.value != blank/);
  assert.match(kitCard, /kit_variant\.price \| times: kit_qty/);

  // 作品库组件保持完整,供内容层与回滚复用(不在首页 order 中)。
  assert.match(fs.readFileSync('sections/yarn-project-library.liquid', 'utf8'), /shop\.metaobjects\.yarn_project\.values/);
  assert.match(section, /featured_handles contains product\.handle/);
  assert.match(card, /product\.featured_image/);
  assert.match(card, /product\.url/);
});

test('default state is kits and all project facets combine, never silently widen', () => {
  const view = instance();
  const candidate = { dataset: { yarnSearch: 'Flower shawl 花火', yarnType: 'kit', yarnProject: 'shawl', yarnQuantity: 'one-ball', yarnSeason: 'summer', yarnStyle: 'lace' } };
  assert.equal(view.matches(candidate, view.state()), true);
  view.filter('project').value = 'bag';
  assert.equal(view.matches(candidate, view.state()), false);
  view.filter('project').value = 'shawl';
  view.filter('quantity').value = 'one-ball';
  assert.equal(view.matches(candidate, view.state()), true);
  view.filter('season').value = 'cold';
  assert.equal(view.matches(candidate, view.state()), false);
});

test('search normalizes width, case and whitespace; every term must match', () => {
  const view = instance();
  assert.equal(view.normalize('  ＦＬＯＷＥＲ   花火 '), 'flower 花火');
  view.queryInput.value = 'flower 花火';
  assert.equal(view.matches({ dataset: { yarnType: 'kit', yarnSearch: 'Flower shawl 花火' } }, view.state()), true);
  assert.equal(view.matches({ dataset: { yarnType: 'kit', yarnSearch: 'Flower bag' } }, view.state()), false);
});

test('deep-link state restores valid values and ignores unknown values', () => {
  const view = instance();
  context.window = { location: { href: 'https://example.test/zh?discover_type=yarn&discover_project=toy&discover_style=invalid&discover_q=ABC' } };
  view.restore();
  assert.equal(view.filter('type').value, 'yarn');
  assert.equal(view.filter('project').value, 'toy');
  assert.equal(view.filter('style').value, '');
  assert.equal(view.queryInput.value, 'ABC');
});

test('filter updates preserve preview parameters and URL hash', () => {
  const view = instance();
  const urls = [];
  context.clearTimeout = () => {};
  context.window = { location: { href: 'https://example.test/zh?preview_theme_id=123#discover-products' }, history: { pushState: (_, __, url) => urls.push(url) } };
  view.closeAll = () => {};
  view.render = () => {};
  view.filter('project').value = 'bag';
  view.update('push');
  assert.equal(urls[0].searchParams.get('preview_theme_id'), '123');
  assert.equal(urls[0].searchParams.get('discover_project'), 'bag');
  assert.equal(urls[0].hash, '#discover-products');
});

test('home follows Claude Design 1a: dot-only hero, switchable two-row yarn strip, 4-up finished picks (#126)', () => {
  const heroSection = fs.readFileSync('sections/hitoami-hero.liquid', 'utf8');
  assert.doesNotMatch(heroSection, /data-previous|data-next|data-current/);
  assert.match(heroSection, /class="hitoami-dots"/);
  const circles = fs.readFileSync('sections/yarn-entry-circles.liquid', 'utf8');
  // 同一商品字段的入口归为一段；段名可编辑；只有一段时不出切换。
  assert.match(circles, /if block\.settings\.field != ec_group_field/);
  assert.match(circles, /if ec_group_count > 1 -%\}<div class="yarn-entries__tabs" role="tablist"/);
  assert.match(circles, /yarn-entries__panel--rows-m/);
  for (const locale of ['zh-CN', 'ja', 'en.default']) {
    const source = fs.readFileSync(`locales/${locale}.json`, 'utf8').replace(/^\/\*[\s\S]*?\*\//, '');
    const strings = JSON.parse(source).yarn_project;
    for (const key of ['entries_swipe', 'entries_view_all']) assert.ok(strings[key]?.trim(), `${locale}.${key}`);
    assert.match(strings.entries_total.other, /\{\{ count \}\}/);
  }
  const finished = index.sections['picks-finished'].settings;
  assert.equal(finished.products_to_show, 4);
  assert.equal(finished.columns_desktop, 4);
  assert.equal(finished.products_to_show_mobile, 2);
});

test('yarn entry circles and collection type chips share one filter (Issue #117, A+C approved 2026-10-02)', () => {
  const entries = index.sections['yarn-entries'];
  assert.equal(entries.type, 'yarn-entry-circles');
  assert.equal(entries.settings.collection, 'yarn');
  const values = entries.block_order.map((id) => entries.blocks[id].settings);
  // 入口是 yarn_entry Metaobject：名称三语在 Translate & Adapt 维护，筛选参数用 GID，不用中文文字。
  assert.deepEqual(values.map((v) => v.entry), ['gradient', 'fluffy', 'loop-fancy', 'fine-airy', 'basic-solid']);
  for (const v of values) assert.ok(['yarn.texture', 'yarn.use'].includes(v.field));
  const circles = fs.readFileSync('sections/yarn-entry-circles.liquid', 'utf8');
  const toolbar = fs.readFileSync('sections/yarn-browse-toolbar.liquid', 'utf8');
  // 圆图与标签都用 Search & Discovery 的同一个参数；没有商品的入口不显示，不编造款数。
  assert.match(circles, /\?filter\.p\.m\.\{\{ block\.settings\.field \}\}=/);
  assert.match(circles, /if ec_count == 0\s+continue/);
  assert.match(circles, /'gid:\/\/shopify\/Metaobject\/' \| append: ec_id/);
  assert.match(circles, /metaobjects\.yarn_entry\[ec_handle\]/);
  assert.match(toolbar, /"default": "filter\.p\.m\.yarn\.texture,filter\.p\.m\.yarn\.use"/);
  assert.match(toolbar, /cat_params contains filter\.param_name and cat_chips != blank/);
  // 列表页标签顺序与首页圆图一致，不随 Search & Discovery 的自动排序（各语言不同）变化。
  const order = toolbar.match(/"id": "category_order"[^}]*"default": "([^"]+)"/)[1].split(',');
  assert.deepEqual(order.filter((entry) => values.some((v) => v.entry === entry)), values.map((v) => v.entry));
});
