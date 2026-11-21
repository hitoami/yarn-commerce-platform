const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

/** Parse JPEG width/height from SOF0/SOF1/SOF2/SOF3 markers (zero external dependencies). */
function readJpegDimensions(buf) {
  assert.equal(buf[0], 0xff, 'JPEG must start with SOI 0xFF');
  assert.equal(buf[1], 0xd8, 'JPEG must start with SOI 0xD8');
  let offset = 2;
  while (offset < buf.length) {
    while (offset < buf.length && buf[offset] !== 0xff) offset += 1;
    while (offset < buf.length && buf[offset] === 0xff) offset += 1;
    if (offset >= buf.length) break;
    const marker = buf[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    const segmentLength = buf.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) {
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += segmentLength;
  }
  throw new Error('Could not find SOF marker in JPEG');
}

/**
 * Mirror of snippets/meta-tags.liquid fallback logic for deterministic verification
 * against all locales and Shopify Admin fallback combinations.
 */
function resolveSocialMeta({
  locale = 'ja',
  pageType = 'index',
  pageTitle = '',
  pageDescription = '',
  shopName = 'hitoami',
  shopDescription = '',
  productTitle = '',
  collectionTitle = '',
  hasEntityImage = false,
  entityImage = null,
}) {
  const ogSiteName = 'hitoami';
  const lang = String(locale || 'ja').toLowerCase();
  let isZh = false;
  let isEn = false;
  let ogLocale = 'ja_JP';
  let defaultTitle = 'hitoami｜毛糸と手編みの専門店';
  let defaultDesc =
    'ひと玉ずつ、選ぶ楽しみ。グラデーションや段染め、モヘヤ、ループヤーンなどの毛糸と、作品ごとの編みキットをお届けするオンラインの毛糸屋さんです。';
  let defaultAlt = 'hitoami｜窓辺の椅子に置かれた編みかけのニットと毛糸玉';

  if (lang === 'zh-cn' || lang === 'zh' || lang === 'zh-tw') {
    isZh = true;
    ogLocale = lang === 'zh-tw' ? 'zh_TW' : 'zh_CN';
    defaultTitle = 'hitoami｜毛线与手作专门店';
    defaultDesc =
      '一团一团，慢慢挑。精选渐变、段染、马海毛、圈圈纱等特色毛线与配好团数的编织包，陪你按自己的节奏享受编织。';
    defaultAlt = 'hitoami｜窗边木椅上织到一半的编织片与毛线团';
  } else if (lang === 'en' || lang.includes('en-')) {
    isEn = true;
    ogLocale = 'en_US';
    defaultTitle = 'hitoami | Specialty Yarn & Knitting Kits';
    defaultDesc =
      'Choose yarn, one ball at a time. Gradient, variegated, mohair and bouclé yarns alongside project-ready knitting kits from our online yarn shop.';
    defaultAlt =
      'hitoami | A half-knitted cream wool swatch and colorful yarn balls on a sunlit wooden chair';
  }

  let ogTitle = (pageTitle || '').trim();
  let ogDescription = (pageDescription || shopDescription || '').trim();
  let ogType = 'website';

  if (pageType === 'product') {
    ogType = 'product';
    if (!ogTitle || ogTitle === 'My Store') ogTitle = productTitle.trim();
  } else if (pageType === 'collection' && collectionTitle.trim()) {
    if (!ogTitle || ogTitle === 'My Store') {
      ogTitle = collectionTitle.trim();
    } else if (!isZh && (ogTitle.includes('毛线与手作') || ogTitle.includes('毛线') || ogTitle.includes('手作'))) {
      ogTitle = isEn ? `${collectionTitle.trim()} | hitoami` : `${collectionTitle.trim()}｜hitoami`;
    }
  } else if (pageType === 'article') {
    ogType = 'article';
  }

  const titleIsCnFallback =
    !isZh && (ogTitle.includes('毛线与手作') || ogTitle.includes('从第一针开始') || ogTitle.includes('毛线'));
  if (!ogTitle || ogTitle === 'My Store' || titleIsCnFallback) {
    ogTitle = defaultTitle;
  } else if (pageType === 'index' && ogTitle === ogSiteName) {
    ogTitle = defaultTitle;
  }

  const descIsCnFallback =
    !isZh &&
    (ogDescription.includes('从第一针开始') ||
      ogDescription.includes('毛线与手作') ||
      ogDescription.includes('把毛线') ||
      ogDescription.includes('毛线'));
  if (
    !ogDescription ||
    ogDescription === 'My Store' ||
    ogDescription === shopName ||
    ogDescription === ogSiteName ||
    descIsCnFallback
  ) {
    ogDescription = defaultDesc;
  }

  if (hasEntityImage && entityImage) {
    let width = entityImage.width;
    let height = entityImage.height;
    if (width > 1200 && height > 0) {
      height = Math.floor((height * 1200) / width);
      width = 1200;
    }
    return {
      ogSiteName,
      ogLocale,
      ogType,
      ogTitle,
      ogDescription,
      ogImageUrl: entityImage.url.startsWith('http') ? entityImage.url : `https:${entityImage.url}`,
      ogImageWidth: width,
      ogImageHeight: height,
      ogImageType: '',
      ogImageAlt: (entityImage.alt || ogTitle).trim(),
    };
  }

  return {
    ogSiteName,
    ogLocale,
    ogType,
    ogTitle,
    ogDescription,
    ogImageUrl: 'https://cdn.shopify.com/s/files/1/hitoami-og-share.jpg',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/jpeg',
    ogImageAlt: defaultAlt,
  };
}

/** Mirror of sections/main-product.liquid JSON-LD brand sanitizer. */
function sanitizeStructuredDataBrand(structuredDataJson, vendor, shopName = 'hitoami') {
  let fallback = (shopName || '').trim();
  if (!fallback || fallback === 'My Store') fallback = 'hitoami';
  const raw = (vendor || '').trim();
  const down = raw.toLowerCase();
  const internalTokensDown = ['1688', 'taobao', 'tmall', 'pinduoduo'];
  const internalTokensRaw = [
    '淘宝',
    '天猫',
    '拼多多',
    '品牌待确认',
    '待确认',
    '待补',
    '未知',
    '纺织',
    '纱厂',
    '毛纺',
    '有限',
    '商贸',
    '实业',
    '工厂',
    '旗舰店',
    '专营店',
    '商行',
    '批发',
    '供应',
    '手工坊',
  ];
  const shouldSanitize =
    !raw ||
    ['my store', 'unknown', 'tbd', 'n/a'].includes(down) ||
    internalTokensDown.some((token) => down.includes(token)) ||
    internalTokensRaw.some((token) => raw.includes(token));

  if (!shouldSanitize || !structuredDataJson.includes('"brand":')) {
    return structuredDataJson;
  }

  const parts = structuredDataJson.split('"brand":');
  if (parts.length < 2) return structuredDataJson;
  const fallbackJson = JSON.stringify(fallback);
  const vendorJson = JSON.stringify(vendor || '');
  const trimmedJson = JSON.stringify(raw);

  let rebuilt = parts[0];
  for (let i = 1; i < parts.length; i += 1) {
    let tail = parts[i];
    if (!raw) {
      if (tail.includes('"name": ""')) {
        tail = tail.replace('"name": ""', `"name": ${fallbackJson}`);
      } else if (tail.includes('"name":""')) {
        tail = tail.replace('"name":""', `"name": ${fallbackJson}`);
      }
    } else if (tail.includes(vendorJson)) {
      tail = tail.replace(vendorJson, fallbackJson);
    } else if (tail.includes(trimmedJson)) {
      tail = tail.replace(trimmedJson, fallbackJson);
    }
    rebuilt += `"brand":${tail}`;
  }
  return rebuilt;
}

test('hitoami-og-share.jpg is a valid 1200x630 JPEG archived in docs/design/approved with provenance', () => {
  const assetPath = 'assets/hitoami-og-share.jpg';
  const approvedPath = 'docs/design/approved/hitoami-og-share.jpg';
  const sourcePath = 'assets/hitoami-og-share.jpg.source.json';

  assert.ok(fs.existsSync(assetPath), 'assets/hitoami-og-share.jpg must exist');
  assert.ok(fs.existsSync(approvedPath), 'docs/design/approved/hitoami-og-share.jpg must exist');
  assert.ok(fs.existsSync(sourcePath), 'assets/hitoami-og-share.jpg.source.json must exist');

  const assetBuf = fs.readFileSync(assetPath);
  const approvedBuf = fs.readFileSync(approvedPath);
  assert.ok(assetBuf.equals(approvedBuf), 'approved copy must match assets/hitoami-og-share.jpg');
  assert.ok(assetBuf.length > 20_000 && assetBuf.length < 500_000, `unexpected JPEG size: ${assetBuf.length} bytes`);

  const dims = readJpegDimensions(assetBuf);
  assert.deepEqual(dims, { width: 1200, height: 630 });

  const provenance = JSON.parse(read(sourcePath));
  assert.equal(provenance.issue, '#320');
  const sourceAssets = provenance.sources.map((s) => s.asset);
  assert.ok(sourceAssets.includes('assets/hitoami-yarn-wide.webp'));
  assert.ok(sourceAssets.includes('assets/hitoami-logo.webp'));
});

test('snippets/meta-tags.liquid outputs complete OG/Twitter card tags with 1200x630 fallback and locale guards', () => {
  const meta = read('snippets/meta-tags.liquid');
  assert.match(meta, /'hitoami-og-share\.jpg'\s*\|\s*asset_url/);
  assert.match(meta, /assign og_image_width = 1200/);
  assert.match(meta, /assign og_image_height = 630/);
  assert.match(meta, /assign og_image_type = 'image\/jpeg'/);
  assert.match(meta, /<meta property="og:site_name" content="\{\{ og_site_name \}\}">/);
  assert.match(meta, /<meta property="og:locale" content="\{\{ og_locale \}\}">/);
  assert.match(meta, /<meta property="og:image" content="\{\{ og_image_url \}\}">/);
  assert.match(meta, /<meta property="og:image:secure_url" content="\{\{ og_image_url \}\}">/);
  assert.match(meta, /<meta property="og:image:width" content="\{\{ og_image_width \}\}">/);
  assert.match(meta, /<meta property="og:image:height" content="\{\{ og_image_height \}\}">/);
  assert.match(meta, /<meta property="og:image:type" content="\{\{ og_image_type \}\}">/);
  assert.match(meta, /<meta property="og:image:alt" content="\{\{ og_image_alt \| escape \}\}">/);
  assert.match(meta, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(meta, /<meta name="twitter:image" content="\{\{ og_image_url \}\}">/);
  assert.match(meta, /<meta name="twitter:image:alt" content="\{\{ og_image_alt \| escape \}\}">/);
  assert.match(meta, /assign og_site_name = 'hitoami'/);
  assert.match(meta, /assign og_locale = 'ja_JP'/);
  assert.match(meta, /assign og_locale = 'zh_CN'/);
  assert.match(meta, /assign og_locale = 'en_US'/);
  // Guard against raw Shopify Preferences Chinese fallback leaking onto ja/en storefronts
  assert.match(meta, /毛线与手作/);
  assert.match(meta, /从第一针开始/);
});

test('locale-aware OG fallback replaces raw Chinese homepage metadata on ja/en while respecting Admin translations', () => {
  const jaFallback = resolveSocialMeta({
    locale: 'ja',
    pageType: 'index',
    pageTitle: 'hitoami｜毛线与手作',
    pageDescription: '从第一针开始，把毛线、色彩与创意慢慢编进生活。',
  });
  assert.equal(jaFallback.ogLocale, 'ja_JP');
  assert.equal(jaFallback.ogSiteName, 'hitoami');
  assert.equal(jaFallback.ogTitle, 'hitoami｜毛糸と手編みの専門店');
  assert.doesNotMatch(jaFallback.ogTitle, /毛线|手作/);
  assert.doesNotMatch(jaFallback.ogDescription, /从第一针|毛线/);
  assert.equal(jaFallback.ogImageWidth, 1200);
  assert.equal(jaFallback.ogImageHeight, 630);
  assert.equal(jaFallback.ogImageType, 'image/jpeg');

  const enFallback = resolveSocialMeta({
    locale: 'en',
    pageType: 'index',
    pageTitle: 'hitoami｜毛线与手作',
    pageDescription: '从第一针开始，把毛线、色彩与创意慢慢编进生活。',
  });
  assert.equal(enFallback.ogLocale, 'en_US');
  assert.equal(enFallback.ogTitle, 'hitoami | Specialty Yarn & Knitting Kits');
  assert.doesNotMatch(enFallback.ogDescription, /[\u4e00-\u9fff]/);

  const zhHome = resolveSocialMeta({
    locale: 'zh-CN',
    pageType: 'index',
    pageTitle: 'hitoami｜毛线与手作',
    pageDescription: '从第一针开始，把毛线、色彩与创意慢慢编进生活。',
  });
  assert.equal(zhHome.ogLocale, 'zh_CN');
  assert.equal(zhHome.ogTitle, 'hitoami｜毛线与手作');

  const jaExplicitAdmin = resolveSocialMeta({
    locale: 'ja',
    pageType: 'index',
    pageTitle: 'hitoami｜手編みのための小さな毛糸店',
    pageDescription: '季節の毛糸と編みキットを取りそろえています。',
  });
  assert.equal(jaExplicitAdmin.ogTitle, 'hitoami｜手編みのための小さな毛糸店');
  assert.equal(jaExplicitAdmin.ogDescription, '季節の毛糸と編みキットを取りそろえています。');

  const productWithImage = resolveSocialMeta({
    locale: 'ja',
    pageType: 'product',
    pageTitle: '【ウール混紡】ティンダル',
    pageDescription: 'やわらかな風合いのウール混紡毛糸です。',
    hasEntityImage: true,
    entityImage: { url: '//cdn.shopify.com/s/files/1/tyndall.jpg', width: 2400, height: 1800, alt: 'ティンダル' },
  });
  assert.equal(productWithImage.ogType, 'product');
  assert.equal(productWithImage.ogImageUrl, 'https://cdn.shopify.com/s/files/1/tyndall.jpg');
  assert.equal(productWithImage.ogImageWidth, 1200);
  assert.equal(productWithImage.ogImageHeight, 900);
});

test('sections/main-product.liquid sanitizes raw internal supplier vendors in product JSON-LD brand', () => {
  const section = read('sections/main-product.liquid');
  assert.match(section, /assign jsonld_output = product \| structured_data/);
  assert.match(section, /jsonld_vendor_down contains '1688'/);
  assert.match(section, /jsonld_vendor_raw contains '淘宝'/);
  assert.match(section, /jsonld_vendor_raw contains '品牌待确认'/);
  assert.match(section, /split: '"brand":'/);

  const leakyVendors = [
    '1688 保定暖色纺织有限公司',
    '淘宝 榕树下手工坊',
    '品牌待确认',
    '1688_supplier',
    'My Store',
    '',
  ];
  for (const vendor of leakyVendors) {
    const rawJson = JSON.stringify(
      {
        '@context': 'http://schema.org/',
        '@type': 'Product',
        name: 'ティンダル ウール混紡',
        description: 'Quote test: "brand": kept untouched in description.',
        brand: { '@type': 'Brand', name: vendor },
      },
      null,
      2,
    );
    const cleaned = sanitizeStructuredDataBrand(rawJson, vendor, 'hitoami');
    const parsed = JSON.parse(cleaned);
    assert.equal(parsed.brand.name, 'hitoami', `vendor "${vendor}" must fall back to hitoami`);
    assert.equal(parsed.description, 'Quote test: "brand": kept untouched in description.');
  }

  for (const cleanVendor of ['hitoami', 'cloudcandy', '雪妃尔']) {
    const rawJson = JSON.stringify({
      '@context': 'http://schema.org/',
      '@type': 'Product',
      name: 'Sample Yarn',
      brand: { '@type': 'Brand', name: cleanVendor },
    });
    const cleaned = sanitizeStructuredDataBrand(rawJson, cleanVendor, 'hitoami');
    const parsed = JSON.parse(cleaned);
    assert.equal(parsed.brand.name, cleanVendor, `clean vendor "${cleanVendor}" should be preserved`);
  }
});
