const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { adminAuthMiddleware, isUserOnline, getActiveSessions, kickSession, JWT_SECRET } = require('../middleware/auth');
const geo = require('../utils/geo');
const {
  getCategory,
  makeCategoryMarker,
  pickCategoryProduct
} = require('../utils/productCategories');
const {
  round,
  generateOrderNumber,
  generateTaskNumber,
  calculateOrder
} = require('../utils/orderCalculator');

// Role-based permission guard helper
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
    const role = (req.admin.role || 'super_admin').toLowerCase();
    const normalizedRole = (role === 'support_operator') ? 'support' : ((role === 'finance_officer') ? 'finance' : role);

    const normalizedAllowed = allowedRoles.map(r => {
      if (r === 'support_operator') return 'support';
      if (r === 'finance_officer') return 'finance';
      return r.toLowerCase();
    });

    if (normalizedRole === 'super_admin' || normalizedRole === 'admin' || normalizedAllowed.includes(normalizedRole) || normalizedAllowed.includes('*')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Your role (${req.admin.role}) is not authorized for this section.`
    });
  };
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter admin email/username and password' });
    }

    const cleanId = identifier.toLowerCase();

    // 1. Check in admins table by email or fullname
    let admin = await db.findAdminByEmail(cleanId);

    // 2. Fallback check in settings table
    const settings = await db.getSettings();

    if (!admin && settings.admin_email && (cleanId === settings.admin_email.toLowerCase())) {
      admin = {
        id: 'adm_super_settings',
        fullname: 'Super Admin',
        email: settings.admin_email,
        password_hash: settings.admin_password_hash,
        role: 'super_admin',
        status: 'active'
      };
    }

    // 3. Fallback direct match for super admin requested credentials
    if (!admin && (cleanId === 'haiderusama707@gmail.com' || cleanId === 'haider' || cleanId === 'admin')) {
      const defaultSuperHash = '$2a$10$rivBQfrtPN44a4B0xCVmbu9y/EuyazJLNC0L433WMnO18yJKTYSfi'; // MerchantsAsia#2026
      admin = {
        id: 'adm_super_01',
        fullname: 'Haider Usama (Super Admin)',
        email: 'haiderusama707@gmail.com',
        password_hash: defaultSuperHash,
        role: 'super_admin',
        status: 'active'
      };
      await db.createAdmin({
        id: admin.id,
        fullname: admin.fullname,
        email: admin.email,
        password_hash: admin.password_hash,
        role: admin.role,
        status: admin.status,
        created_at: new Date().toISOString()
      }).catch(() => {});
    }

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    if (admin.status === 'suspended' || admin.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your administrator account has been suspended.' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const adminToken = jwt.sign(
      { 
        isAdmin: true, 
        id: admin.id, 
        email: admin.email, 
        fullname: admin.fullname, 
        role: admin.role || 'super_admin' 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', adminToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    res.json({
      success: true,
      message: `Welcome back, ${admin.fullname || 'Administrator'}!`,
      token: adminToken,
      admin: {
        id: admin.id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
});

// POST /api/admin/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  res.json({ success: true, message: 'Admin logged out' });
});

// GET /api/admin/metrics
router.get('/metrics', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await db.getUsers();
    const deposits = await db.getDeposits();
    const withdrawals = await db.getWithdrawals();
    const kycs = await db.getKycSubmissions();
    const tickets = await db.getSupportTickets();
    const tasks = await db.getTasks();

    const totalUserBalance = users.reduce((sum, u) => sum + (parseFloat(u.balance) || 0), 0);
    const totalDeposits = deposits.filter(d => (d.status || '').toLowerCase() === 'approved').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalWithdrawals = withdrawals.filter(w => (w.status || '').toLowerCase() === 'approved').reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
    const pendingDeposits = deposits.filter(d => (d.status || '').toLowerCase() === 'pending').length;
    const pendingWithdrawals = withdrawals.filter(w => (w.status || '').toLowerCase() === 'pending').length;
    const pendingKycs = kycs.filter(k => (k.status || '').toLowerCase() === 'pending').length;
    const openTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;

    let unreadChats = 0;
    try {
      const conversations = await db.getChatConversations();
      unreadChats = conversations.reduce((sum, c) => sum + (parseInt(c.unread_admin_count) || 0), 0);
    } catch (_) {}

    const totalAlerts = pendingDeposits + pendingWithdrawals + pendingKycs + unreadChats + openTickets;

    res.json({
      success: true,
      admin: req.admin,
      metrics: {
        totalUsers: users.length,
        totalUserBalance: totalUserBalance.toFixed(2),
        totalDeposits: totalDeposits.toFixed(2),
        totalWithdrawals: totalWithdrawals.toFixed(2),
        pendingDeposits,
        pendingWithdrawals,
        pendingKycs,
        unreadChats,
        openTickets,
        totalAlerts,
        totalTasksCompleted: tasks.filter(t => t.status === 'completed').length
      }
    });
  } catch (err) {
    console.error('Admin Metrics Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching metrics' });
  }
});

// GET /api/admin/users - List users with online presence & sorted priority
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const usersList = await db.getUsers();
    const activeSessions = getActiveSessions();
    const activeMap = new Map(activeSessions.map(s => [String(s.userId), s]));

    const users = usersList.map(u => {
      const safe = { ...u };
      delete safe.password_hash;
      const session = activeMap.get(String(u.id));
      safe.is_online = Boolean(session || isUserOnline(u.id));
      safe.session_info = session || null;
      return safe;
    });

    // Sort online users to the TOP, then sort by latest creation date
    users.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      const dateDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (dateDiff !== 0) return dateDiff;
      return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
    });

    res.json({
      success: true,
      users,
      online_count: users.filter(u => u.is_online).length
    });
  } catch (err) {
    console.error('Admin Users Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// GET /api/admin/sessions - Active sessions with IP, location, device & last ping
router.get('/sessions', adminAuthMiddleware, async (req, res) => {
  try {
    const sessions = getActiveSessions();
    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error('Admin Sessions Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching active sessions' });
  }
});

// POST /api/admin/sessions/kick - Terminate an active user session
router.post('/sessions/kick', adminAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    kickSession(userId);
    res.json({ success: true, message: `Active session for User #${userId} has been terminated.` });
  } catch (err) {
    console.error('Kick Session Error:', err);
    res.status(500).json({ success: false, message: 'Error kicking user session: ' + err.message });
  }
});

