const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { addKeys, run } = require('../scripts/locale-add.cjs');

const SAMPLE = '/*\n * header\n */\n{\n  "templates": {\n    "search": { "title": "x" },\n    "404": { "title": "y" }\n  },\n  "shop": {\n    "a": "1"\n  }\n}\n';

test('275: keys are appended inside the namespace without reordering numeric keys', () => {
  const next = addKeys(SAMPLE, 'shop', { b: '2', a: 'not overwritten' });
  assert.ok(next.indexOf('"search"') < next.indexOf('"404"'), 'numeric key stays where it was');
  const json = JSON.parse(next.replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  assert.deepEqual(json.shop, { a: '1', b: '2' });
  assert.ok(next.startsWith('/*\n * header'));
  assert.equal(addKeys(next, 'shop', { b: '2' }), next);
  assert.throws(() => addKeys(SAMPLE, 'missing', { a: '1' }));
});

test('275: every storefront locale gets the keys, other languages fall back to English, schema files untouched', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-add-'));
  for (const file of ['ja.json', 'zh-CN.json', 'en.default.json', 'de.json', 'en.default.schema.json']) fs.writeFileSync(path.join(dir, file), SAMPLE);
  const changed = run('shop', { ja: { b: 'ビ' }, 'zh-CN': { b: '乙' }, en: { b: 'B' } }, dir);
  assert.deepEqual(changed.sort(), ['de.json', 'en.default.json', 'ja.json', 'zh-CN.json']);
  const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, '')).shop.b;
  assert.deepEqual(['ja.json', 'zh-CN.json', 'en.default.json', 'de.json'].map(read), ['ビ', '乙', 'B', 'B']);
  assert.equal(fs.readFileSync(path.join(dir, 'en.default.schema.json'), 'utf8'), SAMPLE);
});
