const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const drawerCss = fs.readFileSync('assets/component-cart-drawer.css', 'utf8');
const drawerLiquid = fs.readFileSync('snippets/cart-drawer.liquid', 'utf8');
const mobileRule = drawerCss.match(/@media screen and \(max-width: 749px\) \{([\s\S]*?)\n\}/)?.[1] || '';

test('mobile cart drawer gives product identity the full content width', () => {
  assert.match(mobileRule, /\.cart-drawer \.cart-item\s*\{[\s\S]*grid-template:\s*auto auto auto \/ 8rem minmax\(0, 1fr\)/);
  assert.match(mobileRule, /\.cart-drawer \.cart-item__details\s*\{[\s\S]*grid-column:\s*2[\s\S]*min-width:\s*0/);
  assert.match(mobileRule, /\.cart-drawer \.cart-item__media\s*\{[\s\S]*width:\s*8rem/);
});

test('mobile title is visually clamped without changing its Shopify link text', () => {
  assert.match(mobileRule, /\.cart-drawer \.cart-item__name\s*\{[\s\S]*-webkit-line-clamp:\s*3/);
  const titleLink = drawerLiquid.match(/<a href="\{\{ item\.url \}\}" class="cart-item__name h4 break">[\s\S]*?<\/a>/)?.[0] || '';
  assert.match(titleLink, /localized_cart_title \| strip \| escape/);
  assert.doesNotMatch(titleLink, /truncate|slice:|truncatewords/);
});

test('mobile quantity stepper cannot collapse and line total has its own row', () => {
  assert.match(mobileRule, /\.cart-drawer \.cart-items \.cart-item__quantity\s*\{[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*2/);
  assert.match(mobileRule, /\.cart-drawer \.cart-item__quantity-wrapper\s*\{[\s\S]*display:\s*flex[\s\S]*min-width:\s*0/);
  assert.match(mobileRule, /\.cart-drawer \.cart-item__quantity \.quantity-popover-container[\s\S]*\.cart-drawer \.cart-item__quantity \.quantity\s*\{[\s\S]*flex:\s*0 0 14rem[\s\S]*min-width:\s*14rem[\s\S]*width:\s*14rem/);
  assert.match(mobileRule, /\.cart-drawer \.cart-item__totals\s*\{[\s\S]*display:\s*flex[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*3[\s\S]*justify-content:\s*flex-end/);
});

test('mobile cart drawer only scrolls vertically (Issue 297)', () => {
  const yarnCartCss = fs.readFileSync('assets/yarn-cart.css', 'utf8');
  const addonList = yarnCartCss.match(/^\.yarn-cart-addons__list\s*\{([^}]*)\}/m)?.[1] || '';
  assert.match(addonList, /overflow-x:\s*auto/);
  assert.doesNotMatch(addonList, /margin[^;]*-/);
  assert.match(yarnCartCss, /\.cart-drawer cart-drawer-items, \.cart-drawer \.drawer__inner\s*\{\s*overflow-x:\s*clip/);
});