// POST /api/admin/users/delete - Permanently delete a merchant account and all associated records
router.post('/users/delete', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Terminate any active session
    kickSession(userId);

    // Clean up all related records from DB
    await db.query('DELETE FROM tasks WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM orders WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM wallet_transactions WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM deposits WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM withdrawals WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM kyc_submissions WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM chat_messages WHERE user_id = ?', [userId]).catch(() => {});
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    // Audit Log
    await db.createAuditLog({
      admin_id: (req.admin && req.admin.id) || 1,
      admin_username: (req.admin && (req.admin.username || req.admin.email)) || 'admin',
      action: 'DELETE_USER',
      entity: 'USER',
      entity_id: String(userId),
      old_value: JSON.stringify({ username: user.username, email: user.email, balance: user.balance }),
      new_value: null,
      reason: `Permanently deleted user ${user.fullname || user.username} (ID: ${userId})`,
      ip_address: req.ip
    }).catch(() => {});

    res.json({
      success: true,
      message: `User account "${user.fullname || user.username}" (ID: ${userId}) has been permanently deleted.`
    });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting user account: ' + err.message });
  }
});

// POST /api/admin/users/update
router.post('/users/update', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { userId, balance, frozen_balance, vip_level, status, add_balance, deduct_balance, reset_tasks, reinvest_profit, custom_daily_limit, kyc_status } = req.body;
    const user = await db.findUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    if (vip_level) updates.vip_level = vip_level;
    if (status) updates.status = status;
    if (kyc_status) updates.kyc_status = String(kyc_status).toLowerCase();
    if (frozen_balance !== undefined && frozen_balance !== '') updates.frozen_balance = parseFloat(frozen_balance);

    // Admin custom daily task limit (empty or 0 = clear override, revert to VIP default)
    if (custom_daily_limit !== undefined) {
      if (custom_daily_limit === '' || custom_daily_limit === null) {
        updates.custom_daily_limit = null;
      } else {
        const cdl = parseInt(custom_daily_limit, 10);
        updates.custom_daily_limit = (!isNaN(cdl) && cdl > 0) ? cdl : null;
      }
    }

    if (reset_tasks) {
      updates.today_tasks_completed = 0;
      updates.today_profit = 0.00;
      updates.current_set = 0;
      updates.last_reset_date = new Date().toISOString().slice(0, 10);
      updates.tasks_reset_at = new Date().toISOString().slice(0, 19).replace('T', ' '); // Formatted for MySQL DATETIME
      await db.query('DELETE FROM tasks WHERE user_id = ? AND status = "pending"', [user.id]).catch(() => {});
      await db.query('UPDATE orders SET order_status = "CANCELLED", payment_status = "CANCELLED" WHERE user_id = ? AND payment_status = "SHORTFALL"', [user.id]).catch(() => {});
    }

    let reinvestNotification = null;
    // Self-Balancing / Reinvestment: Move Today's Profit into Working Balance & Reset tasks count
    if (reinvest_profit) {
      const profit = parseFloat(user.today_profit || 0);
      if (profit > 0) {
        const baseBal = parseFloat(user.balance || 0);
        updates.balance = parseFloat((baseBal + profit).toFixed(2));
        updates.today_profit = 0.00;
        updates.today_tasks_completed = 0;
        updates.current_set = 0;
        reinvestNotification = {
          user_id: user.id,
          title: 'Profit Reinvested! 🚀',
          message: `$${profit.toFixed(2)} accumulated profit has been moved into your Working Balance (Self-Balancing Reinvestment). You can now grab your next cycle of orders!`,
          type: 'success'
        };
      }
    }

    const numAdd = (add_balance !== undefined && add_balance !== null && add_balance !== '') ? parseFloat(add_balance) : 0;
    const numDeduct = (deduct_balance !== undefined && deduct_balance !== null && deduct_balance !== '') ? parseFloat(deduct_balance) : 0;

    const postActions = [];

    if (numDeduct > 0) {
      const currentBase = updates.balance !== undefined ? updates.balance : parseFloat(user.balance || 0);
      updates.balance = parseFloat((currentBase - numDeduct).toFixed(2));
      postActions.push(async () => {
        await db.createLedgerTransaction({
          userId: user.id,
          adminId: req.admin.id,
          type: 'ADMIN_DEBIT',
          amount: -numDeduct,
          balanceBefore: currentBase,
          balanceAfter: updates.balance,
          currency: 'USD',
          reference: `ADM-DB-${Date.now()}`,
          description: `Admin balance deduction by ${req.admin.fullname || req.admin.username}`
        }).catch(() => {});
        await db.createAuditLog({
          adminId: req.admin.id,
          action: 'ADMIN_DEBIT',
          entity: 'user',
          entityId: user.id,
          oldValue: { balance: currentBase },
          newValue: { balance: updates.balance },
          ipAddress: req.ip
        }).catch(() => {});
      });
    } else if (numAdd > 0) {
      const currentBase = updates.balance !== undefined ? updates.balance : parseFloat(user.balance || 0);
      updates.balance = parseFloat((currentBase + numAdd).toFixed(2));
      postActions.push(async () => {
        await db.createLedgerTransaction({
          userId: user.id,
          adminId: req.admin.id,
          type: 'ADMIN_CREDIT',
          amount: numAdd,
          balanceBefore: currentBase,
          balanceAfter: updates.balance,
          currency: 'USD',
          reference: `ADM-CR-${Date.now()}`,
          description: `Admin balance credit by ${req.admin.fullname || req.admin.username}`
        }).catch(() => {});
        await db.createAuditLog({
          adminId: req.admin.id,
          action: 'ADMIN_CREDIT',
          entity: 'user',
          entityId: user.id,
          oldValue: { balance: currentBase },
          newValue: { balance: updates.balance },
          ipAddress: req.ip
        }).catch(() => {});
        try {
          await db.createNotification({
            user_id: user.id,
            title: 'Balance Credited! 💰',
            message: `$${numAdd.toFixed(2)} has been credited to your working balance by system administration. New Balance: $${updates.balance.toFixed(2)}`,
            type: 'success'
          });
        } catch (_) {}
      });
    } else if (!reinvest_profit && balance !== undefined && balance !== null && balance !== '') {
      const currentBase = parseFloat(user.balance || 0);
      const newBal = parseFloat(parseFloat(balance).toFixed(2));
      updates.balance = newBal;
      const diff = parseFloat((newBal - currentBase).toFixed(2));
      if (diff !== 0) {
        postActions.push(async () => {
          await db.createLedgerTransaction({
            userId: user.id,
            adminId: req.admin.id,
            type: diff > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
            amount: diff,
            balanceBefore: currentBase,
            balanceAfter: newBal,
            currency: 'USD',
            reference: `ADM-ADJ-${Date.now()}`,
            description: `Direct balance override by ${req.admin.fullname || req.admin.username}`
          }).catch(() => {});
          await db.createAuditLog({
            adminId: req.admin.id,
            action: 'ADMIN_BALANCE_OVERRIDE',
            entity: 'user',
            entityId: user.id,
            oldValue: { balance: currentBase },
            newValue: { balance: newBal },
            ipAddress: req.ip
          }).catch(() => {});
        });
      }
    }

    // Persist changes to database FIRST before dispatching any notifications or ledgers
    const updated = await db.updateUser(userId, updates);

    // Execute post-actions only upon successful DB update
    for (const act of postActions) {
      try { await act(); } catch (_) {}
    }
    if (reinvestNotification) {
      try { await db.createNotification(reinvestNotification); } catch (_) {}
    }

    const safe = { ...updated };
    delete safe.password_hash;

    res.json({
      success: true,
      message: reinvest_profit ? 'Profit successfully reinvested into Working Balance.' : 'User updated successfully',
      user: safe
    });
  } catch (err) {
    console.error('[Admin Users Update Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error while updating user'
    });
  }
});

