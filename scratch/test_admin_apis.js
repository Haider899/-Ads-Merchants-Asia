const jwt = require('jsonwebtoken');
const http = require('http');
const { JWT_SECRET } = require('./server/middleware/auth');

const token = jwt.sign({ isAdmin: true, id: 'adm_super_01', email: 'haiderusama707@gmail.com', role: 'super_admin' }, JWT_SECRET);

function apiReq(path, method, body, cb) {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: path,
    method: method || 'GET',
    headers: {
      'Host': 'admin.ads-merchants-asia.com',
      'Cookie': 'admin_token=' + token,
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

apiReq('/api/admin/sessions', 'GET', null, (res) => {
  console.log('SESSIONS API SUCCESS:', res.success, 'Count:', res.count);
  apiReq('/api/admin/users', 'GET', null, (uRes) => {
    console.log('USERS API SUCCESS:', uRes.success, 'Total users:', uRes.users.length, 'Online count:', uRes.online_count);
    const firstUser = uRes.users[0];
    console.log('First user:', firstUser.fullname, 'ID:', firstUser.id, 'Online:', firstUser.is_online, 'Balance:', firstUser.balance);

    // Test assign-task endpoint with pushImmediate: false
    apiReq('/api/admin/users/assign-task', 'POST', {
      userId: firstUser.id,
      orderNum: 5,
      deficitAmount: 25.00,
      productName: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
      productPrice: 3674.00,
      pushImmediate: false
    }, (taskRes) => {
      console.log('ASSIGN-TASK SCHEDULE SUCCESS:', taskRes.success, 'Message:', taskRes.message);

      // Clear override to leave clean
      apiReq('/api/admin/users/assign-task', 'POST', {
        userId: firstUser.id,
        clearCustom: true
      }, (clearRes) => {
        console.log('CLEAR TASK SUCCESS:', clearRes.success, 'Message:', clearRes.message);
        process.exit(0);
      });
    });
  });
});
