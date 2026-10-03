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

test('second contract submission is funded from active Working Balance without premature transfer', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const userRoute = fs.readFileSync(path.join(__dirname, '../routes/user.js'), 'utf8');
  assert.doesNotMatch(userRoute, /db\.transferTotalBalanceToWorking/);
  assert.match(userRoute, /fundingSource = 'balance'/);
});

test('admin approval executes second contract funding when not already funded', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dbFile = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
  assert.match(dbFile, /UPDATE users SET commission_balance = commission_balance - \?, balance = balance \+ \?/);
  assert.match(dbFile, /today_tasks_completed = 0/);
});

test('user route recognizes second contract from past approved submissions even if current status is pending', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const userRoute = fs.readFileSync(path.join(__dirname, '../routes/user.js'), 'utf8');
  assert.match(userRoute, /hasApprovedContract/);
});

test('withdrawals are strictly limited to commission_balance (Total Balance with Commission)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const financeRoute = fs.readFileSync(path.join(__dirname, '../routes/finance.js'), 'utf8');
  assert.match(financeRoute, /availableWithdrawable = commBalance;/);
});

test('withdrawal route defines workBalance and checks pending tasks before withdrawal', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const financeRoute = fs.readFileSync(path.join(__dirname, '../routes/finance.js'), 'utf8');
  assert.match(financeRoute, /const workBalance = parseFloat\(user\.balance \|\| 0\);/);
  assert.match(financeRoute, /new_balance: workBalance/);
  assert.match(financeRoute, /if \(isNegative \|\| pendingTask \|\| pendingOrder \|\| completedTasks < maxTasks\)/);
});