// POST /api/admin/users/reset-password
router.post('/users/reset-password', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Please provide a valid password of at least 6 characters.' });
  }
  const user = await db.resetUserPassword(userId, newPassword);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({
    success: true,
    message: `Password for ${user.fullname} (${user.email}) successfully reset.`
  });
});

// POST /api/admin/users/:id/toggle-status - Enable or disable user account
router.post('/users/:id/toggle-status', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentStatus = (user.status || 'active').toLowerCase();
    const newStatus = req.body.status ? req.body.status.toLowerCase() : (currentStatus === 'disabled' ? 'active' : 'disabled');

    const updated = await db.updateUser(userId, { status: newStatus });

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'USER_STATUS_TOGGLE',
      entity: 'user',
      entityId: userId,
      oldValue: { status: currentStatus },
      newValue: { status: newStatus },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({
      success: true,
      message: `User account is now ${newStatus.toUpperCase()}.`,
      user: updated,
      new_status: newStatus
    });
  } catch (err) {
    console.error('Toggle User Status Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status: ' + err.message });
  }
});

// POST /api/admin/users/assign-task - Assign / push task with forced deficit or schedule custom task
router.post('/users/assign-task', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { userId, orderNum, deficitAmount, productName, productPrice, productCategory, categoryProduct, pushImmediate, clearCustom } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (clearCustom) {
      await db.updateUser(userId, {
        custom_order_num: null,
        custom_deficit_amount: null,
        custom_product_name: null,
        custom_product_price: null
      });
      return res.json({ success: true, message: 'Custom task override successfully cleared for this user.' });
    }

    const targetOrder = parseInt(orderNum, 10) || (parseInt(user.today_tasks_completed, 10) || 0) + 1;
    const defAmount = parseFloat(deficitAmount) || 25.00;
    const settings = await db.getSettings();
    const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 5 };
    const commissionRate = vipRate.commission || 0.20;

    // Get catalog products to match images or fallback
    const products = await db.getProducts();
    const allTasks = await db.getTasks().catch(() => []);
    const selectedCategory = getCategory(productCategory);

    let pName = (productName || '').trim();
    let pPrice = parseFloat(productPrice) || 0;
    let pImage = 'client/assets/uploads/products/outdoor_shed.jpg';
    let categoryKey = selectedCategory ? productCategory : '';
    const explicitCategoryProduct = categoryProduct && categoryProduct !== '__random__' ? String(categoryProduct).trim() : '';

    if (categoryKey && explicitCategoryProduct && !pName) {
      pName = explicitCategoryProduct;
    }

    if (categoryKey && !pName) {
      const picked = pickCategoryProduct(products, categoryKey, allTasks, user.id);
      if (picked) {
        pName = picked.name;
        pPrice = parseFloat(picked.price) || pPrice;
        pImage = picked.image || pImage;
      }
    }

    if (!pName) {
      // Default to high-value deficit product matching client screenshots
      if (pPrice > 2000 || defAmount >= 1000) {
        pName = 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)';
        pImage = 'client/assets/uploads/products/outdoor_shed.jpg';
      } else if (pPrice > 1000 || defAmount >= 500) {
        pName = '100 Pcs Glow Sticks Bulk Party Favors 8 Inch Glow in the Dark Party Supplies';
        pImage = 'client/assets/uploads/products/glow_sticks.jpg';
      } else {
        pName = 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)';
        pImage = 'client/assets/uploads/products/outdoor_shed.jpg';
      }
    } else {
      const match = products.find(p => p.name.toLowerCase().includes(pName.toLowerCase()));
      if (match) {
        if (match.image) pImage = match.image;
        if (!pPrice || pPrice <= 0) pPrice = parseFloat(match.price) || pPrice;
      }
    }

    if (!pPrice || pPrice <= 0) {
      pPrice = parseFloat((parseFloat(user.balance || 0) + defAmount).toFixed(2));
    }

    const commEarned = parseFloat((pPrice * commissionRate).toFixed(2));

    const assignedProdName = categoryKey && !explicitCategoryProduct ? makeCategoryMarker(categoryKey) : pName;

    // Queue override on user record so it triggers and deducts balance ONLY when user clicks Start
    await db.updateUser(userId, {
      custom_order_num: targetOrder,
      custom_deficit_amount: defAmount,
      custom_product_name: assignedProdName,
      custom_product_price: pPrice
    });

    // Send push notification to user so they see the task notification
    await db.createNotification({
      user_id: user.id,
      type: 'ORDER_PUSH',
      title: 'New Task Assigned!',
      message: `Admin has assigned task #${targetOrder} (${pName || 'Custom Task'}). Please proceed to the Start page to start your order.`
    }).catch(() => {});

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'TASK_ASSIGN_SCHEDULED',
      entity: 'user',
      entityId: user.id,
      oldValue: null,
      newValue: { targetOrder, pName, pPrice, defAmount, pushImmediate: Boolean(pushImmediate) },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Task assigned successfully for Order #${targetOrder} (${pName || 'Item'}, Price: $${pPrice.toFixed(2)}, Deficit: $${defAmount.toFixed(2)}). User received notification. Balance will deduct when user starts the order.`,
      target_order: targetOrder,
      product_name: pName,
      product_price: pPrice,
      deficit_amount: defAmount
    });
  } catch (err) {
    console.error('Assign Task Error:', err);
    res.status(500).json({ success: false, message: 'Error assigning task: ' + err.message });
  }
});

