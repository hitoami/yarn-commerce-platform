#!/usr/bin/env bash
# 把 origin/production 发布成线上主题（#218）。步骤见 docs/harness/workflow.md「上线步骤」。
# 需要当次人工批准（AGENTS.md 生产安全）。先合并 main → production 的 PR，再运行：
#   scripts/release.sh "<内容> (PR-<编号>)"
# 加 --check 只比对线上设置文件，不推送、不发布。
# 线上主题的设置文件与 production 不一致时停止，不推送。
set -euo pipefail

STORE="${SHOPIFY_STORE:-tutaka-54.myshopify.com}"
CHECK=""
[ "${1:-}" = "--check" ] && { CHECK=1; shift; }
LABEL="${1:?用法：scripts/release.sh \"<内容> (PR-<编号>)\"}"
NAME="hitoami release $(date +%F) $LABEL"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s.slice(s.search(/[\[{]/)));console.log(eval(process.argv[1]))})' "$1"; }

git fetch -q origin production
mkdir -p "$WORK/code" "$WORK/live"
git archive origin/production | tar -x -C "$WORK/code"

LIVE_ID="$(npx shopify theme list --store "$STORE" --role live --json | json 'v[0].id')"
echo "线上主题：$LIVE_ID"

npx shopify theme pull --store "$STORE" --theme "$LIVE_ID" --path "$WORK/live" \
  --only 'config/*.json' --only 'templates/*.json' --only 'sections/*.json' >/dev/null
# 按 JSON 内容比对：Shopify 拉下来的文件开头多一段自动生成注释。
node - "$WORK/live" "$WORK/code" <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const [live, code] = process.argv.slice(2);
const read = file => JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, '')));
const changed = fs.readdirSync(live, { recursive: true })
  .filter(file => file.endsWith('.json'))
  .filter(file => !fs.existsSync(path.join(code, file)) || read(path.join(live, file)) !== read(path.join(code, file)));
if (changed.length) {
  console.error(`线上主题有后台改动，production 会覆盖它们。先把这些文件并回仓库再发布：\n${changed.join('\n')}`);
  process.exit(1);
}
EOF
echo "线上设置文件与 production 一致。"
[ -n "$CHECK" ] && exit 0

NEW_ID="$(npx shopify theme push --store "$STORE" --path "$WORK/code" --unpublished --theme "$NAME" --json | json 'v.theme.id')"
echo "已推送新主题：$NEW_ID（$NAME）"
npx shopify theme publish --store "$STORE" --theme "$NEW_ID" --force >/dev/null

NOW_ID="$(npx shopify theme list --store "$STORE" --role live --json | json 'v[0].id')"
[ "$NOW_ID" = "$NEW_ID" ] || { echo "发布后线上仍是 $NOW_ID" >&2; exit 1; }
echo "已上线：$NAME（$NEW_ID）。回滚：重新发布 $LIVE_ID。"
