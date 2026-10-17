# hitoami 首页素材来源

## 三张轮播与桌面修正

用户评审要求默认顺序毛线 → 编织材料包 → 成品。通过内置 ImageGen 新绘制三个横幅与成品竖图，沿用本轮小屋参考。工具实际输出横图为 1672×941（提示词请求更大尺寸但未得到），保留原生尺寸、WebP quality 92；CSS 限制内置横图不超过原生尺寸，不做插值放大冒充高清。成品竖图输出 1024×1536，压到 900px；既有毛线/Kit 竖图继续用于手机。

旧 `hitoami-room-wide.webp` 被 `hitoami-kit-wide.webp` 替换；旧来源记录保留为迭代出处。

### hitoami-yarn-wide.webp

来源：`exec-5978c13b-7765-4a3c-a411-1916e49e9380.png`。

```text
Create a NEW high-resolution 3072x1728 landscape photographic website hero for hitoami, referencing the attached cottage's architectural style and exact subdued palette. This is a production raster background, not a screenshot. Prioritize crisp yarn fibers, fine stitches and natural wood grain in the featured products, no soft focus on products, neutral diffuse daylight. Layout: leftmost 55% is a nearly empty smooth cream plaster wall with very subtle soft daylight; no foliage, vases, patterned objects, hard shadows, shelves or windows in this text safe zone from x10%-52%, y12%-70%. At rightmost 45% and bottom a pale oak craft table holds a generous arrangement of cream, mist blue, oatmeal, pale sage skeins and cakes, one small knit sample and a crochet hook. One tall light wooden yarn shelving unit near extreme right. Keep top14% quiet cream for navigation. Viewer feels inside a calm airy handcrafted cottage. Delicate plants only extreme right or lower corners, not left copy zone. Match reference neutral cream muted colors, no orange, no golden color cast, no sepia. NO text, typography, logos, UI, buttons, frames, watermarks, cats or animals. Full scene to image edges. Output at native 3072x1728 or highest available landscape resolution; do not use a portrait crop.
```

### hitoami-kit-wide.webp

来源：`exec-9a24e35b-a479-49da-be8a-b2d7f9df20bb.png`。

```text
Create a NEW high-resolution 3072x1728 landscape photographic background for hitoami's craft cottage website. Attached image is style and room reference; preserve its cream/oat/mistblue/sage neutral subdued daylight and pale oak furniture. Improve composition for a desktop headline: keep left55% mostly completely bare softly lit ivory wall, with calm space from x10%-52% y12%-70%; no plants, window mullions, hard shadows or patterned items behind future text. Open kraft CROCHET MATERIALS KIT on pale oak table in right45%/lowerhalf: balls of cream, pale blue and sage yarn, crochet hook, printed sheet with tiny crochet symbols and a delicate flower diagram only, never readable words. Lid open. Crisp real yarn fibers, kraft paper texture, fine stitches and wood grain. A cream crocheted swatch and small ceramic cup near right corner, quiet shelves at extreme right. Top14% quiet cream for nav. Immersive natural room depth, photoreal editorial, no artificial blur on featured kit. NO cats/animals, text, logo, letters, labels, UI, buttons, frames or watermark. Native 3072x1728 or highest landscape resolution, not a stretched portrait.
```

### hitoami-finished-wide.webp

来源：`exec-5d8f78e1-7e5d-41d1-a49d-4f3df566274c.png`。

```text
Create high-resolution 3072x1728 LANDSCAPE photoreal website background for the FINISHED HANDMADE GOODS scene of hitoami cottage. Attached image is room/palette reference only. Same cream plaster walls, pale oak wood, neutral diffuse daylight, muted ivory/oatmeal/mistblue/sage. Left55% is bare light cream wall with exceptionally calm empty copy space x10%-52%, y12%-70%; no leafy plants, shelves, window mullions or hard shadows there. Top14% also quiet for header. Main scene lower-right45%: inviting pale oak armchair with a beautifully finished ivory knitted cardigan draped naturally over backrest and a cream/muted sage crochet tote bag on its seat, a neatly folded small blue-gray knit throw on an adjacent low stool. Finished stitch textures sharp and richly detailed, believable knit structures. Sparse tiny flowers and plant only at extreme right. A cozy quiet corner of same room, furnishings realistic and balanced. No yarn skeins or kit boxes as featured objects. NO cats/animals, words, logos, UI, buttons, watermarks or frames. High native resolution crisp product photography, no blurry product texture, no warm orange cast. Native 3072x1728 or highest available landscape resolution.
```

