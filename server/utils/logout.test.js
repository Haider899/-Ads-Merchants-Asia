const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../routes/auth');

test('user logout endpoint clears the auth cookie', async (t) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  await new Promise(resolve => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/logout`, {
    headers: { Cookie: 'token=stale-token' }
  });
  const setCookie = response.headers.get('set-cookie') || '';
  assert.equal(response.status, 200);
  assert.match(setCookie, /token=;/);
  assert.match(setCookie, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
});

test('user-facing logout links use the server logout route', async () => {
  const { readdir, readFile } = require('node:fs/promises');
  const files = (await readdir('views')).filter(file => file.endsWith('.html'));
  for (const file of files) {
    const html = await readFile(`views/${file}`, 'utf8');
    assert.doesNotMatch(html, /class="logout-button" href="login\.html"/,
      `${file} still sends logout users directly to login.html`);
  }
});
