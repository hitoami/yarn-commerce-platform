# 手机搜索获批视觉方向

- 2026-09-09 用户选择手机方案 3，并在分类、账号收藏、简介与价格字重修订后表示喜欢该结果。
- 适用范围：独立搜索的作品图文横行、商品两列图卡、分类与收藏入口；后续简单筛选行为以 surface brief 为准。
- 2026-10-16（#131）起，图中的手绘分类条与「有成品 / 可买材料 / 仅灵感」能力标签已被「毛线 / 材料包 / 手工成品」分组取代；版式其余部分仍适用，以 [surface brief](../search-surface.md) 为准。
- 文件：[手机搜索方向](search-mobile-list.png)。生成工具：内置 Image Gen。
- 图片中的商品、价格和简介为构图演示，实际内容从 Shopify 读取；不作为上架事实。

## 生成提示词

Use case: ui-mockup. EDIT the selected mobile search design (reference 1) faithfully. This is ONE refined design, not new alternatives. Reference 2 is the user's actual homepage illustrated category row; use its visual vocabulary and exactly its category labels. Reference 3 is product photography. Preserve reference 1's warm white identity, compact standalone search page, two horizontal work rows followed by two-column product tiles. Improve typographic finesse; existing overly bold headings and enormous orange prices MUST become smaller and calmer.
Target: mobile-first SHOPIFY WEBSITE, logical 390 x 844 px (portrait 390:844 ratio, high-resolution raster allowed). Draw app content only, NO phone frame, status bar, notch, browser chrome, device shadow, bottom home bar. Use natural layout with readable text and no squeezed fonts. If needed show page content down to both product prices; avoid wasted vertical gaps so comfortably fits.
HEADER: about44px tall, back chevron at left, centered "搜索" in18px medium, right text link "收藏" in14px. This is separate search results page, NEVER highlight 首页; no homepage nav or app bottom nav. Collection entry is for signed-in account saved works and products.
SEARCH: preserve elegant Airbnb-inspired white capsule, 58px tall, 18px gutters, thin warm-gray border and extremely subtle shadow, magnifier at left, bold primary query "篮子", secondary "作品 · 商品" in muted gray, right small clear X circle. No big separate orange button.
NEW CATEGORY STRIP below search: one horizontally scrollable row of five small illustrated categories "全部", "包袋", "围巾", "家居", "玩偶". 40px soft handdrawn illustration + 13px label underneath, borrowing attached homepage drawings: flower tote, green scarf, cushion with houseplant, rabbit doll. For 全部 use small matching assorted-yarn drawing. "家居" is selected with a THIN terracotta underline, other text muted. Category area about82px tall, subtle bottom rule; no pills around each category. Selected home category is compatible with basket query and both result groups. Do not label category section with extra title.
WORKS: heading "相关作品" 20px medium, not heavy bold. Two image-left/text-right editorial rows. Image around114x112px, gap14px, text area~222px. Natural blue chunky crochet basket photography from ref 1. First row:
title "交叉针收纳篮" 16px semibold.
description "收好钥匙和桌面小物" 14px muted, wraps naturally if needed.
small understated capability line "有成品 · 可买材料" 12-13px, tiny subtle warm accent, NOT giant colored pills.
Second row:
title "窗边篮子灵感"
description "给窗边添一点柔软"
capability "仅灵感".
Do not add difficulty or completion time because not verified.
Each work image has a small white circular heart-outline control at top right; realistic 40px tap target with ~20px heart graphic, dark outline readable against photo. No counts or stars. Hearts signify favorites, not likes. Keep plenty of spacing within rows; not boxed cards.
PRODUCTS: fine section separation and heading "相关商品" 20px medium. Two equal image-first columns with square-ish photos around166x140px, left basket, right actual blue chenille skeins. Each photo has the SAME white round outline-heart button at top right.
Left title "交叉针收纳篮成品" 15px medium, wrap max2 lines; muted short line "成品 · 桌面收纳" 13px; price "¥3,680" in DARK CHARCOAL 17px medium weight.
Right title "篮子用雪尼尔毛线" 15px medium, wrap max2 lines; muted short line "毛线 · 篮子用线" 13px; price "¥1,280" in DARK CHARCOAL 17px medium weight.
Never huge prices, orange prices, fabricated discount, unit or price-start labels. Keep product titles same font family as other UI, no thick brush-like Chinese glyphs. Quiet refined product typography like a tasteful commerce site. Small "演示内容" near bottom. All copy is mock design content, no reviews/ratings/social counts whatsoever.
Palette: #fffefa, #2f302f ink, #686762 muted, #e4dfd7 line, #a6472e restrained category accent. Photos blue, illustrations home-screenshot soft olive green, butter and cream. Same design world as reference1. At most2fontfamilies; prefer Noto Sans SC regular and medium. Separation by whitespace and fine rules, NOT extra panels.
EXACT SIMPLIFIED CHINESE VISIBLE COPY ALLOWLIST: 搜索; 收藏; 篮子; 作品 · 商品; 全部; 包袋; 围巾; 家居; 玩偶; 相关作品; 交叉针收纳篮; 收好钥匙和桌面小物; 有成品 · 可买材料; 窗边篮子灵感; 给窗边添一点柔软; 仅灵感; 相关商品; 交叉针收纳篮成品; 成品 · 桌面收纳; ¥3,680; 篮子用雪尼尔毛线; 毛线 · 篮子用线; ¥1,280; 演示内容.
Use exact wording only. No Japanese, English, gibberish, fabricated brand names, words on book spines, or additional copy. No annotations, version numbers, titles outside UI, multiple screens, or comparison board.
