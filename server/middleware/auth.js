const jwt = require('jsonwebtoken');
const db = require('../db');
const geo = require('../utils/geo');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'ads_merchants_asia_super_secret_jwt_key_2026';

// In-memory active sessions tracker: userId -> session details
const activeSessions = new Map();
const lastSessionDbSync = new Map(); // userId -> last db update timestamp
const onlineGeoCheckedIps = new Set(); // track IPs already checked online

function trackUserSession(user, req) {
  if (!user || !user.id) return;
  const clientIp = geo.extractClientIp ? geo.extractClientIp(req) : (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || req.ip));
  const tz = req.headers['x-client-timezone'] || (req.body && req.body.timezone) || user.timezone;
  const cfCountry = req.headers['cf-ipcountry'];
  const location = geo.lookupIp ? geo.lookupIp(clientIp, tz, cfCountry) : { ip: clientIp, countryCode: 'PK', countryName: 'Pakistan', city: 'Islamabad', flagEmoji: '🇵🇰' };

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

  const now = Date.now();
  const lastSync = lastSessionDbSync.get(String(user.id)) || 0;
  const needsImmediateSync = !user.country_code || !user.last_ip || (user.country_code === 'DE' && location.countryCode !== 'DE');

  // Automatically update user's location in DB, throttled to once every 3 minutes
  if (location.countryCode && (needsImmediateSync || (now - lastSync > 180000 && (user.country_code !== location.countryCode || user.last_ip !== location.ip)))) {
    user.country_code = location.countryCode;
    user.country_name = location.countryName;
    user.last_ip = location.ip;
    lastSessionDbSync.set(String(user.id), now);
    db.updateUser(user.id, {
      country_code: location.countryCode,
      country_name: location.countryName,
      last_ip: location.ip
    }).catch(() => {});
  }

  // Live online IP check (throttled to run once per IP address in background)
  if (geo.fetchOnlineGeo && clientIp && clientIp !== '127.0.0.1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.') && !onlineGeoCheckedIps.has(clientIp)) {
    onlineGeoCheckedIps.add(clientIp);
    geo.fetchOnlineGeo(clientIp).then(realLoc => {
      if (realLoc && realLoc.countryCode && (user.country_code !== realLoc.countryCode || user.country_code === 'DE')) {
        user.country_code = realLoc.countryCode;
        user.country_name = realLoc.countryName;
        user.last_ip = realLoc.ip;
        lastSessionDbSync.set(String(user.id), Date.now());
        db.updateUser(user.id, {
          country_code: realLoc.countryCode,
          country_name: realLoc.countryName,
          last_ip: realLoc.ip
        }).catch(() => {});
        const s = activeSessions.get(String(user.id));
        if (s) {
          s.countryCode = realLoc.countryCode;
          s.countryName = realLoc.countryName;
          s.flagEmoji = realLoc.flagEmoji;
        }
      }
    }).catch(() => {});
  }
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
  const cookies = req.cookies || {};
  const token = cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
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

function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.slice(0, 10);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

    // Auto-reset daily profit & tasks ONLY when the calendar date actually changes (24-hour cycle)
    const today = toDateString(new Date());
    const lastReset = toDateString(user.last_reset_date);
    
    if (!lastReset) {
      // First time initialization for today, do not wipe existing progress
      try {
        await db.updateUser(user.id, { last_reset_date: today });
        user.last_reset_date = today;
      } catch (_) {}
    } else if (lastReset !== today) {
      // DEFICIT GUARD: Check balance AND pending tasks/orders before resetting
      const userBal = parseFloat(user.balance || 0);
      let hasActiveDeficit = userBal < 0;

      if (!hasActiveDeficit) {
        try {
          const pendingRows = await db.query(
            'SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND status = "pending"',
            [user.id]
          );
          if (pendingRows && pendingRows[0] && parseInt(pendingRows[0].cnt, 10) > 0) {
            hasActiveDeficit = true;
          }
        } catch (_) {}
      }

      if (!hasActiveDeficit) {
        try {
          const shortfallRows = await db.query(
            'SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND payment_status = "SHORTFALL" AND order_status = "PROCESSING"',
            [user.id]
          );
          if (shortfallRows && shortfallRows[0] && parseInt(shortfallRows[0].cnt, 10) > 0) {
            hasActiveDeficit = true;
          }
        } catch (_) {}
      }

      if (!hasActiveDeficit) {
        try {
          await db.updateUser(user.id, {
            today_tasks_completed: 0,
            today_profit: 0.00,
            current_set: 0,
            commission_balance: 0.00,
            last_reset_date: today
          });
          user.today_tasks_completed = 0;
          user.today_profit = 0.00;
          user.current_set = 0;
          user.commission_balance = 0.00;
          user.last_reset_date = today;
        } catch (_) {}
      }
      // If hasActiveDeficit, do NOT reset — user must finish pending tasks first
    }

    req.user = user;
    trackUserSession(user, req);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

function adminAuthMiddleware(req, res, next) {
  const cookies = req.cookies || {};
  const token = cookies.admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

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
