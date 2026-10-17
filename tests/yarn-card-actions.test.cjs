const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const productCards = ['snippets/yarn-pick-card.liquid', 'snippets/card-product.liquid', 'snippets/yarn-discovery-product-card.liquid'];

test('#161 every product card renders the card heart and the shared add-to-cart button once', () => {
  for (const path of productCards) {
    const source = read(path);
    assert.equal(source.match(/render 'yarn-card-cart'/g)?.length, 1, `${path} add-to-cart`);
    assert.equal(source.match(/render 'yarn-favorite-button'[^%]*modifier: 'yx-card-fav'/g)?.length, 1, `${path} heart`);
  }
});

test('#161 card wrappers do not add a second heart, and Rise quick-add never shows beside the cart button', () => {
  assert.doesNotMatch(read('snippets/yarn-search-product.liquid'), /yarn-favorite-button/);
  assert.match(read('snippets/card-product.liquid'), /{%- if card_product and card_product != empty -%}\n(?:.*\n)?\s*{%- assign quick_add = 'none' -%}/);
});

test('#161 the cart button covers single-variant add, multi-variant link and sold-out states', () => {
  const cart = read('snippets/yarn-card-cart.liquid');
  assert.match(cart, /cart_product\.available == false -%}\s*<button class="yx-card-cart" type="button" disabled/);
  assert.match(cart, /cart_product\.variants\.size == 1 -%}\s*<button[\s\S]*data-card-add=/);
  assert.match(cart, /{%- else -%}\s*<a class="yx-card-cart" href="{{ cart_product\.url }}"/);
});
