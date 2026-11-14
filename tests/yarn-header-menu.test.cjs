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

test('mobile drawer leads with account and quick actions, then plain shop rows (#258)', () => {
  const nav = drawer.slice(drawer.indexOf('menu-drawer__navigation'));
  // 账户与常用功能排在菜单前；本季主推不再是大图横条，毛线行直达毛线目录。
  assert.ok(nav.indexOf('yarn-drawer-account') < nav.indexOf('menu-drawer__menu has-submenu'));
  assert.ok(nav.indexOf('yarn-drawer-quick') < nav.indexOf('menu-drawer__menu has-submenu'));
  assert.match(drawer, /routes\.account_login_url/);
  assert.match(drawer, /routes\.account_addresses_url/);
  assert.doesNotMatch(drawer, /yarn-drawer-feature|drawer_season_text/);
  // #355：手机上毛线、织什么都是抽屉子面板；其他行是普通链接。没有商品的分类不输出。
  assert.doesNotMatch(drawer, /nav_tiles|YarnDrawerTiles|yarn-drawer-yarn/);
  assert.match(drawer, /drawer_yarn_collection\.handle and nav_facets != blank[\s\S]*yarn-drawer-row__total/);
  assert.match(drawer, /link\.object\.all_products_count == 0[\s\S]*'sections\.header\.coming_soon' \| t/);
  for (const key of ['drawer_login_title', 'drawer_welcome', 'drawer_orders', 'drawer_addresses', 'drawer_shipping', 'drawer_contact', 'drawer_shop']) {
    assert.match(drawer, new RegExp(`'sections\\.header\\.${key}' \\| t`), key);
  }
  // 旧的「毛线入口」图块（#131）不再渲染；block 类型保留，后台已有的 header-group 数据仍能通过校验。
  const blockTypes = schema.blocks.map(block => block.type);
  assert.deepEqual(blockTypes, ['@app', 'yarn_entry']);
  // 本季文案设置保留在 schema 里，旧的 header-group 数据仍能通过校验。
  for (const key of ['drawer_season_text', 'drawer_season_text_zh', 'drawer_season_text_en', 'drawer_yarn_collection']) {
    assert.ok(schema.settings.some(setting => setting.id === key), key);
  }
  for (const locale of ['ja', 'zh-CN', 'en.default']) {
    const copy = fs.readFileSync(`locales/${locale}.json`, 'utf8');
    for (const key of ['coming_soon', 'language_short', 'language_note', 'drawer_login_title', 'drawer_shop']) {
      assert.match(copy, new RegExp(`"${key}": "[^"]+"`), `${locale} ${key}`);
    }
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

test('one language switch serves header and drawer, opening the same page in each language (#258)', () => {
  const sw = fs.readFileSync('snippets/yarn-language-switch.liquid', 'utf8');
  assert.match(header, /render 'yarn-language-switch'/);
  assert.doesNotMatch(header, /render 'language-localization', localPosition: 'HeaderLanguage'/);
  assert.match(sw, /for language in localization\.available_languages/);
  assert.match(sw, /href="\{\{ language_url \}\}"/);
  assert.match(sw, /hreflang="\{\{ language\.iso_code \}\}"/);
  assert.match(sw, /aria-current="true"/);
  assert.match(sw, /'sections\.header\.language_short' \| t/);
  // #337：抽屉不再重复语言行，语言只用页头始终可见的同一个按钮；抽屉里也不放语言胶囊。
  assert.doesNotMatch(drawer, /data-lang-open/);
  assert.doesNotMatch(drawer, /for language in localization\.available_languages/);
  assert.match(headerCss, /\.header-wrapper \.header__icon--account \{ display: none; \}/);
  assert.match(headerCss, /\.yarn-lang__option\[aria-current='true'\]/);
});

test('header computes the yarn facets once; yarn opens three filter groups and 织什么 follows it (#355)', () => {
  assert.equal((header.match(/render 'yarn-facets'/g) || []).length, 1);
  assert.match(header, /for nav_product in section\.settings\.drawer_yarn_collection\.products/);
  assert.match(header, /render 'yarn-header-drawer', navigation_menu: navigation_menu, nav_facets: nav_facets/);
  assert.match(header, /render 'yarn-header-menu', navigation_menu: navigation_menu, nav_facets: nav_facets/);
  assert.match(desktop, /link\.object\.handle == section\.settings\.drawer_yarn_collection\.handle and nav_facets != blank/);
  assert.match(desktop, /<header-menu>\s*<details[^>]*class="mega-menu yarn-mega"/);
  for (const source of [desktop, drawer]) {
    assert.match(source, /assign yarn_nav_groups = 'thick,color,fiber' \| split: ','/);
    assert.match(source, /render 'yarn-nav-facet-links', group: nav_group/);
    assert.match(source, /render 'yarn-nav-facet-links', group: 'works'/);
    assert.match(source, /'yarn_collection\.nav_works' \| t/);
  }
  const links = fs.readFileSync('snippets/yarn-nav-facet-links.liquid', 'utf8');
  assert.match(links, /unless facets contains nfl_token/, 'options without products are not rendered');
  assert.match(links, /href="\{\{ base_url \}\}\?ycb_\{\{ group \}\}=\{\{ nfl_value \}\}"/);
  for (const [group, values] of Object.entries({ thick: 'fine,medium,chunky', color: 'solid,variegated,gradient,heather,rainbow', fiber: 'wool,wool_blend,mohair,synthetic,cotton', works: 'sweater,hat,scarf,blanket,bag,doll' })) {
    assert.ok(links.includes(`when '${group}'\n      assign nfl_values = '${values}'`), group);
    for (const locale of ['ja', 'zh-CN', 'en.default']) {
      const copy = JSON.parse(fs.readFileSync(`locales/${locale}.json`, 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')).yarn_collection;
      assert.ok(copy[`facet_group_${group}`], `${locale} group ${group}`);
      for (const value of values.split(',')) assert.ok(copy[`facet_${group}_${value}`], `${locale} ${group} ${value}`);
    }
  }
  assert.ok(!fs.existsSync('snippets/yarn-nav-tiles.liquid'));
  // 用户 2026-11-14：紧凑三栏浮层挂在按钮下方；粗细是手绘波浪线、花色是小毛线球，颜色只用 token。
  assert.match(headerCss, /\.yarn-main-menu \.mega-menu__content\.yarn-mega__content \{[^}]*width: max-content;/);
  assert.match(headerCss, /\.yarn-mega__group \+ \.yarn-mega__group \{ border-left: 1px solid var\(--yarn-border-subtle\); \}/);
  assert.match(links, /render 'yarn-facet-icon', group: group, value: nfl_value, uid: id_prefix/);
  const icon = fs.readFileSync('snippets/yarn-facet-icon.liquid', 'utf8');
  assert.doesNotMatch(icon.replace(/\{%- comment -%\}[\s\S]*?\{%- endcomment -%\}/, ''), /(fill|stroke|stop-color)="#/i, 'icon colours come from CSS tokens');
  for (const value of ['solid', 'variegated', 'gradient', 'heather', 'rainbow']) assert.match(icon, new RegExp(`when '${value}'`), value);
  assert.match(icon, /id="\{\{ yfi_id \}\}-c"/, 'clip ids are unique per menu (desktop / drawer)');
  assert.match(headerCss, /\.yarn-drawer-facets \.menu-drawer__menu-item \{ min-height: var\(--yarn-touch\); \}/);
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
  // Issue 337: the logo sits vertically centred in the capsule; the old Issue 131 lift pushed the cat ears to the edge.
  assert.doesNotMatch(headerCss, /yarn-wordmark[^}]*translateY/, 'logo is not lifted inside the capsule');
  assert.match(headerCss, /\.header-wrapper \.header__heading-link \{[^}]*display: inline-flex;\s*align-items: center;/);
});

test('open language sheet lifts the sticky header above page bottom bars (Issue 305)', () => {
  // 页头 section 吸顶时自成一层（z-index 3），语言弹层再高也出不去；商品页底部价格栏同为 3 且在后面，会盖住弹层。
  const lift = headerCss.match(/\.section-header:has\(\.yarn-lang\[open\]\) \{ z-index: (\d+); \}/);
  assert.ok(lift, 'header lifts while the language menu is open');
  const pdpCss = fs.readFileSync('assets/yarn-pdp.css', 'utf8');
  const bar = Number(pdpCss.match(/\.yp-sticky \{[^}]*z-index: (\d+)/)[1]);
  assert.ok(Number(lift[1]) > bar, `header ${lift[1]} must sit above the product bottom bar ${bar}`);
});
