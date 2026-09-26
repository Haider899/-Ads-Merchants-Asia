require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../server/db');

async function main() {
  const users = await db.query("SELECT * FROM users WHERE username = 'Testing1'");
  if (!users.length) {
    console.log('User Testing1 not found');
    process.exit(0);
  }
  const u = users[0];
  console.log('=== USER TESTING1 ===');
  console.log({
    id: u.id,
    username: u.username,
    balance: u.balance,
    frozen_balance: u.frozen_balance,
    today_profit: u.today_profit,
    today_tasks_completed: u.today_tasks_completed,
    current_set: u.current_set,
    custom_order_num: u.custom_order_num
  });

  const tasks = await db.query("SELECT id, product_name, product_price, commission_earned, status, order_num, is_deficit, deficit_amount, created_at FROM tasks WHERE user_id = ? ORDER BY id ASC", [u.id]);
  console.log(`=== TASKS (${tasks.length}) ===`);
  tasks.forEach((t, i) => {
    console.log(`${i+1}. [${t.status}] Order #${t.order_num}: ${t.product_name.substring(0, 30)}... | $${t.product_price} | Earned: $${t.commission_earned} | Deficit: $${t.deficit_amount} | ID: ${t.id} | ${t.created_at}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
