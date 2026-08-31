const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const defaultAdminPassword = bcrypt.hashSync('AdminPass2026!', 10);
const defaultUserPassword = bcrypt.hashSync('Password', 10);

const initialData = {
  settings: {
    admin_email: 'admin@adsmerchantsasia.com',
    admin_password_hash: defaultAdminPassword,
    trc20_address: 'TJ8Yg9pKaV8vU3mQ2jN5xL7wE1tZ4dC6bA',
    erc20_address: '0x88922C0A5A901F1aA719d3f1FeA6bA34B20C888A',
    btc_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    telegram_support: 'https://t.me/adsmerchantsasia_support',
    whatsapp_support: '+60112345678',
    min_deposit: 20,
    min_withdraw: 30,
    daily_tasks_limit: 38,
    vip_rates: {
      Bronze: { commission: 0.005, min_balance: 0, max_tasks: 38 },
      Silver: { commission: 0.008, min_balance: 500, max_tasks: 45 },
      Gold: { commission: 0.012, min_balance: 2000, max_tasks: 55 },
      Platinum: { commission: 0.018, min_balance: 5000, max_tasks: 65 }
    }
  },
  users: [
    {
      id: 'usr_repofa5484',
      fullname: 'Repofa Merchant',
      username: 'repofa5484',
      email: 'repofa5484@prorises.com',
      phone: '+60198765432',
      gender: 'Male',
      password_hash: defaultUserPassword,
      vip_level: 'Bronze',
      balance: 350.45,
      frozen_balance: 0.00,
      today_profit: 0.45,
      today_tasks_completed: 1,
      total_tasks_completed: 1,
      current_set: 1,
      invite_code: 'ASIA-88219',
      kyc_status: 'pending', // 'none' | 'pending' | 'approved' | 'rejected' | 'reupload_required'
      kyc_notes: '',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ],
  kyc_submissions: [
    {
      id: 'kyc_init_001',
      user_id: 'usr_repofa5484',
      user_email: 'repofa5484@prorises.com',
      name: 'Repofa Merchant',
      front_id_image: 'assets/uploads/contracts/id_sample_front.png',
      back_id_image: 'assets/uploads/contracts/id_sample_back.png',
      signature_image: 'assets/uploads/contracts/defaultsignature.jpeg',
      investment_amount: 5000,
      status: 'pending',
      rejection_reason: '',
      created_at: new Date().toISOString()
    }
  ],
  support_tickets: [
    {
      id: 'tkt_001',
      user_id: 'usr_repofa5484',
      user_email: 'repofa5484@prorises.com',
      user_name: 'Repofa Merchant',
      subject: 'Inquiry regarding VIP Gold Upgrade & Withdrawal Times',
      message: 'Hello Support, I would like to confirm if VIP Gold members have instant 10-minute withdrawal approval.',
      admin_reply: 'Hello! Yes, Gold VIP members receive priority automated blockchain withdrawal processing within 10-15 minutes.',
      status: 'answered',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      replied_at: new Date().toISOString()
    }
  ],
  tasks: [],
  deposits: [
    {
      id: 'dep_init_001',
      user_id: 'usr_repofa5484',
      user_email: 'repofa5484@prorises.com',
      amount: 250.00,
      method: 'TRC20',
      txid: '0x77bb88cc99ddaa11ee22ff33',
      proof_image: 'assets/uploads/contracts/id_sample_front.png',
      status: 'approved',
      admin_notes: 'Approved via Blockchain scan',
      created_at: new Date().toISOString()
    }
  ],
  withdrawals: [],
  products: [
    { name: 'Apple iPhone 16 Pro Max 256GB - Desert Titanium', price: 1199, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones', price: 399, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Samsung Galaxy Tab S9 Ultra 512GB WiFi', price: 999, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Dyson V15 Detect Cordless Vacuum Cleaner', price: 749, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Nespresso Vertuo Next Coffee & Espresso Machine', price: 179, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'DJI Mini 4 Pro Fly More Combo Drone with RC 2', price: 859, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Anker Prime 20,000mAh Power Bank 200W Output', price: 129, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Logitech MX Master 3S Advanced Wireless Mouse', price: 99, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Bose QuietComfort Ultra Wireless Earbuds', price: 299, image: 'assets/uploads/logo/1742595477_icon.png' },
    { name: 'Kindle Paperwhite Signature Edition 32GB', price: 189, image: 'assets/uploads/logo/1742595477_icon.png' }
  ]
};

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (!data.kyc_submissions) data.kyc_submissions = initialData.kyc_submissions;
    if (!data.support_tickets) data.support_tickets = initialData.support_tickets;
    return data;
  } catch (err) {
    console.error('Error reading database file:', err);
    return initialData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to database:', err);
    return false;
  }
}

