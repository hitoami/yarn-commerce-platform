# 内容队员上手：用 Shopify 维护作品、配件与库存

任务来源：[Issue #15](https://github.com/hitoami/yarn-commerce-platform/issues/15)。当前首页与作品体验已经由 [Issue #23](https://github.com/hitoami/yarn-commerce-platform/issues/23) 和 [PR #24](https://github.com/hitoami/yarn-commerce-platform/pull/24) 更新；本页按当前 `main` 说明日常入口，不保留旧版首页结构。

## 先理解四类内容

| 内容 | Shopify 入口 | 维护什么 |
| --- | --- | --- |
| 编织作品（Project） | [内容 → 元对象 → 编织作品](https://admin.shopify.com/store/tutaka-54/content/metaobjects/entries/yarn_project) | 作品名称、图片、难度、制作准备、教程、配件与成品关系 |
| 作品配件 | [内容 → 元对象 → 作品配件](https://admin.shopify.com/store/tutaka-54/content/metaobjects/entries/yarn_material) | 每项毛线、工具或其他材料的类型、图片、规格、供给方式、建议采购数量和具体 Variant |
| 商品与 Variant | [Products](https://admin.shopify.com/store/tutaka-54/products) | 商品标题、图片、规格、价格和可售配置 |
| 库存 | [Inventory](https://admin.shopify.com/store/tutaka-54/products/inventory) | 每个 Variant 在各地点的真实库存 |

Shopify Product、Variant、价格和库存始终是交易事实来源。作品和作品配件只引用商品，不复制价格或库存。一个作品可以只提供部分材料；需自备或资料待补的项目继续显示，不把部分供给称为完整材料包。

## 新增一件作品

1. 在“编织作品”中新建 Entry。第一次保存先使用简短 ASCII 名称，例如 `demo-pouch`，让 Shopify 生成合法 Handle。
2. 保存后把标题改为中文，保留已有 Handle。填写简介、封面、类别、难度、预计时间、制作准备和教程。
3. 内部演示内容把发布范围设为“仅内部原型”。未知的用量、适配、教程来源或供货情况明确写“待核实”，不要猜测。
4. 在“逐项配件清单”选择现有配件，或就地新建配件。按实际展示顺序排列。
5. 回到未发布 Theme 预览，检查作品卡、详情、材料清单和教程。只有完成内容与素材审核后，才把条目当作可公开作品。
6. 如需放入首页精选，在 Theme Editor 的“作品库与新手精选”中选择该 Project，并调整“新手精选及顺序”。

完整字段与编辑规则见[编织作品内容模型](project-content-model.md)和[作品团队演示操作指南](project-prototype-operator-guide.md)。

## 添加或替换一项配件

1. 打开“作品配件”，填写名称、规格与用途，并选择毛线、工具或其他材料。每个作品的毛线配件必须配图。
2. 选择供给方式：本店提供、需自行准备或信息待补充。
3. 本店提供的配件关联具体商品 Variant。缺少有效关联时不显示购买按钮；缺货状态直接读取 Shopify 库存。
4. 填写建议采购数量和必要说明。采购件数不等于作品实际耗用量；未经核实的数量必须标记待核实。
5. 如果一条配件被多个作品引用，修改会同步影响所有引用它的作品。规格或用途不同就新建一条，不覆盖原记录。

顾客逐项选择购买，工具不会自动加入购物车。替换关联 Variant 后，需要重新检查商品页、库存状态和购物车中的作品来源信息。

## 补货和盘点

- 日常库存从 Inventory 入口维护，以 Variant 为一行。先按商品、SKU 或地点筛选，再批量编辑需要修改的行。
- 操作前先确认是在“增加本次到货数量”还是“把现有数量改成盘点结果”；两者含义不同，不能混用。
- 同一 Variant 被多个作品引用时只改这一处，作品页会读取新的可售状态。
- 不在 Project、配件说明或 Theme 设置中手写“有货”“缺货”或库存数字。
- 大批量导入前先导出备份，并用少量行验证列、地点和数量含义；不要用不完整的商品文件覆盖 Variant 结构。

## 中文、日文和英文

1. 中文主内容在 Project、作品配件或 Product 本身维护。
2. 在 [Translate & Adapt](https://admin.shopify.com/store/tutaka-54/apps/translate-and-adapt) 维护日文和英文叙述字段。
3. Project 的类别、难度、发布范围，以及配件的供给方式是稳定枚举，不翻译成另一套内部值。
4. 输入后移出字段并保存，再重新打开确认内容仍在。语言已发布只表示路径可访问，不代表所有字段已经翻译或完成前台验收。

## Inspiration 的当前边界

旧的 Inspiration Entry 仍保留在 [Inspiration 后台](https://admin.shopify.com/store/tutaka-54/content/metaobjects/entries/inspiration)，但当前 `main` 首页使用 `yarn_project` 作品库，不再显示 PR #16 旧版的两张 Inspiration 商品卡。

只有图片、生活场景或推荐材料、没有完整材料要求和主要教程的内容继续叫 Inspiration。不要为了进入当前作品库把它改称 Project；它达到公开 Project 标准后再按 Project 内容模型录入。Inspiration 未来展示位置尚未确认。

## 每次保存后的最小检查

- 从日文 `/`、简体中文 `/zh`、英文 `/en` 分别打开受影响页面；未维护的语言如实记录。
- 桌面和手机各检查一次作品卡、详情、配件顺序、商品链接和库存状态。
- 对本店提供的配件，检查指定 Variant、加入购物车、数量修改和返回作品入口；停在 Checkout 之前，不提交订单或付款。
- Draft、内部演示、需自备、资料待补和真实缺货分别表达，不互相替代。
- 未授权素材只用于受保护的内部原型；公开展示前必须替换或确认授权。
- 后台保存后前台可能有短暂延迟：先确认后台最终保存状态，再重新加载前台核对；不要通过改模板「修复」尚未生效的数据。
- Draft Product 的官方预览链接是当时内容的快照，编辑后要回到 Product 页面重新点预览；带预览 key 的链接不写进公开仓库。新建 Draft 未填价格时前台显示 `¥0`，这是不可售草稿，不是免费商品。

Theme、语言和后台内容是不同层。Theme 代码更新不会自动复制 Metaobject 定义、Entry、翻译或 Theme Editor 选择到另一家店铺；部署前逐项核对目标店铺和未发布 Theme。
