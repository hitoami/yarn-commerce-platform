---
name: hitoami
description: 从当前 Shopify 首页、毛线目录、毛线详情与本季专题提取的暖纸手作界面系统
colors:
  home-action: "#675144"
  home-thread: "#8c8880"
  home-rope: "#b8b1a4"
  bg-page: "#f9f6f0"
  bg-surface: "#fffefa"
  bg-sunken: "#ebe5dc"
  bg-warm: "#ece8dc"
  bg-band: "#f5f1e8"
  bg-inverse: "#8f3c26"
  text-primary: "#2f302f"
  text-heading: "#13202d"
  text-warm: "#3d3931"
  text-secondary: "#4a4b48"
  text-muted: "#686762"
  text-disabled: "#8c8880"
  text-inverse: "#fffefa"
  text-on-action: "#fffefa"
  text-on-cta: "#292a28"
  action: "#a6472e"
  accent: "#b93b20"
  action-strong: "#8f3c26"
  action-subtle-bg: "#fff9e9"
  action-subtle-hover: "#fff3de"
  cta-bg: "#f8e5a9"
  cta-hover: "#f6dfa0"
  cta-border: "#efd68d"
  border-subtle: "#e4dfd7"
  border-card: "#dedbd5"
  border-control: "#686762"
  border-disabled: "#d3cfc7"
  tint-butter: "#f8e5a9"
  tint-blush: "#f4dfdc"
  tint-sage: "#eceadb"
  selected-text: "#9e5554"
  focus: "#426f82"
  decor-thread: "#bf5a38"
  decor-art-line: "#e9bd51"
  decor-halo: "rgba(248, 229, 169, 0.45)"
  overlay: "rgba(47, 48, 47, 0.32)"
  shadow-soft: "rgba(103, 81, 68, 0.14)"
  scrollbar-thumb: "#b8b1a4"
  scrollbar-track: "#f5f1e8"
  shadow-page: "#d8d4cc"
  shadow-sunken: "#d9d1c4"
  shadow-inverse: "#6d2c1b"
  shadow-cream: "#eadfc4"
  shadow-warm: "#d8d1bd"
typography:
  display-ja-en:
    fontFamily: "'Klee One', 'Noto Sans JP', sans-serif"
  body-ja:
    fontFamily: "'Noto Sans JP', sans-serif"
  body-en:
    fontFamily: "'Figtree', 'Noto Sans JP', sans-serif"
  display-zh:
    fontFamily: "'LXGW WenKai', 'Noto Sans SC', sans-serif"
  body-zh:
    fontFamily: "'LXGW WenKai Screen', 'Noto Sans SC', sans-serif"
  commerce-card-title:
    fontSize: "16px"
    fontWeight: 600
  commerce-meta:
    fontSize: "14px"
  commerce-card-price:
    fontSize: "21px"
    fontWeight: 600
  yarn-product-title:
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.35
  shared-control:
    fontSize: "1.5rem"
  shared-meta:
    fontSize: "1.3rem"
  shared-section:
    fontSize: "clamp(2.5rem, 2.5vw, 3.2rem)"
  shell-input:
    fontSize: "16px"
rounded:
  card: "10px"
  media: "14px"
  panel: "16px"
  field: "24px"
  circle: "50%"
  pill: "999px"
spacing:
  fine: "4px"
  small: "8px"
  compact: "12px"
  control: "16px"
  content: "24px"
  section: "32px"
  wide: "48px"
components:
  button-home-yarn:
    backgroundColor: "{colors.home-action}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.pill}"
  button-commerce:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-action}"
    rounded: "{rounded.pill}"
  button-commerce-hover:
    backgroundColor: "{colors.action-strong}"
  button-generic-product:
    backgroundColor: "{colors.cta-bg}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.pill}"
  button-generic-product-hover:
    backgroundColor: "{colors.cta-hover}"
  nav-selected:
    backgroundColor: "{colors.action-subtle-bg}"
    textColor: "{colors.action}"
    rounded: "{rounded.pill}"
  field-shell:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.field}"
    typography: "{typography.shell-input}"
    height: "56px"
  card-commerce:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.border-card}"
  favorite:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "44px"
---
# Design System: hitoami

