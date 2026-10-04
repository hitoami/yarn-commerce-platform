const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { setQuantity, formatMoney } = require('../assets/yarn-pdp.js');

const read = (path) => fs.readFileSync(path, 'utf8');
const input = (attrs) => {
  const events = [];
  return { dataset: {}, min: '', max: '', step: '', value: '', ...attrs, events, dispatchEvent: (event) => events.push(event.type) };
};

test('usage fill and sticky stepper respect the Variant quantity rule', () => {
  const plain = input({ min: '1', step: '1' });
  assert.equal(setQuantity(plain, 3), 3);
  assert.equal(plain.value, 3);
  assert.deepEqual(plain.events, ['change']);
  assert.equal(setQuantity(input({ min: '1', step: '1' }), 0), 1);
  assert.equal(setQuantity(input({ dataset: { min: '2', max: '6' }, step: '2' }), 5), 6);
  assert.equal(setQuantity(input({ dataset: { min: '2', max: '6' }, step: '2' }), 9), 6);
  // Rise lowers max by what is already in the cart; the live attribute wins over the Variant rule.
  assert.equal(setQuantity(input({ dataset: { min: '1', max: '10' }, min: '1', max: '4', step: '1' }), 6), 4);
});

test('sticky total follows the shop money format in minor units', () => {
  assert.equal(formatMoney(660000, '¥{{amount_no_decimals}}'), '¥6,600');
  assert.equal(formatMoney(220000, '¥{{ amount_no_decimals }} JPY'), '¥2,200 JPY');
  assert.equal(formatMoney(123456, '€{{amount_with_comma_separator}}'), '€1.234,56');
  assert.equal(formatMoney(123456, '${{amount}}'), '$1,234.56');
});

test('only yarn products get the new layout, and it stays on the native product form', () => {
  const section = read('sections/main-product.liquid');
  assert.match(section, /if product\.tags contains '毛糸' or yarn_collection_handles contains 'yarn'\s+assign yarn_pdp = true/);
  assert.match(section, /\{%-? if yarn_pdp -?%\}\s+\{% render 'yarn-pdp-details'/);
  const sticky = read('snippets/yarn-pdp-sticky-buy.liquid');
  assert.doesNotMatch(sticky, /<form|name="(id|quantity)"|form=/, 'sticky bar must not become a second form');
  const js = read('assets/yarn-pdp.js');
  assert.match(js, /ProductSubmitButton-\$\{this\.sectionId\}/);
  assert.match(js, /button\.click\(\)/);
  assert.doesNotMatch(js, /fetch\(|localStorage|sessionStorage|\/cart\/add/);
});

test('lower yarn blocks read Shopify data only and render nothing when it is missing', () => {
  const details = read('snippets/yarn-pdp-details.liquid');
  for (const field of ['composition', 'material', 'ball_weight_g', 'ball_length_m', 'thickness', 'gauge', 'needle_knit', 'needle_crochet', 'needle_size', 'usage_estimates', 'related_kits', 'care']) {
    assert.match(details, new RegExp(`y\\.${field}\\.value`), field);
  }
  assert.match(details, /spec_rows contains 'yp-yarn-spec__row'/);
  assert.match(details, /usage_items contains 'data-usage-result'/);
  assert.match(details, /work_cards contains 'yx-project-pick'/);
  assert.match(details, /care_lines != blank/);
  assert.match(details, /render 'yarn-project-visible'/);
  const markup = details.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
  assert.doesNotMatch(markup, /团|玉|\d+\s*(g|m|mm|cm)\b/, 'no hard-coded demo specs or counts');
});

test('yarn PDP copy exists in ja, zh-CN and en', () => {
  const strip = (text) => text.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  const [en, ja, zh] = ['en.default', 'ja', 'zh-CN'].map((locale) => JSON.parse(strip(read(`locales/${locale}.json`))).yarn_pdp);
  assert.deepEqual(Object.keys(ja).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  assert.equal(zh.usage_heading, '要买几团？');
  assert.notEqual(ja.usage_heading, en.usage_heading);
});
