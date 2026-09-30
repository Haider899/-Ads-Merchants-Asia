const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSecondContractFunding } = require('./contractFunding');

test('moves the selected second-contract amount from total balance to working balance', () => {
  assert.deepEqual(calculateSecondContractFunding('125.40', '500.00', '80.00'), {
    ok: true,
    amount: '125.40',
    totalBalanceAfter: '374.60',
    workingBalanceAfter: '205.40'
  });
});

test('allows any positive editable amount up to the available total balance', () => {
  assert.equal(calculateSecondContractFunding('0.01', '0.01', '0.00').ok, true);
  assert.equal(calculateSecondContractFunding('499.99', '500.00', '0.00').workingBalanceAfter, '499.99');
});

test('rejects invalid or over-limit second-contract funding', () => {
  assert.equal(calculateSecondContractFunding('0', '500', '0').code, 'invalid_amount');
  assert.equal(calculateSecondContractFunding('600', '500', '0').code, 'insufficient_total_balance');
  assert.equal(calculateSecondContractFunding('100', '500', '0').amount, '100.00');
});
