const db = require('../server/db');

async function main() {
  const cols1 = await db.query('SHOW COLUMNS FROM users LIKE ?', ['custom_daily_limit']);
  console.log('custom_daily_limit:', cols1.length > 0 ? 'EXISTS' : 'NOT FOUND');
  
  const cols2 = await db.query('SHOW COLUMNS FROM users LIKE ?', ['last_reset_date']);
  console.log('last_reset_date:', cols2.length > 0 ? 'EXISTS' : 'NOT FOUND');
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
