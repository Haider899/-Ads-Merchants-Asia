const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: (process.env.DB_PASSWORD || process.env.DB_PASS || '').replace(/^['"]|['"]$/g, ''),
    database: process.env.DB_NAME || 'ads_merchants_db'
  });

  console.log('Connecting to database...');

  // 1. Add columns to users table
  const userColumns = [
    { name: 'custom_order_num', type: 'INT DEFAULT NULL' },
    { name: 'custom_deficit_amount', type: 'DECIMAL(15,2) DEFAULT NULL' },
    { name: 'custom_product_name', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'custom_product_price', type: 'DECIMAL(15,2) DEFAULT NULL' },
    { name: 'custom_daily_limit', type: 'INT DEFAULT NULL' },
    { name: 'custom_min_withdraw', type: 'DECIMAL(15,2) DEFAULT NULL' },
    { name: 'last_reset_date', type: 'DATE DEFAULT NULL' },
    { name: 'country_code', type: 'VARCHAR(10) DEFAULT NULL' },
    { name: 'country_name', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'last_ip', type: 'VARCHAR(60) DEFAULT NULL' }
  ];

  for (const col of userColumns) {
    try {
      const [chk] = await pool.query(`SHOW COLUMNS FROM users LIKE '${col.name}'`);
      if (chk.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to users table.`);
      } else {
        console.log(`Column ${col.name} already exists in users table.`);
      }
    } catch (err) {
      console.error(`Error checking/adding column ${col.name}:`, err.message);
    }
  }

  // 2. Ensure chat_messages table and columns
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      sender VARCHAR(20) DEFAULT 'user',
      message_text TEXT,
      read_by_admin BOOLEAN DEFAULT FALSE,
      read_by_user BOOLEAN DEFAULT FALSE,
      ip_address VARCHAR(60) DEFAULT NULL,
      country_code VARCHAR(10) DEFAULT NULL,
      country_name VARCHAR(100) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id),
      INDEX (created_at)
    )`);

    const chatColumns = [
      { name: 'ip_address', type: 'VARCHAR(60) DEFAULT NULL' },
      { name: 'country_code', type: 'VARCHAR(10) DEFAULT NULL' },
      { name: 'country_name', type: 'VARCHAR(100) DEFAULT NULL' }
    ];

    for (const col of chatColumns) {
      const [chk] = await pool.query(`SHOW COLUMNS FROM chat_messages LIKE '${col.name}'`);
      if (chk.length === 0) {
        await pool.query(`ALTER TABLE chat_messages ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to chat_messages.`);
      }
    }
  } catch (err) {
    console.error('Error ensuring chat_messages schema:', err.message);
  }

  // 3. Update vip_rates setting
  try {
    const vipRates = {
      Bronze: { commission: 0.20, min_balance: 0, max_tasks: 38 },
      Silver: { commission: 0.30, min_balance: 500, max_tasks: 45 },
      Gold: { commission: 0.40, min_balance: 2000, max_tasks: 55 },
      Diamond: { commission: 0.50, min_balance: 5000, max_tasks: 65 }
    };
    const val = JSON.stringify(vipRates);
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES ('vip_rates', ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
      [val, val]
    );
    console.log('Successfully updated vip_rates setting in database.');
  } catch (err) {
    console.error('Error updating vip_rates setting:', err.message);
  }

  await pool.end();
  console.log('Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
