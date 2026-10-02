const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const tasksRoute = fs.readFileSync(require.resolve('../routes/tasks'), 'utf8');
const financeRoute = fs.readFileSync(require.resolve('../routes/finance'), 'utf8');
const adminRoute = fs.readFileSync(require.resolve('../routes/admin'), 'utf8');

test('deposit confirmation notification does not include wallet network identifier', () => {
  assert.match(adminRoute, /title: 'Deposit Confirmed'/);
  assert.match(adminRoute, /Your deposit of \$\$\{amount\.toFixed\(2\)\} has been successfully credited to your Working Balance\. Your funds are now available\./);
  assert.doesNotMatch(adminRoute, /Your deposit of \$\$\{amount\.toFixed\(2\)\} \(\$\{result\.method/);
});

test('order completion response uses Merchant Orders Completed copy', () => {
  assert.match(tasksRoute, /title: 'Merchant Orders Completed'/);
  assert.match(tasksRoute, /message: 'All current orders are complete\. Activate a new merchant contract to continue earning commissions\.'/);
  assert.doesNotMatch(tasksRoute, /Daily Task Limit Reached/);
});

test('tasks and finance routes do not enforce a hardcoded daily 5 orders limit fallback', () => {
  assert.doesNotMatch(tasksRoute, /max_tasks: 5/);
  assert.doesNotMatch(tasksRoute, /\? user\.task_sequence_plan\.total_orders\s*:\s*5/);
  assert.doesNotMatch(financeRoute, /\? user\.task_sequence_plan\.total_orders\s*:\s*5/);
});

test('order submit endpoint returns order completed message and does not spam bell notifications', () => {
  assert.match(tasksRoute, /Order completed successfully! \+\$\$\{commAmount\.toFixed\(2\)\} credited to your account\./);
  assert.doesNotMatch(tasksRoute, /Optimization successful!/);
  assert.doesNotMatch(tasksRoute, /await db\.createNotification/);
});

test('new user without assigned orders receives Merchant Orders in Preparation notice', () => {
  assert.match(tasksRoute, /code: 'orders_processing'/);
  assert.match(tasksRoute, /title: 'Merchant Orders in Preparation'/);
  assert.match(tasksRoute, /Your merchant orders are currently being placed and processed by system administration\. Please check back shortly\./);
});


