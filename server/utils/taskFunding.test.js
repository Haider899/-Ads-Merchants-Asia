const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateTaskCompletionFunding } = require('./taskFunding');

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
  assert.equal(evaluateTaskCompletionFunding(0, 4000, true).ok, true);
  assert.equal(evaluateTaskCompletionFunding(4000, 4000, true).ok, true);
});

test('allows a normal order only when its principal is funded', () => {
  assert.equal(evaluateTaskCompletionFunding(3999.99, 4000, false).ok, false);
  assert.equal(evaluateTaskCompletionFunding(4000, 4000, false).ok, true);
});