// POST /api/admin/users/sequence-plan - Configure multi-step Start button order sequence & balance wave-off
router.post('/users/sequence-plan', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { userId, balance, totalOrders, steps, resetProgress } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentBal = parseFloat(user.balance || 0);
    const updates = {};

    // 1. Balance update if specified
    if (balance !== undefined && balance !== null && balance !== '') {
      const newBal = parseFloat(balance);
      if (!isNaN(newBal) && newBal !== currentBal) {
        updates.balance = newBal;

        // Record balance ledger adjustment
        await db.createLedgerTransaction({
          userId: user.id,
          adminId: req.admin ? req.admin.id : null,
          type: 'BALANCE_ADJUSTMENT',
          amount: parseFloat((newBal - currentBal).toFixed(2)),
          balanceBefore: currentBal,
          balanceAfter: newBal,
          currency: 'USD',
          reference: 'ADMIN_PLAN_BUDGET',
          description: `Admin configured start sequence budget: set balance to $${newBal.toFixed(2)}`
        }).catch(() => {});

        await db.createAuditLog({
          adminId: req.admin ? req.admin.id : null,
          action: 'USER_BALANCE_SET_SEQUENCE_PLAN',
          entity: 'user',
          entityId: user.id,
          oldValue: { balance: currentBal },
          newValue: { balance: newBal },
          ipAddress: req.ip
        }).catch(() => {});
      }
    }

    // 2. Validate and format steps
    const numOrders = parseInt(totalOrders, 10) || (Array.isArray(steps) ? steps.length : 5);
    const formattedSteps = (Array.isArray(steps) ? steps : []).map((s, idx) => {
      const orderNum = parseInt(s.order_num, 10) || (idx + 1);
      const amount = parseFloat(s.amount !== undefined ? s.amount : (s.price || 0)) || 0;
      const isDeficit = Boolean(s.is_deficit);
      const defAmt = s.deficit_amount !== undefined && s.deficit_amount !== null
        ? parseFloat(s.deficit_amount)
        : (isDeficit ? Math.max(10, parseFloat((amount - (updates.balance !== undefined ? updates.balance : currentBal)).toFixed(2))) : 0);

      return {
        order_num: orderNum,
        amount: amount,
        is_deficit: isDeficit,
        deficit_amount: defAmt
      };
    });

    updates.task_sequence_plan = formattedSteps;
    updates.custom_daily_limit = numOrders;

    if (resetProgress) {
      updates.today_tasks_completed = 0;
      updates.current_set = 0;
      updates.today_profit = 0.00;
      updates.tasks_reset_at = new Date().toISOString(); // Cutoff timestamp
    }

    await db.updateUser(user.id, updates);

    return res.json({
      success: true,
      message: `Start sequence plan (${numOrders} orders) successfully activated for ${user.fullname || user.username}!`,
      plan: formattedSteps,
      user: await db.findUserById(user.id)
    });
  } catch (err) {
    console.error('Sequence Plan Error:', err);
    res.status(500).json({ success: false, message: 'Error saving sequence plan: ' + err.message });
  }
});

// POST /api/admin/users/sequence-plan/clear - Clear active sequence plan
router.post('/users/sequence-plan/clear', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    await db.updateUser(userId, {
      task_sequence_plan: null
    });
    return res.json({ success: true, message: 'Start sequence plan cleared successfully.' });
  } catch (err) {
    console.error('Clear Sequence Plan Error:', err);
    res.status(500).json({ success: false, message: 'Error clearing sequence plan: ' + err.message });
  }
});

// GET /api/admin/kyc - Get KYC verification requests
router.get('/kyc', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const submissions = await db.getKycSubmissions();
  res.json({ success: true, submissions });
});

// POST /api/admin/kyc/action - Approve, Reject, or Request Re-upload
router.post('/kyc/action', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  try {
    const kycId = req.body.kycId || req.body.id || req.body.submissionId;
    const action = req.body.action;
    const reason = (req.body.reason || req.body.notes || '').trim();

    if (!kycId) {
      return res.status(400).json({ success: false, message: 'KYC submission ID is required.' });
    }

    const submissions = await db.getKycSubmissions();
    const kyc = submissions.find(k => String(k.id).trim() === String(kycId).trim());

    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC submission not found.' });
    }

    const user = await db.findUserById(kyc.user_id);
    let newStatus = 'pending';
    let userKycStatus = 'pending';

    if (action === 'approve') {
      newStatus = 'approved';
      userKycStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      userKycStatus = 'rejected';
    } else if (action === 'reupload') {
      newStatus = 'reupload_required';
      userKycStatus = 'reupload_required';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action: ' + action });
    }

    await db.updateKycSubmission(kyc.id, {
      status: newStatus,
      rejection_reason: reason
    });

    if (user) {
      await db.updateUser(user.id, {
        kyc_status: userKycStatus,
        kyc_notes: reason
      });

      if (action === 'approve') {
        await db.createNotification({
          user_id: user.id,
          title: 'KYC Verified! ✅',
          message: 'Congratulations! Your merchant identity documents have been verified and approved.',
          type: 'success'
        });
      } else if (action === 'reject') {
        await db.createNotification({
          user_id: user.id,
          title: 'KYC Rejected ⚠️',
          message: 'Your KYC submission was rejected. Reason: ' + (reason || 'Documents could not be verified.'),
          type: 'error'
        });
      } else if (action === 'reupload') {
        await db.createNotification({
          user_id: user.id,
          title: 'KYC Re-upload Required 📝',
          message: 'Please re-upload your verification documents. Instructions: ' + (reason || 'Clear photo required.'),
          type: 'warning'
        });
      }
    }

    res.json({
      success: true,
      message: `KYC submission marked as ${newStatus}. User has been notified.`
    });
  } catch (err) {
    console.error('KYC Action Error:', err);
    res.status(500).json({ success: false, message: 'Error processing KYC action: ' + err.message });
  }
});

// GET /api/admin/deposits
router.get('/deposits', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  const deposits = await db.getDeposits();
  res.json({ success: true, deposits });
});

