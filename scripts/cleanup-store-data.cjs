#!/usr/bin/env node
// Store data hygiene & cleanup CLI for hitoami.
// STRICTLY DRY-RUN BY DEFAULT — no Shopify mutations ever run unless `--write` is explicitly passed.
// Per AGENTS.md: review dry-run plan and obtain explicit per-run user approval before passing `--write`.
//
// Usage:
//   node scripts/cleanup-store-data.cjs <vendors | handles | metafields | collections | all | help> [--write] [--json]

const {
  CORE_YARN_METAFIELDS,
  classifyVendor,
  isProblematicHandle,
  loadEnv,
  getToken,
  client,
  fetchAllProducts,
  fetchAllCollections,
  fetchAllUrlRedirects,
} = require('./shopify-admin.cjs');

const VALID_COMMANDS = new Set(['vendors', 'handles', 'metafields', 'collections', 'all', 'help']);
const TARGET_CLEANUP_COLLECTIONS = ['home-featured', 'beginner-picks', 'sale', 'frontpage'];

const YARN_METAFIELD_TYPES = {
  thickness: 'single_line_text_field',
  composition: 'single_line_text_field',
  color_type: 'list.single_line_text_field',
  spec_line: 'single_line_text_field',
  ball_weight_g: 'number_integer',
  ball_length_m: 'number_decimal',
};

const VALID_COLOR_TYPES = new Set(['纯色', '段染渐变', '段染', '渐变', '混色', '彩虹色']);

// Curated English slugs for existing non-ASCII / misnamed active yarn handles.
const CURATED_HANDLE_MAP = {
  'kit-xuebao-fringe-scarf': 'yarn-yukichan-gradient-wool-100g',
  'ウール100-フェルティ-フェルト化できる極太毛糸-50g-帽子-フェルトバッグ-ハンドメイド小物に': 'yarn-felty-wool-chunky-50g',
  'コットン70-ふわり雲-段染めグラデーション-大玉200g-並太-マフラー-セーター-ブランケットに': 'yarn-fuwari-kumo-gradient-cotton-200g',
  'ウール70-ウーリー-ふっくら丸みのある糸-50g-並太-セーター-マフラーに-編み目くっきり': 'yarn-wooly-wool-blend-medium-50g',
  'コットン65-花しずく-段染め-50g-中細-花モチーフ-夏ニットに': 'yarn-hanashizuku-gradient-cotton-50g',
  'コットン78-キャンディミスト-ふんわり2色ミックス-50g-中細-起毛タイプ-セーター-バッグ-小物に': 'yarn-candy-mist-brushed-cotton-50g',
};

function parseCleanupArgs(argv) {
  const opts = { command: 'help', write: false, jsonOnly: false };
  const positional = [];
  for (const arg of argv) {
    if (arg === '--write') opts.write = true;
    else if (arg === '--json') opts.jsonOnly = true;
    else if (arg === '-h' || arg === '--help') positional.push('help');
    else positional.push(arg);
  }
  if (positional.length > 0) {
    const cmd = positional[0];
    if (!VALID_COMMANDS.has(cmd)) {
      throw new Error(`Unknown subcommand "${cmd}". Valid subcommands: vendors, handles, metafields, collections, all, help`);
    }
    opts.command = cmd;
  }
  return opts;
}

function assertWriteAllowed(writeFlag, actionDescription) {
  if (writeFlag !== true) {
    throw new Error(`Refusing to execute "${actionDescription}" without --write (dry-run mode is active)`);
  }
}

function formatHelp() {
  return [
    'Usage: node scripts/cleanup-store-data.cjs <subcommand> [--write] [--json]',
    '',
    'Subcommands:',
    '  vendors       Plan normalizing ACTIVE/DRAFT product vendors to "hitoami" (preserves original in internal.supplier)',
    '  handles       Plan renaming non-ASCII / misnamed active handles to clean English slugs + urlRedirectCreate',
    '  metafields    Parse active yarn titles/descriptions to plan high-confidence yarn.* metafield backfills',
    '  collections   Plan removing ARCHIVED products from manual collections (home-featured, beginner-picks, sale, frontpage)',
    '  all           Run all four planners in a single read pass',
    '  help          Show this help message',
    '',
    'Flags:',
    '  --write       REQUIRED to execute Shopify Admin GraphQL mutations (default is strictly dry-run)',
    '  --json        Output structured JSON plan only (suppresses human-readable summary header)',
  ].join('\n');
}

