const express = require('express');
const path = require('path');
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

// Admin API Routes
adminApp.use('/api/admin', adminRoutes);

// Admin Frontend Routes
adminApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
adminApp.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
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
    } else if (completed < 7) {
      setName = '2nd Set';
      totalInSet = 4;
      currentInSet = completed - 3;
    } else {
      setName = '3rd Set';
      totalInSet = 1;
      currentInSet = completed >= 8 ? 1 : (completed - 7);
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

// Route Mappings matching the original Ads Merchants Asia site
mainApp.get('/', (req, res) => {
  if (req.cookies.token) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

mainApp.get(['/login', '/Login', '/login.html'], servePage('login.html'));
mainApp.get(['/register', '/Register', '/register.html', '/signup', '/Signup', '/signup.html'], servePage('register.html'));
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

// Redirect old admin paths on main app to the subdomain
mainApp.get(['/admin', '/admin.html'], (req, res) => {
  res.redirect('http://admin.ads-merchants-asia.com');
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
// Mount the admin app on the admin subdomain
app.use(vhost('admin.ads-merchants-asia.com', adminApp));
app.use(vhost('admin.localhost', adminApp)); // For local testing

// Mount the main app on the root domain and www
app.use(vhost('ads-merchants-asia.com', mainApp));
app.use(vhost('www.ads-merchants-asia.com', mainApp));
app.use(vhost('localhost', mainApp)); // For local testing

// Catch-all if vhost doesn't match (e.g. accessing via IP directly)
app.use(mainApp);

const db = require('./server/db');

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ads Merchants Asia Server Running on port ${PORT}`);
  console.log(`🔗 Local Main App: http://localhost:${PORT}`);
  console.log(`🔗 Local Admin App: http://admin.localhost:${PORT}`);
  console.log(`=======================================================`);
  
  if (db.ensureProductionSchema) {
    db.ensureProductionSchema().catch(err => {
      console.log('Production schema migration notice:', err.message);
    });
  }

  if (db.migrateUserIdsToSequential) {
    db.migrateUserIdsToSequential().catch(err => {
      console.log('Legacy User ID migration notice:', err.message);
    });
  }
});
