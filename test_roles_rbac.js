const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const db = require('./server/db');
const { JWT_SECRET } = require('./server/middleware/auth');
const adminRoutes = require('./server/routes/admin');

// Setup express test server
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminRoutes);

let server;
const TEST_PORT = 3999;

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function makeToken(role, email = 'test@example.com', fullname = 'Test User') {
  return jwt.sign(
    {
      isAdmin: true,
      id: 'adm_test_' + role,
      email,
      fullname,
      role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE');
  console.log('====================================================\n');

  // Ensure test user 1001 exists
  let testUser = await db.findUserById('1001');
  if (!testUser) {
    try {
      await db.createUser({
        id: '1001',
        fullname: 'Test User',
        username: 'testuser',
        email: 'testuser@test.com',
        phone: '',
        gender: 'Male',
        password_hash: '$2a$10$rivBQfrtPN44a4B0xCVmbu9y/EuyazJLNC0L433WMnO18yJKTYSfi',
        vip_level: 'Bronze',
        balance: 100,
        frozen_balance: 0,
        status: 'active'
      });
    } catch (_) {}
  }

  server = app.listen(TEST_PORT);

  const roles = [
    { role: 'super_admin', label: 'Super Administrator (Master Access)' },
    { role: 'sub_admin', label: 'Sub-Admin (Full Management Access)' },
    { role: 'support', label: 'Support Operator (Chat & KYC Review)' },
    { role: 'finance', label: 'Finance Officer (Deposits & Withdrawals)' }
  ];

  const testCases = [
    {
      name: 'GET /api/admin/metrics (Dashboard Stats)',
      method: 'GET',
      path: '/api/admin/metrics',
      expected: { super_admin: 200, sub_admin: 200, support: 200, finance: 200 }
    },
    {
      name: 'GET /api/admin/users (Users List)',
      method: 'GET',
      path: '/api/admin/users',
      expected: { super_admin: 200, sub_admin: 200, support: 200, finance: 200 }
    },
    {
      name: 'POST /api/admin/users/update (User Balance & VIP)',
      method: 'POST',
      path: '/api/admin/users/update',
      body: { userId: '1001', add_balance: 0 },
      expected: { super_admin: 200, sub_admin: 200, support: 403, finance: 200 }
    },
    {
      name: 'POST /api/admin/users/reset-password (User Password Reset)',
      method: 'POST',
      path: '/api/admin/users/reset-password',
      body: { userId: '1001', newPassword: 'newpassword123' },
      expected: { super_admin: 200, sub_admin: 200, support: 403, finance: 403 }
    },
    {
      name: 'GET /api/admin/deposits (Deposits List)',
      method: 'GET',
      path: '/api/admin/deposits',
      expected: { super_admin: 200, sub_admin: 200, support: 403, finance: 200 }
    },
    {
      name: 'POST /api/admin/deposits/action (Approve/Reject Deposit)',
      method: 'POST',
      path: '/api/admin/deposits/action',
      body: { depositId: 'nonexistent', action: 'approve' },
      // Expect 404 for authorized (since depositId doesn't exist), but 403 for unauthorized support!
      expected: { super_admin: 404, sub_admin: 404, support: 403, finance: 404 }
    },
    {
      name: 'GET /api/admin/withdrawals (Withdrawals List)',
      method: 'GET',
      path: '/api/admin/withdrawals',
      expected: { super_admin: 200, sub_admin: 200, support: 403, finance: 200 }
    },
    {
      name: 'POST /api/admin/withdrawals/action (Approve/Reject Withdrawal)',
      method: 'POST',
      path: '/api/admin/withdrawals/action',
      body: { withdrawalId: 'nonexistent', action: 'approve' },
      expected: { super_admin: 404, sub_admin: 404, support: 403, finance: 404 }
    },
    {
      name: 'GET /api/admin/kyc (KYC Submissions List)',
      method: 'GET',
      path: '/api/admin/kyc',
      expected: { super_admin: 200, sub_admin: 200, support: 200, finance: 403 }
    },
    {
      name: 'POST /api/admin/kyc/action (Approve/Reject KYC)',
      method: 'POST',
      path: '/api/admin/kyc/action',
      body: { kycId: 'nonexistent', action: 'approve' },
      expected: { super_admin: 404, sub_admin: 404, support: 404, finance: 403 }
    },
    {
      name: 'GET /api/admin/chat/conversations (Chat Threads List)',
      method: 'GET',
      path: '/api/admin/chat/conversations',
      expected: { super_admin: 200, sub_admin: 200, support: 200, finance: 403 }
    },
    {
      name: 'GET /api/admin/tickets (Support Tickets)',
      method: 'GET',
      path: '/api/admin/tickets',
      expected: { super_admin: 200, sub_admin: 200, support: 200, finance: 403 }
    },
    {
      name: 'GET /api/admin/settings (Platform Settings)',
      method: 'GET',
      path: '/api/admin/settings',
      expected: { super_admin: 200, sub_admin: 403, support: 403, finance: 403 }
    },
    {
      name: 'POST /api/admin/settings (Update Settings)',
      method: 'POST',
      path: '/api/admin/settings',
      body: { min_deposit: 20 },
      expected: { super_admin: 200, sub_admin: 403, support: 403, finance: 403 }
    },
    {
      name: 'GET /api/admin/staff (List Staff)',
      method: 'GET',
      path: '/api/admin/staff',
      expected: { super_admin: 200, sub_admin: 403, support: 403, finance: 403 }
    },
    {
      name: 'POST /api/admin/staff/create (Create Staff Account)',
      method: 'POST',
      path: '/api/admin/staff/create',
      body: { fullname: 'Test Operator', email: 'op_' + Date.now() + '@test.com', password: 'password123', role: 'support' },
      expected: { super_admin: 200, sub_admin: 403, support: 403, finance: 403 }
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const roleObj of roles) {
    console.log(`\n----------------------------------------------------`);
    console.log(`👤 TESTING ROLE: ${roleObj.label} [${roleObj.role}]`);
    console.log(`----------------------------------------------------`);

    const token = makeToken(roleObj.role, `${roleObj.role}@test.com`);
    const headers = { Authorization: `Bearer ${token}` };

    for (const tc of testCases) {
      totalTests++;
      const expectedStatus = tc.expected[roleObj.role];

      try {
        const res = await request(tc.method, tc.path, headers, tc.body);
        const actualStatus = res.status;

        const isPass = (actualStatus === expectedStatus);
        if (isPass) {
          passedTests++;
          console.log(`  ✅ [PASS] ${tc.name} -> Got ${actualStatus} (Expected ${expectedStatus})`);
        } else {
          failedTests++;
          console.log(`  ❌ [FAIL] ${tc.name} -> Got ${actualStatus} (Expected ${expectedStatus})`);
          console.log(`     Response body:`, res.body || res.raw);
        }
      } catch (err) {
        failedTests++;
        console.log(`  ❌ [ERROR] ${tc.name} -> Request failed:`, err.message);
      }
    }
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL TEST RESULTS:`);
  console.log(`   Total Tests Executed: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('====================================================\n');

  server.close();
  process.exit(failedTests === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  if (server) server.close();
  process.exit(1);
});
