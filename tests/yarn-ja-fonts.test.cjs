const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const read = path => readFileSync(path, 'utf8');
const squash = text => text.replace(/\s+/g, ' ').replace(/ ?, ?/g, ', ').trim();

// #326：日文圆润字体不带 palt，靠 yarn-design-tokens.css 里一份 :root:lang(ja) :is(...) 列表统一收紧标题字距。
// 任何用标题字体的规则都要在这份列表里，否则这个标题在日文页会比其他标题松。
test('every display-font rule is covered by the Japanese heading tracking list', () => {
  const tokens = read('assets/yarn-design-tokens.css');
  const block = tokens.match(/:root:lang\(ja\) :is\(([\s\S]*?)\) \{\s*letter-spacing: -0\.05em;/);
  assert.ok(block, 'yarn-design-tokens.css 缺少日文标题字距列表');
  const covered = ` ${squash(block[1])},`;

  const missing = [];
  for (const file of readdirSync('assets').filter(name => name.endsWith('.css'))) {
    if (file === 'yarn-design-tokens.css' || file === 'template-giftcard.css') continue;
    const css = read(`assets/${file}`).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/var\(--(yarn-display|font-heading-family)\)/.test(body)) continue;
      const rule = squash(selector);
      if (rule.startsWith("html[lang^='zh']")) continue;
      if (!covered.includes(` ${rule},`) && !rule.split(/,(?![^(]*\))/).every(part => covered.includes(` ${part.trim()},`))) {
        missing.push(`${file}: ${rule}`);
      }
    }
  }
  assert.deepEqual(missing, [], `把这些选择器加进 yarn-design-tokens.css 的日文标题字距列表：\n${missing.join('\n')}`);
});

test('Japanese pages load exactly the rounded fonts the tokens name', () => {
  const tokens = read('assets/yarn-design-tokens.css');
  assert.match(tokens, /--yarn-display: 'Kiwi Maru'/);
  assert.match(tokens, /--yarn-body: 'Zen Maru Gothic'/);
  assert.match(read('layout/theme.liquid'), /family=Kiwi\+Maru:wght@500&family=Zen\+Maru\+Gothic:wght@400;500&/);
});
