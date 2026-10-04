# 首页设计系统接入

Issue #32 提取共享规则；Issue #55 将当前首页改为毛线主线与商品卡片家族。视觉事实以最终 `DESIGN.md` 为准；本页说明代码职责与下一页面如何接入。

## 单一来源

| 文件 | 职责与当前使用者 |
| --- | --- |
| `assets/yarn-design-tokens.css` | 字体加载、共享颜色与语义角色、间距、容器、圆角、触控与焦点尺寸；在旧 `yarn-prototype.css` 前全局加载 |
| `assets/yarn-foundation.css` | 导航、页脚、首页 Hero/作品/帮助的焦点与选区；导航与页脚共用字段、语言选择、下拉选项状态；不控制页面构图 |
| `assets/yarn-header.css` | 共享桌面导航、手机菜单、搜索面板与品牌标识 |
| `assets/yarn-footer.css` | 共享页脚品牌、订阅、运营 block、语言与政策的布局 |
| `sections/hitoami-hero.liquid` / `assets/hitoami-hero.css` · `sections/yarn-guide-strip.liquid` / `assets/yarn-guide-strip.css` · `sections/hitoami-story.liquid` | 首屏手作小屋轮播（页头叠图、波浪底边）；导览条（晾衣绳挂线、小猫与品类入口）；品牌介绍。三者互不关联 |
| `assets/yarn-filter-switch.css` | 首页按材质 / 粗细的圆形照片卡与标签页 |
| `assets/yarn-cards.css` / `assets/yarn-collection.css` | 商品、内容和出口卡家族；1200px 目录轴与筛选布局 |
| `assets/yarn-product-context.css` / `assets/yarn-project-reading.css` | 原生购买区、商品独立规格区与单列内容阅读 |
| `sections/yarn-line-contact.liquid` | 紧凑帮助条消费容器/色彩/圆角角色，保留非紧凑历史变体 |

颜色的唯一来源是 `design/tokens/colors.json`，`npm run tokens` 生成 `yarn-design-tokens.css` 的颜色段（`BEGIN/END generated colors` 之间，勿手改）、`settings_data.json` 配色方案和 `DESIGN.md` 前言 `colors`。页面只引用语义角色，角色表与规则见 `DESIGN.md` Colors。`--yarn-action` 用于可点击文字，`--yarn-decor-thread` 只用于插画连线；`--yarn-cta-bg` 是奶油主按钮，`--yarn-action-subtle-bg` 是导航选中、帮助和页脚的浅色面；焦点为 `--yarn-focus`，与 hover 分开。

Issue #65 删除了无模板使用的 `yarn-purpose-grid` / `yarn-seasonal-feature` / `yarn-shopping-paths`；保留的 `yarn-project-library` / `yarn-project-discovery` / `yarn-starter-project`（作品库等近期范围）已改用角色，启用前仍需核对三语文案与构图。

## 下一页面的用法

1. 先确定页面职责和对应 surface brief，选择所需的现有角色；不复制首页串联插画或四分类构图。
2. 页面容器按 `width: min(var(--yarn-content-max), calc(100% - 2 * var(--yarn-gutter)))` 对齐，内容阅读宽度可另行收窄。Hero 艺术画布的定位与宽度仍属于首页。
3. 页面样式直接消费 token；只有同一交互意图真实重复时才扩展 `yarn-foundation.css` 的作用范围，不在全局覆盖全部 `.button`、`input` 或 `.page-width`。
4. 沿用 Shopify 原生表单语义、标签、错误与成功状态。新输入框在手机至少保持 16px，交互目标至少 44px，键盘焦点不得被容器截断。
5. 新增共享 token 前检查现有角色；只能在 token 文件定义。更新实际使用说明和适用截图，不能只修改规范而未接入组件。

## Shopify 编辑边界

导航文字与目标继续来自 Navigation 菜单，菜单标题与每个菜单项的日/中/英译文在 Shopify Translate & Adapt 对应菜单资源维护；桌面、手机菜单和页面 section 必须显示同一整页语言，不能在 Liquid 写死英文或用另一份硬编码菜单遮住未翻译内容。Logo 沿用全局上传设置，未上传时使用用户提供的 hitoami 字标。帮助文案/链接来自原 Section setting。页脚订阅标题、显示开关、Block、语言/国家、政策与付款图标仍由原设置及 Shopify 数据决定。

页脚订阅仍使用 `form 'customer'`、`contact[email]` 和 `newsletter` tag；不增加营销承诺，不替换后端处理。本轮复核输入、验证和焦点，不发送真实订阅。隐藏订阅时不应渲染输入表单；未来添加运营 block 时仍使用原有 schema。

## 验证与回滚

`npm run verify` 包含两组系统边界检查：token 必须先于旧原型样式加载；`tests/yarn-color-system.test.cjs` 覆盖所有 yarn 样式与引用 `--yarn-*` 的模板，检查颜色字面量、未定义引用、生成物同步、对比度、未使用角色与近似色。它防止单一来源再次分叉，不替代浏览器视觉复核。

导航与页脚在其他页面共享生效；本次对作品详情和联系页做路径与无横向溢出的抽查，不宣称其他页面正文已完成视觉统一。回滚采用撤回本 PR 或重新选择原未变更主题；未发布预览不等于生产发布授权。

## Issue #55 当前接入

商品家族消费 `text-heading`、`accent`、`border-card`、10px card radius 与 1200px commerce max；卡片标题/规格/价格为 16/14/21px。构图与数据回退见 [当前 surface brief](approved/55-visual-fidelity.md)。

