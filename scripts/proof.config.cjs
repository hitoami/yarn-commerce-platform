// npm run proof 的检查范围。改动页面或商品下架时更新这里。

module.exports = {
  baseUrl: 'http://127.0.0.1:9292',

  // prefix 是本地 dev 的语言路径，livePrefix 是线上 hitoami.com 的（--live 时使用）。
  // browserLocale 写进浏览器 context，避免继承本机语言后被店铺的语言重定向带走。
  // 本地 theme dev 代理（2026-10-17 核对，#154）：中文在 /、日文 /ja、英文 /en；线上日文为域名默认语言在 /，中文 /zh。
  // 代理下 /ja/ 只能 GET 页面，POST 会 404，所以 proof 的购物车请求走店铺根路径（见 proof.cjs cartAjaxUrl）。
  locales: [
    { key: 'ja', prefix: '/ja', livePrefix: '', lang: 'ja', browserLocale: 'ja-JP' },
    { key: 'zh', prefix: '', livePrefix: '/zh', lang: 'zh', browserLocale: 'zh-CN' },
    { key: 'en', prefix: '/en', livePrefix: '/en', lang: 'en', browserLocale: 'en-US' },
  ],

  viewports: [
    { key: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    { key: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  ],

  pages: [
    { key: 'home', path: '/', requiredContent: [
      { selector: '.hitoami-story__media :is(img, video)', minimum: 1, label: '品牌介绍媒体' },
      { selector: '.yx-picks__grid .yx-product-card', minimum: 4, label: '首页真实毛线商品卡' },
    ] },
    { key: 'yarn-collection', path: '/collections/yarn', requiredContent: [
      { selector: '.yfb__trigger', minimum: 4, label: '筛选下拉胶囊' },
      { selector: '.ycb-grid .yx-product-card', minimum: 4, label: '目录真实毛线商品卡' },
    ], flows: [
      // #394：统一单行胶囊下拉筛选条，展开「粗细」，选「轻柔细线」，选中的显示为可清除标签。
      { key: 'refine', label: '细筛', steps: [
        { click: '[data-yfb-menu="thick"] > summary' },
        { waitFor: '[data-yfb-menu="thick"][open] [data-ycb-opt="thick:fine"]' },
        { click: '[data-yfb-menu="thick"] [data-ycb-opt="thick:fine"]' },
        { waitFor: '[data-ycb-opt="thick:fine"][aria-pressed="true"]' },
        { expect: '.yfb__tag', minimum: 1, label: '可清除的粗细标签' },
        { expect: '.ycb-grid .yx-product-card', minimum: 1, label: '选「轻柔细线」后仍有商品' },
        { expect: '[data-ycb-grid] > li[hidden]', present: true, minimum: 1, label: '其他粗细的商品被筛掉' },
        { noOverflow: true },
        { shot: true },
      ] },
    ] },
    // 导航 / 首页带入口进来：标题换成入口，圆图圈出当前分类，只显示符合的毛线。
    { key: 'yarn-entry', path: '/collections/yarn?ycb_color=variegated', requiredContent: [
      { selector: '.ycb-circle', minimum: 2, label: '同组分类圆图' },
    ], flows: [
      { key: 'entry-variegated', label: '入口 · 段染渐变', steps: [
        { waitFor: '[data-ycb-circle="color:variegated"].is-current' },
        { expect: '.ycb-grid .yx-product-card', minimum: 1, label: '段染渐变的毛线' },
        { expect: '[data-ycb-grid] > li[hidden]', present: true, minimum: 1, label: '其他毛线被筛掉' },
        { noOverflow: true },
        { shot: true },
      ] },
    ] },
    // #284 / #394：新手推荐入口只列 beginner-picks 集合的毛线，卡片带「新手友好」徽章。
    { key: 'yarn-beginner', path: '/collections/yarn?ycb_beginner=1', flows: [
      { key: 'beginner', label: '新手推荐', steps: [
        { waitFor: '.ycb-grid .yx-product-card__badge' },
        { expect: '.ycb-grid .yx-product-card', minimum: 1, label: '新手推荐的毛线' },
        { expect: '[data-ycb-grid] > li[hidden]', present: true, minimum: 1, label: '其他毛线被筛掉' },
        { shot: true },
      ] },
    ] },
    { key: 'yarn-filter-empty', path: '/collections/yarn?ycb_works=bag&ycb_thick=fine&filter.v.availability=1', flows: [
      { key: 'empty', label: '组合筛选无结果', steps: [
        { waitFor: '[data-ycb-none]:not([hidden])' },
        { expect: '.ycb-more__button', minimum: 0, maximum: 0, label: '空结果不挂「显示更多」' },
        { shot: true },
      ] },
    ] },
    // #131：演示商品已删除，编织包不再销售；成品详情等真实成品上架后再加回。
    // #131 / #152：手工成品上架前集合为空，yarn-collection-browse 显示三语「准备中」说明而不是「0/0 件」。
    { key: 'finished-collection', path: '/collections/finished-goods', requiredContent: [
      { selector: '.ycb-preparing__text', minimum: 1, label: '手工成品准备中说明' },
    ] },
    { key: 'cart-recovery', path: '/products/mvp-yarn-12', openCart: true, flows: [
      { key: 'network-recovery', label: '明确拒绝可重试、结果不明先核对', steps: [
        { run: require('./proof-network.cjs').cartRecovery }, { noOverflow: true }, { shot: true },
      ] },
    ] },
    { key: 'yarn-pdp', path: '/products/mvp-yarn-18' },
    // #177：缺货毛线（询问到货 + 同类毛线出口）与材料包的可购买 / 暂不可买两种购买区。
    // #245：缺货商品会变，运行时从毛线集合里找一款已定价、全部色号缺货的；找不到就跳过这一项。
    { key: 'yarn-pdp-sold-out', path: null, find: 'sold-out-yarn', requiredContent: [
      { selector: '.yp-status--sold-out', minimum: 1, label: '缺货出口' },
    ] },
    { key: 'kits', path: '/pages/kits', requiredContent: [
      { selector: '.yx-project-pick', minimum: 1, label: '材料包卡' },
    ] },
    { key: 'kit-buyable', path: '/pages/projects/kit-xuebao-fringe-scarf', requiredContent: [
      { selector: '.yk-add-all[data-kit-add]', minimum: 1, label: '材料包主按钮' },
    ] },
    // #199：真实页面只断言有效购买状态；缺货/未定价由真实 Liquid + 隔离数据固定覆盖。
    { key: 'kit-current', path: '/pages/projects/kit-tyndall-kids-scarf', requiredContent: [
      { selector: '.yk-blocked, [data-kit-add]', minimum: 1, label: '材料包当前购买状态' },
    ] },
    { key: 'fixture-yarn-sold-out', fixture: 'yarn-sold-out', requiredContent: [
      { selector: '.yp-status--sold-out', minimum: 1, label: '隔离样例：缺货说明' },
      { selector: '.yp-status__ask, .yp-status__link', minimum: 2, label: '联系与同类商品出口' },
    ] },
    { key: 'fixture-kit-blocked', fixture: 'kit-blocked', requiredContent: [
      { selector: '.yk-blocked', minimum: 1, label: '隔离样例：材料包不可买说明' },
    ] },
    { key: 'fixture-kit-unpriced', fixture: 'kit-unpriced', requiredContent: [
      { selector: '.yk-blocked', minimum: 1, label: '隔离样例：未定价不可购买' },
    ] },
    { key: 'fixture-kit-buyable', fixture: 'kit-buyable', requiredContent: [
      { selector: '[data-kit-add="all"]', minimum: 1, label: '隔离样例：全部可买' },
    ] },
    { key: 'fixture-kit-partial', fixture: 'kit-partial', requiredContent: [
      { selector: '[data-kit-add="available"]', minimum: 1, label: '隔离样例：只加入可买的毛线' },
    ] },
    // 本季主推专题页：后台页面已建（handle season）；page.season 上线正式主题、后台改选该模板前，用 ?view 预览。
    { key: 'season', path: '/pages/season?view=season', requiredContent: [
      { selector: '.yx-season-page__art img', minimum: 1, label: '本季专题封面' },
      { selector: '.yx-season-page__yarn', minimum: 7, label: '本季专题 7 款毛线' },
      { selector: '.yx-season-page__toc-thumb img', minimum: 7, label: '本季专题目录小图' },
    ] },
    { key: 'cart-drawer', path: '/products/mvp-yarn-12', openCart: true, flows: [
      { key: 'choose-options', label: '凑单选择规格与原规格加购', steps: [
        { run: require('./proof-cart.cjs').cartChoice }, { noOverflow: true }, { shot: true },
      ] },
    ] },
    // #149：搜索按毛线 / 材料包 / 手工成品分组；「段染」覆盖毛线与材料包两组，另看一次无结果状态。
    { key: 'search', path: '/search?q=%E6%AE%B5%E6%9F%93' },
    { key: 'search-empty', path: '/search?q=zzqx' },
    // #347：同一搜索状态通过真实语言入口到三种语言，不依赖商品标题译文。
    { key: 'search-language', path: '/search?q=%E6%AE%B5%E6%9F%93&group=yarn', flows:
      ['ja', 'zh-CN', 'en'].map(language => ({ key: `language-${language}`, label: `切换语言 ${language}`, steps: [
        { click: '#YarnLang > summary:visible, #FooterLanguageForm .localization-form__select:visible' },
        { click: `.yarn-lang__option[hreflang="${language}"]:visible, #FooterLanguageForm a[hreflang="${language}"]:visible` },
        { waitFor: '[data-search-tab="yarn"][aria-pressed="true"]' },
        { expect: 'input[name="q"][value="段染"]', minimum: 1, label: '搜索词保留' },
        { noOverflow: true }, { shot: true },
      ] }))
    },
    { key: 'commercial-disclosure', path: '/pages/commercial-disclosure' },
    { key: 'returns-exchanges', path: '/pages/returns-exchanges' },
    { key: 'shipping', path: '/pages/shipping' },
    { key: 'faq', path: '/pages/faq' },
    { key: 'about', path: '/pages/about' },
    { key: 'contact', path: '/pages/contact' },
  ],

  // Shopify 内容层：商品、集合、作品、菜单等在后台维护的文字。混语言只报告，不判失败（归 #60 / #68）。
  contentSelectors: [
    '.card__heading', '.card__information', '.card__badge',
    '.yp-card__title', '.yp-card__summary', '.yp-card__price', '.yp-card__price-from',
    '.yx-product-card__title', '.yx-product-card__spec', '.yx-product-card__price', '.yx-product-card__reason',
    '.yx-content-card__title', '.yx-content-card__text',
    '.product__title', '.product__description', '.product__text', '.rte', '.price', '.yp-kitstory',
    '.product-form__input legend', '.product-form__input label', '.product-form__input option',
    '.cart-item__name', '.cart-item__details', '.cart-notification-product',
    '.ycb-head__title', '.ycb-head__intro', '.ycb-circle__name',
    '.header__menu-item', '.menu-drawer__menu-item', '.list-menu__item', '.footer-block__details-content',
    '.predictive-search', '.yx-project-pick__title', '.yx-project-pick__yarn', '.yx-season-page__toc', '.yx-season-page__name', '.yx-season-page__facts', '.yx-season-page__note', '.yarn-favorite', '[data-proof-content]',
  ],

  // 有意显示多种语言或品牌名的区域：语言切换器、支付方式图标。
  ignoreSelectors: ['localization-form', '.disclosure__list', '.localization-selector', '.list-payment'],
};
