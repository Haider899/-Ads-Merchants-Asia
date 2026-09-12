const jwt = require('jsonwebtoken');
const db = require('../db');
const geo = require('../utils/geo');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'ads_merchants_asia_super_secret_jwt_key_2026';

// In-memory active sessions tracker: userId -> session details
const activeSessions = new Map();

function trackUserSession(user, req) {
  if (!user || !user.id) return;
  const clientIp = geo.extractClientIp ? geo.extractClientIp(req) : (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || req.ip));
  const location = geo.lookupIp ? geo.lookupIp(clientIp, user.timezone) : { ip: clientIp, countryCode: 'PK', countryName: 'Pakistan', city: 'Islamabad', flagEmoji: '🇵🇰' };

  activeSessions.set(String(user.id), {
    userId: String(user.id),
    username: user.username,
    fullname: user.fullname,
    email: user.email,
    balance: user.balance,
    frozen_balance: user.frozen_balance,
    vip_level: user.vip_level,
    last_seen: Date.now(),
    ip: location.ip || clientIp,
    countryCode: location.countryCode || 'PK',
    countryName: location.countryName || 'Pakistan',
    city: location.city || '',
    flagEmoji: location.flagEmoji || '🇵🇰',
    user_agent: req.headers['user-agent'] || 'Unknown Device',
    path: req.headers['referer'] ? req.headers['referer'].split('/').slice(3).join('/') : (req.originalUrl || '/')
  });
}

function isUserOnline(userId) {
  if (!userId) return false;
  const s = activeSessions.get(String(userId));
  if (!s) return false;
  // Consider online if active within last 3 minutes (180,000 ms)
  return (Date.now() - s.last_seen) < 180000;
}

function kickSession(userId) {
  if (!userId) return false;
  return activeSessions.delete(String(userId));
}

function getActiveSessions() {
  const now = Date.now();
  const list = [];
  for (const [userId, s] of activeSessions.entries()) {
    if (now - s.last_seen < 180000) {
      list.push(s);
    } else if (now - s.last_seen > 600000) {
      // Clean up stale sessions older than 10 mins
      activeSessions.delete(userId);
    }
  }
  return list.sort((a, b) => b.last_seen - a.last_seen);
}

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await db.findUserById(decoded.id);
    if (!user && decoded.email) {
      user = await db.findUserByIdentifier(decoded.email);
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact support.' });
    }
    req.user = user;
    trackUserSession(user, req);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

function adminAuthMiddleware(req, res, next) {
  const token = req.cookies.admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session' });
  }
}

module.exports = {
  authMiddleware,
  adminAuthMiddleware,
  isUserOnline,
  getActiveSessions,
  kickSession,
  JWT_SECRET
};
