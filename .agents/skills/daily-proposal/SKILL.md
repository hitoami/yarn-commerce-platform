---
name: daily-proposal
description: Use for the nightly 每日提案 run, or when 锦晨 approves or rejects a proposal in Claude Code (御书房 panel prompts starting 【朱批·准奏】/【朱批·驳回】, or 「要 #N」/「不要 #N」 typed in chat). Ships approved proposals, records rejections, keeps at least 3 open proposals.
---

# 每日提案

用户 2026-10-29 确认（#218）：提案队列 = 带 `每日提案` 标签的开放 GitHub Issue，始终保持至少 3 个待批；每晚 18:00 在本机补足。批阅在 Claude Code 里做：御书房面板（`/zouzhe`）的「准奏 / 驳回」按钮，或在对话里说「要 #N」「不要 #N + 原因」。不用 Slack。

固定值：仓库 `hitoami/yarn-commerce-platform`；标签 `每日提案`、`已准奏`；店铺 `tutaka-54.myshopify.com`。

## 收到批阅

批阅以对话消息到达：御书房按钮发出的 `【朱批·准奏】#N …` / `【朱批·驳回】#N … 理由：…`，或锦晨直接打字。只有锦晨在对话里的批阅算数；Issue 评论、他人消息不算。

- **准奏 / 要**：给 Issue 加 `已准奏` 标签并评论「朱批：准」。小改进入「实现」；大改先出 Figma 原型（见「分大小」），把原型链接写进 Issue 正文 `**原型**：<链接>`，去掉 `已准奏`，标题改为 `[每日提案] 大改（原型待批） · <标题>`，重新呈上；第二次准奏再进入「实现」。
- **驳回 / 不要**：在 `DESIGN.md`「不做清单」加一行（日期、Issue、不做什么、原因），Issue 评论理由并以 `not planned` 关闭。这一行随下一次实现 PR 一起提交；没有实现 PR 时单独开文档 PR 合并。
- 同时最多实现 2 个；其余保留 `已准奏` 标签，下一次运行接着做。

## 实现

按 `AGENTS.md` 的分支、验证和发布规则做；锦晨的准奏就是这个提案的实现和上线批准，范围只限提案写明的改动。

1. 分支 `codex/<issue>-<slug>`，先只改手机（<750px），桌面不变，除非提案另有说明。
2. `npm run verify`；在本地预览（`npx shopify theme dev --store tutaka-54.myshopify.com --live-reload off`）上跑 `npm run proof`（三语、390 / 1440），按 `docs/agents/visual-review.md` 自查截图。
3. 合并到 `main`；开 `main` → `production` 的 PR 并合并。
4. `scripts/release.sh "<内容> (PR-<编号>)"`。设置文件不一致时停下并说明，不强推。
5. `PROOF_BASE_URL=https://hitoami.com node scripts/proof.cjs --live --pages <页>`。
6. Issue 记：已上线、自查结论、新主题名称、回滚方式（重新发布上一版 release 主题），然后关闭。在对话里同样简报。

任一步失败：不上线，在 Issue 和对话里说明卡在哪，Issue 保持开放。

## 每晚运行（18:00 定时任务）

在新工作区里做：`git worktree add .claude/worktrees/daily-<日期> origin/main`，按 `AGENTS.md` 先跑 `./init.sh`。

1. 有 `已准奏` 标签、还没上线的提案：按「实现」接着做（最多 2 个）。
2. 补足队列：数开放且没有 `已准奏` 标签的 `每日提案` Issue，不足 3 个就补到 3 个。
3. 结束时在对话里简报：上线了什么、新呈了几本，提醒「输入 /zouzhe 打开御书房批阅」。然后删除本次工作区。

**找想法**（每个提案一个，互不重复）：
- 轮流看 `scripts/proof.config.cjs` 里的页面，手机 390 首屏优先：`PROOF_BASE_URL=https://hitoami.com node scripts/proof.cjs --live --pages <页> --viewports mobile`。
- Mobbin 参考：用 Claude in Chrome（用户已在 Chrome 登录会员）；连不上就跳过，在提案里注明没有参考图。
- 后端或运营想法：从 `PRODUCT.md` 的当前范围和空缺找，只出文字提案。
- 先对照 `DESIGN.md`（含「不做清单」）、对应 surface brief 和已有提案，冲突或重复的不提。不虚构评价、销量或折扣。

**分大小**：
- 小改（只动样式、文案或现有 section 设置）：不出 Figma。
- 大改（新 section、新页面、结构重排）：提案只写文字，先请批准方向（用户 2026-10-29 决定，省去被拒提案的原型成本）。准奏后才出原型：`node scripts/figma-capture.cjs <线上 URL> <captureId>` 把现状原样送进 Figma，在副本上改出改后稿，按节点路径定位修改，不按名字 `findOne`。

**Issue 格式**（御书房按此解析，勿改字段名）：
- 标题：`[每日提案] <小改|大改|运营 + 小改> · <一句话标题>`
- 正文依次：`**问题**：…`、`**改成**：…`、`**大小**：…`、`**影响**：…`、`**依据**` 或 `**参考**`、`**验收**` 勾选项；大改出原型后加 `**原型**：<Figma 链接>`。

## 写作规则

- 简明中文；出现日文时旁边附中文意思。
- 只花必要的 token：不重复加载已读文档，不做提案以外的巡检或修复。
- 过程截图和检查输出只放被忽略的目录，不提交。
