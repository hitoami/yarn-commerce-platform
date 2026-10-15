# 首页方案 C 视觉稿

- 批准日期：2026-09-26。依据：用户在会话中看过 1440 / 390 视觉稿后回复「批准，用图标和轮播」；⑥ 按用户提供的参考改为圆形照片卡后一并批准。范围与验收见 [Issue #93](https://github.com/mewool-yarn/yarn-commerce-platform/issues/93)。
- 文件：`home-scheme-c-1440.webp`（桌面，毛线下拉展开）、`home-scheme-c-390.webp`（手机）。
- 构图合同：首屏（2026-09-28 起改用线上手作小屋整幅轮播，与导览条解耦，见下）→ 导览条毛线挂饰四个品类入口（沿用图标，不做图片卡）+ 新手入口 → 优惠 → 按作品图选 → 新手友好编织包 → 按材质 / 粗细（虚线圆环照片卡）→ 店铺精选成品 → LINE 帮助条；导航为 毛线 ▾ ｜编织包｜成品｜工具｜新手入门｜SALE。
- 制作方式：在本地未发布 Theme 首页上用脚本改写 DOM 后截图，页头、首屏、商品卡与页脚为真实样式；右上角编号只用于评审。
- 存档版把商品与作品照片换成空白占位：评审时用的是来源站参考图（带水印，未授权），不进入仓库。存档图里的首屏是当时的露边轮播，已被下方的手作小屋轮播替换。
- 稿中的划线价、折扣比例、新手理由、作品购买标签、粗细取值与参考针号都是示例：店内暂无这些数据。实现只读取真实的划线价、商品字段与作品关联，没有数据的模块整块不显示。
- 导览条小猫（2026-09-28 用户要求换成线上小猫）：`assets/yarn-guide-cat.webp` 由线上首页的 `hitoami-cat-atlas.webp`（来源记录见 main 的 `docs/design/approved/110-home-assets.md`）重新切帧而成——原图 3×3 格子切得不齐，按每帧实际轮廓裁出并让脚底对齐同一基线，横排 9 帧，未改画面。
- 首屏（2026-09-28 用户要求「首屏也用现在网站的，但是和导航栏解耦」）：`sections/hitoami-hero.liquid` 取自线上首页 #110 / #111 的轮播部分，拆成独立 section；切换幻灯片不影响导览条，导览条也不控制幻灯片。页头不叠在图上。内置场景图 `hitoami-{yarn,kit,finished}-wide.webp`、`hitoami-{yarn,finished}-mobile.webp`、`hitoami-room-mobile.webp`、`hitoami-window-light.webp` 与 main 同一文件，生成提示词见 main 的 `docs/design/approved/110-home-assets.md`。原露边轮播与用户提供的三张 AI 照片随之移除（见 git 历史）。
- 页头、首屏波浪边与晾衣绳挂线（2026-09-28 用户要求页头和首屏底边「修改的一样」，并提出挂线两端挂在上一个区域底部）：页头按线上改为 Logo 居左、首页透明叠在首屏上，Logo 换成线上同一张 `hitoami-wordmark.webp`（来源见 main 的 `110-home-assets.md`），品牌名 BRAND 占位改为 hitoami；首屏底边加线上同款波浪；导览条挂线两端钉在首屏底边。
