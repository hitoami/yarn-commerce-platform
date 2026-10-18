const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const header = fs.readFileSync('sections/header.liquid', 'utf8');
const desktop = fs.readFileSync('snippets/yarn-header-menu.liquid', 'utf8');
const drawer = fs.readFileSync('snippets/yarn-header-drawer.liquid', 'utf8');
const wordmark = fs.readFileSync('snippets/yarn-wordmark.liquid', 'utf8');
const headerCss = fs.readFileSync('assets/yarn-header.css', 'utf8');
const schema = JSON.parse(header.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);

test('header has one Shopify menu setting and uses it for prototype navigation', () => {
  const menuSettings = schema.settings.filter(setting => setting.type === 'link_list');
  assert.equal(menuSettings.length, 1);
  assert.equal(menuSettings[0].id, 'menu');
  assert.match(header, /assign navigation_menu = section\.settings\.menu/);
  assert.doesNotMatch(header, /prototype_menu/);
  assert.match(header, /render 'yarn-header-menu', navigation_menu: navigation_menu/);
  assert.match(header, /render 'yarn-header-drawer', navigation_menu: navigation_menu/);
});

test('desktop and drawer render the same Shopify link tree with escaped labels and URLs', () => {
  for (const source of [desktop, drawer]) {
    assert.match(source, /for link in navigation_menu\.links/);
    assert.match(source, /for childlink in link\.links/);
    assert.match(source, /for grandchildlink in childlink\.links/);
    assert.match(source, /link\.title \| escape/);
    assert.match(source, /link\.url \| escape/);
    assert.match(source, /childlink\.title \| escape/);
    assert.match(source, /childlink\.url \| escape/);
    assert.match(source, /grandchildlink\.title \| escape/);
    assert.match(source, /grandchildlink\.url \| escape/);
  }
});

