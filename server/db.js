const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { calculateDepositContractMatch } = require('./utils/depositContractMatch');
const { calculateSecondContractFunding } = require('./utils/contractFunding');
const { isDeficitFlag } = require('./utils/taskFunding');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: (process.env.DB_PASSWORD || process.env.DB_PASS || '').replace(/^['"]|['"]$/g, ''),
  database: process.env.DB_NAME || 'ads_merchants_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function formatMySQLDate(val) {
  if (!val) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof val === 'string') {
    if (val.includes('T')) {
      return val.slice(0, 19).replace('T', ' ');
    }
    return val;
  }
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Helper for queries
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// In-memory guard flags to prevent repetitive table metadata locks and DDL execution on every query
let _productionSchemaEnsured = false;
let _tasksTableEnsured = false;
let _adminsTableEnsured = false;
let _chatMessagesTableEnsured = false;
let _notificationsTableEnsured = false;
let _userTaskSettingColsEnsured = false;
let _financialTablesEnsured = false;
let _legacyVerifiedDepositsMigrated = false;
let _cachedUserCols = null;
let _productsTableEnsured = false;
let _generatedCatalogRemoved = false;
let _cachedProducts = null;
let _lastProductsFetch = 0;

async function getUserColumns() {
  if (_cachedUserCols && _cachedUserCols.size > 0) return _cachedUserCols;
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM users');
    if (Array.isArray(cols)) {
      _cachedUserCols = new Set(cols.map(c => c.Field.toLowerCase()));
    }
  } catch (_) {}
  return _cachedUserCols || new Set();
}

async function removeGeneratedCatalogProducts() {
  if (_generatedCatalogRemoved) return;
  try {
    await query("DELETE FROM products WHERE sku LIKE 'INTL-%'");
    _generatedCatalogRemoved = true;
  } catch (_) {
    // The table/sku column may not exist until product setup completes.
  }
}

async function ensureUserTaskSettingColumns() {
  if (_userTaskSettingColsEnsured) return;
  try {
    let existingColNames = await getUserColumns();

    const columns = [
      { name: 'status', type: "VARCHAR(50) DEFAULT 'active'" },
      { name: 'kyc_status', type: "VARCHAR(50) DEFAULT 'none'" },
      { name: 'kyc_notes', type: 'TEXT DEFAULT NULL' },
      { name: 'country_code', type: 'VARCHAR(10) DEFAULT NULL' },
      { name: 'country_name', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'last_ip', type: 'VARCHAR(60) DEFAULT NULL' },
      { name: 'custom_order_num', type: 'INT DEFAULT NULL' },
      { name: 'custom_deficit_amount', type: 'DECIMAL(15,2) DEFAULT NULL' },
      { name: 'custom_product_name', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'custom_product_price', type: 'DECIMAL(15,2) DEFAULT NULL' },
      { name: 'custom_product_selection', type: 'TEXT DEFAULT NULL' },
      { name: 'custom_daily_limit', type: 'INT DEFAULT NULL' },
      { name: 'custom_min_withdraw', type: 'DECIMAL(15,2) DEFAULT NULL' },
      { name: 'custom_min_deposit', type: 'DECIMAL(15,2) DEFAULT NULL' },
      { name: 'task_sequence_plan', type: 'TEXT DEFAULT NULL' },
      { name: 'last_reset_date', type: 'DATE DEFAULT NULL' },
      { name: 'tasks_reset_at', type: 'DATETIME DEFAULT NULL' },
      { name: 'commission_balance', type: 'DECIMAL(15,2) DEFAULT 0.00' }
    ];

    for (const col of columns) {
      if (!existingColNames.has(col.name.toLowerCase())) {
        try {
          await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`[DB] Successfully added column users.${col.name}`);
          existingColNames.add(col.name.toLowerCase());
        } catch (addErr) {
          if (addErr.errno === 1060 || addErr.code === 'ER_DUP_FIELDNAME') {
            existingColNames.add(col.name.toLowerCase());
          } else {
            console.error(`[DB] Notice adding column users.${col.name}:`, addErr.message);
          }
        }
      }
    }
    _cachedUserCols = existingColNames;
    _userTaskSettingColsEnsured = true;
  } catch (err) {
    console.error('[DB] User task setting columns ensure notice:', err.message);
  }
}

