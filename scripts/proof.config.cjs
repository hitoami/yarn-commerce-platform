// npm run proof 的检查范围。改动页面或商品下架时更新这里。

module.exports = {
  baseUrl: 'http://127.0.0.1:9292',

  // prefix 是本地 dev 的语言路径，livePrefix 是线上 hitoami.com 的（--live 时使用）。
  // browserLocale 写进浏览器 context，避免继承本机语言后被店铺的语言重定向带走。
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
      { selector: '.hitoami-story__media img', minimum: 1, label: '品牌介绍图片' },
      { selector: '.yarn-home-catalog__grid .yx-product-card', minimum: 4, label: '首页真实毛线商品卡' },
    ] },
    { key: 'yarn-collection', path: '/collections/yarn', requiredContent: [
      { selector: '.ycb-chip', minimum: 2, label: '毛线分类胶囊' },
      { selector: '.ycb-grid .yx-product-card', minimum: 4, label: '目录真实毛线商品卡' },
    ] },
    // #131：演示商品已删除，编织包不再销售；成品详情等真实成品上架后再加回。
    // #131 / #152：手工成品上架前集合为空，yarn-collection-browse 显示三语「准备中」说明而不是「0/0 件」。
    { key: 'finished-collection', path: '/collections/finished-goods', requiredContent: [
      { selector: '.ycb-preparing__text', minimum: 1, label: '手工成品准备中说明' },
    ] },
    { key: 'yarn-pdp', path: '/products/mvp-yarn-18' },
    // 本季主推专题页：后台页面已建（handle season）；page.season 上线正式主题、后台改选该模板前，用 ?view 预览。
    { key: 'season', path: '/pages/season?view=season', requiredContent: [
      { selector: '.yx-season-page__art img', minimum: 1, label: '本季专题封面' },
      { selector: '.yx-season-page__yarn', minimum: 7, label: '本季专题 7 款毛线' },
      { selector: '.yx-season-page__toc-thumb img', minimum: 7, label: '本季专题目录小图' },
    ] },
    { key: 'cart-drawer', path: '/products/mvp-yarn-18', openCart: true },
    // #149：搜索按毛线 / 材料包 / 手工成品分组；「段染」覆盖毛线与材料包两组，另看一次无结果状态。
    { key: 'search', path: '/search?q=%E6%AE%B5%E6%9F%93' },
    { key: 'search-empty', path: '/search?q=zzqx' },
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
    '.ycb-head__title', '.ycb-head__intro', '.ycb-chip__name',
    '.header__menu-item', '.menu-drawer__menu-item', '.list-menu__item', '.footer-block__details-content',
    '.predictive-search', '.yx-project-pick__title', '.yx-project-pick__yarn', '.yx-season-page__toc', '.yx-season-page__name', '.yx-season-page__facts', '.yx-season-page__note', '.yarn-favorite', '[data-proof-content]',
  ],

  // 有意显示多种语言或品牌名的区域：语言切换器、支付方式图标。
  ignoreSelectors: ['localization-form', '.disclosure__list', '.localization-selector', '.list-payment'],
};
