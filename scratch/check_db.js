const db = require('../server/db');

async function main() {
  const products = await db.query('SELECT id, name, price, image FROM products ORDER BY price ASC LIMIT 10');
  console.log('Sample Products:', products);

  const tasksDesc = await db.query('DESCRIBE tasks');
  console.log('Tasks Columns:', tasksDesc.map(c => c.Field));

  const tasks = await db.query('SELECT * FROM tasks ORDER BY id DESC LIMIT 5');
  console.log('Recent Tasks:', tasks);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
