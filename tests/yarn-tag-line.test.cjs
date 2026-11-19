const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const index = JSON.parse(read('templates/index.json'));
const section = read('sections/yarn-tag-line.liquid');
const schema = JSON.parse(section.match(/\{% schema %\}([\s\S]*)\{% endschema %\}/)[1]);

// 锦晨 2026-11-18 选定：首页「想找什么样的毛线？」是一根毛线上夹着 6 张吊牌，按顾客的说法分（词来自淘宝搜索联想）。
test('homepage clothesline carries the six approved tags, each a nav filter', () => {
  const tagLine = index.sections['tag-line'];
  assert.equal(tagLine.type, 'yarn-tag-line');
  assert.equal(tagLine.settings.collection, 'yarn');
  const tags = tagLine.block_order.map((id) => tagLine.blocks[id].settings);
  assert.deepEqual(tags.map((t) => t.title_zh), ['新手毛线', '粗毛线', '大团毛线', '渐变段染', '毛茸茸', '钩针娃娃']);
  assert.deepEqual(tags.map((t) => t.filter), ['beginner:yes', 'thick:chunky', 'grams:big', 'color:gradient', 'fiber:mohair', 'works:doll']);
  for (const t of tags) for (const key of ['title', 'title_zh', 'title_en']) assert.ok(t[key]?.trim(), `${t.filter} ${key}`);
  // 编辑器里新加的区块与首页一致。
  assert.deepEqual(schema.presets[0].blocks.map((b) => b.settings), tags);
});

test('every filter option is one the yarn catalog understands', () => {
  const options = schema.blocks[0].settings.find((s) => s.id === 'filter').options.map((o) => o.value);
  const facets = read('snippets/yarn-facets.liquid');
  const navLinks = read('snippets/yarn-nav-facet-links.liquid');
  for (const option of options) {
    const [group, value] = option.split(':');
    if (group === 'beginner') { assert.match(navLinks, /ycb_beginner=1/); continue; }
    if (group === 'grams') { assert.match(facets, new RegExp(`grams:${value}`)); continue; }
    assert.match(navLinks, new RegExp(`when '${group}'\\s+assign nfl_values = '[^']*\\b${value}\\b`), option);
  }
  // 链接与导航同一套参数；没有商品的吊牌不渲染。
  assert.match(section, /assign tl_query = 'ycb_beginner=1'/);
  assert.match(section, /assign tl_query = 'ycb_' \| append: tl_group/);
  assert.match(section, /if tl_count == 0\s+continue/);
  // 默认照片不走 all_products（每页限 20 个查询，首页别的区块也在用）。
  assert.doesNotMatch(section.replace(/#[^\n]*/g, ''), /all_products\[/);
  assert.match(section, /tl_collection\.products\[tl_first_index\]/);
});

test('cat, ball and pins reuse shared art and stay decorative', () => {
  assert.match(section, /'yarn-guide-cat\.webp' \| asset_url/);
  assert.match(section, /class="yarn-tagline__cat" aria-hidden="true"/);
  assert.match(section, /class="yarn-tagline__ball"[^>]*aria-hidden="true"/);
  assert.match(section, /class="yarn-tagline__pin" aria-hidden="true"/);
  const js = read('assets/yarn-tag-line.js');
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /shopify:section:load/);
});
