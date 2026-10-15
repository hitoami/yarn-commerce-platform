# Issue #55 商品家族构图

范围与批准记录：[Issue #55](https://github.com/hitoami/yarn-commerce-platform/issues/55#issuecomment-5745597797)。用户在本轮确认按指定手机/桌面原型修正 PR #56 的视觉还原；沿用既有品牌与 Shopify 数据边界，不使用仅适用于 #23 的原型例外。

| Surface | 目的 | 构图 |
| --- | --- | --- |
| 首页 | Persuade | 三节点手作插画，毛线精选优先，编织包/成品/内容分层 |
| 商品目录 | Operate | 搜索 → 品类 → 非重叠价格带 → 原生筛选/排序 → 4/2 列商品 |
| 毛线、Kit、成品 PDP | Operate | 主图/缩略图 + 购买区；图库下独立真实描述，Kit 叙事顺读 |
| Project 内容 | Read | 800px 单列封面、摘要、阅读、来源与已关联商品出口 |

原型图未入库，现以线上实现为准。生成图的文件像素宽度不等于 390px，不将其虚构商品文案、规格、照片或配对写入 Shopify。实际字号和响应式事实以 `DESIGN.md` 为准。

真实商品照片使用 contain 保完整；未录入的规格提示查看详情，未证实的配对不渲染为同款。保留 Shopify 页脚、动态购买与实际供货筛选，后台没有材质/粗细筛选时不画假控件。

## 新增花束插画来源

文件：`assets/mewool-hero-finished-node.png`。2026-09-19 由内置 ImageGen 生成，参考本仓库 `mewool-hero-project-node-v2.png` 与 `mewool-hero-yarn-node.png` 的画风。已打开检查：透明背景、完整主体、无文字/Logo/水印；仅作为成品分类入口插画，不代表在售商品实物。

原始提示词：

> Create a single production illustration asset for MewoolMew yarn storefront: a small bouquet of crocheted flowers, using exactly the detailed warm watercolor-and-fine-ink textile illustration style of the two attached reference assets. Input 1 and 2 are style and palette references, not edit targets. Center a beautiful hand-crocheted bouquet with 3 cream daisies, 2 muted terracotta flowers and sage green leaves, wrapped in simple kraft paper, tied with a cream yarn bow. Obvious yarn stitch texture; warm cream, sage, golden ochre, terracotta palette. Three-quarter slightly elevated view. Isolated entire bouquet with generous breathing room, fully visible with no cropped flowers or stems. Transparent background with actual alpha; no disc, no backdrop, no shadow rectangle. The asset must fit an existing circular hero slot. Do not draw the circle or border. Not a photograph; match the references' refined handmade illustration. No text, no logo, no letters, no watermark, no labels. Square image.
