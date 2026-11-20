const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stripComments = (source) => source.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');

test('theme code never reads product.tags or deprecated yarn.beginner_reason', () => {
  for (const dir of ['sections', 'snippets']) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.liquid')) continue;
      const body = stripComments(fs.readFileSync(path.join(dir, file), 'utf8'));
      assert.doesNotMatch(body, /\.tags\b/, `${dir}/${file} must not read product.tags`);
      assert.doesNotMatch(body, /beginner_reason/, `${dir}/${file} must not read yarn.beginner_reason`);
    }
  }
});

test('yarn-product-kind matches product.type with exact case and falls back to collections', () => {
  const kind = stripComments(fs.readFileSync('snippets/yarn-product-kind.liquid', 'utf8'));
  assert.match(kind, /assign pk_type = product\.type \| strip \| downcase/);
  assert.match(kind, /case pk_type/);
  assert.doesNotMatch(kind, /pk_type contains/);
  for (const standard of ['毛线', '编织包', '手工成品', '工具']) assert.ok(kind.includes(`'${standard}'`), standard);
  assert.match(kind, /product\.collections \| map: 'handle'/);
});

test('internal merchandising collections with seo.hidden=1 are omitted from /collections', () => {
  const list = stripComments(fs.readFileSync('sections/main-list-collections.liquid', 'utf8'));
  assert.match(list, /collection\.metafields\.seo\.hidden\.value \| append: ''/);
  assert.match(list, /if collection_hidden == '1' -%\}\{%- continue/);
});

test('search builds category chips inside the single 250-item paginate and indexes product kind + metafields', () => {
  const search = stripComments(fs.readFileSync('sections/yarn-search.liquid', 'utf8'));
  assert.doesNotMatch(search, /yarn_collection\.products limit: 50/);
  assert.equal((search.match(/paginate yarn_collection\.products by 250/g) || []).length, 1);
  const item = stripComments(fs.readFileSync('snippets/yarn-search-product.liquid', 'utf8'));
  assert.match(item, /render 'yarn-product-kind', product: search_product/);
  assert.match(item, /data-tags="\{\{ search_kind_words \| escape \}\}"/);
  for (const field of ['spec_line', 'composition', 'thickness', 'color_type', 'works']) {
    assert.match(item, new RegExp(`metafields\\.yarn\\.${field}`), field);
  }
});
