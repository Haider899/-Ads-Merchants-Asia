const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_CATALOG } = require('./internationalCatalog');

test('international catalog has ten active products in every assignment category', () => {
  const counts = new Map();
  for (const product of INTERNATIONAL_CATALOG) {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
    assert.ok(product.name.length > 10);
    assert.ok(product.price > 0);
    assert.equal(product.is_active, 1);
  }

  assert.deepEqual(Object.fromEntries(counts), {
    budget: 10,
    fashion_travel: 10,
    beauty_health: 10,
    mobile_audio: 10,
    home_kitchen: 10,
    tools: 10,
    outdoor: 10,
    gaming_entertainment: 10,
    premium_electronics: 10,
    high_ticket: 10
  });
});

test('every catalog product points to an existing local image asset', () => {
  for (const product of INTERNATIONAL_CATALOG) {
    const imagePath = path.resolve(process.cwd(), product.image);
    assert.ok(fs.existsSync(imagePath), `Missing image for ${product.name}: ${product.image}`);
  }
});