const db = {
  getSettings: () => readDb().settings,
  updateSettings: (newSettings) => {
    const data = readDb();
    data.settings = { ...data.settings, ...newSettings };
    writeDb(data);
    return data.settings;
  },
  getUsers: () => readDb().users,
  findUserById: (id) => {
    const users = readDb().users;
    return users.find(u => u.id === id);
  },
  findUserByIdentifier: (identifier) => {
    const users = readDb().users;
    const clean = identifier.trim().toLowerCase();
    return users.find(u => 
      u.email.toLowerCase() === clean || 
      u.username.toLowerCase() === clean || 
      u.phone.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, '')
    );
  },
  createUser: (userData) => {
    const data = readDb();
    data.users.push(userData);
    writeDb(data);
    return userData;
  },
  updateUser: (id, updates) => {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index] = { ...data.users[index], ...updates };
    writeDb(data);
    return data.users[index];
  },
  resetUserPassword: (userId, newPlainPassword) => {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === userId);
    if (index === -1) return null;
    const hash = bcrypt.hashSync(newPlainPassword, 10);
    data.users[index].password_hash = hash;
    writeDb(data);
    return data.users[index];
  },
  getProducts: () => readDb().products,
  getTasks: (userId) => {
    const tasks = readDb().tasks;
    return userId ? tasks.filter(t => t.user_id === userId) : tasks;
  },
  createTask: (taskData) => {
    const data = readDb();
    data.tasks.push(taskData);
    writeDb(data);
    return taskData;
  },
  updateTask: (id, updates) => {
    const data = readDb();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    data.tasks[index] = { ...data.tasks[index], ...updates };
    writeDb(data);
    return data.tasks[index];
  },
  getDeposits: (userId) => {
    const deposits = readDb().deposits;
    return userId ? deposits.filter(d => d.user_id === userId) : deposits;
  },
  createDeposit: (depositData) => {
    const data = readDb();
    data.deposits.unshift(depositData);
    writeDb(data);
    return depositData;
  },
  updateDeposit: (id, updates) => {
    const data = readDb();
    const index = data.deposits.findIndex(d => d.id === id);
    if (index === -1) return null;
    data.deposits[index] = { ...data.deposits[index], ...updates };
    writeDb(data);
    return data.deposits[index];
  },
  getWithdrawals: (userId) => {
    const withdrawals = readDb().withdrawals;
    return userId ? withdrawals.filter(w => w.user_id === userId) : withdrawals;
  },
  createWithdrawal: (withdrawalData) => {
    const data = readDb();
    data.withdrawals.unshift(withdrawalData);
    writeDb(data);
    return withdrawalData;
  },
  updateWithdrawal: (id, updates) => {
    const data = readDb();
    const index = data.withdrawals.findIndex(w => w.id === id);
    if (index === -1) return null;
    data.withdrawals[index] = { ...data.withdrawals[index], ...updates };
    writeDb(data);
    return data.withdrawals[index];
  },
  // KYC Helpers
  getKycSubmissions: (userId) => {
    const submissions = readDb().kyc_submissions || [];
    return userId ? submissions.filter(k => k.user_id === userId) : submissions;
  },
  createKycSubmission: (kycData) => {
    const data = readDb();
    if (!data.kyc_submissions) data.kyc_submissions = [];
    data.kyc_submissions.unshift(kycData);
    writeDb(data);
    return kycData;
  },
  updateKycSubmission: (id, updates) => {
    const data = readDb();
    if (!data.kyc_submissions) data.kyc_submissions = [];
    const index = data.kyc_submissions.findIndex(k => k.id === id);
    if (index === -1) return null;
    data.kyc_submissions[index] = { ...data.kyc_submissions[index], ...updates };
    writeDb(data);
    return data.kyc_submissions[index];
  },
  // Support Ticket Helpers
  getSupportTickets: (userId) => {
    const tickets = readDb().support_tickets || [];
    return userId ? tickets.filter(t => t.user_id === userId) : tickets;
  },
  createSupportTicket: (ticketData) => {
    const data = readDb();
    if (!data.support_tickets) data.support_tickets = [];
    data.support_tickets.unshift(ticketData);
    writeDb(data);
    return ticketData;
  },
  updateSupportTicket: (id, updates) => {
    const data = readDb();
    if (!data.support_tickets) data.support_tickets = [];
    const index = data.support_tickets.findIndex(t => t.id === id);
    if (index === -1) return null;
    data.support_tickets[index] = { ...data.support_tickets[index], ...updates };
    writeDb(data);
    return data.support_tickets[index];
  },
  // Notifications Helpers
  getNotifications: (userId, unreadOnly = false) => {
    const data = readDb();
    let notifs = data.notifications || [];
    if (userId) {
      notifs = notifs.filter(n => n.user_id === userId);
    }
    if (unreadOnly) {
      notifs = notifs.filter(n => !n.read);
    }
    return notifs;
  },
  createNotification: (notifData) => {
    const data = readDb();
    if (!data.notifications) data.notifications = [];
    const notification = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      user_id: notifData.user_id,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type || 'info', // 'success' | 'warning' | 'error' | 'info'
      read: false,
      created_at: new Date().toISOString()
    };
    data.notifications.unshift(notification);
    writeDb(data);
    return notification;
  },
  markNotificationsRead: (userId) => {
    const data = readDb();
    if (!data.notifications) data.notifications = [];
    data.notifications.forEach(n => {
      if (n.user_id === userId) {
        n.read = true;
      }
    });
    writeDb(data);
    return true;
  },
  // Live Customer Support Chat Helpers
  getChatMessages: (userId) => {
    const data = readDb();
    const messages = data.chat_messages || [];
    return messages.filter(m => m.user_id === userId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },
  createChatMessage: ({ userId, sender, text, userName, userEmail }) => {
    const data = readDb();
    if (!data.chat_messages) data.chat_messages = [];
    const message = {
      id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      user_id: userId,
      user_name: userName || 'User',
      user_email: userEmail || '',
      sender: sender || 'user', // 'user' | 'admin'
      text: text.trim(),
      read_by_admin: sender === 'admin',
      read_by_user: sender === 'user',
      created_at: new Date().toISOString()
    };
    data.chat_messages.push(message);
    writeDb(data);
    return message;
  },
  getChatConversations: () => {
    const data = readDb();
    const messages = data.chat_messages || [];
    const users = data.users || [];
    const conversationMap = {};

    messages.forEach(m => {
      if (!conversationMap[m.user_id]) {
        const user = users.find(u => u.id === m.user_id);
        conversationMap[m.user_id] = {
          user_id: m.user_id,
          user_name: user ? (user.fullname || user.username) : m.user_name,
          user_email: user ? user.email : m.user_email,
          vip_level: user ? user.vip_level : 'Bronze',
          balance: user ? user.balance : 0,
          last_message: m.text,
          last_message_at: m.created_at,
          last_sender: m.sender,
          unread_admin_count: 0,
          total_messages: 0
        };
      }

      conversationMap[m.user_id].total_messages += 1;
      if (new Date(m.created_at) >= new Date(conversationMap[m.user_id].last_message_at)) {
        conversationMap[m.user_id].last_message = m.text;
        conversationMap[m.user_id].last_message_at = m.created_at;
        conversationMap[m.user_id].last_sender = m.sender;
      }
      if (m.sender === 'user' && !m.read_by_admin) {
        conversationMap[m.user_id].unread_admin_count += 1;
      }
    });

    return Object.values(conversationMap).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  },
  markChatReadByAdmin: (userId) => {
    const data = readDb();
    if (!data.chat_messages) data.chat_messages = [];
    data.chat_messages.forEach(m => {
      if (m.user_id === userId && m.sender === 'user') {
        m.read_by_admin = true;
      }
    });
    writeDb(data);
    return true;
  },
  markChatReadByUser: (userId) => {
    const data = readDb();
    if (!data.chat_messages) data.chat_messages = [];
    data.chat_messages.forEach(m => {
      if (m.user_id === userId && m.sender === 'admin') {
        m.read_by_user = true;
      }
    });
    writeDb(data);
    return true;
  }
};

module.exports = db;
