const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_MINIMUM_DEPOSIT, effectiveDepositMinimum } = require('./depositAmount');

test('global deposit minimum defaults to $1 when no setting exists', () => {
  assert.equal(DEFAULT_MINIMUM_DEPOSIT, 1);
  assert.equal(effectiveDepositMinimum(null, {}), 1);
});

test('per-user deposit minimum overrides the global setting', () => {
  assert.equal(effectiveDepositMinimum({ custom_min_deposit: 75 }, { min_deposit: 1 }), 75);
});

test('deposit policy does not impose a maximum amount', () => {
  assert.equal(effectiveDepositMinimum({ custom_min_deposit: null }, { min_deposit: 1 }), 1);
  assert.ok(1000000000 >= effectiveDepositMinimum(null, { min_deposit: 1 }));
});
