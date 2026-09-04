const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your login details.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact customer service.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    // Safe user object
    const safeUser = { ...user };
    delete safeUser.password_hash;

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullname, username: customUsername, phone, email, password, gender, referral_code } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    // Check if existing user
    const existing = await db.findUserByIdentifier(email) || (phone ? await db.findUserByIdentifier(phone) : null);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email or phone number already exists.' });
    }

    let username = customUsername ? customUsername.trim() : (email.split('@')[0] + Math.floor(100 + Math.random() * 900));
    const existingUserByUsername = await db.findUserByIdentifier(username);
    if (existingUserByUsername) {
      username = username + Math.floor(10 + Math.random() * 90);
    }
    const password_hash = bcrypt.hashSync(password, 10);
    const invite_code = 'ASIA-' + Math.floor(10000 + Math.random() * 90000);
    const nextUserId = await db.getNextUserId();

    const newUser = {
      id: nextUserId,
      fullname: fullname.trim(),
      username,
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      gender: gender || 'Male',
      password_hash,
      vip_level: 'Bronze',
      balance: 0.00,
      frozen_balance: 0.00,
      today_profit: 0.00,
      today_tasks_completed: 0,
      total_tasks_completed: 0,
      current_set: 0,
      invite_code,
      status: 'active',
      created_at: new Date().toISOString()
    };

    await db.createUser(newUser);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    const safeUser = { ...newUser };
    delete safeUser.password_hash;

    return res.json({
      success: true,
      message: 'Registration successful! Account activated.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration: ' + error.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const safeUser = { ...req.user };
  delete safeUser.password_hash;
  res.json({ success: true, user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Please provide registered email or phone' });
  }
  const user = await db.findUserByIdentifier(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: 'No registered account found with that identifier.' });
  }
  return res.json({
    success: true,
    message: 'Password reset link has been dispatched to your registered address.'
  });
});

module.exports = router;
