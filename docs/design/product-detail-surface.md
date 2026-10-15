# 商品详情页

模式：Persuade。帮助顾客识别商品、核对内容与配置，再通过 Shopify 原生表单购买。

## 当前批准范围

- 手机版：用户已确认完整商品信息的实际呈现，批准依据为 [PR #98](https://github.com/hitoami/yarn-commerce-platform/pull/98) 与 [Issue #73 的合并说明](https://github.com/hitoami/yarn-commerce-platform/issues/73#issuecomment-5850722892)。构图与来源记录见 [手机方向](approved/73-pdp-mobile.source.md)。
- 桌面版：本会话确认「可以，按这张实现」，来源与提示词见 [桌面方向](approved/73-pdp-desktop.source.md)。购买区为左右双栏，详情沿 1200px 内容轴展开；关于正文左、附图右，内容物图左、双栏明细右，三步横排、两张规格卡、单列折叠问答。
- 编织包先呈现图库、标题、价格、数量与购买，再顺读关于、内容物、步骤、尺寸、适合谁和 FAQ。手机内容物明细在内容物图片之前；正文不能被图片或简化标签替代。
- 字体沿用现有 `yarn-design-tokens.css`：中文文楷、日文 Klee One / Noto Sans JP、英文现有字体。价格、按钮和边线继续消费已有颜色角色。
- 毛线与成品共用购买结构，保留各自的规格正文；本轮不添加差异化内容与后台字段。

## 毛线详情手机版（Issue #120）

- 适用于带 `毛糸` tag 或在 `yarn` 集合里的商品；编织包 / 成品不变。批准依据与差异见 [毛线手机方向](approved/120-yarn-pdp-mobile.source.md)。本节取代上文对毛线的「毛线与成品共用购买结构」，以及旧手机方向中「不使用浮动购买栏」对毛线的约束。
- 顺序：图库（1:1 完整显示、4 缩略图、收藏）→ 毛线 / 新手友好角标 → 标题 → 价格「/ 团」（只在 Shopify 含税设置开启时加「（含税）」）→ 商品说明 → 颜色 → 线的规格 → 要买几团？ → 用这款线能织 → 搭配的编织包 → 怎么洗 → 原有「购买须知」与相关商品。
- 手机（#122，用户 2026-10-04 决定）：不显示页内数量、加购、立即购买、库存行与重复公告条的购物说明行，底部常驻栏始终显示，是唯一购买入口；桌面保留页内加购。
- 数据：规格读 `yarn.composition`（无则 `yarn.material`）、`ball_weight_g` / `ball_length_m`、`thickness`、`gauge`、`needle_knit` / `needle_crochet`（都没有时用 `needle_size`）；颜色有 Shopify 原生色板（选项关联 `shopify.color-pattern`）时显示 44px 色块，否则显示编号圆钮；新手角标与卡片理由读 `yarn.beginner_reason`；「要买几团？」即 CONTEXT 的参照标准，读 `yarn.usage_estimates` → `yarn_usage`；作品是灵感入口（用户 2026-10-02 决定，不构成材料要求或推荐），为 `materials` 或 `components` 引用本商品、可公开且有封面的 `yarn_project`；编织包读 `yarn.related_kits`，没有配对不显示，卡片规格行读 `yarn.spec_line`；洗涤读 `yarn.care`，按关键词配图标（漂白 → 禁止、熨烫 → 熨斗、晾干 → 勾、其余 → 洗涤）。缺数据的块整块不渲染。
- 样板商品（#122，用户 2026-10-04 决定）：`demo-cotton-candy-yarn-50g` 用 demo 数据填满全部区块，作为对照视觉稿的基准页；其他毛线由选品组逐步补真实数据。
- 「按参考填入 N 团」只改原生数量输入，不加购。手机常驻栏的数量写回同一（隐藏的）输入，「加入」点击原加购按钮；售罄 / 不可售时随原按钮禁用，加购错误显示在常驻栏上方。Rise 切换颜色会把数量重置为最小值，沿用原行为。
- 桌面（≥750px）不显示常驻栏，下方内容沿 1104px 轴展开；桌面视觉稿待手机实现确认后另出。

## 实现与内容边界

- `sections/main-product.liquid` 保留 Shopify 图库、Variant、数量规则、库存、加购、动态购买、错误与售罄状态。
- `snippets/yarn-kit-story.liquid` 从 Shopify `product.description` 的六段结构读取完整正文；分段不足时保留描述回退。不得根据视觉稿写死内容物、教程、价格或评价。
- 编织包手机正文样式作用域限定在 `.yarn-product-page .yarn-kit-story-full`。共享作品页不跟随商品页改版。
- 桌面变化限定在 990px 以上：购买区最大宽度 1104px，48px 列距，受视口约束的主图最高 520px；关联商品入口保留并压缩高度。较长内容允许自然增高，不固定材料条目数、不截断正文。
- 主图保留完整商品，缩略图继续可切换。FAQ 保留原生 `details` / `summary` 行为。
- 商品图片和源站说明属于当前内部演示内容。公开仓库只保存必要方向、来源和提示词；未获授权的参考照片、截图与含这些照片的视觉稿只在本地及受保护预览保留，不作为公开发布资产。

## 验收

运行 `npm run proof`，使用 `.proof/report.md` 的实际结论和清单；当前主分支还包含政策/客服页面，截图数以配置为准，不以旧的 42 张固定值漏掉新增覆盖。

商品首屏之外，需补看同视口的关于、完整内容物、步骤/规格和 FAQ 展开状态；验证图库切换、变体（存在时）、数量和加购/删除。下方区块未出现在首屏截图时，不得宣称已由首屏证据自动覆盖。证据包补充需求在 [#71](https://github.com/hitoami/yarn-commerce-platform/issues/71#issuecomment-5850351232) 跟踪。
