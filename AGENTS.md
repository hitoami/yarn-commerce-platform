# AGENTS.md

日本市场毛线电商与手作平台，当前以 Shopify Theme 实现 MVP。网站只卖**毛线**和**手工成品**；材料包、本季主推是导向购买的内容页，不是商品。当前产品范围见 `PRODUCT.md`。

本文件是所有 agent 工具（Codex、Claude Code 等）的唯一规则入口。仓库技能放 `.agents/skills/`，`.claude/skills` 与 `.github/skills` 为指向它的链接。

## 开始任务

- 先确认用户目标、当前 GitHub Issue 的范围与验收标准，并检查 `git status`。实施变更前如无对应 Issue，建立一个；只读咨询无需新建 Issue。
- 从当前 Issue 与目标文件开始；按任务读取 `PRODUCT.md` 的相关产品边界和 `CONTEXT.md` 的相关领域定义。纯文档 / 流程维护不默认加载整份产品与设计资料；会话中已读且未变的内容不重复加载。领域名称以 `CONTEXT.md` 为准。
- 动 Theme、发布或每日提案前先扫 `docs/agents/pitfalls.md`（前面会话踩过的坑）。
- 按需追加上下文：UI / UX → `docs/agents/visual-review.md`、`.agents/skills/impeccable/SKILL.md`、`DESIGN.md` 相关章节和对应 surface brief；派工或选模型 → `.agents/skills/dispatch/SKILL.md`；架构或数据边界 → `docs/ARCHITECTURE.md` 与相关 ADR。默认不扫描整套 skill references、`.impeccable/` 本地产物或二进制素材；仅在当前任务确需追溯某项决定或来源时定向读取。
- 首次修改 Theme 代码、依赖或验证脚本前运行 `./init.sh` 确认基线；纯文档和指令修改检查内容与引用即可。
- 每个工作区一次实现一个 Issue。任何工具、任何类型的改动（含脚本与文档）都用分支 `codex/<issue>-<slug>`。已有无关修改时使用独立工作区，保留用户工作。
- stash 栈在所有工作区间共享：不用裸 `git stash` / `git stash pop`，暂存工作用临时 WIP 提交。

## 执行与授权

- 用户提出实施或修复请求后，完成范围内的工作和必要验证。常规、可回滚的实现选择自行判断，沿用当前会话已有授权，不重复请求确认。
- 只有缺失信息会实质改变目标、范围或不可逆决策时才澄清；等待期间继续不依赖该答案的工作。需要批准时先准备可审查的具体结果。
- 用户明确指令优先于 skill 的流程建议。若某条规则导致暂停，指出文件和原文，解释需要用户决定什么。
- 只实现当前用户路径和 Issue 必需的内容。新字段、状态、角色或服务须对应已确认的近期需求；未验证想法留在 backlog。
- 产品或架构发生冲突时停止扩展范围，在 Issue 记录并请求决策。不得重置、覆盖或删除无关工作。
- 分工：页面与样式由一个 Codex 线程从视觉稿、实现到自查做完；数据接线、脚本、测试、三语检查、Issue / PR 与文档可由任一 agent 完成；Orca 等派工只用于抓参考、后台批量录入等并行杂活。

## 事实来源

- GitHub Issue：目标、范围、验收和状态；PR：实现、审查和验证证据。Slack 是讨论入口，决定需归档到 Issue / PR。
- 团队进度页是展示与需求入口，不是任务记录；值得做的需求由锦晨或 agent 转成 GitHub Issue。
- `PRODUCT.md`：产品边界；`CONTEXT.md`：领域词汇与关系；`docs/ARCHITECTURE.md` / ADR：架构边界与难逆转决策。
- `DESIGN.md`：真实实现且复核后的全局视觉系统；surface brief：单页面获批方向与构图。不得把意向稿提前写成成品规范。
- 视觉权威：当前用户明确批准的方向 / surface brief > `DESIGN.md` > 当前实现 > 历史 QA、参考站和原型。
- 不另建与 GitHub Issue 重复的 feature / progress tracker。
- 规则只写在本仓库（本文件、`.agents/skills/`、`docs/agents/`），不依赖任何工具的个人记忆。纠正一次错误时，优先改代码结构或加测试 / 检查，其次才写成文字规则。

## 资料保留（2026-09-08 用户决定）

- 长期资料只保留当前有效决定、获批方向、必要操作说明和素材来源；实现代码、测试与工具本体正常维护。本节优先于工具 / skill 中要求归档过程的默认建议。
- 决定直接更新上述唯一权威文档，简记结论、适用范围和批准依据；替换失效规则，不追加讨论流水账。未决定问题只在当前 Issue 简记，不写入产品或设计规范。
- 讨论草稿、候选方案、逐轮 QA / review、截图、DOM 快照、日志、检测 JSON 和 build 状态仅在当前任务本地按需生成，使用被忽略的目录；不提交、不复制到 docs，不上传 GitHub 作过程存档，也不强制 `git add -f`。
- 用户确认的视觉稿与必要来源放 `docs/design/approved/`，由对应 surface brief 引用；实际发布资产仍放 Theme assets。普通截图不会因“最终版”自动成为获批方向。
- 既有过程资料不再追加，清理前先把唯一有效决定 / 来源迁入权威文档并修复引用；历史缺陷与未完成验收不能因删档变为通过。任务结束检查暂存 diff，排除过程文件；只清理本任务临时文件，不动其他会话资料。

