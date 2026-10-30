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
# #245：Shopify 主题名最多 50 个字符；超长要在推送前拦下，否则推送已覆盖备用主题、重命名才报错。
chars() { node -e 'console.log([...process.argv[1]].length)' "$1"; }
if [ "$(chars "$NAME")" -gt 50 ]; then
  echo "主题名「${NAME}」超过 Shopify 上限 50 个字符：内容说明最多 $((50 - $(chars "hitoami release $(date +%F) "))) 个字符，请缩短后重试。" >&2
  exit 1
fi
WORK="$(mktemp -d)"
# 几个会话可能同时准奏上线：本机同一时间只跑一个发布，其余排队（最多等 30 分钟；超过 1 小时的锁视为残留）。
mkdir -p "$HOME/.cache"
LOCK="$HOME/.cache/hitoami-release.lock"
trap 'rm -rf "$WORK"' EXIT
if [ -z "$CHECK" ]; then
  waited=0
  until mkdir "$LOCK" 2>/dev/null; do
    if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then rmdir "$LOCK"; continue; fi
    [ "$waited" -ge 1800 ] && { echo "另一个发布占用超过 30 分钟，放弃。" >&2; exit 1; }
    [ "$waited" -eq 0 ] && echo "另一个会话正在发布，排队等待……"
    sleep 15; waited=$((waited + 15))
  done
  trap 'rm -rf "$WORK"; rmdir "$LOCK" 2>/dev/null' EXIT
fi
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

# 两份 release 主题轮流用，避免主题数到 Shopify 上限 20：覆盖最近一份未发布的 release 主题（上一版，
# 只是上上次上线的回滚目标），发布后当前线上主题就成为新的回滚目标。还没有这份主题时才新建。
SLOT_ID="$(npx shopify theme list --store "$STORE" --role unpublished --json \
  | json 'v.filter(t => t.name.startsWith("hitoami release ")).sort((a, b) => b.name.localeCompare(a.name))[0]?.id ?? ""')"
if [ -n "$SLOT_ID" ]; then
  npx shopify theme push --store "$STORE" --path "$WORK/code" --theme "$SLOT_ID" >/dev/null
  npx shopify theme rename --store "$STORE" --theme "$SLOT_ID" --name "$NAME" >/dev/null
  NEW_ID="$SLOT_ID"
else
  "$(dirname "$0")/prune-themes.sh" 1
  NEW_ID="$(npx shopify theme push --store "$STORE" --path "$WORK/code" --unpublished --theme "$NAME" --json | json 'v.theme.id')"
fi
echo "已推送：$NEW_ID（$NAME）"
npx shopify theme publish --store "$STORE" --theme "$NEW_ID" --force >/dev/null

NOW_ID="$(npx shopify theme list --store "$STORE" --role live --json | json 'v[0].id')"
[ "$NOW_ID" = "$NEW_ID" ] || { echo "发布后线上仍是 $NOW_ID" >&2; exit 1; }
echo "已上线：$NAME（$NEW_ID）。回滚：重新发布 $LIVE_ID。"
