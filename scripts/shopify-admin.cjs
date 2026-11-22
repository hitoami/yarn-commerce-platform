#!/usr/bin/env node
// Shopify Admin GraphQL CLI. Credentials come from .env (never committed); the
// access token is exchanged per run via client credentials and never stored.
//
//   npm run admin -- summary
//   npm run admin -- coverage ja
//   npm run admin -- coverage ja --active-only
//   npm run admin -- audit-health
//   npm run admin -- '{ shop { name } }'
//   npm run admin -- -f query.graphql --vars '{"first":5}'
//   npm run admin -- --write -f change.graphql   (mutations need --write)

const fs = require('node:fs');
const path = require('node:path');

const API_VERSION = '2026-07';

const PRESETS = {
  summary: `{
    shop { name myshopifyDomain currencyCode }
    productsCount { count }
    metaobjectDefinitions(first: 50) { nodes { name type metaobjectsCount } }
    shopLocales { locale primary published }
    menus(first: 20) { nodes { title handle } }
  }`,
};

const COVERAGE_TYPES = [
  'PRODUCT', 'COLLECTION', 'METAOBJECT', 'METAFIELD', 'MENU', 'LINK', 'PAGE',
  'ONLINE_STORE_THEME_JSON_TEMPLATE', 'ONLINE_STORE_THEME_SECTION_GROUP', 'ONLINE_STORE_THEME_LOCALE_CONTENT',
];

const CORE_YARN_METAFIELDS = [
  'thickness',
  'composition',
  'color_type',
  'spec_line',
  'ball_weight_g',
  'ball_length_m',
];

const AUDITED_COLLECTIONS = [
  'home-featured',
  'beginner-picks',
  'sale',
  'frontpage',
  'yarn',
];

const INTERNAL_DEMO_HANDLE_RE = /^(demo-|e-2-e-|issue-\d+-demo-|sample-)/i;
const PROTOTYPE_MENU_RE = /^(issue-\d+)/i;
const SYSTEM_METAOBJECT_TYPE_RE = /^shopify--/i;

// Non-translatable fields that stay fixed across locales (URL handles, product_type enums).
const IGNORED_TRANSLATABLE_KEYS = new Set(['handle', 'product_type']);

// Metaobject enum fields marked non-translatable in docs/shopify-content-onboarding.md.
const NON_TRANSLATABLE_METAOBJECT_KEYS = {
  yarn_project: new Set(['category', 'difficulty', 'release_scope']),
  yarn_material: new Set(['supply', 'component_type']),
};

// Narrative product metafields maintained in Translate & Adapt
// (see docs/shopify-content-onboarding.md). Filter/enum/internal metafields
// (yarn.thickness, yarn.color_type, yarn.works, yarn.fluffy, yarn.crochet,
// yarn.undyed, internal.supplier, etc.) are excluded from coverage.
const NARRATIVE_METAFIELD_KEYS = new Set([
  'yarn.spec_line',
  'yarn.card_line',
  'yarn.composition',
  'yarn.material',
  'yarn.gauge',
  'yarn.needle_knit',
  'yarn.needle_crochet',
  'yarn.needle_size',
  'yarn.care',
  'yarn.beginner_reason',
  'yarn.short_description',
]);

function parseArgs(argv) {
  const opts = { write: false, activeOnly: false, vars: {}, file: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') opts.write = true;
    else if (arg === '--active-only') opts.activeOnly = true;
    else if (arg === '-f' || arg === '--file') opts.file = argv[++i];
    else if (arg === '--vars') opts.vars = JSON.parse(argv[++i]);
    else opts.positional.push(arg);
  }
  return opts;
}