// POST /api/admin/deposits/action
router.post('/deposits/action', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { depositId, action, notes } = req.body;
    const deposits = await db.getDeposits();
    const deposit = deposits.find(d => d.id === depositId);

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Deposit request not found' });
    }

    const user = await db.findUserById(deposit.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user not found' });
    }

    const currentBalance = parseFloat(user.balance) || 0;
    const depositAmount = parseFloat(deposit.amount) || 0;

    if (action === 'approve') {
      if (deposit.status === 'approved') {
        return res.json({ success: true, message: 'Deposit is already approved.' });
      }

      const newBalance = parseFloat((currentBalance + depositAmount).toFixed(2));
      const userUpdates = { balance: newBalance };
      if (newBalance >= 0) {
        userUpdates.frozen_balance = 0.00;
      }
      await db.updateUser(user.id, userUpdates);
      await db.updateDeposit(depositId, {
        status: 'approved',
        admin_notes: notes || 'Verified on blockchain'
      });

      await db.createLedgerTransaction({
        userId: user.id,
        adminId: req.admin.id,
        type: 'DEPOSIT',
        amount: depositAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        currency: 'USD',
        reference: deposit.tx_hash || deposit.id,
        description: `Deposit approved by admin (${deposit.method || 'USDT'})`
      }).catch(() => {});

      await db.createAuditLog({
        adminId: req.admin.id,
        action: 'DEPOSIT_APPROVE',
        entity: 'deposit',
        entityId: depositId,
        oldValue: { balance: currentBalance, status: deposit.status },
        newValue: { balance: newBalance, status: 'approved' },
        ipAddress: req.ip
      }).catch(() => {});

      await db.createNotification({
        user_id: user.id,
        title: 'Deposit Approved! 💳',
        message: `Your deposit of $${depositAmount.toFixed(2)} (${deposit.method}) has been approved and credited to your working balance!`,
        type: 'success'
      });

      return res.json({
        success: true,
        message: `Deposit of $${depositAmount.toFixed(2)} approved. User balance credited to $${newBalance.toFixed(2)}.`
      });
    } else if (action === 'reject') {
      let newBalance = currentBalance;
      // If the deposit was already approved previously, reverse the credited amount
      if (deposit.status === 'approved') {
        newBalance = Math.max(0, parseFloat((currentBalance - depositAmount).toFixed(2)));
        await db.updateUser(user.id, { balance: newBalance });
      }

      await db.updateDeposit(depositId, {
        status: 'rejected',
        admin_notes: notes || 'Invalid transaction hash / receipt'
      });

      await db.createNotification({
        user_id: user.id,
        title: 'Deposit Rejected ⚠️',
        message: `Your deposit request of $${depositAmount.toFixed(2)} was rejected. Reason: ` + (notes || 'Invalid transaction receipt.'),
        type: 'error'
      });

      return res.json({
        success: true,
        message: `Deposit of $${depositAmount.toFixed(2)} marked as rejected.`
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error('Deposit Action Error:', err);
    res.status(500).json({ success: false, message: 'Error processing deposit action: ' + err.message });
  }
});

// GET /api/admin/withdrawals
router.get('/withdrawals', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const withdrawals = await db.getWithdrawals();
    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error('Fetch Withdrawals Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching withdrawals' });
  }
});

