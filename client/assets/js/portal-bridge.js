/**
 * ADS MERCHANTS ASIA - PORTAL BRIDGE ENGINE
 * Central client-side controller that dynamically binds HTML pages to live REST APIs.
 */

(function() {
  // Global HTML escaping utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

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
    } else if (pathname.includes('register') || pathname.includes('signup')) {
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

  // Client-side image compressor for super-fast, reliable uploads of receipts and KYC
  function compressImageFile(file, maxWidth = 1400, quality = 0.85) {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        return resolve(null);
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function() {
          resolve(null);
        };
        img.src = e.target.result;
      };
      reader.onerror = function() {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  // Check unread admin notifications for user
  const _shownToastNotificationIds = new Set();
  async function checkUserNotifications() {
    try {
      const res = await API.get('/api/user/notifications');
      if (res && res.success && res.notifications && res.notifications.length > 0) {
        let hasNewNotification = false;
        for (const notif of res.notifications) {
          if (!notif.is_read && !_shownToastNotificationIds.has(notif.id)) {
            _shownToastNotificationIds.add(notif.id);
            showBridgeToast(notif.title, notif.message, notif.type);
            hasNewNotification = true;
          }
        }

        // When a new deposit/withdrawal notification arrives, refresh balance display
        if (hasNewNotification) {
          const updatedMe = await API.get('/api/auth/me');
          if (updatedMe && updatedMe.success && updatedMe.user) {
            populateUserData(updatedMe.user);
          }
        }
      }

      // Check unread chat messages from admin for floating button red badge
      const chatRes = await API.get('/api/user/chat');
      if (chatRes && chatRes.success && Array.isArray(chatRes.messages)) {
        const unreadFromAdmin = chatRes.messages.filter(m => m.sender === 'admin' && (m.read_by_user === 0 || m.read_by_user === false)).length;
        const chatBadge = document.getElementById('nativeChatBadge');
        if (chatBadge) {
          if (unreadFromAdmin > 0 && window._nativeChatOpen !== true) {
            chatBadge.textContent = unreadFromAdmin > 99 ? '99+' : unreadFromAdmin;
            chatBadge.style.display = 'flex';
          } else if (window._nativeChatOpen === true) {
            chatBadge.style.display = 'none';
          }
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  // Strictly map VIP level to existing project badge assets: bronze.png, silver.png, gold.png, diamond.png
  function getVipBadgeImg(vipLevel, size = 22) {
    const lvl = String(vipLevel || 'Bronze').toLowerCase();
    let img = 'bronze.png';
    if (lvl.includes('diamond') || lvl.includes('platinum') || lvl.includes('v4')) {
      img = 'diamond.png';
    } else if (lvl.includes('gold') || lvl.includes('v3')) {
      img = 'gold.png';
    } else if (lvl.includes('silver') || lvl.includes('v2')) {
      img = 'silver.png';
    } else {
      img = 'bronze.png';
    }
    return `<img src="client/assets/img/${img}" class="vip-level-badge" style="width: ${size}px; height: ${size}px; vertical-align: middle; margin-left: 6px; object-fit: contain; display: inline-block;" alt="VIP">`;
  }

  // Populate dynamic user data across header, balance boxes, profile names
  function populateUserData(user) {
    if (!user) return;

    const displayName = user.username || user.fullname || 'User';
    const badgeHtml = getVipBadgeImg(user.vip_level, 22);

    document.querySelectorAll('.user-username').forEach(el => {
      el.innerHTML = `<span class="usernamee" style="margin-right: 4px;">Welcome</span> <span class="user-name-text" style="font-weight: 700;">${escapeHtml(displayName)}</span> ${badgeHtml}`;
    });

    document.querySelectorAll('.user-name-text').forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll('.start-vip-badge').forEach(el => {
      el.innerHTML = getVipBadgeImg(user.vip_level, 26);
    });

    document.querySelectorAll('.profile-vip-badge').forEach(el => {
      el.innerHTML = getVipBadgeImg(user.vip_level, 26);
    });

    document.querySelectorAll('.username-display, #usernameDisplay, .profile-name').forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll('.user-fullname, #userFullName').forEach(el => {
      el.textContent = user.fullname || displayName;
    });

    const setEl = document.getElementById('startSetText');
    const countEl = document.getElementById('startTaskCountText');
    if (setEl) {
      const setNum = user.current_set || 1;
      setEl.textContent = `${setNum === 1 ? '1st' : (setNum === 2 ? '2nd' : (setNum === 3 ? '3rd' : setNum + 'th'))} Set:`;
    }
    if (countEl) {
      countEl.textContent = `${user.today_tasks_completed || 0} / 3`;
    }

    window.__currentUser = user;

    const workingBalNum = parseFloat(user.balance || 0);
    const frozenBalNum = parseFloat(user.frozen_balance || 0);
    const totalProfitNum = parseFloat(user.today_profit || 0);
    const totalBalNum = workingBalNum + frozenBalNum;

    const workingBal = workingBalNum.toFixed(2);
    const frozenBal = frozenBalNum.toFixed(2);
    const totalBal = totalBalNum.toFixed(2);
    const userProfit = totalProfitNum.toFixed(2);

    // 1. Total Balance (Working + Frozen funds)
    document.querySelectorAll(`
      .user-total-balance, 
      #userTotalBalance, 
      #profile-total-balance,
      .profile-total-balance,
      #start-grandtotal-balance-text,
      .deposit-card-value
    `).forEach(el => {
      el.textContent = `USD ${totalBal}`;
    });

    // 2. Working Balance (Active funds available for tasks/withdrawals)
    document.querySelectorAll(`
      .user-balance, 
      #userBalance, 
      .balance-amount, 
      .user-working-balance,
      #userWorkingBalance,
      #profile-working-balance,
      .profile-working-balance,
      .withdraw-card-value,
      #start-total-balance-text,
      .task-balance,
      #workingBalance
    `).forEach(el => {
      el.textContent = `USD ${workingBal}`;
    });

    // 3. Today's Profit
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

    // 4. Frozen Balance (Locked / In-Withdrawal)
    document.querySelectorAll(`
      .user-frozen, 
      #userFrozen,
      .user-frozen-balance,
      #userFrozenBalance,
      #profile-frozen-balance,
      .profile-frozen-balance,
      #start-frozen-balance-text
    `).forEach(el => {
      el.textContent = `USD ${frozenBal}`;
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
      userIdInput.value = user.id || '';
    }

    const emailInput = document.getElementById('email');
    if (emailInput && !emailInput.value) emailInput.value = user.email;
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
    const submitBtn = document.getElementById('registerBtn') || (form ? form.querySelector('button[type="submit"]') : null);
    if (!form && !submitBtn) return;

    let isSubmitting = false;
    async function handleRegister(e) {
      if (e) e.preventDefault();
      if (isSubmitting) return;

      const nameInput = document.getElementById('fullname') || document.getElementById('signupName') || document.querySelector('input[name="fullname"]');
      const usernameInput = document.getElementById('username') || document.querySelector('input[name="username"]');
      const phoneInput = document.getElementById('signupPhone') || document.querySelector('input[name="phone"], input[type="tel"]');
      const emailInput = document.getElementById('email') || document.getElementById('signupEmail') || document.querySelector('input[name="email"], input[type="email"]');
      const passInput = document.getElementById('userpassword') || document.getElementById('signupPassword') || document.querySelector('input[name="password"]');
      const confirmPassInput = document.getElementById('confirmpassword') || document.querySelector('input[name="confirmpassword"]');
      const genderSelect = document.getElementById('gender') || document.getElementById('signupGender') || document.querySelector('select[name="gender"]');
      const referralInput = document.getElementById('signupReferral') || document.querySelector('input[name="referral"]');

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

      isSubmitting = true;
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
        isSubmitting = false;

        if (res && res.success) {
          showBridgeToast('Welcome!', res.message, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        } else {
          showBridgeToast('Registration Failed', (res && res.message) || 'Could not complete registration', 'error');
        }
      } catch (err) {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        showBridgeToast('Registration Error', err.message || 'An error occurred during registration', 'error');
      }
    }

    if (form) {
      form.onsubmit = function(e) {
        if (e) e.preventDefault();
        handleRegister(e);
        return false;
      };
      form.addEventListener('submit', handleRegister);
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', handleRegister);
    }
  }

  // START / TASK OPTIMIZATION ENGINE
  async function initStartPage(user) {
    const taskStatus = await API.get('/api/tasks/status');
    if (taskStatus && taskStatus.success) {
      updateTaskDisplay(taskStatus.data);
    }

    const startBtns = document.querySelectorAll('.start-btn, #startOptimizationBtn, .start-item-start, button.btn-primary, #start-button, .start-button');
    startBtns.forEach(startBtn => {
      startBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (startBtn.getAttribute('data-processing') === 'true') return;
        startBtn.setAttribute('data-processing', 'true');

        const textEl = document.getElementById('start-button-text') || startBtn;
        const originalText = textEl.textContent;
        textEl.textContent = 'Matching...';

        try {
          const res = await API.post('/api/tasks/generate', {});
          startBtn.removeAttribute('data-processing');
          textEl.textContent = originalText;

          if (res && res.success && res.task) {
            showTaskModal(res.task);
          } else {
            const froz = res && (res.userFrozenBalance || res.deficit_amount);
            if (res && (res.reachedLimit || froz || (res.message && res.message.includes('frozen limit')))) {
              const deficitVal = froz ? parseFloat(froz).toFixed(2) : '25.00';
              const balanceText = document.getElementById('start-total-balance-text');
              if (balanceText) balanceText.innerHTML = `USDT -${deficitVal}`;
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: "Account Limit Reached!",
                  icon: "info",
                  html: `Please contact <a target="_blank" href="contactData" autofocus>customer care service</a> to clear your balance of -${deficitVal} USDT.`,
                  focusConfirm: false,
                  confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`,
                }).then(() => {
                  window.location.href = "startData";
                });
              } else {
                alert(`Account Limit Reached! Please contact customer care service to clear your balance of -${deficitVal} USDT.`);
              }
              return;
            }
            showBridgeToast('Optimization Notice', (res && res.message) || 'Unable to grab order at this time.', 'error');
          }
        } catch (err) {
          startBtn.removeAttribute('data-processing');
          textEl.textContent = originalText;
          showBridgeToast('Error', 'Could not match task.', 'error');
        }
      }, true);
    });
  }

  function updateTaskDisplay(data) {
    if (!data) return;
    document.querySelectorAll('.task-completed-count, #completedOrderCount').forEach(el => {
      el.textContent = `${data.today_tasks_completed}/${data.max_tasks}`;
    });

    const workBal = parseFloat(data.balance || 0);
    const frozBal = parseFloat(data.frozen_balance !== undefined ? data.frozen_balance : (window.__currentUser && window.__currentUser.frozen_balance) || 0);
    const totBal = workBal + frozBal;
    const profitVal = parseFloat(data.today_profit || 0);

    document.querySelectorAll('.task-balance, #workingBalance, .user-balance, #userBalance, .user-working-balance, #start-total-balance-text').forEach(el => {
      el.textContent = `USD ${workBal.toFixed(2)}`;
    });
    document.querySelectorAll('.user-total-balance, #start-grandtotal-balance-text, #profile-total-balance').forEach(el => {
      el.textContent = `USD ${totBal.toFixed(2)}`;
    });
    document.querySelectorAll('.user-frozen, .user-frozen-balance, #start-frozen-balance-text').forEach(el => {
      el.textContent = `USD ${frozBal.toFixed(2)}`;
    });
    document.querySelectorAll('.task-profit, #todayProfitVal, .user-today-profit, #todayProfit, #start-todays-profit-text, #profile-total-profit').forEach(el => {
      el.textContent = `USD ${profitVal.toFixed(2)}`;
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
        const froz = res && (res.userFrozenBalance || res.deficit_amount);
        if (res && (res.reachedLimit || froz || (res.message && res.message.includes('frozen limit')))) {
          modal.style.display = 'none';
          const deficitVal = froz ? parseFloat(froz).toFixed(2) : '25.00';
          const balanceText = document.getElementById('start-total-balance-text');
          if (balanceText) balanceText.innerHTML = `USDT -${deficitVal}`;
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: "Account Limit Reached!",
              icon: "info",
              html: `Please contact <a target="_blank" href="contactData" autofocus>customer care service</a> to clear your balance of -${deficitVal} USDT.`,
              focusConfirm: false,
              confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`,
            }).then(() => {
              window.location.href = "startData";
            });
          } else {
            alert(`Account Limit Reached! Please contact customer care service to clear your balance of -${deficitVal} USDT.`);
          }
          return;
        }
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
      receiptInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (placeholder) placeholder.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Optimizing receipt...';
        const compressed = await compressImageFile(file, 1400, 0.85);
        if (previewImg && compressed) {
          previewImg.src = compressed;
        }
        if (placeholder) {
          placeholder.innerHTML = '<i class="fa fa-cloud-upload-alt mr-1"></i> Click or tap to upload transfer proof';
          placeholder.style.display = 'none';
        }
        if (container) container.style.display = 'block';
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
    const historyBtn = document.getElementById('history-btn');
    const allRecords = document.getElementById('allRecords');

    async function loadWithdrawHistory() {
      if (!allRecords) return;
      allRecords.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;"><i class="fa fa-spinner fa-spin"></i> Loading records...</div>';
      try {
        const res = await API.get('/api/finance/history');
        if (res && res.success && Array.isArray(res.withdrawals) && res.withdrawals.length > 0) {
          allRecords.innerHTML = res.withdrawals.map(w => {
            const rawDate = new Date(w.created_at);
            let dateStr = w.created_at || 'Just now';
            if (!isNaN(rawDate.getTime())) {
              const y = rawDate.getFullYear();
              const m = String(rawDate.getMonth() + 1).padStart(2, '0');
              const d = String(rawDate.getDate()).padStart(2, '0');
              let hours = rawDate.getHours();
              const minutes = String(rawDate.getMinutes()).padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12;
              hours = hours ? hours : 12;
              const hStr = String(hours).padStart(2, '0');
              dateStr = `${y}-${m}-${d} ${hStr}:${minutes} ${ampm}`;
            }
            const amt = parseFloat(w.amount || 0).toFixed(2);
            const st = (w.status || 'Pending').toLowerCase();
            const statusLabel = st === 'approved' ? 'Approved' : (st === 'rejected' ? 'Rejected' : 'Pending');
            const statusColor = st === 'approved' ? '#16a34a' : (st === 'rejected' ? '#dc2626' : '#0f172a');
            return `
              <div style="background: white; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <div style="color: #64748b; font-size: 12.5px;">Date</div>
                    <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; margin-top: 4px;">${dateStr}</div>
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <div style="color: #64748b; font-size: 12.5px;">Amount</div>
                    <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-top: 4px;">USD ${amt}</div>
                  </div>
                  <div style="flex: 1; text-align: right;">
                    <div style="color: #64748b; font-size: 12.5px;">Status</div>
                    <div style="font-weight: 700; font-size: 13.5px; color: ${statusColor}; margin-top: 4px;">${statusLabel}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          allRecords.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 28px 16px; text-align: center; color: #64748b; font-size: 13.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
              No withdrawal records found.
            </div>
          `;
        }
      } catch (err) {
        allRecords.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc2626;">Error loading withdrawal history.</div>`;
      }
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', loadWithdrawHistory);
    }

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
              const newWork = parseFloat(res.new_balance || 0);
              const newFrozen = parseFloat(res.new_frozen !== undefined ? res.new_frozen : (window.__currentUser ? window.__currentUser.frozen_balance : 0));
              const newTot = newWork + newFrozen;
              if (window.__currentUser) {
                window.__currentUser.balance = newWork;
                window.__currentUser.frozen_balance = newFrozen;
              }
              document.querySelectorAll('.user-balance, #userBalance, .user-working-balance, .withdraw-card-value').forEach(el => {
                el.textContent = `USD ${newWork.toFixed(2)}`;
              });
              document.querySelectorAll('.user-total-balance, #profile-total-balance').forEach(el => {
                el.textContent = `USD ${newTot.toFixed(2)}`;
              });
              document.querySelectorAll('.user-frozen, .user-frozen-balance, #profile-frozen-balance').forEach(el => {
                el.textContent = `USD ${newFrozen.toFixed(2)}`;
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
        right: 0;
        top: 40%;
        background: #00c853;
        color: #ffffff;
        border-radius: 8px 0 0 8px;
        padding: 10px 6px 12px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        box-shadow: -3px 4px 14px rgba(0, 0, 0, 0.22);
        cursor: pointer;
        z-index: 999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        user-select: none;
      }
      #nativeChatFloatingBtn:hover {
        transform: translateX(-4px);
        box-shadow: -4px 6px 18px rgba(0, 200, 83, 0.45);
      }
      #nativeChatFloatingBtn:active {
        transform: scale(0.97);
      }
      .native-chat-label {
        display: inline-block;
        font-weight: 700;
        font-size: 14px;
        line-height: 1;
        color: #ffffff;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        letter-spacing: 0.5px;
        margin: 4px 0;
      }
      #nativeChatBadge {
        background: #e11d48;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #fff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        margin-bottom: 2px;
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
          top: 42%;
          right: 0;
          padding: 8px 5px 10px 5px;
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
      <span id="nativeChatBadge">1</span>
      <span class="native-chat-label">Chat</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
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
        API.post('/api/user/chat/read', {});
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
            cachedMessagesCount = 0;
            container.innerHTML = `
              <div style="text-align: center; color: #64748b; font-size: 13px; margin: auto 0; padding: 20px;">
                <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Welcome to Live Support!</div>
                <div>Send your question or deposit/withdrawal query below. Support is online.</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
                  <i class="fa fa-clock-o mr-1"></i> Active session. Chat history clears automatically 10 minutes after resolution.
                </div>
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
                <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
                  <i class="fa fa-clock-o mr-1"></i> Active session. Chat clears automatically 10 minutes after resolution.
                </div>
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

  // USER NOTIFICATIONS BELL WIDGET
  function initUserNotificationsWidget(user) {
    if (document.getElementById('userNotifFloatingBtn')) return;

    // Append styles for Notification Bell and Drawer
    const notifStyle = document.createElement('style');
    notifStyle.textContent = `
      #userNotifFloatingBtn {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(0, 0, 0, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 99999;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #userNotifFloatingBtn:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
      }
      #userNotifBadge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
        animation: pulseNotif 2s infinite;
      }
      @keyframes pulseNotif {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      #userNotifDrawer {
        position: fixed;
        top: 68px;
        right: 16px;
        width: 360px;
        max-width: calc(100vw - 32px);
        max-height: 520px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(0, 0, 0, 0.08);
        z-index: 100000;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .user-notif-header {
        padding: 14px 16px;
        background: #ffffff;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .user-notif-title {
        font-weight: 700;
        font-size: 15px;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .user-notif-mark-btn {
        background: none;
        border: none;
        color: #0284c7;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .user-notif-mark-btn:hover {
        background: #f0f9ff;
      }
      .user-notif-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .user-notif-body {
        padding: 12px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 420px;
        background: #f8fafc;
      }
      .user-notif-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 12px 14px;
        border: 1px solid #e2e8f0;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      .user-notif-card.unread {
        border-left: 4px solid #00875a;
        background: #f0fdf4;
      }
      .user-notif-card.type-error.unread {
        border-left: 4px solid #ef4444;
        background: #fef2f2;
      }
      .user-notif-card.type-warning.unread {
        border-left: 4px solid #f59e0b;
        background: #fffbeb;
      }
      .user-notif-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }
      .notif-icon-success { background: #dcfce7; color: #15803d; }
      .notif-icon-error { background: #fee2e2; color: #b91c1c; }
      .notif-icon-warning { background: #fef3c7; color: #b45309; }
      .notif-icon-info { background: #e0f2fe; color: #0369a1; }
      .user-notif-content {
        flex: 1;
      }
      .user-notif-card-title {
        font-weight: 700;
        font-size: 13px;
        color: #0f172a;
        margin-bottom: 3px;
      }
      .user-notif-card-msg {
        font-size: 12px;
        color: #475569;
        line-height: 1.4;
      }
      .user-notif-card-time {
        font-size: 10.5px;
        color: #94a3b8;
        margin-top: 6px;
      }
    `;
    document.head.appendChild(notifStyle);

    // Create Bell Button
    const notifBtn = document.createElement('div');
    notifBtn.id = 'userNotifFloatingBtn';
    notifBtn.title = 'Platform Notifications';
    notifBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00875a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span id="userNotifBadge">0</span>
    `;
    document.body.appendChild(notifBtn);

    // Create Drawer
    const drawer = document.createElement('div');
    drawer.id = 'userNotifDrawer';
    drawer.innerHTML = `
      <div class="user-notif-header">
        <div class="user-notif-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00875a" stroke-width="2.2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Notifications
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="userNotifMarkReadBtn" class="user-notif-mark-btn">Mark read</button>
          <button id="userNotifCloseBtn" class="user-notif-close">&times;</button>
        </div>
      </div>
      <div class="user-notif-body" id="userNotifList">
        <div style="text-align: center; color: #94a3b8; padding: 24px 0; font-size: 13px;">Loading notifications...</div>
      </div>
    `;
    document.body.appendChild(drawer);

    let drawerOpen = false;

    async function loadNotifications() {
      try {
        const res = await API.get('/api/user/notifications');
        const badge = document.getElementById('userNotifBadge');
        if (res && res.success) {
          const list = res.notifications || [];
          const unreadCount = res.unread_count !== undefined ? res.unread_count : list.filter(n => !n.is_read).length;

          if (badge) {
            if (unreadCount > 0) {
              badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
              badge.style.display = 'flex';
            } else {
              badge.style.display = 'none';
            }
          }

          // Always render list when drawer is open
          if (drawerOpen) {
            renderNotificationList(list);
          }
        } else {
          // API returned error - show empty state if drawer is open
          if (drawerOpen) {
            renderNotificationList([]);
          }
        }
      } catch (e) {
        console.error('Error fetching notifications:', e);
        // Show error state instead of stuck on "Loading..."
        if (drawerOpen) {
          const container = document.getElementById('userNotifList');
          if (container) {
            container.innerHTML = `
              <div style="text-align: center; color: #94a3b8; padding: 36px 16px; font-size: 13px;">
                <div style="font-size: 30px; margin-bottom: 8px;">📭</div>
                <div style="font-weight: 600; color: #64748b;">No notifications yet</div>
                <div style="font-size: 11.5px; margin-top: 4px;">Deposit, withdrawal, and verification updates will show here.</div>
              </div>
            `;
          }
        }
      }
    }

    function renderNotificationList(list) {
      const container = document.getElementById('userNotifList');
      if (!container) return;

      if (!list || list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: #94a3b8; padding: 36px 16px; font-size: 13px;">
            <div style="font-size: 30px; margin-bottom: 8px;">📭</div>
            <div style="font-weight: 600; color: #64748b;">No notifications yet</div>
            <div style="font-size: 11.5px; margin-top: 4px;">Deposit, withdrawal, and verification updates will show here.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(n => {
        const isUnread = !n.is_read;
        const type = (n.type || 'info').toLowerCase();
        let iconClass = 'notif-icon-info';
        let iconSymbol = 'ℹ️';

        if (type === 'success') {
          iconClass = 'notif-icon-success';
          iconSymbol = '✓';
        } else if (type === 'error') {
          iconClass = 'notif-icon-error';
          iconSymbol = '✕';
        } else if (type === 'warning') {
          iconClass = 'notif-icon-warning';
          iconSymbol = '⚠️';
        }

        const timeStr = n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';

        return `
          <div class="user-notif-card type-${type} ${isUnread ? 'unread' : ''}">
            <div class="user-notif-icon ${iconClass}">${iconSymbol}</div>
            <div class="user-notif-content">
              <div class="user-notif-card-title">${escapeHtml(n.title || 'Notification')}</div>
              <div class="user-notif-card-msg">${escapeHtml(n.message || '')}</div>
              <div class="user-notif-card-time">${timeStr}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function toggleDrawer(open) {
      drawerOpen = open !== undefined ? open : !drawerOpen;
      drawer.style.display = drawerOpen ? 'flex' : 'none';
      if (drawerOpen) {
        loadNotifications();
      }
    }

    notifBtn.addEventListener('click', () => toggleDrawer());
    document.getElementById('userNotifCloseBtn').addEventListener('click', () => toggleDrawer(false));

    document.getElementById('userNotifMarkReadBtn').addEventListener('click', async () => {
      await API.post('/api/user/notifications/mark-read', {});
      const badge = document.getElementById('userNotifBadge');
      if (badge) badge.style.display = 'none';
      document.querySelectorAll('.user-notif-card.unread').forEach(card => card.classList.remove('unread'));
    });

    // Initial load and polling every 5 seconds
    loadNotifications();
    setInterval(loadNotifications, 5000);
  }

  // Bind live chat and notifications initialization when user profile loads
  const origPopulate = populateUserData;
  populateUserData = function(user) {
    origPopulate(user);
    initLiveChatWidget(user);
    initUserNotificationsWidget(user);
  };

})();

