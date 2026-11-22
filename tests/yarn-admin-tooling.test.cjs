const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const admin = require('../scripts/shopify-admin.cjs');
const cleanup = require('../scripts/cleanup-store-data.cjs');

// ---------------------------------------------------------------------------
// 1. shopify-admin.cjs: --active-only flag & filter logic
// ---------------------------------------------------------------------------

test('parseArgs supports --active-only while preserving default false and existing flags', () => {
  const def = admin.parseArgs(['coverage', 'ja']);
  assert.equal(def.activeOnly, false);
  assert.equal(def.write, false);
  assert.deepEqual(def.positional, ['coverage', 'ja']);

  const active = admin.parseArgs(['coverage', 'en', '--active-only']);
  assert.equal(active.activeOnly, true);
  assert.deepEqual(active.positional, ['coverage', 'en']);
});

test('isInternalDemoHandle and isInternalDemoMetaobject detect demo/e2e/internal prototypes', () => {
  assert.equal(admin.isInternalDemoHandle('demo-square-basket'), true);
  assert.equal(admin.isInternalDemoHandle('e-2-e-existing-material-project'), true);
  assert.equal(admin.isInternalDemoHandle('issue-34-demo-cross-stitch-basket'), true);
  assert.equal(admin.isInternalDemoHandle('sample-main-yarn'), true);
  assert.equal(admin.isInternalDemoHandle('kit-xuebao-fringe-scarf'), false);
  assert.equal(admin.isInternalDemoHandle('gradient'), false);

  assert.equal(admin.isInternalDemoMetaobject({
    handle: 'rain-check-tote',
    fields: [{ key: 'release_scope', value: '仅内部原型' }],
  }), true);
  assert.equal(admin.isInternalDemoMetaobject({
    handle: 'kit-tyndall-kids-scarf',
    fields: [{ key: 'release_scope', value: '已核实可公开' }],
  }), false);
});

test('filterActiveTranslatableNodes excludes ARCHIVED products, demo metaobjects, archived metafields, and prototype menus', () => {
  const context = {
    archivedProductIds: new Set(['gid://shopify/Product/1']),
    archivedMetafieldIds: new Set(['gid://shopify/Metafield/10']),
    internalMetaobjectIds: new Set(['gid://shopify/Metaobject/20']),
    prototypeMenuIds: new Set(['gid://shopify/Menu/30']),
  };

  const prodRes = admin.filterActiveTranslatableNodes('PRODUCT', [
    { resourceId: 'gid://shopify/Product/1', translatableContent: [{ key: 'title', value: '旧款' }], translations: [] },
    { resourceId: 'gid://shopify/Product/2', translatableContent: [{ key: 'title', value: '新款' }], translations: [{ key: 'title', value: '新作', outdated: false }] },
  ], context);
  assert.equal(prodRes.excluded, 1);
  assert.equal(prodRes.kept.length, 1);
  assert.deepEqual(admin.summarizeCoverage(prodRes.kept), { total: 1, full: 1, partial: 0, none: 0 });

  const moRes = admin.filterActiveTranslatableNodes('METAOBJECT', [
    { resourceId: 'gid://shopify/Metaobject/20', translatableContent: [{ key: 'title', value: 'demo' }], translations: [] },
    { resourceId: 'gid://shopify/Metaobject/21', translatableContent: [{ key: 'title', value: 'kit' }], translations: [] },
  ], context);
  assert.equal(moRes.excluded, 1);
  assert.equal(moRes.kept.length, 1);

  const mfRes = admin.filterActiveTranslatableNodes('METAFIELD', [
    { resourceId: 'gid://shopify/Metafield/10', translatableContent: [{ key: 'value', value: '100%棉' }], translations: [] },
    { resourceId: 'gid://shopify/Metafield/11', translatableContent: [{ key: 'value', value: '100%羊毛' }], translations: [] },
  ], context);
  assert.equal(mfRes.excluded, 1);
  assert.equal(mfRes.kept.length, 1);

  const menuRes = admin.filterActiveTranslatableNodes('MENU', [
    { resourceId: 'gid://shopify/Menu/30', translatableContent: [{ key: 'title', value: 'Issue 23' }], translations: [] },
    { resourceId: 'gid://shopify/Menu/31', translatableContent: [{ key: 'title', value: 'Main' }], translations: [] },
  ], context);
  assert.equal(menuRes.excluded, 1);
  assert.equal(menuRes.kept.length, 1);
});

test('extractCoverageGaps lists missing and outdated keys cleanly for ops and excludes handle', () => {
  const metaById = new Map([
    ['gid://shopify/Product/2', { handle: 'mvp-yarn-16', title: '十刻纯色', status: 'ACTIVE' }],
  ]);
  const gaps = admin.extractCoverageGaps('PRODUCT', [
    {
      resourceId: 'gid://shopify/Product/2',
      translatableContent: [
        { key: 'title', value: '十刻纯色' },
        { key: 'body_html', value: '<p>说明</p>' },
        { key: 'handle', value: 'mvp-yarn-16' },
        { key: 'product_type', value: '毛线' },
      ],
      translations: [
        { key: 'title', value: '十刻', outdated: false },
        { key: 'body_html', value: '<p>旧説明</p>', outdated: true },
      ],
    },
  ], metaById);

  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].handle, 'mvp-yarn-16');
  assert.deepEqual(gaps[0].missingKeys, ['body_html']);
  assert.deepEqual(gaps[0].outdatedKeys, ['body_html']);
});

