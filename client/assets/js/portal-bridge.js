/**
 * ADS MERCHANTS ASIA - PORTAL BRIDGE ENGINE
 * Central client-side controller that dynamically binds HTML pages to live REST APIs.
 */

(function() {
  // Global API Helper
  window.API = {
    async get(endpoint) {
      try {
        const res = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('register') && !window.location.pathname.includes('admin')) {
          window.location.href = '/login';
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error('API GET Error:', err);
        return { success: false, message: 'Network error occurred' };
      }
    },
    async post(endpoint, data) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (res.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/' && window.location.pathname !== '/index.html' && !window.location.pathname.includes('admin')) {
          window.location.href = '/login';
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error('API POST Error:', err);
        return { success: false, message: 'Network error occurred' };
      }
    }
  };

  // Toast notification helper with audio cue & high visibility
  window.showBridgeToast = function(title, message, type = 'info') {
    let container = document.getElementById('bridge-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bridge-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 420px;
        width: calc(100% - 32px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    // Play subtle notification chime
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(type === 'error' ? 380 : 750, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === 'error' ? 260 : 980, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.23);
    } catch (e) {
      // Audio cue fallback
    }

    const toast = document.createElement('div');
    const colorTheme = {
      success: { border: '#10b981', bg: '#ffffff', iconBg: '#d1fae5', iconColor: '#059669', icon: 'fa-check-circle' },
      error: { border: '#ef4444', bg: '#ffffff', iconBg: '#fee2e2', iconColor: '#dc2626', icon: 'fa-times-circle' },
      warning: { border: '#f59e0b', bg: '#ffffff', iconBg: '#fef3c7', iconColor: '#d97706', icon: 'fa-exclamation-circle' },
      info: { border: '#0284c7', bg: '#ffffff', iconBg: '#e0f2fe', iconColor: '#0284c7', icon: 'fa-bell' }
    }[type] || { border: '#0284c7', bg: '#ffffff', iconBg: '#e0f2fe', iconColor: '#0284c7', icon: 'fa-bell' };

    toast.style.cssText = `
      background: ${colorTheme.bg};
      color: #0f172a;
      border-left: 5px solid ${colorTheme.border};
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06);
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0;
      transform: translateY(-20px) scale(0.96);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      border-top: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    `;

    toast.innerHTML = `
      <div style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; background: ${colorTheme.iconBg}; color: ${colorTheme.iconColor}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
        <i class="fa ${colorTheme.icon}"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 12.5px; color: #475569; line-height: 1.4;">${message}</div>
      </div>
      <button style="background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; padding: 0 4px; line-height: 1;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-15px) scale(0.95)';
      setTimeout(() => toast.remove(), 300);
    }, 6000);
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const pathname = window.location.pathname.toLowerCase();

    // Ignore admin page entirely
    if (pathname.includes('admin')) return;

    // 1. Check Auth for Protected Pages
    const isProtected = ['dashboard', 'start', 'record', 'deposit', 'withdraw', 'profile', 'contract', 'editprofile'].some(p => pathname.includes(p));
    let currentUser = null;

    if (isProtected || pathname.includes('levels') || pathname.includes('license') || pathname.includes('contact')) {
      const authRes = await API.get('/api/auth/me');
      if (authRes && authRes.success && authRes.user) {
        currentUser = authRes.user;
        populateUserData(currentUser);
        checkUserNotifications();
        setInterval(checkUserNotifications, 3500); // Check every 3.5s for real-time alerts
      } else if (isProtected && !pathname.includes('login') && !pathname.includes('register') && pathname !== '/' && pathname !== '/index.html') {
        window.location.href = '/login';
        return;
      }
    }

    // 2. Page Specific Handlers
    if (pathname === '/' || pathname === '/index.html' || pathname.includes('login')) {
      initLoginPage();
    } else if (pathname.includes('register')) {
      initRegisterPage();
    } else if (pathname.includes('start')) {
      initStartPage(currentUser);
    } else if (pathname.includes('deposit')) {
      initDepositPage(currentUser);
    } else if (pathname.includes('withdraw')) {
      initWithdrawPage(currentUser);
    } else if (pathname.includes('record')) {
      initRecordPage(currentUser);
    } else if (pathname.includes('editprofile')) {
      initEditProfilePage(currentUser);
    } else if (pathname.includes('profile')) {
      initProfilePage(currentUser);
    } else if (pathname.includes('contract')) {
      initContractKycPage(currentUser);
    }
  });

  // Check unread admin notifications for user
  async function checkUserNotifications() {
    try {
      const res = await API.get('/api/user/notifications');
      if (res && res.success && res.notifications && res.notifications.length > 0) {
        for (const notif of res.notifications) {
          showBridgeToast(notif.title, notif.message, notif.type);
        }
        await API.post('/api/user/notifications/mark-read', {});

        // Refresh user profile balance
        const updatedMe = await API.get('/api/auth/me');
        if (updatedMe && updatedMe.success && updatedMe.user) {
          populateUserData(updatedMe.user);
        }
      }

      // Check unread chat messages from admin for floating button red badge
      const chatRes = await API.get('/api/user/chat');
      if (chatRes && chatRes.success && Array.isArray(chatRes.messages)) {
        const unreadFromAdmin = chatRes.messages.filter(m => m.sender === 'admin' && (m.read_by_user === 0 || m.read_by_user === false)).length;
        const chatBadge = document.getElementById('nativeChatBadge');
        if (chatBadge) {
          if (unreadFromAdmin > 0 && window._nativeChatOpen !== true) {
            chatBadge.textContent = unreadFromAdmin;
            chatBadge.style.display = 'flex';
          } else {
            chatBadge.style.display = 'none';
          }
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  // Populate dynamic user data across header, balance boxes, profile names
  function populateUserData(user) {
    if (!user) return;

    const displayName = user.username || user.fullname || 'User';

    document.querySelectorAll('.user-username').forEach(el => {
      el.innerHTML = `<span class="usernamee" style="margin-right: 4px;">Welcome</span> <span class="user-name-text" style="font-weight: 700;">${displayName}</span>`;
    });

    document.querySelectorAll('.username-display, #usernameDisplay, .profile-name').forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll('.user-fullname, #userFullName').forEach(el => {
      el.textContent = user.fullname || displayName;
    });

    const userBal = parseFloat(user.balance || 0).toFixed(2);
    const userProfit = parseFloat(user.today_profit || 0).toFixed(2);
    const userFrozen = parseFloat(user.frozen_balance || 0).toFixed(2);

    document.querySelectorAll(`
      .user-balance, 
      #userBalance, 
      .balance-amount, 
      .deposit-card-value, 
      .withdraw-card-value,
      #start-total-balance-text,
      #start-grandtotal-balance-text,
      #profile-total-balance,
      .profile-total-balance,
      .profile-balances-right .small-text
    `).forEach(el => {
      el.textContent = `USD ${userBal}`;
    });

    document.querySelectorAll(`
      .user-today-profit, 
      #todayProfit,
      #start-todays-profit-text,
      #profile-total-profit,
      .profile-total-profit,
      .profile-balances-left .small-text
    `).forEach(el => {
      el.textContent = `USD ${userProfit}`;
    });

    document.querySelectorAll('.user-frozen, #userFrozen').forEach(el => {
      el.textContent = `$${userFrozen}`;
    });

    document.querySelectorAll('.user-vip, #userVip, .vip-badge').forEach(el => {
      el.textContent = `${user.vip_level || 'Bronze'} VIP`;
    });

    document.querySelectorAll('.user-invite, #inviteCode').forEach(el => {
      el.textContent = user.invite_code || 'ASIA-88219';
    });

    const nameInput = document.getElementById('name');
    if (nameInput && !nameInput.value) nameInput.value = user.fullname;

    const userIdInput = document.getElementById('userId');
    if (userIdInput) {
      let displayId = String(user.id || '1001');
      if (displayId.startsWith('usr_')) {
        const numPart = displayId.replace(/\D/g, '');
        displayId = '10' + (numPart.slice(-2) || '01');
      }
      userIdInput.value = displayId;
    }
  }

  // LOGIN PAGE HANDLER
  function initLoginPage() {
    const form = document.getElementById('loginForm') || document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifierInput = document.getElementById('loginIdentifier') || document.querySelector('input[name="username"], input[name="email"], input[type="text"], input[type="email"]');
      const passwordInput = document.getElementById('loginPassword') || document.querySelector('input[name="password"], input[type="password"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!identifierInput || !passwordInput) return;

      const identifier = identifierInput.value.trim();
      const password = passwordInput.value;

      if (!identifier || !password) {
        showBridgeToast('Input Required', 'Please enter your email/username and password', 'error');
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Log In';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Logging In...';
      }

      try {
        const res = await API.post('/api/auth/login', { identifier, password });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }

        if (res && res.success) {
          showBridgeToast('Login Successful', `Welcome back, ${res.user.fullname || res.user.username}!`, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        } else {
          showBridgeToast('Login Failed', (res && res.message) || 'Invalid login credentials', 'error');
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        showBridgeToast('Login Error', err.message || 'An error occurred during login', 'error');
      }
    });
  }

  // REGISTER PAGE HANDLER
  function initRegisterPage() {
    const form = document.getElementById('signupForm') || document.getElementById('registerForm') || document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('fullname') || document.getElementById('signupName') || document.querySelector('input[name="fullname"]');
      const usernameInput = document.getElementById('username') || document.querySelector('input[name="username"]');
      const phoneInput = document.getElementById('signupPhone') || document.querySelector('input[name="phone"], input[type="tel"]');
      const emailInput = document.getElementById('email') || document.getElementById('signupEmail') || document.querySelector('input[name="email"], input[type="email"]');
      const passInput = document.getElementById('userpassword') || document.getElementById('signupPassword') || document.querySelector('input[name="password"]');
      const confirmPassInput = document.getElementById('confirmpassword') || document.querySelector('input[name="confirmpassword"]');
      const genderSelect = document.getElementById('signupGender') || document.querySelector('select[name="gender"]');
      const referralInput = document.getElementById('signupReferral') || document.querySelector('input[name="referral"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const usernameVal = usernameInput ? usernameInput.value.trim() : '';
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const passVal = passInput ? passInput.value : '';
      const confirmPassVal = confirmPassInput ? confirmPassInput.value : '';

      if (!nameVal || !emailVal || !passVal) {
        showBridgeToast('Validation Error', 'Please complete all required fields.', 'error');
        return;
      }

      if (confirmPassVal && passVal !== confirmPassVal) {
        showBridgeToast('Validation Error', 'Passwords do not match.', 'error');
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign Up';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating Account...';
      }

      try {
        const payload = {
          fullname: nameVal,
          username: usernameVal,
          phone: phoneVal,
          email: emailVal,
          password: passVal,
          gender: genderSelect ? genderSelect.value : 'Male',
          referral_code: referralInput ? referralInput.value.trim() : ''
        };

        const res = await API.post('/api/auth/register', payload);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }

        if (res && res.success) {
          showBridgeToast('Welcome!', res.message, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 600);
        } else {
          showBridgeToast('Registration Failed', (res && res.message) || 'Could not complete registration', 'error');
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        showBridgeToast('Registration Error', err.message || 'An error occurred during registration', 'error');
      }
    });
  }

  // START / TASK OPTIMIZATION ENGINE
  async function initStartPage(user) {
    const taskStatus = await API.get('/api/tasks/status');
    if (taskStatus && taskStatus.success) {
      updateTaskDisplay(taskStatus.data);
    }

    const startBtn = document.querySelector('.start-btn, #startOptimizationBtn, .start-item-start, button.btn-primary');
    if (startBtn) {
      startBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        startBtn.disabled = true;
        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Matching Merchant Order...';

        const res = await API.post('/api/tasks/generate', {});

        startBtn.disabled = false;
        startBtn.innerHTML = originalText;

        if (res && res.success && res.task) {
          showTaskModal(res.task);
        } else {
          showBridgeToast('Optimization Notice', (res && res.message) || 'Unable to grab order at this time.', 'error');
        }
      });
    }
  }

  function updateTaskDisplay(data) {
    if (!data) return;
    document.querySelectorAll('.task-completed-count, #completedOrderCount').forEach(el => {
      el.textContent = `${data.today_tasks_completed}/${data.max_tasks}`;
    });
    document.querySelectorAll('.task-balance, #workingBalance').forEach(el => {
      el.textContent = `$${parseFloat(data.balance).toFixed(2)}`;
    });
    document.querySelectorAll('.task-profit, #todayProfitVal').forEach(el => {
      el.textContent = `$${parseFloat(data.today_profit).toFixed(2)}`;
    });
  }

  function showTaskModal(task) {
    let modal = document.getElementById('taskModalOverlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'taskModalOverlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        backdrop-filter: blur(4px);
        padding: 15px;
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background: #fff; border-radius: 16px; max-width: 440px; width: 100%; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 16px;">
          <h5 style="margin: 0; font-size: 18px; font-weight: 700; color: #111;">Merchant Order Match</h5>
          <span style="background: #e8f5e9; color: #2e7d32; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">Order #${task.order_num}</span>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <img src="${task.product_image || 'assets/uploads/logo/1742595477_icon.png'}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; border: 1px solid #f0f0f0; padding: 4px;" />
          <div style="font-weight: 600; font-size: 15px; color: #222; margin-bottom: 6px; line-height: 1.3;">${task.product_name}</div>
          <div style="color: #666; font-size: 13px;">Merchant Value: <strong style="color: #111;">$${task.product_price.toFixed(2)}</strong></div>
        </div>
        <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: center;">
          <div>
            <div style="font-size: 12px; color: #777;">Commission Rate</div>
            <div style="font-size: 16px; font-weight: 700; color: #007bff;">${(task.commission_rate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #777;">Yield Profit</div>
            <div style="font-size: 16px; font-weight: 700; color: #28a745;">+$${task.commission_amount.toFixed(2)}</div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="cancelTaskBtn" style="flex: 1; padding: 12px; border: 1px solid #ddd; background: #fff; border-radius: 8px; font-weight: 600; cursor: pointer; color: #555;">Cancel</button>
          <button id="submitTaskBtn" style="flex: 2; padding: 12px; border: none; background: #28a745; color: #fff; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>Submit Optimization</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('cancelTaskBtn').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('submitTaskBtn').onclick = async () => {
      const submitBtn = document.getElementById('submitTaskBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting Review...';

      const res = await API.post('/api/tasks/submit', { taskId: task.id });

      if (res && res.success) {
        modal.style.display = 'none';
        showBridgeToast('Optimization Complete!', res.message, 'success');
        updateTaskDisplay({
          balance: res.data.balance,
          today_profit: res.data.today_profit,
          today_tasks_completed: res.data.today_tasks_completed,
          max_tasks: 38
        });
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Optimization';
        showBridgeToast('Submission Failed', (res && res.message) || 'Error submitting task', 'error');
      }
    };
  }

  // DEPOSIT PAGE HANDLER
  async function initDepositPage(user) {
    const walletsRes = await API.get('/api/finance/wallets');
    if (walletsRes && walletsRes.success && walletsRes.wallets) {
      const w = walletsRes.wallets;
      const trcAddressEl = document.getElementById('divToCopy') || document.querySelector('.copy-address');
      if (trcAddressEl) trcAddressEl.textContent = w.TRC20.address;
    }

    // Handle receipt file preview
    const receiptInput = document.getElementById('depositReceiptInput');
    const placeholder = document.getElementById('receiptUploadPlaceholder');
    const container = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');

    if (receiptInput) {
      receiptInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (previewImg) previewImg.src = ev.target.result;
          if (placeholder) placeholder.style.display = 'none';
          if (container) container.style.display = 'block';
        };
        reader.readAsDataURL(file);
      });
    }

    const form = document.querySelector('form.withdrawal-form') || document.getElementById('depositForm') || document.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amountInput = form.querySelector('input[name="deposit_amount"], input[name="amount"], #deposit-amount');
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .withdraw-btn');

        const amount = parseFloat(amountInput ? amountInput.value : 0);
        if (isNaN(amount) || amount < 20) {
          showBridgeToast('Invalid Amount', 'Minimum deposit is $20.00', 'error');
          return;
        }

        let proofImage = previewImg && previewImg.src ? previewImg.src : 'assets/uploads/contracts/id_sample_front.png';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting Deposit...';
        }

        const res = await API.post('/api/finance/deposit', {
          amount,
          method: 'TRC20',
          txid: '0x' + Math.random().toString(16).substring(2, 14) + Date.now().toString(16),
          proof_image: proofImage
        });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
        }

        if (res && res.success) {
          showBridgeToast('Deposit Submitted', res.message, 'success');
          if (amountInput) amountInput.value = '';
          if (receiptInput) receiptInput.value = '';
          if (placeholder) placeholder.style.display = 'block';
          if (container) container.style.display = 'none';
        } else {
          showBridgeToast('Deposit Failed', (res && res.message) || 'Error submitting deposit', 'error');
        }
      });
    }
  }

  // WITHDRAW PAGE HANDLER
  function initWithdrawPage(user) {
    const withdrawForms = document.querySelectorAll('form.withdrawal-form, #withdrawForm');
    if (!withdrawForms || !withdrawForms.length) return;

    withdrawForms.forEach(withdrawForm => {
      withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amountInput = withdrawForm.querySelector('input[name="withdraw_amount"], input[name="amount"], #withdraw-amount');
        const addressInput = withdrawForm.querySelector('input[name="wallet_address"], input[name="address"], #wallet-address');
        const networkSelect = withdrawForm.querySelector('select[name="usdt_network"], #usdt-network');
        const bankInput = withdrawForm.querySelector('input[name="bank_name"], #bank_name');
        const holderInput = withdrawForm.querySelector('input[name="account_holdername"], #account_holdername');
        const ibanInput = withdrawForm.querySelector('input[name="iban_number"], #iban_number');
        const submitBtn = withdrawForm.querySelector('button[type="submit"], .withdraw-btn');

        if (!amountInput) return;

        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount < 30) {
          showBridgeToast('Invalid Amount', 'Minimum withdrawal is $30.00', 'error');
          return;
        }

        const isFiat = withdrawForm.closest('#fiat-section') !== null;
        let payload = { amount };

        if (isFiat) {
          payload.method = 'BANK';
          payload.bank_name = bankInput ? bankInput.value.trim() : '';
          payload.account_holder = holderInput ? holderInput.value.trim() : '';
          payload.iban = ibanInput ? ibanInput.value.trim() : '';
          if (!payload.bank_name || !payload.account_holder || !payload.iban) {
            showBridgeToast('Incomplete Details', 'Please complete all bank transfer fields', 'error');
            return;
          }
        } else {
          payload.method = 'USDT';
          payload.network = (networkSelect && networkSelect.value !== 'Select Network') ? networkSelect.value : 'TRC20';
          payload.wallet_address = addressInput ? addressInput.value.trim() : '';
          if (!payload.wallet_address || payload.wallet_address.length < 10) {
            showBridgeToast('Invalid Address', 'Please provide a valid USDT destination address', 'error');
            return;
          }
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';
        }

        try {
          const res = await API.post('/api/finance/withdraw', payload);
          if (res && res.success) {
            showBridgeToast('Withdrawal Requested', res.message, 'success');
            amountInput.value = '';
            if (addressInput) addressInput.value = '';
            if (ibanInput) ibanInput.value = '';
            if (res.new_balance !== undefined) {
              document.querySelectorAll('.user-balance, #userBalance, .withdraw-card-value').forEach(el => {
                el.textContent = `USD ${parseFloat(res.new_balance).toFixed(2)}`;
              });
            }
          } else {
            showBridgeToast('Withdrawal Failed', (res && res.message) || 'Error submitting withdrawal', 'error');
          }
        } catch (err) {
          showBridgeToast('Error', 'Connection error while processing withdrawal', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Withdraw';
          }
        }
      });
    });
  }

  // RECORD PAGE HANDLER
  async function initRecordPage(user) {
    const tasksRes = await API.get('/api/tasks/records');
    const container = document.getElementById('recordListContainer') || document.querySelector('.record-item-tab');

    if (!container || !tasksRes || !tasksRes.tasks) return;

    function renderTasks(records) {
      if (records.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #888;">
            <i class="fa fa-inbox" style="font-size: 38px; margin-bottom: 10px; opacity: 0.5;"></i>
            <div>No transaction records found.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = records.map(r => {
        const isDeposit = r.type === 'deposit';
        const isWithdrawal = r.type === 'withdrawal';
        const iconBg = isDeposit ? '#e8f5e9' : (isWithdrawal ? '#fff3e0' : '#f0f7ff');
        const iconColor = isDeposit ? '#2e7d32' : (isWithdrawal ? '#e65100' : '#007bff');
        const iconText = isDeposit ? 'DEP' : (isWithdrawal ? 'WTH' : `#${r.order_num || 1}`);

        const isCompleted = r.status === 'completed' || r.status === 'approved';
        const isPending = r.status === 'pending';
        const statusColor = isCompleted ? '#28a745' : (isPending ? '#ff9800' : '#dc3545');

        return `
          <div style="background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="width: 44px; height: 44px; background: ${iconBg}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${iconColor}; font-weight: 700; font-size: 13px;">
                ${iconText}
              </div>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #222; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.title}</div>
                <div style="font-size: 12px; color: #888;">${new Date(r.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: ${isWithdrawal ? '#e53935' : '#28a745'}; font-size: 15px;">${r.amount}</div>
              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${statusColor};">
                ${r.status}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderTasks(tasksRes.tasks);

    document.querySelectorAll('.record-nav-item').forEach((tab, index) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.record-nav-item').forEach(t => t.classList.remove('record-nav-item-active'));
        tab.classList.add('record-nav-item-active');

        if (index === 0) renderTasks(tasksRes.tasks);
        else if (index === 1) renderTasks(tasksRes.tasks.filter(t => t.status === 'pending'));
        else if (index === 2) renderTasks(tasksRes.tasks.filter(t => t.status === 'completed' || t.status === 'approved'));
      });
    });
  }

  // CONTRACT / KYC SUBMISSION HANDLER
  async function initContractKycPage(user) {
    const kycRes = await API.get('/api/user/kyc');
    const form = document.getElementById('invite_submit_form') || document.querySelector('form');

    if (kycRes && kycRes.success && kycRes.kyc_status !== 'none') {
      let banner = document.createElement('div');
      const statusColor = kycRes.kyc_status === 'approved' ? '#d4edda' : (kycRes.kyc_status === 'rejected' ? '#f8d7da' : '#fff3cd');
      const textColor = kycRes.kyc_status === 'approved' ? '#155724' : (kycRes.kyc_status === 'rejected' ? '#721c24' : '#856404');
      banner.style.cssText = `
        background: ${statusColor};
        color: ${textColor};
        padding: 14px 18px;
        border-radius: 10px;
        margin-bottom: 20px;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(0,0,0,0.05);
      `;
      banner.innerHTML = `
        <i class="fa fa-info-circle mr-2"></i> KYC Verification Status: <strong style="text-transform: uppercase;">${kycRes.kyc_status}</strong>
        ${kycRes.kyc_notes ? `<div style="font-size: 13px; font-weight: normal; margin-top: 4px;">Admin Note: ${kycRes.kyc_notes}</div>` : ''}
      `;
      const formBody = document.querySelector('.form-body') || form;
      if (formBody) formBody.parentNode.insertBefore(banner, formBody);
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('name');
        const investmentInput = document.getElementById('investmentAmount');
        const sigInput = document.getElementById('signatureCInput');
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

        const name = nameInput ? nameInput.value.trim() : (user.fullname || '');
        const investment_amount = investmentInput ? investmentInput.value.trim() : 5000;
        let signature = sigInput ? sigInput.value.trim() : '';

        if (!signature) {
          const canvas = document.getElementById('signature_c');
          if (canvas) signature = canvas.toDataURL();
        }

        const frontImgEl = document.getElementById('frontPreviewImg');
        const backImgEl = document.getElementById('backPreviewImg');

        const front_id = (frontImgEl && frontImgEl.src) || 'assets/uploads/contracts/id_sample_front.png';
        const back_id = (backImgEl && backImgEl.src) || 'assets/uploads/contracts/id_sample_back.png';

        if (!name) {
          showBridgeToast('Name Required', 'Please enter your full legal name.', 'error');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting Contract & KYC...';
        }

        const res = await API.post('/api/user/kyc', {
          name,
          front_id,
          back_id,
          signature: signature || 'assets/uploads/contracts/defaultsignature.jpeg',
          investment_amount
        });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        }

        if (res && res.success) {
          showBridgeToast('Contract Submitted!', res.message, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          showBridgeToast('Submission Error', (res && res.message) || 'Error submitting KYC', 'error');
        }
      });
    }
  }

  // PROFILE PAGE HANDLER
  function initProfilePage(user) {
    const changePassForm = document.getElementById('changePasswordForm');
    if (changePassForm) {
      changePassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmNewPassword').value;

        if (newPass !== confirmPass) {
          showBridgeToast('Error', 'New passwords do not match.', 'error');
          return;
        }

        const res = await API.post('/api/user/change-password', {
          currentPassword: currentPass,
          newPassword: newPass
        });

        if (res && res.success) {
          showBridgeToast('Success', 'Password updated successfully!', 'success');
          changePassForm.reset();
        } else {
          showBridgeToast('Failed', (res && res.message) || 'Error updating password', 'error');
        }
      });
    }
  }

  // EDIT PROFILE & SECURITY PAGE HANDLER
  function initEditProfilePage(user) {
    if (!user) return;

    const nameInput = document.getElementById('editFullName');
    const emailInput = document.getElementById('editEmail');
    const phoneInput = document.getElementById('editPhone');
    const genderSelect = document.getElementById('editGender');

    if (nameInput) nameInput.value = user.fullname || user.username || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (genderSelect && user.gender) genderSelect.value = user.gender;

    const profileForm = document.getElementById('editProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('editFullName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const gender = document.getElementById('editGender').value;
        const btn = document.getElementById('saveProfileBtn');

        btn.disabled = true;
        btn.textContent = 'Saving Profile...';

        const res = await API.post('/api/user/profile', { fullname, phone, gender });

        btn.disabled = false;
        btn.textContent = 'Save Profile Changes';

        if (res && res.success) {
          showBridgeToast('Profile Updated', res.message, 'success');
          if (res.user) populateUserData(res.user);
        } else {
          showBridgeToast('Update Error', (res && res.message) || 'Failed to update profile', 'error');
        }
      });
    }

    const passForm = document.getElementById('changePasswordForm');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const btn = document.getElementById('savePasswordBtn');

        if (newPassword !== confirmNewPassword) {
          showBridgeToast('Validation Error', 'New passwords do not match.', 'error');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Updating Password...';

        const res = await API.post('/api/user/change-password', { currentPassword, newPassword });

        btn.disabled = false;
        btn.textContent = 'Update Password';

        if (res && res.success) {
          showBridgeToast('Password Changed', res.message, 'success');
          passForm.reset();
        } else {
          showBridgeToast('Error', (res && res.message) || 'Could not change password', 'error');
        }
      });
    }
  }

  // PROFILE PAGE HANDLER
  function initProfilePage(user) {
    if (!user) return;
    populateUserData(user);
  }

  // NATIVE LIVE CUSTOMER SUPPORT CHAT ENGINE (NO AI - DIRECT ADMIN LINK)
  function initLiveChatWidget(user) {
    if (!user) return;

    if (document.getElementById('nativeChatFloatingBtn')) return;

    // Inject styles
    const style = document.createElement('style');
    style.innerHTML = `
      #nativeChatFloatingBtn {
        position: fixed;
        bottom: 82px;
        right: 16px;
        background: #00875a;
        color: #ffffff;
        border-radius: 26px;
        padding: 9px 16px 9px 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        box-shadow: 0 5px 22px rgba(0, 135, 90, 0.42);
        cursor: pointer;
        z-index: 999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        font-size: 13.5px;
        letter-spacing: 0.3px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        user-select: none;
      }
      #nativeChatFloatingBtn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 8px 25px rgba(0, 135, 90, 0.55);
      }
      #nativeChatFloatingBtn:active {
        transform: scale(0.97);
      }
      .native-chat-label {
        display: inline-block;
        font-weight: 700;
        font-size: 13.5px;
        line-height: 1;
        color: #ffffff;
      }
      #nativeChatBadge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #e71d36;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      }
      #nativeChatWindow {
        position: fixed;
        bottom: 85px;
        right: 16px;
        width: 380px;
        height: 560px;
        max-height: calc(100vh - 100px);
        max-width: calc(100vw - 32px);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        display: none;
        flex-direction: column;
        z-index: 999999;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border: 1px solid rgba(0,0,0,0.08);
      }
      @media (max-width: 480px) {
        #nativeChatFloatingBtn {
          bottom: 78px;
          right: 14px;
          padding: 8px 14px 8px 10px;
          font-size: 13px;
        }
        #nativeChatWindow {
          bottom: 76px;
          right: 12px;
          left: 12px;
          width: calc(100% - 24px);
          max-height: calc(100vh - 90px);
        }
      }
      .native-chat-header {
        background: #00875a;
        color: #ffffff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .native-chat-agent {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .native-chat-agent img {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #ffffff;
        padding: 2px;
      }
      .native-chat-agent-info {
        display: flex;
        flex-direction: column;
      }
      .native-chat-agent-name {
        font-weight: 700;
        font-size: 15px;
        line-height: 1.2;
      }
      .native-chat-agent-status {
        font-size: 11px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .native-chat-status-dot {
        width: 7px;
        height: 7px;
        background: #4ade80;
        border-radius: 50%;
      }
      .native-chat-actions button {
        background: none;
        border: none;
        color: #ffffff;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 6px;
        opacity: 0.85;
      }
      .native-chat-actions button:hover { opacity: 1; }
      .native-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .native-chat-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13.5px;
        line-height: 1.4;
        word-break: break-word;
        position: relative;
      }
      .native-bubble-user {
        align-self: flex-end;
        background: #e2e8f0;
        color: #0f172a;
        border-bottom-right-radius: 4px;
      }
      .native-bubble-admin {
        align-self: flex-start;
        background: #00875a;
        color: #ffffff;
        border-bottom-left-radius: 4px;
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .native-bubble-time {
        font-size: 10px;
        opacity: 0.7;
        margin-top: 4px;
        text-align: right;
      }
      .native-chat-footer {
        padding: 12px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .native-chat-input {
        flex: 1;
        border: 1px solid #cbd5e1;
        border-radius: 20px;
        padding: 10px 16px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s ease;
      }
      .native-chat-input:focus {
        border-color: #00875a;
      }
      .native-chat-send-btn {
        width: 40px;
        height: 40px;
        background: #00875a;
        color: #fff;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      .native-chat-send-btn:hover { background: #006c48; }
    `;
    document.head.appendChild(style);

    // Create Floating Trigger Button with Reliable Crisp SVG Icon
    const floatBtn = document.createElement('div');
    floatBtn.id = 'nativeChatFloatingBtn';
    floatBtn.title = 'Live Support Chat';
    floatBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="native-chat-label">Chat</span>
      <span id="nativeChatBadge">0</span>
    `;
    document.body.appendChild(floatBtn);

    // Create Chat Window with Reliable Crisp SVG Send Icon
    const chatWin = document.createElement('div');
    chatWin.id = 'nativeChatWindow';
    chatWin.innerHTML = `
      <div class="native-chat-header">
        <div class="native-chat-agent">
          <img src="/client/assets/img/icons/customer-service1.svg" alt="Support Agent" onerror="this.style.display='none'" />
          <div class="native-chat-agent-info">
            <span class="native-chat-agent-name">Official Support</span>
            <span class="native-chat-agent-status"><span class="native-chat-status-dot"></span> Admin Online</span>
          </div>
        </div>
        <div class="native-chat-actions">
          <button id="nativeChatCloseBtn" title="Close Chat">&times;</button>
        </div>
      </div>
      <div class="native-chat-messages" id="nativeChatMsgContainer">
        <div class="text-center text-muted py-3" style="font-size: 12px;">Loading chat history...</div>
      </div>
      <div class="native-chat-footer">
        <input type="text" id="nativeChatTextInput" class="native-chat-input" placeholder="Type here and press enter..." />
        <button id="nativeChatSendBtn" class="native-chat-send-btn" title="Send Message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(chatWin);

    let chatOpen = false;
    let pollInterval = null;
    let cachedMessagesCount = -1;

    function toggleChat(open) {
      chatOpen = open !== undefined ? open : !chatOpen;
      window._nativeChatOpen = chatOpen;
      chatWin.style.display = chatOpen ? 'flex' : 'none';
      if (chatOpen) {
        floatBtn.style.display = 'none';
        const chatBadge = document.getElementById('nativeChatBadge');
        if (chatBadge) chatBadge.style.display = 'none';
        cachedMessagesCount = -1; // Force immediate refresh on open
        loadChatMessages();
        if (!pollInterval) pollInterval = setInterval(loadChatMessages, 3000);
        setTimeout(() => {
          const input = document.getElementById('nativeChatTextInput');
          if (input) input.focus();
        }, 100);
      } else {
        floatBtn.style.display = 'flex';
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }

    floatBtn.addEventListener('click', () => toggleChat(true));
    document.getElementById('nativeChatCloseBtn').addEventListener('click', () => toggleChat(false));

    // Also bind click on any element with id/class for online chat (e.g. on contact.html)
    document.querySelectorAll('.contact-item, #onlineChatTrigger, [onclick*="tawk"]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChat(true);
      });
    });

    async function loadChatMessages() {
      try {
        const res = await API.get('/api/user/chat');
        const container = document.getElementById('nativeChatMsgContainer');
        if (!container) return;

        if (res && res.success && Array.isArray(res.messages)) {
          if (res.messages.length === 0) {
            container.innerHTML = `
              <div style="text-align: center; color: #64748b; font-size: 13px; margin: auto 0; padding: 20px;">
                <div style="font-size: 32px; margin-bottom: 8px;">👋</div>
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Welcome to Live Support!</div>
                <div>Send your question or deposit/withdrawal query below. A human support specialist will assist you.</div>
              </div>
            `;
            return;
          }

          if (res.messages.length !== cachedMessagesCount) {
            cachedMessagesCount = res.messages.length;
            container.innerHTML = res.messages.map(m => {
              const isUser = m.sender === 'user';
              const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const msgText = m.text || m.message_text || '';
              if (isUser) {
                return `
                  <div class="native-chat-bubble native-bubble-user">
                    <div>${escapeHtml(msgText)}</div>
                    <div class="native-bubble-time">${time}</div>
                  </div>
                `;
              } else {
                return `
                  <div class="native-chat-bubble native-bubble-admin">
                    <img src="/client/assets/img/icons/customer-service1.svg" style="width: 20px; height: 20px; border-radius: 50%; background: #fff; padding: 1px; flex-shrink: 0;" onerror="this.style.display='none'" />
                    <div style="flex: 1;">
                      <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px; opacity: 0.9;">Ads Support</div>
                      <div>${escapeHtml(msgText)}</div>
                      <div class="native-bubble-time" style="text-align: left; color: #e2e8f0;">${time}</div>
                    </div>
                  </div>
                `;
              }
            }).join('');
            container.scrollTop = container.scrollHeight;
          }
        } else if (!res || !res.success) {
          // If empty and initial state, show friendly welcome
          if (container.querySelector('.text-muted')) {
            container.innerHTML = `
              <div style="text-align: center; color: #64748b; font-size: 13px; margin: auto 0; padding: 20px;">
                <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Live Customer Care</div>
                <div>Official support is online. Send your question below!</div>
              </div>
            `;
          }
        }
      } catch (err) {
        console.error('Chat load error:', err);
      }
    }

    async function sendMessage() {
      const input = document.getElementById('nativeChatTextInput');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      const container = document.getElementById('nativeChatMsgContainer');

      // Clear any initial greeting placeholder
      const placeholder = container.querySelector('.text-muted');
      if (placeholder) placeholder.remove();

      // Optimistic UI render
      const tempBubble = document.createElement('div');
      tempBubble.className = 'native-chat-bubble native-bubble-user';
      tempBubble.innerHTML = `
        <div>${escapeHtml(text)}</div>
        <div class="native-bubble-time sending-status">Sending...</div>
      `;
      container.appendChild(tempBubble);
      container.scrollTop = container.scrollHeight;

      try {
        const res = await API.post('/api/user/chat', { text });
        if (res && res.success) {
          cachedMessagesCount = -1; // Force immediate re-render
          await loadChatMessages();
        } else {
          const statusEl = tempBubble.querySelector('.sending-status');
          if (statusEl) {
            statusEl.textContent = 'Failed to send';
            statusEl.style.color = '#ef4444';
          }
        }
      } catch (err) {
        const statusEl = tempBubble.querySelector('.sending-status');
        if (statusEl) {
          statusEl.textContent = 'Error';
          statusEl.style.color = '#ef4444';
        }
      }
    }

    document.getElementById('nativeChatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('nativeChatTextInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    function escapeHtml(str) {
      return (str || '').toString().replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );
    }
  }

  // Bind live chat initialization when user profile loads
  const origPopulate = populateUserData;
  populateUserData = function(user) {
    origPopulate(user);
    initLiveChatWidget(user);
  };

})();