本文记录当前实现中可复用的设计规则；颜色、字体与控件值以代码为准，页面构图以当前获批方向为准。2026-10-15 根据 `main@59cddac` 的首页、毛线目录、毛线详情和本季专题校准，替换旧方案 C / #126 中已失效的首页、字标与商品模型说明。此日期说明校准依据，不代表全站人工验收或生产发布。

产品范围见 [PRODUCT.md](PRODUCT.md)，领域关系见 [CONTEXT.md](CONTEXT.md)。新页面先读 [首页系统接入](docs/design/home-system.md) 与对应页面 brief；设计流程遵循 [视觉复核规则](docs/agents/visual-review.md)。验收状态和未决问题放 GitHub Issue，本文不维护进度清单。

## Creative North Star

暖纸底色、真实织物照片、轻柔手写标题、细线控件构成 hitoami 的手作气质。首页手作小屋承接品牌氛围，圆形实物分类帮助选线，小猫只作陪伴。商品与购买信息保持清楚、克制，层次主要来自留白、浅色面和细边线。

当前字标使用 Shopify 上传 Logo；未上传时由 `snippets/yarn-wordmark.liquid` 显示现有 hitoami 字标。保留原比例与品牌色，不重绘，不用旧 MewoolMew 猫字标替代。氛围插画不能充当真实商品或人物证据。

## Colors

唯一色源为 `design/tokens/colors.json`。`npm run tokens` 生成 `assets/yarn-design-tokens.css` 的颜色段、Shopify 配色方案及本文前言 `colors`；不要手改生成段或从截图另采一套颜色。页面只消费 `--yarn-*` 语义角色，基础 `palette` 不直接暴露给组件。

| 角色 | 当前用途 |
| --- | --- |
| `bg-page` / `bg-surface` | 暖纸页面 / 卡片、导航与输入面 |
| `bg-band` / `bg-sunken` / `bg-warm` | 浅米 FAQ 与估算面板 / 暖砂次级面与页脚 / 可选暖米配色方案 |
| `text-primary` / `text-heading` / `text-warm` | 正文与毛线详情标题 / 商品卡和目录标题 / Hero 等暖色文字 |
| `text-secondary` / `text-muted` / `text-disabled` | 次级正文 / 规格与说明 / 不可用文字 |
| `home-action` | 首页桌面联系按钮；毛线详情价格、购买按钮和选中环 |
| `action` / `accent` / `action-strong` | 链接、导航当前项 / 商品卡价格和部分交易动作 / 深色交互态 |
| `cta-bg` / `cta-hover` / `cta-border` | 目录筛选选中、通用商品加购等奶油变体；当前首页 Hero 不显示购买按钮 |
| `action-subtle-bg` / `action-subtle-hover` | 导航选中、帮助及页脚控件 hover 等浅色操作面 |
| `border-subtle` / `border-card` / `border-control` / `border-disabled` | 分隔 / 卡片边 / 输入和数量控件边 / 禁用边 |
| `tint-blush` / `tint-butter` / `tint-sage` | 分类与信息面；颜色不证明库存、齐套、难度或优惠 |
| `focus` | 键盘焦点，2px 轮廓与 4px 偏移，与 hover 分开 |
| `decor-*` / `home-thread` / `home-rope` | 特定插画与保留旧组件的装饰，不能用于正文或恢复旧首页绳索 |
| `overlay` / `shadow-*` / `scrollbar-*` | 遮罩、限定浮层阴影、配色方案与滚动条 |

灰棕、陶土和奶油是现有的不同使用范围，不得把其中一种直接扩成所有页面的主按钮。毛线详情的灰棕价格也不覆盖目录卡的陶土价格。`selected-text` 等保留角色只随已有使用方维护，新页面不为凑齐色板而使用。

Shopify scheme-1 至 scheme-5 分别用于默认、暖砂、深色反白、柔和奶油、暖米。颜色调整先改源，再检查生成物和真实页面；不能在 Theme 编辑器改完后忘记同步源文件。自动检查覆盖角色引用、生成同步与已声明的对比度搭配，不能替代视觉检查。

## Typography

| 页面语言 | 标题 / 导航 / 展示文字 | 正文 |
| --- | --- | --- |
| 日文 | Klee One，Noto Sans JP 回退 | Noto Sans JP |
| 英文 | Klee One，Noto Sans JP 回退 | Figtree，Noto Sans JP 回退 |
| 中文 | LXGW WenKai（霞鹜文楷），Noto Sans SC 回退 | LXGW WenKai Screen（文楷屏幕版），Noto Sans SC 回退 |

