import '@shopify/ui-extensions/preact';
import { render } from 'preact';

import { ClaimCard } from './ClaimCard.jsx';

// 订单状态页：用订单名（如 #1042），和确认邮件里的订单号一致。
export default async () => {
  render(<ClaimCard orderLabel={shopify.order.value?.name ?? ''} />, document.body);
};
