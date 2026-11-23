#!/usr/bin/env bash
# 把 origin/production 发布成线上主题（#218）。步骤见 docs/harness/workflow.md「上线步骤」。
# 需要当次人工批准（AGENTS.md 生产安全）。先合并 main → production 的 PR，再运行：
#   scripts/release.sh "<内容> (PR-<编号>)"
# 加 --check 只比对线上设置文件，不推送、不发布。
# 线上主题的设置文件里有仓库从没出现过的内容（= 有人在 Shopify 后台改过）时停止，不推送。
# 只是本次发布要改的文件（线上还是 production 某个旧版本）不算后台改动。
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
# #275：完整输出同时写进日志文件。推送要几分钟，只看 tail 会以为卡住；看这个文件判断进度。
mkdir -p "$HOME/.cache"
LOG="$HOME/.cache/hitoami-release-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1
echo "完整日志：$LOG"
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
REPO_ROOT="$(git rev-parse --show-toplevel)"
PROD_SHA="$(git rev-parse origin/production)"
PROD_SHORT_SHA="$(git rev-parse --short origin/production)"
mkdir -p "$WORK/code" "$WORK/live"
git archive "$PROD_SHA" | tar -x -C "$WORK/code"

LIVE_ID="$(npx shopify theme list --store "$STORE" --role live --json | json 'v[0].id')"
echo "线上主题：$LIVE_ID"

npx shopify theme pull --store "$STORE" --theme "$LIVE_ID" --path "$WORK/live" \
  --only 'config/*.json' --only 'templates/*.json' --only 'sections/*.json' >/dev/null
# 按 JSON 内容比对：Shopify 拉下来的文件开头多一段自动生成注释。
# 线上文件和 production 不同，但等于 production 历史上某个版本（多半就是上次发布的样子）→ 是本次要发布的改动，放行；
# 和历史上任何版本都对不上 → 后台改动，停下。线上有、仓库历史里从来没有的文件同样算后台改动。
node - "$WORK/live" "$WORK/code" <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const [live, code] = process.argv.slice(2);
const norm = text => JSON.stringify(JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\//, '')));
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const pastVersions = file => git(['log', '-n', '50', '--format=%H', 'origin/production', '--', file]).split('\n').filter(Boolean)
  .map(commit => { try { return norm(git(['show', `${commit}:${file}`])); } catch { return null; } });
const releasing = [];
const edited = [];
for (const file of fs.readdirSync(live, { recursive: true }).filter(name => name.endsWith('.json'))) {
  const now = norm(fs.readFileSync(path.join(live, file), 'utf8'));
  const target = path.join(code, file);
  if (fs.existsSync(target) && norm(fs.readFileSync(target, 'utf8')) === now) continue;
  (pastVersions(file).includes(now) ? releasing : edited).push(file);
}
if (edited.length) {
  console.error(`线上主题有后台改动，production 会覆盖它们。先把这些文件并回仓库再发布：\n${edited.join('\n')}`);
  process.exit(1);
}
if (releasing.length) console.log(`本次发布会更新：${releasing.join('、')}（线上仍是 production 的旧版本，不是后台改动）`);
EOF
echo "线上设置文件没有后台改动。"
[ -n "$CHECK" ] && exit 0

echo "正在校验 origin/production（${PROD_SHORT_SHA}）……"
(cd "$WORK/code" && PATH="${REPO_ROOT}/node_modules/.bin:${PATH}" NODE_PATH="${REPO_ROOT}/node_modules" npm run verify)

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
echo "已推送：${NEW_ID}（${NAME}）"
npx shopify theme publish --store "$STORE" --theme "$NEW_ID" --force >/dev/null

NOW_ID="$(npx shopify theme list --store "$STORE" --role live --json | json 'v[0].id')"
[ "$NOW_ID" = "$NEW_ID" ] || { echo "发布后线上仍是 $NOW_ID" >&2; exit 1; }
echo "已上线：${NAME}（${NEW_ID}）。回滚：重新发布 ${LIVE_ID}。"
echo "版本对照：origin/production=${PROD_SHA} -> ${NAME}（${NEW_ID}）"