通过 `--yarn-display` / `--yarn-body` 随 `:lang()` 切换，同时接入 Rise 字体变量。具体按钮沿用所属组件的字体声明，不能用全局选择器强制改写。字体当前在线加载；未打包本地字体不能宣称离线可用。

| 实际使用位置 | 手机 / 桌面 CSS 字号 | 字重与说明 |
| --- | --- | --- |
| 商品卡标题 / 规格 / 价格 | 16 / 14 / 21px，两端相同 | 标题与价格 600 |
| 毛线目录标题 | 28 / 40px | 600 |
| 毛线详情标题 / 价格 / 说明 | 24 / 21 / 14px，两端相同 | 标题与价格 600；说明行高 1.75 |
| 首页圆形分类标题 | 21 / 26px | 400 |
| 首页商品区、新手指引、FAQ 标题 | 24 / 28px | 400，行高 1.45 |
| 首页本季入口标题 | 27px / `clamp(4rem, 4vw, 5.6rem)` | 手机 400；桌面沿用专题自身层级 |
| 首页 Hero 标题 | `clamp(2.8rem, 7.8vw, 3.4rem)` / `clamp(3.6rem, 3.6vw, 5.2rem)` | 600；行高 1.35 / 1.3 |
| 品牌介绍正文 | 12px / 1.6rem | 手机紧凑文案属于首页局部规则 |
| 共享控件 / 元信息 | 1.5rem / 1.3rem | 不是固定 px |

这些局部字号不能升级成全站标题等级。通用商品详情另有 36 / 26px 标题，毛线详情由 `yarn-pdp.css` 覆盖为 24px；不要把通用值写成毛线页标准。

`layout/theme.liquid` 的根字号是 `body_scale × 62.5%`，当前配置 `body_scale: 100`。浏览器默认字体为 16px 时 1rem = 10px；本次用户 Chrome 实测根字号为 12.5px。保留 rem / vw 原单位，不能将一次截图的像素值当成全站常量，也不能为了对齐截图修改用户字体设置。

## Layout

共享容器 `--yarn-content-max: 1320px`，商品内容轴 `--yarn-commerce-max: 1200px`；共享 gutter 为桌面 48px、≤989px 时 24px、≤749px 时 16px。页面可以在自己的作用域收窄阅读宽度，不能覆盖全局 `.page-width`。

间距角色为 4 / 8 / 12 / 16 / 24 / 32 / 48px。首页当前构图另有局部间距：手机品牌、分类与本季入口左右 24px；商品区、新手与 FAQ 的 `.page-width` 规则沿共享 gutter 使用 16px。普通目录手机边距也为 16px。首页商品区与新手/FAQ 上下 36px，桌面 56px，不应套用旧文档的全站 40 / 72px。

商品网格手机两列、列距 12px；桌面四列、间距 24px。首页分类在手机以 85px 圆图横向浏览、间距 16px，桌面显示五列。桌面新手指引三列，FAQ 标题与问题分两列。Hero 保持独立全幅场景画布，不受商品网格裁切规则约束。

## Depth & Shapes

共享圆角为媒体 14px、卡片 10px、面板 16px、字段 24px、按钮胶囊 999px；圆形分类与色板保持圆形。媒体缩略图、估算面板等局部尺寸以对应组件为准，不为统一数字改动当前页面。

目录商品卡使用 1px 暖灰边框，首页商品卡为无外框的开放式图文。平铺内容不增加重阴影；抽屉与下拉等浮层按已有组件使用遮罩或轻阴影。商品图以完整展示主体为先，毛线详情主图为 1:1、`contain`；品牌氛围图和专题编辑图按各自构图裁切。

共享图标目标尺寸 24px、触控区域至少 44px；复用仓库已有 SVG 和 `currentColor`。Claude Design 中的 Lucide 选择属于设计工具层，尚不能据此声称 Theme 已整体替换。品牌图形、小猫 sprite 和洗涤含义不能用任意近似图标替代。

## Components

