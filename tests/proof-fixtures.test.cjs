const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderFixture, startFixtures } = require('../scripts/proof-fixtures.cjs');
for (const locale of ['ja', 'zh-CN', 'en']) {
  test(`real Liquid purchase states remain covered without live inventory: ${locale}`, async () => {
    assert.match(await renderFixture('yarn-sold-out', locale), /yp-status--sold-out/);
    for (const kind of ['yarn-buyable', 'yarn-unpriced']) assert.doesNotMatch(await renderFixture(kind, locale), /yp-status--sold-out/);
    for (const kind of ['kit-blocked', 'kit-unpriced']) {
      const html = await renderFixture(kind, locale);
      assert.match(html, /class="yk-blocked"/);
      assert.doesNotMatch(html, /data-kit-add=/);
      assert.doesNotMatch(html, /class="yk-sticky__add"/);
    }
    assert.match(await renderFixture('kit-buyable', locale), /data-kit-add="all"/);
    assert.match(await renderFixture('kit-partial', locale), /data-kit-add="available"/);
  });
}
test('isolated fixture server rejects all mutation requests', async () => {
  const server = await startFixtures();
  try { assert.equal((await fetch(`${server.url}/cart/add.js`, { method: 'POST' })).status, 405); }
  finally { await server.close(); }
});
