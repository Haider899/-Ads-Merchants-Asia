const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const financeRoute = fs.readFileSync(require.resolve('../routes/finance'), 'utf8');
const adminRoute = fs.readFileSync(require.resolve('../routes/admin'), 'utf8');

test('deposit processing notification uses the approved copy', () => {
  assert.match(financeRoute, /title: 'Deposit Processing'/);
  assert.match(financeRoute, /Your deposit of \$\$\{numAmount\.toFixed\(2\)\} submitted successfully! Your payment is currently being processed and will be completed shortly\./);
});

test('deposit confirmation notification describes Working Balance availability', () => {
  assert.match(adminRoute, /title: 'Deposit Confirmed'/);
  assert.match(adminRoute, /Your deposit of \$\$\{amount\.toFixed\(2\)\} \(\$\{result\.method \|\| 'USDT'\}\) has been successfully credited to your Working Balance\. Your funds are now available\./);
});
