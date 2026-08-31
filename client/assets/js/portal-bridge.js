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
        if (res.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('register') && !window.location.pathname.includes('admin')) {
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

  // Toast notification helper
  window.showBridgeToast = function(title, message, type = 'info') {
    let container = document.getElementById('bridge-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bridge-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        width: calc(100% - 40px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#007bff');
    toast.style.cssText = `
      background: ${bgColor};
      color: #fff;
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(-15px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 2px;">${title}</div>
      <div style="font-size: 13px; opacity: 0.95;">${message}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-15px)';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const pathname = window.location.pathname.toLowerCase();

    // Ignore admin page entirely
    if (pathname.includes('admin')) return;

    // 1. Check Auth for Protected Pages
    const isProtected = ['dashboard', 'start', 'record', 'deposit', 'withdraw', 'profile', 'contract'].some(p => pathname.includes(p));
    let currentUser = null;

    if (isProtected || pathname.includes('levels') || pathname.includes('license') || pathname.includes('contact')) {
      const authRes = await API.get('/api/auth/me');
      if (authRes && authRes.success && authRes.user) {
        currentUser = authRes.user;
        populateUserData(currentUser);
        checkUserNotifications();
        setInterval(checkUserNotifications, 15000); // Check every 15s
      } else if (isProtected && !pathname.includes('login') && !pathname.includes('register')) {
        window.location.href = '/login';
        return;
      }
    }

    // 2. Page Specific Handlers
    if (pathname.includes('login')) {
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
    } catch (e) {
      // Ignore polling errors
    }
  }

  // Populate dynamic user data across header, balance boxes, profile names
  function populateUserData(user) {
    if (!user) return;

    document.querySelectorAll('.user-username, .username-display, #usernameDisplay, .user-name-text, .usernamee').forEach(el => {
      el.textContent = user.username || user.fullname;
    });

    document.querySelectorAll('.user-fullname, #userFullName').forEach(el => {
      el.textContent = user.fullname;
    });

    document.querySelectorAll('.user-balance, #userBalance, .balance-amount, .deposit-card-value, .withdraw-card-value').forEach(el => {
      el.textContent = `USD ${parseFloat(user.balance).toFixed(2)}`;
    });

    document.querySelectorAll('.user-frozen, #userFrozen').forEach(el => {
      el.textContent = `$${parseFloat(user.frozen_balance || 0).toFixed(2)}`;
    });

    document.querySelectorAll('.user-today-profit, #todayProfit').forEach(el => {
      el.textContent = `$${parseFloat(user.today_profit || 0).toFixed(2)}`;
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
    if (userIdInput) userIdInput.value = user.id;
  }

  // LOGIN PAGE HANDLER
  function initLoginPage() {
    const form = document.getElementById('loginForm') || document.querySelector('form');
    if (!form) return;

    const demoBtn = document.getElementById('quickFillDemo');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        const idInput = document.getElementById('loginIdentifier') || document.querySelector('input[type="text"], input[type="email"]');
        const passInput = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');
        if (idInput) idInput.value = 'repofa5484@prorises.com';
        if (passInput) passInput.value = 'Password';
        showBridgeToast('Demo Account Filled', 'Credentials loaded: repofa5484@prorises.com / Password', 'info');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifierInput = document.getElementById('loginIdentifier') || document.querySelector('input[type="text"], input[type="email"]');
      const passwordInput = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!identifierInput || !passwordInput) return;

      const identifier = identifierInput.value.trim();
      const password = passwordInput.value;

      if (!identifier || !password) {
        showBridgeToast('Input Required', 'Please enter your email/username and password', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging In...';
      }

      const res = await API.post('/api/auth/login', { identifier, password });

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }

      if (res && res.success) {
        showBridgeToast('Login Successful', `Welcome back, ${res.user.fullname || res.user.username}!`, 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      } else {
        showBridgeToast('Login Failed', (res && res.message) || 'Invalid login credentials', 'error');
      }
    });
  }

  // REGISTER PAGE HANDLER
  function initRegisterPage() {
    const form = document.getElementById('signupForm') || document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('signupName') || document.querySelector('input[name="fullname"], input[placeholder*="Name"]');
      const phoneInput = document.getElementById('signupPhone') || document.querySelector('input[name="phone"], input[type="tel"]');
      const emailInput = document.getElementById('signupEmail') || document.querySelector('input[name="email"], input[type="email"]');
      const passInput = document.getElementById('signupPassword') || document.querySelector('input[name="password"]');
      const genderSelect = document.getElementById('signupGender') || document.querySelector('select[name="gender"]');
      const referralInput = document.getElementById('signupReferral') || document.querySelector('input[name="referral"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!nameInput || !phoneInput || !emailInput || !passInput) return;

      if (!nameInput.value.trim() || !phoneInput.value.trim() || !emailInput.value.trim() || !passInput.value) {
        showBridgeToast('Validation Error', 'Please complete all required fields.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
      }

      const payload = {
        fullname: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        password: passInput.value,
        gender: genderSelect ? genderSelect.value : 'Male',
        referral_code: referralInput ? referralInput.value.trim() : ''
      };

      const res = await API.post('/api/auth/register', payload);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      }

      if (res && res.success) {
        showBridgeToast('Welcome Bonus Credited!', res.message, 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        showBridgeToast('Registration Failed', (res && res.message) || 'Could not complete registration', 'error');
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
    const withdrawForm = document.querySelector('form.withdrawal-form') || document.getElementById('withdrawForm') || document.querySelector('form');
    if (!withdrawForm) return;

    withdrawForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amountInput = withdrawForm.querySelector('input[name="withdraw_amount"], input[name="amount"]');
      const addressInput = withdrawForm.querySelector('input[name="wallet_address"], input[name="address"]');
      const submitBtn = withdrawForm.querySelector('button[type="submit"]');

      if (!amountInput) return;

      const amount = parseFloat(amountInput.value);
      const wallet_address = addressInput ? addressInput.value.trim() : 'TNmwNEPiuT4zNMDEhJGUrxXpMPfivzDdTV';

      if (isNaN(amount) || amount < 30) {
        showBridgeToast('Invalid Amount', 'Minimum withdrawal is $30.00', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
      }

      const res = await API.post('/api/finance/withdraw', {
        amount,
        wallet_address,
        method: 'USDT',
        network: 'TRC20'
      });

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Withdraw';
      }

      if (res && res.success) {
        showBridgeToast('Withdrawal Requested', res.message, 'success');
        amountInput.value = '';
        if (res.new_balance !== undefined) {
          document.querySelectorAll('.user-balance, #userBalance, .withdraw-card-value').forEach(el => {
            el.textContent = `USD ${parseFloat(res.new_balance).toFixed(2)}`;
          });
        }
      } else {
        showBridgeToast('Withdrawal Failed', (res && res.message) || 'Error submitting withdrawal', 'error');
      }
    });
  }

  // RECORD PAGE HANDLER
  async function initRecordPage(user) {
    const tasksRes = await API.get('/api/tasks/records');
    const container = document.getElementById('recordListContainer') || document.querySelector('.record-item-tab');

    if (!container || !tasksRes || !tasksRes.tasks) return;

    function renderTasks(tasks) {
      if (tasks.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #888;">
            <i class="fa fa-inbox" style="font-size: 38px; margin-bottom: 10px; opacity: 0.5;"></i>
            <div>No transaction records found.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = tasks.map(t => `
        <div style="background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 12px; align-items: center;">
            <div style="width: 44px; height: 44px; background: #f0f7ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #007bff; font-weight: 700;">
              #${t.order_num || 1}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #222; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.product_name}</div>
              <div style="font-size: 12px; color: #888;">${new Date(t.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #28a745; font-size: 15px;">+$${parseFloat(t.commission_amount).toFixed(2)}</div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${t.status === 'completed' ? '#28a745' : '#ff9800'};">
              ${t.status}
            </div>
          </div>
        </div>
      `).join('');
    }

    renderTasks(tasksRes.tasks);

    document.querySelectorAll('.record-nav-item').forEach((tab, index) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.record-nav-item').forEach(t => t.classList.remove('record-nav-item-active'));
        tab.classList.add('record-nav-item-active');

        if (index === 0) renderTasks(tasksRes.tasks);
        else if (index === 1) renderTasks(tasksRes.tasks.filter(t => t.status === 'pending'));
        else if (index === 2) renderTasks(tasksRes.tasks.filter(t => t.status === 'completed'));
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

})();
