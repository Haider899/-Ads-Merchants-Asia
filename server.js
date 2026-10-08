const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const vhost = require('vhost');

const authRoutes = require('./server/routes/auth');
const taskRoutes = require('./server/routes/tasks');
const financeRoutes = require('./server/routes/finance');
const userRoutes = require('./server/routes/user');
const adminRoutes = require('./server/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable reverse proxy support so req.ip and req.headers['x-forwarded-for'] reflect real client IP
app.set('trust proxy', true);

// Middleware (Global for all vhosts)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// --- ADMIN SUBDOMAIN APP ---
const adminApp = express();
adminApp.set('trust proxy', true);

// adminApp needs its own middleware (vhost sub-apps don't inherit from parent)
adminApp.use(express.json({ limit: '50mb' }));
adminApp.use(express.urlencoded({ limit: '50mb', extended: true }));
adminApp.use(cookieParser());

// Serve static files for admin panel
adminApp.use('/assets', express.static(path.join(__dirname, 'assets')));
adminApp.use('/client', express.static(path.join(__dirname, 'client')));
adminApp.use('/css', express.static(path.join(__dirname, 'css')));

// Admin API Routes
adminApp.use('/api/admin', adminRoutes);

// Admin Frontend Routes
adminApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
adminApp.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
// Admin API Error Handler to guarantee JSON responses
adminApp.use((err, req, res, next) => {
  console.error('[Admin Server Error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Fallback for admin
adminApp.use((req, res) => {
  res.redirect('/');
});

// --- MAIN (USER) APP ---
const mainApp = express();
mainApp.set('trust proxy', true);

// User API Routes
mainApp.use('/api/auth', authRoutes);
mainApp.use('/api/tasks', taskRoutes);
mainApp.use('/api/finance', financeRoutes);
mainApp.use('/api/user', userRoutes);
mainApp.use('/api/admin', adminRoutes);

// Compatibility route for Amazon Asia dynamic sets (1st Set: 0/3, 2nd Set: 0/4, 3rd Set: 0/1)
mainApp.all(['/get_task_progress', '/User/get_task_progress'], async (req, res) => {
  try {
    let user = null;
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (token) {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('./server/middleware/auth');
      const decoded = jwt.verify(token, JWT_SECRET);
      user = await db.findUserById(decoded.id);
    }
    const completed = (user && user.today_tasks_completed) || 0;
    let setName = '1st Set';
    let totalInSet = 3;
    let currentInSet = completed;

    if (completed < 3) {
      setName = '1st Set';
      totalInSet = 3;
      currentInSet = completed;
    } else if (completed < 5) {
      setName = '2nd Set';
      totalInSet = 2;
      currentInSet = completed - 3;
    } else {
      setName = '3rd Set';
      totalInSet = 1;
      currentInSet = completed >= 6 ? 1 : (completed - 5);
    }

    res.json({
      success: true,
      set_name: setName,
      current_count: currentInSet,
      total_in_set: totalInSet,
      today_completed: completed
    });
  } catch (_) {
    res.json({
      success: true,
      set_name: '1st Set',
      current_count: 0,
      total_in_set: 3
    });
  }
});

// Helper to serve HTML files
const servePage = (fileName) => (req, res) => {
  res.sendFile(path.join(__dirname, 'views', fileName));
};

// Check active user session to auto-redirect from login/root to dashboard
const checkUserSessionRedirect = (req, res, next) => {
  const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('./server/middleware/auth');
      const decoded = jwt.verify(token, JWT_SECRET);
      return db.findUserById(decoded.id).then(user => {
        if (user) return res.redirect('/dashboard');
        res.clearCookie('token', { path: '/' });
        next();
      }).catch(() => next());
    } catch (_) {}
  }
  next();
};

// Route Mappings matching the original Ads Merchants Asia site
mainApp.get('/', checkUserSessionRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

mainApp.get(['/login', '/Login', '/login.html'], checkUserSessionRedirect, servePage('login.html'));
mainApp.get(['/register', '/Register', '/register.html', '/signup', '/Signup', '/signup.html'], checkUserSessionRedirect, servePage('register.html'));
mainApp.get(['/forgotpass', '/forgotpass.html'], servePage('forgotpass.html'));
mainApp.get(['/dashboard', '/dashboard.html'], servePage('dashboard.html'));
mainApp.get(['/recordData', '/record', '/record.html'], servePage('record.html'));
mainApp.get(['/startData', '/start', '/start.html'], servePage('start.html'));
mainApp.get(['/contactData', '/contact', '/contact.html'], servePage('contact.html'));
mainApp.get(['/profileData', '/profile', '/profile.html'], servePage('profile.html'));
mainApp.get(['/deposit', '/deposit.html', '/recharge'], servePage('deposit.html'));
mainApp.get(['/withdraw', '/withdraw.html', '/withdrawal'], servePage('withdraw.html'));
mainApp.get(['/license', '/license.html'], servePage('license.html'));
mainApp.get(['/contract', '/contract.html'], servePage('contract.html'));
mainApp.get(['/faqs', '/faqs.html'], servePage('faqs.html'));
mainApp.get(['/aboutData', '/about', '/about.html', '/aboutus'], servePage('about.html'));
mainApp.get(['/levelsData', '/levels', '/levels.html'], servePage('levels.html'));
mainApp.get(['/editprofileData*', '/editprofile*', '/editprofile.html'], servePage('editprofile.html'));

// Redirect old admin paths on main app to the subdomain or direct serve if accessed via IP
mainApp.get(['/admin', '/admin.html'], (req, res) => {
  const host = (req.hostname || req.headers.host || '').toLowerCase();
  if (host.includes('asiamerchantsads.com')) {
    return res.redirect('https://admin.asiamerchantsads.com');
  }
  if (host.includes('asiamerchants.com')) {
    return res.redirect('https://admin.asiamerchants.com');
  }
  if (host.includes('amazonasiamerchants.com')) {
    return res.redirect('https://admin.amazonasiamerchants.com');
  }
  if (host.includes('ads-merchants-asia.com')) {
    return res.redirect('https://admin.ads-merchants-asia.com');
  }
  // When accessing directly via IP (e.g. 200.97.165.154) or localhost: serve admin page directly
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Signout route
mainApp.get(['/signout', '/logout'], (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.redirect('/login');
});

// Fallback to dashboard or login
mainApp.use((req, res) => {
  if (req.cookies.token) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// --- VHOST MOUNTING ---
// Admin Subdomains
app.use(vhost('admin.asiamerchantsads.com', adminApp));
app.use(vhost('admin.asiamerchants.com', adminApp));
app.use(vhost('admin.amazonasiamerchants.com', adminApp));
app.use(vhost('admin.ads-merchants-asia.com', adminApp));
app.use(vhost('admin.localhost', adminApp)); // For local testing
if (process.env.ADMIN_DOMAIN) {
  app.use(vhost(process.env.ADMIN_DOMAIN, adminApp));
}

// Main Domains
app.use(vhost('asiamerchantsads.com', mainApp));
app.use(vhost('www.asiamerchantsads.com', mainApp));
app.use(vhost('asiamerchants.com', mainApp));
app.use(vhost('www.asiamerchants.com', mainApp));
app.use(vhost('amazonasiamerchants.com', mainApp));
app.use(vhost('www.amazonasiamerchants.com', mainApp));
app.use(vhost('ads-merchants-asia.com', mainApp));
app.use(vhost('www.ads-merchants-asia.com', mainApp));
app.use(vhost('localhost', mainApp)); // For local testing
if (process.env.DOMAIN_NAME) {
  app.use(vhost(process.env.DOMAIN_NAME, mainApp));
  app.use(vhost(`www.${process.env.DOMAIN_NAME}`, mainApp));
}

// Catch-all if vhost doesn't match (e.g. accessing via IP directly 200.97.165.154)
app.use(mainApp);

const db = require('./server/db');

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ads Merchants Asia Server Running on port ${PORT}`);
  console.log(`🔗 Local Main App: http://localhost:${PORT}`);
  console.log(`🔗 Local Admin App: http://admin.localhost:${PORT}`);
  console.log(`=======================================================`);
  
  if (db.ensureProductionSchema) {
    db.ensureProductionSchema().then(() => {
      return db.migrateDefaultWithdrawalMinimumToTen
        ? db.migrateDefaultWithdrawalMinimumToTen()
        : undefined;
    }).then(() => {
      return db.migrateDefaultDepositMinimumToTen
        ? db.migrateDefaultDepositMinimumToTen()
        : undefined;
    }).then(() => {
      return db.migrateDefaultDepositMinimumToOne
        ? db.migrateDefaultDepositMinimumToOne()
        : undefined;
    }).catch(err => {
      console.log('Production schema migration notice:', err.message);
    });
  }

  if (db.migrateUserIdsToSequential) {
    db.migrateUserIdsToSequential().catch(err => {
      console.log('Legacy User ID migration notice:', err.message);
    });
  }

  // Scheduled 24h Daily Reset: Automatically reset today_profit & today_tasks_completed for all users on new day
  setInterval(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Deficit Guard: never wipe progress or profit if user is currently in negative balance (deficit)
      await db.query(
        "UPDATE users SET today_profit = 0.00, today_tasks_completed = 0, current_set = 0, last_reset_date = ? WHERE (last_reset_date IS NULL OR last_reset_date != ?) AND balance >= 0",
        [today, today]
      );
    } catch (err) {
      console.error('[Scheduled Reset Error]', err.message);
    }
  }, 30 * 60 * 1000);
});