function getMetafieldMap(product) {
  return new Map((product.metafields?.nodes || []).map(m => [`${m.namespace}.${m.key}`, m.value]));
}

// ---------------------------------------------------------------------------
// 1. Vendor Sanitization Planner
// ---------------------------------------------------------------------------

function planVendorCleanup(products) {
  const actions = [];
  const byCategory = { marketplace_1688: 0, marketplace_taobao: 0, placeholder: 0, supplier_or_brand: 0, empty: 0 };
  let skippedArchived = 0;
  let alreadyHitoami = 0;

  for (const p of products) {
    if (p.status !== 'ACTIVE' && p.status !== 'DRAFT') {
      skippedArchived++;
      continue;
    }
    const vendor = String(p.vendor || '').trim();
    if (vendor === 'hitoami') {
      alreadyHitoami++;
      continue;
    }
    const category = classifyVendor(vendor);
    byCategory[category] = (byCategory[category] || 0) + 1;

    const mfMap = getMetafieldMap(p);
    const existingSupplier = String(mfMap.get('internal.supplier') || '').trim();
    const preserveSupplier = Boolean(vendor) && !existingSupplier;

    actions.push({
      productId: p.id,
      handle: p.handle,
      title: p.title,
      status: p.status,
      category,
      fromVendor: vendor,
      toVendor: 'hitoami',
      preserveSupplierMetafield: preserveSupplier
        ? {
            ownerId: p.id,
            namespace: 'internal',
            key: 'supplier',
            type: 'single_line_text_field',
            value: vendor,
          }
        : null,
      existingInternalSupplier: existingSupplier || null,
    });
  }

  return {
    summary: {
      plannedUpdates: actions.length,
      alreadyHitoami,
      skippedArchived,
      byCategory,
    },
    actions,
  };
}

// ---------------------------------------------------------------------------
// 2. Handle Slug Generator & Redirect Planner
// ---------------------------------------------------------------------------

