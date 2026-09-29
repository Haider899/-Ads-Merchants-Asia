const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_CATALOG } = require('./internationalCatalog');

test('international catalog has 600 active products with multi-product coverage in every category', () => {
  assert.equal(INTERNATIONAL_CATALOG.length, 600);
  const counts = new Map();
  const names = new Set();
  const skus = new Set();
  for (const product of INTERNATIONAL_CATALOG) {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
    assert.ok(product.name.length > 10);
    assert.ok(product.price > 0);
    assert.equal(product.is_active, 1);
    assert.equal(names.has(product.name), false, `Duplicate product name: ${product.name}`);
    assert.equal(skus.has(product.sku), false, `Duplicate SKU: ${product.sku}`);
    names.add(product.name);
    skus.add(product.sku);
  }

  assert.deepEqual(Object.fromEntries(counts), {
    budget: 50,
    fashion_travel: 50,
    beauty_health: 50,
    mobile_audio: 50,
    home_kitchen: 50,
    tools: 50,
    outdoor: 50,
    gaming_entertainment: 50,
    premium_electronics: 50,
    high_ticket: 50,
    mobile_accessories: 10,
    toiletry_bags: 10,
    home_garden: 10,
    handheld_vacuums: 10,
    pet_supplies: 10,
    massage_relaxation: 10,
    electric_clippers: 10,
    portable_speakers: 10,
    storage_shed: 10,
    nursing_feeding: 10
  });
});

test('every catalog product points to an existing local image asset', () => {
  for (const product of INTERNATIONAL_CATALOG) {
    const imagePath = path.resolve(process.cwd(), product.image);
    assert.ok(fs.existsSync(imagePath), `Missing image for ${product.name}: ${product.image}`);
  }
});
