const assert = require('node:assert/strict');
async function searchFocus(page) {
  const initial = new URL(page.url());
  if ((await page.locator('html').getAttribute('lang')).startsWith('en')) initial.searchParams.set('q', 'yarn');
  initial.searchParams.delete('group');
  const original = initial.href;
  const query = initial.searchParams.get('q');
  for (const activation of ['Enter', 'Space', 'click']) {
    await page.goto(original, { waitUntil: 'load' });
    const more = page.locator('[data-search-show-all]');
    await more.waitFor();
    await more.focus();
    if (activation === 'click') await more.click();
    else await page.keyboard.press(activation);
    const tab = page.locator('[data-search-tab="yarn"]');
    assert.equal(await tab.getAttribute('aria-pressed'), 'true');
    assert.ok(await tab.evaluate(element => document.activeElement === element), `${activation} 后焦点必须留在毛线分组`);
    assert.equal(new URL(page.url()).searchParams.get('q'), query);
    let reached = false;
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => Boolean(document.activeElement.closest('[data-discovery-card]')))) { reached = true; break; }
    }
    assert.ok(reached, `${activation} 后 Tab 应可到商品结果`);
  }
}
module.exports = { searchFocus };
