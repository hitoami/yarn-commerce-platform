const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('page.season.json has no archived product handles and all 7 entries are valid unique handles', () => {
  const archivedHandles = ['mvp-yarn-26', 'mvp-yarn-24', 'mvp-yarn-05', 'mvp-yarn-04'];
  const template = JSON.parse(fs.readFileSync('templates/page.season.json', 'utf8'));
  const main = template.sections.main;
  assert.ok(Array.isArray(main.block_order) && main.block_order.length === 7, 'season page lists 7 yarns');

  const handles = [];
  for (const blockId of main.block_order) {
    const block = main.blocks[blockId];
    assert.ok(block, `block ${blockId} exists`);
    const handle = block.settings.product;
    assert.ok(typeof handle === 'string' && handle.trim().length > 0, `${blockId} has non-empty product handle`);
    assert.ok(!archivedHandles.includes(handle), `${blockId} must not reference archived handle ${handle}`);
    handles.push(handle);
    for (const asset of block.settings.assets.split(',')) {
      assert.ok(fs.existsSync(`assets/${asset.trim()}`), `${blockId} asset ${asset} exists`);
    }
  }
  assert.equal(new Set(handles).size, handles.length, 'season page product handles are unique');
});

test('yarn-season-page.liquid guards blank and incomplete product drops in every loop', () => {
  const season = fs.readFileSync('sections/yarn-season-page.liquid', 'utf8');
  const guardPattern =
    /block\.type != 'note' or block\.settings\.product == blank or block\.settings\.product\.id == blank or block\.settings\.product\.handle == blank or block\.settings\.product\.url == blank or block\.settings\.product\.title == blank/g;
  const matches = season.match(guardPattern) || [];
  assert.equal(matches.length, 4, 'count, mosaic, toc, and list loops all guard blank/unavailable products');
});

test('header.liquid and yarn-cart-addons.liquid lift the 50-product hard cap without shortcut comments', () => {
  const header = fs.readFileSync('sections/header.liquid', 'utf8');
  const addons = fs.readFileSync('snippets/yarn-cart-addons.liquid', 'utf8');

  for (const [name, source] of [
    ['sections/header.liquid', header],
    ['snippets/yarn-cart-addons.liquid', addons],
  ]) {
    assert.doesNotMatch(source, /shortcut:/i, `${name} removes resolved shortcut: debt`);
    assert.doesNotMatch(source, /limit:\s*50\b/, `${name} has no 50-item hard cap`);
    assert.match(source, /paginate\s+[\w.'\[\]-]+\.products\s+by\s+250\b/, `${name} paginates by 250`);
  }

  assert.match(header, /if section\.settings\.drawer_yarn_collection != blank/);
  assert.match(
    header,
    /if collections\['beginner-picks'\] != blank[\s\S]*if current_page and current_page > 1[\s\S]*collections\['beginner-picks'\]\.products \| map: 'handle'[\s\S]*else[\s\S]*paginate collections\['beginner-picks'\]\.products by 250/,
    'beginner-picks skips paginate on ?page>=2 before touching the collection drop, and paginates by 250 on page 1'
  );
  assert.match(
    header,
    /if section\.settings\.drawer_yarn_collection != blank[\s\S]*if current_page and current_page > 1[\s\S]*for nav_product in section\.settings\.drawer_yarn_collection\.products[\s\S]*else[\s\S]*paginate section\.settings\.drawer_yarn_collection\.products by 250/,
    'drawer_yarn_collection skips paginate on ?page>=2 before touching the active collection drop, and paginates by 250 on page 1'
  );
  assert.match(addons, /collections\['yarn'\] \| default: collections\['home-featured'\]/);
  assert.match(
    addons,
    /if current_page and current_page > 1[\s\S]*assign addon_fallback_pool = addon_source\.products[\s\S]*if addon_fallback_pool\.size == 0 and collections\['home-featured'\] != blank[\s\S]*else[\s\S]*paginate addon_source\.products by 250/,
    'cart addons skip paginate on ?page>=2 before touching addon_source, and paginate by 250 on page 1'
  );
});

test('Theme Check VariableName warnings are resolved in main-article and main-list-collections', () => {
  const article = fs.readFileSync('sections/main-article.liquid', 'utf8');
  const listCollections = fs.readFileSync('sections/main-list-collections.liquid', 'utf8');

  assert.doesNotMatch(article, /\banchorId\b/, 'anchorId renamed to snake_case');
  assert.match(article, /assign anchor_id = '#Comments-' \| append: article\.id/);
  assert.match(article, /render 'pagination', paginate: paginate, anchor: anchor_id/);

  assert.doesNotMatch(listCollections, /\bmoduloResult\b/, 'moduloResult renamed to snake_case');
  assert.match(listCollections, /assign modulo_result = 28 \| modulo: section\.settings\.columns_desktop/);
  assert.match(listCollections, /if modulo_result == 0/);
});
