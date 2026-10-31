#!/usr/bin/env node
// #275 给全部语言文件补同一组文案键：Theme Check（MatchingTranslations）要求每个语言文件都有这个键。
// 用法：node scripts/locale-add.cjs <命名空间，如 yarn_collection> <keys.json> [--dir locales]
// keys.json 形如 { "ja": {...}, "zh-CN": {...}, "en": {...} }；其他语言文件用 en 的文字。
// 按文本插入到命名空间末尾，不用 JSON.stringify 重写整份文件：重写会把 "404" 这类数字键挪到最前，造成大片无关 diff。
// 已有的键不覆盖；*.schema.json 不动。
const fs = require('node:fs');
const path = require('node:path');

function addKeys(raw, namespace, entries) {
  const start = raw.indexOf(`"${namespace}": {`);
  if (start === -1) throw new Error(`没有命名空间 "${namespace}"`);
  let depth = 0;
  let end = raw.indexOf('{', start);
  for (; end < raw.length; end++) {
    if (raw[end] === '{') depth++;
    else if (raw[end] === '}' && --depth === 0) break;
  }
  const body = raw.slice(start, end);
  const indent = (body.match(/\n(\s+)"/) || [, '    '])[1];
  const fresh = Object.entries(entries).filter(([key]) => !body.includes(`"${key}":`));
  if (!fresh.length) return raw;
  const before = raw.slice(0, end).replace(/\s*$/, '');
  const empty = before.endsWith('{');
  const lines = fresh.map(([key, value]) => `${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(',\n');
  return `${before}${empty ? '' : ','}\n${lines}${raw.slice(before.length)}`;
}

function run(namespace, keys, dir) {
  const changed = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('schema'))) {
    const lang = file.replace(/(\.default)?\.json$/, '');
    const entries = keys[lang] || keys.en;
    if (!entries) throw new Error('keys.json 至少要有 en');
    const target = path.join(dir, file);
    const raw = fs.readFileSync(target, 'utf8');
    const next = addKeys(raw, namespace, entries);
    JSON.parse(next.replace(/^\s*\/\*[\s\S]*?\*\//, ''));
    if (next !== raw) { fs.writeFileSync(target, next); changed.push(file); }
  }
  return changed;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dirAt = args.indexOf('--dir');
  const dir = dirAt === -1 ? 'locales' : args.splice(dirAt, 2)[1];
  const [namespace, keysFile] = args;
  if (!namespace || !keysFile) { console.error('用法：node scripts/locale-add.cjs <命名空间> <keys.json> [--dir locales]'); process.exit(1); }
  const changed = run(namespace, JSON.parse(fs.readFileSync(keysFile, 'utf8')), dir);
  console.log(changed.length ? `已补 ${changed.length} 个语言文件` : '没有要补的键');
}

module.exports = { addKeys, run };
