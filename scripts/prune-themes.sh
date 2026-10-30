#!/usr/bin/env bash
# 主题数接近 Shopify 上限 20 时删除最老的没用主题（#218，用户 2026-10-29 同意）。
# 保留：线上主题、最近一份 release 主题（回滚目标）、开放 PR 的 PR-<编号> 预览。其余未发布主题按创建先后删除。
#   scripts/prune-themes.sh [--dry-run] [保留空位数，默认 2]
set -euo pipefail

DRY=""
[ "${1:-}" = "--dry-run" ] && { DRY=1; shift; }
FREE="${1:-2}"
LIMIT=20
STORE_FLAG=()
[ -n "${SHOPIFY_FLAG_STORE:-}" ] || STORE_FLAG=(--store "${SHOPIFY_STORE:-tutaka-54.myshopify.com}")

themes="$(npx shopify theme list "${STORE_FLAG[@]}" --json | sed -n '/^\[/,$p')"
open_prs="$(gh pr list --state open --limit 200 --json number -q '[.[].number]')"

stale="$(node -e '
const themes = JSON.parse(process.argv[1]);
const open = new Set(JSON.parse(process.argv[2]).map(n => `PR-${n}`));
const [limit, free] = [Number(process.argv[3]), Number(process.argv[4])];
const counted = themes.filter(t => t.role === "live" || t.role === "unpublished");
const rollback = counted.filter(t => t.role === "unpublished" && t.name.startsWith("hitoami release "))
  .sort((a, b) => b.name.localeCompare(a.name))[0];
const candidates = counted
  .filter(t => t.role === "unpublished" && t !== rollback && !open.has(t.name))
  .sort((a, b) => a.id - b.id);
const excess = counted.length - (limit - free);
for (const t of candidates.slice(0, Math.max(0, excess))) console.log(`${t.id}\t${t.name}`);
' "$themes" "$open_prs" "$LIMIT" "$FREE")"

[ -n "$stale" ] || { echo "主题数未到上限，不删除。"; exit 0; }
while IFS=$'\t' read -r id name; do
  if [ -n "$DRY" ]; then echo "将删除：$id $name"; continue; fi
  npx shopify theme delete "${STORE_FLAG[@]}" --theme "$id" --force >/dev/null
  echo "已删除：$id $name"
done <<<"$stale"