### hitoami-finished-mobile.webp

来源：`exec-518f85b8-a387-4145-bf14-2db2dc4702dc.png`。

```text
Create 1024x1536 PORTRAIT clean photographic background for the mobile FINISHED HANDMADE GOODS scene of hitoami cottage. Style/palette match attached cottage photo: pale oak, bright ivory plaster, neutral soft daylight, cream/oatmeal/mistblue/softsage; muted low saturation, no yellow-orange cast. TOP45% almost empty plain light cream plaster wall with subtle pale curtain at very far left, no foliage or shelves behind future headline. LOWER55% cozy pale oak armchair with beautifully finished ivory knit cardigan draped over its backrest, cream-and-muted-sage crocheted tote on seat, small blue-gray folded knit throw on low stool at right. Crisp intricate stitches and tactile fibers, beautiful realistic finished handmade objects. Sparse plant extreme right only, pale room floor below, immersive cottage depth. These are mood objects without brand labels or product claims. No cats/animals, no kit box, no hero yarn balls. Absolutely NO text, logo, UI, buttons, icons, navigation, frame or watermark. Full photo to edges; photoreal, featured products sharp.
```


本轮素材用于品牌氛围与分类导航，不代表真实可售商品或套件组成。用户提供的 `hitoami-logo-kit-v1.zip` 内 02 平面字标，曾用于 `hitoami-wordmark.webp`；2026-10-16 起由猫抱毛线球字标 `hitoami-logo.webp` 取代（#140）。

`hitoami-cat-atlas.webp` 和 `hitoami-yarn-ball.svg` 复用本会话已批准的 cat-nav 动画包，来源 `cat-nav/app/public/assets/cat-atlas.png`、`ball.svg`；精灵为 3×3 九帧。仅转码。

三张手绘图标分别源于本会话 ImageGen：长绞线与织片 `exec-9194a0b7-8ff6-4cb7-b719-266bacf5be9f.png`；材料盒 `exec-dbce9dd3-5b36-4c6d-8263-81232762c4e0.png`；开衫 `exec-23a03b1f-0baa-40dc-b553-b6b8dcacee61.png`。参考为用户给定的低饱和配色；图标主体由 ImageGen 新绘制，分别缩到 360px。不是图标字体或对商品照片的伪造。

## 手机 Hero

文件：`assets/hitoami-room-mobile.webp`。ImageGen 原图 `exec-7973529e-d75d-48ec-b84f-fb6261175da5.png`，以用户批准的手机视觉为构图参考，900px WebP。

```text
Produce the CLEAN PHOTOGRAPHIC BACKGROUND ASSET for approved hitoami mobile homepage, based on supplied finalized mockup. Output portrait 1024x1536. Remove ALL UI and typography, logos, buttons, pagination, cat, yarn navigation, category icons and cream footer. Entire image only ONE airy realistic craft cottage photograph. Composition for web text overlay: TOP45% predominantly calm ivory plaster wall with soft sheer window curtain left, very faint sparse plant at extreme right, no objects/high contrast behind title. At LOWER55% a pale oak table with large open kraft crochet kit, lid open with wordless delicate flower crochet drawing, balls of mistblue/ivory/sage yarn, crochet hook, cream sample swatch, small ceramic cup, tiny daisies. Hero kit at horizontal55% vertical65%, table edge75%, room floor softly visible below. Pale wood chair with cream crochet tote at far right, blurred shelves and sage leaves around far edges. Same gentle neutral daylight, muted palette cream/oat/mistblue/sage, no vivid orange or goldenyellow, no dark clutter. Preserve immersion and photograph realism, tactile wool detail. Do not bake text into photo, do not include any cat figurine, cat portrait, real cat or graphic line. No border, no watermark, no labels, no brand marks, no letters anywhere. Top wall remains bright for legible dark heading. This is production website scene imagery, not a UI screenshot.
```