test('summarizeCoverage ignores handle and non-translatable enum fields so translated resources count as full', () => {
  const nodes = [
    {
      resourceId: 'gid://shopify/Product/10',
      translatableContent: [
        { key: 'title', value: '十刻纯色' },
        { key: 'handle', value: 'mvp-yarn-16' },
        { key: 'product_type', value: '毛线' },
      ],
      translations: [{ key: 'title', value: '十刻単色', outdated: false }],
    },
    {
      resourceId: 'gid://shopify/Product/11',
      translatableContent: [{ key: 'handle', value: 'handle-only' }],
      translations: [],
    },
  ];
  assert.deepEqual(admin.summarizeCoverage(nodes), { total: 1, full: 1, partial: 0, none: 0 });
  assert.deepEqual(admin.extractCoverageGaps('PRODUCT', nodes), []);

  const metaById = new Map([
    ['gid://shopify/Metaobject/50', { handle: 'kit-a', type: 'yarn_project', displayName: '围巾' }],
    ['gid://shopify/Metaobject/51', { handle: 'mat-a', type: 'yarn_material', displayName: '主线' }],
  ]);
  const moNodes = [
    {
      resourceId: 'gid://shopify/Metaobject/50',
      translatableContent: [
        { key: 'title', value: '围巾' },
        { key: 'handle', value: 'kit-a' },
        { key: 'category', value: '配饰' },
        { key: 'difficulty', value: '新手' },
        { key: 'release_scope', value: '已核实可公开' },
      ],
      translations: [{ key: 'title', value: 'マフラー', outdated: false }],
    },
    {
      resourceId: 'gid://shopify/Metaobject/51',
      translatableContent: [
        { key: 'title', value: '主线' },
        { key: 'supply', value: '本店提供' },
        { key: 'component_type', value: '毛线' },
      ],
      translations: [{ key: 'title', value: 'メイン糸', outdated: false }],
    },
  ];
  assert.deepEqual(admin.summarizeCoverage(moNodes, { metaById }), { total: 2, full: 2, partial: 0, none: 0 });
  assert.deepEqual(admin.extractCoverageGaps('METAOBJECT', moNodes, metaById), []);
});

test('filterActiveTranslatableNodes excludes DRAFT products, shopify-- system metaobjects, and non-narrative metafields', () => {
  const context = {
    archivedProductIds: new Set(['gid://shopify/Product/1']),
    draftProductIds: new Set(['gid://shopify/Product/2']),
    archivedMetafieldIds: new Set(['gid://shopify/Metafield/10']),
    draftMetafieldIds: new Set(['gid://shopify/Metafield/11']),
    nonNarrativeMetafieldIds: new Set(['gid://shopify/Metafield/12']),
    systemMetaobjectIds: new Set(['gid://shopify/Metaobject/20']),
    metaById: new Map([
      ['gid://shopify/Metaobject/21', { type: 'shopify--color-pattern', handle: 'black' }],
      ['gid://shopify/Metaobject/22', { type: 'yarn_project', handle: 'kit-scarf' }],
    ]),
  };

  const prodRes = admin.filterActiveTranslatableNodes('PRODUCT', [
    { resourceId: 'gid://shopify/Product/1', translatableContent: [{ key: 'title', value: '归档' }], translations: [] },
    { resourceId: 'gid://shopify/Product/2', translatableContent: [{ key: 'title', value: '草稿' }], translations: [] },
    { resourceId: 'gid://shopify/Product/3', translatableContent: [{ key: 'title', value: '在售' }], translations: [] },
  ], context);
  assert.equal(prodRes.excluded, 2);
  assert.deepEqual(prodRes.kept.map(n => n.resourceId), ['gid://shopify/Product/3']);

  const moRes = admin.filterActiveTranslatableNodes('METAOBJECT', [
    { resourceId: 'gid://shopify/Metaobject/20', translatableContent: [{ key: 'label', value: 'Red' }], translations: [] },
    { resourceId: 'gid://shopify/Metaobject/21', translatableContent: [{ key: 'label', value: 'Black' }], translations: [] },
    { resourceId: 'gid://shopify/Metaobject/22', translatableContent: [{ key: 'title', value: '围巾' }], translations: [] },
  ], context);
  assert.equal(moRes.excluded, 2);
  assert.deepEqual(moRes.kept.map(n => n.resourceId), ['gid://shopify/Metaobject/22']);

  const mfRes = admin.filterActiveTranslatableNodes('METAFIELD', [
    { resourceId: 'gid://shopify/Metafield/10', translatableContent: [{ key: 'value', value: '归档规格' }], translations: [] },
    { resourceId: 'gid://shopify/Metafield/11', translatableContent: [{ key: 'value', value: '草稿规格' }], translations: [] },
    { resourceId: 'gid://shopify/Metafield/12', translatableContent: [{ key: 'value', value: '中粗' }], translations: [] },
    { resourceId: 'gid://shopify/Metafield/13', translatableContent: [{ key: 'value', value: '50g｜约100m/团' }], translations: [] },
  ], context);
  assert.equal(mfRes.excluded, 3);
  assert.deepEqual(mfRes.kept.map(n => n.resourceId), ['gid://shopify/Metafield/13']);
});

