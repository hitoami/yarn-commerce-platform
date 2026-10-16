# #140 首页 v2（桌面）来源

用户于 2026-10-16 在会话中提供 Claude Design「首页 v2 · 新设计系统」，要求按稿实现首页并提供中文版本。稿件：[首页 v2 · 新设计系统](https://claude.ai/design/p/2cc27005-c740-4611-a64d-dda09a50b650?file=%E9%A6%96%E9%A1%B5+v2+%C2%B7+%E6%96%B0%E8%AE%BE%E8%AE%A1%E7%B3%BB%E7%BB%9F.dc.html)，基于 hitoami 设计系统（cff99daf，色值与字体对应 `main@59cddac`）及稿内首页 token 提案 `home-update/tokens-home.css`。模式：Persuade。

稿件以 1440 桌面为构图合同：区块顺序、卡片形态与尺寸按稿实现。手机继续使用 [#131 手机方向](131-mobile.source.md)，只为新增元素做手机适配。实现沿用 Theme 现有素材，未引入稿内图片文件。

按 `PRODUCT.md` 未实现的稿件内容：「新しく入った毛糸（新到毛线）」标题与「新着」角标（无真实上新时间）；商品卡收藏心形（收藏未接入）；成品「準備中（准备中）」骨架、顾客评价示例卡与「送料無料 9,900円以上（满 9,900 日元包邮）」承诺（无真实依据）；FAQ 运费回答去掉未核实的包邮条件。主导航仍取 Shopify Navigation。

与现有规范的偏差，待用户决定：
- 品牌区 LINE 按钮稿为 `#ac5631`，不在 `colors.json`，暂用 `--yarn-action`。
- 稿中 41px 胶囊按钮按触控规则做到 44px；稿中 12px 圆角用现有 `radius-media` 14px。
- 首页商品卡按稿改为 `bg-sunken` 底、照片铺满（cover），与设计系统「商品图 contain」不同；目录与详情仍 contain。
- 首屏未选中圆点在照片上几乎不可见，加浅纸色描边与 40% 灰棕混色以保证可辨。
