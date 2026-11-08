const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const read = (path) => readFileSync(path, 'utf8');

// Issue 340：全站字体规范。字体只在 yarn-design-tokens.css 按语言指定；字号只用 --yarn-fs-* 十档 + 两档大字；字重只用 400 / 500。
const files = [
  ...readdirSync('assets').filter((f) => /^(yarn|hitoami)-.*\.css$/.test(f) && f !== 'yarn-design-tokens.css').map((f) => `assets/${f}`),
  ...readdirSync('sections').filter((f) => f.endsWith('.liquid')).map((f) => `sections/${f}`),
  ...readdirSync('snippets').filter((f) => f.endsWith('.liquid')).map((f) => `snippets/${f}`),
];
const decls = (prop) => files.flatMap((file) => {
  const text = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  return [...text.matchAll(new RegExp(`(?<![-\\w])${prop}:\\s*([^;}{]+)`, 'g'))].map((m) => ({ file, value: m[1].trim().replace(/\s*!important$/, '') }));
});

test('font sizes only use the type scale tokens', () => {
  const bad = decls('font-size').filter(({ value }) => !/^(var\(--yarn-fs-(12|13|14|15|16|18|20|24|32|40|section|display)\)|inherit|[\d.]+em)$/.test(value));
  assert.deepEqual(bad.map(({ file, value }) => `${file}: ${value}`), [], '字号改用 var(--yarn-fs-*)，见 DESIGN.md「字体」');
});

test('font weights are regular 400 or medium 500 only', () => {
  const bad = decls('font-weight').filter(({ value }) => !/^(400|500|inherit|normal)$/.test(value));
  assert.deepEqual(bad.map(({ file, value }) => `${file}: ${value}`), []);
});

test('font shorthands and families only reference the language font tokens', () => {
  const fam = decls('font-family').filter(({ value }) => !/^(var\(--yarn-(display|body)\)|inherit)$/.test(value));
  const short = decls('font').filter(({ value }) => value !== 'inherit' && !/^(400|500) var\(--yarn-fs-[\w-]+\)(\/[\d.]+)? var\(--yarn-(display|body)\)$/.test(value));
  assert.deepEqual([...fam, ...short].map(({ file, value }) => `${file}: ${value}`), []);
});

test('each language loads the rounded fonts its tokens name', () => {
  const tokens = read('assets/yarn-design-tokens.css');
  const layout = read('layout/theme.liquid');
  assert.match(tokens, /:root:lang\(en\) \{[^}]*--yarn-display: 'Nunito'[^}]*--yarn-body: 'Source Sans 3'/);
  assert.match(tokens, /:root:lang\(zh\) \{[^}]*--yarn-display: 'Noto Sans SC', 'Huninn'[^}]*--yarn-body: 'Noto Sans SC', 'Huninn'/);
  assert.match(layout, /family=Huninn&display=swap/);
  assert.match(layout, /family=Noto\+Sans\+SC:wght@400;500&text=/, 'zh punctuation subset only, never the full Noto Sans SC');
  assert.match(layout, /family=Nunito:wght@500&family=Source\+Sans\+3:wght@400;500&/);
});
