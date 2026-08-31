const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { adminAuthMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const settings = db.getSettings();

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please enter admin email and password' });
  }

  if (email.trim().toLowerCase() !== settings.admin_email.toLowerCase()) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  const isMatch = bcrypt.compareSync(password, settings.admin_password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  const adminToken = jwt.sign({ isAdmin: true, email: settings.admin_email }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('admin_token', adminToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

  res.json({
    success: true,
    message: 'Admin login successful',
    token: adminToken
  });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  res.json({ success: true, message: 'Admin logged out' });
});

// GET /api/admin/metrics
router.get('/metrics', adminAuthMiddleware, (req, res) => {
  const users = db.getUsers();
  const deposits = db.getDeposits();
  const withdrawals = db.getWithdrawals();
  const kycs = db.getKycSubmissions();
  const tickets = db.getSupportTickets();
  const tasks = db.getTasks();

  const totalUserBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const totalDeposits = deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWithdrawals = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const pendingKycs = kycs.filter(k => k.status === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;

  res.json({
    success: true,
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
});

// GET /api/admin/users
router.get('/users', adminAuthMiddleware, (req, res) => {
  const users = db.getUsers().map(u => {
    const safe = { ...u };
    delete safe.password_hash;
    return safe;
  });
  res.json({ success: true, users });
});

// POST /api/admin/users/update
router.post('/users/update', adminAuthMiddleware, (req, res) => {
  const { userId, balance, frozen_balance, vip_level, status, add_balance, deduct_balance, reset_tasks } = req.body;
  const user = db.findUserById(userId);

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

  const updated = db.updateUser(userId, updates);
  const safe = { ...updated };
  delete safe.password_hash;

  res.json({
    success: true,
    message: 'User updated successfully',
    user: safe
  });
});

// POST /api/admin/users/reset-password
router.post('/users/reset-password', adminAuthMiddleware, (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Please provide a valid password of at least 6 characters.' });
  }
  const user = db.resetUserPassword(userId, newPassword);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({
    success: true,
    message: `Password for ${user.fullname} (${user.email}) successfully reset.`
  });
});

// GET /api/admin/kyc - Get KYC verification requests
router.get('/kyc', adminAuthMiddleware, (req, res) => {
  const submissions = db.getKycSubmissions();
  res.json({ success: true, submissions });
});

// POST /api/admin/kyc/action - Approve, Reject, or Request Re-upload
router.post('/kyc/action', adminAuthMiddleware, (req, res) => {
  const { kycId, action, reason } = req.body; // action: 'approve' | 'reject' | 'reupload'
  const submissions = db.getKycSubmissions();
  const kyc = submissions.find(k => k.id === kycId);

  if (!kyc) {
    return res.status(404).json({ success: false, message: 'KYC submission not found' });
  }

  const user = db.findUserById(kyc.user_id);
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
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  db.updateKycSubmission(kycId, {
    status: newStatus,
    rejection_reason: reason || '',
    updated_at: new Date().toISOString()
  });

  if (user) {
    db.updateUser(user.id, {
      kyc_status: userKycStatus,
      kyc_notes: reason || ''
    });

    if (action === 'approve') {
      db.createNotification({
        user_id: user.id,
        title: 'KYC Verified! ✅',
        message: 'Congratulations! Your merchant identity documents have been verified and approved.',
        type: 'success'
      });
    } else if (action === 'reject') {
      db.createNotification({
        user_id: user.id,
        title: 'KYC Rejected ⚠️',
        message: 'Your KYC submission was rejected. Reason: ' + (reason || 'Documents could not be verified.'),
        type: 'error'
      });
    } else if (action === 'reupload') {
      db.createNotification({
        user_id: user.id,
        title: 'KYC Re-upload Required 📝',
        message: 'Please re-upload your verification documents. Instructions: ' + (reason || 'Clear photo required.'),
        type: 'warning'
      });
    }
  }

  res.json({
    success: true,
    message: `KYC submission marked as ${newStatus}. User notified.`
  });
});

// GET /api/admin/deposits
router.get('/deposits', adminAuthMiddleware, (req, res) => {
  const deposits = db.getDeposits();
  res.json({ success: true, deposits });
});

// POST /api/admin/deposits/action
router.post('/deposits/action', adminAuthMiddleware, (req, res) => {
  const { depositId, action, notes } = req.body;
  const deposits = db.getDeposits();
  const deposit = deposits.find(d => d.id === depositId);

  if (!deposit) {
    return res.status(404).json({ success: false, message: 'Deposit request not found' });
  }

  const user = db.findUserById(deposit.user_id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Associated user not found' });
  }

  if (action === 'approve') {
    const newBalance = parseFloat((user.balance + deposit.amount).toFixed(2));
    db.updateUser(user.id, { balance: newBalance });
    db.updateDeposit(depositId, {
      status: 'approved',
      admin_notes: notes || 'Verified on blockchain',
      approved_at: new Date().toISOString()
    });

    db.createNotification({
      user_id: user.id,
      title: 'Deposit Approved! 💳',
      message: `Your deposit of $${deposit.amount.toFixed(2)} (${deposit.method}) has been approved and credited to your working balance!`,
      type: 'success'
    });

    return res.json({
      success: true,
      message: `Deposit of $${deposit.amount.toFixed(2)} approved. User balance credited to $${newBalance.toFixed(2)}.`
    });
  } else if (action === 'reject') {
    db.updateDeposit(depositId, {
      status: 'rejected',
      admin_notes: notes || 'Invalid transaction hash / receipt',
      rejected_at: new Date().toISOString()
    });

    db.createNotification({
      user_id: user.id,
      title: 'Deposit Rejected ⚠️',
      message: `Your deposit request of $${deposit.amount.toFixed(2)} was rejected. Reason: ` + (notes || 'Invalid transaction receipt.'),
      type: 'error'
    });

    return res.json({
      success: true,
      message: `Deposit of $${deposit.amount.toFixed(2)} marked as rejected.`
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action' });
});

// GET /api/admin/withdrawals
router.get('/withdrawals', adminAuthMiddleware, (req, res) => {
  const withdrawals = db.getWithdrawals();
  res.json({ success: true, withdrawals });
});

// POST /api/admin/withdrawals/action
router.post('/withdrawals/action', adminAuthMiddleware, (req, res) => {
  const { withdrawalId, action, notes } = req.body;
  const withdrawals = db.getWithdrawals();
  const withdrawal = withdrawals.find(w => w.id === withdrawalId);

  if (!withdrawal) {
    return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
  }

  const user = db.findUserById(withdrawal.user_id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Associated user not found' });
  }

  if (action === 'approve') {
    const newFrozen = parseFloat(Math.max(0, user.frozen_balance - withdrawal.amount).toFixed(2));
    db.updateUser(user.id, { frozen_balance: newFrozen });
    db.updateWithdrawal(withdrawalId, {
      status: 'approved',
      admin_notes: notes || 'Payout transferred to destination address',
      approved_at: new Date().toISOString()
    });

    db.createNotification({
      user_id: user.id,
      title: 'Withdrawal Paid! 💸',
      message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been successfully approved and payout dispatched!`,
      type: 'success'
    });

    return res.json({
      success: true,
      message: `Withdrawal of $${withdrawal.amount.toFixed(2)} marked as approved/paid.`
    });
  } else if (action === 'reject') {
    const newFrozen = parseFloat(Math.max(0, user.frozen_balance - withdrawal.amount).toFixed(2));
    const newBalance = parseFloat((user.balance + withdrawal.amount).toFixed(2));

    db.updateUser(user.id, {
      balance: newBalance,
      frozen_balance: newFrozen
    });

    db.updateWithdrawal(withdrawalId, {
      status: 'rejected',
      admin_notes: notes || 'Rejected and refunded to account balance',
      rejected_at: new Date().toISOString()
    });

    db.createNotification({
      user_id: user.id,
      title: 'Withdrawal Refunded ⚠️',
      message: `Your withdrawal request of $${withdrawal.amount.toFixed(2)} was rejected and $${withdrawal.amount.toFixed(2)} has been refunded back to your working balance. Note: ` + (notes || 'Details unverified.'),
      type: 'warning'
    });

    return res.json({
      success: true,
      message: `Withdrawal rejected. $${withdrawal.amount.toFixed(2)} refunded to user balance.`
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action' });
});

// GET /api/admin/tickets - Support query tickets
router.get('/tickets', adminAuthMiddleware, (req, res) => {
  const tickets = db.getSupportTickets();
  res.json({ success: true, tickets });
});

// POST /api/admin/tickets/reply - Reply to support ticket
router.post('/tickets/reply', adminAuthMiddleware, (req, res) => {
  const { ticketId, reply } = req.body;
  if (!ticketId || !reply) {
    return res.status(400).json({ success: false, message: 'Please provide ticket ID and reply message.' });
  }

  const ticket = db.updateSupportTicket(ticketId, {
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

// GET /api/admin/settings
router.get('/settings', adminAuthMiddleware, (req, res) => {
  const settings = db.getSettings();
  const safeSettings = { ...settings };
  delete safeSettings.admin_password_hash;
  res.json({ success: true, settings: safeSettings });
});

// POST /api/admin/settings
router.post('/settings', adminAuthMiddleware, (req, res) => {
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

  const updatedSettings = db.updateSettings(updates);
  const safe = { ...updatedSettings };
  delete safe.admin_password_hash;

  res.json({
    success: true,
    message: 'System settings updated successfully',
    settings: safe
  });
});

module.exports = router;
