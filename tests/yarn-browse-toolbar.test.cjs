const { test } = require('node:test');
const assert = require('node:assert/strict');
const { samePriceRange } = require('../assets/yarn-browse-toolbar.js');
const params = (value) => new URLSearchParams(value);

test('price chip stays selected after Shopify normalizes amounts on sort submission', () => {
  assert.equal(samePriceRange(
    params('filter.v.price.gte=500.0&filter.v.price.lte=1499.0&sort_by=price-descending'),
    params('filter.v.price.gte=500&filter.v.price.lte=1499')
  ), true);
});

test('price chips compare both bounds and cannot match a substring or an unset bound', () => {
  assert.equal(samePriceRange(params('filter.v.price.lte=1499'), params('filter.v.price.lte=500')), false);
  assert.equal(samePriceRange(params('filter.v.price.gte=500&filter.v.price.lte=1499'), params('filter.v.price.gte=500')), false);
  assert.equal(samePriceRange(params('sort_by=price-ascending'), params('')), true);
});

test('default JPY price bands assign each boundary to exactly one chip', () => {
  const fs = require('node:fs');
  const template = JSON.parse(fs.readFileSync('templates/collection.json', 'utf8').replace(/^\/\*[\s\S]*?\*\//, ''));
  // #85: the collection page now uses yarn-collection-browse; its price bands live in the filter drawer.
  const browse = Object.values(template.sections).find(section => section.type === 'yarn-collection-browse');
  const ranges = Object.values(browse.blocks).filter(block => block.type === 'price_band').map(block => params(block.settings.param));
  assert.equal(ranges.length, 3);
  for (const price of [499, 500, 1499, 1500]) {
    const matches = ranges.filter(range => (!range.has('filter.v.price.gte') || price >= Number(range.get('filter.v.price.gte'))) && (!range.has('filter.v.price.lte') || price <= Number(range.get('filter.v.price.lte'))));
    assert.equal(matches.length, 1, `price ${price} must belong to exactly one band`);
  }
});