function isMutation(query) {
  const body = query.replace(/#[^\n]*/g, '').trim();
  return /^mutation\b/.test(body);
}

function isInternalDemoHandle(handle) {
  return INTERNAL_DEMO_HANDLE_RE.test(String(handle || '').trim());
}

function isInternalDemoMetaobject(metaobject) {
  if (!metaobject) return false;
  if (isInternalDemoHandle(metaobject.handle)) return true;
  const fields = Array.isArray(metaobject.fields) ? metaobject.fields : [];
  for (const field of fields) {
    if ((field.key === 'release_scope' || field.key === 'publish_scope') && String(field.value || '').trim() === '仅内部原型') {
      return true;
    }
  }
  return false;
}

function classifyVendor(vendor) {
  const v = String(vendor || '').trim();
  if (!v) return 'empty';
  if (v === 'hitoami') return 'hitoami';
  if (/1688/i.test(v)) return 'marketplace_1688';
  if (/淘宝|taobao/i.test(v)) return 'marketplace_taobao';
  if (/待确认|待定|tbd|unknown/i.test(v)) return 'placeholder';
  return 'supplier_or_brand';
}

function isProblematicHandle(product) {
  const handle = String(product?.handle || '');
  const productType = String(product?.productType || '').trim();
  const reasons = [];
  if (/[^\x20-\x7E]/.test(handle) || /%[0-9A-Fa-f]{2}/.test(handle)) {
    reasons.push('non_ascii_handle');
  }
  if (/^kit-/i.test(handle) && productType === '毛线') {
    reasons.push('misnamed_kit_handle_on_yarn');
  }
  return reasons;
}

function isSystemMetaobject(metaobject) {
  if (!metaobject) return false;
  const type = typeof metaobject === 'string' ? metaobject : (metaobject.type || metaobject.metaobjectType || '');
  return SYSTEM_METAOBJECT_TYPE_RE.test(String(type).trim());
}

function isNarrativeMetafield(metafield) {
  if (!metafield) return false;
  if (typeof metafield === 'string') return NARRATIVE_METAFIELD_KEYS.has(metafield.trim());
  const fullKey = metafield.namespace && metafield.key
    ? `${metafield.namespace}.${metafield.key}`
    : String(metafield.key || '').trim();
  return NARRATIVE_METAFIELD_KEYS.has(fullKey);
}

function requiredTranslatableKeys(node, meta = {}) {
  const moType = meta.type || node.metaobjectType || node.type;
  const ignoredMoKeys = moType ? NON_TRANSLATABLE_METAOBJECT_KEYS[moType] : null;
  return (node.translatableContent || [])
    .filter(c => {
      if (!c.value || !String(c.value).trim()) return false;
      if (IGNORED_TRANSLATABLE_KEYS.has(c.key)) return false;
      if (ignoredMoKeys && ignoredMoKeys.has(c.key)) return false;
      return true;
    })
    .map(c => c.key);
}

// Summarise translatableResources nodes for one locale: a resource counts as
// translated when every required non-empty source field has a current translation.
function summarizeCoverage(nodes, options = {}) {
  const metaById = options.metaById || new Map();
  const result = { total: 0, full: 0, partial: 0, none: 0 };
  for (const node of nodes) {
    const meta = metaById.get(node.resourceId) || {};
    const keys = requiredTranslatableKeys(node, meta);
    if (!keys.length) continue;
    const done = new Set(node.translations.filter(t => !t.outdated && t.value).map(t => t.key));
    const hit = keys.filter(k => done.has(k)).length;
    result.total++;
    if (hit === keys.length) result.full++;
    else if (hit > 0) result.partial++;
    else result.none++;
  }
  return result;
}

function extractCoverageGaps(resourceType, nodes, metaById = new Map()) {
  const gaps = [];
  for (const node of nodes) {
    const meta = metaById.get(node.resourceId) || {};
    const keys = requiredTranslatableKeys(node, meta);
    if (!keys.length) continue;
    const current = new Set(node.translations.filter(t => !t.outdated && t.value).map(t => t.key));
    const outdated = new Set(node.translations.filter(t => t.outdated && t.value).map(t => t.key));
    const missingKeys = keys.filter(k => !current.has(k));
    if (!missingKeys.length) continue;
    const handleFromContent = node.translatableContent.find(c => c.key === 'handle')?.value;
    const titleFromContent = node.translatableContent.find(c => c.key === 'title' || c.key === 'name')?.value;
    gaps.push({
      resourceType,
      resourceId: node.resourceId,
      ...(meta.type ? { metaobjectType: meta.type } : {}),
      ...(meta.status ? { status: meta.status } : {}),
      handle: meta.handle || handleFromContent || null,
      title: meta.title || meta.displayName || titleFromContent || null,
      missingKeys,
      outdatedKeys: missingKeys.filter(k => outdated.has(k)),
    });
  }
  return gaps;
}

function filterActiveTranslatableNodes(resourceType, nodes, context = {}) {
  const archivedProductIds = context.archivedProductIds || new Set();
  const draftProductIds = context.draftProductIds || new Set();
  const inactiveProductIds = context.inactiveProductIds || new Set();
  const archivedMetafieldIds = context.archivedMetafieldIds || new Set();
  const draftMetafieldIds = context.draftMetafieldIds || new Set();
  const nonNarrativeMetafieldIds = context.nonNarrativeMetafieldIds || new Set();
  const narrativeMetafieldIds = context.narrativeMetafieldIds || null;
  const metafieldMetaById = context.metafieldMetaById || null;
  const internalMetaobjectIds = context.internalMetaobjectIds || new Set();
  const systemMetaobjectIds = context.systemMetaobjectIds || new Set();
  const metaById = context.metaById || new Map();
  const prototypeMenuIds = context.prototypeMenuIds || new Set();

  const kept = [];
  let excluded = 0;

  for (const node of nodes) {
    const id = node.resourceId;
    let drop = false;
    if (resourceType === 'PRODUCT') {
      if (archivedProductIds.has(id) || draftProductIds.has(id) || inactiveProductIds.has(id)) {
        drop = true;
      }
    } else if (resourceType === 'METAOBJECT') {
      const meta = metaById.get(id);
      if (
        internalMetaobjectIds.has(id) ||
        systemMetaobjectIds.has(id) ||
        isSystemMetaobject(meta) ||
        isSystemMetaobject(node)
      ) {
        drop = true;
      }
    } else if (resourceType === 'METAFIELD') {
      if (archivedMetafieldIds.has(id) || draftMetafieldIds.has(id) || nonNarrativeMetafieldIds.has(id)) {
        drop = true;
      } else if (metafieldMetaById && metafieldMetaById.has(id) && !isNarrativeMetafield(metafieldMetaById.get(id))) {
        drop = true;
      } else if (narrativeMetafieldIds && !narrativeMetafieldIds.has(id)) {
        drop = true;
      }
    } else if (resourceType === 'MENU' && prototypeMenuIds.has(id)) {
      drop = true;
    }
    if (drop) excluded++;
    else kept.push(node);
  }
  return { kept, excluded };
}

function loadEnv(root) {
  const file = path.join(root, '.env');
  if (fs.existsSync(file)) process.loadEnvFile(file);
  const { SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
  if (!SHOPIFY_STORE || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error(`Missing SHOPIFY_STORE / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in ${file} (see .env.example). .env is per worktree: copy it from a worktree that has one.`);
  }
  return { store: SHOPIFY_STORE, clientId: SHOPIFY_CLIENT_ID, clientSecret: SHOPIFY_CLIENT_SECRET };
}

async function getToken({ store, clientId, clientSecret }) {
  const res = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok || !data?.access_token) {
    const reason = text.match(/Oauth error[^<]*/)?.[0] || `HTTP ${res.status}`;
    throw new Error(`Token exchange failed: ${reason}`);
  }
  return data.access_token;
}

function client(store, token) {
  return async (query, variables = {}) => {
    const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (!res.ok || data.errors) throw new Error(JSON.stringify(data.errors || data, null, 2));
    return data.data;
  };
}

async function fetchAllProducts(gql) {
  const query = `query($after: String) {
    products(first: 100, after: $after) {
      nodes {
        id handle title status vendor productType totalInventory publishedAt updatedAt
        category { id fullName }
        collections(first: 20) { nodes { id handle title } }
        metafields(first: 100) { nodes { id namespace key value type } }
        description
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const products = [];
  let after = null;
  do {
    const page = (await gql(query, { after })).products;
    products.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return products;
}

async function fetchAllCollections(gql) {
  const query = `query($after: String) {
    collections(first: 50, after: $after) {
      nodes {
        id handle title
        productsCount { count }
        ruleSet { appliedDisjunctively rules { column relation condition } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const collections = [];
  let after = null;
  do {
    const page = (await gql(query, { after })).collections;
    collections.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return collections;
}

async function fetchAllMetaobjects(gql) {
  const defs = (await gql(`{ metaobjectDefinitions(first: 50) { nodes { type name metaobjectsCount } } }`)).metaobjectDefinitions.nodes;
  const query = `query($type: String!, $after: String) {
    metaobjects(type: $type, first: 100, after: $after) {
      nodes {
        id handle type displayName
        fields {
          key value
          reference {
            __typename
            ... on Product { id handle status title }
            ... on ProductVariant { id product { id handle status title } }
          }
          references(first: 20) {
            nodes {
              __typename
              ... on Product { id handle status title }
              ... on ProductVariant { id product { id handle status title } }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const minimalQuery = `query($type: String!, $after: String) {
    metaobjects(type: $type, first: 100, after: $after) {
      nodes { id handle type displayName }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const all = [];
  for (const def of defs) {
    let after = null;
    try {
      do {
        const page = (await gql(query, { type: def.type, after })).metaobjects;
        all.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      } while (after);
    } catch {
      // Fallback for system metaobjects whose fields query may be restricted.
      let fallbackAfter = null;
      try {
        do {
          const page = (await gql(minimalQuery, { type: def.type, after: fallbackAfter })).metaobjects;
          all.push(...page.nodes);
          fallbackAfter = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
        } while (fallbackAfter);
      } catch {
        // Skip restricted system metaobject types if any.
      }
    }
  }
  return { definitions: defs, metaobjects: all };
}

async function fetchAllMenus(gql) {
  const data = await gql(`{
    menus(first: 50) {
      nodes {
        id title handle
        items { id title url type }
      }
    }
  }`);
  return data.menus.nodes;
}

async function fetchAllUrlRedirects(gql) {
  const query = `query($after: String) {
    urlRedirects(first: 100, after: $after) {
      nodes { id path target }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const redirects = [];
  let after = null;
  do {
    const page = (await gql(query, { after })).urlRedirects;
    redirects.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return redirects;
}

function scanTemplateProductRefs(rootDir) {
  const templatesDir = path.join(rootDir, 'templates');
  if (!fs.existsSync(templatesDir)) return [];
  const refs = [];
  for (const entry of fs.readdirSync(templatesDir, { recursive: true })) {
    const fullPath = path.join(templatesDir, entry);
    if (!entry.endsWith('.json') || !fs.statSync(fullPath).isFile()) continue;
    const relPath = path.join('templates', entry).split(path.sep).join('/');
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch {
      continue;
    }
    const visit = (node, trail) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach((item, idx) => visit(item, `${trail}[${idx}]`));
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        const nextTrail = trail ? `${trail}.${k}` : k;
        if (k === 'product' && typeof v === 'string' && v.trim()) {
          refs.push({ template: relPath, path: nextTrail, handle: v.trim() });
        } else if (k === 'products' && Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === 'string' && item.trim()) {
              refs.push({ template: relPath, path: nextTrail, handle: item.trim() });
            }
          }
        } else if (v && typeof v === 'object') {
          visit(v, nextTrail);
        }
      }
    };
    visit(parsed, '');
  }
  return refs;
}

function buildAuditHealthReport({ products, collections, metaobjects, menus, urlRedirects, templateProductRefs = [] }) {
  const byStatus = { ACTIVE: 0, DRAFT: 0, ARCHIVED: 0, OTHER: 0 };
  const productByHandle = new Map();
  for (const p of products) {
    if (p.status in byStatus) byStatus[p.status]++;
    else byStatus.OTHER++;
    productByHandle.set(p.handle, p);
  }

  const activeProducts = products.filter(p => p.status === 'ACTIVE');
  const archivedProducts = products.filter(p => p.status === 'ARCHIVED');

  // 1. Archived product references in collections
  const collectionMap = new Map(collections.map(c => [c.handle, c]));
  const archivedInCollections = {};
  for (const handle of AUDITED_COLLECTIONS) {
    const coll = collectionMap.get(handle);
    const archivedMembers = archivedProducts
      .filter(p => (p.collections?.nodes || []).some(c => c.handle === handle))
      .map(p => ({ id: p.id, handle: p.handle, title: p.title }));
    archivedInCollections[handle] = {
      exists: Boolean(coll),
      title: coll?.title || null,
      isSmart: Boolean(coll?.ruleSet),
      ruleSet: coll?.ruleSet || null,
      archivedCount: archivedMembers.length,
      archivedProducts: archivedMembers,
    };
  }

  // 2. Archived product references in templates/*.json
  const archivedInTemplates = [];
  for (const ref of templateProductRefs) {
    const product = productByHandle.get(ref.handle);
    if (!product || product.status !== 'ACTIVE') {
      archivedInTemplates.push({
        template: ref.template,
        path: ref.path,
        handle: ref.handle,
        status: product ? product.status : 'MISSING',
        title: product?.title || null,
      });
    }
  }

  // 3. Archived product references in metaobjects
  const archivedInMetaobjects = [];
  for (const mo of metaobjects) {
    for (const f of mo.fields || []) {
      const refs = [];
      if (f.reference) refs.push(f.reference);
      if (f.references?.nodes?.length) refs.push(...f.references.nodes);
      for (const r of refs) {
        if (!r) continue;
        const prod = r.__typename === 'Product' ? r : r.__typename === 'ProductVariant' ? r.product : null;
        if (prod && prod.status !== 'ACTIVE') {
          archivedInMetaobjects.push({
            metaobjectType: mo.type,
            metaobjectHandle: mo.handle,
            field: f.key,
            productHandle: prod.handle,
            productStatus: prod.status,
            productTitle: prod.title,
          });
        }
      }
    }
  }

  // Specific mvp-yarn-25 404 root-cause trace
  const mvp25 = productByHandle.get('mvp-yarn-25');
  const mvp25Redirects = (urlRedirects || []).filter(r => String(r.path || '').includes('mvp-yarn-25'));
  const mvp25InTemplates = templateProductRefs.filter(r => r.handle === 'mvp-yarn-25');
  const mvp25InMetaobjects = archivedInMetaobjects.filter(r => r.productHandle === 'mvp-yarn-25');
  const mvp25Collections = (mvp25?.collections?.nodes || []).map(c => c.handle);
  const mvpYarn25Trace = {
    exists: Boolean(mvp25),
    id: mvp25?.id || null,
    handle: 'mvp-yarn-25',
    title: mvp25?.title || null,
    status: mvp25?.status || 'MISSING',
    publishedAt: mvp25?.publishedAt || null,
    updatedAt: mvp25?.updatedAt || null,
    productType: mvp25?.productType || null,
    collectionsInAdmin: mvp25Collections,
    templateReferences: mvp25InTemplates,
    metaobjectReferences: mvp25InMetaobjects,
    urlRedirects: mvp25Redirects,
    rootCauseSummary: mvp25 && mvp25.status === 'ARCHIVED'
      ? `mvp-yarn-25 (${mvp25.title}) is ARCHIVED (publishedAt=null) with 0 urlRedirects, so any direct request to /products/mvp-yarn-25 returns HTTP 404. Its productType remains "${mvp25.productType}", keeping it matched in the Admin API by smart collection "yarn" (${archivedInCollections.yarn.archivedCount} archived total). Storefront Liquid auto-hides ARCHIVED items on fresh "/" and "/collections/yarn" renders, so /products/mvp-yarn-25 404s originate from stale client/session/search/prefetch URLs without a redirect; meanwhile ${archivedInTemplates.length} other archived handles are hardcoded in templates/page.season.json and ${archivedInCollections.frontpage.archivedCount} archived item remains in manual collection "frontpage".`
      : mvp25
        ? `mvp-yarn-25 currently has status ${mvp25.status}.`
        : 'mvp-yarn-25 does not exist in Shopify Admin.',
  };

  // 4. Non-hitoami vendors on ACTIVE products
  const nonHitoamiVendors = {
    total: 0,
    byCategory: { marketplace_1688: 0, marketplace_taobao: 0, placeholder: 0, supplier_or_brand: 0, empty: 0 },
    flaggedHighRisk: [],
    products: [],
  };
  for (const p of activeProducts) {
    const category = classifyVendor(p.vendor);
    if (category !== 'hitoami') {
      nonHitoamiVendors.total++;
      nonHitoamiVendors.byCategory[category]++;
      const entry = { id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, category };
      nonHitoamiVendors.products.push(entry);
      if (category === 'marketplace_1688' || category === 'marketplace_taobao' || category === 'placeholder') {
        nonHitoamiVendors.flaggedHighRisk.push(entry);
      }
    }
  }

  // 5. Problematic handles on ACTIVE products
  const problematicHandles = [];
  for (const p of activeProducts) {
    const reasons = isProblematicHandle(p);
    if (reasons.length) {
      problematicHandles.push({
        id: p.id,
        handle: p.handle,
        title: p.title,
        productType: p.productType,
        reasons,
      });
    }
  }

  // 6. Taxonomy category, inventory, and core yarn.* metafields on ACTIVE products
  const missingCategory = [];
  const zeroInventory = [];
  const missingMetafieldsByField = Object.fromEntries(CORE_YARN_METAFIELDS.map(k => [k, 0]));
  const missingMetafieldsProducts = [];

  for (const p of activeProducts) {
    const catMissing = !p.category || p.category.id === 'gid://shopify/TaxonomyCategory/na' || p.category.fullName === 'Uncategorized';
    if (catMissing) {
      missingCategory.push({ id: p.id, handle: p.handle, title: p.title, category: p.category?.fullName || null });
    }
    if ((p.totalInventory ?? 0) <= 0) {
      zeroInventory.push({ id: p.id, handle: p.handle, title: p.title, totalInventory: p.totalInventory ?? 0 });
    }
    const mfMap = new Map((p.metafields?.nodes || []).map(m => [`${m.namespace}.${m.key}`, m.value]));
    const missing = CORE_YARN_METAFIELDS.filter(k => {
      const val = mfMap.get(`yarn.${k}`);
      return !val || !String(val).trim() || String(val).trim() === '[]';
    });
    if (missing.length) {
      for (const k of missing) missingMetafieldsByField[k]++;
      missingMetafieldsProducts.push({ id: p.id, handle: p.handle, title: p.title, missing });
    }
  }

  // 7. Leftover demo/e2e metaobjects (yarn_project) and prototype menus (issue-23)
  const yarnProjects = metaobjects.filter(m => m.type === 'yarn_project');
  const leftoverDemoProjects = yarnProjects
    .filter(m => isInternalDemoMetaobject(m))
    .map(m => ({
      id: m.id,
      handle: m.handle,
      displayName: m.displayName,
      releaseScope: (m.fields || []).find(f => f.key === 'release_scope')?.value || null,
      matchedByHandle: isInternalDemoHandle(m.handle),
    }));

  const prototypeMenus = (menus || [])
    .filter(m => PROTOTYPE_MENU_RE.test(m.handle) || /原型/.test(m.title || ''))
    .map(m => ({ id: m.id, handle: m.handle, title: m.title, itemCount: (m.items || []).length }));

  return {
    generatedAt: new Date().toISOString(),
    products: {
      total: products.length,
      active: byStatus.ACTIVE,
      draft: byStatus.DRAFT,
      archived: byStatus.ARCHIVED,
    },
    archivedReferences: {
      collections: archivedInCollections,
      templates: {
        count: archivedInTemplates.length,
        items: archivedInTemplates,
      },
      metaobjects: {
        count: archivedInMetaobjects.length,
        items: archivedInMetaobjects,
      },
      mvpYarn25Trace,
    },
    vendors: nonHitoamiVendors,
    handles: {
      count: problematicHandles.length,
      items: problematicHandles,
    },
    catalogHealth: {
      missingStandardTaxonomy: {
        count: missingCategory.length,
        handles: missingCategory.map(p => p.handle),
      },
      zeroInventory: {
        count: zeroInventory.length,
        items: zeroInventory,
      },
      missingCoreYarnMetafields: {
        productsAffected: missingMetafieldsProducts.length,
        byField: missingMetafieldsByField,
        items: missingMetafieldsProducts,
      },
    },
    leftovers: {
      demoYarnProjects: {
        totalYarnProjects: yarnProjects.length,
        leftoverCount: leftoverDemoProjects.length,
        items: leftoverDemoProjects,
      },
      prototypeMenus: {
        count: prototypeMenus.length,
        items: prototypeMenus,
      },
    },
  };
}

async function auditHealth(gql, rootDir = process.cwd()) {
  const [products, collections, { metaobjects }, menus, urlRedirects] = await Promise.all([
    fetchAllProducts(gql),
    fetchAllCollections(gql),
    fetchAllMetaobjects(gql),
    fetchAllMenus(gql),
    fetchAllUrlRedirects(gql),
  ]);
  const templateProductRefs = scanTemplateProductRefs(rootDir);
  return buildAuditHealthReport({ products, collections, metaobjects, menus, urlRedirects, templateProductRefs });
}

async function coverage(gql, locale, { activeOnly = false } = {}) {
  const query = `query($type: TranslatableResourceType!, $locale: String!, $after: String) {
    translatableResources(resourceType: $type, first: 100, after: $after) {
      nodes { resourceId translatableContent { key value } translations(locale: $locale) { key value outdated } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

  let filterContext = null;
  let metaById = new Map();
  let filterSummary = null;

  if (activeOnly) {
    const [products, { metaobjects }, menus] = await Promise.all([
      fetchAllProducts(gql),
      fetchAllMetaobjects(gql),
      fetchAllMenus(gql),
    ]);
    const archivedProductIds = new Set();
    const draftProductIds = new Set();
    const archivedMetafieldIds = new Set();
    const draftMetafieldIds = new Set();
    const nonNarrativeMetafieldIds = new Set();
    const narrativeMetafieldIds = new Set();
    for (const p of products) {
      metaById.set(p.id, { handle: p.handle, title: p.title, status: p.status });
      const metafields = p.metafields?.nodes || [];
      if (p.status === 'ARCHIVED') {
        archivedProductIds.add(p.id);
        for (const mf of metafields) archivedMetafieldIds.add(mf.id);
      } else if (p.status !== 'ACTIVE') {
        draftProductIds.add(p.id);
        for (const mf of metafields) draftMetafieldIds.add(mf.id);
      } else {
        for (const mf of metafields) {
          if (isNarrativeMetafield(mf)) {
            narrativeMetafieldIds.add(mf.id);
            metaById.set(mf.id, {
              namespace: mf.namespace,
              key: mf.key,
              handle: p.handle,
              title: p.title,
              status: p.status,
            });
          } else {
            nonNarrativeMetafieldIds.add(mf.id);
          }
        }
      }
    }
    const internalMetaobjectIds = new Set();
    const systemMetaobjectIds = new Set();
    for (const mo of metaobjects) {
      metaById.set(mo.id, { handle: mo.handle, displayName: mo.displayName, type: mo.type });
      if (isSystemMetaobject(mo)) systemMetaobjectIds.add(mo.id);
      else if (isInternalDemoMetaobject(mo)) internalMetaobjectIds.add(mo.id);
    }
    const prototypeMenuIds = new Set();
    for (const m of menus) {
      metaById.set(m.id, { handle: m.handle, title: m.title });
      if (PROTOTYPE_MENU_RE.test(m.handle) || /原型/.test(m.title || '')) {
        prototypeMenuIds.add(m.id);
      }
    }
    filterContext = {
      archivedProductIds,
      draftProductIds,
      archivedMetafieldIds,
      draftMetafieldIds,
      nonNarrativeMetafieldIds,
      narrativeMetafieldIds,
      internalMetaobjectIds,
      systemMetaobjectIds,
      metaById,
      prototypeMenuIds,
    };
    filterSummary = {
      excludedArchivedProducts: archivedProductIds.size,
      excludedDraftProducts: draftProductIds.size,
      excludedArchivedProductMetafields: archivedMetafieldIds.size,
      excludedDraftProductMetafields: draftMetafieldIds.size,
      excludedNonNarrativeMetafields: nonNarrativeMetafieldIds.size,
      excludedInternalMetaobjects: internalMetaobjectIds.size,
      excludedSystemMetaobjects: systemMetaobjectIds.size,
      excludedPrototypeMenus: prototypeMenuIds.size,
    };
  }

  const out = {};
  const actionableGaps = {};
  for (const type of COVERAGE_TYPES) {
    const nodes = [];
    let after = null;
    try {
      do {
        const page = (await gql(query, { type, locale, after })).translatableResources;
        nodes.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      } while (after);
      if (activeOnly) {
        const { kept, excluded } = filterActiveTranslatableNodes(type, nodes, filterContext);
        out[type] = { ...summarizeCoverage(kept, { metaById }), excluded };
        if (type === 'PRODUCT' || type === 'COLLECTION' || type === 'METAOBJECT' || type === 'PAGE') {
          const gaps = extractCoverageGaps(type, kept, metaById);
          if (gaps.length) actionableGaps[type] = gaps;
        }
      } else {
        out[type] = summarizeCoverage(nodes);
      }
    } catch (err) {
      out[type] = { error: err.message.split('\n').find(l => l.includes('"message"'))?.trim() || 'query failed' };
    }
  }

  if (activeOnly) {
    return { locale, activeOnly: true, filterSummary, coverage: out, actionableGaps };
  }
  return { locale, coverage: out };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [first, ...rest] = opts.positional;
  const env = loadEnv(process.cwd());
  const gql = client(env.store, await getToken(env));

  if (first === 'coverage') {
    if (!rest[0]) throw new Error('Usage: coverage <locale> [--active-only], e.g. coverage ja --active-only');
    return coverage(gql, rest[0], { activeOnly: opts.activeOnly });
  }
  if (first === 'audit-health') {
    return auditHealth(gql, process.cwd());
  }
  const query = opts.file ? fs.readFileSync(opts.file, 'utf8') : PRESETS[first] || first;
  if (!query) throw new Error('Usage: npm run admin -- <summary | audit-health | coverage <locale> [--active-only] | GraphQL query | -f file.graphql> [--vars JSON] [--write]');
  if (isMutation(query) && !opts.write) throw new Error('Refusing to run a mutation without --write');
  return gql(query, opts.vars);
}

if (require.main === module) {
  main()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = {
  API_VERSION,
  CORE_YARN_METAFIELDS,
  AUDITED_COLLECTIONS,
  IGNORED_TRANSLATABLE_KEYS,
  NON_TRANSLATABLE_METAOBJECT_KEYS,
  NARRATIVE_METAFIELD_KEYS,
  parseArgs,
  isMutation,
  isInternalDemoHandle,
  isInternalDemoMetaobject,
  isSystemMetaobject,
  isNarrativeMetafield,
  requiredTranslatableKeys,
  classifyVendor,
  isProblematicHandle,
  summarizeCoverage,
  extractCoverageGaps,
  filterActiveTranslatableNodes,
  scanTemplateProductRefs,
  buildAuditHealthReport,
  loadEnv,
  getToken,
  client,
  fetchAllProducts,
  fetchAllCollections,
  fetchAllMetaobjects,
  fetchAllMenus,
  fetchAllUrlRedirects,
  auditHealth,
  coverage,
};