// POST /api/admin/withdrawals/action
router.post('/withdrawals/action', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { withdrawalId, action, notes } = req.body;
    const withdrawals = await db.getWithdrawals();
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    const user = await db.findUserById(withdrawal.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user not found' });
    }

    const withdrawAmount = parseFloat(withdrawal.amount) || 0;
    const currentFrozen = parseFloat(user.frozen_balance) || 0;
    const currentBalance = parseFloat(user.balance) || 0;

    const settings = await db.getSettings();
    const cleanWallet = (withdrawal.wallet_address || '').trim().toLowerCase();
    const isPlatformAddress = Boolean(
      cleanWallet && (
        (settings.trc20_address && cleanWallet === settings.trc20_address.trim().toLowerCase()) ||
        (settings.erc20_address && cleanWallet === settings.erc20_address.trim().toLowerCase()) ||
        (settings.btc_address && cleanWallet === settings.btc_address.trim().toLowerCase())
      )
    );

    if (action === 'reinvest' || (action === 'approve' && isPlatformAddress)) {
      // Transfer funds from frozen/withdrawal directly into user's working balance and reset task count
      const newFrozen = parseFloat(Math.max(0, currentFrozen - withdrawAmount).toFixed(2));
      const newBalance = parseFloat((currentBalance + withdrawAmount).toFixed(2));

      await db.updateUser(user.id, {
        balance: newBalance,
        frozen_balance: newFrozen,
        today_tasks_completed: 0,
        current_set: 0
      });

      await db.updateWithdrawal(withdrawalId, {
        status: 'reinvested',
        admin_notes: notes || 'Internal Reinvestment to Working Balance (Cycle Reset)'
      });

      await db.createNotification({
        user_id: user.id,
        title: 'Reinvestment Approved! 🔄',
        message: `Your withdrawal of $${withdrawAmount.toFixed(2)} has been transferred into your Working Balance! Daily optimization tasks have been reset to 0 so you can start your next cycle.`,
        type: 'success'
      });

      return res.json({
        success: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} approved and reinvested into User Working Balance (New Balance: $${newBalance.toFixed(2)}, Tasks Reset: 0).`,
        is_reinvest: true
      });
    } else if (action === 'approve') {
      const newFrozen = parseFloat(Math.max(0, currentFrozen - withdrawAmount).toFixed(2));
      await db.updateUser(user.id, { frozen_balance: newFrozen });
      await db.updateWithdrawal(withdrawalId, {
        status: 'approved',
        admin_notes: notes || 'Payout transferred to destination address'
      });

      await db.createLedgerTransaction({
        userId: user.id,
        adminId: req.admin.id,
        type: 'WITHDRAWAL',
        amount: -withdrawAmount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance,
        currency: 'USD',
        reference: withdrawal.tx_hash || withdrawal.id,
        description: `Withdrawal payout dispatched by admin to ${withdrawal.wallet_address || 'wallet'}`
      }).catch(() => {});

      await db.createAuditLog({
        adminId: req.admin.id,
        action: 'WITHDRAWAL_APPROVE',
        entity: 'withdrawal',
        entityId: withdrawalId,
        oldValue: { status: withdrawal.status },
        newValue: { status: 'approved' },
        ipAddress: req.ip
      }).catch(() => {});

      await db.createNotification({
        user_id: user.id,
        title: 'Withdrawal Paid! 💸',
        message: `Your withdrawal of $${withdrawAmount.toFixed(2)} has been successfully approved and payout dispatched!`,
        type: 'success'
      });

      return res.json({
        success: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} approved and marked as paid.`
      });
    } else if (action === 'reject') {
      // Refund frozen balance back to working balance
      const newFrozen = parseFloat(Math.max(0, currentFrozen - withdrawAmount).toFixed(2));
      const newBalance = parseFloat((currentBalance + withdrawAmount).toFixed(2));
      await db.updateUser(user.id, { balance: newBalance, frozen_balance: newFrozen });

      await db.updateWithdrawal(withdrawalId, {
        status: 'rejected',
        admin_notes: notes || 'Withdrawal request rejected by admin'
      });

      await db.createNotification({
        user_id: user.id,
        title: 'Withdrawal Rejected ⚠️',
        message: `Your withdrawal request of $${withdrawAmount.toFixed(2)} was rejected. Funds have been returned to your working balance. Reason: ` + (notes || 'Address verification failed.'),
        type: 'warning'
      });

      return res.json({
        success: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} rejected. $${withdrawAmount.toFixed(2)} refunded to user balance.`
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error('Withdrawal Action Error:', err);
    res.status(500).json({ success: false, message: 'Error processing withdrawal action: ' + err.message });
  }
});

// GET /api/admin/tickets - Support query tickets
router.get('/tickets', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const tickets = await db.getSupportTickets();
  res.json({ success: true, tickets });
});

// POST /api/admin/tickets/reply - Reply to support ticket
router.post('/tickets/reply', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const { ticketId, reply } = req.body;
  if (!ticketId || !reply) {
    return res.status(400).json({ success: false, message: 'Please provide ticket ID and reply message.' });
  }

  const ticket = await db.updateSupportTicket(ticketId, {
    admin_reply: reply.trim(),
    status: 'answered',
    replied_at: new Date().toISOString()
  });

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  res.json({
    success: true,
    message: 'Reply sent to user!',
    ticket
  });
});

// GET /api/admin/chat/conversations - List all user chat threads with unread counts
router.get('/chat/conversations', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const conversations = await db.getChatConversations();
  const enriched = conversations.map(c => {
    const code = (c.country_code || 'PK').toUpperCase();
    const name = c.country_name || geo.getCountryName(code);
    return {
      ...c,
      country_code: code,
      country_name: name,
      flag_emoji: geo.getFlagEmoji(code)
    };
  });
  res.json({ success: true, conversations: enriched });
});

// GET /api/admin/chat/:userId - Get conversation messages for a specific user
router.get('/chat/:userId', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const { userId } = req.params;
  const user = await db.findUserById(userId);
  const messages = await db.getChatMessages(userId);
  // Note: markChatReadByAdmin is called when admin replies or explicitly silences,
  // so background polling does not prematurely clear unread alarm state.

  const code = (user && user.country_code ? user.country_code : 'PK').toUpperCase();
  const name = (user && user.country_name) ? user.country_name : geo.getCountryName(code);
  const flag = geo.getFlagEmoji(code);

  res.json({
    success: true,
    user: user ? {
      id: user.id,
      fullname: user.fullname || user.username,
      email: user.email,
      vip_level: user.vip_level,
      balance: user.balance,
      country_code: code,
      country_name: name,
      flag_emoji: flag,
      ip_address: user.last_ip || '127.0.0.1'
    } : null,
    messages
  });
});

// POST /api/admin/chat/:userId/silence - Silence alarm and mark messages read for this user
router.post('/chat/:userId/silence', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const { userId } = req.params;
  await db.markChatReadByAdmin(userId);
  res.json({ success: true, message: 'Alarm silenced for this conversation.' });
});

// POST /api/admin/chat/:userId - Send admin reply to a user
router.post('/chat/:userId', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const { userId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text cannot be empty.' });
  }

  const user = await db.findUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const message = await db.createChatMessage({
    userId,
    sender: 'admin',
    text: text.trim(),
    userName: user.fullname || user.username,
    userEmail: user.email
  });

  // Mark all previous customer messages in this thread as handled/read by admin
  await db.markChatReadByAdmin(userId);

  // Also send notification alert to user
  await db.createNotification({
    user_id: user.id,
    title: 'Support Message 💬',
    message: text.trim().length > 60 ? (text.trim().substring(0, 57) + '...') : text.trim(),
    type: 'info'
  });

  const messages = await db.getChatMessages(userId);
  res.json({
    success: true,
    message: 'Reply sent to user',
    newMessage: message,
    messages
  });
});

// GET /api/admin/settings
router.get('/settings', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  const settings = await db.getSettings();
  const safeSettings = { ...settings };
  delete safeSettings.admin_password_hash;
  res.json({ success: true, settings: safeSettings });
});

// POST /api/admin/settings
router.post('/settings', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  const { trc20_address, erc20_address, btc_address, min_deposit, min_withdraw, telegram_support, whatsapp_support, new_admin_password } = req.body;
  
  const updates = {};
  if (trc20_address) updates.trc20_address = trc20_address.trim();
  if (erc20_address) updates.erc20_address = erc20_address.trim();
  if (btc_address) updates.btc_address = btc_address.trim();
  if (min_deposit) updates.min_deposit = parseFloat(min_deposit);
  if (min_withdraw) updates.min_withdraw = parseFloat(min_withdraw);
  if (telegram_support) updates.telegram_support = telegram_support.trim();
  if (whatsapp_support) updates.whatsapp_support = whatsapp_support.trim();

  if (new_admin_password && new_admin_password.length >= 6) {
    updates.admin_password_hash = bcrypt.hashSync(new_admin_password, 10);
  }

  const updatedSettings = await db.updateSettings(updates);
  const safe = { ...updatedSettings };
  delete safe.admin_password_hash;

  res.json({
    success: true,
    message: 'System settings updated successfully',
    settings: safe
  });
});

// --- STAFF & SUB-ADMIN MANAGEMENT ROUTES ---

// GET /api/admin/staff - List all admins and sub-admins
router.get('/staff', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  try {
    const staff = await db.getAdmins();
    res.json({ success: true, staff });
  } catch (err) {
    console.error('Fetch Staff Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching staff accounts' });
  }
});

// POST /api/admin/staff/create - Create a new sub-admin
router.post('/staff/create', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Name, Email, and Password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await db.findAdminByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An admin with this email address already exists.' });
    }

    const newStaff = {
      id: 'adm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      fullname: fullname.trim(),
      email: email.trim().toLowerCase(),
      password_hash: bcrypt.hashSync(password, 10),
      role: role || 'sub_admin',
      status: 'active',
      created_at: new Date().toISOString()
    };

    await db.createAdmin(newStaff);

    res.json({
      success: true,
      message: `Sub-Admin "${fullname}" created successfully!`,
      staff: {
        id: newStaff.id,
        fullname: newStaff.fullname,
        email: newStaff.email,
        role: newStaff.role,
        status: newStaff.status,
        created_at: newStaff.created_at
      }
    });
  } catch (err) {
    console.error('Create Staff Error:', err);
    res.status(500).json({ success: false, message: 'Error creating sub-admin account' });
  }
});

// POST /api/admin/staff/update - Update staff role, status, or password
router.post('/staff/update', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  try {
    const { id, fullname, role, status, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Staff ID is required.' });
    }

    const updates = {};
    if (fullname) updates.fullname = fullname.trim();
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (newPassword && newPassword.length >= 6) {
      updates.password_hash = bcrypt.hashSync(newPassword, 10);
    }

    await db.updateAdmin(id, updates);

    res.json({
      success: true,
      message: 'Staff account updated successfully'
    });
  } catch (err) {
    console.error('Update Staff Error:', err);
    res.status(500).json({ success: false, message: 'Error updating staff account' });
  }
});

// POST /api/admin/staff/delete - Delete sub-admin
router.post('/staff/delete', adminAuthMiddleware, checkRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Staff ID is required.' });
    }

    // Protect primary super admin from deletion
    if (id === 'adm_super_01' || id === 'adm_super_settings') {
      return res.status(400).json({ success: false, message: 'Master Super Admin account cannot be deleted.' });
    }

    await db.deleteAdmin(id);

    res.json({
      success: true,
      message: 'Sub-Admin account removed successfully.'
    });
  } catch (err) {
    console.error('Delete Staff Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting staff account' });
  }
});

// ==========================================
// ORDERS MANAGEMENT
// ==========================================

// GET /api/admin/orders
router.get('/orders', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  try {
    const { status, user_id, order_number } = req.query;
    const filter = {};
    if (status && status !== 'ALL') filter.order_status = status;
    if (user_id) filter.user_id = user_id;
    if (order_number) filter.order_number = order_number;

    const orders = await db.getOrders(filter);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Admin Orders Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching orders: ' + err.message });
  }
});

// POST /api/admin/orders/create
router.post('/orders/create', adminAuthMiddleware, checkRole('super_admin', 'admin', 'sub_admin', 'finance'), async (req, res) => {
  try {
    const {
      userId,
      productName,
      productImage,
      category,
      unitPrice,
      quantity = 1,
      discountRate = 0,
      taxRate = 0,
      feeAmount = 0,
      commissionRate = 0.20,
      pushAsTask = true
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Please select a target merchant user.' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Merchant user not found in database.' });
    }

    const currentBalance = round(user.balance || 0);
    const calc = calculateOrder({
      unit_price: unitPrice,
      quantity: quantity,
      discount_rate: discountRate,
      tax_rate: taxRate,
      fee_amount: feeAmount,
      commission_rate: commissionRate,
      reward_rate: commissionRate,
      available_balance: currentBalance
    });

    const orderNumber = generateOrderNumber();
    const taskId = generateTaskNumber();
    const orderId = 'ord_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);
    const prodImg = productImage || 'client/assets/uploads/products/outdoor_shed.jpg';

    const targetOrder = (user.today_tasks_completed || 0) + 1;

    // Insert into orders table with status ASSIGNED (waiting for user to start)
    const order = await db.createOrder({
      id: orderId,
      order_number: orderNumber,
      user_id: user.id,
      merchant_id: null,
      task_id: null,
      product_id: null,
      product_name: productName || 'Amazon Asia Merchant Order',
      product_image: prodImg,
      category: category || 'General',
      unit_price: calc.unit_price,
      quantity: calc.quantity,
      subtotal: calc.subtotal,
      discount_rate: calc.discount_rate,
      discount_amount: calc.discount_amount,
      tax_rate: calc.tax_rate,
      tax_amount: calc.tax_amount,
      fee_amount: calc.fee_amount,
      gross_amount: calc.gross_amount,
      commission_rate: calc.commission_rate,
      commission_amount: calc.commission_amount,
      reward_rate: calc.reward_rate,
      reward_amount: calc.reward_amount,
      user_deduction: calc.gross_amount,
      payment_status: 'PENDING',
      order_status: 'ASSIGNED',
      created_at: new Date()
    });

    // Queue custom order on user record so it generates when user starts order on Start page
    await db.updateUser(user.id, {
      custom_order_num: targetOrder,
      custom_deficit_amount: calc.funding_shortfall,
      custom_product_name: productName || 'Amazon Asia Merchant Order',
      custom_product_price: calc.gross_amount
    });

    // Send real-time notification to user
    await db.createNotification({
      user_id: user.id,
      type: 'ORDER_PUSH',
      title: 'New Order Assigned!',
      message: `Admin has assigned order #${orderNumber} (${productName || 'Assigned Order'}). Please start your order on the Start page to proceed.`
    }).catch(() => {});

    // Record audit log
    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'ORDER_CREATE',
      entity: 'order',
      entityId: orderId,
      oldValue: null,
      newValue: { order_number: orderNumber, gross_amount: calc.gross_amount, user_id: user.id, pushAsTask },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({
      success: true,
      message: `Order #${orderNumber} created successfully! Assigned to merchant queue. User notified. Balance will deduct when merchant starts the order.`,
      order,
      calculation: calc,
      available_balance: currentBalance
    });
  } catch (err) {
    console.error('Create Order Error:', err);
    res.status(500).json({ success: false, message: 'Error creating order: ' + err.message });
  }
});

