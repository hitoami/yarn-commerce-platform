import '@shopify/ui-extensions/preact';
import { render } from 'preact';

import { ClaimCard } from './ClaimCard.jsx';

// 下单完成页：订单号取 orderConfirmation.number（Shopify 生成的确认号）。
export default async () => {
  const number = shopify.orderConfirmation.value?.number;
  render(<ClaimCard orderLabel={number ? `#${number}` : ''} />, document.body);
};