test('prototype navigation contains no locale, product-copy or tag-search overrides', () => {
  for (const source of [desktop, drawer]) {
    assert.doesNotMatch(source, /request\.locale|url_encode|(?<!image_)tag:|routes\.all_products_collection_url/);
    assert.doesNotMatch(source, /新品|新着|New arrivals|编织套装|編み物キット/);
  }
  assert.doesNotMatch(desktop, /routes\.search_url/);
  // 抽屉里唯一的搜索地址是收藏入口（手机页头隐藏了收藏图标），不能拼搜索词替代菜单。
  assert.deepEqual(drawer.match(/routes\.search_url[^"]*/g), ['routes.search_url }}?browse=favorites']);
});

test('mobile drawer follows the #131 nav comp: season banner, yarn tiles, coming-soon rows', () => {
  assert.match(drawer, /link\.type == 'page_link' and link\.object\.handle == 'season'/);
  assert.match(drawer, /yarn-setting-text', settings: section\.settings, key: 'drawer_season_text'/);
  assert.match(drawer, /link\.object\.handle == section\.settings\.drawer_yarn_collection\.handle and nav_tiles != blank/);
  assert.match(drawer, /\{\{ nav_tiles \}\}/);
  assert.match(drawer, /aria-expanded="true"[\s\S]*aria-controls="YarnDrawerTiles"/);
  assert.match(drawer, /link\.object\.all_products_count == 0[\s\S]*'sections\.header\.coming_soon' \| t/);
  const entry = fs.readFileSync('snippets/yarn-nav-tiles.liquid', 'utf8');
  assert.match(entry, /block\.type != 'yarn_entry'/);
  assert.match(entry, /metaobjects\.yarn_entry\[block\.settings\.entry\]/);
  assert.match(entry, /filter\.p\.m\.\{\{ block\.settings\.field \}\}=\{\{ de_gid \| url_encode \}\}/);
  assert.match(entry, /de_entry\.name\.value \| escape/);
  const blockTypes = schema.blocks.map(block => block.type);
  assert.deepEqual(blockTypes, ['@app', 'yarn_entry']);
  for (const key of ['drawer_season_text', 'drawer_season_text_zh', 'drawer_season_text_en', 'drawer_yarn_collection']) {
    assert.ok(schema.settings.some(setting => setting.id === key), key);
  }
  for (const locale of ['ja', 'zh-CN', 'en.default']) {
    assert.match(fs.readFileSync(`locales/${locale}.json`, 'utf8'), /"coming_soon": "[^"]+"/, locale);
  }
});

test('hitoami uses the supplied wordmark image with an accessible name', () => {
  assert.match(wordmark, /alt="hitoami"/);
  assert.match(wordmark, /hitoami-logo\.webp/);
  assert.doesNotMatch(wordmark, /inline_asset_content|毛线工作室/);
  assert.match(wordmark, /width="1200"[\s\S]*height="316"/);
  assert.match(headerCss, /object-fit: contain/);
  assert.match(header, /assign yarn_brand_name = 'hitoami'/);
  assert.match(header, /"name": \{\{ yarn_brand_name \| json \}\}/);
});

test('drawer lists every shop language inline for one-tap switching (#107)', () => {
  const switcher = drawer.slice(drawer.indexOf('yarn-drawer-language'));
  assert.match(switcher, /for language in localization\.available_languages/);
  assert.match(switcher, /href="\{\{ language_url \}\}"/);
  assert.match(switcher, /hreflang="\{\{ language\.iso_code \}\}"/);
  assert.match(switcher, /language\.iso_code == localization\.language\.iso_code[\s\S]*aria-current="true"/);
  assert.doesNotMatch(switcher, /render 'language-localization'|disclosure__/);
  const optionCss = headerCss.match(/\.yarn-drawer-language__option \{([\s\S]*?)\}/)[1];
  assert.match(optionCss, /min-height: var\(--yarn-touch\)/);
  assert.match(optionCss, /padding: var\(--yarn-space-2\) var\(--yarn-space-3\)/);
  assert.match(optionCss, /text-decoration: none/);
  assert.match(headerCss, /\.yarn-drawer-language__option\[aria-current='true'\]/);
});

test('header computes the yarn tiles once and the desktop yarn link opens them in a mega panel (#131)', () => {
  assert.equal((header.match(/render 'yarn-nav-tiles'/g) || []).length, 1);
  assert.match(header, /render 'yarn-header-drawer', navigation_menu: navigation_menu, nav_tiles: nav_tiles/);
  assert.match(header, /render 'yarn-header-menu', navigation_menu: navigation_menu, nav_tiles: nav_tiles/);
  assert.match(desktop, /link\.object\.handle == section\.settings\.drawer_yarn_collection\.handle and nav_tiles != blank/);
  assert.match(desktop, /<header-menu>\s*<details[^>]*class="mega-menu yarn-mega"/);
  assert.match(desktop, /<ul class="yarn-mega__tiles[^"]*" role="list">\{\{ nav_tiles \}\}<\/ul>/);
  for (const key of ['nav_yarn_eyebrow', 'nav_yarn_title']) {
    assert.match(desktop, new RegExp(`yarn-setting-text', settings: section\\.settings, key: '${key}'`));
    for (const suffix of ['', '_zh', '_en']) assert.ok(schema.settings.some(setting => setting.id === key + suffix), key + suffix);
  }
  assert.match(desktop, /link\.object\.all_products_count == 0[\s\S]*'sections\.header\.coming_soon' \| t/);
  assert.match(headerCss, /\.yarn-mega__tiles \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

test('desktop header docks with a drop-in and compact bar, honouring reduced motion (#131)', () => {
  assert.match(header, /this\.desktopQuery = window\.matchMedia\('\(min-width: 1340px\)'\)/);
  assert.match(header, /if \(this\.desktopQuery\.matches\) \{\s*this\.dock\(scrollTop\);/);
  assert.match(header, /classList\.add\('shopify-section-header-sticky', 'scrolled-past-header', 'yarn-header-docked'\)/);
  assert.doesNotMatch(header + headerCss, /yarn-scroll-thread|--header-scroll-progress/, 'no scroll-progress thread (user 2026-10-17)');
  assert.match(headerCss, /\.section-header\.yarn-header-docked \.header-wrapper \{[\s\S]*animation: yarn-header-drop/);
  assert.match(headerCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.section-header\.yarn-header-docked \.header-wrapper \{ animation: none; \}/);
  const hero = fs.readFileSync('assets/hitoami-hero.css', 'utf8');
  assert.doesNotMatch(hero, /yarn-wordmark \{ width:/, 'homepage must not resize the logo');
  assert.doesNotMatch(hero, /header__icon--favorites \{ display: none/, 'homepage keeps the same header icons');
  assert.match(headerCss, /width: 190px;/);
});

test('desktop yarn strand draws on hover / focus / open; the current page yields so one item reads as selected (#190)', () => {
  assert.equal((desktop.match(/<span>\{\{ link\.title \| escape \}\}\{%- render 'yarn-nav-strand' -%\}<\/span>/g) || []).length, 3, 'every top-level label carries the strand');
  assert.match(desktop, /<pattern id="YarnNavPly"/, 'twist pattern defined once, outside the loop');
  assert.doesNotMatch(desktop.split('{%- for link in')[1], /id="YarnNavPly"/);
  const strand = fs.readFileSync('snippets/yarn-nav-strand.liquid', 'utf8');
  assert.match(strand, /aria-hidden="true"/);
  assert.match(strand, /pathLength="1"/);
  const shown = headerCss.match(/([^{}]*)\{\s*stroke-dashoffset: 0;/);
  assert.ok(shown, 'strand visible rule present');
  assert.match(shown[1], /\.header__menu-item:is\(:hover, :focus-visible\) \.yarn-nav-strand path/);
  assert.match(shown[1], /details\[open\] > \.header__menu-item \.yarn-nav-strand path/);
  assert.match(shown[1], /:not\(:has\(\.header__menu-item:is\(:hover, :focus-visible\), details\[open\]\)\) :is\(\.header__active-menu-item, \[aria-current='page'\]\)/);
  assert.doesNotMatch(headerCss, /span:first-child::after/, 'old repeating wave removed');
  assert.match(headerCss, /details\[open\] > :is\(\.yarn-mega__content, \.header__submenu\) \{\s*animation: yarn-menu-unroll/);
  assert.match(headerCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.yarn-nav-strand path \{ transition: none !important; \}/);
  assert.match(headerCss, /\.yarn-main-menu details\[open\]:hover > \.header__menu-item,[\s\S]*?\{ text-decoration: none; \}/);
  assert.match(headerCss, /transform: translateY\(-14%\);/, 'logo lifted so letters align with the menu');
});
