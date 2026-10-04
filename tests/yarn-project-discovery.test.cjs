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

test('homepage follows scheme C: category entries and sale (Issue #93, approved 2026-09-26)', () => {
  // 首屏手作小屋轮播（与导览条解耦）→ 四个品类入口 + 新手入口 → 优惠 → 按作品图选 → 新手友好编织包 → 材质 / 粗细 → 店铺精选成品 → LINE 帮助。
  // 每个模块都是独立 section，顺序与开关在主题编辑器调整；原三节点 Hero 保留为停用 section。
  // Issue #117：挑毛线圆图入口接在品牌介绍之后；原「按材质 / 粗细」标签页区块停用（材质 / 粗细改在集合页「更多筛选」）。
  // Issue #126：挑毛线改为按字段分段的两行横滑方卡（Claude Design 1a），数据仍是 #117 的入口。
  assert.deepEqual(index.order, ['hero', 'guide-strip', 'story', 'yarn-entries', 'sale-picks', 'project-picks', 'beginner-kits', 'filter-switch', 'picks-finished', 'yarn-hero', 'line-support']);
  assert.equal(index.sections['filter-switch'].disabled, true);
  assert.equal(index.sections.hero.type, 'hitoami-hero');
  assert.ok(index.sections.hero.block_order.length >= 3);
  // 解耦：首屏脚本不读导览条，导览条脚本不读首屏。
  assert.doesNotMatch(fs.readFileSync('assets/hitoami-hero.js', 'utf8'), /yarn-guide|data-category/);
  assert.doesNotMatch(fs.readFileSync('assets/yarn-guide-strip.js', 'utf8'), /hitoami|data-slide/);
  assert.equal(index.sections['yarn-hero'].disabled, true);
  assert.equal(index.sections['guide-strip'].type, 'yarn-guide-strip');
  assert.equal(index.sections.story.type, 'hitoami-story');
  assert.equal(index.sections['guide-strip'].block_order.length, 4);
  // 新手入口按用户 2026-09-28 决定不在首页显示：链接留空时整条不渲染，编辑器里填写即可恢复。
  assert.equal(index.sections['guide-strip'].settings.starter_link, undefined);
  assert.equal(index.sections['sale-picks'].settings.mode, 'sale');
  // #126 Claude Design 1a 的模块顺序里没有优惠：区块停用而不删除，编辑器里可重新打开。
  assert.equal(index.sections['sale-picks'].disabled, true);
  assert.equal(index.sections['project-picks'].type, 'yarn-project-picks');
  assert.equal(index.sections['beginner-kits'].settings.mode, 'beginner');
  assert.equal(index.sections['filter-switch'].type, 'yarn-filter-switch');
  assert.equal(index.sections['picks-finished'].settings.collection, 'finished-goods');
  for (const retired of ['picks-yarn', 'picks-kits', 'picks-tools', 'content-pick']) assert.equal(index.sections[retired], undefined);

  // 真实数据边界：优惠只取有划线价的商品；新手标签必须有理由；作品标签不写「买毛线」；材质 / 粗细只来自商品字段。
  const picks = fs.readFileSync('sections/yarn-picks.liquid', 'utf8');
  const pickCard = fs.readFileSync('snippets/yarn-pick-card.liquid', 'utf8');
  const offerTags = fs.readFileSync('snippets/yarn-project-offer-tags.liquid', 'utf8');
  const fswitch = fs.readFileSync('sections/yarn-filter-switch.liquid', 'utf8');
  assert.match(picks, /sale_product\.compare_at_price > sale_product\.price/);
  assert.match(picks, /\{%- if picks_count == 0 -%\}/);
  assert.match(pickCard, /metafields\.yarn\.beginner_reason/);
  assert.match(pickCard, /\{%- if card_reason != blank -%\}/);
  const emitted = [...offerTags.matchAll(/'(\w+),'/g)].map(m => m[1]).sort();
  assert.deepEqual(emitted, ['finished', 'kit', 'materials']);
  assert.match(fswitch, /fs_product\.metafields\[fs_ns\]\[fs_key\]/);
  assert.match(fswitch, /\{%- if fs_has_material or fs_has_weight -%\}/);

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
  assert.deepEqual(values.map((v) => v.entry), ['gradient', 'fluffy', 'loop-fancy', 'fine-airy', 'basic-solid', 'amigurumi', 'bags-home', 'spring-summer-cotton']);
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
  assert.deepEqual(order, values.map((v) => v.entry));
});
