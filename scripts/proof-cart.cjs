const assert = require('node:assert/strict');

async function cartItems(page) {
  return page.evaluate(async () => {
    const response = await fetch(`/cart.js?_proof=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Cart read failed: ${response.status}`);
    const cart = await response.json();
    return cart.items.map(({ variant_id, quantity }) => ({ variant_id, quantity })).sort((a, b) => a.variant_id - b.variant_id);
  });
}

// Exercise the actual quick-add button; an API seed is not the assertion.
async function quickAdd(page, selector) {
  const button = page.locator(selector).first();
  const id = Number(await button.getAttribute('data-cart-quick-add'));
  const before = await cartItems(page);
  const quantity = before.find(item => item.variant_id === id)?.quantity || 0;
  const [response] = await Promise.all([
    page.waitForResponse(response => response.request().method() === 'POST' && /\/cart\/add(?:\.js)?(?:\?|$)/.test(response.url())),
    button.click(),
  ]);
  assert.ok(response.ok(), `快捷加购响应 ${response.status()}`);
  const expected = (before.some(item => item.variant_id === id)
    ? before.map(item => item.variant_id === id ? { ...item, quantity: quantity + 1 } : item)
    : [{ variant_id: id, quantity: 1 }, ...before]).sort((a, b) => a.variant_id - b.variant_id);
  let actual;
  for (let attempt = 0; attempt < 10; attempt++) {
    actual = await cartItems(page);
    if (JSON.stringify(actual) === JSON.stringify(expected)) break;
    await page.waitForTimeout(100);
  }
  assert.deepEqual(actual, expected, '快捷加购结果与 Variant/数量不符');
  await page.locator('cart-drawer.active').waitFor();
}

async function cartChoice(page) {
  if (await page.locator('.yarn-cart-spare__add').count()) await quickAdd(page, '.yarn-cart-spare__add');
  const cards = page.locator('.yarn-cart-addon');
  assert.ok(await cards.count(), '前提不满足：没有凑单商品，未覆盖选规格路径');
  let choice = null;
  let single = null;
  for (let index = 0; index < await cards.count(); index++) {
    const card = cards.nth(index);
    const href = await card.locator('.yarn-cart-addon__text').getAttribute('href');
    const product = await page.evaluate(async path => (await fetch(`${path}.js`)).json(), href);
    if (product.variants.length > 1) {
      assert.equal(await card.locator('[data-cart-quick-add]').count(), 0, '多规格不得快捷加购');
      assert.equal(await card.locator('[data-cart-choose-options]').count(), 1);
      choice ||= href;
    } else {
      assert.equal(await card.locator('[data-cart-quick-add]').getAttribute('data-cart-quick-add'), String(product.variants[0].id));
      single ||= `[data-cart-quick-add="${product.variants[0].id}"]`;
    }
  }
  if (single) await quickAdd(page, single);
  assert.ok(choice, '前提不满足：凑单没有多规格商品，未覆盖选规格路径');
  const before = await cartItems(page);
  const language = await page.locator('html').getAttribute('lang');
  let adds = 0;
  const track = request => { if (request.method() === 'POST' && /\/cart\/add/.test(request.url())) adds++; };
  page.on('request', track);
  await page.locator('[data-cart-choose-options]').filter({ hasText: /./ }).first().click();
  await page.waitForURL(url => url.pathname.includes('/products/'));
  await page.waitForLoadState('load');
  assert.equal(await page.locator('html').getAttribute('lang'), language);
  assert.deepEqual(await cartItems(page), before, '进入选规格页面不得改变购物车');
  assert.equal(adds, 0);
  page.off('request', track);
}
module.exports = { cartChoice };
