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
- **点击流程写进 `proof`，不要临时写浏览器脚本**：在 `scripts/proof.config.cjs` 给页面加 `flows`（点哪里、等什么、数几个，写法见 `scripts/proof.cjs` 开头），`npm run proof` 首屏截图后逐个跑，截图进报告。`proof` 已经按语言设好浏览器、过滤了本地预览固有的平台报错；临时脚本两样都没有，曾把语言转址误判成泄漏。
  - 断言只写「有」和「变了」（如「选细后仍有商品」「有商品被筛掉」），不写死款数，商品会变。
  - 先等页面给出「载入完」的信号再点（如面板里的款数出现），否则会和异步载入抢跑，结果时过时不过。
- **万一要自己写浏览器脚本**：设语言（Playwright `browser.newContext({ locale: 'ja-JP' | 'zh-CN' })`，无头浏览器默认英文，打开 `/zh` 会被转到 `/en`），并忽略 shop.app、shopifycloud 这类平台报错。
- **截图前确认预览已同步**：`shopify theme dev` 的日志出现这个文件的 `Synced » update <文件>` 才截，否则截到旧样式。
- **Safari 引擎**：`npm run proof -- --browser webkit`。第一次要下载 WebKit（`node node_modules/playwright-core/cli.js install webkit`，约百 MB），下载前先问锦晨。它只模拟 Safari 的渲染，不等于真机。
- **看截图省 token**：多张缩小拼成一张看，只放大可疑处。
- 本地预览（`shopify theme dev`）的语言路径是日 `/ja`、中 `/`、英 `/en`；线上是日 `/`、中 `/zh`、英 `/en`。本地预览不一定同步模板 JSON 的改动。

## 交付说明

- **依赖商品数据的功能要报覆盖率**：如手感地图「41 / 60 款有米数」，并列出缺数据的商品或数量，写进 Issue 交给运营补。
- **PR 写明没验的项**：除了做过的检查，也写清这次没验的——真机、Safari、无障碍（键盘 / 读屏 / 减少动态）、性能、主题编辑器里能否修改。没写就等于默认验过。

## 御书房插件

- 插件源码在 `tools/zouzhe/`，仓库根目录的 `.claude-plugin/marketplace.json` 把它列为插件。每台电脑装一次（见 `tools/zouzhe/README.md`），之后每个新会话都有 `/zouzhe`。改了插件要提交、推送，各自 `claude plugin update zouzhe` 后生效。
- 面板跟随 app 的深浅主题：不要写死浅色底，原生按钮和输入框在深色主题下是浅色字，放在浅底上看不见。
- `claude plugin test` 只检查结构，看不到真实配色和悬停效果：改了面板样子，第一次载入后请锦晨截图确认。
- 手机（远程控制）上没有鼠标悬停：关键操作不能只放在悬停里，展阅页要能做全部操作。
