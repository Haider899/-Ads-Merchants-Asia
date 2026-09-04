const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { adminAuthMiddleware, JWT_SECRET } = require('../middleware/auth');

// Role-based permission guard helper
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
    const role = (req.admin.role || '').toLowerCase();
    const normalizedRole = (role === 'support_operator') ? 'support' : ((role === 'finance_officer') ? 'finance' : role);

    const normalizedAllowed = allowedRoles.map(r => {
      if (r === 'support_operator') return 'support';
      if (r === 'finance_officer') return 'finance';
      return r.toLowerCase();
    });

    if (normalizedRole === 'super_admin' || normalizedAllowed.includes(normalizedRole)) {
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
        openTickets,
        totalTasksCompleted: tasks.filter(t => t.status === 'completed').length
      }
    });
  } catch (err) {
    console.error('Admin Metrics Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching metrics' });
  }
});

// GET /api/admin/users
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const usersList = await db.getUsers();
    const users = usersList.map(u => {
      const safe = { ...u };
      delete safe.password_hash;
      return safe;
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error('Admin Users Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// POST /api/admin/users/update
router.post('/users/update', adminAuthMiddleware, checkRole('sub_admin', 'finance'), async (req, res) => {
  const { userId, balance, frozen_balance, vip_level, status, add_balance, deduct_balance, reset_tasks } = req.body;
  const user = await db.findUserById(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const updates = {};
  if (vip_level) updates.vip_level = vip_level;
  if (status) updates.status = status;
  if (frozen_balance !== undefined && frozen_balance !== '') updates.frozen_balance = parseFloat(frozen_balance);

  if (reset_tasks) {
    updates.today_tasks_completed = 0;
    updates.current_set = 0;
  }

  if (balance !== undefined && balance !== null && balance !== '') {
    updates.balance = parseFloat(balance);
  } else if (add_balance) {
    updates.balance = parseFloat((user.balance + parseFloat(add_balance)).toFixed(2));
  } else if (deduct_balance) {
    updates.balance = parseFloat(Math.max(0, user.balance - parseFloat(deduct_balance)).toFixed(2));
  }

  const updated = await db.updateUser(userId, updates);
  const safe = { ...updated };
  delete safe.password_hash;

  res.json({
    success: true,
    message: 'User updated successfully',
    user: safe
  });
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
      await db.updateUser(user.id, { balance: newBalance });
      await db.updateDeposit(depositId, {
        status: 'approved',
        admin_notes: notes || 'Verified on blockchain'
      });

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

    if (action === 'approve') {
      const newFrozen = parseFloat(Math.max(0, currentFrozen - withdrawAmount).toFixed(2));
      await db.updateUser(user.id, { frozen_balance: newFrozen });
      await db.updateWithdrawal(withdrawalId, {
        status: 'approved',
        admin_notes: notes || 'Payout transferred to destination address'
      });

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
  res.json({ success: true, conversations });
});

// GET /api/admin/chat/:userId - Get conversation messages for a specific user
router.get('/chat/:userId', adminAuthMiddleware, checkRole('sub_admin', 'support'), async (req, res) => {
  const { userId } = req.params;
  const user = await db.findUserById(userId);
  const messages = await db.getChatMessages(userId);
  await db.markChatReadByAdmin(userId);
  res.json({
    success: true,
    user: user ? {
      id: user.id,
      fullname: user.fullname || user.username,
      email: user.email,
      vip_level: user.vip_level,
      balance: user.balance
    } : null,
    messages
  });
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

module.exports = router;