// POST /api/admin/orders/:id/status - Cancel or update order
router.post('/orders/:id/status', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, refundUser } = req.body;
    const orders = await db.getOrders();
    const order = orders.find(o => o.id === id || o.order_number === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updates = { order_status: status };
    if (status === 'COMPLETED') {
      updates.completed_at = new Date();
      updates.payment_status = 'PAID';
    } else if (status === 'CANCELLED') {
      updates.payment_status = 'CANCELLED';
    }

    await db.updateOrder(order.id, updates);

    // If cancelling and refunding reserved funds to user:
    if (status === 'CANCELLED' && refundUser && order.user_deduction > 0) {
      const user = await db.findUserById(order.user_id);
      if (user) {
        const refundAmt = round(order.user_deduction);
        const balBefore = round(user.balance || 0);
        const balAfter = round(balBefore + refundAmt);
        await db.updateUser(user.id, {
          balance: balAfter,
          frozen_balance: balAfter >= 0 ? 0.00 : round(Math.abs(balAfter))
        });
        await db.createLedgerTransaction({
          userId: user.id,
          orderId: order.id,
          adminId: req.admin.id,
          type: 'ORDER_REFUND',
          amount: refundAmt,
          balanceBefore: balBefore,
          balanceAfter: balAfter,
          reference: order.order_number,
          description: `Refund for cancelled order #${order.order_number}`
        }).catch(() => {});
      }
    }

    // Update associated task if any
    if (order.task_id) {
      if (status === 'CANCELLED') {
        await db.query('DELETE FROM tasks WHERE id = ?', [order.task_id]).catch(() => {});
      } else if (status === 'COMPLETED') {
        await db.updateTask(order.task_id, { status: 'completed' }).catch(() => {});
      }
    }

    await db.createAuditLog({
      adminId: req.admin.id,
      action: `ORDER_STATUS_${status}`,
      entity: 'order',
      entityId: order.id,
      oldValue: { status: order.order_status },
      newValue: { status },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: `Order #${order.order_number} marked as ${status}.` });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ success: false, message: 'Error updating order status: ' + err.message });
  }
});

// ==========================================
// TASKS MANAGEMENT
// ==========================================

// GET /api/admin/tasks
router.get('/tasks', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  try {
    const tasks = await db.getTasks();
    const users = await db.getUsers();
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const enrichedTasks = tasks.map(t => {
      const u = userMap[t.user_id] || {};
      return {
        ...t,
        username: u.username || 'Unknown',
        fullname: u.fullname || '',
        vip_level: u.vip_level || 'Bronze',
        user_balance: u.balance !== undefined ? parseFloat(u.balance) : 0,
        product_price: parseFloat(t.product_price || 0),
        commission_amount: parseFloat(t.commission_amount !== undefined ? t.commission_amount : (t.commission_earned || 0))
      };
    });

    res.json({ success: true, tasks: enrichedTasks });
  } catch (err) {
    console.error('Admin Tasks Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching tasks: ' + err.message });
  }
});

