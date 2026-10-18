const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// #131 材料包页：「全部加入购物车」一次请求、带团数与来源属性；被拒不锁定，结果不确定时锁定并提示看购物车。
// #177：部分缺货时主按钮改为「只加入可买的」，只买可售行、不替换；团数由步进器修改。
function row(variant, qty, available = true, price = 1200) {
  const input = { value: String(qty) };
  return { dataset: { variant: String(variant), available: String(available), price: String(price) }, querySelector: () => input, input };
}

function setup(fetcher, { rows = [row(11, 2), row(22, 2)], drawer = null } = {}) {
  const registry = new Map();
  const status = { hidden: true, textContent: '' };
  const cartLink = { hidden: true, href: '/zh/cart' };
  const navigations = [];
  const buttons = [];
  class Element {
    dataset = { pending: 'Adding', success: 'Added', error: 'Rejected', incomplete: 'Choose an available yarn for every row', uncertain: 'Check cart', addUrl: '/zh/cart/add', kit: '流苏围巾', kitHandle: 'tassel-scarf' };
    addEventListener(type, listener) { this.listener = listener; }
    querySelector(selector) { return ({ '[data-kit-status]': status, '[data-kit-cart]': cartLink })[selector]; }
    querySelectorAll(selector) { return selector === '[data-kit-row]' ? rows : buttons; }
  }
  vm.runInNewContext(fs.readFileSync('assets/yarn-kit.js', 'utf8'), {
    HTMLElement: Element,
    customElements: { get: (key) => registry.get(key), define: (key, value) => registry.set(key, value) },
    fetch: fetcher,
    document: { querySelector: () => drawer },
    window: { location: { pathname: '/zh/pages/projects/tassel-scarf', assign: (url) => navigations.push(url) } },
    AbortController, setTimeout: () => 1, clearTimeout: () => {}, JSON, Math, Number,
  });
  const element = new (registry.get('yarn-kit-buy'))();
  element.connectedCallback();
  const click = (kind, target = rows[0]) => {
    const button = { dataset: { kitAdd: kind }, disabled: false, textContent: 'Add all', closest: (selector) => (selector === '[data-kit-add]' ? button : selector === '[data-kit-step]' ? null : target) };
    buttons.push(button);
    element.listener({ target: button });
    return button;
  };
  return { element, status, cartLink, navigations, rows, click };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('add all sends the complete yarn list with its quantities and kit source in one request', async () => {
  const calls = [];
  const ui = setup(async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true, status: 200, json: async () => ({ items: [] }) }; },
    { rows: [row(11, 2), row(22, 3)] });
  ui.click('all');
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/zh/cart/add.js');
  assert.deepEqual(calls[0].body.items.map(({ id, quantity }) => [id, quantity]), [[11, 2], [22, 3]]);
  assert.deepEqual(calls[0].body.items[0].properties, { _Kit: '流苏围巾', '_Kit handle': 'tassel-scarf' });
  assert.equal(ui.status.textContent, 'Added');
  assert.equal(ui.cartLink.hidden, false);
});


test('add all never silently buys a partial list when one yarn is unavailable', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; return { ok: true, json: async () => ({}) }; },
    { rows: [row(11, 2), row(22, 3, false)] });
  ui.click('all');
  await settle();
  assert.equal(calls, 0);
  assert.equal(ui.status.hidden, false);
  assert.equal(ui.status.textContent, 'Choose an available yarn for every row');
});

test('unconfirmed zero or missing prices block both row and complete-list purchases', async () => {
  for (const price of [0, '']) {
    for (const kind of ['row', 'all']) {
      let calls = 0;
      const ui = setup(async () => { calls++; return { ok: true, json: async () => ({}) }; },
        { rows: [row(11, 2, true, price), row(22, 3)] });
      ui.click(kind);
      await settle();
      assert.equal(calls, 0, `${kind} price=${price}`);
      assert.equal(ui.status.hidden, false);
    }
  }
});

test('an available row remains individually purchasable when another row is unavailable', async () => {
  const bodies = [];
  const ui = setup(async (_, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; },
    { rows: [row(11, 2), row(22, 3, false)] });
  ui.click('row');
  await settle();
  assert.deepEqual(bodies[0].items.map(({ id, quantity }) => [id, quantity]), [[11, 2]]);
});

test('add available buys only the rows in stock, with their quantities, and never substitutes', async () => {
  const bodies = [];
  const ui = setup(async (_, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; },
    { rows: [row(11, 2), row(22, 3, false), row(44, 1, true, 0)] });
  ui.click('available');
  await settle();
  assert.equal(bodies.length, 1);
  assert.deepEqual(bodies[0].items.map(({ id, quantity }) => [id, quantity]), [[11, 2]]);
});

test('add available with nothing in stock sends nothing', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; return { ok: true, json: async () => ({}) }; }, { rows: [row(22, 3, false)] });
  ui.click('available');
  await settle();
  assert.equal(calls, 0);
  assert.equal(ui.status.hidden, false);
});

