const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
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

const db = {
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

  getUsers: async () => {
    return await query('SELECT * FROM users');
  },

  findUserById: async (id) => {
    const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  findUserByIdentifier: async (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR (phone != "" AND phone IS NOT NULL AND phone = ?)', [clean, clean, clean]);
    return rows[0] || null;
  },

  createUser: async (userData) => {
    await query(`INSERT INTO users 
      (id, fullname, username, email, phone, gender, password_hash, vip_level, balance, frozen_balance, today_profit, today_tasks_completed, total_tasks_completed, current_set, invite_code, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [
        userData.id, userData.fullname, userData.username, userData.email, userData.phone, userData.gender, userData.password_hash, 
        userData.vip_level || 'Bronze', userData.balance || 0, userData.frozen_balance || 0, userData.today_profit || 0, 
        userData.today_tasks_completed || 0, userData.total_tasks_completed || 0, userData.current_set || 0, userData.invite_code, 
        userData.status || 'active', formatMySQLDate(userData.created_at)
      ]);
    return userData;
  },

  updateUser: async (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return await db.findUserById(id);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    return await db.findUserById(id);
  },

  resetUserPassword: async (userId, newPlainPassword) => {
    const hash = bcrypt.hashSync(newPlainPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    return await db.findUserById(userId);
  },

  getProducts: async () => {
    return await query('SELECT * FROM products');
  },

  getTasks: async (userId) => {
    if (userId) {
      return await query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    }
    return await query('SELECT * FROM tasks');
  },

  createTask: async (taskData) => {
    await query(`INSERT INTO tasks (id, user_id, product_id, product_name, product_price, commission_rate, commission_earned, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskData.id, taskData.user_id, taskData.product_id, taskData.product_name, taskData.product_price, taskData.commission_rate, taskData.commission_earned, taskData.status, formatMySQLDate(taskData.created_at)]);
    return taskData;
  },

  updateTask: async (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE tasks SET ${setClause} WHERE id = ?`, values);
  },

  getDeposits: async (userId) => {
    if (userId) return await query('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return await query('SELECT * FROM deposits ORDER BY created_at DESC');
  },

  createDeposit: async (depositData) => {
    await query(`INSERT INTO deposits (id, user_id, user_email, amount, method, txid, proof_image, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [depositData.id, depositData.user_id, depositData.user_email, depositData.amount, depositData.method, depositData.txid, depositData.proof_image, depositData.status || 'pending', depositData.admin_notes || '', formatMySQLDate(depositData.created_at)]);
    return depositData;
  },

  updateDeposit: async (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE deposits SET ${setClause} WHERE id = ?`, values);
  },

  getWithdrawals: async (userId) => {
    if (userId) return await query('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return await query('SELECT * FROM withdrawals ORDER BY created_at DESC');
  },

  createWithdrawal: async (withdrawalData) => {
    await query(`INSERT INTO withdrawals (id, user_id, user_email, amount, bank_name, account_name, account_number, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [withdrawalData.id, withdrawalData.user_id, withdrawalData.user_email, withdrawalData.amount, withdrawalData.bank_name, withdrawalData.account_name, withdrawalData.account_number, withdrawalData.status || 'pending', withdrawalData.admin_notes || '', formatMySQLDate(withdrawalData.created_at)]);
    return withdrawalData;
  },

  updateWithdrawal: async (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE withdrawals SET ${setClause} WHERE id = ?`, values);
  },

  // KYC Helpers
  getKycSubmissions: async (userId) => {
    if (userId) return await query('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return await query('SELECT * FROM kyc_submissions ORDER BY created_at DESC');
  },

  createKycSubmission: async (kycData) => {
    await query(`INSERT INTO kyc_submissions (id, user_id, user_email, name, front_id_image, back_id_image, signature_image, investment_amount, status, rejection_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kycData.id, kycData.user_id, kycData.user_email, kycData.name, kycData.front_id_image, kycData.back_id_image, kycData.signature_image, kycData.investment_amount, kycData.status || 'pending', kycData.rejection_reason || '', formatMySQLDate(kycData.created_at)]);
    return kycData;
  },

  updateKycSubmission: async (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
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
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    await query(`UPDATE support_tickets SET ${setClause} WHERE id = ?`, values);
  },

  // Notifications
  getNotifications: async (userId, unreadOnly = false) => {
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
    const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await query(`INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, notifData.user_id, notifData.title, notifData.message, notifData.type || 'info', false, formatMySQLDate(notifData.created_at)]);
    return { id, ...notifData };
  },

  markNotificationsRead: async (userId) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    return true;
  },

  // Chat Messages
  getChatMessages: async (userId) => {
    return await query('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC', [userId]);
  },

  createChatMessage: async ({ userId, sender, text, userName, userEmail }) => {
    const id = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const readByAdmin = sender === 'admin';
    const readByUser = sender === 'user';
    await query(`INSERT INTO chat_messages (id, user_id, user_name, user_email, sender, message_text, read_by_admin, read_by_user, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName || 'User', userEmail || '', sender || 'user', text.trim(), readByAdmin, readByUser, formatMySQLDate(new Date())]);
    return { id, user_id: userId, sender, text };
  },

  getChatConversations: async () => {
    // A simplified query to get the latest message for each user and count unread messages
    const sql = `
      SELECT 
        c.user_id, 
        u.fullname as user_name, 
        u.email as user_email, 
        u.vip_level, 
        u.balance,
        c.message_text as last_message, 
        c.created_at as last_message_at, 
        c.sender as last_sender,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = c.user_id AND sender = 'user' AND read_by_admin = FALSE) as unread_admin_count
      FROM chat_messages c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at = (SELECT MAX(created_at) FROM chat_messages WHERE user_id = c.user_id)
      ORDER BY c.created_at DESC
    `;
    return await query(sql);
  },

  markChatReadByAdmin: async (userId) => {
    await query(`UPDATE chat_messages SET read_by_admin = TRUE WHERE user_id = ? AND sender = 'user'`, [userId]);
    return true;
  },

  markChatReadByUser: async (userId) => {
    await query(`UPDATE chat_messages SET read_by_user = TRUE WHERE user_id = ? AND sender = 'admin'`, [userId]);
    return true;
  },

  // STAFF & SUB-ADMIN MANAGEMENT
  ensureAdminsTable: async () => {
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
      ('adm_super_01', 'Haider Usama (Super Admin)', 'haiderusama707@gmail.com', '$2a$10$rivBQfrtPN44a4B0xCVmbu9y/EuyazJLNC0L433WMnO18yJKTYSfi', 'super_admin', 'active')
    `);
  },

  getAdmins: async () => {
    await db.ensureAdminsTable();
    return await query('SELECT id, fullname, email, role, status, created_at FROM admins ORDER BY created_at DESC');
  },

  findAdminByEmail: async (email) => {
    if (!email) return null;
    await db.ensureAdminsTable();
    const rows = await query('SELECT * FROM admins WHERE LOWER(email) = ?', [email.trim().toLowerCase()]);
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
  }
};

module.exports = db;
