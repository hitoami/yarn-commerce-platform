---
name: hitoami
description: 固定 hitoami Logo、Zen 三语字体、柔白与陶橘的 Shopify 界面系统
colors:
  home-action: "#a64b2d"
  home-thread: "#d39a58"
  home-rope: "#d39a58"
  bg-page: "#fcfbf7"
  bg-surface: "#ffffff"
  bg-sunken: "#f5e6d2"
  bg-warm: "#f5e6d2"
  bg-band: "#fcfbf7"
  bg-inverse: "#8a3d24"
  text-primary: "#433a31"
  text-heading: "#433a31"
  text-warm: "#433a31"
  text-secondary: "#433a31"
  text-muted: "#756b60"
  text-disabled: "#8c8378"
  text-inverse: "#ffffff"
  text-on-action: "#ffffff"
  text-on-cta: "#433a31"
  action: "#a64b2d"
  accent: "#a64b2d"
  action-strong: "#8a3d24"
  action-subtle-bg: "#fcfbf7"
  action-subtle-hover: "#f5e6d2"
  cta-bg: "#f5e6d2"
  cta-hover: "#f5e6d2"
  cta-border: "#d39a58"
  border-subtle: "#e6ded2"
  border-card: "#e6ded2"
  border-control: "#756b60"
  border-disabled: "#e6ded2"
  tint-butter: "#f5e6d2"
  tint-blush: "#f5e6d2"
  tint-sage: "#f5e6d2"
  selected-text: "#a64b2d"
  focus: "#426f82"
  decor-thread: "#d39a58"
  decor-art-line: "#d39a58"
  decor-halo: "rgba(211, 154, 88, 0.45)"
  overlay: "rgba(67, 58, 49, 0.32)"
  shadow-soft: "rgba(67, 58, 49, 0.14)"
  scrollbar-thumb: "#756b60"
  scrollbar-track: "#fcfbf7"
  shadow-page: "#e6ded2"
  shadow-sunken: "#e6ded2"
  shadow-inverse: "#8a3d24"
  shadow-cream: "#e6ded2"
  shadow-warm: "#e6ded2"
typography:
  page-ja:
    fontFamily: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
  page-en:
    fontFamily: "'Figtree', sans-serif"
  page-zh:
    fontFamily: "'Noto Sans SC', sans-serif"
  home-mobile-section:
    fontSize: "2.4rem"
    fontWeight: 500
    lineHeight: 1.45
  home-mobile-body:
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1.75
  home-mobile-meta:
    fontSize: "1.4rem"
  home-mobile-category:
    fontSize: "2.2rem"
    fontWeight: 500
  home-mobile-season:
    fontSize: "2.6rem"
    fontWeight: 500
  home-mobile-step:
    fontSize: "1.7rem"
    fontWeight: 500
  home-mobile-footer-heading:
    fontSize: "1.8rem"
    fontWeight: 500
  home-mobile-hero-zh:
    fontSize: "clamp(2.8rem, 8.2vw, 3.4rem)"
    fontWeight: 500
  home-mobile-hero-ja:
    fontSize: "clamp(2.6rem, 7.6vw, 3.2rem)"
    fontWeight: 500
  home-mobile-hero-en:
    fontSize: "clamp(2.8rem, 7.8vw, 3.4rem)"
    fontWeight: 500
  home-narrow-hero:
    fontSize: "clamp(2.4rem, 8.2vw, 2.8rem)"
    fontWeight: 500
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

