const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const hero = fs.readFileSync('sections/yarn-hero.liquid', 'utf8');
const heroCss = fs.readFileSync('assets/yarn-hero-b.css', 'utf8');
const indexSource = fs.readFileSync('templates/index.json', 'utf8').replace(/^\/\*[\s\S]*?\*\//, '').trim();
const index = JSON.parse(indexSource);
const schema = JSON.parse(hero.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);

test('hero shows three clickable intent nodes using real raster assets (Issue #55)', () => {
  // 三来意:看编织包(作品原画)/挑毛线(毛线球原画)/带成品回家(与原型一致的花束插画)。
  for (const asset of ['mewool-hero-project-node-v2.png', 'mewool-hero-yarn-node.png', 'mewool-hero-finished-node.png']) {
    assert.match(hero, new RegExp(asset.replaceAll('.', '\\.')));
  }
  assert.doesNotMatch(hero, /mewool-hero-tools-node\.png/);
  assert.doesNotMatch(hero, /mewool-hero-tutorial-node\.png/);
  assert.match(hero, /yarn-hero__thread--desktop/);
  assert.equal((hero.match(/class="yarn-hero__node /g) || []).length, 3);
  // 每个节点都是链接,分别指向三个集合。
  for (const handle of ['knit-kits', 'yarn', 'finished-goods']) {
    assert.match(hero, new RegExp(`collections\\['${handle}'\\]\\.url`));
  }
  assert.match(heroCss, /\.yarn-hero--connected \.yarn-hero__thread/);
});

test('homepage hero uses the approved source photograph with copy but no buttons (#131)', () => {
  // #131：首屏暂用原 hitoami.com 的三张场景图与标题、说明，不放按钮；活动图模式（全部留空 / 浅色占位）仍由 section 支持。
  const home = index.sections.hero;
  assert.equal(home.type, 'hitoami-hero');
  assert.equal(home.block_order.length, 1);
  assert.equal(home.blocks[home.block_order[0]].settings.scene, 'cloud');
  for (const id of home.block_order) {
    const settings = home.blocks[id].settings;
    assert.notEqual(settings.scene, 'placeholder', `${id}.scene`);
    for (const key of ['heading', 'heading_zh', 'heading_en', 'text', 'text_zh', 'text_en']) assert.ok(settings[key], `${id}.${key}`);
    for (const key of ['cta', 'cta_zh', 'cta_en']) assert.equal(settings[key] || '', '', `${id}.${key}`);
  }
  const section = fs.readFileSync('sections/hitoami-hero.liquid', 'utf8');
  assert.match(section, /heading == blank and text == blank and cta == blank/);
  assert.match(section, /class="hitoami-slide__link"/);
  assert.match(section, /<h1 class="visually-hidden">/);
  assert.equal(index.order[0], 'hero');
  assert.equal(index.sections['yarn-hero'].disabled, true);
});
