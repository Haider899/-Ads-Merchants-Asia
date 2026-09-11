const db = require('../server/db');

async function main() {
  const users = await db.query("SELECT * FROM users WHERE username = 'Testing1'");
  console.log('USER:', users[0]);
  if (users[0]) {
    const tasks = await db.query("SELECT id, product_name, product_price, commission_earned, status, order_num, is_deficit, deficit_amount, created_at FROM tasks WHERE user_id = ? ORDER BY id ASC", [users[0].id]);
    console.log('TASKS COUNT:', tasks.length);
    console.log('TASKS:', tasks);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
