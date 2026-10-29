# 毛线目录页

模式：Browse。让顾客按手感逛毛线，看清规格与价格后进入商品详情。与搜索的分工见 [搜索 surface brief](search-surface.md)：目录负责「逛」，搜索负责「找」，两者共用同一张毛线卡与商品详情。

## 当前批准范围（#85）

- 手机：用户 2026-10-17 在会话中确认按 Figma「hitoami 本地原型（#131）」[06 毛线集合页 · 390](https://www.figma.com/design/EBgAwtoSARIzOylhQFwkXY/hitoami?node-id=120-383) 实现。桌面稿「05 毛线集合页 · 1440」尚待确认，当前桌面实现只做 4 列的可用版。
- 顺序（平板 / 桌面）：面包屑 → 「共 N 款 · 价格含税」 → 集合标题与集合说明 → 一排分类胶囊 → 筛选 / 排序 / 款数 → 毛线卡（平板 3 列、桌面 4 列）→ 「已显示 N / 总数」与「显示更多」→ LINE 紧凑帮助条。
- 手机首屏（#209，用户 2026-10-29 批准每日提案 #1，[Figma 对比稿](https://www.figma.com/design/9wLXRfi42BhU4fFYmReJAn)）：第一行为标题 + 「共 N 款 · 价格含税」（muted）+ 右侧无边框排序；第二行为 44px 圆形筛选图标 + 横滑分类胶囊（视觉 36px、可点区域 44px、28px 小图）；随后直接是 2 列毛线卡，卡上不重复「毛线」小标签（保留色数；成品集合不变）。集合说明与面包屑移到「显示更多」之后。不再单独显示筛选排序行和重复的款数。卡片照片铺满 1:1 方框（`cover`），是 `DESIGN.md` 照片 `contain` 规则的例外，用户 2026-10-29 决定。
- 分类胶囊与首页圆图、搜索页分类是同一个 Search & Discovery 筛选（`filter.p.m.yarn.texture` / `yarn.use`），按 section 设置里的 `yarn_entry` handle 排序；没有商品的分类不显示，选中分类后不显示其他分类的款数。
- 「筛选」抽屉（手机从底部升起，桌面靠右）只列后台真实开启的筛选与运营设置的价格带；没有数据的筛选不显示，不留空壳。
- 商品卡沿用首页 `yarn-pick-card`；未定价显示「暂未开售」。集合还没有商品时显示「准备中」占位卡（DESIGN.md 成品区规则），不含商品名、价格或库存。
- 标题与说明来自 Shopify 集合本身，不在主题里另写营销标题；与视觉稿标题文字不同属于有意取舍。

## 实现

`sections/yarn-collection-browse.liquid`、`assets/yarn-collection-browse.css` / `.js`，模板 `templates/collection.json`。
