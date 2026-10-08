/**
 * Database & Storage Cleanup and Optimization Script
 * Ads Merchants Asia Platform
 * 
 * Safely clears test transactions, operational debris, and uploaded test attachments
 * while preserving Admin accounts, User accounts, System Settings, and Product Catalogs.
 * Also runs OPTIMIZE TABLE on MySQL tables to reclaim storage and defragment indexes.
 * 
 * Usage:
 *   node server/scripts/clean_and_optimize.js                (Clears test data, resets operational state to 0.00, optimizes)
 *   node server/scripts/clean_and_optimize.js --keep-balances (Clears test transactions but keeps user.balance & commission_balance)
 *   node server/scripts/clean_and_optimize.js --optimize-only (Skips data deletion, only defragments and optimizes tables)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const args = process.argv.slice(2);
const isOptimizeOnly = args.includes('--optimize-only');
const keepBalances = args.includes('--keep-balances');

async function main() {
  console.log('=====================================================');
  console.log('  Ads Merchants Asia - Cleanup & Optimization Tool');
  console.log('=====================================================');
  console.log(`Execution Mode: ${isOptimizeOnly ? 'OPTIMIZE ONLY' : 'FULL CLEANUP & OPTIMIZATION'}`);
  if (!isOptimizeOnly) {
    console.log(`User Balances: ${keepBalances ? 'PRESERVE EXISTING BALANCES' : 'RESET TO 0.00 (RECOMMENDED FOR TEST PURGE)'}`);
  }
  console.log('-----------------------------------------------------');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: (process.env.DB_PASSWORD || process.env.DB_PASS || '').replace(/^['"]|['"]$/g, ''),
    database: process.env.DB_NAME || 'ads_merchants_db'
  });

  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('✓ Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'ads_merchants_db'));
  } catch (err) {
    console.error('✗ Failed to connect to MySQL database:', err.message);
    process.exit(1);
  }

  if (!isOptimizeOnly) {
    console.log('\n[1/3] Purging test transactions and operational debris...');

    const tablesToClear = [
      'orders',
      'tasks',
      'deposits',
      'withdrawals',
      'wallet_transactions',
      'notifications',
      'chat_messages',
      'support_tickets',
      'admin_audit_logs',
      'kyc_submissions'
    ];

    for (const table of tablesToClear) {
      try {
        const [countBefore] = await pool.query(`SELECT COUNT(*) as c FROM ${table}`).catch(() => [[{ c: 0 }]]);
        const deletedCount = countBefore[0]?.c || 0;
        await pool.query(`DELETE FROM ${table}`).catch(async () => {
          // If foreign key constraint trips, fallback with check disabled
          await pool.query('SET FOREIGN_KEY_CHECKS = 0');
          await pool.query(`TRUNCATE TABLE ${table}`);
          await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        });
        console.log(`  ✓ Table '${table}': Cleared ${deletedCount} record(s)`);
      } catch (err) {
        console.warn(`  ! Note for '${table}': ${err.message}`);
      }
    }

    console.log('\n[2/3] Resetting user operational cycles & task counters...');
    try {
      const balanceClause = keepBalances
        ? ''
        : 'balance = 0.00, commission_balance = 0.00, ';

      const updateQuery = `
        UPDATE users SET
          ${balanceClause}
          frozen_balance = 0.00,
          today_profit = 0.00,
          today_tasks_completed = 0,
          total_tasks_completed = 0,
          current_set = 1,
          kyc_status = 'none',
          kyc_notes = NULL,
          custom_order_num = NULL,
          custom_deficit_amount = NULL,
          custom_product_name = NULL,
          custom_product_price = NULL,
          custom_product_selection = NULL,
          task_sequence_plan = NULL,
          last_reset_date = NULL,
          tasks_reset_at = NULL
      `;
      const [updateResult] = await pool.query(updateQuery);
      console.log(`  ✓ Users updated: ${updateResult.affectedRows} account(s) reset to fresh operational cycle.`);
    } catch (err) {
      console.error('  ✗ Error resetting users:', err.message);
    }

    // Disk Cleanup: Chat image uploads
    console.log('\n[File Storage] Cleaning up uploaded test chat attachments...');
    const chatDirs = [
      path.join(__dirname, '..', '..', 'client', 'assets', 'uploads', 'chat'),
      path.join(__dirname, '..', '..', 'assets', 'uploads', 'chat')
    ];

    let filesRemoved = 0;
    for (const chatDir of chatDirs) {
      if (fs.existsSync(chatDir)) {
        const files = fs.readdirSync(chatDir);
        for (const file of files) {
          if (file === '.gitkeep') continue;
          try {
            fs.unlinkSync(path.join(chatDir, file));
            filesRemoved++;
          } catch (e) {
            console.warn(`  ! Could not remove file ${file}:`, e.message);
          }
        }
      } else {
        fs.mkdirSync(chatDir, { recursive: true });
        fs.writeFileSync(path.join(chatDir, '.gitkeep'), '');
      }
    }
    console.log(`  ✓ Removed ${filesRemoved} uploaded chat attachment file(s) from disk.`);
    console.log('  ✓ Product catalog images, logos, and contract templates safely preserved.');
  }

  // Database Optimization
  console.log(`\n[${isOptimizeOnly ? '1/1' : '3/3'}] Optimizing MySQL database tables (Defragmenting & Rebuilding Indexes)...`);
  const allTables = [
    'users',
    'admins',
    'settings',
    'products',
    'orders',
    'tasks',
    'deposits',
    'withdrawals',
    'kyc_submissions',
    'wallet_transactions',
    'notifications',
    'chat_messages',
    'support_tickets',
    'admin_audit_logs'
  ];

  for (const table of allTables) {
    try {
      const [res] = await pool.query(`OPTIMIZE TABLE ${table}`);
      const statusMsg = res && res[0] ? (res[0].Msg_text || 'Table is up to date') : 'OK';
      console.log(`  ✓ Optimized '${table}': ${statusMsg}`);
    } catch (err) {
      console.warn(`  ! Table '${table}' optimize notice:`, err.message);
    }
  }

  await pool.end();
  console.log('\n=====================================================');
  console.log('  Cleanup & Optimization Completed Successfully!');
  console.log('=====================================================\n');
}

main().catch(err => {
  console.error('\nFatal error during cleanup & optimization:', err);
  process.exit(1);
});
