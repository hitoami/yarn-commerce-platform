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

test('homepage hero v4: yarn, project yarn and season scenes, each with a browsing text link (#167)', () => {
  // #167：三张对应网站真实入口（毛线集合 / 作品页 / 本季主推），成品「准备中」不再占首屏；
  // 每张三语都有文字链，样式是浏览链接而不是购买按钮。活动图模式（全部留空 / 浅色占位）仍由 section 支持。
  const home = index.sections.hero;
  assert.equal(home.type, 'hitoami-hero');
  assert.deepEqual(home.block_order.map(id => home.blocks[id].settings.scene), ['yarn', 'kit', 'season']);
  for (const id of home.block_order) {
    const settings = home.blocks[id].settings;
    for (const key of ['heading', 'heading_zh', 'heading_en', 'text', 'text_zh', 'text_en', 'cta', 'cta_zh', 'cta_en']) assert.ok(settings[key], `${id}.${key}`);
    assert.equal(settings.link || '', '', `${id}.link falls back to the localized page route`);
  }
  const section = fs.readFileSync('sections/hitoami-hero.liquid', 'utf8');
  const css = fs.readFileSync('assets/hitoami-hero.css', 'utf8');
  assert.match(section, /pages\['kits'\]\.url/);
  assert.match(section, /pages\['season'\]\.url/);
  for (const asset of ['hitoami-yarn-wide', 'hitoami-yarn-mobile', 'hitoami-kit-wide', 'hitoami-room-mobile', 'hitoami-season-wide', 'hitoami-season-mobile']) {
    assert.match(section, new RegExp(`'${asset}\\.webp'`));
    assert.ok(fs.existsSync(`assets/${asset}.webp`), asset);
    assert.ok(fs.existsSync(`assets/${asset}.webp.source.json`), `${asset} source record`);
  }
  const cta = css.match(/^\.hitoami-cta \{[^}]*\}/m)[0];
  assert.match(cta, /text-decoration: underline/);
  assert.doesNotMatch(cta, /background|border-radius/);
  assert.match(section, /heading == blank and text == blank and cta == blank/);
  assert.match(section, /class="hitoami-slide__link"/);
  assert.match(section, /<h1 class="visually-hidden">/);
  assert.equal(index.order[0], 'hero');
  assert.equal(index.sections['yarn-hero'].disabled, true);
});

test('hero capsule names every slide in the page language and swipes on phones (Issue 274)', () => {
  // 2026-10-30 锦晨选定 N1：底部胶囊写出每张的名字（选中填陶土色）和「01 / 03」，取代圆点；手机可左右滑动，不自动轮播。
  const section = fs.readFileSync('sections/hitoami-hero.liquid', 'utf8');
  const css = fs.readFileSync('assets/hitoami-hero.css', 'utf8');
  const js = fs.readFileSync('assets/hitoami-hero.js', 'utf8');
  assert.match(section, /class="hitoami-tab" data-page=/);
  assert.match(section, /render 'yarn-setting-text', settings: block\.settings, key: 'label', allow_blank: true/);
  assert.match(section, /'hitoami_home\.hero_tab_' \| append: block\.settings\.scene/);
  assert.match(section, /data-slide-number/);
  for (const locale of ['ja', 'zh-CN', 'en.default']) {
    const strings = JSON.parse(fs.readFileSync(`locales/${locale}.json`, 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')).hitoami_home;
    for (const key of ['hero_tabs', 'hero_tab_yarn', 'hero_tab_kit', 'hero_tab_season', 'hero_tab_finished']) assert.ok(strings[key]?.trim(), `${locale}.${key}`);
  }
  assert.match(css, /\.hitoami-tab\[aria-current\] \{[^}]*background: var\(--yarn-home-action\)/);
  assert.match(css, /\.hitoami-tab \{[^}]*min-height: 44px/);
  // 窗边系列满版铺图：不再保留 #167 的「桌面贴右、不裁切」。
  assert.doesNotMatch(css, /object-fit: contain/);
  assert.match(js, /pointermove/);
  assert.doesNotMatch(js, /setInterval|setTimeout/);
});

test('home frosted header keeps the phone language sheet on screen (Issue 290)', () => {
  // backdrop-filter / transform / filter on the header wrapper make it the containing block for position: fixed,
  // which pinned the bottom language sheet above the screen on the home page. The blur lives on ::before instead.
  const css = fs.readFileSync('assets/hitoami-hero.css', 'utf8');
  for (const rule of css.match(/[^{}]*\.header-wrapper[^{}]*\{[^}]*\}/g) || []) {
    const [selector, body] = rule.split('{');
    if (/::before\s*$/.test(selector.trim())) continue;
    assert.doesNotMatch(body, /backdrop-filter|transform|(^|[^-])filter:|contain:|will-change/, selector.trim());
  }
  assert.match(css, /\.header-wrapper:not\(\.scrolled-past-header \.header-wrapper\)::before \{[^}]*backdrop-filter: blur/);
});
