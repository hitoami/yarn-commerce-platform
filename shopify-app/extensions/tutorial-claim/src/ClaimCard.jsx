import '@shopify/ui-extensions/preact';
import { useEffect, useState } from 'preact/hooks';

import { KITS_QUERY, claimMessage, kitsFromStorefront, lineUrl, matchKits } from './kit-match.js';

// 两个页面共用的「领取教程」卡片：只在订单买齐某个材料包的毛线时出现（原型 #244 ①②④）。
export function ClaimCard({ orderLabel }) {
  const [kit, setKit] = useState(null);
  const t = (key, values) => shopify.i18n.translate(key, values);

  useEffect(() => {
    const language = shopify.localization.language.value.isoCode.split('-')[0].toUpperCase();
    shopify
      .query(KITS_QUERY, { variables: { language } })
      .then(({ data }) => setKit(matchKits(shopify.lines.value, kitsFromStorefront(data))[0] ?? null))
      .catch(() => setKit(null));
  }, []);

  if (!kit || !orderLabel) return null;

  const message = claimMessage(t('message'), { order: orderLabel, kit: kit.title });
  const lineId = String(shopify.settings.value.line_id ?? '').trim();
  const contact = String(shopify.settings.value.contact_url ?? '').trim() || 'https://hitoami.com/pages/contact';

  return (
    <s-section heading={t('eyebrow')}>
      <s-stack gap="base">
        <s-heading>{t('heading', { kit: kit.title })}</s-heading>
        {lineId ? (
          <s-button variant="primary" href={lineUrl(lineId, message)} target="_blank">{t('line')}</s-button>
        ) : (
          <s-button variant="primary" href={contact} target="_blank">{t('contact')}</s-button>
        )}
        <s-text color="subdued">{lineId ? t('lineNote') : t('contactNote', { order: orderLabel, kit: kit.title })}</s-text>
      </s-stack>
    </s-section>
  );
}