function suggestCleanHandle(product, usedHandles = new Set()) {
  const oldHandle = String(product?.handle || '').trim();
  let base = CURATED_HANDLE_MAP[oldHandle];

  if (!base) {
    const source = `${oldHandle} ${product?.title || ''}`;
    const tokens = [];
    if (/羊毛|ウール|美利奴|メリノ|wool|merino/i.test(source)) tokens.push('wool');
    else if (/马海|モヘア|mohair/i.test(source)) tokens.push('mohair');
    else if (/棉|綿|コットン|cotton/i.test(source)) tokens.push('cotton');
    else if (/腈纶|アクリル|acrylic/i.test(source)) tokens.push('acrylic');

    if (/段染|渐变|グラデーション|gradient/i.test(source)) tokens.push('gradient');
    else if (/混色|ミックス|mix/i.test(source)) tokens.push('mix');

    if (/极粗|特粗|超粗|極太|chunky/i.test(source)) tokens.push('chunky');
    else if (/中粗|並太|medium/i.test(source)) tokens.push('medium');
    else if (/中细|中細|极细|細|fine/i.test(source)) tokens.push('fine');

    // Keep meaningful ASCII words from old handle (excluding kit- prefix on yarn).
    const cleanedOld = oldHandle.replace(/^kit-/i, '');
    const asciiWords = cleanedOld
      .split(/[^a-zA-Z0-9]+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length >= 2 && !/^\d+$/.test(w) && !/^\d+g$/.test(w));
    for (const w of asciiWords) {
      if (!tokens.includes(w)) tokens.push(w);
    }

    const weightMatch = source.match(/(\d{2,4})\s*g/i);
    if (weightMatch) tokens.push(`${weightMatch[1]}g`);

    const unique = [...new Set(tokens)].filter(Boolean);
    const body = unique.length ? unique.join('-') : 'product';
    base = body.startsWith('yarn-') ? body : `yarn-${body}`;
    base = base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  let candidate = base;
  let suffix = 2;
  while (usedHandles.has(candidate) && candidate !== oldHandle) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

function planHandleCleanup(products, existingRedirects = []) {
  const usedHandles = new Set(products.map(p => p.handle));
  const existingRedirectPaths = new Set();
  for (const r of existingRedirects) {
    if (r?.path) {
      existingRedirectPaths.add(r.path);
      try { existingRedirectPaths.add(decodeURI(r.path)); } catch { /* ignore malformed URI */ }
    }
  }

  const actions = [];
  for (const p of products) {
    if (p.status !== 'ACTIVE') continue;
    const reasons = isProblematicHandle(p);
    if (!reasons.length) continue;

    const newHandle = suggestCleanHandle(p, usedHandles);
    usedHandles.add(newHandle);

    const rawPath = `/products/${p.handle}`;
    const encodedPath = encodeURI(rawPath);
    const targetPath = `/products/${newHandle}`;
    const redirectAlreadyExists = existingRedirectPaths.has(encodedPath) || existingRedirectPaths.has(rawPath);

    actions.push({
      productId: p.id,
      title: p.title,
      productType: p.productType,
      reasons,
      fromHandle: p.handle,
      toHandle: newHandle,
      redirect: {
        path: encodedPath,
        rawPath,
        target: targetPath,
        alreadyExists: redirectAlreadyExists,
      },
    });
  }

  return {
    summary: {
      plannedRenames: actions.length,
      plannedRedirects: actions.filter(a => !a.redirect.alreadyExists).length,
    },
    actions,
  };
}

// ---------------------------------------------------------------------------
// 3. Metafield Parser & Backfill Planner
// ---------------------------------------------------------------------------

function normalizeComposition(raw) {
  let text = String(raw || '').trim();
  // Trim trailing labels that may follow without line breaks in flattened Shopify descriptions.
  text = text.replace(/\s*(重量|线长|规格|粗细|推荐|棒针|钩针|用途|商品介绍)[\s\S]*$/, '').trim();
  text = text.replace(/[。；;]+$/, '').trim();
  if (!text) return null;

  // Normalize "棉78%" -> "78%棉"
  text = text.replace(/([\u4e00-\u9fffA-Za-z]+)\s*(\d+(?:\.\d+)?%)/g, '$2$1');
  // Normalize separators between fiber clauses to "＋" so snippets/yarn-facets.liquid splits each component accurately.
  text = text.replace(/\s*[、,，+＋/／]\s*/g, '＋');
  text = text.replace(/\s*(?:和|与)\s*(?=\d+(?:\.\d+)?%)/g, '＋');
  text = text.replace(/＋+/g, '＋').replace(/^＋|＋$/g, '').trim();
  return text || null;
}

function parseComposition(product, mfMap) {
  const existingMaterial = String(mfMap.get('yarn.material') || '').trim();
  if (existingMaterial) {
    return { confidence: 'HIGH', value: normalizeComposition(existingMaterial), source: 'yarn.material' };
  }
  const desc = String(product.description || '');
  const title = String(product.title || '');

  const explicit = desc.match(/成分\s*[：:]\s*([^\n\r]+)/);
  if (explicit) {
    const cleaned = normalizeComposition(explicit[1]);
    if (cleaned) return { confidence: 'HIGH', value: cleaned, source: 'description:成分' };
  }

  const pureMatch = (title + '\n' + desc).match(/100%\s*(?:天然)?\s*(美利奴羊毛|羊毛|棉|腈纶|涤纶|锦纶|真丝|羊驼毛|亚麻)/);
  if (pureMatch) {
    return { confidence: 'HIGH', value: `100%${pureMatch[1]}`, source: 'title_or_desc:100%' };
  }

  return { confidence: 'NEEDS_REVIEW', reason: 'No explicit full fiber percentage breakdown found in title/description' };
}

function parseBallWeightG(product) {
  const title = String(product.title || '');
  const desc = String(product.description || '');
  const combined = `${title}\n${desc}`;

  // Reject multi-size or range weights as NEEDS_REVIEW (number_integer cannot hold a range).
  const rangeMatch = combined.match(/(\d+\s*[～~\-–—\/]\s*\d+\s*g)/i) || combined.match(/(\d+\s*g\s*\/\s*\d+\s*g)/i);
  if (rangeMatch) {
    return { confidence: 'NEEDS_REVIEW', reason: `Multi-weight or range detected (${rangeMatch[1]}); requires canonical integer ball_weight_g` };
  }

  const explicit = desc.match(/重量\s*[：:]\s*约?\s*(\d+)\s*g/i);
  if (explicit) {
    return { confidence: 'HIGH', value: String(parseInt(explicit[1], 10)), source: 'description:重量' };
  }

  const titleWeight = title.match(/[｜|]\s*(\d+)\s*g(?:\b|大团|团|筒|[^\d～~\-–—])/i);
  if (titleWeight) {
    return { confidence: 'HIGH', value: String(parseInt(titleWeight[1], 10)), source: 'title:weight' };
  }

  const perBall = desc.match(/(?:每团|一团)\s*(\d+)\s*g/i);
  if (perBall) {
    return { confidence: 'HIGH', value: String(parseInt(perBall[1], 10)), source: 'description:per_ball' };
  }

  return { confidence: 'NEEDS_REVIEW', reason: 'Could not unambiguously parse integer ball_weight_g' };
}

function parseBallLengthM(product) {
  const title = String(product.title || '');
  const desc = String(product.description || '');

  // Reject multi-variant length tables (e.g. cake yarns with 6 different weights/lengths).
  const multiLengths = [...desc.matchAll(/约\s*\d+(?:\.\d+)?\s*(?:m|米)/gi)];
  const distinctLengths = new Set(multiLengths.map(m => m[0].replace(/[^\d.]/g, '')));
  if (distinctLengths.size > 1) {
    return { confidence: 'NEEDS_REVIEW', reason: `Multiple lengths detected (${[...distinctLengths].join(', ')}m); requires canonical ball_length_m` };
  }

  const explicit = desc.match(/线长\s*[：:]\s*约?\s*(\d+(?:\.\d+)?)\s*(?:m|米)/i);
  if (explicit) {
    return { confidence: 'HIGH', value: Number(explicit[1]).toFixed(1), source: 'description:线长' };
  }

  const specLen = `${title}\n${desc}`.match(/(?:[｜|]|每团[^。\n]{0,12})\s*约\s*(\d+(?:\.\d+)?)\s*(?:m|米)/i);
  if (specLen) {
    return { confidence: 'HIGH', value: Number(specLen[1]).toFixed(1), source: 'title_or_desc:约m' };
  }

  return { confidence: 'NEEDS_REVIEW', reason: 'No explicit ball length (m) found in title/description' };
}

function parseThickness(product, mfMap, parsedWeight, parsedLength) {
  const title = String(product.title || '');
  const desc = String(product.description || '');

  const explicit = desc.match(/粗细\s*[：:]\s*([^\n\r]+)/);
  if (explicit) {
    let val = explicit[1]
      .replace(/\s*(棒针|钩针|推荐|规格|用途|商品介绍|成分|重量|线长)[\s\S]*$/, '')
      .replace(/[。；;，,]+$/, '')
      .trim();
    // Clean trailing "毛线" (e.g. "中粗毛线" -> "中粗").
    val = val.replace(/毛线$/, '').trim();
    if (val) {
      return { confidence: 'HIGH', value: val, source: 'description:粗细' };
    }
  }

  // Explicit thickness keyword in title (matching snippets/yarn-facets.liquid vocabulary).
  const titleMatch = title.match(/(超极粗|超粗|极粗|特粗|中粗|中细|极细|超極太|極太|並太|並太|合太|中細|極細)/);
  if (titleMatch) {
    const canonicalMap = { 超粗: '特粗', 極太: '极太', 並太: '中粗', 中細: '中细', 極細: '极细' };
    const canonical = canonicalMap[titleMatch[1]] || titleMatch[1];
    return { confidence: 'HIGH', value: canonical, source: 'title:thickness_keyword' };
  }

  // Do NOT auto-fill unverified thickness guesses; provide a review hint derived from meterage
  // matching the exact fallback formula in snippets/yarn-facets.liquid.
  const weight = Number(mfMap.get('yarn.ball_weight_g') || (parsedWeight?.confidence === 'HIGH' ? parsedWeight.value : 0));
  const length = Number(mfMap.get('yarn.ball_length_m') || (parsedLength?.confidence === 'HIGH' ? parsedLength.value : 0));
  let hint = null;
  if (weight > 0 && length > 0) {
    const per100g = Math.round((length * 100) / weight);
    const bucket = per100g <= 200 ? 'chunky (粗/特粗)' : per100g <= 350 ? 'medium (中粗)' : 'fine (中细/细)';
    hint = `Meterage fallback (~${per100g}m/100g) suggests ${bucket}; verify against supplier sheet`;
  }

  return {
    confidence: 'NEEDS_REVIEW',
    reason: 'Thickness not explicitly stated in title/description',
    ...(hint ? { hint } : {}),
  };
}

function parseColorType(product) {
  const title = String(product.title || '');
  const desc = String(product.description || '');
  const combined = `${title}\n${desc}`;

  if (/渐变段染|段染渐变|段染めグラデーション/.test(combined)) {
    return { confidence: 'HIGH', value: JSON.stringify(['段染渐变']), source: 'title_or_desc:渐变段染' };
  }
  if (/彩虹色|彩虹段染/.test(combined)) {
    return { confidence: 'HIGH', value: JSON.stringify(['彩虹色']), source: 'title_or_desc:彩虹色' };
  }
  if (/双色混纺|混色|2色ミックス/.test(combined)) {
    return { confidence: 'HIGH', value: JSON.stringify(['混色']), source: 'title_or_desc:混色' };
  }
  if (/段染|段染め/.test(combined)) {
    return { confidence: 'HIGH', value: JSON.stringify(['段染']), source: 'title_or_desc:段染' };
  }
  if (/渐变|グラデーション/.test(combined)) {
    return { confidence: 'HIGH', value: JSON.stringify(['渐变']), source: 'title_or_desc:渐变' };
  }
  if (/纯色|単色/.test(title)) {
    return { confidence: 'HIGH', value: JSON.stringify(['纯色']), source: 'title:纯色' };
  }

  return { confidence: 'NEEDS_REVIEW', reason: 'Color pattern (纯色/段染渐变/混色) not explicitly stated in title/description' };
}

function parseSpecLine(product, mfMap, parsedWeight, parsedLength) {
  const weight = mfMap.get('yarn.ball_weight_g') || (parsedWeight?.confidence === 'HIGH' ? parsedWeight.value : null);
  const lengthRaw = mfMap.get('yarn.ball_length_m') || (parsedLength?.confidence === 'HIGH' ? parsedLength.value : null);

  if (weight && lengthRaw) {
    const cleanLen = String(Number(lengthRaw));
    return {
      confidence: 'HIGH',
      value: `${weight}g｜约${cleanLen}m/团`,
      source: 'derived:ball_weight_g+ball_length_m',
    };
  }

  const desc = String(product.description || '');
  const explicitSpec = desc.match(/规格\s*[：:]\s*([^\n\r]+)/);
  if (explicitSpec) {
    const val = explicitSpec[1]
      .replace(/\s*(粗细|棒针|钩针|推荐|用途|商品介绍)[\s\S]*$/, '')
      .trim();
    if (val) return { confidence: 'HIGH', value: val, source: 'description:规格' };
  }

  return { confidence: 'NEEDS_REVIEW', reason: 'Missing weight or length needed to assemble spec_line' };
}

function parseYarnMetafields(product) {
  const mfMap = getMetafieldMap(product);
  const missing = CORE_YARN_METAFIELDS.filter(k => {
    const val = mfMap.get(`yarn.${k}`);
    return !val || !String(val).trim() || String(val).trim() === '[]';
  });

  if (!missing.length) {
    return { missing: [], autoFill: [], needsReview: [] };
  }

  const missingSet = new Set(missing);
  const parsedWeight = missingSet.has('ball_weight_g') ? parseBallWeightG(product) : null;
  const parsedLength = missingSet.has('ball_length_m') ? parseBallLengthM(product) : null;

  const parsers = {
    composition: () => parseComposition(product, mfMap),
    ball_weight_g: () => parsedWeight,
    ball_length_m: () => parsedLength,
    thickness: () => parseThickness(product, mfMap, parsedWeight, parsedLength),
    color_type: () => parseColorType(product),
    spec_line: () => parseSpecLine(product, mfMap, parsedWeight, parsedLength),
  };

  const autoFill = [];
  const needsReview = [];

  for (const key of missing) {
    const res = parsers[key]();
    if (res.confidence === 'HIGH') {
      if (key === 'color_type') {
        const arr = JSON.parse(res.value);
        if (!Array.isArray(arr) || !arr.length || !arr.every(v => VALID_COLOR_TYPES.has(v))) {
          needsReview.push({ key, status: 'NEEDS_REVIEW', reason: `Parsed color_type failed validation: ${res.value}` });
          continue;
        }
      }
      autoFill.push({
        namespace: 'yarn',
        key,
        type: YARN_METAFIELD_TYPES[key],
        value: res.value,
        source: res.source,
      });
    } else {
      needsReview.push({
        key,
        status: 'NEEDS_REVIEW',
        reason: res.reason,
        ...(res.hint ? { hint: res.hint } : {}),
      });
    }
  }

  return { missing, autoFill, needsReview };
}

function planMetafieldCleanup(products) {
  const actions = [];
  let totalAutoFillFields = 0;
  let totalNeedsReviewFields = 0;

  for (const p of products) {
    if (p.status !== 'ACTIVE') continue;
    if (String(p.productType || '').trim() !== '毛线') continue;

    const parsed = parseYarnMetafields(p);
    if (!parsed.missing.length) continue;

    totalAutoFillFields += parsed.autoFill.length;
    totalNeedsReviewFields += parsed.needsReview.length;

    actions.push({
      productId: p.id,
      handle: p.handle,
      title: p.title,
      missingCount: parsed.missing.length,
      autoFill: parsed.autoFill,
      needsReview: parsed.needsReview,
    });
  }

  return {
    summary: {
      productsWithGaps: actions.length,
      productsWithAutoFill: actions.filter(a => a.autoFill.length > 0).length,
      productsNeedingReview: actions.filter(a => a.needsReview.length > 0).length,
      totalAutoFillFields,
      totalNeedsReviewFields,
    },
    actions,
  };
}

// ---------------------------------------------------------------------------
// 4. Manual Collection Cleanup Planner
// ---------------------------------------------------------------------------

function planCollectionCleanup(products, collections, targetHandles = TARGET_CLEANUP_COLLECTIONS) {
  const collByHandle = new Map(collections.map(c => [c.handle, c]));
  const archivedProducts = products.filter(p => p.status === 'ARCHIVED');

  const actions = [];
  const skippedSmartCollections = [];
  const cleanCollections = [];

  for (const handle of targetHandles) {
    const coll = collByHandle.get(handle);
    if (!coll) continue;

    const archivedInColl = archivedProducts.filter(p =>
      (p.collections?.nodes || []).some(c => c.handle === handle)
    );

    if (coll.ruleSet) {
      skippedSmartCollections.push({
        collectionId: coll.id,
        handle: coll.handle,
        title: coll.title,
        archivedCount: archivedInColl.length,
        reason: 'Smart (rule-based) collection does not support collectionRemoveProducts; Shopify storefront Liquid automatically excludes ARCHIVED products.',
      });
      continue;
    }

    if (!archivedInColl.length) {
      cleanCollections.push({ collectionId: coll.id, handle: coll.handle, title: coll.title });
      continue;
    }

    actions.push({
      collectionId: coll.id,
      handle: coll.handle,
      title: coll.title,
      removeProductIds: archivedInColl.map(p => p.id),
      archivedProducts: archivedInColl.map(p => ({ id: p.id, handle: p.handle, title: p.title })),
    });
  }

  return {
    summary: {
      manualCollectionsWithArchived: actions.length,
      totalRemovalsPlanned: actions.reduce((sum, a) => sum + a.removeProductIds.length, 0),
      cleanManualCollections: cleanCollections.length,
      skippedSmartCollections: skippedSmartCollections.length,
    },
    actions,
    cleanCollections,
    skippedSmartCollections,
  };
}

// ---------------------------------------------------------------------------
// Write Executors (strictly gated by assertWriteAllowed)
// ---------------------------------------------------------------------------

async function applyVendorPlan(gql, plan, { write = false } = {}) {
  assertWriteAllowed(write, 'vendors cleanup');
  const results = [];
  for (const action of plan.actions) {
    let mfRes = null;
    if (action.preserveSupplierMetafield) {
      mfRes = await gql(
        `mutation($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id namespace key value }
            userErrors { field message }
          }
        }`,
        { metafields: [action.preserveSupplierMetafield] }
      );
      const mfErrors = mfRes?.metafieldsSet?.userErrors || [];
      if (mfErrors.length > 0) {
        results.push({
          handle: action.handle,
          metafieldsSet: mfRes.metafieldsSet,
          productUpdate: null,
          skippedProductUpdate: true,
          reason: 'Aborted vendor overwrite because saving internal.supplier returned userErrors',
        });
        continue;
      }
    }
    const updateRes = await gql(
      `mutation($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id handle vendor }
          userErrors { field message }
        }
      }`,
      { product: { id: action.productId, vendor: action.toVendor } }
    );
    results.push({ handle: action.handle, metafieldsSet: mfRes?.metafieldsSet || null, productUpdate: updateRes.productUpdate });
  }
  return results;
}

async function applyHandlePlan(gql, plan, { write = false } = {}) {
  assertWriteAllowed(write, 'handles cleanup');
  const results = [];
  for (const action of plan.actions) {
    const updateRes = await gql(
      `mutation($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id handle }
          userErrors { field message }
        }
      }`,
      { product: { id: action.productId, handle: action.toHandle } }
    );
    const updateErrors = updateRes?.productUpdate?.userErrors || [];
    let redirectRes = null;
    let skippedRedirect = false;
    if (updateErrors.length > 0) {
      skippedRedirect = true;
    } else if (!action.redirect.alreadyExists) {
      redirectRes = await gql(
        `mutation($urlRedirect: UrlRedirectInput!) {
          urlRedirectCreate(urlRedirect: $urlRedirect) {
            urlRedirect { id path target }
            userErrors { field message }
          }
        }`,
        { urlRedirect: { path: action.redirect.path, target: action.redirect.target } }
      );
    }
    results.push({
      fromHandle: action.fromHandle,
      toHandle: action.toHandle,
      productUpdate: updateRes.productUpdate,
      urlRedirectCreate: redirectRes?.urlRedirectCreate || null,
      ...(skippedRedirect ? { skippedRedirect: true, reason: 'Skipped urlRedirectCreate because productUpdate returned userErrors' } : {}),
    });
  }
  return results;
}

async function applyMetafieldPlan(gql, plan, { write = false } = {}) {
  assertWriteAllowed(write, 'metafields cleanup');
  const results = [];
  for (const action of plan.actions) {
    if (!action.autoFill.length) continue;
    const metafields = action.autoFill.map(f => ({
      ownerId: action.productId,
      namespace: f.namespace,
      key: f.key,
      type: f.type,
      value: f.value,
    }));
    const res = await gql(
      `mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message }
        }
      }`,
      { metafields }
    );
    results.push({ handle: action.handle, metafieldsSet: res.metafieldsSet });
  }
  return results;
}

async function applyCollectionPlan(gql, plan, { write = false } = {}) {
  assertWriteAllowed(write, 'collections cleanup');
  const results = [];
  for (const action of plan.actions) {
    const res = await gql(
      `mutation($id: ID!, $productIds: [ID!]!) {
        collectionRemoveProducts(id: $id, productIds: $productIds) {
          job { id done }
          userErrors { field message }
        }
      }`,
      { id: action.collectionId, productIds: action.removeProductIds }
    );
    results.push({ collection: action.handle, collectionRemoveProducts: res.collectionRemoveProducts });
  }
  return results;
}

function formatHumanSummary(report) {
  const lines = [];
  lines.push(report.dryRun
    ? '=== [DRY-RUN — NO MUTATIONS EXECUTED] Shopify Store Cleanup Plan ==='
    : '=== [WRITE MODE EXECUTED] Shopify Store Cleanup Results ===');
  lines.push(`Command: ${report.command} | Generated: ${report.generatedAt}`);

  if (report.plans.vendors) {
    const s = report.plans.vendors.summary;
    lines.push(`- vendors: ${s.plannedUpdates} products to update -> "hitoami" (1688=${s.byCategory.marketplace_1688}, taobao=${s.byCategory.marketplace_taobao}, placeholder=${s.byCategory.placeholder}, supplier=${s.byCategory.supplier_or_brand}; already hitoami=${s.alreadyHitoami}, skipped archived=${s.skippedArchived})`);
  }
  if (report.plans.handles) {
    const s = report.plans.handles.summary;
    lines.push(`- handles: ${s.plannedRenames} active product handles to rename, ${s.plannedRedirects} urlRedirects to create`);
    for (const a of report.plans.handles.actions) {
      lines.push(`    * ${a.fromHandle} -> ${a.toHandle} (redirect ${a.redirect.path} -> ${a.redirect.target})`);
    }
  }
  if (report.plans.metafields) {
    const s = report.plans.metafields.summary;
    lines.push(`- metafields: ${s.productsWithGaps} active yarns with gaps -> ${s.totalAutoFillFields} high-confidence auto-fill fields across ${s.productsWithAutoFill} products; ${s.totalNeedsReviewFields} fields marked NEEDS_REVIEW across ${s.productsNeedingReview} products`);
  }
  if (report.plans.collections) {
    const s = report.plans.collections.summary;
    lines.push(`- collections: ${s.totalRemovalsPlanned} ARCHIVED product(s) to remove from ${s.manualCollectionsWithArchived} manual collection(s) (clean manual=${s.cleanManualCollections}, skipped smart=${s.skippedSmartCollections})`);
    for (const a of report.plans.collections.actions) {
      lines.push(`    * ${a.handle}: remove [${a.archivedProducts.map(p => p.handle).join(', ')}]`);
    }
  }
  if (report.dryRun) {
    lines.push('To execute mutations after explicit user approval, re-run with --write.');
  }
  return lines.join('\n');
}

async function runCleanup(opts, deps = {}) {
  if (opts.command === 'help') {
    return { help: formatHelp() };
  }

  let gql = deps.gql;
  if (!gql) {
    const env = loadEnv(process.cwd());
    gql = client(env.store, await getToken(env));
  }

  const needCollections = opts.command === 'collections' || opts.command === 'all';
  const needRedirects = opts.command === 'handles' || opts.command === 'all';

  const [products, collections, redirects] = await Promise.all([
    deps.products ? Promise.resolve(deps.products) : fetchAllProducts(gql),
    needCollections ? (deps.collections ? Promise.resolve(deps.collections) : fetchAllCollections(gql)) : Promise.resolve([]),
    needRedirects ? (deps.urlRedirects ? Promise.resolve(deps.urlRedirects) : fetchAllUrlRedirects(gql)) : Promise.resolve([]),
  ]);

  const plans = {};
  if (opts.command === 'vendors' || opts.command === 'all') plans.vendors = planVendorCleanup(products);
  if (opts.command === 'handles' || opts.command === 'all') plans.handles = planHandleCleanup(products, redirects);
  if (opts.command === 'metafields' || opts.command === 'all') plans.metafields = planMetafieldCleanup(products);
  if (opts.command === 'collections' || opts.command === 'all') plans.collections = planCollectionCleanup(products, collections);

  const report = {
    command: opts.command,
    dryRun: !opts.write,
    generatedAt: new Date().toISOString(),
    plans,
  };

  if (opts.write) {
    assertWriteAllowed(opts.write, `cleanup ${opts.command}`);
    const executed = {};
    if (plans.vendors) executed.vendors = await applyVendorPlan(gql, plans.vendors, { write: opts.write });
    if (plans.handles) executed.handles = await applyHandlePlan(gql, plans.handles, { write: opts.write });
    if (plans.metafields) executed.metafields = await applyMetafieldPlan(gql, plans.metafields, { write: opts.write });
    if (plans.collections) executed.collections = await applyCollectionPlan(gql, plans.collections, { write: opts.write });
    report.executed = executed;
  }

  return report;
}

async function main() {
  const opts = parseCleanupArgs(process.argv.slice(2));
  const result = await runCleanup(opts);
  if (result.help) {
    console.log(result.help);
    return;
  }
  if (!opts.jsonOnly) {
    console.log(formatHumanSummary(result));
    console.log('');
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  CURATED_HANDLE_MAP,
  TARGET_CLEANUP_COLLECTIONS,
  YARN_METAFIELD_TYPES,
  VALID_COLOR_TYPES,
  parseCleanupArgs,
  assertWriteAllowed,
  formatHelp,
  planVendorCleanup,
  suggestCleanHandle,
  planHandleCleanup,
  normalizeComposition,
  parseYarnMetafields,
  planMetafieldCleanup,
  planCollectionCleanup,
  applyVendorPlan,
  applyHandlePlan,
  applyMetafieldPlan,
  applyCollectionPlan,
  formatHumanSummary,
  runCleanup,
};
