const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const section = fs.readFileSync('sections/main-cart-items.liquid', 'utf8');
const cartJs = fs.readFileSync('assets/cart.js', 'utf8');
const settings = fs.readFileSync('config/settings_data.json', 'utf8');

test('cart page owns items, summary and heading count that cart.js refreshes', () => {
  for (const hook of ['id="main-cart-items" data-id="{{ section.id }}"', 'id="main-cart-footer" data-id="{{ section.id }}"', 'id="YarnCartCount"', 'id="cart-errors"', 'id="cart-live-region-text"', 'id="shopping-cart-line-item-status"']) {
    assert.ok(section.includes(hook), `missing ${hook}`);
  }
  // Both refreshable regions are .js-contents inside one section, so cart.js must scope its selectors.
  assert.match(cartJs, /selector: '#main-cart-items \.js-contents'/);
  assert.match(cartJs, /selector: '#main-cart-footer \.js-contents'/);
  assert.match(cartJs, /new Set\(sectionsToRender\.map/);
});

test('line items keep the native quantity, remove and checkout contract', () => {
  for (const hook of ['id="CartItem-{{ line }}"', 'id="Quantity-{{ line }}"', 'name="updates[]"', 'id="Line-item-error-{{ line }}"', '<cart-remove-button', 'href="{{ item.url_to_remove }}"', 'name="checkout"', 'form="cart"']) {
    assert.ok(section.includes(hook), `missing ${hook}`);
  }
});

test('empty-cart entries render only with a link, and the store uses the cart page', () => {
  assert.match(section, /section\.settings\.projects_link != blank/);
  assert.match(section, /section\.settings\.beginner_link != blank/);
  assert.match(section, /section\.settings\.help_link != blank/);
  assert.match(settings.slice(0, settings.indexOf('"presets"')), /"cart_type": "page"/);
});
