// Isolated Liquid fixtures: use the actual theme files, never change Shopify inventory.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { Liquid } = require('liquidjs');
const ROOT = path.resolve(__dirname, '..');
const CASES = ['yarn-sold-out', 'yarn-buyable', 'yarn-unpriced', 'kit-blocked', 'kit-buyable', 'kit-partial', 'kit-unpriced'];
const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const field = value => ({ value });

function fixtureData(kind, locale) {
  const prefix = locale === 'ja' ? '' : `/${locale === 'zh-CN' ? 'zh' : locale}`;
  const names = { ja: ['検証用の毛糸', '検証用の作品'], 'zh-CN': ['测试毛线', '测试作品'], en: ['Test yarn', 'Test project'] }[locale];
  function product(id, available, price) {
    const item = { id, title: names[0], price, available, url: `${prefix}/products/fixture-${id}`, has_only_default_variant: false,
      options: ['Colour'], options_with_values: [{ name: 'Colour', position: 1, values: ['A'] }], metafields: {}, featured_image: '/fixture.svg' };
    const variant = { id, available, price, title: 'A', options: ['A'], option1: 'A', url: `${item.url}?variant=${id}`, product: item, featured_image: '/fixture.svg' };
    item.variants = [variant]; item.selected_or_first_available_variant = variant;
    return item;
  }
  const available = kind.endsWith('buyable') || kind === 'kit-partial';
  const price = kind.endsWith('unpriced') ? 0 : 120000;
  const main = product(101, available, price);
  const components = [main];
  if (kind === 'kit-partial') components.push(product(102, false, 120000));
  const project = { title: field(names[1]), release_scope: field('已核实可公开'), cover: field('/fixture.svg'), tutorial_url: field('https://example.com/tutorial'),
    system: { id: 'fixture', handle: 'fixture', url: '/pages/projects/fixture' },
    components: field(components.map(item => ({ component_type: field('毛线'), variant: field(item.variants[0]), quantity: field(2) }))) };
  return { product: main, metaobject: project, metaobjects: {}, section: { id: 'fixture', settings: {} }, settings: { yarn_line_url: '' },
    routes: { root_url: prefix || '/', cart_url: `${prefix}/cart`, all_products_collection_url: `${prefix}/collections/all` },
    collections: { yarn: { url: `${prefix}/collections/yarn` } }, localization: { language: { iso_code: locale } }, shop: { taxes_included: false } };
}

async function renderFixture(kind, locale = 'en') {
  if (!CASES.includes(kind) || !['ja', 'zh-CN', 'en'].includes(locale)) throw new Error('Unknown fixture');
  const translations = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', locale === 'en' ? 'en.default.json' : `${locale}.json`), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  const engine = new Liquid({ root: [path.join(ROOT, 'snippets')], extname: '.liquid', strictFilters: true });
  engine.registerFilter('t', (key, ...pairs) => {
    let text = key.split('.').reduce((value, part) => value?.[part], translations);
    const values = Object.fromEntries(pairs.filter(Array.isArray));
    if (text && typeof text === 'object') text = text[Number(values.count) === 1 ? 'one' : 'other'];
    if (typeof text !== 'string') throw new Error(`Missing fixture translation: ${key}`);
    return text.replace(/{{\s*(\w+)\s*}}/g, (_, name) => escape(values[name] ?? ''));
  });
  engine.registerFilter('asset_url', name => `/assets/${name}`);
  engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escape(url)}">`);
  engine.registerFilter('inline_asset_content', name => fs.readFileSync(path.join(ROOT, 'assets', path.basename(name)), 'utf8'));
  engine.registerFilter('image_url', () => '/fixture.svg');
  engine.registerFilter('image_tag', url => `<img src="${escape(url)}" width="390" height="300" alt="">`);
  engine.registerFilter('money', value => `¥${(Number(value) / 100).toLocaleString('en-US')}`);
  engine.registerFilter('metafield_tag', value => `<div>${escape(value?.value || '')}</div>`);
  const file = kind.startsWith('kit-') ? 'sections/yarn-kit-detail.liquid' : 'snippets/yarn-pdp-status.liquid';
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/{% schema %}[\s\S]*?{% endschema %}/g, '');
  const body = await engine.parseAndRender(source, fixtureData(kind, locale));
  return `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/yarn-design-tokens.css"><link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/assets/yarn-pdp.css"></head><body><main>${body}</main></body></html>`;
}

async function startFixtures() {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    try {
      if (request.method !== 'GET') { response.writeHead(405); response.end('Fixture: writes are disabled'); return; }
      if (url.pathname.startsWith('/assets/')) {
        const name = path.basename(url.pathname);
        response.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : name.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream');
        response.end(fs.readFileSync(path.join(ROOT, 'assets', name))); return;
      }
      if (url.pathname === '/fixture.svg') { response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg" width="390" height="300"><rect width="390" height="300" fill="#eee6dc"/></svg>'); return; }
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(await renderFixture(url.pathname.slice(1), url.searchParams.get('locale') || 'en'));
    } catch (error) { response.writeHead(500); response.end(error.message); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
module.exports = { CASES, fixtureData, renderFixture, startFixtures };
