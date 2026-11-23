const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkPreviewTheme,
  parseArgs,
  resolvePages,
  resolveTarget,
  withPreviewTheme,
} = require('../scripts/proof.cjs');

test('withPreviewTheme appends preview_theme_id to bare and query-bearing URLs', () => {
  assert.equal(withPreviewTheme('https://hitoami.com/', ''), 'https://hitoami.com/');
  assert.equal(withPreviewTheme('https://hitoami.com/', '191276581177'), 'https://hitoami.com/?preview_theme_id=191276581177');
  assert.equal(withPreviewTheme('https://hitoami.com/zh', '191276581177'), 'https://hitoami.com/zh?preview_theme_id=191276581177');
  assert.equal(
    withPreviewTheme('https://hitoami.com/collections/yarn?ycb_color=variegated', '191276581177'),
    'https://hitoami.com/collections/yarn?ycb_color=variegated&preview_theme_id=191276581177',
  );
  assert.equal(
    withPreviewTheme('https://hitoami.com/collections/yarn?preview_theme_id=111&ycb_color=variegated#top', '191276581177'),
    'https://hitoami.com/collections/yarn?preview_theme_id=191276581177&ycb_color=variegated#top',
  );
});

test('checkPreviewTheme passes on matching unpublished theme and fails on mismatch, live theme, or missing Shopify theme', () => {
  assert.equal(checkPreviewTheme('', 191461359929), null);
  assert.equal(checkPreviewTheme('191276581177', 191276581177), null);
  assert.equal(checkPreviewTheme('191276581177', { id: 191276581177, role: 'unpublished' }), null);
  assert.match(checkPreviewTheme('191276581177', { id: 191461359929, role: 'main' }), /191276581177.*191461359929/);
  assert.match(checkPreviewTheme('191461359929', { id: 191461359929, role: 'main' }), /线上主题 191461359929/);
  assert.match(checkPreviewTheme('191276581177', null), /191276581177.*未知/);
  assert.match(checkPreviewTheme('191276581177', undefined), /191276581177.*未知/);
});

test('resolveTarget handles --preview, PROOF_PREVIEW_THEME_ID, implied live paths, and --base override', () => {
  assert.deepEqual(resolveTarget(parseArgs(['--preview', '191276581177']), {}), {
    baseUrl: 'https://hitoami.com',
    live: true,
    previewThemeId: '191276581177',
  });
  assert.deepEqual(resolveTarget({}, { PROOF_PREVIEW_THEME_ID: '191276581177' }), {
    baseUrl: 'https://hitoami.com',
    live: true,
    previewThemeId: '191276581177',
  });
  assert.deepEqual(resolveTarget(parseArgs(['--preview', '191276581177', '--base', 'https://tutaka-54.myshopify.com/']), {}), {
    baseUrl: 'https://tutaka-54.myshopify.com',
    live: true,
    previewThemeId: '191276581177',
  });
  assert.throws(() => resolveTarget(parseArgs(['--preview', 'not-a-number']), {}), /应为数字/);
});

test('resolvePages passes preview_theme_id when fetching products.json', async () => {
  const seen = [];
  const { resolved } = await resolvePages(
    [{ key: 'yarn-pdp-sold-out', find: 'sold-out-yarn' }],
    'https://hitoami.com',
    async (url) => {
      seen.push(url);
      return { ok: true, json: async () => ({ products: [{ handle: 'out-yarn', variants: [{ available: false, price: '980' }] }] }) };
    },
    '191276581177',
  );
  assert.deepEqual(seen, ['https://hitoami.com/collections/yarn/products.json?limit=250&preview_theme_id=191276581177']);
  assert.equal(resolved[0].path, '/products/out-yarn');
});
