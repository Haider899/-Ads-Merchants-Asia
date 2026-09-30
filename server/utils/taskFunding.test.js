const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateTaskCompletionFunding, isDeficitFlag } = require('./taskFunding');

test('normalizes string deficit flags safely', () => {
  assert.equal(isDeficitFlag('0'), false);
  assert.equal(isDeficitFlag('1'), true);
  assert.equal(isDeficitFlag(0), false);
  assert.equal(isDeficitFlag(1), true);
});

test('string zero cannot bypass the normal-order balance requirement', () => {
  const result = evaluateTaskCompletionFunding(1.9, 4000, '0');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'insufficient_balance');
});

test('deficit flag alone cannot bypass an unreserved principal', () => {
  const result = evaluateTaskCompletionFunding(1.9, 4000, 1, { frozenBalance: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'insufficient_balance');
});

test('a deficit task may complete after its reserve shortfall is cleared', () => {
  const result = evaluateTaskCompletionFunding(1.9, 4000, 1, { frozenBalance: 3998.1 });
  assert.equal(result.ok, true);
});

test('blocks a high-value normal order when working balance is too low', () => {
  const result = evaluateTaskCompletionFunding(2.5, 4000, false);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'insufficient_balance');
  assert.equal(result.shortfall, 3997.5);
});

test('blocks every order while the working balance is negative', () => {
  const result = evaluateTaskCompletionFunding(-3997.5, 4000, true);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'unfunded_deficit');
  assert.equal(result.deficit, 3997.5);
});

test('allows a deficit order only after its shortfall is cleared', () => {
  assert.equal(evaluateTaskCompletionFunding(0, 4000, true, { frozenBalance: 4000 }).ok, true);
  assert.equal(evaluateTaskCompletionFunding(4000, 4000, true).ok, true);
});

test('allows a normal order only when its principal is funded', () => {
  assert.equal(evaluateTaskCompletionFunding(3999.99, 4000, false).ok, false);
  assert.equal(evaluateTaskCompletionFunding(4000, 4000, false).ok, true);
});
