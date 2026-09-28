const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MIN_WITHDRAWAL_AMOUNT,
  parseWholeDollarAmount,
  effectiveWithdrawalMinimum
} = require('./withdrawalAmount');

test('accepts positive whole-dollar amounts', () => {
  assert.equal(parseWholeDollarAmount('10'), 10);
  assert.equal(parseWholeDollarAmount('20.00'), 20);
  assert.equal(parseWholeDollarAmount(125), 125);
});

test('rejects decimals and any non-numeric or unsafe input', () => {
  for (const value of ['9.99', '10.50', '10abc', '$10', '', ' ', '-10', '1e2', 'Infinity', 10.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseWholeDollarAmount(value), null, `expected ${String(value)} to be rejected`);
  }
});

test('withdrawal minimum defaults to $10 and respects configured/user overrides', () => {
  assert.equal(MIN_WITHDRAWAL_AMOUNT, 10);
  assert.equal(effectiveWithdrawalMinimum(null, null), 10);
  assert.equal(effectiveWithdrawalMinimum(null, 30), 30);
  assert.equal(effectiveWithdrawalMinimum(20, 30), 20);
  assert.equal(effectiveWithdrawalMinimum(5, 30), 10);
});
