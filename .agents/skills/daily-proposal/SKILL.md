---
name: daily-proposal
description: Use for the nightly 每日提案 run or when the user asks to process proposal replies or refill the proposal queue. Reads 锦晨's Slack replies, ships approved proposals, records rejections, and keeps at least 3 open proposals in #hitoami.
---

# 每日提案

用户 2026-10-29 确认（#218）：每晚 18:00 在本机跑一次；提案发 Slack #hitoami，用户在消息串里回复「要」或「不要 + 原因」；提案队列始终保持至少 3 个待回复提案。

固定值：Slack 频道 `#hitoami`（`C0C0D1X5JCQ`）；锦晨的 Slack ID `U0BV2A9F7SQ`；GitHub 标签 `每日提案`；店铺 `tutaka-54.myshopify.com`。

## 一次运行

在新工作区里做：`git worktree add .claude/worktrees/daily-<日期> origin/main`，按 `AGENTS.md` 先跑 `./init.sh`。

### 1. 读回复

列出带 `每日提案` 标签的开放 Issue。每个 Issue 正文末尾记有 `slack-ts: <消息 ts>`；读那条消息的消息串。

- 只认 `U0BV2A9F7SQ` 的回复，且不是本流程自己发的消息（本流程的消息都以 🧶 开头）。
- 「要」：小改进入第 2 步；大改先出 Figma 原型（见第 3 步「分大小」），贴到消息串，等第二次「要」再进入第 2 步。一次运行最多处理 2 个，其余在消息串回复「已排队，明晚做」。
- 「不要 + 原因」：在 `DESIGN.md`「不做清单」加一行（日期、Issue、不做什么、原因），以 `not planned` 关闭 Issue，在消息串回复「已记下」。
- 其他内容（提问、修改意见）：在消息串回答；需要改提案就改 Issue 和图，再回复。不算批准。
- 没有回复：不动。

### 2. 实现「要」的提案

按 `AGENTS.md` 的分支、验证和发布规则做；锦晨的「要」就是这个提案的实现和上线批准，范围只限提案写明的改动。

1. 分支 `codex/<issue>-<slug>`，先只改手机（<750px），桌面不变，除非提案另有说明。
2. `npm run verify`；在本地预览（`npx shopify theme dev --store tutaka-54.myshopify.com --live-reload off`）上跑 `npm run proof`（三语、390 / 1440），按 `docs/agents/visual-review.md` 自查截图。
3. 合并到 `main`；开 `main` → `production` 的 PR 并合并。
4. `scripts/release.sh "<内容> (PR-<编号>)"`。设置文件不一致时停下，在消息串说明，不强推。
5. `PROOF_BASE_URL=https://hitoami.com node scripts/proof.cjs --live --pages <页>`。
6. 消息串回复：🧶 已上线 + 手机截图 + 新主题名称 + 回滚方式（重新发布上一版 release 主题）。Issue 记同样内容后关闭。

任一步失败：不上线，在消息串说明卡在哪，Issue 保持开放。

### 3. 补足队列

数开放且未进入实现的 `每日提案` Issue；不足 3 个就补到 3 个。

**找想法**（每个提案一个，互不重复）：
- 轮流看 `scripts/proof.config.cjs` 里的页面，手机 390 首屏优先：`PROOF_BASE_URL=https://hitoami.com node scripts/proof.cjs --live --pages <页> --viewports mobile`。
- Mobbin 参考：用 Claude in Chrome（用户已在 Chrome 登录会员）；连不上就跳过，在提案里注明没有参考图。
- 后端或运营想法：从 `PRODUCT.md` 的当前范围和空缺找，只出文字提案。
- 先对照 `DESIGN.md`（含「不做清单」）、对应 surface brief 和已有提案，冲突或重复的不提。不虚构评价、销量或折扣。

**分大小**：
- 小改（只动样式、文案或现有 section 设置）：不出 Figma。附现状截图和参考图。
- 大改（新 section、新页面、结构重排）：提案只写文字和现状截图，先请用户批准方向（用户 2026-10-29 决定，省去被拒提案的原型成本）。第一次「要」之后才出原型：`node scripts/figma-capture.cjs <线上 URL> <captureId>` 把现状原样送进 Figma，在副本上改出改后稿，按节点路径定位修改，不按名字 `findOne`。

**发出去**：
1. 开 Issue（标签 `每日提案`）：问题、改成什么、依据、大小、影响页面和语言、验收。
2. 发 Slack #hitoami，一条消息：
   `🧶 每日提案 #<issue>：<标题>` / 问题 / 改成 / 大小 / Issue 链接 / 小改写 `回复「要」直接实现并上线，或「不要 + 原因」`；大改写 `回复「要」后先出 Figma 原型给你看，确认后再上线`。
   截图放在消息串里。
3. 把消息 ts 记到 Issue 正文末尾：`slack-ts: <ts>`。

## 写作规则

- 简明中文；出现日文时旁边附中文意思。
- 一次运行结束只在 #hitoami 发一条汇总（上线了什么、记下了什么、新提案几个）；没有变化就不发。
- 只花必要的 token：不重复加载已读文档，不做提案以外的巡检或修复。
- 过程截图和检查输出只放被忽略的目录，不提交。
