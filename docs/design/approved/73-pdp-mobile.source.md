# 商品详情手机方向与来源

- 关联：[Issue #73](https://github.com/hitoami/yarn-commerce-platform/issues/73)。用户在本会话确认「可以的」；手机实页的完整正文呈现已另在 [PR #98](https://github.com/hitoami/yarn-commerce-platform/pull/98) 批准并合并。
- 视觉稿的照片/摘要是构图示意。真实内容顺序以已确认实页及 [surface brief](../product-detail-surface.md) 为准：完整明细在内容物图片前，保留全部正文与 FAQ，不因图中短清单删减后台内容。
- 字体冲突已在会话提出：采用建议的现有文楷；不把生成稿的无衬线字体写成全站规范。
- 工具：内置 ImageGen。获批稿本地保存为 `docs/design/approved/73-pdp-mobile.png`，SHA-256：`a7cf56dd6b148799f54679af06d5d7088673a1a504ca529f2446e38fd96f3611`。
- 仓库为公开仓库。视觉稿含参考商品形象，图片通过本地 Git exclude 保留，不上传公开 diff；可发布资产须另取得授权或替换。此文件保存批准依据、实际输入及完整提示词，不包含源站截图。

## 实际输入

1. 当前本站中文 Kit PDP 的 390×844 截图：`.impeccable/73-pdp/current-mobile.png`。
2. [Woobles 企鹅编织包](https://thewoobles.com/products/penguin-crochet-kit) 的手机首屏、内容物、制作步骤截图：历史只读资料 `pdp-full-reference/mobile-01.png`、`mobile-04.png`、`mobile-07.png`。

以上四张图片均作为 `referenced_image_paths` 实际传入。源站仅供信息节奏参考，评价、销量与服务承诺不成为本站事实。

## 原始生成提示词

以下为生成调用原文；其中字体和短文案的实施边界以上方批准记录为准。

Use case: ui-mockup. Generate ONE high-fidelity mobile web product detail composition for MewoolMew, a yarn shop. Single continuous narrow page, aspect ratio approximately 1:3, no phone frame, no annotation outside page. Reference 1 is the current real site at 390px: preserve its cat/yarn logo, identity, real blue penguin product photographs, warm paper background and cream CTA. References 2-4 are information rhythm references ONLY: do not copy Woobles branding, teal palette, reviews, ratings or promises. Redesign for a calm compact purchase-first mobile layout with much clearer hierarchy. Header same existing logo and outline icons. A complete main product image in warm neutral rectangular photo well, modest height, 3 small thumbnail buttons underneath (not giant cards). Product title and terracotta price immediately after. A compact quantity stepper and full-width pale butter primary button, outlined secondary buy button. Lower page: contents photo alongside/above plain numbered list, three compact steps, two small facts panels, simple FAQ rows. No floating purchase bar. Keep page typography dark navy headings bold sans-serif, regular Chinese sans-serif body, no handwriting fonts; bg #fffefa, text #2f302f, heading #13202d, price #b93b20, CTA #f8e5a9, borders #dedbd5, links #a6472e. Corner radius photo 10px and pill buttons. Keep visual content based on actual photo, never invent material illustrations. All readable UI copy MUST be exact Simplified Chinese below except brand MewoolMew, numeric price and PDF; DO NOT use Japanese, English reviews, invented copy, discounts, testimonials, stars. Allowed exact text in reading order: 'MewoolMew', '皮埃尔企鹅 编织包', '¥4,500', '数量', '−', '1', '+', '添加到购物车', '立即购买', '编织包里有什么', '分步骤视频教程', '线材与预先起好的织片', '塑料眼睛、填充棉', '毛线针、记号扣', '企鹅钩织图解 PDF', '4 mm 钩针', '怎么开始', '1', '确认内容物', '2', '打开配套教程', '3', '跟着步骤钩织', '尺寸', '约 11.4 cm', '适合谁', '12 岁及以上', '常见问题', '完全没有手作经验，也能完成吗？', '分步骤教程怎么使用？', '建议几岁开始？'. Only these texts, no added badges or claims. Fit first purchase action in first ~800 logical px. Render accurate clear Simplified Chinese, spacious but economical lower sections. This is a composition study using internal demo material, not new commercial photography.
