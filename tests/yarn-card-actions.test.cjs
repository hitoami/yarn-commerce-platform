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

test('#169 the cart button only renders for finished goods, judged like search grouping', () => {
  const cart = read('snippets/yarn-card-cart.liquid');
  assert.match(cart, /render 'yarn-discovery-product-kind', product: cart_product/);
  assert.match(cart, /{%- if cart_product\.price > 0 and cart_kind contains 'finished' -%}/);
});

test('#175 the header heart shows the favorites count and the card cart reuses the header cart icon', () => {
  const header = read('sections/header.liquid');
  assert.match(header, /data-favorites-header[\s\S]*data-label-count="{{ 'yarn_discovery\.favorites_count' \| t: number: '__N__' }}"/);
  assert.match(header, /<div class="cart-count-bubble yarn-favorites-count" data-favorites-count aria-hidden="true" hidden><\/div>/);
  assert.match(read('assets/yarn-favorites.js'), /querySelectorAll\('\[data-favorites-header\]'\)[\s\S]*has-favorites/);
  assert.match(read('assets/yarn-card-actions.js'), /addEventListener\('yarn:favorite-toggled'/);
  for (const path of ['snippets/yarn-card-cart.liquid', 'snippets/yarn-card-buy.liquid']) {
    assert.match(read(path), /'icon-cart-empty\.svg' \| inline_asset_content/, `${path} header cart icon`);
  }
});

test('#175 favorites cards carry a 1–99 quantity stepper wired to the add button', () => {
  const buy = read('snippets/yarn-card-buy.liquid');
  assert.match(buy, /<label><span class="visually-hidden">[^<]*<\/span><input type="number" inputmode="numeric" min="1" max="99" value="1" data-card-qty><\/label>/);
  assert.match(buy, /data-qty-step="-1"[\s\S]*data-qty-step="1"[\s\S]*data-card-add=/);
  assert.match(read('snippets/yarn-pick-card.liquid'), /render 'yarn-card-buy', buy_product: card_product/);
  assert.match(read('assets/yarn-card-actions.js'), /quantity: quantityFor\(button\)/);
  assert.match(read('assets/yarn-search.js'), /this\.classList\.toggle\('is-favorites', isFavorites\)/);
});