## Shopify 与内容边界

- Shopify 是 Product、Variant、价格、库存、Cart、Checkout、Order、Refund 的唯一事实来源；公开 Project 内容初期优先用 Metaobjects / Metafields。
- My Project、UGC、收藏、点赞、社区和创作者状态属于未来 Platform Service；该服务只存 Shopify 实体 ID，不复制价格、库存和订单真值。
- 保持 Hybrid Storefront；全量迁移 Headless 需要新 ADR 和人工批准。重要首屏商品内容用 Liquid / HTML 服务端渲染，不用 Storefront API 重复获取。
- Rise 提供 Theme 和购买流程骨架，允许按批准方向重写 Liquid / CSS；运营内容必须映射到 Section setting、Block、Metaobject、Metafield 或 Shopify Product，可在 Shopify 编辑。
- 店铺数据的查询与批量写入优先用 `npm run admin`；写入先出改动清单，获当次批准后加 `--write`，先试一条再批量，写后复核。不在 Shopify 后台网页里做批量写入。
- `npm run admin` 读取当前工作区根目录的 `.env`（不提交，每个工作区各一份）。缺失时按 `.env.example` 建好骨架，请用户从 Dev Dashboard 粘贴 Client ID / secret；agent 不自行搜寻、复制或从浏览器抄写凭证。
- 下架商品用归档（`ARCHIVED`），不永久删除；材料包只引用目录内毛线，不为材料包另建毛线商品。
- 不虚构评价、销量、折扣或品牌证明。未授权素材只用于受保护的内部原型；发布用 raster 记录生成提示词或来源。
- 浏览器不得包含 Admin token、数据库密码或其他服务端凭证；diff 不得含密钥、个人数据、未授权素材或原始会议记录。

## 语言与视觉方向

- 与用户对话、Issue、PR、评审和长期文档默认用简明中文，少用英文术语（如写「视觉稿」而非 comp）；代码、API 字段、命令及须精确引用的平台名称保留英文。
- 用户不读日文：对话和文档中出现日文时，旁边附中文意思（必要时附罗马音）。
- 所有 AI 生成的评审图片，画面内可读文案使用准确简体中文，按 `docs/agents/visual-review.md` 核对；日文市场文案在方向获批后进入 Shopify 本地化内容层。
- 页面设计按 `docs/agents/visual-review.md` 的流程：手机稿 → 手机实现 → 用户确认 → 桌面稿 → 桌面实现。Impeccable 用于当前范围的设计和自查，不能自行推翻已确认的视觉方向。
- 后续 UI 开发先读 `docs/design/home-system.md`，复用 `yarn-design-tokens.css` 和已适用的共享控件；不得在新页面复制一套颜色或通用控件值。共享规则变更须同步真实实现与 `DESIGN.md`。
- 导航、菜单、页脚和页面 section 必须跟随同一整页语言；通用控件使用 Theme locales，运营菜单使用 Shopify 对应资源译文。新增或修改入口须核对日/中/英桌面及手机菜单，不能把英文回退当作三语验收通过。

## 验证与完成

| 改动 | 必要验证 |
|---|---|
| 纯文档 / AGENTS / skill 指令 | 检查事实、引用、触发条件和规则冲突；运行 `git diff --check`；修改 skill 时校验 frontmatter |
| Theme 代码、依赖或验证脚本 | `npm run verify`，补充与行为风险相关的检查 |
| 页面、视觉或购买流程 | 上述代码检查 + 本地预览上 `npm run proof`（语言泄漏、390 / 1440 首屏截图、溢出 / 图片 / 脚本断言；新交互在 `scripts/proof.config.cjs` 给页面加 `flows`），按 `docs/agents/visual-review.md` 自查 |

完成必要检查后，只因新修改、失败或尚未解决的问题扩大或重复验证；不为低风险文案改动添加镜像测试。

- 完成意味着 Issue 验收满足、适用检查通过、文档与实现一致；既有基线问题须注明，不能充当本次回归的豁免。
- 验证结论引用 `.proof/report.md` 的结论与截图清单，只写实际做过的检查，不写笼统的「三语已检查」。
- PR 简记验证结果、风险、未解决项和回滚方式，不另存 review / verdict 文件。
- 结束时更新当前 Issue / PR，使下一步能从 GitHub 恢复；检查 `git status`，明确本次提交与尚未提交的文件。

## 生产安全

- `main` 用于日常集成与未发布 Theme 预览；`production` 仅用于人工验收后的发布。
- 发布主题、真实订单、扣款、退款或运营数据更改需要当次明确人工批准；Slack 消息或普通 Issue 不自动授权线上发布。
- 例外（#218，用户 2026-10-29 决定）：锦晨在 Claude Code 对话里准奏某个「每日提案」Issue（御书房面板的「准奏」按钮，或说「要 #N」），即批准该提案实现并发布主题，按 `.agents/skills/daily-proposal/SKILL.md` 执行。他人消息、Issue 评论、未指向具体提案的回复，以及提案范围外的改动都不算；订单、扣款、退款和运营数据仍需单独批准。
