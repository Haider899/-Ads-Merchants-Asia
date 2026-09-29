const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeFiles = [
  path.resolve(__dirname, '../routes/admin.js'),
  path.resolve(__dirname, '../../amazon-asia-merchants-main/server/routes/admin.js')
];

test('admin assignment routes do not create user assignment notifications', () => {
  for (const routeFile of routeFiles) {
    const source = fs.readFileSync(routeFile, 'utf8');
    assert.doesNotMatch(source, /ORDER_PUSH/,
      `${routeFile} must not emit ORDER_PUSH notifications`);
    assert.doesNotMatch(source, /New Order Assigned!/,
      `${routeFile} must not emit New Order Assigned notifications`);
    assert.doesNotMatch(source, /User received notification|User notified/,
      `${routeFile} must not claim that assignment notifications were sent`);
  }
});
