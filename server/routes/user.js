const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/user/profile
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  const safeUser = { ...user };
  delete safeUser.password_hash;
  res.json({ success: true, user: safeUser });
});

// POST /api/user/profile
router.post('/profile', authMiddleware, (req, res) => {
  const { fullname, phone, gender } = req.body;
  const user = db.findUserById(req.user.id);

  const updates = {};
  if (fullname) updates.fullname = fullname.trim();
  if (phone) updates.phone = phone.trim();
  if (gender) updates.gender = gender;

  const updatedUser = db.updateUser(user.id, updates);
  const safeUser = { ...updatedUser };
  delete safeUser.password_hash;

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: safeUser
  });
});

// POST /api/user/change-password
router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.findUserById(req.user.id);

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide both current and new passwords.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Incorrect current password.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.updateUser(user.id, { password_hash: newHash });

  res.json({
    success: true,
    message: 'Password changed successfully.'
  });
});

// GET /api/user/kyc - Get KYC status
router.get('/kyc', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  const submissions = db.getKycSubmissions(user.id);
  res.json({
    success: true,
    kyc_status: user.kyc_status || 'none',
    kyc_notes: user.kyc_notes || '',
    latest_submission: submissions[0] || null
  });
});

// POST /api/user/kyc - Submit KYC Documents & Contract
router.post('/kyc', authMiddleware, (req, res) => {
  const { name, front_id, back_id, signature, investment_amount } = req.body;
  const user = db.findUserById(req.user.id);

  if (!name || !front_id || !back_id || !signature) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields: Name, Front ID, Back ID, and Signature.'
    });
  }

  const kycSubmission = {
    id: 'kyc_' + Date.now(),
    user_id: user.id,
    user_email: user.email,
    name: name.trim(),
    front_id_image: front_id,
    back_id_image: back_id,
    signature_image: signature,
    investment_amount: parseFloat(investment_amount) || 0,
    status: 'pending',
    rejection_reason: '',
    created_at: new Date().toISOString()
  };

  db.createKycSubmission(kycSubmission);
  db.updateUser(user.id, {
    kyc_status: 'pending',
    kyc_notes: ''
  });

  res.json({
    success: true,
    message: 'Merchant KYC and verification contract submitted successfully! Under review by administration.',
    submission: kycSubmission
  });
});

// GET /api/user/tickets - Get user support questions & replies
router.get('/tickets', authMiddleware, (req, res) => {
  const tickets = db.getSupportTickets(req.user.id);
  res.json({ success: true, tickets });
});

// POST /api/user/tickets - Submit new support question
router.post('/tickets', authMiddleware, (req, res) => {
  const { subject, message } = req.body;
  const user = db.findUserById(req.user.id);

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Please provide both subject and message.' });
  }

  const ticket = {
    id: 'tkt_' + Date.now(),
    user_id: user.id,
    user_email: user.email,
    user_name: user.fullname,
    subject: subject.trim(),
    message: message.trim(),
    admin_reply: '',
    status: 'open',
    created_at: new Date().toISOString(),
    replied_at: ''
  };

  db.createSupportTicket(ticket);

  res.json({
    success: true,
    message: 'Your inquiry has been submitted! Support will respond shortly.',
    ticket
  });
});

// GET /api/user/notifications - Get unread notifications
router.get('/notifications', authMiddleware, (req, res) => {
  const notifications = db.getNotifications(req.user.id, true);
  res.json({ success: true, notifications });
});

// POST & GET /api/user/notifications/mark-read - Mark user notifications as read
router.all('/notifications/mark-read', authMiddleware, (req, res) => {
  db.markNotificationsRead(req.user.id);
  res.json({ success: true, message: 'Notifications marked as read' });
});

// GET /api/user/levels
router.get('/levels', (req, res) => {
  res.json({
    success: true,
    levels: [
      { name: 'Bronze VIP', commission: '0.50%', min_balance: '$0.00', daily_tasks: 38 },
      { name: 'Silver VIP', commission: '0.80%', min_balance: '$500.00', daily_tasks: 45 },
      { name: 'Gold VIP', commission: '1.20%', min_balance: '$2,000.00', daily_tasks: 55 },
      { name: 'Platinum VIP', commission: '1.80%', min_balance: '$5,000.00', daily_tasks: 65 }
    ]
  });
});

module.exports = router;