本文记录当前实现中可复用的设计规则。2026-10-15 用户在中英日四套方案中确认 Zen 方向，并要求先由 Claude Design 设计、再由 Codex 实现手机预览，依据见 [#138 方向与交接](docs/design/approved/138-zen-mobile.source.md)。共享字体与颜色已按此方向接入；手机首页采用该稿的阅读层级，桌面保留 #131 构图。本文件描述代码与获批基础，不表示手机整页、桌面新稿或生产发布已获人工验收。

产品范围见 [PRODUCT.md](PRODUCT.md)，领域关系见 [CONTEXT.md](CONTEXT.md)。新页面先读 [首页系统接入](docs/design/home-system.md) 与对应页面 brief；设计流程遵循 [视觉复核规则](docs/agents/visual-review.md)。验收状态和未决问题放 GitHub Issue，本文不维护进度清单。

## Creative North Star

柔白底色、真实织物照片、清楚的无衬线文字和细线控件构成 hitoami 的界面。原 Logo 与手作小屋承接品牌气质，圆形实物分类帮助选线，小猫只作陪伴。陶橘用于操作，姜橘只作小面积装饰；标题与正文用同一字体，通过字号、字重和留白分层。

当前字标使用 Shopify 上传 Logo；未上传时由 `snippets/yarn-wordmark.liquid` 显示现有 hitoami 字标。保留原比例与品牌色，不重绘，不用旧 MewoolMew 猫字标替代。氛围插画不能充当真实商品或人物证据。

## Colors

唯一色源为 `design/tokens/colors.json`。`npm run tokens` 生成 `assets/yarn-design-tokens.css` 的颜色段、Shopify 配色方案及本文前言 `colors`；不要手改生成段或从截图另采一套颜色。页面只消费 `--yarn-*` 语义角色，基础 `palette` 不直接暴露给组件。

| 角色 | 当前用途 |
| --- | --- |
| `bg-page` / `bg-surface` | 柔白页面 / 白色卡面、FAQ 与输入面 |
| `bg-band` / `bg-sunken` / `bg-warm` | 柔白辅助面板 / 浅橘分类与页脚 / 兼容的浅橘配色方案 |
| `text-primary` / `text-heading` / `text-warm` | 均复用暖深灰，保留各组件语义 |
| `text-secondary` / `text-muted` / `text-disabled` | 次级正文 / 规格与说明 / 不可用文字 |
| `home-action` / `action` / `accent` | 均复用陶橘，覆盖主操作、链接及既有交易组件 |
| `action-strong` | 陶橘加深的悬停与按下态 |
| `cta-bg` / `cta-hover` / `cta-border` | 既有目录筛选和通用商品按钮保留浅色结构，映射为浅橘底、姜橘边与深色文字；手机首页主按钮为陶橘白字 |
| `action-subtle-bg` / `action-subtle-hover` | 导航选中、帮助及页脚控件 hover 等浅色操作面 |
| `border-subtle` / `border-card` / `border-control` / `border-disabled` | 分隔 / 卡片边 / 输入和数量控件边 / 禁用边 |
| `tint-blush` / `tint-butter` / `tint-sage` | 现有组件语义别名，统一映射浅橘；不再引入粉、黄、绿三套色面 |
| `focus` | 键盘焦点，2px 轮廓与 4px 偏移，与 hover 分开 |
| `decor-*` / `home-thread` / `home-rope` | 特定插画与保留旧组件的装饰，不能用于正文或恢复旧首页绳索 |
| `overlay` / `shadow-*` / `scrollbar-*` | 遮罩、限定浮层阴影、配色方案与滚动条 |

基础色板收敛为 11 色，已有语义别名继续兼容使用方。固定 Logo 保留原图原色，界面陶橘是协调色，不声称是 Logo 源色。辅助文字 `text-muted` 只放在柔白或白色面上；浅橘面使用 `text-primary`，避免小字对比不足。姜橘不用于白字按钮或浅底小字。

Shopify scheme-1 至 scheme-5 保留原 ID 与设置结构，分别映射柔白、浅橘、深陶橘、柔白与浅橘。颜色调整先改源，再检查生成物和真实页面；不能在 Theme 编辑器改完后忘记同步源文件。自动检查覆盖角色引用、生成同步与声明的对比度，不能替代视觉检查。

## Typography

| 页面语言 | 标题 / 导航 / 展示文字 | 正文 |
| --- | --- | --- |
| 日文 | Zen Kaku Gothic New | Zen Kaku Gothic New |
| 英文 | Figtree | Figtree |
| 中文 | Noto Sans SC | Noto Sans SC |

通过 `--yarn-display` / `--yarn-body` 随 `:lang()` 切换，同时接入 Rise 字体变量。手机首页标题与控件用 500、正文用 400；其他页面保留组件当前字重。只加载当前语言的 Google Fonts，旧手写字体加载与无使用方的本地字体文件已移除；在线字体不能宣称离线可用。

| 实际使用位置 | 手机 / 桌面 CSS 字号 | 字重与说明 |
| --- | --- | --- |
| 通用商品卡标题 / 规格 / 价格 | 16 / 14 / 21px，两端相同 | 标题与价格 600；首页手机覆盖见下 |
| 首页手机商品卡标题 / 规格 / 状态 | 1.6 / 1.4 / 1.4rem | 标题与状态 500，未开售状态为辅助字加装饰圆点；已定价价格为主字色 1.6rem |
| 毛线目录标题 | 28 / 40px | 600 |
| 毛线详情标题 / 价格 / 说明 | 24 / 21 / 14px，两端相同 | 标题与价格 600；说明行高 1.75 |
| 首页圆形分类标题 | 2.2rem / 26px | 手机 500，桌面 400 |
| 首页商品区、新手指引、FAQ 标题 | 2.4rem / 28px | 手机 500，桌面 400；行高 1.45 |
| 首页本季入口标题 | 2.6rem / `clamp(4rem, 4vw, 5.6rem)` | 手机 500；桌面沿用原层级 |
| 首页 Hero 标题 | 中文 `clamp(2.8rem, 8.2vw, 3.4rem)`；日文 `clamp(2.6rem, 7.6vw, 3.2rem)`；英文 `clamp(2.8rem, 7.8vw, 3.4rem)` | 手机 500；行高中文/日文 1.4、英文 1.2；桌面仍为 `clamp(3.6rem, 3.6vw, 5.2rem)` / 600 |
| 品牌介绍正文 | 1.6rem，两端相同 | 手机行高 1.75；品牌标题手机使用平衡换行，不沿用桌面强制换行 |
| 共享控件 / 元信息 | 1.5rem / 1.3rem | 不是固定 px |

≤340px 时，三语 Hero 标题使用 `clamp(2.4rem, 8.2vw, 2.8rem)`，避免 320px 且浏览器字体放大时短句断为孤字；其余正文仍随 rem 放大。这些局部字号不能升级成全站标题等级。通用商品详情另有 36 / 26px 标题，毛线详情由 `yarn-pdp.css` 覆盖为 24px；不要把通用值写成毛线页标准。

`layout/theme.liquid` 的根字号是 `(body_scale / 100) × 62.5%`，当前配置 `body_scale: 100`。浏览器默认字体为 16px 时 1rem = 10px，为 20px 时 1rem = 12.5px。保留 rem / vw 原单位，不能将一次截图的像素值当成全站常量，也不能为了对齐截图修改用户字体设置。

## Layout

共享容器 `--yarn-content-max: 1320px`，商品内容轴 `--yarn-commerce-max: 1200px`；共享 gutter 为桌面 48px、≤989px 时 24px、≤749px 时 16px。页面可以在自己的作用域收窄阅读宽度，不能覆盖全局 `.page-width`。

间距角色为 4 / 8 / 12 / 16 / 24 / 32 / 48px。手机首页品牌、分类与本季入口左右 24px；商品区、新手与 FAQ 左右 16px。FAQ 白底铺满页面。首页商品区与新手/FAQ 上下 48px，桌面仍为 56px；品牌手机为上 40px、下 48px。这些局部间距不扩成全站规则。

商品网格手机两列、列距 12px、行距 28px；桌面四列、间距 24px。首页分类在手机以 88px 圆图横向浏览、间距 16px，桌面显示五列。桌面新手指引三列，FAQ 标题与问题分两列。Hero 保持独立全幅场景画布，不受商品网格裁切规则约束。

## Depth & Shapes

共享圆角为媒体 14px、卡片 10px、面板 16px、字段 24px、按钮胶囊 999px；圆形分类与色板保持圆形。媒体缩略图、估算面板等局部尺寸以对应组件为准，不为统一数字改动当前页面。

目录商品卡使用 1px 暖灰边框，首页商品卡为无外框的开放式图文。平铺内容不增加重阴影；抽屉与下拉等浮层按已有组件使用遮罩或轻阴影。商品图以完整展示主体为先，毛线详情主图为 1:1、`contain`；品牌氛围图和专题编辑图按各自构图裁切。

共享图标目标尺寸 24px、触控区域至少 44px；复用仓库已有 SVG 和 `currentColor`。Claude Design 中的 Lucide 选择属于设计工具层，尚不能据此声称 Theme 已整体替换。品牌图形、小猫 sprite 和洗涤含义不能用任意近似图标替代。

## Components

| 组件 | 使用与状态规则 | 主要实现 |
| --- | --- | --- |
| 导航 / 手机菜单 | 原 hitoami 字标不叠色；当前项陶橘字。首页手机页头 64px、Logo 118px（≤340px 时 104px），四个 44px 图标；菜单从右侧展开，继续使用原生开关、焦点管理和 Shopify 菜单 | `yarn-header.css`、`header.liquid`、`yarn-home-mobile.css` |
| Hero / 圆点 | 手作小屋三张手动轮播、文案叠图、白胶囊圆点和波浪底边；无自动播放、无购买 CTA；支持滑动与方向键 | `hitoami-hero.liquid`、`.css`、`.js` |
| 圆形分类 / 小猫 | 分类读真实商品字段与 `yarn_entry`；原小猫独立位于分类上方，手机与桌面均显示，不依附绳索；减少动态效果时静止 | `yarn-entry-circles.liquid`、`yarn-companion`、`yarn-home-mobile.css` |
| 商品卡 | 首页开放式、目录带边框；手机首页标题完整换行，未开售使用小号辅助状态；有价与零价在 Liquid 分支，不以颜色猜测状态 | `yarn-cards.css`、`yarn-pick-card.liquid`、`yarn-home-mobile.css` |
| 毛线购买区 | 24px 标题、陶橘价格及购买动作；色号/数量由原生表单管理；手机固定底栏，禁用状态使用灰色。没有数据的规格、估算和关联内容不渲染 | `yarn-pdp.css`、`.js` |
| 按钮 / 筛选 | 手机首页主按钮为陶橘白字、48px 高；次按钮白底深字姜橘边；文字链接至少 44px。其他页保留结构，使用同一共享色板 | 对应页面样式，颜色取共享角色 |
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

- 沿用柔白、真实织物、Zen 三语无衬线、固定 hitoami 字标和独立小猫；修改共享规则时同步真实实现与本文。
- 新页面先复用现有语义角色和组件，只在同一交互意图确实重复时抽取共享规则。
- 校准规范时保留已实现变体的范围；不要把旧方案 C 的第二色层、四个绳索挂饰、旧猫字标、站内教程或工具商城带回当前系统。
- 新视觉方向先按手机稿 → 手机实现 → 用户确认 → 桌面稿 → 桌面实现推进；本文不能把未经确认的新方向提前写成成品规范。
- 代码检查、语言/溢出/图片检查和截图复核分别提供证据；不能把自动检查通过写成运营数据齐备或整页人工验收通过。
