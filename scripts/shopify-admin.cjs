#!/usr/bin/env node
// Shopify Admin GraphQL CLI. Credentials come from .env (never committed); the
// access token is exchanged per run via client credentials and never stored.
//
//   npm run admin -- summary
//   npm run admin -- coverage ja
//   npm run admin -- gaps        (content gap report as Markdown, read-only)
//   npm run admin -- '{ shop { name } }'
//   npm run admin -- -f query.graphql --vars '{"first":5}'
//   npm run admin -- --write -f change.graphql   (mutations need --write)

const fs = require('node:fs');
const path = require('node:path');
const { findGaps, renderGaps } = require('./content-gaps.cjs');

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

function parseArgs(argv) {
  const opts = { write: false, vars: {}, file: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') opts.write = true;
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

// Summarise translatableResources nodes for one locale: a resource counts as
// translated when every non-empty source field has a current translation.
function summarizeCoverage(nodes) {
  const result = { total: 0, full: 0, partial: 0, none: 0 };
  for (const node of nodes) {
    const keys = node.translatableContent.filter(c => c.value && String(c.value).trim()).map(c => c.key);
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

async function coverage(gql, locale) {
  const query = `query($type: TranslatableResourceType!, $locale: String!, $after: String) {
    translatableResources(resourceType: $type, first: 100, after: $after) {
      nodes { translatableContent { key value } translations(locale: $locale) { key value outdated } }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const out = {};
  for (const type of COVERAGE_TYPES) {
    const nodes = [];
    let after = null;
    try {
      do {
        const page = (await gql(query, { type, locale, after })).translatableResources;
        nodes.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      } while (after);
      out[type] = summarizeCoverage(nodes);
    } catch (err) {
      out[type] = { error: err.message.split('\n').find(l => l.includes('"message"'))?.trim() || 'query failed' };
    }
  }
  return { locale, coverage: out };
}

const GAP_PRODUCTS = `query($after: String) {
  products(first: 100, after: $after, query: "status:active") {
    nodes {
      handle title productType tags descriptionHtml tracksInventory totalInventory
      variantsCount { count } mediaCount { count }
      metafields(first: 50, namespace: "yarn") { nodes { key value } }
      translations(locale: "ja") { key value outdated }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const GAP_PROJECTS = `query($after: String) {
  metaobjects(type: "yarn_project", first: 50, after: $after) {
    nodes {
      handle displayName
      fields { key value references(first: 30) { nodes { ... on Metaobject { handle fields { key value } } } } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

async function fetchAll(gql, query, root) {
  const nodes = [];
  let after = null;
  do {
    const page = (await gql(query, { after }))[root];
    nodes.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return nodes;
}

async function gaps(gql) {
  const products = (await fetchAll(gql, GAP_PRODUCTS, 'products')).map(p => ({
    ...p,
    variantsCount: p.variantsCount.count,
    mediaCount: p.mediaCount.count,
    metafields: p.metafields.nodes,
  }));
  const projects = await fetchAll(gql, GAP_PROJECTS, 'metaobjects');
  return renderGaps(findGaps({ products, projects }));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [first, ...rest] = opts.positional;
  const env = loadEnv(process.cwd());
  const gql = client(env.store, await getToken(env));

  if (first === 'gaps') return gaps(gql);
  if (first === 'coverage') {
    if (!rest[0]) throw new Error('Usage: coverage <locale>, e.g. coverage ja');
    return coverage(gql, rest[0]);
  }
  const query = opts.file ? fs.readFileSync(opts.file, 'utf8') : PRESETS[first] || first;
  if (!query) throw new Error('Usage: npm run admin -- <summary | gaps | coverage <locale> | GraphQL query | -f file.graphql> [--vars JSON] [--write]');
  if (isMutation(query) && !opts.write) throw new Error('Refusing to run a mutation without --write');
  return gql(query, opts.vars);
}

if (require.main === module) {
  main()
    .then(result => console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2)))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { parseArgs, isMutation, summarizeCoverage };
