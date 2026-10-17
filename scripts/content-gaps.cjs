// Content gap report: turns Shopify data into plain Chinese questions the
// sourcing lead can answer directly, plus gaps the dev side fills without
// asking. Pure functions here; scripts/shopify-admin.cjs fetches the data.

const CATALOG_TAG = 'catalog-2026-10';
const PUBLIC_SCOPE = '已核实可公开';

// Question keys in report order. `ask` goes to the sourcing lead; `dev` items
// are derivable from existing material and never sent to them.
const QUESTIONS = {
  colors: { ask: '现在卖哪几个色号？', hint: '请写色号名称或编号，每个色号配一张实物照片。网站目前每款只有一个默认规格，顾客选不了颜色。' },
  untracked: { ask: '每个色号现在手上有多少团？', hint: '网站目前没有记录库存，卖完也会继续接单。' },
  soldOut: { ask: '库存是 0、网站显示售罄。到货了吗？每个色号有多少团？' },
  composition: { ask: '成分是什么？', hint: '例：100%美利奴羊毛。' },
  ballWeight: { ask: '一团多重（克）？' },
  ballLength: { ask: '一团大约多长（米）？' },
  photos: { ask: '还需要照片：整团实物 + 色卡或细节，至少 2 张。' },
  kitCover: { ask: '封面还是参考图。有我们自己织好的成品照片吗？没有的话，能取得原作者授权吗？' },
  kitTutorial: { ask: '顾客买线后教程怎么给？', hint: '现在教程按钮指向联系页。官方 LINE 开好后请告诉我们账号，或说明发放方式。' },
  kitYarn: { ask: '这一项用的是目录里哪款线、哪个色号？' },
  kitBalls: { ask: '这一项需要几团？' },
  noFinished: { ask: '第一批手工成品什么时候能上架？', hint: '每件需要：实物照片、尺寸、材质、售价、数量。' },
};

const DEV_TASKS = {
  translateTitle: '翻译日文商品名',
  translateBody: '翻译日文商品介绍',
  shortDescription: '从商品介绍提炼一句话用途（short_description）',
  specLine: '用团重 / 线长生成规格行（spec_line）',
};

const fieldMap = fields => Object.fromEntries((fields || []).map(f => [f.key, f]));
const filled = value => value != null && String(value).trim() !== '';

function isFinished(product, meta) {
  const kind = meta.discovery_kind;
  if (kind === 'finished') return true;
  if (kind === 'materials') return false;
  const text = [product.productType, ...(product.tags || []), product.title].join(' ').toLowerCase();
  return /完成品|成品|finished/.test(text);
}

function yarnGaps(product) {
  const meta = Object.fromEntries((product.metafields || []).map(m => [m.key, m.value]));
  const ja = new Set((product.translations || []).filter(t => !t.outdated && filled(t.value)).map(t => t.key));
  const ask = [];
  const dev = [];
  if (product.variantsCount <= 1) ask.push('colors');
  if (!product.tracksInventory) ask.push('untracked');
  else if (product.totalInventory <= 0) ask.push('soldOut');
  if (!filled(meta.composition) && !filled(meta.material)) ask.push('composition');
  if (!filled(meta.ball_weight_g)) ask.push('ballWeight');
  if (!filled(meta.ball_length_m)) ask.push('ballLength');
  if (product.mediaCount < 2) ask.push('photos');
  if (!ja.has('title')) dev.push('translateTitle');
  if (filled(product.descriptionHtml) && !ja.has('body_html')) dev.push('translateBody');
  if (!filled(meta.short_description)) dev.push('shortDescription');
  if (!filled(meta.spec_line) && filled(meta.ball_weight_g)) dev.push('specLine');
  return { ask, dev };
}