const db = {
  query: query,
  ensureUserTaskSettingColumns,
  ensureFinancialTables: async () => {
    if (_financialTablesEnsured) return;
    try {
      await query(`CREATE TABLE IF NOT EXISTS deposits (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255),
        amount DECIMAL(15,2),
        method VARCHAR(50),
        txid VARCHAR(255),
        proof_image LONGTEXT,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (created_at)
      )`);
      await query(`ALTER TABLE deposits MODIFY proof_image LONGTEXT`).catch(() => {});
    } catch (e) {
      console.log('[DB] ensureFinancialTables deposits notice:', e.message);
    }

    try {
      await query(`CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255),
        amount DECIMAL(15,2),
        bank_name VARCHAR(255),
        account_name VARCHAR(255),
        account_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (created_at)
      )`);
      _financialTablesEnsured = true;
    } catch (e) {
      console.log('[DB] ensureFinancialTables withdrawals notice:', e.message);
    }
  },
  ensureProductionSchema: async () => {
    await ensureUserTaskSettingColumns();
    await db.ensureFinancialTables();
    await db.ensureAdminsTable();
    try {
      const cols = await query('SHOW COLUMNS FROM kyc_submissions');
      const names = new Set(cols.map(c => c.Field.toLowerCase()));
      if (!names.has('funding_source')) await query("ALTER TABLE kyc_submissions ADD COLUMN funding_source VARCHAR(30) DEFAULT 'deposit'");
      if (!names.has('funded_amount')) await query('ALTER TABLE kyc_submissions ADD COLUMN funded_amount DECIMAL(15,2) DEFAULT 0.00');
    } catch (_) {}
    await db.migrateLegacyVerifiedDeposits();
  },

  migrateLegacyVerifiedDeposits: async () => {
    if (_legacyVerifiedDepositsMigrated) return;
    _legacyVerifiedDepositsMigrated = true;
    try {
      const legacyDeposits = await query("SELECT id FROM deposits WHERE LOWER(status) = 'verified'");
      for (const legacy of legacyDeposits) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const [rows] = await connection.execute(
            `SELECT d.*, u.balance, u.frozen_balance
             FROM deposits d JOIN users u ON u.id = d.user_id
             WHERE d.id = ? AND LOWER(d.status) = 'verified' FOR UPDATE`,
            [legacy.id]
          );
          const deposit = rows[0];
          if (!deposit) {
            await connection.rollback();
            continue;
          }
          const amountCents = Math.max(0, Math.round(Number(deposit.amount || 0) * 100));
          const beforeCents = Math.round(Number(deposit.balance || 0) * 100);
          const afterCents = beforeCents + amountCents;
          await connection.execute(
            'UPDATE users SET balance = ? WHERE id = ?',
            [(afterCents / 100).toFixed(2), deposit.user_id]
          );
          await connection.execute(
            "UPDATE deposits SET status = 'approved', admin_notes = CONCAT(COALESCE(admin_notes, ''), ' | Legacy verified deposit credited automatically') WHERE id = ? AND LOWER(status) = 'verified'",
            [deposit.id]
          );
          await connection.execute(
            `INSERT INTO wallet_transactions
              (id, user_id, transaction_type, amount, balance_before, balance_after, currency, reference, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`txn_legacy_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`, deposit.user_id, 'DEPOSIT',
              (amountCents / 100).toFixed(2), (beforeCents / 100).toFixed(2), (afterCents / 100).toFixed(2), 'USD', deposit.txid || deposit.id,
              'Legacy verified deposit credited to Working Balance', formatMySQLDate(new Date())]
          );
          await connection.commit();
        } catch (err) {
          try { await connection.rollback(); } catch (_) {}
          console.error('[DB] Legacy verified deposit migration notice:', err.message);
        } finally {
          connection.release();
        }
      }
    } catch (err) {
      console.error('[DB] Legacy verified deposit migration notice:', err.message);
    }
  },
  getSettings: async () => {
    const rows = await query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => {
      try {
        // Parse JSON for vip_rates if possible
        settings[row.setting_key] = row.setting_key === 'vip_rates' ? JSON.parse(row.setting_value) : row.setting_value;
      } catch (e) {
        settings[row.setting_key] = row.setting_value;
      }
    });
    return settings;
  },
  
  updateSettings: async (newSettings) => {
    for (const [key, value] of Object.entries(newSettings)) {
      const val = typeof value === 'object' ? JSON.stringify(value) : value;
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [key, val, val]);
    }
    return db.getSettings();
  },

  migrateDefaultWithdrawalMinimumToTen: async () => {
    const migrationKey = 'migration_default_withdraw_minimum_10_v1';
    const completed = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [migrationKey]);
    if (completed.length) return false;

    const current = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['min_withdraw']);
    if (!current.length) {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['min_withdraw', '10']);
    } else if (Number(current[0].setting_value) === 30) {
      await query('UPDATE settings SET setting_value = ? WHERE setting_key = ? AND setting_value = ?', ['10', 'min_withdraw', current[0].setting_value]);
    }

    await query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', [migrationKey, new Date().toISOString()]);
    return true;
  },

  migrateDefaultDepositMinimumToTen: async () => {
    const migrationKey = 'migration_default_deposit_minimum_10_v1';
    const completed = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [migrationKey]);
    if (completed.length) return false;
    const current = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['min_deposit']);
    if (!current.length) {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['min_deposit', '10']);
    } else if (Number(current[0].setting_value) === 20) {
      await query('UPDATE settings SET setting_value = ? WHERE setting_key = ? AND setting_value = ?', ['10', 'min_deposit', current[0].setting_value]);
    }
    await query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', [migrationKey, new Date().toISOString()]);
    return true;
  },
  migrateDefaultDepositMinimumToOne: async () => {
    const migrationKey = 'migration_default_deposit_minimum_1_v1';
    const completed = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [migrationKey]);
    if (completed.length) return false;
    const current = await query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['min_deposit']);
    if (!current.length) {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['min_deposit', '1']);
    } else if (Number(current[0].setting_value) === 10) {
      await query('UPDATE settings SET setting_value = ? WHERE setting_key = ? AND setting_value = ?', ['1', 'min_deposit', current[0].setting_value]);
    }
    await query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', [migrationKey, new Date().toISOString()]);
    return true;
  },

  formatUser: (u) => {
    if (!u) return null;
    return {
      ...u,
      balance: parseFloat(u.balance || 0),
      frozen_balance: parseFloat(u.frozen_balance || 0),
      commission_balance: parseFloat(u.commission_balance || 0),
      today_profit: parseFloat(u.today_profit || 0),
      today_tasks_completed: parseInt(u.today_tasks_completed || 0, 10),
      total_tasks_completed: parseInt(u.total_tasks_completed || 0, 10),
      current_set: parseInt(u.current_set || 0, 10),
      custom_order_num: u.custom_order_num ? parseInt(u.custom_order_num, 10) : null,
      custom_deficit_amount: u.custom_deficit_amount !== null && u.custom_deficit_amount !== undefined ? parseFloat(u.custom_deficit_amount) : null,
      custom_product_price: u.custom_product_price !== null && u.custom_product_price !== undefined ? parseFloat(u.custom_product_price) : null,
      custom_product_selection: (() => {
        if (!u.custom_product_selection) return [];
        try {
          const parsed = typeof u.custom_product_selection === 'string' ? JSON.parse(u.custom_product_selection) : u.custom_product_selection;
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
      })(),
      custom_daily_limit: u.custom_daily_limit !== null && u.custom_daily_limit !== undefined ? parseInt(u.custom_daily_limit, 10) : null,
      custom_min_withdraw: u.custom_min_withdraw !== null && u.custom_min_withdraw !== undefined ? parseFloat(u.custom_min_withdraw) : null,
      custom_min_deposit: u.custom_min_deposit !== null && u.custom_min_deposit !== undefined ? parseFloat(u.custom_min_deposit) : null,
      task_sequence_plan: (() => {
        if (!u.task_sequence_plan) return null;
        try {
          return typeof u.task_sequence_plan === 'string' ? JSON.parse(u.task_sequence_plan) : u.task_sequence_plan;
        } catch {
          return null;
        }
      })(),
      last_reset_date: u.last_reset_date || null,
      tasks_reset_at: u.tasks_reset_at ? (u.tasks_reset_at instanceof Date ? u.tasks_reset_at.toISOString() : String(u.tasks_reset_at)) : null
    };
  },

  getUsers: async () => {
    const rows = await query('SELECT * FROM users ORDER BY created_at DESC, id DESC');
    return rows.map(db.formatUser);
  },

  findUserById: async (id) => {
    const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
    return db.formatUser(rows[0]);
  },

  findUserByIdentifier: async (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR (phone != "" AND phone IS NOT NULL AND phone = ?)', [clean, clean, clean]);
    return db.formatUser(rows[0]);
  },

  getNextUserId: async () => {
    try {
      const rows = await query(`
        SELECT id FROM users 
        WHERE id REGEXP '^[0-9]+$' 
        ORDER BY CAST(id AS UNSIGNED) DESC 
        LIMIT 1
      `);
      if (rows && rows.length > 0) {
        const highest = parseInt(rows[0].id, 10);
        if (!isNaN(highest) && highest >= 1000) {
          return String(highest + 1);
        }
      }
    } catch (e) {
      console.error('Error fetching max user id:', e);
    }
    return '1001';
  },

  migrateUserIdsToSequential: async () => {
    try {
      await ensureUserTaskSettingColumns();

      const nonNumericUsers = await query(`
        SELECT id, created_at FROM users 
        WHERE id NOT REGEXP '^[0-9]+$' 
        ORDER BY created_at ASC
      `);
      if (!nonNumericUsers || nonNumericUsers.length === 0) return;

      console.log(`[MIGRATION] Found ${nonNumericUsers.length} legacy user IDs to convert to sequential 1000+ IDs...`);
      
      try { await query('SET FOREIGN_KEY_CHECKS = 0'); } catch (_) {}
      
      for (const u of nonNumericUsers) {
        const nextId = await db.getNextUserId();
        const oldId = u.id;
        
        await query('UPDATE users SET id = ? WHERE id = ?', [nextId, oldId]);
        await query('UPDATE deposits SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE withdrawals SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE tasks SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE kyc_submissions SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE support_tickets SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE notifications SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        await query('UPDATE chat_messages SET user_id = ? WHERE user_id = ?', [nextId, oldId]);
        
        console.log(`[MIGRATION] Successfully migrated user ${oldId} -> ${nextId}`);
      }
      
      // Clean up legacy placeholder phone numbers
      try {
        await query("UPDATE users SET phone = '' WHERE phone = '0000000000' OR phone REGEXP '^0+$'");
      } catch (_) {}

      try { await query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    } catch (err) {
      console.error('[MIGRATION ERROR] Could not migrate legacy user IDs:', err);
      try { await query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    }
  },

  createUser: async (userData) => {
    await ensureUserTaskSettingColumns();
    const id = userData.id || (await db.getNextUserId());

    const existingCols = await getUserColumns();

    const fields = [
      'id', 'fullname', 'username', 'email', 'phone', 'gender', 'password_hash', 
      'vip_level', 'balance', 'frozen_balance', 'today_profit', 
      'today_tasks_completed', 'total_tasks_completed', 'current_set', 'invite_code'
    ];
    const vals = [
      id, userData.fullname || '', userData.username || '', userData.email || '', 
      userData.phone || '', userData.gender || 'Male', userData.password_hash || '', 
      userData.vip_level || 'Bronze', userData.balance || 0, userData.frozen_balance || 0, 
      userData.today_profit || 0, userData.today_tasks_completed || 0, 
      userData.total_tasks_completed || 0, userData.current_set || 0, userData.invite_code || ''
    ];

    if (!existingCols.size || existingCols.has('status')) {
      fields.push('status');
      vals.push(userData.status || 'active');
    }
    if (existingCols.has('country_code') && userData.country_code) {
      fields.push('country_code');
      vals.push(userData.country_code);
    }
    if (existingCols.has('country_name') && userData.country_name) {
      fields.push('country_name');
      vals.push(userData.country_name);
    }
    if (existingCols.has('last_ip') && userData.last_ip) {
      fields.push('last_ip');
      vals.push(userData.last_ip);
    }
    if (!existingCols.size || existingCols.has('created_at')) {
      fields.push('created_at');
      vals.push(formatMySQLDate(userData.created_at || new Date()));
    }

    const placeholders = fields.map(() => '?').join(', ');
    await query(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`, vals);
    return { ...userData, id };
  },

  updateUser: async (id, updates) => {
    if (!_userTaskSettingColsEnsured) {
      await ensureUserTaskSettingColumns();
    }

    const existingCols = await getUserColumns();

    const allowed = [
      'fullname', 'username', 'email', 'phone', 'gender', 'password_hash', 
      'vip_level', 'balance', 'frozen_balance', 'today_profit', 
      'today_tasks_completed', 'total_tasks_completed', 'current_set', 
      'invite_code', 'kyc_status', 'kyc_notes', 'status',
      'custom_order_num', 'custom_deficit_amount', 'custom_product_name', 'custom_product_price', 'custom_product_selection',
      'custom_daily_limit', 'custom_min_withdraw', 'custom_min_deposit', 'task_sequence_plan', 'last_reset_date', 'tasks_reset_at',
      'commission_balance', 'country_code', 'country_name', 'last_ip'
    ];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        if (existingCols && !existingCols.has(key.toLowerCase())) {
          console.warn(`[DB updateUser] Column '${key}' not in users table yet, skipping to avoid crash`);
          continue;
        }
        let val = updates[key];
        if ((key === 'task_sequence_plan' || key === 'custom_product_selection') && typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        } else if (key === 'tasks_reset_at' && val) {
          val = formatMySQLDate(val);
        } else if (key === 'last_reset_date' && val) {
          val = typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
        }
        filteredUpdates[key] = val;
      }
    }
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return await db.findUserById(id);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id);
    await query(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    return await db.findUserById(id);
  },

  transferTotalBalanceToWorking: async (userId, amount) => {
    await db.ensureProductionSchema();
    const user = await db.findUserById(userId);
    const funding = calculateSecondContractFunding(amount, user && user.commission_balance, user && user.balance);
    if (!funding.ok) return { success: false, ...funding };
    const numAmount = Number(funding.amount);
    const [result] = await pool.execute(
      'UPDATE users SET commission_balance = commission_balance - ?, balance = balance + ? WHERE id = ? AND commission_balance >= ?',
      [numAmount.toFixed(2), numAmount.toFixed(2), userId, numAmount.toFixed(2)]
    );
    if (!result || result.affectedRows !== 1) {
      const latest = await db.findUserById(userId);
      return { success: false, ...calculateSecondContractFunding(amount, latest && latest.commission_balance, latest && latest.balance) };
    }
    const updated = await db.findUserById(userId);
    await query(`INSERT INTO wallet_transactions
      (id, user_id, transaction_type, amount, balance_before, balance_after, currency, reference, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`, userId, 'CONTRACT_FUNDING', (-numAmount).toFixed(2),
        Number(user.balance || 0).toFixed(2), Number(updated.balance || 0).toFixed(2), 'USD', `second-contract-${Date.now()}`,
        'Second contract funded from Total Balance to Working Balance', formatMySQLDate(new Date())]);
    return { success: true, amount: numAmount.toFixed(2), totalBalanceAfter: Number(updated.commission_balance).toFixed(2), workingBalanceAfter: Number(updated.balance).toFixed(2) };
  },

  refundSecondContractFunding: async (userId, amount) => {
    await db.ensureProductionSchema();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return { success: false };
    const [result] = await pool.execute(
      'UPDATE users SET commission_balance = commission_balance + ?, balance = balance - ? WHERE id = ?',
      [numAmount.toFixed(2), numAmount.toFixed(2), userId]
    );
    if (!result || result.affectedRows !== 1) return { success: false };
    const updated = await db.findUserById(userId);
    await query(`INSERT INTO wallet_transactions
      (id, user_id, transaction_type, amount, balance_before, balance_after, currency, reference, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`, userId, 'CONTRACT_REFUND', numAmount.toFixed(2),
        Number(updated.balance || 0).toFixed(2), Number(updated.balance || 0).toFixed(2), 'USD', `second-contract-refund-${Date.now()}`,
        'Second contract funding returned after rejection', formatMySQLDate(new Date())]);
    return { success: true };
  },

  resetUserPassword: async (userId, newPlainPassword) => {
    const hash = bcrypt.hashSync(newPlainPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    return await db.findUserById(userId);
  },

  getDeposits: async (userId) => {
    await db.ensureProductionSchema();
    let sql = `
      SELECT d.*, u.username, u.fullname, u.phone, u.kyc_status
      FROM deposits d 
      LEFT JOIN users u ON d.user_id = u.id
    `;
    if (userId) {
      sql += ` WHERE d.user_id = ? ORDER BY d.created_at DESC`;
      return await query(sql, [userId]);
    }
    sql += ` ORDER BY d.created_at DESC`;
    return await query(sql);
  },

  createDeposit: async (depositData) => {
    await db.ensureFinancialTables();
    await query(`INSERT INTO deposits (id, user_id, user_email, amount, method, txid, proof_image, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [depositData.id, depositData.user_id, depositData.user_email || '', depositData.amount, depositData.method || 'TRC20', depositData.txid || '', depositData.proof_image || '', depositData.status || 'pending', depositData.admin_notes || '', formatMySQLDate(depositData.created_at || new Date())]);
    return depositData;
  },

  updateDeposit: async (id, updates) => {
    const allowed = ['user_id', 'user_email', 'amount', 'method', 'txid', 'proof_image', 'status', 'admin_notes', 'created_at'];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        filteredUpdates[key] = key === 'created_at' ? formatMySQLDate(updates[key]) : updates[key];
      }
    }
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id);
    await query(`UPDATE deposits SET ${setClause} WHERE id = ?`, values);
  },

  processDepositDecision: async ({ depositId, adminId, action, notes = '' }) => {
    await db.ensureProductionSchema();
    await db.ensureTasksTable();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [lookupRows] = await connection.execute('SELECT user_id FROM deposits WHERE id = ?', [depositId]);
      const userId = lookupRows[0] && lookupRows[0].user_id;
      if (!userId) {
        await connection.rollback();
        return { success: false, notFound: true };
      }

      // Keep lock ordering consistent with KYC approval (user, then deposits).
      const [userRows] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
      const [depositRows] = await connection.execute('SELECT * FROM deposits WHERE id = ? FOR UPDATE', [depositId]);
      const user = userRows[0];
      const deposit = depositRows[0];
      if (!user || !deposit) {
        await connection.rollback();
        return { success: false, notFound: true };
      }

      const previousStatus = String(deposit.status || 'pending').toLowerCase();
      if (action === 'approve' && previousStatus === 'approved') {
        await connection.rollback();
        return { success: true, alreadyProcessed: true, status: previousStatus, amount: Number(deposit.amount || 0), creditedAmount: 0, user: db.formatUser(user) };
      }
      if (action === 'reject' && previousStatus === 'rejected') {
        await connection.rollback();
        return { success: true, alreadyProcessed: true, status: 'rejected', amount: Number(deposit.amount || 0), creditedAmount: 0, user: db.formatUser(user) };
      }
      if (!['approve', 'reject'].includes(action)) {
        await connection.rollback();
        return { success: false, invalidAction: true };
      }

      const amountCents = Math.max(0, Math.round(Number(deposit.amount || 0) * 100));
      const balanceBeforeCents = Math.round(Number(user.balance || 0) * 100);
      let balanceAfterCents = balanceBeforeCents;
      let finalStatus;
      let creditedAmountCents = 0;
      if (action === 'approve') {
        finalStatus = 'approved';
        balanceAfterCents += amountCents;
        creditedAmountCents = amountCents;
      } else {
        finalStatus = 'rejected';
        if (previousStatus === 'approved') balanceAfterCents = Math.max(0, balanceBeforeCents - amountCents);
      }

      await connection.execute(
        'UPDATE deposits SET status = ?, admin_notes = ? WHERE id = ?',
        [finalStatus, notes || (action === 'approve' ? 'Verified on blockchain and credited to Working Balance' : 'Invalid transaction hash / receipt'), depositId]
      );

      if (balanceAfterCents !== balanceBeforeCents) {
        let frozenBalance = Number(user.frozen_balance || 0);
        if (balanceAfterCents >= 0) {
          const [pendingDeficitRows] = await connection.execute(
            'SELECT COUNT(*) AS cnt FROM tasks WHERE user_id = ? AND status = ? AND is_deficit = 1',
            [user.id, 'pending']
          );
          if (!pendingDeficitRows[0] || Number(pendingDeficitRows[0].cnt || 0) === 0) frozenBalance = 0;
        }
        await connection.execute(
          'UPDATE users SET balance = ?, frozen_balance = ? WHERE id = ?',
          [(balanceAfterCents / 100).toFixed(2), frozenBalance.toFixed(2), user.id]
        );
        const transactionId = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const ledgerAmountCents = balanceAfterCents - balanceBeforeCents;
        await connection.execute(
          `INSERT INTO wallet_transactions (
            id, user_id, admin_id, transaction_type, amount, balance_before, balance_after,
            currency, reference, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [transactionId, user.id, adminId || null, 'DEPOSIT', (ledgerAmountCents / 100).toFixed(2),
            (balanceBeforeCents / 100).toFixed(2), (balanceAfterCents / 100).toFixed(2), 'USD', deposit.txid || deposit.id,
            action === 'approve' ? `Deposit verified and credited to Working Balance (${deposit.method || 'USDT'})` : 'Previously credited deposit reversed by admin',
            formatMySQLDate(new Date())]
        );
      }

      await connection.commit();
      return {
        success: true,
        alreadyProcessed: false,
        status: finalStatus,
        amount: (amountCents / 100).toFixed(2),
        method: deposit.method || 'USDT',
        creditedAmount: (creditedAmountCents / 100).toFixed(2),
        balanceBefore: (balanceBeforeCents / 100).toFixed(2),
        balanceAfter: (balanceAfterCents / 100).toFixed(2),
        user: db.formatUser({ ...user, balance: (balanceAfterCents / 100).toFixed(2) })
      };
    } catch (err) {
      try { await connection.rollback(); } catch (_) {}
      throw err;
    } finally {
      connection.release();
    }
  },

  getWithdrawals: async (userId = null) => {
    let sql = `
      SELECT 
        w.*, 
        w.bank_name as method,
        w.account_number as wallet_address,
        u.fullname, 
        u.username
      FROM withdrawals w 
      LEFT JOIN users u ON w.user_id = u.id
    `;
    if (userId) {
      sql += ` WHERE w.user_id = ? ORDER BY w.created_at DESC`;
      return await query(sql, [userId]);
    }
    sql += ` ORDER BY w.created_at DESC`;
    return await query(sql);
  },

  createWithdrawal: async (withdrawalData) => {
    const id = withdrawalData.id || ('wth_' + Date.now());
    const bankName = withdrawalData.bank_name || withdrawalData.method || 'USDT';
    const accountName = withdrawalData.account_name || withdrawalData.account_holder || withdrawalData.user_name || 'Merchant';
    const accountNumber = withdrawalData.account_number || withdrawalData.wallet_address || withdrawalData.iban || '';

    await query(`INSERT INTO withdrawals (id, user_id, user_email, amount, bank_name, account_name, account_number, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, withdrawalData.user_id, withdrawalData.user_email || '', withdrawalData.amount, bankName, accountName, accountNumber, withdrawalData.status || 'pending', withdrawalData.admin_notes || '', formatMySQLDate(withdrawalData.created_at || new Date())]);
    return withdrawalData;
  },

  updateWithdrawal: async (id, updates) => {
    const allowed = ['user_id', 'user_email', 'amount', 'bank_name', 'account_name', 'account_number', 'status', 'admin_notes', 'created_at'];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        filteredUpdates[key] = key === 'created_at' ? formatMySQLDate(updates[key]) : updates[key];
      }
    }
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id);
    await query(`UPDATE withdrawals SET ${setClause} WHERE id = ?`, values);
  },

  // KYC Helpers
  approveKycAndReleaseVerifiedDeposits: async ({ kycId, adminId, rejectionReason = '' }) => {
    await db.ensureProductionSchema();
    await db.ensureTasksTable();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [kycRows] = await connection.execute(
        'SELECT * FROM kyc_submissions WHERE id = ? FOR UPDATE',
        [kycId]
      );
      const kyc = kycRows[0];
      if (!kyc) {
        await connection.rollback();
        return { success: false, notFound: true };
      }
      if (String(kyc.status || '').toLowerCase() === 'approved') {
        const [userRows] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [kyc.user_id]);
        if (!userRows[0]) {
          await connection.rollback();
          return { success: false, userNotFound: true };
        }
        await connection.rollback();
        return { success: true, alreadyApproved: true, user: db.formatUser(userRows[0]), releaseAmount: 0 };
      }

      const [userRows] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [kyc.user_id]);
      const user = userRows[0];
      if (!user) {
        await connection.rollback();
        return { success: false, userNotFound: true };
      }

      if (['total_balance', 'reinvest', 'balance', 'working_balance'].includes(String(kyc.funding_source || '').toLowerCase())) {
        const numInvestment = Number(kyc.investment_amount || 0);
        const source = String(kyc.funding_source || '').toLowerCase();
        const alreadyFunded = Number(kyc.funded_amount || 0) > 0 || ['balance', 'working_balance'].includes(source);
        let balanceBefore = Number(user.balance || 0).toFixed(2);
        let balanceAfter = Number(user.balance || 0).toFixed(2);

        if (!alreadyFunded && numInvestment > 0 && ['total_balance', 'reinvest'].includes(source)) {
          const [transferResult] = await connection.execute(
            'UPDATE users SET commission_balance = commission_balance - ?, balance = balance + ? WHERE id = ? AND commission_balance >= ?',
            [numInvestment.toFixed(2), numInvestment.toFixed(2), user.id, numInvestment.toFixed(2)]
          );

          if (!transferResult || transferResult.affectedRows !== 1) {
            await connection.rollback();
            return {
              success: false,
              insufficientBalance: true,
              message: `Insufficient Total Balance to fund contract amount $${numInvestment.toFixed(2)}.`
            };
          }

          balanceBefore = Number(user.balance || 0).toFixed(2);
          balanceAfter = (Number(user.balance || 0) + numInvestment).toFixed(2);

          const transactionId = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
          await connection.execute(
            `INSERT INTO wallet_transactions
              (id, user_id, admin_id, transaction_type, amount, balance_before, balance_after, currency, reference, description, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionId,
              user.id,
              adminId || null,
              'CONTRACT_FUNDING',
              (-numInvestment).toFixed(2),
              balanceBefore,
              balanceAfter,
              'USD',
              `second-contract-${Date.now()}`,
              'Second contract funded from Total Balance to Working Balance upon admin approval',
              formatMySQLDate(new Date())
            ]
          );

          await connection.execute(
            'UPDATE kyc_submissions SET funded_amount = ? WHERE id = ?',
            [numInvestment.toFixed(2), kyc.id]
          );
        }

        await connection.execute(
          'UPDATE kyc_submissions SET status = ?, rejection_reason = ? WHERE id = ?',
          ['approved', rejectionReason, kyc.id]
        );
        await connection.execute(
          'UPDATE users SET kyc_status = ?, kyc_notes = ?, today_tasks_completed = 0, current_set = 1 WHERE id = ?',
          ['approved', rejectionReason, user.id]
        );
        await connection.commit();

        const [refreshedRows] = await connection.execute('SELECT * FROM users WHERE id = ?', [user.id]).catch(() => [[user]]);
        const refreshedUser = (refreshedRows && refreshedRows[0]) || { ...user, balance: balanceAfter, kyc_status: 'approved', kyc_notes: rejectionReason, today_tasks_completed: 0, current_set: 1 };

        return {
          success: true,
          alreadyApproved: false,
          user: db.formatUser(refreshedUser),
          releaseAmount: numInvestment.toFixed(2),
          fundingSource: source,
          balanceBefore,
          balanceAfter,
          releasedDeposits: [],
          contractAmount: numInvestment.toFixed(2)
        };
      }

      const [deposits] = await connection.execute(
        `SELECT id, amount, status, method, txid
         FROM deposits
         WHERE user_id = ? AND status IN ('approved', 'verified')
         ORDER BY created_at ASC
         FOR UPDATE`,
        [user.id]
      );
      const match = calculateDepositContractMatch(kyc.investment_amount, deposits);
      const isExistingOrReinvestmentContract =
        String(user.kyc_status || '').toLowerCase() === 'approved' ||
        ['total_balance', 'reinvest', 'balance'].includes(String(kyc.funding_source || '').toLowerCase()) ||
        Number(user.total_tasks_completed || 0) > 0 ||
        Number(user.today_tasks_completed || 0) > 0;

      if (!match.matches && !isExistingOrReinvestmentContract) {
        await connection.rollback();
        return {
          success: false,
          mismatch: true,
          contractAmount: match.contractAmount,
          verifiedAndApprovedTotal: (match.matchedDepositCents / 100).toFixed(2)
        };
      }

      const balanceBefore = Math.round(Number(user.balance || 0) * 100);
      let runningBalanceCents = balanceBefore;
      const releasableDeposits = deposits.filter(d => String(d.status || '').toLowerCase() === 'verified');
      const releaseCents = releasableDeposits.reduce((sum, d) => sum + Math.max(0, Math.round(Number(d.amount || 0) * 100)), 0);
      const effectiveFundingSource = isExistingOrReinvestmentContract && !match.matches ? 'reinvest' : (kyc.funding_source || 'deposit');

      await connection.execute(
        'UPDATE kyc_submissions SET status = ?, funding_source = ?, rejection_reason = ? WHERE id = ?',
        ['approved', effectiveFundingSource, rejectionReason, kyc.id]
      );
      for (const deposit of releasableDeposits) {
        const amountCents = Math.max(0, Math.round(Number(deposit.amount || 0) * 100));
        const nextBalanceCents = runningBalanceCents + amountCents;
        const transactionId = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        await connection.execute(
          `INSERT INTO wallet_transactions (
            id, user_id, admin_id, transaction_type, amount, balance_before, balance_after,
            currency, reference, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            user.id,
            adminId || null,
            'DEPOSIT',
            (amountCents / 100).toFixed(2),
            (runningBalanceCents / 100).toFixed(2),
            (nextBalanceCents / 100).toFixed(2),
            'USD',
            deposit.id,
            `Verified deposit released after contract approval (${deposit.method || 'USDT'})`,
            formatMySQLDate(new Date())
          ]
        );
        runningBalanceCents = nextBalanceCents;
        await connection.execute('UPDATE deposits SET status = ? WHERE id = ? AND status = ?', ['approved', deposit.id, 'verified']);
      }

      let frozenBalance = Number(user.frozen_balance || 0);
      if (releasableDeposits.length > 0) {
        if (runningBalanceCents >= 0) {
          const [pendingDeficitRows] = await connection.execute(
            'SELECT COUNT(*) AS cnt FROM tasks WHERE user_id = ? AND status = ? AND is_deficit = 1',
            [user.id, 'pending']
          );
          if (!pendingDeficitRows[0] || Number(pendingDeficitRows[0].cnt || 0) === 0) frozenBalance = 0;
        }

        await connection.execute(
          'UPDATE users SET balance = ?, frozen_balance = ?, kyc_status = ?, kyc_notes = ?, today_tasks_completed = 0, current_set = 1 WHERE id = ?',
          [(runningBalanceCents / 100).toFixed(2), frozenBalance.toFixed(2), 'approved', rejectionReason, user.id]
        );
      } else {
        await connection.execute(
          'UPDATE users SET kyc_status = ?, kyc_notes = ?, today_tasks_completed = 0, current_set = 1 WHERE id = ?',
          ['approved', rejectionReason, user.id]
        );
      }
      await connection.commit();

      return {
        success: true,
        alreadyApproved: false,
        user: db.formatUser({ ...user, balance: (runningBalanceCents / 100).toFixed(2), frozen_balance: frozenBalance, kyc_status: 'approved', kyc_notes: rejectionReason }),
        releaseAmount: (releaseCents / 100).toFixed(2),
        fundingSource: effectiveFundingSource,
        balanceBefore: (balanceBefore / 100).toFixed(2),
        balanceAfter: (runningBalanceCents / 100).toFixed(2),
        releasedDeposits: releasableDeposits.map(d => d.id),
        contractAmount: Number(kyc.investment_amount || 0).toFixed(2)
      };
    } catch (err) {
      try { await connection.rollback(); } catch (_) {}
      throw err;
    } finally {
      connection.release();
    }
  },

  getKycSubmissions: async (userId) => {
    let sql = `
      SELECT k.*, u.username, u.fullname, u.phone 
      FROM kyc_submissions k 
      LEFT JOIN users u ON k.user_id = u.id
    `;
    if (userId) {
      sql += ` WHERE k.user_id = ? ORDER BY k.created_at DESC`;
      return await query(sql, [userId]);
    }
    sql += ` ORDER BY k.created_at DESC`;
    return await query(sql);
  },

  createKycSubmission: async (kycData) => {
    await query(`INSERT INTO kyc_submissions (id, user_id, user_email, name, front_id_image, back_id_image, signature_image, investment_amount, status, rejection_reason, funding_source, funded_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kycData.id, kycData.user_id, kycData.user_email, kycData.name, kycData.front_id_image, kycData.back_id_image, kycData.signature_image, kycData.investment_amount, kycData.status || 'pending', kycData.rejection_reason || '', kycData.funding_source || 'deposit', kycData.funded_amount || 0, formatMySQLDate(kycData.created_at)]);
    return kycData;
  },

  updateKycSubmission: async (id, updates) => {
    const allowed = ['user_id', 'user_email', 'name', 'front_id_image', 'back_id_image', 'signature_image', 'investment_amount', 'status', 'rejection_reason', 'funding_source', 'funded_amount', 'created_at'];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        filteredUpdates[key] = key === 'created_at' ? formatMySQLDate(updates[key]) : updates[key];
      }
    }
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id);
    await query(`UPDATE kyc_submissions SET ${setClause} WHERE id = ?`, values);
  },

  // Support Tickets
  getSupportTickets: async (userId) => {
    if (userId) return await query('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return await query('SELECT * FROM support_tickets ORDER BY created_at DESC');
  },

  createSupportTicket: async (ticketData) => {
    await query(`INSERT INTO support_tickets (id, user_id, user_email, user_name, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticketData.id, ticketData.user_id, ticketData.user_email, ticketData.user_name, ticketData.subject, ticketData.message, ticketData.status || 'open', formatMySQLDate(ticketData.created_at)]);
    return ticketData;
  },

  updateSupportTicket: async (id, updates) => {
    const allowed = ['user_id', 'user_email', 'user_name', 'subject', 'message', 'admin_reply', 'status', 'created_at', 'replied_at'];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        filteredUpdates[key] = (key === 'created_at' || key === 'replied_at') ? formatMySQLDate(updates[key]) : updates[key];
      }
    }
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id);
    await query(`UPDATE support_tickets SET ${setClause} WHERE id = ?`, values);
  },

  // Notifications
  ensureNotificationsTable: async () => {
    if (_notificationsTableEnsured) return;
    try {
      await query(`CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (created_at)
      )`);
      _notificationsTableEnsured = true;
    } catch (err) {
      console.error('[DB] Notifications table ensure notice:', err.message);
    }
  },

  getNotifications: async (userId, unreadOnly = false) => {
    await db.ensureNotificationsTable();
    let sql = 'SELECT * FROM notifications';
    let params = [];
    let conditions = [];
    
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (unreadOnly) {
      conditions.push('is_read = FALSE');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';
    
    return await query(sql, params);
  },

  createNotification: async (notifData) => {
    // Assignments are silent until the user starts work. Keep this guard at
    // persistence level so legacy or alternate routes cannot recreate them.
    if (String(notifData && notifData.type || '').toUpperCase() === 'ORDER_PUSH') {
      return { id: null, ...notifData, suppressed: true };
    }
    await db.ensureNotificationsTable();
    const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await query(`INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, notifData.user_id, notifData.title, notifData.message, notifData.type || 'info', false, formatMySQLDate(notifData.created_at)]);
    return { id, ...notifData };
  },

  markNotificationsRead: async (userId) => {
    await db.ensureNotificationsTable();
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    return true;
  },

  // Chat Messages
  ensureChatMessagesTable: async () => {
    if (_chatMessagesTableEnsured) return;
    try {
      await query(`CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        sender VARCHAR(20) DEFAULT 'user',
        message_text TEXT,
        attachment_url VARCHAR(500),
        attachment_name VARCHAR(255),
        attachment_mime VARCHAR(100),
        read_by_admin BOOLEAN DEFAULT FALSE,
        read_by_user BOOLEAN DEFAULT FALSE,
        ip_address VARCHAR(60) DEFAULT NULL,
        country_code VARCHAR(10) DEFAULT NULL,
        country_name VARCHAR(100) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (created_at)
      )`);
      await query('ALTER TABLE chat_messages ADD COLUMN attachment_url VARCHAR(500)').catch(() => {});
      await query('ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255)').catch(() => {});
      await query('ALTER TABLE chat_messages ADD COLUMN attachment_mime VARCHAR(100)').catch(() => {});
      _chatMessagesTableEnsured = true;
    } catch (err) {
      console.error('[DB] Chat messages table ensure notice:', err.message);
    }
  },

  cleanupExpiredChatMessages: async () => {
    try {
      await query(`DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL 48 HOUR`);
    } catch (_) {}
  },

  getChatMessages: async (userId, options = {}) => {
    await db.ensureChatMessagesTable();
    const conditions = ['user_id = ?'];
    const params = [userId];
    if (options.since) {
      conditions.push('created_at >= ?');
      params.push(options.since);
    }
    return await query(`
      SELECT 
        id, 
        user_id, 
        user_name, 
        user_email, 
        sender, 
        message_text, 
        message_text AS text, 
        attachment_url,
        attachment_name,
        attachment_mime,
        read_by_admin, 
        read_by_user, 
        created_at 
      FROM chat_messages 
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at ASC
    `, params);
  },

  createChatMessage: async ({ userId, sender, text, userName, userEmail, ipAddress, countryCode, countryName, attachmentUrl, attachmentName, attachmentMime }) => {
    await db.ensureChatMessagesTable();
    const id = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const readByAdmin = sender === 'admin';
    const readByUser = sender === 'user';
    const cleanText = (text || '').trim();
    await query(`INSERT INTO chat_messages (id, user_id, user_name, user_email, sender, message_text, attachment_url, attachment_name, attachment_mime, read_by_admin, read_by_user, ip_address, country_code, country_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, userId, userName || 'User', userEmail || '', sender || 'user', cleanText, attachmentUrl || null, attachmentName || null, attachmentMime || null, readByAdmin, readByUser, ipAddress || null, countryCode || null, countryName || null]);
    return { id, user_id: userId, sender, text: cleanText, message_text: cleanText, attachment_url: attachmentUrl || null, attachment_name: attachmentName || null, attachment_mime: attachmentMime || null, ip_address: ipAddress, country_code: countryCode, country_name: countryName, created_at: new Date().toISOString() };
  },

  getChatConversations: async () => {
    await db.cleanupExpiredChatMessages();
    const sql = `
      SELECT 
        c.user_id, 
        u.fullname as user_name, 
        u.email as user_email, 
        u.vip_level, 
        u.balance,
        COALESCE(u.country_code, c.country_code, 'PK') as country_code,
        COALESCE(u.country_name, c.country_name, 'Pakistan') as country_name,
        COALESCE(u.last_ip, c.ip_address, '127.0.0.1') as ip_address,
        c.message_text as last_message, 
        c.created_at as last_message_at, 
        c.sender as last_sender,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = c.user_id AND sender = 'user' AND read_by_admin = FALSE AND created_at >= NOW() - INTERVAL 10 MINUTE) as unread_admin_count,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = c.user_id AND sender = 'user' AND read_by_admin = FALSE AND created_at >= NOW() - INTERVAL 10 MINUTE) as unread_count
      FROM chat_messages c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at = (SELECT MAX(created_at) FROM chat_messages WHERE user_id = c.user_id)
        AND c.created_at >= NOW() - INTERVAL 10 MINUTE
      ORDER BY c.created_at DESC
    `;
    return await query(sql);
  },

  markChatReadByAdmin: async (userId) => {
    await db.ensureChatMessagesTable();
    await query(`UPDATE chat_messages SET read_by_admin = TRUE WHERE user_id = ? AND sender = 'user'`, [userId]);
    return true;
  },

  markChatReadByUser: async (userId) => {
    await db.ensureChatMessagesTable();
    await query(`UPDATE chat_messages SET read_by_user = TRUE WHERE user_id = ? AND sender = 'admin'`, [userId]);
    return true;
  },

  // STAFF & SUB-ADMIN MANAGEMENT
  ensureAdminsTable: async () => {
    if (_adminsTableEnsured) return;
    try {
      await query(`CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(50) PRIMARY KEY,
        fullname VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'sub_admin',
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      // Seed default super admin if not present
      await query(`INSERT IGNORE INTO admins (id, fullname, email, password_hash, role, status) VALUES 
        ('adm_super_01', 'amazon-a', 'amazon-a@asiamerchantsads.com', '$2a$10$XoQOV2B3ySVt.WaJtkXFuecwXu5MUeVT9UrpH8Db5P.jb7OToxpj2', 'super_admin', 'active')
      `);
      _adminsTableEnsured = true;
    } catch (err) {
      console.error('[DB] Admins table ensure notice:', err.message);
    }
  },

  getAdmins: async () => {
    await db.ensureAdminsTable();
    return await query('SELECT id, fullname, email, role, status, created_at FROM admins ORDER BY created_at DESC');
  },

  findAdminByEmail: async (identifier) => {
    if (!identifier) return null;
    await db.ensureAdminsTable();
    const clean = identifier.trim().toLowerCase();
    const rows = await query('SELECT * FROM admins WHERE LOWER(email) = ? OR LOWER(fullname) = ? OR LOWER(id) = ?', [clean, clean, clean]);
    return rows[0] || null;
  },

  createAdmin: async (adminData) => {
    await db.ensureAdminsTable();
    await query(`INSERT INTO admins (id, fullname, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminData.id, adminData.fullname, adminData.email.trim().toLowerCase(), adminData.password_hash, adminData.role || 'sub_admin', adminData.status || 'active', formatMySQLDate(adminData.created_at)]
    );
    return adminData;
  },

  updateAdmin: async (id, updates) => {
    await db.ensureAdminsTable();
    const keys = Object.keys(updates);
    if (keys.length === 0) return null;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE admins SET ${setClause} WHERE id = ?`, values);
    return true;
  },

  deleteAdmin: async (id) => {
    await db.ensureAdminsTable();
    await query('DELETE FROM admins WHERE id = ?', [id]);
    return true;
  },

  // TASKS & SMART COMMISSION ENGINE
  ensureTasksTable: async () => {
    if (_tasksTableEnsured) return;
    try {
      await query(`CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        order_number VARCHAR(60) DEFAULT NULL,
        product_id INT,
        product_name VARCHAR(255),
        product_image VARCHAR(255),
        product_price DECIMAL(15,2),
        commission_rate DECIMAL(5,4),
        commission_earned DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'pending',
        order_num INT DEFAULT 1,
        is_deficit TINYINT(1) DEFAULT 0,
        deficit_amount DECIMAL(15,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id)
      )`);
      const cols = await query(`SHOW COLUMNS FROM tasks`);
      const colNames = cols.map(c => c.Field.toLowerCase());
      if (!colNames.includes('order_number')) {
        await query(`ALTER TABLE tasks ADD COLUMN order_number VARCHAR(60) DEFAULT NULL`).catch(() => {});
      }
      if (!colNames.includes('product_image')) {
        await query(`ALTER TABLE tasks ADD COLUMN product_image VARCHAR(255) DEFAULT NULL`).catch(() => {});
      }
      if (!colNames.includes('order_num')) {
        await query(`ALTER TABLE tasks ADD COLUMN order_num INT DEFAULT 1`).catch(() => {});
      }
      if (!colNames.includes('is_deficit')) {
        await query(`ALTER TABLE tasks ADD COLUMN is_deficit TINYINT(1) DEFAULT 0`).catch(() => {});
      }
      if (!colNames.includes('deficit_amount')) {
        await query(`ALTER TABLE tasks ADD COLUMN deficit_amount DECIMAL(15,2) DEFAULT 0.00`).catch(() => {});
      }
      if (!colNames.includes('completed_at')) {
        await query(`ALTER TABLE tasks ADD COLUMN completed_at DATETIME DEFAULT NULL`).catch(() => {});
      }
      _tasksTableEnsured = true;
    } catch (err) {
      console.error('[DB] Tasks table ensure notice:', err.message);
    }
  },

  getTasks: async (userId) => {
    await db.ensureTasksTable();
    const rows = (userId !== undefined && userId !== null)
      ? await query(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC`, [userId])
      : await query(`SELECT * FROM tasks ORDER BY created_at DESC`);
    return rows.map(r => ({
      ...r,
      product_price: parseFloat(r.product_price || 0),
      commission_rate: parseFloat(r.commission_rate || 0),
      commission_earned: parseFloat(r.commission_earned || 0),
      commission_amount: parseFloat(r.commission_earned || 0),
      is_deficit: isDeficitFlag(r.is_deficit) ? 1 : 0,
      deficit_amount: parseFloat(r.deficit_amount || 0)
    }));
  },

  createTask: async (task) => {
    await db.ensureTasksTable();
    const commEarned = task.commission_earned || task.commission_amount || 0;
    try {
      await query(`INSERT INTO tasks (id, user_id, order_number, product_name, product_image, product_price, commission_rate, commission_earned, status, order_num, is_deficit, deficit_amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.user_id,
          task.order_number || null,
          task.product_name || 'Amazon Asia Merchant Order',
          task.product_image || null,
          task.product_price || 0,
          task.commission_rate || 0.20,
          commEarned,
          task.status || 'pending',
          task.order_num || 1,
          isDeficitFlag(task.is_deficit) ? 1 : 0,
          task.deficit_amount || 0,
          formatMySQLDate(task.created_at || new Date())
        ]
      );
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('order_number')) {
        await query(`INSERT INTO tasks (id, user_id, product_name, product_image, product_price, commission_rate, commission_earned, status, order_num, is_deficit, deficit_amount, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.user_id,
            task.product_name || 'Amazon Asia Merchant Order',
            task.product_image || null,
            task.product_price || 0,
            task.commission_rate || 0.20,
            commEarned,
            task.status || 'pending',
            task.order_num || 1,
            isDeficitFlag(task.is_deficit) ? 1 : 0,
            task.deficit_amount || 0,
            formatMySQLDate(task.created_at || new Date())
          ]
        );
      } else {
        throw insertErr;
      }
    }
    return task;
  },

  updateTask: async (id, updates) => {
    await db.ensureTasksTable();
    const allowed = ['status', 'commission_earned', 'order_num', 'is_deficit', 'deficit_amount', 'completed_at'];
    const keys = Object.keys(updates).filter(k => allowed.includes(k));
    if (keys.length === 0) return true;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => k === 'completed_at' ? formatMySQLDate(updates[k]) : updates[k]);
    values.push(id);
    await query(`UPDATE tasks SET ${setClause} WHERE id = ?`, values);
    return true;
  },

  deletePendingTasks: async (userId) => {
    await db.ensureTasksTable();
    await query(`DELETE FROM tasks WHERE user_id = ? AND status = 'pending'`, [userId]);
    return true;
  },

  deleteTask: async (id) => {
    await db.ensureTasksTable();
    await query(`DELETE FROM tasks WHERE id = ?`, [id]);
    return true;
  },

  getProducts: async () => {
    const now = Date.now();
    if (_cachedProducts && _generatedCatalogRemoved && (now - _lastProductsFetch) < 45000) {
      return _cachedProducts;
    }
    if (!_productsTableEnsured) {
      await query(`CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        image VARCHAR(255),
        category VARCHAR(100) DEFAULT 'General',
        sku VARCHAR(100) DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        commission_rate DECIMAL(5,4) DEFAULT 0.2000,
        reward_rate DECIMAL(5,4) DEFAULT 0.2000
      )`);
      _productsTableEnsured = true;
    }
    // Older installations created products before category/SKU metadata existed.
    // Add the columns before applying the generated-product cleanup migration.
    try {
      const prodCols = await query(`SHOW COLUMNS FROM products`);
      const colNames = new Set(prodCols.map(c => c.Field.toLowerCase()));
      const missingColumns = [
        ['category', "VARCHAR(100) DEFAULT 'General'"],
        ['sku', 'VARCHAR(100) DEFAULT NULL'],
        ['is_active', 'TINYINT(1) DEFAULT 1'],
        ['commission_rate', 'DECIMAL(5,4) DEFAULT 0.2000'],
        ['reward_rate', 'DECIMAL(5,4) DEFAULT 0.2000']
      ];
      for (const [name, definition] of missingColumns) {
        if (!colNames.has(name)) await query(`ALTER TABLE products ADD COLUMN ${name} ${definition}`);
      }
    } catch (_) {}

    await removeGeneratedCatalogProducts();
    // Keep generated INTL rows hidden even if DELETE is temporarily blocked.
    const rows = await query(`SELECT * FROM products WHERE COALESCE(sku, '') NOT LIKE 'INTL-%'`);
    _cachedProducts = rows;
    _lastProductsFetch = now;
    return rows;
  },

  ensureProductionSchema: async () => {
    if (_productionSchemaEnsured) return;
    try {
      await db.ensureTasksTable();

      // 1. Orders table
      await query(`CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(60) UNIQUE NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        merchant_id VARCHAR(50) DEFAULT NULL,
        task_id VARCHAR(50) DEFAULT NULL,
        product_id INT DEFAULT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        category VARCHAR(100) DEFAULT 'General',
        unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        quantity INT NOT NULL DEFAULT 1,
        subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        discount_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
        discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
        tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        fee_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        gross_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
        commission_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        reward_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
        reward_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        user_deduction DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        order_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        INDEX (user_id),
        INDEX (order_status),
        INDEX (created_at)
      )`);

      try {
        const orderCols = await query(`SHOW COLUMNS FROM orders`);
        const colNames = orderCols.map(c => c.Field.toLowerCase());
        if (!colNames.includes('category')) {
          await query(`ALTER TABLE orders ADD COLUMN category VARCHAR(100) DEFAULT 'General'`).catch(() => {});
        }
        if (!colNames.includes('user_deduction')) {
          await query(`ALTER TABLE orders ADD COLUMN user_deduction DECIMAL(18,2) DEFAULT 0.00`).catch(() => {});
        }
        if (!colNames.includes('reward_rate')) {
          await query(`ALTER TABLE orders ADD COLUMN reward_rate DECIMAL(5,4) DEFAULT 0.2000`).catch(() => {});
        }
        if (!colNames.includes('reward_amount')) {
          await query(`ALTER TABLE orders ADD COLUMN reward_amount DECIMAL(18,2) DEFAULT 0.00`).catch(() => {});
        }
        if (!colNames.includes('discount_rate')) {
          await query(`ALTER TABLE orders ADD COLUMN discount_rate DECIMAL(5,4) DEFAULT 0.0000`).catch(() => {});
        }
        if (!colNames.includes('discount_amount')) {
          await query(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(18,2) DEFAULT 0.00`).catch(() => {});
        }
        if (!colNames.includes('tax_rate')) {
          await query(`ALTER TABLE orders ADD COLUMN tax_rate DECIMAL(5,4) DEFAULT 0.0000`).catch(() => {});
        }
        if (!colNames.includes('tax_amount')) {
          await query(`ALTER TABLE orders ADD COLUMN tax_amount DECIMAL(18,2) DEFAULT 0.00`).catch(() => {});
        }
        if (!colNames.includes('fee_amount')) {
          await query(`ALTER TABLE orders ADD COLUMN fee_amount DECIMAL(18,2) DEFAULT 0.00`).catch(() => {});
        }
        if (!colNames.includes('completed_at')) {
          await query(`ALTER TABLE orders ADD COLUMN completed_at DATETIME DEFAULT NULL`).catch(() => {});
        }
      } catch (_) {}

      // 2. Wallet transactions table (immutable financial ledger)
      await query(`CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(60) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        order_id VARCHAR(60) DEFAULT NULL,
        task_id VARCHAR(60) DEFAULT NULL,
        admin_id VARCHAR(50) DEFAULT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        balance_before DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        balance_after DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        reference VARCHAR(100) DEFAULT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (transaction_type),
        INDEX (created_at)
      )`);

      // 3. Admin audit logs table
      await query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100) DEFAULT NULL,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        ip_address VARCHAR(60) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (admin_id),
        INDEX (action),
        INDEX (created_at)
      )`);

      // 4. Products table schema enhancement
      try {
        const prodCols = await query(`SHOW COLUMNS FROM products`);
        const colNames = prodCols.map(c => c.Field.toLowerCase());
        if (!colNames.includes('category')) {
          await query(`ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT 'General'`);
        }
        if (!colNames.includes('sku')) {
          await query(`ALTER TABLE products ADD COLUMN sku VARCHAR(100) DEFAULT NULL`);
        }
        if (!colNames.includes('is_active')) {
          await query(`ALTER TABLE products ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
        }
        if (!colNames.includes('commission_rate')) {
          await query(`ALTER TABLE products ADD COLUMN commission_rate DECIMAL(5,4) DEFAULT 0.2000`);
        }
        if (!colNames.includes('reward_rate')) {
          await query(`ALTER TABLE products ADD COLUMN reward_rate DECIMAL(5,4) DEFAULT 0.2000`);
        }
      } catch (_) {}

      // 5. KYC Submissions table LONGTEXT enhancement for robust image uploads
      try {
        const kycCols = await query(`SHOW COLUMNS FROM kyc_submissions`);
        const kycColNames = new Set(kycCols.map(c => c.Field.toLowerCase()));
        if (!kycColNames.has('funding_source')) {
          await query(`ALTER TABLE kyc_submissions ADD COLUMN funding_source VARCHAR(30) DEFAULT 'deposit'`);
        }
        if (!kycColNames.has('funded_amount')) {
          await query(`ALTER TABLE kyc_submissions ADD COLUMN funded_amount DECIMAL(15,2) DEFAULT 0.00`);
        }
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN front_id_image LONGTEXT`);
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN back_id_image LONGTEXT`);
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN signature_image LONGTEXT`);
      } catch (_) {}

      // 6. Ensure chat_messages table on startup
      await db.ensureChatMessagesTable().catch(() => {});
      await db.migrateLegacyVerifiedDeposits();

      _productionSchemaEnsured = true;
    } catch (err) {
      console.error('[DB] Schema migration notice:', err.message);
    }
  },

  createOrder: async (orderData) => {
    await db.ensureProductionSchema();
    await query(`INSERT INTO orders (
      id, order_number, user_id, merchant_id, task_id, product_id, product_name, product_image,
      category, unit_price, quantity, subtotal, discount_rate, discount_amount, tax_rate, tax_amount,
      fee_amount, gross_amount, commission_rate, commission_amount, reward_rate, reward_amount,
      user_deduction, payment_status, order_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderData.id,
      orderData.order_number,
      orderData.user_id,
      orderData.merchant_id || null,
      orderData.task_id || null,
      orderData.product_id || null,
      orderData.product_name,
      orderData.product_image || null,
      orderData.category || 'General',
      orderData.unit_price || 0,
      orderData.quantity || 1,
      orderData.subtotal || 0,
      orderData.discount_rate || 0,
      orderData.discount_amount || 0,
      orderData.tax_rate || 0,
      orderData.tax_amount || 0,
      orderData.fee_amount || 0,
      orderData.gross_amount || 0,
      orderData.commission_rate || 0.20,
      orderData.commission_amount || 0,
      orderData.reward_rate || 0.20,
      orderData.reward_amount || 0,
      orderData.user_deduction || 0,
      orderData.payment_status || 'PENDING',
      orderData.order_status || 'PENDING',
      formatMySQLDate(orderData.created_at || new Date())
    ]);
    return orderData;
  },

  updateOrder: async (orderId, updates) => {
    await db.ensureProductionSchema();
    const allowed = [
      'task_id', 'product_name', 'product_image', 'unit_price', 'quantity', 'subtotal',
      'gross_amount', 'commission_amount', 'reward_amount', 'user_deduction',
      'payment_status', 'order_status', 'completed_at'
    ];
    const keys = Object.keys(updates).filter(k => allowed.includes(k));
    if (keys.length === 0) return true;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => k === 'completed_at' ? formatMySQLDate(updates[k]) : updates[k]);
    values.push(orderId);
    await query(`UPDATE orders SET ${setClause} WHERE id = ? OR order_number = ?`, [...values, orderId]);
    return true;
  },

  getOrders: async (filter = {}) => {
    await db.ensureProductionSchema();
    let sql = `
      SELECT o.*, u.username, u.fullname, u.vip_level, u.country_name, u.country_code
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const conditions = [];
    const params = [];
    if (filter.user_id) {
      conditions.push(`o.user_id = ?`);
      params.push(filter.user_id);
    }
    if (filter.order_status) {
      conditions.push(`LOWER(o.order_status) = ?`);
      params.push(filter.order_status.toLowerCase());
    }
    if (filter.order_number) {
      conditions.push(`o.order_number LIKE ?`);
      params.push(`%${filter.order_number}%`);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }
    sql += ` ORDER BY o.created_at DESC`;
    const rows = await query(sql, params);
    return rows.map(r => ({
      ...r,
      unit_price: parseFloat(r.unit_price || 0),
      quantity: parseInt(r.quantity || 1, 10),
      subtotal: parseFloat(r.subtotal || 0),
      gross_amount: parseFloat(r.gross_amount || 0),
      commission_rate: parseFloat(r.commission_rate || 0),
      commission_amount: parseFloat(r.commission_amount || 0),
      reward_rate: parseFloat(r.reward_rate || 0),
      reward_amount: parseFloat(r.reward_amount || 0),
      user_deduction: parseFloat(r.user_deduction || 0)
    }));
  },

  createLedgerTransaction: async ({
    userId,
    orderId = null,
    taskId = null,
    adminId = null,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    currency = 'USD',
    reference = null,
    description = ''
  }) => {
    await db.ensureProductionSchema();
    const id = 'txn_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);
    await query(`INSERT INTO wallet_transactions (
      id, user_id, order_id, task_id, admin_id, transaction_type, amount, balance_before, balance_after, currency, reference, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      orderId,
      taskId,
      adminId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      currency,
      reference,
      description,
      formatMySQLDate(new Date())
    ]);
    return { id, userId, type, amount, balanceBefore, balanceAfter };
  },

  getLedgerTransactions: async (userId = null) => {
    await db.ensureProductionSchema();
    let sql = `
      SELECT t.*, u.username, u.fullname
      FROM wallet_transactions t
      LEFT JOIN users u ON t.user_id = u.id
    `;
    const params = [];
    if (userId) {
      sql += ` WHERE t.user_id = ?`;
      params.push(userId);
    }
    sql += ` ORDER BY t.created_at DESC LIMIT 200`;
    const rows = await query(sql, params);
    return rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount || 0),
      balance_before: parseFloat(r.balance_before || 0),
      balance_after: parseFloat(r.balance_after || 0)
    }));
  },

  createAuditLog: async ({
    adminId,
    action,
    entity,
    entityId = null,
    oldValue = null,
    newValue = null,
    reason = null,
    ip = null,
    ipAddress = null
  }) => {
    await db.ensureProductionSchema();
    const clientIp = ipAddress || ip || null;
    await query(`INSERT INTO admin_audit_logs (
      admin_id, action, entity, entity_id, old_value, new_value, reason, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      action,
      entity,
      entityId ? String(entityId) : null,
      typeof oldValue === 'object' ? JSON.stringify(oldValue) : (oldValue !== null ? String(oldValue) : null),
      typeof newValue === 'object' ? JSON.stringify(newValue) : (newValue !== null ? String(newValue) : null),
      reason,
      clientIp,
      formatMySQLDate(new Date())
    ]);
  },

  getAuditLogs: async (limit = 100) => {
    await db.ensureProductionSchema();
    const rows = await query(`
      SELECT l.*, a.fullname as admin_name, a.role as admin_role
      FROM admin_audit_logs l
      LEFT JOIN admins a ON l.admin_id = a.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `, [parseInt(limit, 10) || 100]);
    return rows;
  },

  createProduct: async (productData) => {
    await db.ensureProductionSchema();
    _cachedProducts = null;
    const res = await query(`INSERT INTO products (
      name, price, image, category, sku, is_active, commission_rate, reward_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productData.name,
      productData.price,
      productData.image || null,
      productData.category || 'General',
      productData.sku || ('SKU-' + Date.now()),
      productData.is_active !== undefined ? (productData.is_active ? 1 : 0) : 1,
      productData.commission_rate || 0.20,
      productData.reward_rate || 0.20
    ]);
    return { id: res.insertId, ...productData };
  },

  updateProduct: async (id, updates) => {
    await db.ensureProductionSchema();
    _cachedProducts = null;
    const allowed = ['name', 'price', 'image', 'category', 'sku', 'is_active', 'commission_rate', 'reward_rate'];
    const keys = Object.keys(updates).filter(k => allowed.includes(k));
    if (keys.length === 0) return true;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(id);
    await query(`UPDATE products SET ${setClause} WHERE id = ?`, values);
    return true;
  },

  deleteProduct: async (id) => {
    await db.ensureProductionSchema();
    _cachedProducts = null;
    await query(`DELETE FROM products WHERE id = ?`, [id]);
    return true;
  }
};

module.exports = db;
