const db = require('../server/db');

async function main() {
  const users = await db.getUsers();
  const user = users.find(u => u.username && u.username.toLowerCase() === 'testing1');
  if (!user) {
    console.log('Testing1 not found');
    process.exit(0);
  }
  console.log('Testing1 user:', { id: user.id, username: user.username, balance: user.balance });
  const tasks = await db.getTasks(user.id);
  console.log('Testing1 tasks:', JSON.stringify(tasks, null, 2));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
