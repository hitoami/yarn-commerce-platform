# 首页 1a 视觉稿来源（#126）

- 来源：Claude Design 项目「Hitoami Home Redesign」，文件 `Hitoami Home Redesign.dc.html` 的 1a（手机 390 / 桌面 1440）：https://claude.ai/design/p/e7ab8de9-d0ee-4341-9037-7fbc5e78ca85?file=Hitoami+Home+Redesign.dc.html
- 批准：用户 2026-10-03 要求按此稿实现，并指示首页小猫动画（导览条挂线与小猫）保持不变。
- 稿管什么：模块顺序、区块形态（首屏圆点胶囊、挑毛线两段切换 + 两行横滑方卡、作品 / 商品 2 列与 4 列、浅黄帮助条）。稿中的毛线分类名、说明、商品与价格是示意数据，实现取 Shopify 真实数据。
- 与稿不同之处：
  - 导览条保留现有挂线与小猫，不改成稿中的虚线方块。
  - 挑毛线的分段按店铺已有入口字段命名为「按质感 / 按用途」（#117 数据），不是稿中的「按材质 / 按粗细」。
  - 颜色映射到 `design/tokens/colors.json` 已有角色：稿中焦糖棕按钮 → `home-action`，驼色底 → `bg-sunken`，奶油色带 → `bg-band`。
  - 页眉菜单字号、页脚为全站共享组件，本次未按稿改动。
