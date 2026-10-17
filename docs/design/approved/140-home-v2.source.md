# #140 首页 v2（桌面）来源

用户于 2026-10-16 在会话中提供 Claude Design「首页 v2 · 新设计系统」，要求按稿实现首页并提供中文版本。稿件：[首页 v2 · 新设计系统](https://claude.ai/design/p/2cc27005-c740-4611-a64d-dda09a50b650?file=%E9%A6%96%E9%A1%B5+v2+%C2%B7+%E6%96%B0%E8%AE%BE%E8%AE%A1%E7%B3%BB%E7%BB%9F.dc.html)，基于 hitoami 设计系统（cff99daf，色值与字体对应 `main@59cddac`）及稿内首页 token 提案 `home-update/tokens-home.css`。模式：Persuade。

稿件以 1440 桌面为构图合同：区块顺序、卡片形态与尺寸按稿实现。手机继续使用 [#131 手机方向](131-mobile.source.md)，只为新增元素做手机适配。实现沿用 Theme 现有素材，未引入稿内图片文件。

按 `PRODUCT.md` 未实现的稿件内容：「新しく入った毛糸（新到毛线）」标题与「新着」角标（无真实上新时间）；商品卡收藏心形（收藏未接入）；顾客评价示例卡与「送料無料 9,900円以上（满 9,900 日元包邮）」承诺（无真实依据）；FAQ 运费回答去掉未核实的包邮条件。主导航仍取 Shopify Navigation。

用户同日追加决定：成品区按稿用「準備中（准备中）」占位卡先占位（不含商品资料）；Logo 换成用户提供的猫抱毛线球字标（来源见 `assets/hitoami-logo.webp.source.json`）。

与稿件的偏差（2026-10-17 用户授权按实现判断定稿，#143）：
- 品牌区 LINE 按钮用现有 `--yarn-action`，不新增稿中的 `#ac5631`，颜色只来自 `colors.json`。
- 胶囊按钮最小高度 44px（稿中 41px），满足触控规则；圆角沿用 `radius-media` 14px（稿中 12px）。
- 商品卡按用户 2026-10-17「商品卡片还是要 consistent 一点」与目录统一：1:1 浅米底、照片完整显示（contain），不采用稿中的铺满（#143）。
- 首屏未选中圆点加浅纸色描边与 40% 灰棕混色，保证在照片上可辨。
- 字体保持 Klee One / 霞鹜文楷 / Noto Sans JP / Figtree，不随 PR #139 的 Zen 方向改动。
