const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./server/routes/auth');
const taskRoutes = require('./server/routes/tasks');
const financeRoutes = require('./server/routes/finance');
const userRoutes = require('./server/routes/user');
const adminRoutes = require('./server/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Helper to serve HTML files
const servePage = (fileName) => (req, res) => {
  res.sendFile(path.join(__dirname, fileName));
};

// Route Mappings matching the original Ads Merchants Asia site
app.get('/', (req, res) => {
  if (req.cookies.token) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get(['/login', '/Login', '/login.html'], servePage('login.html'));
app.get(['/register', '/Register', '/register.html'], servePage('register.html'));
app.get(['/forgotpass', '/forgotpass.html'], servePage('forgotpass.html'));
app.get(['/dashboard', '/dashboard.html'], servePage('dashboard.html'));
app.get(['/recordData', '/record', '/record.html'], servePage('record.html'));
app.get(['/startData', '/start', '/start.html'], servePage('start.html'));
app.get(['/contactData', '/contact', '/contact.html'], servePage('contact.html'));
app.get(['/profileData', '/profile', '/profile.html'], servePage('profile.html'));
app.get(['/deposit', '/deposit.html', '/recharge'], servePage('deposit.html'));
app.get(['/withdraw', '/withdraw.html', '/withdrawal'], servePage('withdraw.html'));
app.get(['/license', '/license.html'], servePage('license.html'));
app.get(['/contract', '/contract.html'], servePage('contract.html'));
app.get(['/faqs', '/faqs.html'], servePage('faqs.html'));
app.get(['/aboutData', '/about', '/about.html', '/aboutus'], servePage('about.html'));
app.get(['/levelsData', '/levels', '/levels.html'], servePage('levels.html'));
app.get(['/admin', '/admin.html'], servePage('admin.html'));

// Signout route
app.get(['/signout', '/logout'], (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.redirect('/login');
});

// Fallback to dashboard or login
app.use((req, res) => {
  if (req.cookies.token) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ads Merchants Asia Server Running on port ${PORT}`);
  console.log(`🔗 Member Portal: http://localhost:${PORT}/login`);
  console.log(`🔗 Member Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`👑 Admin Management Panel: http://localhost:${PORT}/admin`);
  console.log(`=======================================================`);
});
