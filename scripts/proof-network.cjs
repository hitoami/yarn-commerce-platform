const assert = require('node:assert/strict');

async function collectionRecovery(page) {
  const grid = page.locator('[data-ycb-grid]');
  const original = await grid.locator(':scope > li').count();
  let failures = 0;
  const failPages = async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('section_id') && url.searchParams.has('page')) {
      failures++;
      await route.fulfill({ status: 503, contentType: 'text/html', body: 'Injected read failure' });
    } else await route.continue();
  };
  await page.route('**/collections/**', failPages);
  await page.locator('[data-ycb-beginner]').click();
  await page.locator('[data-ycb-load-error]:visible').first().waitFor();
  assert.ok(failures, '前提不满足：目录没有多页请求，未覆盖加载失败');
  assert.equal(await grid.locator(':scope > li').count(), original, '失败不得丢失已加载商品');
  assert.equal(await grid.getAttribute('aria-busy'), null);
  assert.equal(await page.locator('[data-ycb-more]').isVisible(), true, '失败不得隐藏后续商品入口');
  await page.unroute('**/collections/**', failPages);
  await page.locator('[data-ycb-load-retry]:visible').first().click();
  await page.waitForFunction(() => !document.querySelector('[data-ycb-grid]').hasAttribute('aria-busy') && document.querySelector('[data-ycb-more]').hidden);
  assert.ok(await grid.locator(':scope > li').count() > original, '重试应加载完整目录');
  assert.equal(await page.locator('[data-ycb-load-error]:visible').count(), 0);
  assert.equal(await page.locator('[data-ycb-beginner]').getAttribute('aria-pressed'), 'true');
}

async function cartRecovery(page) {
  const button = page.locator('[data-cart-quick-add]').first();
  assert.ok(await button.count(), '前提不满足：无快捷加购按钮');
  let attempts = 0;
  let uncertain = false;
  const reject = async route => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts++;
    if (uncertain) await route.abort('failed');
    else await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ description: '' }) });
  };
  await page.route('**/cart/add*', reject);
  await button.click();
  await page.locator('[data-cart-quick-status]:visible').waitFor();
  assert.equal(await button.isEnabled(), true, '明确拒绝后应允许重试');
  assert.equal(await page.locator('[data-cart-quick-review]').isVisible(), false);
  uncertain = true;
  await button.click();
  await page.locator('[data-cart-quick-review]:visible').waitFor();
  assert.equal(await button.isDisabled(), true, '结果不明时不得重复加购');
  await button.evaluate(element => element.click());
  assert.equal(attempts, 2);
  await page.unroute('**/cart/add*', reject);
}
module.exports = { collectionRecovery, cartRecovery };