function kitGaps(project) {
  const f = fieldMap(project.fields);
  const name = project.displayName;
  const ask = [];
  const credit = f.source_credit?.value || '';
  if (!filled(f.cover?.value) || /参考图|替换|授权/.test(credit)) ask.push({ key: 'kitCover', item: name, note: credit });
  const tutorial = f.tutorial_url?.value || '';
  if (!filled(tutorial) || tutorial.includes('/pages/contact')) ask.push({ key: 'kitTutorial', item: name });
  for (const component of f.components?.references?.nodes || []) {
    const c = fieldMap(component.fields);
    if (c.component_type?.value !== '毛线') continue;
    const item = `${name} · ${c.title?.value || component.handle}`;
    if (!filled(c.variant?.value)) ask.push({ key: 'kitYarn', item });
    if (!filled(c.quantity?.value)) ask.push({ key: 'kitBalls', item });
  }
  return ask;
}

// Group findings by question so the sourcing lead answers one table per question.
function findGaps({ products, projects }) {
  const ask = {};
  const dev = {};
  const add = (bucket, key, entry) => (bucket[key] ||= []).push(entry);
  const yarns = products.filter(p => (p.tags || []).includes(CATALOG_TAG));
  let finishedCount = 0;
  for (const product of products) {
    const meta = Object.fromEntries((product.metafields || []).map(m => [m.key, m.value]));
    if (isFinished(product, meta)) finishedCount++;
  }
  for (const product of yarns) {
    const gaps = yarnGaps(product);
    gaps.ask.forEach(key => add(ask, key, { item: product.title }));
    gaps.dev.forEach(key => add(dev, key, product.handle));
  }
  const kits = projects.filter(p => fieldMap(p.fields).release_scope?.value === PUBLIC_SCOPE);
  for (const project of kits) {
    kitGaps(project).forEach(({ key, ...entry }) => add(ask, key, entry));
  }
  if (finishedCount === 0) add(ask, 'noFinished', { item: '手工成品' });
  return { yarnCount: yarns.length, kitCount: kits.length, finishedCount, ask, dev };
}

function cell(text) {
  return String(text).replace(/\|/g, '｜').replace(/\s*\n\s*/g, ' ');
}

function renderGaps(gaps, date = new Date().toISOString().slice(0, 10)) {
  const lines = [
    `# 内容缺口报告（${date}）`,
    '',
    `只读查询 Shopify 生成：毛线目录 ${gaps.yarnCount} 款，公开材料包 ${gaps.kitCount} 个，手工成品 ${gaps.finishedCount} 件。`,
    '「请选品回答」可直接转发，在「回答」栏填写即可；「开发自己补」不需要问选品。',
    '',
    '## 请选品回答',
  ];
  const askKeys = Object.keys(QUESTIONS).filter(key => gaps.ask[key]?.length);
  if (!askKeys.length) lines.push('', '目前没有需要选品回答的问题。');
  askKeys.forEach((key, index) => {
    const q = QUESTIONS[key];
    const entries = gaps.ask[key];
    const withNote = entries.some(e => e.note);
    lines.push('', `### ${index + 1}. ${q.ask}（${entries.length} 项）`);
    if (q.hint) lines.push('', q.hint);
    lines.push('', withNote ? '| 内容 | 现状 | 回答 |' : '| 内容 | 回答 |', withNote ? '|---|---|---|' : '|---|---|');
    for (const e of entries) lines.push(withNote ? `| ${cell(e.item)} | ${cell(e.note || '')} | |` : `| ${cell(e.item)} | |`);
  });
  lines.push('', '## 开发自己补', '');
  const devKeys = Object.keys(DEV_TASKS).filter(key => gaps.dev[key]?.length);
  if (!devKeys.length) lines.push('目前没有。');
  for (const key of devKeys) lines.push(`- ${DEV_TASKS[key]}：${gaps.dev[key].length} 款（${gaps.dev[key].join('、')}）`);
  return `${lines.join('\n')}\n`;
}

module.exports = { CATALOG_TAG, QUESTIONS, findGaps, renderGaps, isFinished };
