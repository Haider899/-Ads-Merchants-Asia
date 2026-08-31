const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = 'ads_merchants_asia_super_secret_jwt_key_2026';

function authMiddleware(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact support.' });
    }
    req.user = user;
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
  JWT_SECRET
};
