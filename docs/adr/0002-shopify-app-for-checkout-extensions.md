---
status: accepted
date: 2026-10-30
---

# 下单完成页与订单状态页用 Shopify App 扩展

#244「下单后一键领教程」要在下单完成页和订单状态页显示内容。店铺用的是新版顾客账户（`/account` 跳到 `account.hitoami.com`）：主题 Liquid 读不到订单，也不能修改这两个页面。Shopify 留给这两个页面的唯一入口是结账 UI 扩展（`purchase.thank-you.block.render`、`customer-account.order-status.block.render`），扩展只能随一个 Shopify App 发布。

锦晨 2026-10-30 决定：之后订单、下单完成页、订单状态页都还要做界面扩展，只要不额外收费就用 Shopify App 来做。自定义应用不收费；这两个页面的扩展不要求 Shopify Plus（Plus 限制只针对结账的信息、配送、付款三步）。

## 决定

- 仓库新增 `shopify-app/`：一个只装扩展、没有后端服务器的自定义应用。第一份扩展是 `extensions/tutorial-claim/`。
- 扩展只读：从 Storefront API 读 `yarn_project` / `yarn_material` 元对象，和订单行比对；不写订单、不改价格和库存，也不保存顾客数据。Shopify 仍是订单真值来源（ADR 0001 不变）。
- 主题发布（`scripts/release.sh`）和应用发布（`shopify app deploy`）分开：应用每次发布都要锦晨当次批准；结账编辑器里放置区块、开启元对象的 Storefront 读取权限，属于店铺设置，同样要当次批准。
- 应用的 `client_id` 由锦晨登录后用 `shopify app config link` 写入；agent 不搜寻、复制凭证。

## 考虑过的方案

- 主题 + 订单确认邮件：邮件模板可改，但邮件 Liquid 读不到材料包元对象，下单完成页仍改不了。
- 等以后做 Platform Service：需要服务器和部署，对「只读比对」来说太重。

## 后果

多了一个要单独发布的部分。扩展代码放在 `shopify-app/`，匹配逻辑有单元测试（`tests/tutorial-claim.test.cjs`），并纳入 `npm run verify`。以后订单相关的界面扩展都放进这同一个应用，不再另建应用。