test('a row button adds only that row, and an edited quantity is respected and rounded up to at least one', async () => {
  const bodies = [];
  const ui = setup(async (_, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, status: 200, json: async () => ({}) }; });
  ui.rows[1].input.value = '0';
  ui.click('row', ui.rows[1]);
  await settle();
  assert.deepEqual(bodies[0].items.map(({ id, quantity }) => [id, quantity]), [[22, 1]]);
});

test('the cart drawer refreshes from the add response when every section came back', async () => {
  let rendered = null;
  const classes = new Set(['is-empty']);
  const drawer = { classList: { remove: (name) => classes.delete(name) }, getSectionsToRender: () => [{ id: 'cart-drawer' }, { id: 'cart-icon-bubble' }], setActiveElement() {}, renderContents: (state) => { rendered = state; } };
  let sent;
  const ui = setup(async (_, options) => { sent = JSON.parse(options.body); return { ok: true, status: 200, json: async () => ({ sections: { 'cart-drawer': '<div></div>', 'cart-icon-bubble': '<div></div>' } }) }; }, { drawer });
  ui.click('all');
  await settle();
  assert.deepEqual(sent.sections, ['cart-drawer', 'cart-icon-bubble']);
  assert.equal(sent.sections_url, '/zh/pages/projects/tassel-scarf');
  assert.ok(rendered);
  // #182: a drawer opened from an empty cart must drop is-empty, or Rise keeps the new items hidden.
  assert.equal(classes.has('is-empty'), false);
  assert.deepEqual(ui.navigations, []);
});

test('a Shopify rejection explains why and leaves the buttons usable', async () => {
  const ui = setup(async () => ({ ok: false, status: 422, json: async () => ({ description: '库存不足' }) }));
  const button = ui.click('all');
  await settle();
  assert.match(ui.status.textContent, /Rejected 库存不足/);
  assert.equal(button.disabled, false);
});

test('a server error or dropped connection never retries and locks every add button', async () => {
  let calls = 0;
  const ui = setup(async () => { calls += 1; throw new Error('network'); });
  const first = ui.click('all');
  await settle();
  assert.equal(ui.status.textContent, 'Check cart');
  assert.equal(first.disabled, true);
  ui.click('all');
  await settle();
  assert.equal(calls, 1);
});

test('the kit page buys yarn variants only, with one main button: add all, add only the available yarn, or a no-dead-end panel', () => {
  const section = fs.readFileSync('sections/yarn-kit-detail.liquid', 'utf8');
  const template = JSON.parse(fs.readFileSync('templates/metaobject/yarn_project.json', 'utf8'));
  assert.equal(template.sections.main.type, 'yarn-kit-detail');
  assert.match(section, /component\.component_type\.value == '毛线' and component\.variant\.value != blank/);
  assert.match(section, /yarn_rows == 1/);
  assert.match(section, /data-kit-add="all"/);
  assert.match(section, /data-kit-add="available"/);
  assert.match(section, /data-kit-step="-1"/);
  assert.match(section, /class="yk-blocked"/);
  assert.doesNotMatch(section, /data-kit-add="all"[^>]*disabled/);
  assert.match(section, /project\.tutorial_url\.value/);
  // 材料包页不提供定制咨询，也不出现「买成品 / 自己做」双模式。
  assert.doesNotMatch(section, /customization_enabled|purchase_modes|yarn-project-modes/);
});

test('changing the colour submits the selected variant and retains the project quantity', async () => {
  const bodies = [];
  const material = row(11, 3, false, 0);
  const qty = material.input;
  const option = { value: '33', dataset: { price: '1600', available: 'true', url: '/products/yarn?variant=33' } };
  const priceLabel = { textContent: '' };
  const link = { href: '' };
  const stepper = { hidden: true };
  material.classList = { toggle() {} };
  material.querySelector = selector => ({ '[data-kit-colour]': { selectedOptions: [option] }, '[data-kit-qty]': qty, '[data-kit-price]': priceLabel, '[data-kit-stepper]': stepper })[selector];
  material.querySelectorAll = () => [link];
  const ui = setup(async (_, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; }, { rows: [material] });
  ui.element.dataset.currency = 'JPY';
  ui.element.dataset.locale = 'ja';
  ui.element.refreshRow(material);
  assert.equal(stepper.hidden, false);
  assert.equal(link.href, option.dataset.url);
  assert.equal(priceLabel.textContent, '￥16');
  ui.click('all');
  await settle();
  assert.deepEqual(bodies[0].items.map(({ id, quantity }) => [id, quantity]), [[33, 3]]);
  option.dataset.available = 'false';
  ui.element.refreshRow(material);
  assert.equal(stepper.hidden, true);
  assert.equal(ui.element.items([material]).length, 0);
});

test('an empty 404 rejection is recoverable and never treated as an uncertain accepted purchase', async () => {
  const ui = setup(async () => ({ ok: false, status: 404, json: async () => { throw new Error('empty body'); } }));
  const button = ui.click('all');
  await settle();
  assert.equal(button.disabled, false);
  assert.match(ui.status.textContent, /Rejected/);
  assert.equal(Boolean(ui.element.uncertain), false);
});
