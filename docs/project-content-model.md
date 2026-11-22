# 编织作品内容模型

本文记录已经在真实 Shopify 店铺保存的 `yarn_project` 最小内容模型，供内部原型录入与接线时查阅。Project、Product、Material Requirement 与 Tutorial 的含义及关系沿用[作品体验与内容编辑合同](project-experience-contract.md)，本文不重新定义领域模型，也不作为任务状态或验收跟踪表。

## 后台入口与定义能力

- Definition type：`yarn_project`
- 后台显示名：编织作品
- Definition：[自定义数据 → Metaobjects → 编织作品](https://admin.shopify.com/store/tutaka-54/settings/custom_data/metaobjects/yarn_project)
- Entry 列表：[内容 → Metaobjects → 编织作品](https://admin.shopify.com/store/tutaka-54/content/metaobjects/entries/yarn_project)
- Online Store 网页已开启，URL prefix 为 `projects`。
- Publishable、Translatable 与 Storefront API 访问已开启；Customer Account API 访问关闭。

这些能力描述 Shopify Definition 的当前配置，不表示任一 Entry 已公开、任一语言已发布，或前台路径已经完成验收。

## 固定字段

当前 Definition 为以下 20 个字段。不要在 Theme 中另造同义字段；受保护内部演示可使用明确标注、可替换的示例，正式内容不根据缺失资料补造事实。

| Key | Shopify 类型 | 必填或限制 | 用途 |
| --- | --- | --- | --- |
| `title` | Single line text | 必填 | 作品名称 |
| `summary` | Multi-line text | 可选 | 作品简介 |
| `cover` | File reference | 单个、仅 IMAGE | 作品封面 |
| `category` | Single line text | 枚举：配饰 / 服装 / 家居 / 花片 / 玩偶 | 作品类别与筛选 |
| `difficulty` | Single line text | 枚举：新手 / 简单 / 进阶 / 待核实 | 难度与筛选；未知时不能推定为简单 |
| `time_minutes` | Integer | 可选 | 预计制作分钟数；未知时留空 |
| `made_for` | Single line text | 可选 | 适用对象 |
| `holiday` | Single line text | 可选 | 节日或季节主题 |
| `hook_size` | Single line text | 可选 | 钩针规格 |
| `preparation` | Rich text | 可选 | 制作准备与已核实要求 |
| `materials` | List of Product references | 可选 | 关联材料 Product |
| `components` | List of Metaobject references | 可选；仅 `yarn_material` | 有序逐项配件清单，优先于旧 materials / tools 展示 |
| `tools` | List of Product references | 可选 | 按需补齐的工具 Product |
| `finished_products` | List of Product references | 可选 | 关联成品 Product |
| `tutorial` | Rich text | 可选 | 作品内图文教程或引导内容 |
| `tutorial_url` | URL | 可选 | 完整原教程链接 |
| `video_url` | URL | 可选 | 视频来源链接 |
| `source_credit` | Single line text | 可选 | 作者或来源署名 |
| `customization_enabled` | Boolean | 可选 | 是否显示定制咨询入口 |
| `release_scope` | Single line text | 必填；枚举：仅内部原型 / 已核实可公开 | 业务发布门槛 |

`materials`、`tools` 与 `finished_products` 必须选择店铺中真实的 Product。它们不表达 Variant、采购数量或套件组成，也不证明商品已经适配教程。用量未知时保持未知，不用商品团数、默认 Variant 或推测值补齐。

## 逐项配件 `yarn_material`

后台显示名为「作品配件」，在[配件条目列表](https://admin.shopify.com/store/tutaka-54/content/metaobjects/entries/yarn_material)维护。定义已启用 Active / Draft、翻译与 Storefront API，不开启独立网页或 Customer Account API。它是作品需要什么的内容记录，不是新的商品或库存系统。

| Key | 类型 | 用途 |
| --- | --- | --- |
| `title` | Single line text，必填 | 配件名称 |
| `specification` | Multi-line text | 规格与用途 |
| `supply` | Single line text，选项 | 本店提供 / 需自行准备 / 信息待补充 |
| `variant` | Product variant reference，单个 | 准确的 Shopify 商品规格；不得自动换为其他 Variant |
| `quantity` | Integer，可选 | 建议采购件数；不是已核实的制作耗用量 |
| `note` | Multi-line text | 自备建议、缺项说明、内部演示和适配待核实事项 |
| `component_type` | Single line text，选项 | 毛线 / 工具 / 其他材料；只是详情展示层级，不改变商品事实 |
| `image` | File reference，单个 IMAGE | 该作品中的配件图；毛线优先用这张图展示 |

每个正式演示作品至少有一条标为「毛线」的配件并配图。毛线条目先以大图和规格显示，工具、其他材料以紧凑清单显示；缺少 `component_type` 的旧条目安全留在辅助清单，Theme 不根据名称猜测类型。毛线图缺失时 Theme 可回退到精确 Variant / Product 图，但内容录入仍应为毛线配件保存图片。生成示意图必须在 `note` 披露，不能因为有图就推定粗细、用量或替代适配已核实。

「本店提供」且有效 Variant 已关联时，页面才读取该 Variant 的实时 `available`、价格和采购数量规则；缺货不显示加购表单。自备、待补或空引用仍作为清单行展示，均不妨碍作品展示、教程阅读和其他配件选购。工具也只能由顾客明确逐项加入。

`components` 非空时不重复展示旧 `materials` / `tools`；没有迁移的作品继续使用原字段，不删除旧内容。四条小袋示例为 `demo-pouch-yarn`、`demo-pouch-hook`、`demo-pouch-finishing`、`demo-pouch-strap`，供给状态为可选购、自备、自备、待补充；不承诺完整材料包。购买行携带 Project、Component 和内部作品 handle，购物车通过 Shopify 元对象重新解析安全的作品返回链接。

## Entry、发布与可见性

当前实际保存了九条 Active 内部样例 Entry：

| 内部样例 | Shopify Entry ID | Handle | 预期网页路径 |
| --- | --- | --- | --- |
| 方形篮 | `279381770553` | `demo-square-basket` | `/pages/projects/demo-square-basket` |
| 花片双拼小袋｜内部示例 | `279382294841` | `demo-granny-pouch` | `/pages/projects/demo-granny-pouch` |
| 花片盖毯 | `279382851897` | `demo-flower-blanket` | `/pages/projects/demo-flower-blanket` |
| 雨色方格托特包｜内部样例 | `279455170873` | `rain-check-tote` | `/pages/projects/rain-check-tote` |
| 柚子花杯垫｜内部样例 | `279455793465` | `yuzu-flower-coasters` | `/pages/projects/yuzu-flower-coasters` |
| 云朵纹靠垫套｜内部样例 | `279455990073` | `cloud-cushion-cover` | `/pages/projects/cloud-cushion-cover` |
| 雾粉短围巾｜内部样例 | `279456153913` | `mist-pink-short-scarf` | `/pages/projects/mist-pink-short-scarf` |
| 午睡小猫玩偶｜内部样例 | `279456186681` | `nap-cat-amigurumi` | `/pages/projects/nap-cat-amigurumi` |
| 秋叶挂饰｜内部样例 | `279456219449` | `autumn-leaf-garland` | `/pages/projects/autumn-leaf-garland` |

九条 Entry 均已保存中文名称，Shopify 平台展示状态目前为 Active，`release_scope` 仍为 `仅内部原型`。团队演示期间，具有标题的记录会在 live Theme 中展示；上述路径由当前 Handle 推导，仅作内容接线记录，不代表材料、教程、版权或业务 ready 已获确认。

Shopify 的 Active / Draft 是平台提供的展示开关；`release_scope` 是独立的业务门槛。两者不能合并为同一种状态：

- 团队演示期间，Theme setting `settings.yarn_internal_projects` 默认开启并展示所有具有标题的 Project；正式上线前关闭它，才恢复已核实公开作品的完整性检查。
- `已核实可公开` 只用于严格核实过的作品。至少需要有效的 `title`、单张 `cover`、`preparation`，以及来源与教程内容（`source_credit` 配合 `tutorial`、`tutorial_url` 或 `video_url`）。字段存在不等于内容已经通过实物、版权、材料适配或发布复核。

这套门槛不是权限系统。Metaobject、Product 或 File CDN 中不能存放秘密、凭证、私人资料或依赖“页面没有链接就看不到”的内容。

live Theme `189727637817` 当前已开启 `settings.yarn_internal_projects`，定制咨询发送仍关闭。菜单 `318482252089`（handle `issue-23`）当前用于团队演示；首页 `metaobject_list` 当前按“方形篮 → 花片双拼小袋｜内部示例”的顺序选择两条精选。这里记录的是后台配置，不代表商品编辑或咨询收件已经验收。

## 教程与商品编辑规则

`tutorial` 中的 Heading 3（标题 3）会在当前作品详情中成为可折叠的小节标题，后续正文作为该小节内容。首期不建立新的 Tutorial 实体；外部完整教程使用 `tutorial_url` 或 `video_url`，并在 `source_credit` 记录作者或来源。公开可访问的教程不自动获得转载、翻译、下载或嵌入许可。

作品内的商品引用只连接 Shopify Product / Variant 真值。价格、库存与购买能力继续由 Shopify 管理；作品记录不复制这些事实。不同设计的成品只能作为成品参考，不能暗示为教程同款。

作品到商品的 URL 可携带 `yarn_project`、`yarn_project_title`、`yarn_project_url`、`yarn_project_kind` 与可选 `yarn_component`。这些是当前浏览路径的导航提示，不新增持久实体或账号状态；访客可修改参数，不能用来证明商品适配或同款。商品页安全渲染来源并在切换 Variant 时保留参数；加购时写入条目属性，购物车通过可见 Project 解析回链。没有有效来源参数的普通商品页不显示来源。所有价格、可售性和最终规格仍来自 Shopify。

## 后台录入注意事项

### 中文名称与 Handle

新建 Entry 时直接使用中文名称，Shopify 自动生成的 Handle 可能因“只允许 ASCII”而保存失败。可靠顺序是：

1. 先输入 ASCII 标题并保存，让 Shopify 生成合法 Handle。
2. 再把标题改成中文并保存。
3. 保留已经生成的 ASCII Handle，不随中文标题改写。

### Rich text 标题

在 `tutorial` 编辑器中，用段落样式下拉菜单选择“标题 3”，输入小节标题；按 Enter 后切回正文继续录入。不要粘贴 HTML：Shopify Rich text 会把 HTML 标签保存为字面文字，而不是结构化标题或段落。

## Theme 与语言接线

当前 Theme 的作品库、详情与可见性实现位于：

- `sections/yarn-project-library.liquid`
- `sections/yarn-project-detail.liquid`
- `snippets/yarn-project-card.liquid`
- `snippets/yarn-project-visible.liquid`
- `snippets/yarn-project-products.liquid`
- `snippets/yarn-project-label.liquid`

仓库只保留日文（`ja.json`）、简体中文（`zh-CN.json`）与英文（`en.default.json`）三份前台语言文件及对应 `*.schema.json`，均包含相同的 `yarn_project` 键。根路径 `/` 为日文、`/zh` 为简体中文；不能因后台以中文为 primary 就推断根路径语言异常。英文已按用户本次授权发布，`/en` 可选择；每轮关键路径的实际验收以 Issue / PR 证据为准，不由字段已保存推定通过。

本文不推定成品与教程同款关系、语言发布状态、公开 URL 可用性或 production 发布结果。
