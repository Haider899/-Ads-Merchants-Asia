const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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

async function ensureUserTaskSettingColumns() {
  if (_userTaskSettingColsEnsured) return;
  try {
    let existingColNames = new Set();
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM users');
      if (Array.isArray(cols)) {
        cols.forEach(c => existingColNames.add(String(c.Field).toLowerCase()));
      }
    } catch (e) {
      console.warn('[DB] Notice querying SHOW COLUMNS FROM users:', e.message);
    }

    const columns = [
      { name: 'custom_daily_limit', type: 'INT DEFAULT NULL' },
      { name: 'custom_min_withdraw', type: 'DECIMAL(15,2) DEFAULT NULL' },
      { name: 'task_sequence_plan', type: 'TEXT DEFAULT NULL' },
      { name: 'last_reset_date', type: 'DATE DEFAULT NULL' },
      { name: 'tasks_reset_at', type: 'DATETIME DEFAULT NULL' },
      { name: 'commission_balance', type: 'DECIMAL(12,2) DEFAULT 0.00' }
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
    _userTaskSettingColsEnsured = true;
  } catch (err) {
    console.error('[DB] User task setting columns ensure notice:', err.message);
  }
}

const db = {
  query: query,
  ensureUserTaskSettingColumns,
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
      custom_daily_limit: u.custom_daily_limit !== null && u.custom_daily_limit !== undefined ? parseInt(u.custom_daily_limit, 10) : null,
      custom_min_withdraw: u.custom_min_withdraw !== null && u.custom_min_withdraw !== undefined ? parseFloat(u.custom_min_withdraw) : null,
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
    const id = userData.id || (await db.getNextUserId());
    await query(`INSERT INTO users 
      (id, fullname, username, email, phone, gender, password_hash, vip_level, balance, frozen_balance, today_profit, today_tasks_completed, total_tasks_completed, current_set, invite_code, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [
        id, userData.fullname || '', userData.username || '', userData.email || '', userData.phone || '', userData.gender || 'Male', userData.password_hash || '', 
        userData.vip_level || 'Bronze', userData.balance || 0, userData.frozen_balance || 0, userData.today_profit || 0, 
        userData.today_tasks_completed || 0, userData.total_tasks_completed || 0, userData.current_set || 0, userData.invite_code || '', 
        userData.status || 'active', formatMySQLDate(userData.created_at || new Date())
      ]);
    return { ...userData, id };
  },

  updateUser: async (id, updates) => {
    await ensureUserTaskSettingColumns();

    let existingCols = null;
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM users');
      if (Array.isArray(cols)) {
        existingCols = new Set(cols.map(c => c.Field.toLowerCase()));
      }
    } catch (_) {}

    const allowed = [
      'fullname', 'username', 'email', 'phone', 'gender', 'password_hash', 
      'vip_level', 'balance', 'frozen_balance', 'today_profit', 
      'today_tasks_completed', 'total_tasks_completed', 'current_set', 
      'invite_code', 'kyc_status', 'kyc_notes', 'status',
      'custom_order_num', 'custom_deficit_amount', 'custom_product_name', 'custom_product_price',
      'custom_daily_limit', 'custom_min_withdraw', 'task_sequence_plan', 'last_reset_date', 'tasks_reset_at',
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
        if (key === 'task_sequence_plan' && typeof val === 'object' && val !== null) {
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

  resetUserPassword: async (userId, newPlainPassword) => {
    const hash = bcrypt.hashSync(newPlainPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    return await db.findUserById(userId);
  },

  getDeposits: async (userId) => {
    let sql = `
      SELECT d.*, u.username, u.fullname, u.phone 
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
    await query(`INSERT INTO deposits (id, user_id, user_email, amount, method, txid, proof_image, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [depositData.id, depositData.user_id, depositData.user_email, depositData.amount, depositData.method, depositData.txid, depositData.proof_image, depositData.status || 'pending', depositData.admin_notes || '', formatMySQLDate(depositData.created_at)]);
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
    await query(`INSERT INTO kyc_submissions (id, user_id, user_email, name, front_id_image, back_id_image, signature_image, investment_amount, status, rejection_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kycData.id, kycData.user_id, kycData.user_email, kycData.name, kycData.front_id_image, kycData.back_id_image, kycData.signature_image, kycData.investment_amount, kycData.status || 'pending', kycData.rejection_reason || '', formatMySQLDate(kycData.created_at)]);
    return kycData;
  },

  updateKycSubmission: async (id, updates) => {
    const allowed = ['user_id', 'user_email', 'name', 'front_id_image', 'back_id_image', 'signature_image', 'investment_amount', 'status', 'rejection_reason', 'created_at'];
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
        read_by_admin BOOLEAN DEFAULT FALSE,
        read_by_user BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (created_at)
      )`);
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

  getChatMessages: async (userId) => {
    return await query(`
      SELECT 
        id, 
        user_id, 
        user_name, 
        user_email, 
        sender, 
        message_text, 
        message_text AS text, 
        read_by_admin, 
        read_by_user, 
        created_at 
      FROM chat_messages 
      WHERE user_id = ?
      ORDER BY created_at ASC
    `, [userId]);
  },

  createChatMessage: async ({ userId, sender, text, userName, userEmail, ipAddress, countryCode, countryName }) => {
    const id = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const readByAdmin = sender === 'admin';
    const readByUser = sender === 'user';
    const cleanText = (text || '').trim();
    await query(`INSERT INTO chat_messages (id, user_id, user_name, user_email, sender, message_text, read_by_admin, read_by_user, ip_address, country_code, country_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, userId, userName || 'User', userEmail || '', sender || 'user', cleanText, readByAdmin, readByUser, ipAddress || null, countryCode || null, countryName || null]);
    return { id, user_id: userId, sender, text: cleanText, message_text: cleanText, ip_address: ipAddress, country_code: countryCode, country_name: countryName, created_at: new Date().toISOString() };
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
        ('adm_super_01', 'amazon-a', 'amazon-a@asiamerchants.com', '$2a$10$HMBrYLF.k0a2XJbP6Mi.R.n3SzuZoU0ZAnnGF8tpp.9XfcFTFtuxe', 'super_admin', 'active')
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
          task.is_deficit ? 1 : 0,
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
            task.is_deficit ? 1 : 0,
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
    await query(`CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      image VARCHAR(255)
    )`);
    const rows = await query(`SELECT * FROM products WHERE image NOT LIKE '%icon.png%' AND image NOT LIKE '%logo%'`);
    if (rows.length === 0) {
      const defaultProducts = [
        ['Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)', 3674.00, 'client/assets/uploads/products/outdoor_shed.jpg'],
        ['Bulk 15000 PCS Foam Glow Sticks with 3 Modes Colorful Flashing, Glow in Dark Party Supplies', 1856.00, 'client/assets/uploads/products/glow_sticks.jpg'],
        ['Sony WH-1000XM5 Wireless Noise-Canceling Over-Ear Headphones, Black', 398.00, 'client/assets/uploads/products/sony_headphones.jpg'],
        ['Apple iPhone 16 Pro Max 256GB - Desert Titanium, 5G Unlocked', 1199.00, 'client/assets/uploads/products/iphone_16.jpg'],
        ['Dyson V15 Detect Cordless Vacuum Cleaner with Laser Dust Detection, Yellow/Iron', 749.99, 'client/assets/uploads/products/dyson_vacuum.jpg'],
        ['Samsung 65-Inch Class OLED 4K S90D Series HDR+ Smart TV with Dolby Atmos', 1597.99, 'client/assets/uploads/products/samsung_tv.jpg'],
        ['KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer, Stainless Steel Bowl, Empire Red', 449.95, 'client/assets/uploads/products/kitchenaid_mixer.jpg'],
        ['DeWalt 20V MAX Cordless Drill and Impact Driver Combo Kit, 2-Tool with 2.0Ah Batteries', 229.00, 'client/assets/uploads/products/dewalt_drill.jpg'],
        ['Breville Barista Touch Espresso Machine, Brushed Stainless Steel, Touch Screen', 999.95, 'client/assets/uploads/products/espresso_machine.jpg'],
        ['DJI Mini 4 Pro Fly More Combo Drone with DJI RC 2, 4K HDR Video', 1099.00, 'client/assets/uploads/products/dji_drone.jpg'],
        ['Apple MacBook Air 15-inch Laptop with M3 chip, 16GB Memory, 512GB SSD, Midnight', 1499.00, 'client/assets/uploads/products/macbook_air.jpg'],
        ['Bose Smart Ultra Soundbar with Dolby Atmos and Voice Control, Black Wireless', 899.00, 'client/assets/uploads/products/soundbar.jpg'],
        ['Ninja Foodi 10-in-1 DualZone 2-Basket Air Fryer XL, 10-Qt Capacity', 249.99, 'client/assets/uploads/products/air_fryer.jpg'],
        ['Segway Ninebot KickScooter MAX G2, 22 mph Max Speed, 43 Miles Long Range', 899.99, 'client/assets/uploads/products/scooter.jpg'],
        ['Sony PlayStation 5 Slim Console (PS5 Disc Edition) 1TB SSD with DualSense Controller', 499.99, 'client/assets/uploads/products/ps5_console.jpg'],
        ['Anker SOLIX C1000 Portable Power Station, 1800W Solar Generator, 1056Wh LiFePO4', 649.00, 'client/assets/uploads/products/power_station.jpg'],
        ['Canon EOS R6 Mark II Mirrorless Camera with 24-105mm STM Lens, 24.2 MP, 4K60p', 2399.00, 'client/assets/uploads/products/canon_camera.jpg'],
        ['LG 34-Inch UltraWide Curved Gaming Monitor 144Hz 1ms Nano IPS QHD, G-SYNC', 799.99, 'client/assets/uploads/products/gaming_monitor.jpg'],
        ['EcoFlow Glacier Portable Refrigerator 40L with Integrated Ice Maker Dual Zone', 849.00, 'client/assets/uploads/products/cooler.jpg'],
        ['Coleman WeatherMaster 10-Person Outdoor Camping Tent with Screen Room', 329.99, 'client/assets/uploads/products/camping_tent.jpg']
      ];
      await query(`DELETE FROM products WHERE image LIKE '%icon.png%' OR image LIKE '%logo%'`);
      for (const [name, price, img] of defaultProducts) {
        await query(`INSERT INTO products (name, price, image) VALUES (?, ?, ?)`, [name, price, img]);
      }
      return await query(`SELECT * FROM products`);
    }
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
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN front_id_image LONGTEXT`);
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN back_id_image LONGTEXT`);
        await query(`ALTER TABLE kyc_submissions MODIFY COLUMN signature_image LONGTEXT`);
      } catch (_) {}

      // 6. Ensure chat_messages table on startup
      await db.ensureChatMessagesTable().catch(() => {});

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
    const res = await query(`INSERT INTO products (
      name, price, image, category, sku, is_active, commission_rate, reward_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productData.name,
      productData.price,
      productData.image || 'client/assets/uploads/products/outdoor_shed.jpg',
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
    await query(`DELETE FROM products WHERE id = ?`, [id]);
    return true;
  }
};

module.exports = db;