| 组件 | 使用与状态规则 | 主要实现 |
| --- | --- | --- |
| 导航 / 手机菜单 | hitoami 字标；当前项浅奶油面与陶土字；普通页暖白底。首页 Hero 透明叠图，滚动吸顶后恢复底色；首页隐藏公告和收藏入口 | `yarn-header.css`、`header.liquid` |
| Hero / 圆点 | 手作小屋三张手动轮播、文案叠图、白胶囊圆点和波浪底边；无自动播放、无购买 CTA；支持滑动与方向键 | `hitoami-hero.liquid`、`.css`、`.js` |
| 圆形分类 / 小猫 | 分类读真实商品字段与 `yarn_entry`；原小猫独立位于分类上方，手机与桌面均显示，不依附绳索；减少动态效果时静止 | `yarn-entry-circles.liquid`、`yarn-companion`、`yarn-home-mobile.css` |
| 商品卡 | 首页开放式，目录带边框；真实标题、规格、价格和状态。价格未确认或为零显示「暂未开售」；按钮可用性由实际商品状态决定 | `yarn-cards.css`、`yarn-product-card.liquid` |
| 毛线购买区 | 24px 标题、灰棕价格及购买动作；色号/数量由原生表单管理；手机固定底栏，禁用状态使用灰色。没有数据的规格、估算和关联内容不渲染 | `yarn-pdp.css`、`.js` |
| 按钮 / 筛选 | 灰棕：首页联系与毛线购买；陶土：商品文字动作与购物车交易动作；奶油：目录选中筛选与通用商品加购；保留各自 hover、focus、disabled | 对应页面样式，颜色取共享角色 |
| 字段 / 数量 | 共享输入 56px 高、16px 字号、24px 圆角；目录搜索等已有紧凑变体保留实际高度。标签、验证与成功状态沿用 Shopify 原生语义 | `yarn-foundation.css`、`yarn-collection.css` |
| 本季专题 | 真实商品图片、编辑标题、目录锚点与商品出口；价格和可售性仍读 Shopify | `yarn-season-feature.css`、`yarn-season-page.css` |
| 新手指引 / FAQ | 三语 block；桌面三列步骤与两列 FAQ，手机顺读；折叠按钮保留键盘操作与明显焦点 | `yarn-home-guide.liquid`、`yarn-home-mobile.css` |
| 页脚 | 运营 block、语言、政策、付款标识由设置与 Shopify 数据决定；订阅保留原 `customer` 表单，隐藏时不渲染输入 | `yarn-footer.css`、`footer.liquid` |

首页完整顺序、文件职责及隐藏条件见 [首页系统接入](docs/design/home-system.md)。毛线/成品详情的局部构图继续参考 [商品详情 brief](docs/design/product-detail-surface.md)，产品范围冲突时以 PRODUCT / CONTEXT 的当前定义为准，不能恢复旧 Kit 独立商品或双模式购买设计。

## Content

运营内容映射到 Section setting、Block、Metaobject、Metafield 或 Shopify Product。通用控件用 Theme locales；section / block 的 `key`、`key_zh`、`key_en` 经 `yarn-setting-text` 读取；导航菜单与商品正文使用 Shopify 对应资源译文。页面、菜单、页脚必须跟随同一整页语言，日文回退不算翻译验收通过。

只售毛线与手作成品；材料包是作品内容及真实毛线 Variant × 团数的组合，不拥有另一份库存或价格。教程经 LINE 人工核对领取。材料包公开门槛包括公开状态、封面、毛线与团数、教程领取链接；完整购买能力另外检查每条材料的价格与可售性。作品公开不等于材料齐套可买。

不虚构评价、销量、折扣、规格、库存或新手难度；缺数据时使用空态、明确缺项或隐藏模块。AI 品牌氛围图必须保留来源/提示词，不能替换商品实物证据。设计工具中的示例必须标为示例，不把概念稿截图写成真实经营信息。

## Do / Don't

- 沿用当前暖纸底、真实织物、手写字体、hitoami 字标和独立小猫；修改共享规则时同步真实实现与本文。
- 新页面先复用现有语义角色和组件，只在同一交互意图确实重复时抽取共享规则。
- 校准规范时保留已实现变体的范围；不要把旧方案 C 的第二色层、四个绳索挂饰、旧猫字标、站内教程或工具商城带回当前系统。
- 新视觉方向先按手机稿 → 手机实现 → 用户确认 → 桌面稿 → 桌面实现推进；本文不能把未经确认的新方向提前写成成品规范。
- 代码检查、语言/溢出/图片检查和截图复核分别提供证据；不能把自动检查通过写成运营数据齐备或整页人工验收通过。
