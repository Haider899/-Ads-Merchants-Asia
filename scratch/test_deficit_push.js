const jwt = require('jsonwebtoken');
const http = require('http');
const db = require('./server/db');
const { JWT_SECRET } = require('./server/middleware/auth');

const adminToken = jwt.sign({ isAdmin: true, id: 'adm_super_01', email: 'haiderusama707@gmail.com', role: 'super_admin' }, JWT_SECRET);

function apiReq(path, method, body, token, cb) {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: path,
    method: method || 'GET',
    headers: {
      'Host': path.startsWith('/api/admin') ? 'admin.ads-merchants-asia.com' : 'ads-merchants-asia.com',
      'Cookie': (path.startsWith('/api/admin') ? 'admin_token=' : 'token=') + token,
      'Content-Type': 'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0
    }
  }, (res) => {
    let resp = '';
    res.on('data', c => resp += c);
    res.on('end', () => {
      try {
        cb(JSON.parse(resp));
      } catch (e) {
        console.error('Parse error for', path, resp);
      }
    });
  });
  if (data) req.write(data);
  req.end();
}

async function runTest() {
  const users = await db.getUsers();
  const testUser = users.find(u => u.username === 'test_verify_user') || users[0];
  console.log('Target test user:', testUser.username, 'Current balance:', testUser.balance);

  const initialBalance = parseFloat(testUser.balance);

  // 1. Admin pushes immediate deficit task of $2000
  console.log('\n--- 1. ADMIN PUSHES IMMEDIATE DEFICIT TASK ($2000) ---');
  apiReq('/api/admin/users/assign-task', 'POST', {
    userId: testUser.id,
    orderNum: 5,
    productName: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
    productPrice: 2000.00,
    pushImmediate: true
  }, adminToken, async (pushRes) => {
    console.log('Push result:', pushRes);

    const updatedUser = await db.findUserById(testUser.id);
    console.log('Updated user working balance:', updatedUser.balance);
    console.log('Updated user frozen balance:', updatedUser.frozen_balance);

    // 2. User tries to submit task while in deficit
    console.log('\n--- 2. USER SUBMITS TASK WHILE IN DEFICIT ---');
    const userToken = jwt.sign({ id: testUser.id, email: testUser.email }, JWT_SECRET);

    apiReq('/api/tasks/submit', 'POST', {
      taskId: pushRes.task.id
    }, userToken, async (submitRes) => {
      console.log('Submit response while in deficit:', submitRes);
      console.log('Did it correctly trigger reachedLimit?', submitRes.reachedLimit === true);
      console.log('Frozen balance required:', submitRes.userFrozenBalance);

      // 3. Clean up: restore test user balance and delete pending task
      await db.query('DELETE FROM tasks WHERE id = ?', [pushRes.task.id]);
      await db.updateUser(testUser.id, {
        balance: initialBalance,
        frozen_balance: 0.00
      });
      console.log('\n--- 3. CLEANUP COMPLETE: User balance restored to', initialBalance);
      process.exit(0);
    });
  });
}

runTest().catch(console.error);