## 桌面窗边光影背景

文件：`assets/hitoami-window-light.webp`。ImageGen 原图 `exec-a9c54af4-a4e2-4e74-ab39-27dec2ec3c0d.png`，参考已批准成品手机照片的窗帘与日光氛围；实际尺寸 1672×941，原尺寸转 WebP（quality 92），不放大。作为内置三类桌面场景共用的装饰底图；运营上传的活动图不叠加该底图。原产品、价格和库存仍由 Shopify 提供。

```text
Use case: photorealistic-natural. Asset type: reusable decorative desktop website backdrop for hitoami handmade knitting shop. Use the reference photo only for the warm soft daylight, thin linen curtain, cream plaster, floor texture and muted colors; DO NOT include its furniture, bags, garments or yarn. Generate one high quality wide landscape interior photograph, 16:9. Leftmost 15 percent has a tall bright window and translucent ivory linen curtain in natural folds; soft recognizable window-frame sunlight and delicate leafy shadows fall across the left and middle warm ivory plaster wall. Pale natural wood floor along bottom 15 percent. The central and right portions are a softly lit plain cream wall and light floor, quiet enough for overlaying dark heading text and another product scene; rightmost quarter fades naturally toward a flat warm paper cream wall. The curtain and window must be clearly visible, not blurred or washed out. Soft low saturation, neutral warm daylight, realistic tactile texture, coherent perspective. No furniture, products, yarn, cats, people, logos, text, lettering, icons, UI or watermarks. This is a photograph background only, no readable text. Match the supplied mobile room atmosphere. Aim 3072x1728.
```

## 宽屏背景

文件：`assets/hitoami-room-wide.webp`。ImageGen 原图 `exec-5da36862-a879-4a63-b49b-c36c6d12acec.png`，1600px WebP。

```text
Create clean LANDSCAPE1440x900 photographic background for hitoami cottage homepage using attached portrait source's SAME room, SAME materials/colors. NO UI, no logo/text/buttons/navigation/cat. Pan camera wider: sheer window and yarn cabinet on left, warm pale plaster wall upperleft/center for later HTML heading, open kraft crochet KIT with ivory/mistblue/sage yarn and crochet diagram on pale oak table lowercenter/right, cream crochet tote hanging on chair right, small daisies/ceramic cup and sparse plants at edges. Light NEUTRAL daylight, subdued cream/oat/sage/mistblue, no bright orange/yellowgold, no dark clutter. Photo realistic tactile yarn. TOP40% keep calm plaster wall with safe empty space for heading, table and kit occupy lowerhalf. No words on books or sheets, diagrams only. No cat figurine or artwork or realcat. Entire frame photography to edges, no decorativewave/footer. A wide responsive alternate crop of same approved mobile room.
```

## 毛线活动背景

文件：`assets/hitoami-yarn-mobile.webp`。ImageGen 原图 `exec-4065b120-7d25-4023-9a8c-de7861466031.png`，900px WebP。

```text
Create a clean portrait1024x1536 photograph for second slide of same hitoami cottage homepage. Match attached clean room photograph's pale wood, neutral soft window light, ivory walls, mistblue/sage/oatmeal yarn, quiet low saturation. Change featured subject from kit to YARN: lowerhalf foreground pale oak table has a beautiful generous group of elongated skeins and yarn cakes in cream, dusty blue, soft sage and muted oatmeal, small knit swatch and simple crochet hook nearby, ceramic cup and tiny daisies. Background wood cubbies of same muted yarn, plants edges. TOP45% empty calm light ivory plaster/window curtain for later HTML title; no items blocking headline area. Roomdepth coherent with reference. No open kit box as main subject, no cat, no logo/words/UI/buttons/frames/navigation, no orange/golden cast, no book writing or watermark. Photographic tactile wool; imagery is an editorial atmosphere, no product packaging labels or commercial claims.
```
