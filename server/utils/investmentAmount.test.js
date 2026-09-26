const test = require('node:test');
const assert = require('node:assert/strict');
const { parseInvestmentAmount } = require('./investmentAmount');

test('accepts positive investment amounts with at most two decimal places', () => {
  assert.equal(parseInvestmentAmount('125'), 125);
  assert.equal(parseInvestmentAmount('125.40'), 125.4);
  assert.equal(parseInvestmentAmount(0.01), 0.01);
});

test('rejects empty, zero, negative, malformed, over-precision, and oversized amounts', () => {
  for (const value of ['', '0', '0.00', '-5', '1.234', '1e3', '10000000000000.00', null, NaN]) {
    assert.equal(parseInvestmentAmount(value), null, `expected ${String(value)} to be rejected`);
  }
});
