const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDepositContractMatch } = require('./depositContractMatch');

test('matches the contract against approved plus newly verified deposits exactly', () => {
  const result = calculateDepositContractMatch('100.00', [
    { status: 'approved', amount: '25.00' },
    { status: 'verified', amount: '75.00' },
    { status: 'pending', amount: '999.00' }
  ]);

  assert.equal(result.matches, true);
  assert.equal(result.approvedCents, 2500);
  assert.equal(result.heldCents, 7500);
  assert.equal(result.verifiedReleaseCents, 7500);
});

test('does not match if verified total is lower or higher than the contract amount', () => {
  assert.equal(calculateDepositContractMatch('100.00', [
    { status: 'verified', amount: '80.00' }
  ]).matches, false);
  assert.equal(calculateDepositContractMatch('100.00', [
    { status: 'verified', amount: '120.00' }
  ]).matches, false);
});

test('already-approved deposits satisfy the contract amount but are not released again', () => {
  const result = calculateDepositContractMatch('40.00', [
    { status: 'approved', amount: '40.00' }
  ]);

  assert.equal(result.matches, true);
  assert.equal(result.verifiedReleaseCents, 0);
});
