# 常见坑

动 Theme、发布或做每日提案前扫一遍。能改成脚本或检查的已经改了（见各条括号），这里只留必须靠人记住的。新踩到的坑：先想能不能改脚本 / 加检查，不能才加一行到这里。

## 授权与会话

- **发布要明确授权**：只有锦晨在对话里「准奏」（御书房按钮或「要 #N」）或直接说「发布」才算。「原型 OK，但……」是批原型，不是批发布；权限检查会拦下合并 production。拿不准就先合进 main，问一句再发。
- **开不了新会话**：远程控制下 `start_session` 会被拒，御书房消息里「开新会话」的要求就在当前会话做，不要停下等。
- **只能写本工作区**：工具不允许写别的 worktree。新任务在本工作区开新分支 `codex/<issue>-<slug>`，不要另建 worktree；删 worktree 会弄坏共享的 `node_modules` 链接，坏了就重新 `npm install`。

## 发布

- **模板 JSON 会挡住发布**：`scripts/release.sh` 发现线上 `templates/*.json` 和 production 不一致就停。新文案、新链接放进 section schema 的默认值，不改 `templates/*.json`。
- **发布要几分钟**：别用 `| tail` 等结果；脚本开头会打印完整日志路径（`~/.cache/hitoami-release-*.log`），看它判断进度。
- 主题名最多 50 个字符（脚本会提前拦下）。

## 文案与语言

- **新文案键要进全部语言文件**（Theme Check MatchingTranslations）：用 `node scripts/locale-add.cjs <命名空间> <keys.json>`，日 / 中 / 英各写一份，其他语言自动用英文。不要用 JSON 重写整份文件，会打乱键顺序。
- **`| t` 的输出已转义 HTML**：`>` 会变成 `&gt;`。要给 JS 用，就从页面上已渲染的元素读文字，不要再 `| json` 塞进 data 属性。
- **商品字段按语言翻译**：如 `yarn.spec_line` 在日 / 中 / 英分别是「約 / 约 / Approx.」，解析时三种都要认。
- 按语言切换文案只能走 `yarn-setting-text` snippet 或 `| t`（有检查）。

## 样式与检查

- 颜色只用 `yarn-design-tokens.css` 的变量；CSS 注释里写 `Issue 243`，不要写 `#243`（会被当成颜色值）。
- 页头 schema 只能有一个 `link_list` 设置。

## 自查与截图

- **用 `npm run proof`**：`--pages` 写页面名（如 `yarn-collection`、`yarn-pdp`，见 `scripts/proof.config.cjs`），不是网址。它会清空 `.proof/` 下的子文件夹，自己的截图别放那里。
- **自己写浏览器脚本要设语言**：无头浏览器默认英文，打开 `/zh` 会被转到 `/en`，看起来像语言泄漏。Playwright 用 `browser.newContext({ locale: 'ja-JP' | 'zh-CN' })`。
- 本地预览（`shopify theme dev`）的语言路径是日 `/ja`、中 `/`、英 `/en`；线上是日 `/`、中 `/zh`、英 `/en`。本地预览不一定同步模板 JSON 的改动。

## 御书房插件

- 插件源码在 `tools/zouzhe/`，仓库根目录的 `.claude-plugin/marketplace.json` 把它列为插件。每台电脑装一次（见 `tools/zouzhe/README.md`），之后每个新会话都有 `/zouzhe`。改了插件要提交、推送，各自 `claude plugin update zouzhe` 后生效。
- 面板跟随 app 的深浅主题：不要写死浅色底，原生按钮和输入框在深色主题下是浅色字，放在浅底上看不见。
