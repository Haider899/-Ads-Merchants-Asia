const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const db = require('./server/db');
const { authMiddleware, JWT_SECRET } = require('./server/middleware/auth');

test('deleted account session is rejected and its cookie is cleared', async (t) => {
  const originalFindUserById = db.findUserById;
  const originalFindUserByIdentifier = db.findUserByIdentifier;
  db.findUserById = async () => null;
  db.findUserByIdentifier = async () => null;

  const app = express();
  app.use(cookieParser());
  app.get('/protected', authMiddleware, (req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');

  t.after(async () => {
    db.findUserById = originalFindUserById;
    db.findUserByIdentifier = originalFindUserByIdentifier;
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });

  await new Promise(resolve => server.once('listening', resolve));
  const token = jwt.sign({ id: 'deleted-user', email: 'deleted@example.test' }, JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`, {
    headers: { Cookie: `token=${token}` }
  });
  const setCookie = response.headers.get('set-cookie') || '';

  assert.equal(response.status, 401);
  assert.match(setCookie, /token=;/);
  assert.match(setCookie, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
});