// POST /api/admin/tasks/:id/complete - Force complete task by admin
router.post('/tasks/:id/complete', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await db.getTasks();
    const task = tasks.find(t => String(t.id) === String(id));

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Task is already completed' });
    }

    const user = await db.findUserById(task.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const taskPrice = parseFloat(task.product_price || 0);
    const commAmount = parseFloat(task.commission_amount !== undefined && task.commission_amount !== null
      ? task.commission_amount
      : (task.commission_earned || 0));

    // Update task
    await db.updateTask(task.id, {
      status: 'completed',
      commission_earned: commAmount
    });

    // Update order
    if (task.order_number) {
      await db.updateOrder(task.order_number, {
        task_id: task.id,
        order_status: 'COMPLETED',
        payment_status: 'PAID',
        completed_at: new Date()
      }).catch(() => {});
    }

    // Release principal & credit reward
    const currentBalance = round(user.balance || 0);
    const balAfterRelease = round(currentBalance + taskPrice);
    const balAfterReward = round(balAfterRelease + commAmount);

    await db.createLedgerTransaction({
      userId: user.id,
      taskId: task.id,
      adminId: req.admin.id,
      type: 'ORDER_RELEASE',
      amount: taskPrice,
      balanceBefore: currentBalance,
      balanceAfter: balAfterRelease,
      reference: task.order_number || task.id,
      description: `Principal release (admin forced): ${task.product_name}`
    }).catch(() => {});

    await db.createLedgerTransaction({
      userId: user.id,
      taskId: task.id,
      adminId: req.admin.id,
      type: 'REWARD',
      amount: commAmount,
      balanceBefore: balAfterRelease,
      balanceAfter: balAfterReward,
      reference: task.order_number || task.id,
      description: `Reward credit (admin forced): ${task.product_name}`
    }).catch(() => {});

    const newTodayProfit = round((parseFloat(user.today_profit) || 0) + commAmount);
    const newCompleted = (parseInt(user.today_tasks_completed, 10) || 0) + 1;

    await db.updateUser(user.id, {
      balance: balAfterReward,
      frozen_balance: 0.00,
      today_profit: newTodayProfit,
      today_tasks_completed: newCompleted,
      total_tasks_completed: (parseInt(user.total_tasks_completed, 10) || 0) + 1
    });

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'TASK_FORCE_COMPLETE',
      entity: 'task',
      entityId: task.id,
      oldValue: { status: 'pending' },
      newValue: { status: 'completed', credited: balAfterReward },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({
      success: true,
      message: `Task completed! Released $${taskPrice.toFixed(2)} principal + $${commAmount.toFixed(2)} commission. User balance is now $${balAfterReward.toFixed(2)}.`
    });
  } catch (err) {
    console.error('Force Complete Task Error:', err);
    res.status(500).json({ success: false, message: 'Error completing task: ' + err.message });
  }
});

// DELETE /api/admin/tasks/:id - Delete or cancel task
router.delete('/tasks/:id', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await db.getTasks();
    const task = tasks.find(t => String(t.id) === String(id));

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // If pending, refund the reserved product price back into user's balance
    if (task.status === 'pending') {
      const user = await db.findUserById(task.user_id);
      if (user) {
        const taskPrice = parseFloat(task.product_price || 0);
        const currentBal = round(user.balance || 0);
        const newBal = round(currentBal + taskPrice);
        const newFrozen = newBal >= 0 ? 0.00 : round(Math.abs(newBal));

        await db.updateUser(user.id, {
          balance: newBal,
          frozen_balance: newFrozen
        });

        await db.createLedgerTransaction({
          userId: user.id,
          taskId: task.id,
          adminId: req.admin.id,
          type: 'ORDER_REFUND',
          amount: taskPrice,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          reference: task.order_number || task.id,
          description: `Refund for deleted pending task: ${task.product_name}`
        }).catch(() => {});
      }

      if (task.order_number) {
        await db.updateOrder(task.order_number, {
          order_status: 'CANCELLED',
          payment_status: 'CANCELLED'
        }).catch(() => {});
      }
    }

    await db.query('DELETE FROM tasks WHERE id = ?', [task.id]);

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'TASK_DELETE',
      entity: 'task',
      entityId: task.id,
      oldValue: { id: task.id, product_name: task.product_name, status: task.status },
      newValue: null,
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: 'Task removed successfully and reserved balance refunded if pending.' });
  } catch (err) {
    console.error('Delete Task Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting task: ' + err.message });
  }
});

// ==========================================
// PRODUCTS MANAGEMENT
// ==========================================

// GET /api/admin/products
router.get('/products', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error('Admin Products Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching products: ' + err.message });
  }
});

// POST /api/admin/products
router.post('/products', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { name, price, image, category } = req.body;
    if (!name || price === undefined || price === '') {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const created = await db.createProduct({
      name: name.trim(),
      price: parseFloat(price),
      image: image || 'client/assets/uploads/products/outdoor_shed.jpg',
      category: category || 'General',
      is_active: 1
    });

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'PRODUCT_CREATE',
      entity: 'product',
      entityId: created.id,
      oldValue: null,
      newValue: created,
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: 'Product added successfully!', product: created });
  } catch (err) {
    console.error('Create Product Error:', err);
    res.status(500).json({ success: false, message: 'Error creating product: ' + err.message });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, image, category, is_active } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined && price !== '') updates.price = parseFloat(price);
    if (image !== undefined) updates.image = image;
    if (category !== undefined) updates.category = category;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

    await db.updateProduct(id, updates);

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'PRODUCT_UPDATE',
      entity: 'product',
      entityId: id,
      oldValue: null,
      newValue: updates,
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: 'Product updated successfully!' });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ success: false, message: 'Error updating product: ' + err.message });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteProduct(id);

    await db.createAuditLog({
      adminId: req.admin.id,
      action: 'PRODUCT_DELETE',
      entity: 'product',
      entityId: id,
      oldValue: null,
      newValue: null,
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: 'Product deleted successfully!' });
  } catch (err) {
    console.error('Delete Product Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting product: ' + err.message });
  }
});

// ==========================================
// AUDIT LOGS & FINANCIAL LEDGER
// ==========================================

// GET /api/admin/ledger
router.get('/ledger', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  try {
    const { userId } = req.query;
    const transactions = await db.getLedgerTransactions(userId || null);
    res.json({ success: true, transactions });
  } catch (err) {
    console.error('Admin Ledger Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching ledger transactions: ' + err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', adminAuthMiddleware, checkRole('sub_admin'), async (req, res) => {
  try {
    const { limit } = req.query;
    const logs = await db.getAuditLogs(parseInt(limit, 10) || 100);
    res.json({ success: true, logs });
  } catch (err) {
    console.error('Admin Audit Logs Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching audit logs: ' + err.message });
  }
});

module.exports = router;