test('isSystemMetaobject and isNarrativeMetafield follow docs/shopify-content-onboarding.md rules', () => {
  assert.equal(admin.isSystemMetaobject({ type: 'shopify--color-pattern' }), true);
  assert.equal(admin.isSystemMetaobject({ type: 'shopify--material' }), true);
  assert.equal(admin.isSystemMetaobject({ type: 'yarn_project' }), false);

  for (const key of ['spec_line', 'card_line', 'composition', 'care', 'beginner_reason']) {
    assert.equal(admin.isNarrativeMetafield({ namespace: 'yarn', key }), true, `yarn.${key} should be narrative`);
  }
  for (const key of ['thickness', 'color_type', 'works', 'fluffy', 'crochet', 'undyed', 'texture', 'use']) {
    assert.equal(admin.isNarrativeMetafield({ namespace: 'yarn', key }), false, `yarn.${key} should not be narrative`);
  }
  assert.equal(admin.isNarrativeMetafield({ namespace: 'internal', key: 'supplier' }), false);
});

test('coverage --active-only filters DRAFT products, shopify-- metaobjects, non-narrative metafields, and ignores handle end-to-end', async () => {
  const mockGql = async (query, vars = {}) => {
    if (query.includes('products(first: 100')) {
      return {
        products: {
          nodes: [
            {
              id: 'gid://shopify/Product/1',
              handle: 'active-yarn',
              title: '在售毛线',
              status: 'ACTIVE',
              metafields: {
                nodes: [
                  { id: 'gid://shopify/Metafield/101', namespace: 'yarn', key: 'spec_line', value: '50g｜约100m/团' },
                  { id: 'gid://shopify/Metafield/102', namespace: 'yarn', key: 'card_line', value: '柔软好钩' },
                  { id: 'gid://shopify/Metafield/103', namespace: 'yarn', key: 'thickness', value: '中粗' },
                  { id: 'gid://shopify/Metafield/104', namespace: 'yarn', key: 'color_type', value: '["纯色"]' },
                  { id: 'gid://shopify/Metafield/105', namespace: 'yarn', key: 'works', value: '["围巾"]' },
                  { id: 'gid://shopify/Metafield/106', namespace: 'yarn', key: 'fluffy', value: 'true' },
                  { id: 'gid://shopify/Metafield/107', namespace: 'yarn', key: 'crochet', value: 'true' },
                  { id: 'gid://shopify/Metafield/108', namespace: 'yarn', key: 'undyed', value: 'false' },
                  { id: 'gid://shopify/Metafield/109', namespace: 'internal', key: 'supplier', value: '1688 工厂' },
                ],
              },
            },
            {
              id: 'gid://shopify/Product/2',
              handle: 'draft-yarn',
              title: '草稿毛线',
              status: 'DRAFT',
              metafields: {
                nodes: [
                  { id: 'gid://shopify/Metafield/201', namespace: 'yarn', key: 'spec_line', value: '草稿规格' },
                ],
              },
            },
            {
              id: 'gid://shopify/Product/3',
              handle: 'archived-yarn',
              title: '归档毛线',
              status: 'ARCHIVED',
              metafields: {
                nodes: [
                  { id: 'gid://shopify/Metafield/301', namespace: 'yarn', key: 'spec_line', value: '归档规格' },
                ],
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    }
    if (query.includes('metaobjectDefinitions')) {
      return {
        metaobjectDefinitions: {
          nodes: [
            { type: 'shopify--color-pattern', name: 'Color', metaobjectsCount: 1 },
            { type: 'yarn_project', name: 'Project', metaobjectsCount: 1 },
          ],
        },
      };
    }
    if (query.includes('metaobjects(type: $type')) {
      if (vars.type === 'shopify--color-pattern') {
        return {
          metaobjects: {
            nodes: [{ id: 'gid://shopify/Metaobject/900', handle: 'black', type: 'shopify--color-pattern', displayName: 'Black', fields: [] }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        };
      }
      return {
        metaobjects: {
          nodes: [{ id: 'gid://shopify/Metaobject/901', handle: 'kit-scarf', type: 'yarn_project', displayName: '围巾', fields: [{ key: 'release_scope', value: '已核实可公开' }] }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    }
    if (query.includes('menus(first: 50)')) {
      return { menus: { nodes: [] } };
    }
    if (query.includes('translatableResources')) {
      const byType = {
        PRODUCT: [
          {
            resourceId: 'gid://shopify/Product/1',
            translatableContent: [
              { key: 'title', value: '在售毛线' },
              { key: 'handle', value: 'active-yarn' },
              { key: 'product_type', value: '毛线' },
            ],
            translations: [{ key: 'title', value: '販売中毛糸', outdated: false }],
          },
          {
            resourceId: 'gid://shopify/Product/2',
            translatableContent: [{ key: 'title', value: '草稿毛线' }],
            translations: [],
          },
          {
            resourceId: 'gid://shopify/Product/3',
            translatableContent: [{ key: 'title', value: '归档毛线' }],
            translations: [],
          },
        ],
        METAOBJECT: [
          {
            resourceId: 'gid://shopify/Metaobject/900',
            translatableContent: [{ key: 'label', value: 'Black' }],
            translations: [],
          },
          {
            resourceId: 'gid://shopify/Metaobject/901',
            translatableContent: [
              { key: 'title', value: '围巾' },
              { key: 'handle', value: 'kit-scarf' },
              { key: 'category', value: '配饰' },
            ],
            translations: [{ key: 'title', value: 'マフラー', outdated: false }],
          },
        ],
        METAFIELD: [
          { resourceId: 'gid://shopify/Metafield/101', translatableContent: [{ key: 'value', value: '50g｜约100m/团' }], translations: [{ key: 'value', value: '50g｜約100m/玉', outdated: false }] },
          { resourceId: 'gid://shopify/Metafield/102', translatableContent: [{ key: 'value', value: '柔软好钩' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/103', translatableContent: [{ key: 'value', value: '中粗' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/104', translatableContent: [{ key: 'value', value: '["纯色"]' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/105', translatableContent: [{ key: 'value', value: '["围巾"]' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/109', translatableContent: [{ key: 'value', value: '1688 工厂' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/201', translatableContent: [{ key: 'value', value: '草稿规格' }], translations: [] },
          { resourceId: 'gid://shopify/Metafield/301', translatableContent: [{ key: 'value', value: '归档规格' }], translations: [] },
        ],
      };
      return {
        translatableResources: {
          nodes: byType[vars.type] || [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    }
    throw new Error(`Unexpected query: ${query}`);
  };

  const report = await admin.coverage(mockGql, 'ja', { activeOnly: true });
  assert.deepEqual(report.coverage.PRODUCT, { total: 1, full: 1, partial: 0, none: 0, excluded: 2 });
  assert.deepEqual(report.coverage.METAOBJECT, { total: 1, full: 1, partial: 0, none: 0, excluded: 1 });
  assert.deepEqual(report.coverage.METAFIELD, { total: 2, full: 1, partial: 0, none: 1, excluded: 6 });
  assert.equal(report.filterSummary.excludedDraftProducts, 1);
  assert.equal(report.filterSummary.excludedSystemMetaobjects, 1);
  assert.equal(report.filterSummary.excludedNonNarrativeMetafields, 7);
  assert.deepEqual(report.actionableGaps, {});
});

// ---------------------------------------------------------------------------
// 2. shopify-admin.cjs: audit-health report builder
// ---------------------------------------------------------------------------

test('buildAuditHealthReport summarizes status counts, mvp-yarn-25 trace, vendors, handles, catalog health, and leftovers', () => {
  const products = [
    {
      id: 'gid://shopify/Product/101',
      handle: 'mvp-yarn-25',
      title: '甜豆冰条线',
      status: 'ARCHIVED',
      vendor: '如意鸟',
      productType: '毛线',
      totalInventory: 0,
      publishedAt: null,
      updatedAt: '2026-11-20T19:08:26Z',
      category: { id: 'gid://shopify/TaxonomyCategory/na', fullName: 'Uncategorized' },
      collections: { nodes: [{ id: 'c-yarn', handle: 'yarn', title: '毛线' }] },
      metafields: { nodes: [] },
    },
    {
      id: 'gid://shopify/Product/102',
      handle: 'puni-yarn',
      title: 'Puni Yarn',
      status: 'ARCHIVED',
      vendor: 'hitoami',
      productType: '毛线',
      totalInventory: 0,
      collections: { nodes: [{ id: 'c-fp', handle: 'frontpage', title: 'Home page' }] },
      metafields: { nodes: [] },
    },
    {
      id: 'gid://shopify/Product/103',
      handle: 'kit-xuebao-fringe-scarf',
      title: '【38%羊毛】雪ちゃん｜渐变段染毛线｜100g大团装',
      status: 'ACTIVE',
      vendor: '1688 保定暖色纺织有限公司',
      productType: '毛线',
      totalInventory: 0,
      category: { id: 'gid://shopify/TaxonomyCategory/na', fullName: 'Uncategorized' },
      collections: { nodes: [{ id: 'c-yarn', handle: 'yarn', title: '毛线' }] },
      metafields: { nodes: [] },
    },
    {
      id: 'gid://shopify/Product/104',
      handle: 'ウール100-フェルティ-50g',
      title: '【100%羊毛】フェルティ',
      status: 'ACTIVE',
      vendor: '淘宝 榕树下手工坊',
      productType: '毛线',
      totalInventory: 10,
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1', fullName: 'Arts & Crafts > Yarn' },
      collections: { nodes: [{ id: 'c-yarn', handle: 'yarn', title: '毛线' }] },
      metafields: {
        nodes: [
          { namespace: 'yarn', key: 'thickness', value: '极粗' },
          { namespace: 'yarn', key: 'composition', value: '100%羊毛' },
          { namespace: 'yarn', key: 'color_type', value: '["纯色"]' },
          { namespace: 'yarn', key: 'spec_line', value: '50g｜约75m/团' },
          { namespace: 'yarn', key: 'ball_weight_g', value: '50' },
          { namespace: 'yarn', key: 'ball_length_m', value: '75.0' },
        ],
      },
    },
    {
      id: 'gid://shopify/Product/105',
      handle: 'draft-yarn',
      title: '草稿毛线',
      status: 'DRAFT',
      vendor: 'hitoami',
      productType: '毛线',
      totalInventory: 0,
      collections: { nodes: [] },
      metafields: { nodes: [] },
    },
  ];

  const collections = [
    { id: 'c-hf', handle: 'home-featured', title: '本店精选毛线', ruleSet: null },
    { id: 'c-bp', handle: 'beginner-picks', title: '新手推荐毛线', ruleSet: null },
    { id: 'c-sale', handle: 'sale', title: '限时折扣', ruleSet: { rules: [{ column: 'IS_PRICE_REDUCED' }] } },
    { id: 'c-fp', handle: 'frontpage', title: 'Home page', ruleSet: null },
    { id: 'c-yarn', handle: 'yarn', title: '毛线', ruleSet: { rules: [{ column: 'TYPE', condition: '毛线' }] } },
  ];

  const metaobjects = [
    {
      id: 'mo-1',
      type: 'yarn_project',
      handle: 'demo-square-basket',
      displayName: '方形收纳篮｜内部示例',
      fields: [{ key: 'release_scope', value: '仅内部原型' }],
    },
    {
      id: 'mo-2',
      type: 'yarn_project',
      handle: 'kit-tyndall-kids-scarf',
      displayName: '雪球丁达尔｜儿童围巾',
      fields: [{ key: 'release_scope', value: '已核实可公开' }],
    },
    {
      id: 'mo-3',
      type: 'yarn_material',
      handle: 'kit-demo-yarn',
      displayName: '示例线',
      fields: [{
        key: 'variant',
        reference: { __typename: 'ProductVariant', product: { id: 'gid://shopify/Product/102', handle: 'puni-yarn', status: 'ARCHIVED', title: 'Puni Yarn' } },
      }],
    },
  ];

  const menus = [
    { id: 'm-1', handle: 'main-menu', title: 'Main menu', items: [{ id: '1' }] },
    { id: 'm-2', handle: 'issue-23', title: 'Issue 23 原型导航', items: [{ id: '2' }, { id: '3' }] },
  ];

  const templateProductRefs = [
    { template: 'templates/page.season.json', path: 'sections.main.blocks.yarn-01.settings.product', handle: 'mvp-yarn-25' },
  ];

  const report = admin.buildAuditHealthReport({
    products,
    collections,
    metaobjects,
    menus,
    urlRedirects: [],
    templateProductRefs,
  });

  assert.deepEqual(report.products, { total: 5, active: 2, draft: 1, archived: 2 });
  assert.equal(report.archivedReferences.collections.frontpage.archivedCount, 1);
  assert.equal(report.archivedReferences.collections.yarn.archivedCount, 1);
  assert.equal(report.archivedReferences.templates.count, 1);
  assert.equal(report.archivedReferences.metaobjects.count, 1);
  assert.equal(report.archivedReferences.mvpYarn25Trace.status, 'ARCHIVED');
  assert.deepEqual(report.archivedReferences.mvpYarn25Trace.collectionsInAdmin, ['yarn']);
  assert.equal(report.vendors.total, 2);
  assert.equal(report.vendors.byCategory.marketplace_1688, 1);
  assert.equal(report.vendors.byCategory.marketplace_taobao, 1);
  assert.equal(report.handles.count, 2);
  assert.equal(report.catalogHealth.missingStandardTaxonomy.count, 1);
  assert.equal(report.catalogHealth.zeroInventory.count, 1);
  assert.equal(report.catalogHealth.missingCoreYarnMetafields.productsAffected, 1);
  assert.equal(report.leftovers.demoYarnProjects.leftoverCount, 1);
  assert.equal(report.leftovers.prototypeMenus.count, 1);
  assert.equal(report.leftovers.prototypeMenus.items[0].handle, 'issue-23');
});

// ---------------------------------------------------------------------------
// 3. cleanup-store-data.cjs: strict dry-run safety gating
// ---------------------------------------------------------------------------

test('cleanup CLI defaults to dry-run and refuses every write executor without --write', async () => {
  assert.equal(cleanup.parseCleanupArgs(['all']).write, false);
  assert.equal(cleanup.parseCleanupArgs(['vendors']).write, false);
  assert.equal(cleanup.parseCleanupArgs(['vendors', '--write']).write, true);
  assert.throws(() => cleanup.parseCleanupArgs(['bogus']), /Unknown subcommand/);

  assert.throws(() => cleanup.assertWriteAllowed(false, 'test op'), /without --write/);
  assert.throws(() => cleanup.assertWriteAllowed(undefined, 'test op'), /without --write/);
  assert.doesNotThrow(() => cleanup.assertWriteAllowed(true, 'test op'));

  let called = 0;
  const fakeGql = async () => { called++; return {}; };

  await assert.rejects(() => cleanup.applyVendorPlan(fakeGql, { actions: [{ productId: '1' }] }, { write: false }), /without --write/);
  await assert.rejects(() => cleanup.applyHandlePlan(fakeGql, { actions: [{ productId: '1' }] }, { write: false }), /without --write/);
  await assert.rejects(() => cleanup.applyMetafieldPlan(fakeGql, { actions: [{ productId: '1', autoFill: [{}] }] }, { write: false }), /without --write/);
  await assert.rejects(() => cleanup.applyCollectionPlan(fakeGql, { actions: [{ collectionId: '1', removeProductIds: ['1'] }] }, { write: false }), /without --write/);
  assert.equal(called, 0, 'fakeGql must NEVER be called when write is false');

  // Verify runCleanup in dry-run mode invokes zero mutations.
  const dryResult = await cleanup.runCleanup(
    { command: 'all', write: false, jsonOnly: true },
    {
      gql: fakeGql,
      products: [{ id: 'p1', handle: 'test', title: '测试', status: 'ACTIVE', vendor: '1688 工厂', productType: '毛线', metafields: { nodes: [] }, collections: { nodes: [] }, description: '' }],
      collections: [],
      urlRedirects: [],
    }
  );
  assert.equal(dryResult.dryRun, true);
  assert.equal(dryResult.executed, undefined);
  assert.equal(called, 0);
});

test('cleanup CLI help subcommand works offline without .env', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'cleanup-store-data.cjs');
  const out = execFileSync(process.execPath, [scriptPath, 'help'], { encoding: 'utf8' });
  assert.match(out, /Subcommands:/);
  assert.match(out, /--write/);
});

// ---------------------------------------------------------------------------
// 4. cleanup-store-data.cjs: vendor sanitization planner
// ---------------------------------------------------------------------------

test('planVendorCleanup targets ACTIVE and DRAFT non-hitoami products and preserves original vendor in internal.supplier', () => {
  const plan = cleanup.planVendorCleanup([
    { id: 'p1', handle: 'a', title: 'A', status: 'ACTIVE', vendor: '1688 保定暖色纺织有限公司', metafields: { nodes: [] } },
    { id: 'p2', handle: 'b', title: 'B', status: 'DRAFT', vendor: '品牌待确认', metafields: { nodes: [{ namespace: 'internal', key: 'supplier', value: '已有供应商' }] } },
    { id: 'p3', handle: 'c', title: 'C', status: 'ACTIVE', vendor: 'hitoami', metafields: { nodes: [] } },
    { id: 'p4', handle: 'd', title: 'D', status: 'ARCHIVED', vendor: '雪妃尔', metafields: { nodes: [] } },
  ]);

  assert.equal(plan.summary.plannedUpdates, 2);
  assert.equal(plan.summary.alreadyHitoami, 1);
  assert.equal(plan.summary.skippedArchived, 1);
  assert.equal(plan.summary.byCategory.marketplace_1688, 1);
  assert.equal(plan.summary.byCategory.placeholder, 1);

  assert.deepEqual(plan.actions[0].preserveSupplierMetafield, {
    ownerId: 'p1',
    namespace: 'internal',
    key: 'supplier',
    type: 'single_line_text_field',
    value: '1688 保定暖色纺织有限公司',
  });
  // Existing internal.supplier must not be overwritten.
  assert.equal(plan.actions[1].preserveSupplierMetafield, null);
  assert.equal(plan.actions[1].existingInternalSupplier, '已有供应商');
});

// ---------------------------------------------------------------------------
// 5. cleanup-store-data.cjs: handle slug generator & redirect planner
// ---------------------------------------------------------------------------

test('suggestCleanHandle produces clean ASCII English slugs for curated & novel Japanese handles and deduplicates collisions', () => {
  for (const [oldHandle, expected] of Object.entries(cleanup.CURATED_HANDLE_MAP)) {
    const slug = cleanup.suggestCleanHandle({ handle: oldHandle, title: '' }, new Set([oldHandle]));
    assert.equal(slug, expected);
    assert.match(slug, /^[a-z0-9-]+$/);
  }

  // Novel unseen Japanese handle fallback
  const novel = cleanup.suggestCleanHandle(
    { handle: 'ウール80-ふわもこ-並太-100g', title: '【80%羊毛】段染中粗毛线｜100g' },
    new Set()
  );
  assert.match(novel, /^yarn-[a-z0-9-]+$/);
  assert.match(novel, /wool/);
  assert.match(novel, /100g/);

  // Collision deduplication
  const existing = new Set(['yarn-felty-wool-chunky-50g']);
  const deduped = cleanup.suggestCleanHandle(
    { handle: 'ウール100-フェルティ-フェルト化できる極太毛糸-50g-帽子-フェルトバッグ-ハンドメイド小物に', title: '' },
    existing
  );
  assert.equal(deduped, 'yarn-felty-wool-chunky-50g-2');
});

test('planHandleCleanup plans renames + urlRedirectCreate and flags pre-existing redirects', () => {
  const products = [
    { id: 'p1', handle: 'kit-xuebao-fringe-scarf', title: '雪ちゃん', status: 'ACTIVE', productType: '毛线' },
    { id: 'p2', handle: 'コットン65-花しずく-段染め-50g-中細-花モチーフ-夏ニットに', title: '花しずく', status: 'ACTIVE', productType: '毛线' },
    { id: 'p3', handle: 'kit-tyndall-kids-scarf', title: '儿童围巾包', status: 'ACTIVE', productType: '材料包' },
    { id: 'p4', handle: 'mvp-yarn-03', title: '圈圈纱', status: 'ACTIVE', productType: '毛线' },
  ];
  const existingRedirects = [
    { id: 'r1', path: '/products/kit-xuebao-fringe-scarf', target: '/products/yarn-yukichan-gradient-wool-100g' },
  ];

  const plan = cleanup.planHandleCleanup(products, existingRedirects);
  assert.equal(plan.summary.plannedRenames, 2);
  assert.equal(plan.summary.plannedRedirects, 1);

  assert.equal(plan.actions[0].toHandle, 'yarn-yukichan-gradient-wool-100g');
  assert.equal(plan.actions[0].redirect.alreadyExists, true);

  assert.equal(plan.actions[1].toHandle, 'yarn-hanashizuku-gradient-cotton-50g');
  assert.equal(plan.actions[1].redirect.alreadyExists, false);
  assert.equal(plan.actions[1].redirect.target, '/products/yarn-hanashizuku-gradient-cotton-50g');
  assert.match(plan.actions[1].redirect.path, /^\/products\/%/);
});

// ---------------------------------------------------------------------------
// 6. cleanup-store-data.cjs: metafield parser & planner
// ---------------------------------------------------------------------------

test('parseYarnMetafields auto-fills high-confidence fields and normalizes composition for yarn-facets.liquid', () => {
  const parsed = cleanup.parseYarnMetafields({
    id: 'p1',
    handle: 'コットン78-キャンディミスト',
    title: '【棉78%】キャンディミスト｜双色混纺喷毛纱｜50g｜中细蓬松',
    status: 'ACTIVE',
    productType: '毛线',
    description: '成分：棉78%、腈纶22% 重量：50g／团 线长：约130m／团 粗细：中细（蓬松喷毛纱） 推荐棒针：3.0～4.0mm',
    metafields: { nodes: [] },
  });

  assert.equal(parsed.needsReview.length, 0);
  const byKey = Object.fromEntries(parsed.autoFill.map(f => [f.key, f]));
  assert.equal(byKey.composition.value, '78%棉＋22%腈纶');
  assert.equal(byKey.thickness.value, '中细（蓬松喷毛纱）');
  assert.equal(byKey.color_type.value, '["混色"]');
  assert.equal(byKey.ball_weight_g.value, '50');
  assert.equal(byKey.ball_weight_g.type, 'number_integer');
  assert.equal(byKey.ball_length_m.value, '130.0');
  assert.equal(byKey.ball_length_m.type, 'number_decimal');
  assert.equal(byKey.spec_line.value, '50g｜约130m/团');
});

test('parseYarnMetafields trims flattened descriptions without bleeding labels and marks ambiguous fields NEEDS_REVIEW', () => {
  // Flattened label collision test (real Shopify description format)
  const flat = cleanup.parseYarnMetafields({
    id: 'p2',
    handle: 'yarn-selection-20261023-01',
    title: '【100%羊毛】可毡化粗羊毛｜50g',
    status: 'ACTIVE',
    productType: '毛线',
    description: '成分：100%美利奴羊毛规格：50g｜约75m/团粗细：特粗棒针参考（单股）：5.0～6.5mm',
    metafields: {
      nodes: [
        { namespace: 'yarn', key: 'composition', value: '100%羊毛' },
        { namespace: 'yarn', key: 'color_type', value: '["纯色"]' },
        { namespace: 'yarn', key: 'spec_line', value: '50g｜约75m/团' },
        { namespace: 'yarn', key: 'ball_weight_g', value: '50' },
        { namespace: 'yarn', key: 'ball_length_m', value: '75.0' },
      ],
    },
  });
  assert.deepEqual(flat.autoFill.map(f => [f.key, f.value]), [['thickness', '特粗']]);
  assert.equal(flat.needsReview.length, 0);

  // Ambiguous multi-weight range + missing explicit thickness -> NEEDS_REVIEW
  const ambiguous = cleanup.parseYarnMetafields({
    id: 'p3',
    handle: 'yarn-selection-20261023-43',
    title: '【100%棉】阳阳蛋糕线｜350–2500g',
    status: 'ACTIVE',
    productType: '毛线',
    description: '成分: 100%棉 规格: 350g｜6股｜约1750米 500g｜6股｜约2500米',
    metafields: {
      nodes: [
        { namespace: 'yarn', key: 'composition', value: '100%棉' },
        { namespace: 'yarn', key: 'color_type', value: '["渐变"]' },
        { namespace: 'yarn', key: 'spec_line', value: '350g–2500g' },
      ],
    },
  });
  assert.equal(ambiguous.autoFill.length, 0);
  assert.deepEqual(ambiguous.needsReview.map(r => r.key).sort(), ['ball_length_m', 'ball_weight_g', 'thickness']);
});

// ---------------------------------------------------------------------------
// 7. cleanup-store-data.cjs: collection cleanup planner
// ---------------------------------------------------------------------------

test('planCollectionCleanup removes ARCHIVED items from manual collections and skips smart collections', () => {
  const products = [
    { id: 'p1', handle: 'puni-yarn', title: 'Puni', status: 'ARCHIVED', collections: { nodes: [{ handle: 'frontpage' }, { handle: 'sale' }] } },
    { id: 'p2', handle: 'mvp-yarn-11', title: '魔法球', status: 'ACTIVE', collections: { nodes: [{ handle: 'home-featured' }] } },
  ];
  const collections = [
    { id: 'c1', handle: 'frontpage', title: 'Home page', ruleSet: null },
    { id: 'c2', handle: 'home-featured', title: '本店精选毛线', ruleSet: null },
    { id: 'c3', handle: 'beginner-picks', title: '新手推荐毛线', ruleSet: null },
    { id: 'c4', handle: 'sale', title: '限时折扣', ruleSet: { rules: [{ column: 'IS_PRICE_REDUCED' }] } },
  ];

  const plan = cleanup.planCollectionCleanup(products, collections);
  assert.equal(plan.summary.manualCollectionsWithArchived, 1);
  assert.equal(plan.summary.totalRemovalsPlanned, 1);
  assert.equal(plan.summary.cleanManualCollections, 2);
  assert.equal(plan.summary.skippedSmartCollections, 1);
  assert.equal(plan.actions[0].handle, 'frontpage');
  assert.deepEqual(plan.actions[0].removeProductIds, ['p1']);
  assert.equal(plan.skippedSmartCollections[0].handle, 'sale');
});

// ---------------------------------------------------------------------------
// 8. cleanup-store-data.cjs: write-executor ordering & userErrors guards
// ---------------------------------------------------------------------------

test('applyVendorPlan saves internal.supplier before productUpdate and aborts productUpdate on metafieldsSet userErrors', async () => {
  const plan = cleanup.planVendorCleanup([
    { id: 'p-fail', handle: 'yarn-fail', title: 'Fail', status: 'ACTIVE', vendor: '1688 工厂A', metafields: { nodes: [] } },
    { id: 'p-ok', handle: 'yarn-ok', title: 'OK', status: 'ACTIVE', vendor: '淘宝 店铺B', metafields: { nodes: [] } },
  ]);

  const calls = [];
  const mockGql = async (query, vars) => {
    if (query.includes('metafieldsSet')) {
      const ownerId = vars.metafields[0].ownerId;
      calls.push(`metafieldsSet:${ownerId}`);
      if (ownerId === 'p-fail') {
        return { metafieldsSet: { metafields: [], userErrors: [{ field: ['metafields'], message: 'definition error' }] } };
      }
      return { metafieldsSet: { metafields: [{ id: 'mf1', namespace: 'internal', key: 'supplier', value: vars.metafields[0].value }], userErrors: [] } };
    }
    if (query.includes('productUpdate')) {
      calls.push(`productUpdate:${vars.product.id}`);
      return { productUpdate: { product: { id: vars.product.id, vendor: vars.product.vendor }, userErrors: [] } };
    }
    throw new Error(`Unexpected query: ${query}`);
  };

  const results = await cleanup.applyVendorPlan(mockGql, plan, { write: true });

  // p-fail must NOT call productUpdate; p-ok must run metafieldsSet BEFORE productUpdate
  assert.deepEqual(calls, ['metafieldsSet:p-fail', 'metafieldsSet:p-ok', 'productUpdate:p-ok']);
  assert.equal(results[0].skippedProductUpdate, true);
  assert.equal(results[0].productUpdate, null);
  assert.equal(results[1].productUpdate.product.vendor, 'hitoami');
});

test('applyHandlePlan skips urlRedirectCreate when productUpdate returns userErrors', async () => {
  const plan = cleanup.planHandleCleanup([
    { id: 'p-fail', handle: 'kit-xuebao-fringe-scarf', title: '雪ちゃん', status: 'ACTIVE', productType: '毛线' },
    { id: 'p-ok', handle: 'コットン65-花しずく-段染め-50g-中細-花モチーフ-夏ニットに', title: '花しずく', status: 'ACTIVE', productType: '毛线' },
  ], []);

  const calls = [];
  const mockGql = async (query, vars) => {
    if (query.includes('productUpdate')) {
      calls.push(`productUpdate:${vars.product.id}`);
      if (vars.product.id === 'p-fail') {
        return { productUpdate: { product: null, userErrors: [{ field: ['handle'], message: 'Handle already taken' }] } };
      }
      return { productUpdate: { product: { id: vars.product.id, handle: vars.product.handle }, userErrors: [] } };
    }
    if (query.includes('urlRedirectCreate')) {
      calls.push(`urlRedirectCreate:${vars.urlRedirect.target}`);
      return { urlRedirectCreate: { urlRedirect: { id: 'r1', ...vars.urlRedirect }, userErrors: [] } };
    }
    throw new Error(`Unexpected query: ${query}`);
  };

  const results = await cleanup.applyHandlePlan(mockGql, plan, { write: true });

  assert.deepEqual(calls, [
    'productUpdate:p-fail',
    'productUpdate:p-ok',
    'urlRedirectCreate:/products/yarn-hanashizuku-gradient-cotton-50g',
  ]);
  assert.equal(results[0].skippedRedirect, true);
  assert.equal(results[0].urlRedirectCreate, null);
  assert.equal(results[1].urlRedirectCreate.urlRedirect.target, '/products/yarn-hanashizuku-gradient-cotton-50g');
});
