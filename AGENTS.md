# AGENTS.md

日本市场毛线电商与手作平台，当前以 Shopify Theme 实现 MVP。网站只卖**毛线**和**手工成品**；材料包、本季主推是导向购买的内容页，不是商品。产品范围见 `PRODUCT.md`，领域名称见 `CONTEXT.md`。

本文件是所有 agent 工具（Codex、Claude Code 等）共用的规则入口。仓库技能放 `.agents/skills/`。

## 开始任务

- 先看 `git status`。工作区里有别人未提交的改动或正在进行的分支时，另开 worktree 做，不覆盖别人的工作。
- 在分支上改动（建议 `codex/<简短描述>`，有 Issue 时带上编号），合进 main 由锦晨决定。
- Issue 可选：较大的功能、需要跨会话追踪的事情才建；小改动直接做。
- 动 Theme 前扫一眼 `docs/agents/pitfalls.md`。做页面时参考 `DESIGN.md` 和 `docs/design/home-system.md`。
- Claude Code、Codex 都可以做页面和样式，谁接到谁做完。
- 不用裸 `git stash`（stash 在所有 worktree 间共享），临时保存用 WIP 提交。

## 执行

- 用户说做就做；常规、可回滚的选择自己判断，不反复确认。
- 只在缺失信息会明显改变结果时才问，等待时先做不依赖答案的部分。
- 只做当前需要的；不提前加字段、状态或服务。

## 事实来源

- `PRODUCT.md` 产品边界；`CONTEXT.md` 领域词汇；`DESIGN.md` 已实现的视觉系统；`docs/ARCHITECTURE.md` 与 ADR 架构边界。
- 视觉以锦晨当次确认的方向为准，其次是 `DESIGN.md`，再次是当前实现。

## 资料保留

- 长期文档只写当前有效的决定，直接改对应文档，不追加讨论记录。
- 草稿、截图、日志、检测输出只放本地被忽略的目录，不提交。
- 获批视觉稿放 `docs/design/approved/`；发布用图片、视频在旁边放 `.source.json` 记录来源。

## Shopify 与内容边界

- Shopify 是商品、价格、库存、购物车、订单、退款的唯一事实来源。
- 运营内容要能在 Shopify 里编辑（Section 设置、Block、Metaobject、Metafield 或商品）。
- 首屏重要商品内容用 Liquid 服务端渲染。全面改 Headless 需要人工批准。
- 店铺数据的查询和批量写入用 `npm run admin`；写入前列出改动清单，获当次批准后加 `--write`。凭证放本地 `.env`，不提交、不自行搜寻。
- 下架商品用归档（`ARCHIVED`），不删除；材料包只引用已有毛线商品。
- 不虚构评价、销量、折扣或品牌证明。diff 不得含密钥、个人数据或未授权素材。

## 语言与视觉

- 对话、Issue、PR、文档用简明中文；代码和命令保留英文。出现日文时旁边附中文意思（锦晨不读日文）。
- 页面文案日 / 中 / 英三语都要有：走 `yarn-setting-text` 或 Theme locales。
- 颜色、字号只用 `yarn-design-tokens.css` 的变量，复用已有的共享控件。

## 验证

- 改了 Theme 代码：跑 `npm run verify`。
- 改了页面：在本地预览里看一眼手机（390）和桌面（1440）宽度。大改动或购买流程再跑 `npm run proof`。
- 交付时说清做过哪些检查、哪些没验。

## 生产安全

- `main` 用于日常集成；`production` 仅用于发布。
- 发布主题需要锦晨当次明确批准（说「发布」，或按 `.agents/skills/daily-proposal/SKILL.md` 准奏某个每日提案）。
- 真实订单、扣款、退款、运营数据改动，每次都要单独批准。