首页出口卡未选择图片时使用当前集合第一件商品主图；内容卡链接指向 `yarn_project` 时可使用其封面，运营选择的图片优先。作品正文缺失时只读取已有关联 Kit 的介绍和步骤，不创建另一份内容真值。三语运营文案仍由 Section setting 与 Shopify 对应资源维护。

## 首屏（2026-09-28 用户选定）

首页首屏由 `sections/hitoami-hero.liquid` 承担：整幅场景图，标题、说明与按钮压在左侧留白处，圆点居中在底部白色胶囊里（#126 起不再有箭头与编号）；支持滑动与方向键。每张幻灯片可上传桌面 / 手机图、设文字深浅与图片焦点，三语文案与按钮链接在编辑器维护；未上传时用内置三张氛围图。底边是一道奶白波浪。它作为首页第一个 section 时，页头透明地叠在图上（Logo 居左、桌面 ≥1340px 菜单居中、首页隐藏收藏图标与公告条，滚动吸顶后恢复白底），与线上一致。它与导览条互不关联：切换幻灯片不影响导览条，导览条也不控制幻灯片。来源见 [方案 C 视觉稿](approved/home-scheme-c.source.md)。

首屏的内置三组素材与桌面缩放规则沿用 #110：横幅原生 1672×941，桌面产品场景最大 1440px 居中、Hero 620–880px，后方共用窗帘和阳光底图；运营自选图走 Shopify responsive srcset（最高 3840px），不叠加内置窗边素材。素材来源见 [#110 首页素材](approved/110-home-assets.md)。#110 的单一 section（轮播、猫与分类联动）已按 #93 拆开，不再使用。

## 首页 1a（2026-10-03 用户确认，#126；信息架构沿用方案 C #93）

模块顺序：首屏手作小屋轮播 → 导览条（四个品类入口，小猫动画不变）→ 品牌介绍 → 挑毛线 → 按作品图选 → 新手友好编织包 → 店铺精选成品 → 帮助条。优惠区块在模板里停用（1a 不含，编辑器可重新打开）。每块是独立 section，顺序与开关在主题编辑器调整；首页主推位仍待 #50 决策。构图见 [Claude Design 1a](approved/126-home-1a.source.md)，早期方案见 [方案 C 视觉稿](approved/home-scheme-c.source.md)。

| 模块 | Section | 数据与显示规则 |
| --- | --- | --- |
| 品类入口 + 新手入口 | `yarn-guide-strip` | 节点为 block（图标、链接、三语标题与说明）；新手入口的标题和链接都填写才显示（用户 2026-09-28 决定首页不放，模板里链接留空）。桌面挂线像晾衣绳：两端钉在上一个 section 的底边（伸入 20px），两个钉点以页面中线对称（比内容区边缘各外伸至多 96px），两端垂下同样形状的弯，左侧多出的一段平缓绳子，小猫睡在左侧弯里；悬停入口时小猫醒来沿绳走过去。手机端挂线仍在节点上方、无小猫 |
| 品牌介绍 | `hitoami-story` | 居中的品牌标语与品牌故事，取自线上首页，三语在编辑器维护；两项都为空时不渲染。桌面小标题「关于品牌」另设三语设置 |
| 挑毛线 | `yarn-entry-circles`（`assets/yarn-entries.css` / `.js`） | 入口数据同 #117（`yarn_entry` Metaobject + `yarn.texture` / `yarn.use`）。同一字段的入口归为一段，段名（按质感 / 按用途）在区块设置三语维护，只有一段时不出切换；说明行优先取 block 三语说明，留空显示款数；没有商品的入口不渲染 |
| 优惠（停用） | `yarn-picks`，显示方式「优惠」 | 只取所选集合里 `compare_at_price` 高于 `price` 的商品（前 50 件中），按折扣比例从大到小；一件都没有时整块不渲染 |
| 按作品图选 | `yarn-project-picks` | 运营挑选的 `yarn_project`，未挑选时按作品库顺序；只显示可公开且有封面的作品。标签按真实关联：有成品 / 有编织包（关联商品带 `編みものキット` 标签）/ 可买材料（除编织包外还有本店可买的材料或工具） |
| 新手友好编织包 | `yarn-picks`，显示方式「新手友好」 | 集合由运营选择；只有商品字段 `yarn.beginner_reason` 有内容时才显示「新手友好」标签与理由 |
| 店铺精选成品 | `yarn-picks` | `finished-goods` 集合，桌面 4 件 4 列；「手机最多显示」设为 2 |
| 帮助条 | `yarn-line-contact`（紧凑） | 标题 / 链接文字 / 桌面说明三语在区块设置维护；未配置 LINE 链接时链接到联系页 |
| 按材质 / 粗细（停用） | `yarn-filter-switch` | 从毛线集合商品的 `yarn.material` / `yarn.weight` 收集实际取值；没有取值的维度不渲染。链接带 `filter.p.m.<字段>` 参数，需在 Search & Discovery 为同一字段开启筛选。取值 block 决定顺序、照片与三语参考针号，没上传照片时用第一件带该取值的商品主图 |

导航的 SALE 胶囊由链接目标决定：顶层菜单项指向 handle 为 `sale` 的集合时显示爪子粉底，不按文字判断。原毛线 / 编织包 / 工具精选从首页移除（毛线由品类入口与材质 / 粗细承接，编织包由新手友好编织包承接，工具由品类入口承接）；内容精选 section 保留但不在首页使用。
