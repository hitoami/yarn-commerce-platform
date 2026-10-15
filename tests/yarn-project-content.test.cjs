const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const detail = read('sections/yarn-project-detail.liquid');
const library = read('sections/yarn-project-library.liquid');
const card = read('snippets/yarn-project-card.liquid');
const visible = read('snippets/yarn-project-visible.liquid');
const materials = read('snippets/yarn-project-mode-materials.liquid');
const purchase = read('snippets/yarn-project-purchase.liquid');
const products = read('snippets/yarn-project-products.liquid');
const projectCss = read('assets/yarn-project.css');
const settingsSchema = JSON.parse(read('config/settings_schema.json').replace(/\/\*[\s\S]*?\*\//g, ''));

test('detail, library and card keep internal examples out of storefront visibility', () => {
  for (const [name, source] of Object.entries({ detail, library, card })) {
    assert.match(source, /render 'yarn-project-visible', project: project/, `${name} must use yarn-project-visible`);
  }
  assert.match(visible, /if settings\.yarn_internal_projects and request\.design_mode/);
  assert.match(visible, /project\.release_scope\.value == '已核实可公开'/);
  for (const requiredField of ['project.preparation.value', 'project.source_credit.value']) {
    assert.ok(visible.includes(`${requiredField} != blank`), `${requiredField} must be required for public visibility`);
  }
  assert.match(visible, /project\.tutorial\.value != blank or project\.tutorial_url\.value != blank or project\.video_url\.value != blank/);
  assert.doesNotMatch(visible, /project\.cover\.value != blank/);
});

test('internal examples and contact sending stay off by default', () => {
  const allSettings = settingsSchema.flatMap((group) => group.settings || []);
  const demoVisibility = allSettings.find((candidate) => candidate.id === 'yarn_internal_projects');
  assert.ok(demoVisibility, 'yarn_internal_projects setting missing');
  assert.equal(demoVisibility.type, 'checkbox');
  assert.equal(demoVisibility.default, false);
  const contactSending = allSettings.find((candidate) => candidate.id === 'yarn_customization_contact_enabled');
  assert.ok(contactSending, 'yarn_customization_contact_enabled setting missing');
  assert.equal(contactSending.type, 'checkbox');
  assert.equal(contactSending.default, false);
});

test('project cards link to the Project URL rather than a referenced Product', () => {
  assert.match(card, /href="\{\{\s*project\.system\.url(?:\s*\|\s*escape)?\s*\}\}"/);
  assert.doesNotMatch(card, /materials\.value\.first|finished_products\.value\.first|products?\.first|product\.url/);
});

test('project cards expose rich discovery fields and retain an intentional cover fallback', () => {
  assert.match(card, /yp-card__category[\s\S]*project\.category\.value/);
  assert.match(card, /yp-card__summary[\s\S]*project\.summary\.value \| escape/);
  assert.match(card, /<dl class="yp-card__facts">[\s\S]*'yarn_project\.difficulty' \| t[\s\S]*'yarn_project\.time' \| t/);
  assert.match(card, /project\.cover\.value == blank[\s\S]*yp-card__image--placeholder/);
  assert.match(card, /<svg[^>]*viewBox="0 0 32 32"[^>]*focusable="false"/);
  assert.match(projectCss, /\.yp-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(projectCss, /@media \(max-width: 989px\)[\s\S]*\.yp-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(projectCss, /\.yp-card__summary \{[^}]*-webkit-line-clamp: 3/);
  assert.match(projectCss, /@media \(max-width: 989px\)[\s\S]*\.yp-card__summary \{ display: none; \}/);
  assert.match(projectCss, /@media \(max-width: 749px\)[\s\S]*\.yp-card__facts \{ display: flex; flex-wrap: wrap;/);
  assert.match(projectCss, /\.yp-card__facts dt \{[^}]*clip: rect\(0, 0, 0, 0\)/);
});

test('Project and Product links use Shopify resource URLs without hand-built locale paths', () => {
  assert.match(card, /href="\{\{\s*project\.system\.url(?:\s*\|\s*escape)?\s*\}\}"/);
  assert.match(products, /render 'yarn-project-product-url', url: product\.url/);
  assert.match(products, /href="\{\{\s*product_url\s*\|\s*escape\s*\}\}"/);
  for (const source of [card, products]) {
    assert.doesNotMatch(source, /request\.locale|localization\.language|routes\.root_url\s*\|\s*append/);
    assert.doesNotMatch(source, /\/zh\/|\/en\/|\/ja\//);
  }
  assert.match(detail, /href="\{\{ routes\.root_url \}\}"/);
});

test('rich text fields are rendered through metafield_tag and never emitted as raw value HTML', () => {
  assert.match(detail, /project\.preparation\.value != blank[\s\S]*project\.preparation \| metafield_tag/);
  assert.match(detail, /project\.tutorial\.value != blank[\s\S]*project\.tutorial \| metafield_tag/);
  assert.doesNotMatch(detail, /\{\{\s*project\.(?:preparation|tutorial)\.value\s*\}\}/);
});

test('source credit remains visible without an external tutorial link', () => {
  assert.match(detail, /if project\.source_credit\.value != blank or project\.tutorial_url\.value != blank or project\.video_url\.value != blank[\s\S]*<div class="yp-source">/);
  assert.match(detail, /project\.source_credit\.value != blank[\s\S]*project\.source_credit\.value \| escape/);
  assert.match(detail, /if project\.tutorial_url\.value != blank or project\.video_url\.value != blank[^%]*%\}<p class="yp-small">\{\{ 'yarn_project\.source_note' \| t \}\}<\/p>\{% endif %\}/);
});

test('material, tool and finished references all render Shopify Product truth', () => {
  assert.match(materials, /for product in project\.materials\.value[\s\S]*render 'yarn-project-purchase', product: product/);
  assert.match(materials, /project\.tools\.value[\s\S]*render 'yarn-project-products', products: project\.tools\.value/);
  assert.match(detail, /for product in project\.finished_products\.value[\s\S]*render 'yarn-kit-crosslinks', kind: 'product', target: product/);
  assert.match(purchase, /chosen_variant\.price[\s\S]*chosen_variant\.available/);
  assert.match(products, /for product in products/);
  assert.match(products, /product\.title \| escape/);
  assert.match(products, /href="\{\{ product_url \| escape \}\}"/);
  assert.match(products, /render 'price', product: product/);
  assert.doesNotMatch(products, /assign\s+quantity|name="quantity"|\b\d+\s*(?:balls?|skeins?|团|玉)\b/i);
});

test('contact form requires both switches, carries identity, and collects only required basics', () => {
  assert.match(detail, /if project\.customization_enabled\.value[\s\S]*if settings\.yarn_customization_contact_enabled[\s\S]*form 'contact'/);
  for (const identity of ['contact[Project ID]', 'contact[Project]', 'contact[Project URL]']) {
    assert.match(detail, new RegExp(`type="hidden" name="${identity.replace(/[\[\]]/g, '\\$&')}"`));
  }
  assert.match(detail, /name="contact\[name\]"[^>]*required/);
  assert.match(detail, /name="contact\[email\]"[^>]*required/);
  assert.match(detail, /name="contact\[body\]"[^>]*required/);
  assert.match(detail, /form\.posted_successfully\?[\s\S]*role="status"/);
  assert.match(detail, /form\.errors[\s\S]*role="alert"[\s\S]*form\.errors \| default_errors/);
  assert.match(detail, /value="\{\{ form\.name \| escape \}\}"/);
  assert.match(detail, /value="\{\{ form\.email \| escape \}\}"/);
  assert.match(detail, />\{\{ form\.body \| escape \}\}<\/textarea>/);
  assert.match(detail, /form\.errors contains 'email'[\s\S]*aria-invalid="true"/);
});

test('library pagination keeps filtering complete and section-rendered', () => {
  assert.match(library, /paginate shop\.metaobjects\.yarn_project\.values by 250/);
  assert.match(library, /paginate\.next\.url \| escape[\s\S]*section_id=\{\{ section\.id \| url_encode \}\}/);
  assert.match(library, /data-project-loading hidden role="status"/);
  assert.match(library, /data-project-error hidden role="alert"/);
  assert.match(library, /data-project-retry/);
});

test('the three primary locales expose the same complete yarn_project key set', () => {
  const localePaths = ['locales/en.default.json', 'locales/zh-CN.json', 'locales/ja.json'];
  const locales = localePaths.map((path) => JSON.parse(read(path).replace(/\/\*[\s\S]*?\*\//g, '')).yarn_project);
  const expectedKeys = Object.keys(locales[0]).sort();
  assert.ok(expectedKeys.length > 0);
  locales.forEach((locale, index) => {
    assert.deepEqual(Object.keys(locale).sort(), expectedKeys, localePaths[index]);
    expectedKeys.forEach((key) => assert.notEqual(String(locale[key]).trim(), '', `${localePaths[index]}:${key}`));
  });
});

test('mobile preparation gains space without truncating Project truth', () => {
  assert.match(projectCss, /grid-template-columns: 112px minmax\(0, 1fr\)/);
  assert.match(projectCss, /height: 112px; aspect-ratio: auto; object-fit: contain/);
  assert.match(projectCss, /grid-template-columns: repeat\(auto-fit, minmax\(84px, 1fr\)\)/);
  assert.doesNotMatch(projectCss, /\.yp-(?:title|summary|facts|notice)[^{]*\{[^}]*line-clamp/);
  assert.match(detail, /project\.summary\.value \| escape \| newline_to_br/);
});
