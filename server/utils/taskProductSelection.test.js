const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProductSelection,
  parseProductSelection,
  resolveSelectedProducts
} = require('./taskProductSelection');

const catalog = [
  { id: 101, name: 'Mixer', price: '59.99', image: 'mixer.jpg', category: 'Home', is_active: 1 },
  { id: 102, name: 'Watch', price: '80.00', image: 'watch.jpg', category: 'Fashion', is_active: 1 },
  { id: 103, name: 'Disabled', price: '4.00', image: 'hidden.jpg', category: 'Other', is_active: 0 }
];

test('keeps checked products from multiple categories with administrator-edited prices', () => {
  const result = normalizeProductSelection(catalog, [
    { productId: 101, price: '62.50' },
    { productId: '102', price: '75' }
  ]);
  assert.deepEqual(result, {
    ok: true,
    selection: [
      { product_id: '101', price: 62.5 },
      { product_id: '102', price: 75 }
    ]
  });
});

test('uses catalog price when a checked item has no override', () => {
  assert.deepEqual(normalizeProductSelection(catalog, [{ productId: 101 }]).selection, [
    { product_id: '101', price: 59.99 }
  ]);
});

test('rejects unavailable/inactive products and malformed, negative, zero, or over-precision prices', () => {
  for (const items of [
    [{ productId: 999, price: 1 }],
    [{ productId: 103, price: 4 }],
    [{ productId: 101, price: '12usd' }],
    [{ productId: 101, price: '-1' }],
    [{ productId: 101, price: '0' }],
    [{ productId: 101, price: '12.345' }]
  ]) assert.equal(normalizeProductSelection(catalog, items).ok, false);
});

test('requires at least one selection and removes duplicate product IDs', () => {
  assert.equal(normalizeProductSelection(catalog, []).ok, false);
  assert.deepEqual(normalizeProductSelection(catalog, [
    { productId: 101, price: 40 },
    { productId: 101, price: 45 }
  ]).selection, [{ product_id: '101', price: 40 }]);
});

test('parses stored selection JSON safely', () => {
  assert.deepEqual(parseProductSelection('[{"product_id":"101","price":62.5}]'), [
    { product_id: '101', price: 62.5 }
  ]);
  assert.deepEqual(parseProductSelection('not-json'), []);
  assert.deepEqual(parseProductSelection(null), []);
});

test('resolves the exact selected product so its catalog image cannot be borrowed from a similarly named item', () => {
  const products = resolveSelectedProducts(catalog, [
    { product_id: '102', price: 77.25 }
  ]);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Watch');
  assert.equal(products[0].image, 'watch.jpg');
  assert.equal(products[0].category, 'Fashion');
  assert.equal(products[0].price, 77.25);
});
