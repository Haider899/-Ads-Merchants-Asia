const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getCategory,
  getProductsForCategory,
  pickCategoryProduct
} = require('./productCategories');

test('custom category returns a category descriptor', () => {
  assert.deepEqual(getCategory('Apni Marzi'), {
    key: 'Apni Marzi',
    label: 'Apni Marzi',
    customCategory: true
  });
});

test('custom categories match their catalog category case-insensitively', () => {
  const products = [
    { name: 'My Added Product', price: 37.5, category: 'Apni Marzi', is_active: 1 },
    { name: 'Different Product', price: 19.99, category: 'Home & Kitchen', is_active: 1 }
  ];
  assert.deepEqual(getProductsForCategory(products, 'Apni Marzi'), [products[0]]);
  assert.deepEqual(getProductsForCategory(products, 'apni marzi'), [products[0]]);
});

test('built-in categories also include products assigned by catalog category', () => {
  const customCatalogProduct = {
    name: 'Hand-added Kitchen Item',
    price: 15,
    category: 'Home & Kitchen',
    is_active: 1
  };
  assert.ok(getProductsForCategory([customCatalogProduct], 'home_kitchen').includes(customCatalogProduct));
});

test('inactive custom catalog products are not selectable', () => {
  const inactive = { name: 'Disabled Item', price: 20, category: 'Apni Marzi', is_active: 0 };
  assert.deepEqual(getProductsForCategory([inactive], 'Apni Marzi'), []);
});

test('category-based task selection can choose an active custom catalog product', () => {
  const product = { id: 4, name: 'My Added Product', price: 37.5, category: 'Apni Marzi', is_active: 1 };
  assert.equal(pickCategoryProduct([product], 'Apni Marzi', [], 'user-1'), product);
});
