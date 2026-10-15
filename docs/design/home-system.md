# 首页设计系统接入

本文说明当前首页与共享组件的代码职责。视觉规则见 [DESIGN.md](../../DESIGN.md)，产品与内容边界见 [PRODUCT.md](../../PRODUCT.md) 和 [CONTEXT.md](../../CONTEXT.md)。当前构图依据为 [#131 手机稿与用户补充决定](approved/131-mobile.source.md)；2026-10-15 用户明确要求保留线上手作小屋 Hero，并将圆形分类、独立小猫、新手卡片和 FAQ 延展到桌面。

旧方案 C / #126 的绳索四分类、手机无猫、旧模块顺序与独立 Kit 商品模型已被替换，不再作为新页面接入模板。必要素材来源仍保留在原位置，当前实现无需引用旧稿的第二套配色。

## 唯一来源与文件职责

| 文件 | 当前职责 |
| --- | --- |
| `design/tokens/colors.json` | 颜色基础色板、语义角色、配色方案与声明的对比度搭配；唯一色源 |
| `assets/yarn-design-tokens.css` | 全局字体、生成的颜色、间距、容器、圆角、触控与焦点尺寸；先于旧原型样式加载 |
| `assets/yarn-foundation.css` | 已接入组件的焦点、选区、共享字段和语言选择状态，不控制页面构图 |
| `assets/yarn-header.css` / `assets/yarn-footer.css` | 桌面导航、手机菜单、搜索、品牌字标、页脚和运营 block |
| `sections/hitoami-hero.liquid` / `assets/hitoami-hero.css` / `.js` | 整幅手作小屋、三张手动轮播、透明页头与波浪；`catalog_layout` 不覆盖 Hero 构图 |
| `sections/hitoami-story.liquid` / `assets/hitoami-story.css` | 品牌图文、桌面联系面板与手机文字入口 |
| `sections/yarn-entry-circles.liquid` / `assets/yarn-entries.css` / `.js` | `yarn_entry` 分类及真实商品字段关系、入口图片、分段与横向浏览 |
| `snippets/yarn-companion.liquid` / `assets/yarn-companion.css` / `.js` | 分类上方独立小猫，复用原 sprite，点击交互与减少动态效果 |
| `sections/yarn-catalog.liquid` / `assets/yarn-home-mobile.css` | 明确选择的真实毛线目录；当前首页首屏以下的手机与桌面构图覆盖 |
| `assets/yarn-cards.css` / `assets/yarn-collection.css` | 商品卡家族、目录筛选与 1200px 内容轴 |
| `sections/yarn-season-feature.liquid` / `assets/yarn-season-feature.css` | 首页本季入口；专题正文使用 `yarn-season-page` 对应文件 |
| `sections/yarn-home-guide.liquid` | 三语新手指引与 FAQ；布局在 `yarn-home-mobile.css` |
| `snippets/yarn-kit-visible.liquid` | 材料包内容公开门槛，购买可用性另读真实 Variant |
| `assets/yarn-product-context.css` / `assets/yarn-pdp.css` | 通用商品购买区与毛线详情覆盖；不能把通用奶油按钮覆盖到毛线灰棕变体 |

`npm run tokens` 生成 CSS 颜色段、`config/settings_data.json` 当前配色方案和 `DESIGN.md` 前言 `colors`，不手改生成结果。保留旧组件所需的角色不代表当前首页仍使用它们。新增页面先查实际使用方，不把 `home-rope` 等旧装饰角色当全局默认。

## 当前首页组成

`templates/index.json` 决定 section 顺序和启用状态；有数据门槛的模块还会在 Liquid 判断后隐藏。主题编辑器继续负责内容、图片、链接、排序和开关。

| 顺序 | 模块 | 当前构图与内容来源 |
| --- | --- | --- |
| 1 | `hitoami-hero` | 整幅手作小屋，文案叠图、透明页头、白胶囊圆点、奶白波浪；三张手动切换，无购买 CTA |
| 2 | `hitoami-story` | 品牌图文和联系入口；上传图优先，默认品牌氛围图保留生成来源；手机文字入口，桌面灰棕按钮 |
| 3 | `yarn-entry-circles` | 五类圆形实物照片，小猫和毛球独立在上方；手机也显示猫，无挂绳；入口读 `yarn_entry` 与 `yarn.texture` / `yarn.use` |
| 4 | `yarn-catalog` | 只读运营明确选择的已核实 Product；手机两列、桌面四列；未选择商品时显示整理提示 |
| 5 | `yarn-season-feature` | 有来源的实物封面与专题链接；专题商品来自真实选择/筛选结果，不写未验证款数 |
| 6 | `yarn-home-guide`（steps） | 新手指引；手机顺读、桌面三列卡片 |
| 7 | 材料包内容 | 只显示满足 `yarn-kit-visible` 的 `yarn_project`；缺封面、毛线/团数、教程入口或公开状态时不充数 |
| 8 | 成品（当前停用） | `picks-finished` 当前设置 `disabled: true`；启用时须使用真实且合格的成品 Product |
| 9 | `yarn-home-guide`（faq） | 手机折叠列表；桌面标题与问题两列 |
| 10 | 共享页脚 | Shopify 配置的品牌、联系、语言、政策与订阅等 |

旧 `yarn-guide-strip`、优惠、旧新手 Kit、独立帮助条 `line-support` 等 section 即使代码与配置仍保留，也不属于当前默认首页。不要因为模板里保留一个旧 section，就把它加入系统默认展示。

### Hero 与素材

Hero 和分类是独立组件，不互相控制。切换幻灯片不驱动小猫或分类。没有自动轮播；支持圆点、滑动与方向键。页头在首页叠图，滚动吸顶后恢复背景；普通页面沿用暖白导航。

手机 Hero 高度为 `clamp(560px, 76svh, 710px)`，桌面为 `clamp(620px, 71svh, 880px)`。内置桌面场景最大 1440px 居中，共用窗帘/阳光底图最大 1672px；运营上传图使用响应式图片，不额外叠加内置窗边素材。标题保留实际 rem / vw 公式，不能把浏览器量出的某个值写成所有视口的固定字号。

素材来源见 [#110 首页素材](approved/110-home-assets.md)；品牌氛围图来源为 `assets/hitoami-brand-knitting-cat.png.source.json`。这些氛围图不作为人物、材质、库存或真实商品证明。当前字标由 `yarn-wordmark` 和 Shopify Logo 设置负责，不从旧视觉稿裁图重做。

### 首屏以下的作用域

`catalog_layout` 启用时，`yarn-home-mobile.css` 通过 `.hitoami-hero--catalog` 限定品牌、分类与本季入口覆盖，同时定义 `yarn-home-catalog` 和 `yarn-home-guide` 本身。该文件包含手机和桌面规则，文件名不意味着只影响手机。

手机品牌、分类与本季入口使用 24px 左右留白；商品区、新手和 FAQ 的 `.page-width` 覆盖使用共享容器，实际为 16px 左右留白、内部横向 padding 为 0，普通商品目录也用 16px。不能只读取文件前半段的 24px 声明而忽略后续覆盖。首页商品网格两列、列距 12px，桌面四列、间距 24px。分类手机每列 85px 圆图、间距 16px，桌面五列；标题 21 / 26px。商品区与指引标题 24 / 28px，字重 400；上下留白 36 / 56px。不要恢复旧的全站 32px 标题、72px 分区间距或方形分类卡。

## 下一页面的接入方式

1. 先确认 Issue 和页面 brief，按 PRODUCT / CONTEXT 确认当前用户路径。当前材料包是内容加毛线组合，不新增独立库存或双模式商品。
2. 用共享容器 `width: min(var(--yarn-content-max), calc(100% - 2 * var(--yarn-gutter)))`，商品家族用 1200px 轴；页面局部收窄须保留自己的作用域。
3. 字体、颜色、间距和圆角引用已有 token。只有相同意图的重复组件才扩展共享样式，不全局覆盖 `.button`、`input` 或 `.page-width`。
4. 根据实际用途选按钮变体：首页联系 / 毛线购买为灰棕，目录价格 / 部分交易动作为陶土，目录筛选 / 通用商品加购为奶油。变体与状态同组件一起复用。
5. 保留 Shopify 原生表单与错误/成功语义。新输入手机字号至少 16px，交互目标至少 44px，焦点不得被容器裁切。数量、价格、库存与购买可用性不在展示层复制。
6. 新共享规则同时更新实现与 DESIGN；只校准文档时不能借机改视觉。新增方向按手机稿到桌面实现的既定流程确认。

## Shopify 编辑与语言边界

导航文字和目标来自 Shopify Navigation；日中英译文在对应资源维护，不在 Liquid 写另一份菜单遮住缺译。Logo 使用上传设置及现有字标回退。Section / Block 运营文案经 `yarn-setting-text`，通用控件进 Theme locales，商品与 Metaobject 正文来自 Shopify 翻译。页面、桌面导航、手机菜单与页脚跟随同一语言。

页脚订阅继续使用 `form 'customer'`、`contact[email]` 和 `newsletter` tag；隐藏订阅时不渲染表单。视觉核对不发送真实订阅。

材料包的内容公开与购买可用性分开：先验证公开、封面、毛线 Variant / 团数与教程入口，再判断每条材料是否定价且可售；缺项时阻止整份加购，可逐项购买其余可售毛线。零价显示「暂未开售」。收藏入口不暗示收藏人数，商品卡不补造评分或销量。

## 验证与维护

`npm run verify` 包括 token 加载顺序、颜色生成同步、引用存在、声明的对比度、颜色字面量与近似色检查。页面或购买流程变更还需本地 `npm run proof`，按 `docs/agents/visual-review.md` 复核 390 / 1440 的实际截图、语言、溢出、图片与脚本结果；必要时检查展开的菜单和表单状态。

验证结论引用当前 `.proof/report.md`，只覆盖报告中的路径与状态。截图与日志保留在忽略目录，不提交为新的设计权威。未完成的人工验收、运营资料和导航接线继续记录在对应 Issue；自动检查通过不能代替这些条件。

Claude Design 是这套规范的设计工具镜像，须按同一版本同步 token、组件说明与示例。同步以实际代码和当前获批方向为准，不从镜像反推新的产品范围；图标、字体文件和素材若仅存在设计工具中，应明确标出与 Theme 的差异。代码/规范改动可撤回对应提交，生产 Theme 发布仍需当次人工批准。
