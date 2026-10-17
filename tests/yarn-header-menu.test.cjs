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
    assert.doesNotMatch(source, /request\.locale|url_encode|tag:|routes\.search_url|routes\.all_products_collection_url/);
    assert.doesNotMatch(source, /新品|新着|New arrivals|编织套装|編み物キット/);
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
