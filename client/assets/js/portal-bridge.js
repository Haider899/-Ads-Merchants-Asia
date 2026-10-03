/**
 * ADS MERCHANTS ASIA - PORTAL BRIDGE ENGINE
 * Central client-side controller that dynamically binds HTML pages to live REST APIs.
 */

(function() {
  let redirectingAfterUnauthorized = false;

  function isUserPage() {
    const path = window.location.pathname.toLowerCase();
    return !path.includes('login') && !path.includes('register') && path !== '/' && path !== '/index.html' && !path.includes('admin');
  }

  function handleUnauthorized() {
    if (!isUserPage() || redirectingAfterUnauthorized) return;
    redirectingAfterUnauthorized = true;
    localStorage.removeItem('ama_token');
    localStorage.removeItem('ama_user');
    window.location.replace('/login');
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(...args) {
    const response = await nativeFetch(...args);
    if (response.status === 401) handleUnauthorized();
    return response;
  };

  // Global HTML escaping utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function formatTaskDeficit(response) {
    const amounts = [response && response.deficit_amount, response && response.userFrozenBalance];
    for (const value of amounts) {
      if (value === null || value === undefined || value === '') continue;
      const amount = Math.abs(Number(value));
      if (Number.isFinite(amount) && amount > 0) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }

    const balance = Number(response && response.user_balance);
    return Number.isFinite(balance) && balance < 0
      ? Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;
  }

  function taskDeficitMessage(formattedDeficit) {
    return formattedDeficit
      ? `Your current balance is insufficient to complete this order. Please recharge ${formattedDeficit} USDT to your account to proceed with the order.`
      : 'Your current balance is insufficient to complete this order. Please recharge your account to proceed with the order.';
  }

  function renderStartProductOrbit(products) {
    const orbit = document.getElementById('startProductOrbit');
    if (!orbit || !Array.isArray(products)) return;
    const uniqueProducts = [];
    const seenImages = new Set();
    products.forEach(product => {
      const image = typeof product === 'string' ? product : (product && product.image);
      if (!image || seenImages.has(image)) return;
      seenImages.add(image);
      uniqueProducts.push({ image, name: (product && product.name) || 'Product' });
    });
    orbit.replaceChildren();
    uniqueProducts.slice(0, 12).forEach((product, index, items) => {
      const image = document.createElement('img');
      const source = String(product.image);
      image.src = /^(https?:|data:|\/)/i.test(source) ? source : `/${source.replace(/^\.\//, '')}`;
      image.alt = '';
      image.title = product.name;
      image.className = 'start-product-orbit-item';
      image.style.setProperty('--orbit-angle', `${(360 / items.length) * index}deg`);
      image.onerror = () => image.remove();
      orbit.appendChild(image);
    });
  }

  function setStartProductOrbitActive(isActive) {
    const orbit = document.getElementById('startProductOrbit');
    const announcement = document.getElementById('startMatchingAnnouncement');
    if (orbit) orbit.classList.toggle('is-active', Boolean(isActive) && orbit.childElementCount > 0);
    if (announcement) announcement.textContent = isActive ? 'Matching your product order.' : '';
  }

  // Global API Helper with Automatic Token & Credentials Integration
  window.API = {
    async get(endpoint) {
      try {
        const tz = (window.Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
        const token = localStorage.getItem('ama_token') || '';
        const headers = {
          'Accept': 'application/json',
          'x-client-timezone': tz
        };
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(endpoint, {
          headers,
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.status === 401) {
          handleUnauthorized();
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error('API GET Error:', err);
        return { success: false, message: err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error occurred' };
      }
    },
    async post(endpoint, data) {
      try {
        const tz = (window.Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
        const token = localStorage.getItem('ama_token') || '';
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-timezone': tz
        };
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.status === 401) {
          handleUnauthorized();
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error('API POST Error:', err);
        return { success: false, message: err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error occurred' };
      }
    },
    async postForm(endpoint, formData) {
      try {
        const tz = (window.Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
        const token = localStorage.getItem('ama_token') || '';
        const headers = { 'Accept': 'application/json', 'x-client-timezone': tz };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(endpoint, { method: 'POST', headers, credentials: 'include', body: formData });
        if (res.status === 401) { handleUnauthorized(); return null; }
        return await res.json();
      } catch (err) {
        console.error('API multipart POST Error:', err);
        return { success: false, message: 'Network error occurred' };
      }
    }
  };

  // Toast notification helper with audio cue & high visibility
  window.showBridgeToast = function(title, message, type = 'info') {
    const toastKey = `${title}|${message}|${type}`;
    const now = Date.now();
    if (window.__lastBridgeToast && window.__lastBridgeToast.key === toastKey && now - window.__lastBridgeToast.at < 1500) {
      return;
    }
    window.__lastBridgeToast = { key: toastKey, at: now };
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

    // 0. Instant Optimistic Render from LocalStorage Cache (0ms latency!)
    let currentUser = null;
    const cachedUserJson = localStorage.getItem('ama_user');
    if (cachedUserJson) {
      try {
        currentUser = JSON.parse(cachedUserJson);
        window.__currentUser = currentUser;
        populateUserData(currentUser);
      } catch (_) {}
    }

    // Global clean logout handler for all profile & navigation logout links
    document.querySelectorAll('a[href*="logout"], a[href*="signout"], .logout-button, .profile-button-items[href*="login"], #profileLogoutBtn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('ama_token');
        localStorage.removeItem('ama_user');
        try {
          sessionStorage.removeItem('ama_shown_toast_ids');
          sessionStorage.removeItem('ama_chat_session_started_at');
        } catch (_) {}
        window.location.href = '/logout';
      });
    });

    const isAuthPage = pathname === '/' || pathname === '/index.html' || pathname.includes('login') || pathname.includes('register') || pathname.includes('signup');
    const storedToken = localStorage.getItem('ama_token');

    // Auto-redirect if on login or registration page with active session
    if (isAuthPage && storedToken) {
      API.get('/api/auth/me').then(authRes => {
        if (authRes && authRes.success && authRes.user) {
          window.location.replace('/dashboard');
        }
      }).catch(() => {});
    }

    // 1. Check Auth for Protected Pages
    const isProtected = ['dashboard', 'start', 'record', 'deposit', 'withdraw', 'profile', 'contract', 'editprofile'].some(p => pathname.includes(p));

    if (isProtected || pathname.includes('levels') || pathname.includes('license') || pathname.includes('contact')) {
      const authRes = await API.get('/api/auth/me');
      if (authRes && authRes.success && authRes.user) {
        currentUser = authRes.user;
        window.__currentUser = currentUser;
        try { localStorage.setItem('ama_user', JSON.stringify(currentUser)); } catch (_) {}
        populateUserData(currentUser);

        // Preload fresh task status in background (non-blocking!)
        API.get('/api/tasks/status').then(tStat => {
          if (tStat && tStat.success && tStat.data) {
            window.__userTaskStatus = tStat.data;
          }
        }).catch(() => {});

        checkUserNotifications();
        setInterval(checkUserNotifications, 5000); // Check every 5s for real-time alerts
      } else if (isProtected && !isAuthPage) {
        // ONLY redirect if server explicitly rejected auth (401) or no token was found
        if (!storedToken || (authRes && authRes.status === 401)) {
          localStorage.removeItem('ama_token');
          localStorage.removeItem('ama_user');
          window.location.href = '/login';
          return;
        }
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
      if (typeof window.loadTaskRecords === 'function') {
        return;
      }
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
  let _hasDoneInitialNotifCheck = false;

  function getShownToastIds() {
    try {
      const raw = localStorage.getItem('ama_shown_toast_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function saveShownToastIds(setObj) {
    try {
      const arr = Array.from(setObj).slice(-200);
      localStorage.setItem('ama_shown_toast_ids', JSON.stringify(arr));
    } catch (_) {}
  }

  async function checkUserNotifications() {
    try {
      const res = await API.get('/api/user/notifications');
      if (res && res.success && res.notifications && res.notifications.length > 0) {
        const shownToastIds = getShownToastIds();

        // On first check upon page load / login:
        // Mark all existing notifications as seen so user doesn't get flooded with past toasts
        if (!_hasDoneInitialNotifCheck) {
          _hasDoneInitialNotifCheck = true;
          for (const notif of res.notifications) {
            shownToastIds.add(String(notif.id));
          }
          saveShownToastIds(shownToastIds);
          return;
        }

        let hasNewNotification = false;
        for (const notif of res.notifications) {
          const nid = String(notif.id);
          if (!notif.is_read && !shownToastIds.has(nid)) {
            shownToastIds.add(nid);
            saveShownToastIds(shownToastIds);
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
    const lvl = String(vipLevel || 'Bronze').toLowerCase().trim();
    let img = 'bronze.png';
    if (lvl.includes('diamond') || lvl.includes('platinum') || lvl.includes('v4') || lvl.includes('level 4') || lvl === '4' || lvl.includes('vip 4') || lvl.includes('vip4')) {
      img = 'diamond.png';
    } else if (lvl.includes('gold') || lvl.includes('v3') || lvl.includes('level 3') || lvl === '3' || lvl.includes('vip 3') || lvl.includes('vip3')) {
      img = 'gold.png';
    } else if (lvl.includes('silver') || lvl.includes('v2') || lvl.includes('level 2') || lvl === '2' || lvl.includes('vip 2') || lvl.includes('vip2')) {
      img = 'silver.png';
    } else {
      img = 'bronze.png';
    }
    return `<img src="/client/assets/img/${img}" onerror="if(this.src.indexOf('/client/')!==-1){this.src='client/assets/img/${img}';}" class="vip-level-badge" style="width: ${size}px; height: ${size}px; vertical-align: middle; margin-left: 6px; object-fit: contain; display: inline-block;" alt="VIP">`;
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
    const completed = parseInt(user.today_tasks_completed || 0, 10);
    const maxT = parseInt(user.max_tasks !== undefined && user.max_tasks !== null ? user.max_tasks : (user.custom_daily_limit || completed), 10);
    let setName = '1st Set:';
    let countText = `${completed} / 3`;
    if (completed < 3) {
      setName = '1st Set:';
      countText = `${completed} / 3`;
    } else if (completed < 5) {
      setName = '2nd Set:';
      countText = `${completed - 3} / 2`;
    } else {
      setName = '3rd Set:';
      const thirdSetTotal = Math.max(1, maxT - 5);
      const thirdSetDone = Math.min(thirdSetTotal, Math.max(0, completed - 5));
      countText = `${thirdSetDone} / ${thirdSetTotal}`;
    }
    if (setEl) setEl.textContent = setName;
    if (countEl) countEl.textContent = countText;

    window.__currentUser = user;

    const workingBalNum = parseFloat(user.balance || 0);
    const frozenBalNum = parseFloat(user.frozen_balance || 0);
    const totalProfitNum = parseFloat(user.today_profit || 0);

    const pTask = user.pending_task || window.__activePendingTask;
    let pendingPrice = 0;
    let pendingComm = 0;
    if (pTask) {
      pendingPrice = parseFloat(pTask.product_price || 0);
      pendingComm = parseFloat(pTask.commission_amount !== undefined && pTask.commission_amount !== null ? pTask.commission_amount : (pTask.commission_earned || 0));
    }

    const commissionBalNum = parseFloat(user.commission_balance || 0);
    // A deficit must remain a negative Working Balance; do not replace it
    // with today's profit when rendering the profile.
    const totalBalNum = commissionBalNum + (workingBalNum >= 0 ? pendingPrice + pendingComm : 0);
    const userProfitNum = totalProfitNum + (workingBalNum >= 0 && pendingComm > 0 ? pendingComm : 0);

    const formatUSD = (num) => {
      const isNeg = num < 0;
      const absVal = Math.abs(num).toFixed(2);
      const parts = absVal.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (isNeg ? '-' : '') + parts.join('.');
    };

    const workingBal = formatUSD(workingBalNum);
    const frozenBal = formatUSD(frozenBalNum);
    const totalBal = formatUSD(totalBalNum);
    const userProfit = formatUSD(userProfitNum);

    // 1. Total Balance (Working + Frozen funds)
    document.querySelectorAll(`
      .user-total-balance, 
      #userTotalBalance
    `).forEach(el => {
      el.textContent = `USD ${totalBal}`;
    });

    // Start Page specific: Total Balance with Commission represents accumulated order gross + commission.
    const startGrandTotalEl = document.getElementById('start-grandtotal-balance-text');
    if (startGrandTotalEl) {
      let commBal = parseFloat(user.commission_balance !== undefined && user.commission_balance !== null ? user.commission_balance : 0);
      if (commBal === 0 && window.__currentUser && parseFloat(window.__currentUser.commission_balance || 0) > 0) {
        commBal = parseFloat(window.__currentUser.commission_balance);
      }
      if (workingBalNum < 0) {
        // Option A (Client Confirmed): Freeze completed funds during deficit
        startGrandTotalEl.textContent = `USD ${formatUSD(commBal)}`;
      } else if (pTask) {
        startGrandTotalEl.textContent = `USD ${formatUSD(commBal + pendingPrice + pendingComm)}`;
      } else {
        startGrandTotalEl.textContent = `USD ${formatUSD(commBal)}`;
      }
    }

    // 2. Working Balance (Active funds available for tasks/withdrawals)
    document.querySelectorAll(`
      .user-balance, 
      #userBalance, 
      .balance-amount, 
      .user-working-balance,
      #userWorkingBalance,
      #profile-working-balance,
      .profile-working-balance,
      .deposit-working-balance,
      #start-total-balance-text,
      .task-balance,
      #workingBalance
    `).forEach(el => {
      el.textContent = `USD ${workingBal}`;
    });
    document.querySelectorAll('#profile-working-balance, .profile-working-balance').forEach(el => {
      el.textContent = `USD ${workingBal}`;
    });
    document.querySelectorAll('#profile-total-balance, .profile-total-balance').forEach(el => {
      el.textContent = `USD ${totalBal}`;
    });

    // Withdraw page withdrawable balance (Total Balance with Commission)
    const commBalNum = parseFloat(user.commission_balance !== undefined && user.commission_balance !== null ? user.commission_balance : 0);
    const withdrawableBal = commBalNum > 0 ? formatUSD(commBalNum) : workingBal;
    document.querySelectorAll('.withdraw-card-value').forEach(el => {
      el.textContent = `USD ${withdrawableBal}`;
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
    document.querySelectorAll('#profile-frozen-balance, .profile-frozen-balance').forEach(el => {
      el.textContent = `USD ${frozenBal}`;
    });
    document.querySelectorAll('#profile-total-profit, .profile-total-profit').forEach(el => {
      el.textContent = `USD ${formatUSD(totalProfitNum)}`;
    });

    const startFrozenContainer = document.getElementById('start-frozen-container');
    if (startFrozenContainer) {
      startFrozenContainer.style.display = frozenBalNum > 0 ? 'block' : 'none';
    }

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

  const updateUserBalanceDisplay = populateUserData;
  window.updateUserBalanceDisplay = populateUserData;
  window.populateUserData = populateUserData;

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
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await API.post('/api/auth/login', { identifier, password, timezone });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }

        if (res && res.success) {
          try { sessionStorage.removeItem('ama_shown_toast_ids'); } catch (_) {}
          if (res.token) {
            localStorage.setItem('ama_token', res.token);
          }
          if (res.user) {
            localStorage.setItem('ama_user', JSON.stringify(res.user));
          }
          showBridgeToast('Login Successful', `Welcome back, ${res.user.fullname || res.user.username}!`, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 350);
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
          if (res.token) {
            localStorage.setItem('ama_token', res.token);
          }
          if (res.user) {
            localStorage.setItem('ama_user', JSON.stringify(res.user));
          }
          showBridgeToast('Welcome!', res.message, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 350);
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
      renderStartProductOrbit(taskStatus.data && taskStatus.data.product_gallery);
      if (window.__currentUser && taskStatus.data) {
        window.__currentUser.balance = taskStatus.data.balance;
        window.__currentUser.commission_balance = taskStatus.data.commission_balance;
        window.__currentUser.today_profit = taskStatus.data.today_profit;
        window.__currentUser.today_tasks_completed = taskStatus.data.today_tasks_completed;
      }
      updateTaskDisplay(taskStatus.data);
    }

    const startBtns = document.querySelectorAll('#start-button, .start-button, #startOptimizationBtn, .start-btn, .start-item-start');
    startBtns.forEach(startBtn => {
      startBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // KYC & Merchant Contract Guard (Voice Note S8)
        let currentKyc = (window.__currentUser && window.__currentUser.kyc_status) || (user && user.kyc_status);
        if (!currentKyc) {
          try {
            const meRes = await API.get('/api/auth/me');
            if (meRes && meRes.user) {
              window.__currentUser = meRes.user;
              currentKyc = meRes.user.kyc_status;
            }
          } catch (_) {}
        }
        currentKyc = (currentKyc || 'none').toLowerCase();
        if (currentKyc !== 'approved') {
          const isPending = currentKyc === 'pending';
          const title = isPending ? "Contract Under Review" : "Contract & KYC Required!";
          const text = isPending
            ? "Your Merchant Contract & KYC verification are currently under review by administration. Please wait for approval before starting optimization tasks."
            : "Please sign your Merchant Contract and complete KYC verification before starting optimization tasks.";
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: title,
              icon: isPending ? "info" : "warning",
              html: `<div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${text}</div>`,
              confirmButtonText: isPending ? "OK" : "Go to Contract",
              showCancelButton: !isPending,
              cancelButtonText: "Cancel",
              confirmButtonColor: "#007bff"
            }).then((result) => {
              if (result.isConfirmed && !isPending) {
                window.location.href = "contract.html";
              }
            });
          } else {
            alert(text);
            if (!isPending) {
              window.location.href = "contract.html";
            }
          }
          return;
        }

        if (startBtn.getAttribute('data-processing') === 'true') return;
        startBtn.setAttribute('data-processing', 'true');

        const textEl = document.getElementById('start-button-text') || startBtn;
        const originalText = textEl.textContent;
        textEl.textContent = 'Matching...';
        setStartProductOrbitActive(true);

        try {
          const [res] = await Promise.all([
            API.post('/api/tasks/generate', {}),
            new Promise(resolve => setTimeout(resolve, 1100))
          ]);
          setStartProductOrbitActive(false);
          startBtn.removeAttribute('data-processing');
          textEl.textContent = originalText;

          if (res && res.success && res.task) {
            window.__activePendingTask = res.task;
            if (res.new_balance !== undefined) {
              const currentProfit = parseFloat((window.__currentUser && window.__currentUser.today_profit) || 0);
              const currentCommBal = parseFloat((window.__currentUser && window.__currentUser.commission_balance) || 0);
              if (window.__currentUser) {
                window.__currentUser.balance = res.new_balance;
              }
              updateTaskDisplay({
                balance: res.new_balance,
                commission_balance: currentCommBal,
                frozen_balance: (window.__currentUser && window.__currentUser.frozen_balance) || 0,
                today_profit: currentProfit,
                pending_task: res.task,
                today_tasks_completed: (window.__currentUser && window.__currentUser.today_tasks_completed) || 0,
                max_tasks: (window.__currentUser && (window.__currentUser.max_tasks !== undefined ? window.__currentUser.max_tasks : window.__currentUser.custom_daily_limit)) || 0
              });
            }
            showTaskModal(res.task);
          } else {
            const formattedDeficit = formatTaskDeficit(res);
            if (res && (res.reachedLimit || formattedDeficit || (res.message && (res.message.includes('frozen limit') || res.message.includes('deficit'))))) {
              const balanceText = document.getElementById('start-total-balance-text');
              if (balanceText && formattedDeficit) balanceText.innerHTML = `USD -${formattedDeficit}`;
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: "Account Limit Reached!",
                  icon: "warning",
                  text: taskDeficitMessage(formattedDeficit),
                  focusConfirm: false,
                  confirmButtonText: `Deposit Now`,
                  showCancelButton: true,
                  cancelButtonText: `Later`
                }).then((result) => {
                  if (result.isConfirmed) {
                    window.location.href = "depositData";
                  } else {
                    window.location.href = "startData";
                  }
                });
              } else {
                alert(taskDeficitMessage(formattedDeficit));
              }
              return;
            }
            if (res && res.requires_kyc) {
              const isPending = res.kyc_status === 'pending';
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: isPending ? "Contract Under Review" : "Contract & KYC Required!",
                  icon: isPending ? "info" : "warning",
                  html: `<div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${res.message}</div>`,
                  confirmButtonText: isPending ? "OK" : "Go to Contract",
                  showCancelButton: !isPending,
                  cancelButtonText: "Cancel",
                  confirmButtonColor: "#007bff"
                }).then((result) => {
                  if (result.isConfirmed && !isPending) {
                    window.location.href = "contract.html";
                  }
                });
              } else {
                alert(res.message);
                if (!isPending) {
                  window.location.href = "contract.html";
                }
              }
              return;
            }
            const ordersProcessing = res && res.code === 'orders_processing';
            if (ordersProcessing) {
              const procTitle = res.title || 'Merchant Orders in Preparation';
              const procMsg = res.message || 'Your merchant orders are currently being placed and processed by system administration. Please check back shortly.';
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: procTitle,
                  icon: "info",
                  html: `<div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${procMsg}</div>`,
                  confirmButtonText: "OK",
                  confirmButtonColor: "#2563eb"
                });
              } else {
                showBridgeToast(procTitle, procMsg, 'info');
              }
              return;
            }

            const ordersCompleted = res && res.code === 'orders_completed';
            if (ordersCompleted) {
              const compTitle = res.title || 'Merchant Orders Completed';
              const compMsg = res.message || 'All current orders are complete. Activate a new merchant contract to continue earning commissions.';
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: compTitle,
                  icon: "info",
                  html: `<div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${compMsg}</div>`,
                  confirmButtonText: "Activate Contract",
                  showCancelButton: true,
                  cancelButtonText: "Close",
                  confirmButtonColor: "#ff9900"
                }).then((result) => {
                  if (result.isConfirmed) {
                    window.location.href = "contract.html";
                  }
                });
              } else {
                showBridgeToast(compTitle, compMsg, 'info');
              }
              return;
            }
            showBridgeToast(
              'Order Notice',
              (res && res.message) || 'Unable to grab order at this time.',
              'error'
            );
          }
        } catch (err) {
          setStartProductOrbitActive(false);
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

    const formatUSD = (num) => {
      const isNeg = num < 0;
      const absVal = Math.abs(num).toFixed(2);
      const parts = absVal.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (isNeg ? '-' : '') + parts.join('.');
    };

    const workBal = parseFloat(data.balance || 0);
    const frozBal = parseFloat(data.frozen_balance !== undefined ? data.frozen_balance : (window.__currentUser && window.__currentUser.frozen_balance) || 0);
    const profitVal = parseFloat(data.today_profit || 0);

    const pTask = data.pending_task || window.__activePendingTask;
    let pendingPrice = 0;
    let pendingComm = 0;
    if (pTask) {
      pendingPrice = parseFloat(pTask.product_price || 0);
      pendingComm = parseFloat(pTask.commission_amount !== undefined && pTask.commission_amount !== null ? pTask.commission_amount : (pTask.commission_earned || 0));
    }

    const commBal = parseFloat(data.commission_balance !== undefined && data.commission_balance !== null
      ? data.commission_balance
      : (window.__currentUser && window.__currentUser.commission_balance) || 0);
    const totBal = commBal + (workBal >= 0 ? pendingPrice + pendingComm : 0);
    const displayProfit = profitVal;

    document.querySelectorAll('.task-balance, #workingBalance, .user-balance, #userBalance, .user-working-balance, .deposit-working-balance, #start-total-balance-text').forEach(el => {
      el.textContent = `USD ${formatUSD(workBal)}`;
    });
    document.querySelectorAll('.user-total-balance').forEach(el => {
      el.textContent = `USD ${formatUSD(totBal)}`;
    });
    document.querySelectorAll('#profile-working-balance, .profile-working-balance').forEach(el => {
      el.textContent = `USD ${formatUSD(workBal)}`;
    });
    document.querySelectorAll('#profile-total-balance, .profile-total-balance').forEach(el => {
      el.textContent = `USD ${formatUSD(totBal)}`;
    });
    // Start Page specific: Total Balance with Commission represents accumulated order gross + commission (Option A)
    const startGrandTotalEl = document.getElementById('start-grandtotal-balance-text');
    if (startGrandTotalEl) {
      let startCommBal = parseFloat(
        data.commission_balance !== undefined && data.commission_balance !== null
          ? data.commission_balance
          : (window.__currentUser && window.__currentUser.commission_balance !== undefined && window.__currentUser.commission_balance !== null
              ? window.__currentUser.commission_balance
              : 0)
      );
      if (startCommBal === 0 && window.__currentUser && parseFloat(window.__currentUser.commission_balance || 0) > 0) {
        startCommBal = parseFloat(window.__currentUser.commission_balance);
      }
      startGrandTotalEl.textContent = `USD ${formatUSD(startCommBal)}`;
    }
    document.querySelectorAll('.user-frozen, .user-frozen-balance, #start-frozen-balance-text').forEach(el => {
      el.textContent = `USD ${formatUSD(frozBal)}`;
    });
    document.querySelectorAll('#profile-frozen-balance, .profile-frozen-balance').forEach(el => {
      el.textContent = `USD ${formatUSD(frozBal)}`;
    });
    const taskFrozenContainer = document.getElementById('start-frozen-container');
    if (taskFrozenContainer) {
      taskFrozenContainer.style.display = frozBal > 0 ? 'block' : 'none';
    }
    document.querySelectorAll('.task-profit, #todayProfitVal, .user-today-profit, #todayProfit, #start-todays-profit-text, #profile-total-profit').forEach(el => {
      el.textContent = `USD ${formatUSD(displayProfit)}`;
    });

    // Populate VIP medal badge and user name
    const userLevel = parseInt(data.level || data.vip_level || (window.__currentUser && (window.__currentUser.vip_level || window.__currentUser.level)) || 1, 10);
    const badgeMap = {
      1: '/client/assets/img/bronze.png',
      2: '/client/assets/img/silver.png',
      3: '/client/assets/img/gold.png',
      4: '/client/assets/img/diamond.png'
    };
    const badgeSrc = badgeMap[userLevel] || badgeMap[1];
    document.querySelectorAll('.start-vip-badge, .vip-badge, .user-vip-badge').forEach(el => {
      el.innerHTML = `<img src="${badgeSrc}" alt="VIP Level" style="width: 24px; height: 24px; vertical-align: middle; object-fit: contain;" />`;
    });
    const userName = data.username || (window.__currentUser && window.__currentUser.username) || '';
    if (userName) {
      document.querySelectorAll('.user-name-text, .user-name').forEach(el => {
        el.textContent = userName;
      });
    }

    const completed = parseInt(data.today_tasks_completed || 0, 10);
    const maxT = parseInt(data.max_tasks !== undefined && data.max_tasks !== null ? data.max_tasks : completed, 10);
    let setName = '1st Set:';
    let countText = `${completed} / 3`;
    if (completed < 3) {
      setName = '1st Set:';
      countText = `${completed} / 3`;
    } else if (completed < 5) {
      setName = '2nd Set:';
      countText = `${completed - 3} / 2`;
    } else {
      setName = '3rd Set:';
      const thirdSetTotal = Math.max(1, maxT - 5);
      const thirdSetDone = Math.min(thirdSetTotal, Math.max(0, completed - 5));
      countText = `${thirdSetDone} / ${thirdSetTotal}`;
    }

    const setTextEl = document.getElementById('startSetText');
    if (setTextEl) setTextEl.textContent = setName;
    const countTextEl = document.getElementById('startTaskCountText');
    if (countTextEl) countTextEl.textContent = countText;
    const submitBtnEl = document.getElementById('start-button-submit');
    if (submitBtnEl) submitBtnEl.style.display = 'none';
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
          <img src="${task.product_image || 'assets/uploads/logo/1742595477_icon.png'}" style="width: 220px; height: 220px; object-fit: contain; object-position: center; display: block; margin: 0 auto 14px; border-radius: 10px; border: 1px solid #f0f0f0; padding: 10px; box-sizing: border-box; background: #fff;" />
          <div style="font-weight: 600; font-size: 15px; color: #222; margin-bottom: 6px; line-height: 1.3;">${task.product_name}</div>
          <div style="color: #666; font-size: 13px;">Merchant Value: <strong style="color: #111;">$${task.product_price.toFixed(2)}</strong></div>
        </div>
        <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: center;">
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
          <button id="cancelTaskBtn" style="flex: 1; padding: 12px; border: 1px solid #ddd; background: #fff; border-radius: 8px; font-weight: 600; cursor: pointer; color: #555; transition: background 0.15s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">✕ Cancel</button>
          <button id="submitTaskBtn" style="flex: 2; padding: 12px; border: none; background: #28a745; color: #fff; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>Submit Optimization</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    const cancelBtn = document.getElementById('cancelTaskBtn');
    if (cancelBtn) {
      cancelBtn.onclick = async () => {
        // For deficit orders: just close modal — balance is not yet deducted, user must deposit first
        if (task.is_deficit) {
          modal.style.display = 'none';
          window.__activePendingTask = null;
          showBridgeToast('Order Closed', 'Deficit order closed. Please deposit to clear your shortfall.', 'info');
          if (typeof window.fetchTaskStatus === 'function') window.fetchTaskStatus();
          return;
        }
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Cancelling...';
        try {
          const cancelRes = await API.post('/api/tasks/cancel', { taskId: task.id });
          if (!cancelRes || !cancelRes.success) {
            cancelBtn.disabled = false;
            cancelBtn.textContent = '✕ Cancel';
            showBridgeToast('Cancellation Failed', (cancelRes && cancelRes.message) || 'The order could not be cancelled. Please try again.', 'error');
            return;
          }
          modal.style.display = 'none';
          window.__activePendingTask = null;
          if (window.__currentUser) {
            window.__currentUser.pending_task = null;
            if (cancelRes && cancelRes.data && cancelRes.data.balance !== undefined) {
              window.__currentUser.balance = parseFloat(cancelRes.data.balance);
            }
          }
          showBridgeToast('Order Cancelled', (cancelRes && cancelRes.message) || 'Order cancelled. Your working balance is unaffected.', 'info');
          if (typeof window.fetchTaskStatus === 'function') {
            window.fetchTaskStatus();
          } else if (typeof window.refreshUserData === 'function') {
            window.refreshUserData();
          }
        } catch (cancelErr) {
          console.error('Cancel order error:', cancelErr);
          cancelBtn.disabled = false;
          cancelBtn.textContent = '✕ Cancel';
          showBridgeToast('Cancellation Failed', 'The order could not be cancelled. Please try again.', 'error');
        }
      };
    }

    document.getElementById('submitTaskBtn').onclick = async () => {
      const submitBtn = document.getElementById('submitTaskBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting Order...';

      let res = null;
      try {
        res = await API.post('/api/tasks/submit', { taskId: task.id });
      } catch (networkErr) {
        console.error('Submission network error:', networkErr);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Submit Order</span>';
        showBridgeToast('Submission Failed', 'Connection error occurred while submitting order.', 'error');
        return;
      }

      if (res && res.success) {
        window.__activePendingTask = null;
        modal.style.display = 'none';
        showBridgeToast('Order Completed', res.message || 'Order completed successfully!', 'success');

        try {
          if (window.__currentUser) {
            window.__currentUser.balance = parseFloat(res.data.balance || 0);
            window.__currentUser.commission_balance = parseFloat(res.data.commission_balance || 0);
            window.__currentUser.today_profit = parseFloat(res.data.today_profit || 0);
            window.__currentUser.today_tasks_completed = parseInt(res.data.today_tasks_completed || 0, 10);
            window.__currentUser.frozen_balance = parseFloat(res.data.frozen_balance || 0);
            window.__currentUser.pending_task = null;
          }

          updateTaskDisplay({
            balance: res.data.balance,
            commission_balance: res.data.commission_balance,
            frozen_balance: 0.00,
            today_profit: res.data.today_profit,
            today_tasks_completed: res.data.today_tasks_completed,
            pending_task: null,
            max_tasks: (res.data && res.data.max_tasks !== undefined ? res.data.max_tasks : ((window.__currentUser && window.__currentUser.max_tasks !== undefined ? window.__currentUser.max_tasks : res.data.today_tasks_completed)))
          });

          if (window.__currentUser && typeof populateUserData === 'function') {
            populateUserData(window.__currentUser);
          }
        } catch (uiErr) {
          console.warn('UI sync notice after task submit:', uiErr);
        }
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Submit Optimization</span>';
        const formattedDeficit = formatTaskDeficit(res);
        if (res && (res.reachedLimit || formattedDeficit || (res.message && res.message.includes('frozen limit')))) {
          modal.style.display = 'none';
          const balanceText = document.getElementById('start-total-balance-text');
          if (balanceText && formattedDeficit) balanceText.innerHTML = `USD -${formattedDeficit}`;
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: "Account Limit Reached!",
              icon: "info",
              text: taskDeficitMessage(formattedDeficit),
              focusConfirm: false,
              confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`,
            }).then(() => {
              window.location.href = "startData";
            });
          } else {
            alert(taskDeficitMessage(formattedDeficit));
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
        const compressed = await compressImageFile(file, 1000, 0.75);
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
        const userDepositMinimum = Number(user && user.custom_min_deposit);
        const minimumDeposit = Number.isFinite(userDepositMinimum) && userDepositMinimum > 0 ? userDepositMinimum : 1;
        if (isNaN(amount) || amount < minimumDeposit) {
          showBridgeToast('Invalid Amount', `Minimum deposit is $${minimumDeposit.toFixed(2)}`, 'error');
          return;
        }

        let proofImage = previewImg && previewImg.src ? previewImg.src : 'assets/uploads/contracts/id_sample_front.png';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting Deposit...';
        }

        try {
          const res = await API.post('/api/finance/deposit', {
            amount,
            method: 'TRC20',
            txid: '0x' + Math.random().toString(16).substring(2, 14) + Date.now().toString(16),
            proof_image: proofImage
          });

          if (res && res.success) {
            showBridgeToast('Deposit Submitted', res.message, 'success');
            if (amountInput) amountInput.value = '';
            if (receiptInput) receiptInput.value = '';
            if (previewImg) previewImg.src = '';
            if (placeholder) {
              placeholder.style.display = 'block';
              placeholder.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 8px; display: block;">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                  <path d="M12 12v9"></path>
                  <path d="m16 16-4-4-4 4"></path>
                </svg>
                <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 3px;">Upload Payment Receipt / Transfer Screenshot *</div>
                <div style="font-size: 11.5px; color: #64748b; margin-bottom: 10px;">Supports JPG, PNG, WEBP (Max 10MB)</div>
                <span style="display: inline-block; background-color: #007bff; color: #ffffff; font-weight: 600; font-size: 12px; padding: 6px 20px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,123,255,0.25);">Browse Image</span>
              `;
            }
            if (container) container.style.display = 'none';
            if (typeof loadDepositHistory === 'function') loadDepositHistory();
          } else {
            showBridgeToast('Deposit Failed', (res && res.message) || 'Error submitting deposit', 'error');
          }
        } catch (err) {
          console.error('[Deposit Submit Error]', err);
          showBridgeToast('Deposit Error', 'Failed to submit deposit. Please try again.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
          }
        }
      });
    }

    // Fiat uses the same amount/receipt workflow as Crypto, with a separate
    // form so switching tabs never submits the hidden Crypto form by mistake.
    const fiatForm = document.getElementById('fiatDepositForm');
    const fiatReceiptInput = document.getElementById('fiatDepositReceiptInput');
    const fiatPlaceholder = document.getElementById('fiatReceiptUploadPlaceholder');
    const fiatPreviewContainer = document.getElementById('fiatReceiptPreviewContainer');
    const fiatPreviewImg = document.getElementById('fiatReceiptPreviewImg');
    if (fiatReceiptInput) {
      fiatReceiptInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          showBridgeToast('Invalid Receipt', 'Please select a JPG, PNG, or WEBP image.', 'error');
          fiatReceiptInput.value = '';
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          showBridgeToast('File Too Large', 'Receipt images must be 10MB or smaller.', 'error');
          fiatReceiptInput.value = '';
          return;
        }
        if (fiatPlaceholder) fiatPlaceholder.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Optimizing receipt...';
        const compressed = await compressImageFile(file, 1000, 0.75);
        if (fiatPreviewImg && compressed) fiatPreviewImg.src = compressed;
        if (fiatPlaceholder) fiatPlaceholder.style.display = 'none';
        if (fiatPreviewContainer) fiatPreviewContainer.style.display = 'block';
      });
    }
    if (fiatForm) {
      fiatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amountInput = document.getElementById('fiat-deposit-amount');
        const submitBtn = fiatForm.querySelector('button[type="submit"]');
        const amount = parseFloat(amountInput ? amountInput.value : 0);
        const customMinimum = Number(user && user.custom_min_deposit);
        const minimumDeposit = Number.isFinite(customMinimum) && customMinimum > 0 ? customMinimum : 1;
        if (!Number.isFinite(amount) || amount < minimumDeposit) {
          showBridgeToast('Invalid Amount', `Minimum deposit is $${minimumDeposit.toFixed(2)}`, 'error');
          return;
        }
        if (!fiatReceiptInput || !fiatReceiptInput.files || !fiatReceiptInput.files[0] || !fiatPreviewImg || !fiatPreviewImg.src) {
          showBridgeToast('Receipt Required', 'Please upload your Fiat payment receipt before submitting.', 'error');
          return;
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting Deposit...';
        }
        try {
          const res = await API.post('/api/finance/deposit', {
            amount,
            method: 'FIAT',
            txid: 'FIAT-' + Date.now() + '-' + Math.random().toString(16).substring(2, 10),
            proof_image: fiatPreviewImg.src
          });
          if (res && res.success) {
            showBridgeToast('Deposit Submitted', res.message, 'success');
            amountInput.value = '';
            fiatReceiptInput.value = '';
            fiatPreviewImg.src = '';
            if (fiatPlaceholder) fiatPlaceholder.style.display = 'block';
            if (fiatPreviewContainer) fiatPreviewContainer.style.display = 'none';
            if (typeof loadDepositHistory === 'function') loadDepositHistory();
          } else {
            showBridgeToast('Deposit Failed', (res && res.message) || 'Error submitting deposit', 'error');
          }
        } catch (err) {
          console.error('[Fiat Deposit Submit Error]', err);
          showBridgeToast('Deposit Error', 'Failed to submit deposit. Please try again.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
          }
        }
      });
    }

    const historyBtn = document.getElementById('history-btn');
    async function loadDepositHistory() {
      const allRecords = document.querySelector('#history-section #allRecords') || document.getElementById('allRecords');
      if (!allRecords) return;
      allRecords.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;"><i class="fa fa-spinner fa-spin"></i> Loading deposit records...</div>';
      try {
        const res = await API.get('/api/finance/history');
        if (res && res.success && Array.isArray(res.deposits) && res.deposits.length > 0) {
          allRecords.innerHTML = res.deposits.map(d => {
            const rawDate = new Date(d.created_at);
            let dateStr = d.created_at || 'Just now';
            if (!isNaN(rawDate.getTime())) {
              const y = rawDate.getFullYear();
              const m = String(rawDate.getMonth() + 1).padStart(2, '0');
              const day = String(rawDate.getDate()).padStart(2, '0');
              let hours = rawDate.getHours();
              const minutes = String(rawDate.getMinutes()).padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12;
              hours = hours ? hours : 12;
              const hStr = String(hours).padStart(2, '0');
              dateStr = `${y}-${m}-${day} ${hStr}:${minutes} ${ampm}`;
            }
            const amt = parseFloat(d.amount || 0).toFixed(2);
            const st = (d.status || 'Pending').toLowerCase();
            const statusLabel = st === 'approved' || st === 'verified' ? 'Approved — credited' : (st === 'rejected' ? 'Rejected' : 'Pending verification');
            const statusBg = st === 'approved' || st === 'verified' ? '#dcfce7' : (st === 'rejected' ? '#fee2e2' : '#fef3c7');
            const statusColor = st === 'approved' || st === 'verified' ? '#15803d' : (st === 'rejected' ? '#b91c1c' : '#b45309');
            const amountLabel = st === 'approved' || st === 'verified' ? `USD +${amt}` : `USD ${amt}`;
            const amountColor = st === 'approved' || st === 'verified' ? '#16a34a' : (st === 'rejected' ? '#b91c1c' : '#a16207');
            const txid = d.txid ? (d.txid.length > 16 ? d.txid.substring(0, 16) + '...' : d.txid) : 'Blockchain Deposit';
            return `
              <div style="background: white; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <div style="color: #64748b; font-size: 12px;">Method: ${d.method || 'TRC20'}</div>
                    <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; margin-top: 4px;">${dateStr}</div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">Tx: ${txid}</div>
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <div style="color: #64748b; font-size: 12px;">Amount</div>
                    <div style="font-weight: 700; font-size: 15px; color: ${amountColor}; margin-top: 4px;">${amountLabel}</div>
                  </div>
                  <div style="flex: 1; text-align: right;">
                    <div style="color: #64748b; font-size: 12px;">Status</div>
                    <div style="margin-top: 4px;">
                      <span style="display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; background: ${statusBg}; color: ${statusColor};">${statusLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          allRecords.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 28px 16px; text-align: center; color: #64748b; font-size: 13.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
              No deposit records found.
            </div>
          `;
        }
      } catch (err) {
        allRecords.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc2626;">Error loading deposit history.</div>`;
      }
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', loadDepositHistory);
    }
    loadDepositHistory();
    window.loadDepositHistory = loadDepositHistory;
  }

  // Pending Task Withdrawal Modal Pop-up
  // Helper to ensure SweetAlert2 is loaded
  function ensureSwal(callback) {
    if (typeof Swal !== 'undefined') {
      return callback();
    }
    const existing = document.querySelector('script[src*="sweetalert2"]');
    if (existing) {
      existing.addEventListener('load', () => callback());
      setTimeout(() => {
        if (typeof Swal !== 'undefined') callback();
      }, 300);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.onload = () => callback();
    script.onerror = () => callback();
    document.head.appendChild(script);
  }

  // Pending Task Withdrawal Modal Pop-up (SweetAlert2 UI/UX matching platform standard)
  window.showPendingTaskWithdrawalModal = function(options = {}) {
    const title = options.title || 'You Have to Complete Your Pending Order';
    const message = options.message || 'You have an active pending order in progress. You have to complete your assigned orders before you can make a withdrawal.';
    const orderNum = options.pending_order_number || options.order_number || null;
    const prodName = options.product_name || null;
    const completed = options.completed_tasks !== undefined && options.completed_tasks !== null ? parseInt(options.completed_tasks, 10) : null;
    const max = options.max_tasks !== undefined && options.max_tasks !== null ? parseInt(options.max_tasks, 10) : (completed || 0);

    let detailsBox = '';
    if ((completed !== null && max !== null) || orderNum) {
      const pct = max > 0 ? Math.min(100, Math.round(((completed || 0) / max) * 100)) : 0;
      detailsBox = `
        <div style="background: #f8fafc; border-radius: 12px; padding: 13px 15px; margin: 14px 0 6px 0; border: 1.5px dashed #cbd5e1; text-align: left;">
          ${completed !== null && max !== null ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; font-weight: 600;">
              <span>Daily Orders Progress:</span>
              <span style="color: #0f172a; font-weight: 800;">${completed} / ${max} Completed</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; margin: 8px 0 10px 0; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #f59e0b, #ea580c); width: ${pct}%; height: 100%; border-radius: 4px;"></div>
            </div>
          ` : ''}
          ${orderNum ? `
            <div style="font-size: 12px; color: #c2410c; font-weight: 600; line-height: 1.4;">
              <span>Active Pending Order: <strong style="font-family: monospace; color: #0f172a;">${orderNum}</strong></span>
            </div>
            ${prodName ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 3px; line-height: 1.35;">${prodName}</div>` : ''}
          ` : ''}
        </div>
      `;
    }

    const htmlContent = `
      <div style="font-size: 14.5px; color: #545454; line-height: 1.55; margin-bottom: 6px;">
        ${message}
      </div>
      ${detailsBox}
    `;

    ensureSwal(() => {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: title,
          icon: "info",
          html: htmlContent,
          focusConfirm: false,
          confirmButtonText: "Ok",
          confirmButtonColor: "#7066e0"
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "startData";
          }
        });
      } else {
        alert(`${title}\n\n${message}`);
      }
    });
  };

  // Intercept global withdraw clicks across dashboard/profile if tasks are incomplete
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="withdraw"], a[href="withdraw.html"]');
    if (!link) return;

    if (window.__userTaskStatus) {
      const ts = window.__userTaskStatus;
      const isNeg = parseFloat(ts.balance || 0) < 0;
      const hasPending = !!ts.pending_task;
      const completed = parseInt(ts.today_tasks_completed || 0, 10);
      const max = parseInt(ts.max_tasks !== undefined && ts.max_tasks !== null ? ts.max_tasks : (ts.today_tasks_completed || 0), 10);

      if (isNeg || hasPending || completed < max) {
        e.preventDefault();
        let reason = 'You have to complete your pending order before requesting a withdrawal.';
        if (hasPending) {
          reason = 'You have an active pending order in progress. You have to complete your assigned orders before you can make a withdrawal.';
        } else if (isNeg) {
          const numVal = Math.abs(parseFloat(ts.balance || 0));
          const formattedDeficit = numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          reason = `Your working balance is currently negative (-${formattedDeficit} USDT). You have to complete your pending order and clear the deficit before you can make a withdrawal.`;
        } else if (completed < max) {
          reason = `You have to complete all daily orders (${completed}/${max} completed) before requesting a withdrawal.`;
        }

        window.showPendingTaskWithdrawalModal({
          title: 'You Have to Complete Your Pending Order',
          message: reason,
          pending_order_number: ts.pending_task ? ts.pending_task.order_number : null,
          product_name: ts.pending_task ? ts.pending_task.product_name : null,
          completed_tasks: completed,
          max_tasks: max
        });
      }
    }
  });

  // WITHDRAW PAGE HANDLER
  function initWithdrawPage(user) {
    const historyBtn = document.getElementById('history-btn');
    const allRecords = document.querySelector('#history-section #allRecords') || document.getElementById('allRecords');

    async function loadWithdrawHistory() {
      const recordsContainer = document.querySelector('#history-section #allRecords') || document.getElementById('allRecords');
      if (!recordsContainer) return;
      recordsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;"><i class="fa fa-spinner fa-spin"></i> Loading records...</div>';
      try {
        const res = await API.get('/api/finance/history');
        if (res && res.success && Array.isArray(res.withdrawals) && res.withdrawals.length > 0) {
          recordsContainer.innerHTML = res.withdrawals.map(w => {
            const rawDate = new Date(w.created_at);
            let dateStr = w.created_at || 'Just now';
            if (!isNaN(rawDate.getTime())) {
              const y = rawDate.getFullYear();
              const m = String(rawDate.getMonth() + 1).padStart(2, '0');
              const day = String(rawDate.getDate()).padStart(2, '0');
              let hours = rawDate.getHours();
              const minutes = String(rawDate.getMinutes()).padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12;
              hours = hours ? hours : 12;
              const hStr = String(hours).padStart(2, '0');
              dateStr = `${y}-${m}-${day} ${hStr}:${minutes} ${ampm}`;
            }
            const amt = parseFloat(w.amount || 0).toFixed(2);
            const st = (w.status || 'Pending').toLowerCase();
            const statusLabel = st === 'approved' ? 'Approved' : (st === 'rejected' ? 'Rejected' : 'Pending');
            const statusBg = st === 'approved' ? '#dcfce7' : (st === 'rejected' ? '#fee2e2' : '#fef3c7');
            const statusColor = st === 'approved' ? '#15803d' : (st === 'rejected' ? '#b91c1c' : '#b45309');
            const dest = w.wallet_address || w.account_number || w.bank_name || 'USDT TRC20';
            const shortDest = dest.length > 16 ? dest.substring(0, 16) + '...' : dest;
            return `
              <div style="background: white; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <div style="color: #64748b; font-size: 12px;">Method: ${w.method || 'USDT'}</div>
                    <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; margin-top: 4px;">${dateStr}</div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">To: ${shortDest}</div>
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <div style="color: #64748b; font-size: 12px;">Amount</div>
                    <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-top: 4px;">USD ${amt}</div>
                  </div>
                  <div style="flex: 1; text-align: right;">
                    <div style="color: #64748b; font-size: 12px;">Status</div>
                    <div style="margin-top: 4px;">
                      <span style="display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; background: ${statusBg}; color: ${statusColor};">${statusLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          recordsContainer.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 28px 16px; text-align: center; color: #64748b; font-size: 13.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
              No withdrawal records found.
            </div>
          `;
        }
      } catch (err) {
        if (recordsContainer) recordsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc2626;">Error loading withdrawal history.</div>`;
      }
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', loadWithdrawHistory);
    }
    loadWithdrawHistory();
    window.loadWithdrawHistory = loadWithdrawHistory;

    const withdrawForms = document.querySelectorAll('form.withdrawal-form, #withdrawForm');
    if (!withdrawForms || !withdrawForms.length) return;

    // Fetch and cache user's current task status
    let userTaskStatus = null;
    (async () => {
      try {
        const stRes = await API.get('/api/tasks/status');
        if (stRes && stRes.success && stRes.data) {
          userTaskStatus = stRes.data;
          window.__userTaskStatus = stRes.data;

          const isNeg = parseFloat(stRes.data.balance || 0) < 0;
          const hasPending = !!stRes.data.pending_task;
          const completed = parseInt(stRes.data.today_tasks_completed || 0, 10);
          const max = parseInt(stRes.data.max_tasks !== undefined && stRes.data.max_tasks !== null ? stRes.data.max_tasks : (stRes.data.today_tasks_completed || 0), 10);

          if (isNeg || hasPending || completed < max) {
            const container = document.querySelector('.withdraw-form-container') || document.querySelector('#crypto-section')?.parentElement;
            if (container && !document.getElementById('withdrawPendingTaskBanner')) {
              const banner = document.createElement('div');
              banner.id = 'withdrawPendingTaskBanner';
              banner.style.cssText = 'background: #fff7ed; border: 1.5px solid #f97316; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.1);';
              banner.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                  <i class="fa fa-lock"></i>
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 800; color: #9a3412; font-size: 14px;">Order Completion Required</div>
                  <div style="color: #c2410c; font-size: 12.5px; margin-top: 3px; line-height: 1.4;">
                    You have pending orders in progress (${completed}/${max} completed). All assigned orders must be completed before you can withdraw.
                  </div>
                  <div style="margin-top: 10px;">
                    <a href="startData" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: linear-gradient(135deg, #ea580c, #dc2626); color: #ffffff; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25);">
                      <i class="fa fa-tasks"></i> Complete Orders Now
                    </a>
                  </div>
                </div>
              `;
              container.insertBefore(banner, container.firstChild);
            }
          }
        }
      } catch (_) {}
    })();

    withdrawForms.forEach(withdrawForm => {
      withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if user has incomplete tasks or negative balance
        const ts = userTaskStatus || window.__userTaskStatus;
        if (ts) {
          const isNeg = parseFloat(ts.balance || 0) < 0;
          const hasPending = !!ts.pending_task;
          const completed = parseInt(ts.today_tasks_completed || 0, 10);
          const max = parseInt(ts.max_tasks !== undefined && ts.max_tasks !== null ? ts.max_tasks : (ts.today_tasks_completed || 0), 10);

          if (isNeg || hasPending || completed < max) {
            let reason = 'You have to complete your pending order before requesting a withdrawal.';
            if (hasPending) {
              reason = 'You have an active pending order in progress. You have to complete your assigned orders before you can make a withdrawal.';
            } else if (isNeg) {
              const numVal = Math.abs(parseFloat(ts.balance || 0));
              const formattedDeficit = numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              reason = `Your working balance is currently negative (-${formattedDeficit} USDT). You have to complete your pending order and clear the deficit before you can make a withdrawal.`;
            } else if (completed < max) {
              reason = `You have to complete all daily orders (${completed}/${max} completed) before requesting a withdrawal.`;
            }

            window.showPendingTaskWithdrawalModal({
              title: 'You Have to Complete Your Pending Order',
              message: reason,
              pending_order_number: ts.pending_task ? ts.pending_task.order_number : null,
              product_name: ts.pending_task ? ts.pending_task.product_name : null,
              completed_tasks: completed,
              max_tasks: max
            });
            return;
          }
        }

        const amountInput = withdrawForm.querySelector('input[name="withdraw_amount"], input[name="amount"], #withdraw-amount');
        const addressInput = withdrawForm.querySelector('input[name="wallet_address"], input[name="address"], #wallet-address');
        const networkSelect = withdrawForm.querySelector('select[name="usdt_network"], #usdt-network');
        const bankInput = withdrawForm.querySelector('input[name="bank_name"], #bank_name');
        const holderInput = withdrawForm.querySelector('input[name="account_holdername"], #account_holdername');
        const ibanInput = withdrawForm.querySelector('input[name="iban_number"], #iban_number');
        const submitBtn = withdrawForm.querySelector('button[type="submit"], .withdraw-btn');

        if (!amountInput) return;

        const amountText = String(amountInput.value || '').trim();
        const amount = Number(amountText);
        const userOverride = Number(user && user.custom_min_withdraw);
        const clientMinimum = Number.isFinite(userOverride) && userOverride > 0 ? Math.max(10, userOverride) : 10;
        if (!/^\d+(?:\.0+)?$/.test(amountText) || !Number.isSafeInteger(amount) || amount < clientMinimum) {
          showBridgeToast('Invalid Amount', `Enter a whole-dollar amount of at least $${clientMinimum.toFixed(2)}.`, 'error');
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
              const newCommission = parseFloat(res.new_commission_balance !== undefined ? res.new_commission_balance : (window.__currentUser ? window.__currentUser.commission_balance : 0)) || 0;
              const newFrozen = parseFloat(res.new_frozen !== undefined ? res.new_frozen : (window.__currentUser ? window.__currentUser.frozen_balance : 0));
              const newTot = newWork + newFrozen;
              if (window.__currentUser) {
                window.__currentUser.balance = newWork;
                window.__currentUser.commission_balance = newCommission;
                window.__currentUser.frozen_balance = newFrozen;
              }
              document.querySelectorAll('.user-balance, #userBalance, .user-working-balance').forEach(el => {
                el.textContent = `USD ${newWork.toFixed(2)}`;
              });
              document.querySelectorAll('.withdraw-card-value').forEach(el => {
                el.textContent = `USD ${(newCommission > 0 ? newCommission : newWork).toFixed(2)}`;
              });
              document.querySelectorAll('.user-total-balance, #profile-total-balance').forEach(el => {
                el.textContent = `USD ${newTot.toFixed(2)}`;
              });
              document.querySelectorAll('.user-frozen, .user-frozen-balance, #profile-frozen-balance').forEach(el => {
                el.textContent = `USD ${newFrozen.toFixed(2)}`;
              });
            }
          } else {
            if (res && res.has_pending_tasks) {
              window.showPendingTaskWithdrawalModal({
                title: 'You Have to Complete Your Pending Order',
                message: res.message,
                pending_order_number: res.pending_order_number,
                product_name: res.product_name,
                completed_tasks: res.completed_tasks,
                max_tasks: res.max_tasks
              });
            } else {
              showBridgeToast('Withdrawal Failed', (res && res.message) || 'Error submitting withdrawal', 'error');
            }
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
  // RECORD PAGE HANDLER - Matches authentic WhatsApp Image 07.10.37.jpeg & 07.10.38.jpeg
  async function initRecordPage(user) {
    if (typeof window.loadTaskRecords === 'function') return;
    const tasksRes = await API.get('/api/tasks/records');
    const allContainer = document.getElementById('allRecords') || document.querySelector('.record-item-tab');
    const pendingContainer = document.getElementById('pendingRecords');
    const completedContainer = document.getElementById('completedRecords');

    if (!tasksRes || !tasksRes.tasks) return;

    function renderTaskCard(task) {
      const isCompleted = task.status === 'completed' || task.status === 'approved';
      let imgUrl = task.product_image || 'client/assets/uploads/logo/1742595477_icon.png';
      if (!imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
        imgUrl = '/' + imgUrl;
      }

      const totalAmount = parseFloat(task.product_price || 0).toFixed(2);
      let profitVal = parseFloat(task.commission_amount !== undefined && task.commission_amount !== null ? task.commission_amount : (task.commission_earned || 0));
      if (!profitVal || profitVal <= 0) {
        const rate = parseFloat(task.commission_rate || 0.20);
        profitVal = parseFloat((parseFloat(totalAmount) * rate).toFixed(2));
      }
      const profit = profitVal.toFixed(2);
      
      let dateStr = task.created_at || 'Just now';
      try {
        const d = new Date(task.created_at);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          let hours = d.getHours();
          const mins = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const hStr = String(hours).padStart(2, '0');
          dateStr = `${y}-${m}-${day} ${hStr}:${mins} ${ampm}`;
        }
      } catch (_) {}

      const statusPill = isCompleted
        ? `<div class="completed-pill-outline" style="border: 1px solid #4b5563; border-radius: 20px; padding: 3px 18px; font-size: 12px; color: #374151; background: transparent; text-transform: lowercase; font-weight: 500;">completed</div>`
        : `<button type="button" data-id="${task.id}" class="submit-btn submit-btn-${task.id}" style="background: #16a34a; color: #fff; border: none; border-radius: 20px; padding: 4px 20px; font-size: 12px; font-weight: 700; cursor: pointer;">Submit</button>`;

      return `
        <div class="record-item-tab-field" id="record-${task.id}" style="background: #ffffff; border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          <div class="record-item-tab-field-up" style="display: flex; gap: 14px; align-items: flex-start;">
            <img src="${imgUrl}" alt="" class="record-item-image" onerror="this.onerror=null;this.src='/client/assets/uploads/logo/1742595477_icon.png';" style="width: 76px; height: 76px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0; background: #f8fafc;">
            <div class="record-item-description" style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.35; flex: 1; word-break: break-word;">${escapeHtml(task.product_name || task.title)}</div>
          </div>
          <div class="record-item-tab-field-down" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; margin-top: 12px; padding-top: 10px;">
            <div class="record-item-tab-field-down-item">
              <div class="tiny-text" style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Total Amount</div>
              <div class="small-text" style="font-weight: 700; font-size: 14.5px; color: #0f172a;">USD ${totalAmount}</div>
            </div>
            <div class="record-item-tab-field-down-item" style="text-align: right;">
              <div class="tiny-text" style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Profit</div>
              <div class="small-text" style="font-weight: 700; font-size: 14.5px; color: #0f172a;">USD ${profit}</div>
            </div>
          </div>
          <div class="record-item-tab-title" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 4px;">
            <div class="record-item-tab-title-left" style="font-size: 12.5px; color: #475569;">${dateStr}</div>
            <div class="record-item-tab-title-right">
              ${statusPill}
            </div>
          </div>
        </div>
      `;
    }

    function renderEmpty(msg) {
      return `
        <div style="background: #ffffff; border-radius: 12px; padding: 36px 16px; text-align: center; color: #64748b; font-size: 13.5px; box-shadow: 0 1px 5px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          ${msg}
        </div>
      `;
    }

    const allTasks = tasksRes.all_tasks || tasksRes.tasks || [];
    const pendingTasks = allTasks.filter(t => t.status === 'pending');
    const completedTasks = allTasks.filter(t => t.status === 'completed' || t.status === 'approved');

    if (allContainer) {
      allContainer.innerHTML = allTasks.length > 0 ? allTasks.map(renderTaskCard).join('') : renderEmpty('No order records found.');
    }
    if (pendingContainer) {
      pendingContainer.innerHTML = pendingTasks.length > 0 ? pendingTasks.map(renderTaskCard).join('') : renderEmpty('No pending orders.');
    }
    if (completedContainer) {
      completedContainer.innerHTML = completedTasks.length > 0 ? completedTasks.map(renderTaskCard).join('') : renderEmpty('No completed orders.');
    }

    // Attach tab switching handlers
    const allBtn = document.getElementById('allBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    const completedBtn = document.getElementById('completedBtn');

    function setActiveTab(activeBtn, showContainer) {
      [allBtn, pendingBtn, completedBtn].forEach(b => {
        if (b) {
          b.classList.remove('record-nav-item-active');
          b.style.backgroundColor = '';
          b.style.color = '#64748b';
        }
      });
      [allContainer, pendingContainer, completedContainer].forEach(c => {
        if (c) c.style.display = 'none';
      });

      if (activeBtn) {
        activeBtn.classList.add('record-nav-item-active');
        activeBtn.style.backgroundColor = '#f7e3ba';
        activeBtn.style.color = '#0f172a';
      }
      if (showContainer) {
        showContainer.style.display = 'flex';
        showContainer.style.flexDirection = 'column';
        showContainer.style.gap = '14px';
      }
    }

    if (allBtn) allBtn.onclick = () => setActiveTab(allBtn, allContainer);
    if (pendingBtn) pendingBtn.onclick = () => setActiveTab(pendingBtn, pendingContainer);
    if (completedBtn) completedBtn.onclick = () => setActiveTab(completedBtn, completedContainer);

    // Initial state: All active
    setActiveTab(allBtn, allContainer);

    // Attach submit handlers for pending tasks
    document.querySelectorAll('.submit-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        const taskId = this.getAttribute('data-id');
        if (!taskId) return;
        this.disabled = true;
        this.textContent = 'Submitting...';

        try {
          const res = await API.post('/api/tasks/submit', { taskId });
          this.disabled = false;
          this.textContent = 'Submit';

          if (res && res.success) {
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                title: 'Success!',
                text: res.message || 'Your order submitted successfully.',
                icon: 'success',
                confirmButtonColor: '#16a34a'
              }).then(() => { initRecordPage(user); });
            } else {
              alert(res.message || 'Your order submitted successfully.');
              initRecordPage(user);
            }
          } else {
            const formattedDeficit = formatTaskDeficit(res);
            if (res && (res.reachedLimit || formattedDeficit || (res.message && res.message.includes('frozen limit')))) {
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: "Account Limit Reached!",
                  icon: "info",
                  text: taskDeficitMessage(formattedDeficit),
                  focusConfirm: false,
                  confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`
                });
              } else {
                alert(taskDeficitMessage(formattedDeficit));
              }
            } else {
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: 'Notice',
                  text: (res && res.message) || 'Insufficient balance or task could not be submitted.',
                  icon: 'warning'
                });
              } else {
                alert((res && res.message) || 'Insufficient balance or task could not be submitted.');
              }
            }
          }
        } catch (err) {
          this.disabled = false;
          this.textContent = 'Submit';
          if (typeof Swal !== 'undefined') {
            Swal.fire('Error!', 'Network error processing your request.', 'error');
          } else {
            alert('Network error processing your request.');
          }
        }
      });
    });
  }

  // CONTRACT / KYC SUBMISSION HANDLER
  async function initContractKycPage(user) {
    const [kycRes, profileRes] = await Promise.all([
      API.get('/api/user/kyc').catch(() => null),
      API.get('/api/user/profile').catch(() => null)
    ]);
    const activeUser = (profileRes && profileRes.user) || user || window.__currentUser || {};
    const form = document.getElementById('invite_submit_form') || document.querySelector('form');
    const submitBtn = document.getElementById('invite_submit_form_btn') || (form && form.querySelector('button.form-submit-btn, button[type="submit"], button[type="button"]'));

    // 1. Pre-fill user information if empty
    const nameInput = document.getElementById('name');
    if (nameInput && !nameInput.value.trim() && activeUser) {
      nameInput.value = activeUser.fullname || activeUser.username || '';
    }

    const userIdInput = document.getElementById('userId');
    if (userIdInput && activeUser) {
      userIdInput.value = activeUser.id || activeUser.user_code || activeUser.username || '1001';
    }

    const investmentInput = document.getElementById('investmentAmount');
    const workingBalanceAmount = Number(activeUser.balance !== undefined ? activeUser.balance : (user && user.balance !== undefined ? user.balance : 0));
    const totalBalanceAmount = Number(activeUser.commission_balance !== undefined ? activeUser.commission_balance : (user && user.commission_balance !== undefined ? user.commission_balance : 0));
    const hasApprovedKyc = Boolean(
      (kycRes && (kycRes.is_second_contract || kycRes.has_approved_contract)) ||
      (kycRes && Array.isArray(kycRes.submissions) && kycRes.submissions.some(s => String(s.status || '').toLowerCase() === 'approved')) ||
      (kycRes && kycRes.latest_submission && String(kycRes.latest_submission.status || '').toLowerCase() === 'approved')
    );
    const isSecondContract =
      hasApprovedKyc ||
      String(activeUser.kyc_status || '').toLowerCase() === 'approved' ||
      Number(activeUser.total_tasks_completed || 0) > 0 ||
      Number(activeUser.commission_balance || 0) > 0;
    let canonicalDepositAmount = 0;
    if (!isSecondContract) {
      try {
        const financeHistory = await API.get('/api/finance/history');
        const deposits = financeHistory && Array.isArray(financeHistory.deposits) ? financeHistory.deposits : [];
        canonicalDepositAmount = deposits.reduce((sum, deposit) => {
          const status = String(deposit.status || '').toLowerCase();
          return sum + (status === 'approved' || status === 'verified' ? Number(deposit.amount || 0) : 0);
        }, 0);
      } catch (_) {}
    }
    const canonicalInvestmentAmount = isSecondContract ? workingBalanceAmount : canonicalDepositAmount;
    if (investmentInput) {
      // Keep the field editable for the user's requested workflow. The server
      // validates first-contract amounts against the approved deposit ledger
      // and subsequent contracts against active Working Balance.
      investmentInput.readOnly = false;
      investmentInput.removeAttribute('readonly');
      investmentInput.min = '0.01';
      investmentInput.step = '0.01';
      investmentInput.inputMode = 'decimal';
      investmentInput.style.backgroundColor = '#ffffff';
      investmentInput.style.cursor = 'text';
      investmentInput.style.fontWeight = '700';
      investmentInput.style.color = workingBalanceAmount < 0 ? '#dc2626' : '#0284c7';
      investmentInput.value = canonicalInvestmentAmount.toFixed(2);
      const amountNote = document.getElementById('investmentAmountNote');
      if (amountNote) amountNote.innerHTML = isSecondContract
        ? '<i class="fa fa-wallet mr-1"></i> Merchant contract for your active Working Balance.'
        : '<i class="fa fa-wallet mr-1"></i> Editable. For approval, the amount must match your exact approved and verified deposit total.';
    }

    const dateInput = document.querySelector('input[name="signature_date"]');
    if (dateInput && !dateInput.value.trim()) {
      const today = new Date();
      dateInput.value = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    }

    // 2. Display KYC status banner if already submitted
    if (kycRes && kycRes.success && kycRes.kyc_status && kycRes.kyc_status !== 'none') {
      let banner = document.createElement('div');
      const isApproved = kycRes.kyc_status === 'approved';
      const isRejected = kycRes.kyc_status === 'rejected';
      const statusColor = isApproved ? '#d4edda' : (isRejected ? '#f8d7da' : '#fff3cd');
      const textColor = isApproved ? '#155724' : (isRejected ? '#721c24' : '#856404');
      const borderColor = isApproved ? '#c3e6cb' : (isRejected ? '#f5c6cb' : '#ffeeba');

      banner.style.cssText = `
        background: ${statusColor};
        color: ${textColor};
        border: 1px solid ${borderColor};
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 24px;
        font-size: 14px;
        font-weight: 600;
      `;

      let statusTitle = 'Under Review ⏳';
      if (isApproved) statusTitle = 'Verified & Approved ✅';
      else if (isRejected) statusTitle = 'Verification Rejected ⚠️';

      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span><i class="fa fa-shield mr-2"></i> KYC Status: <strong style="text-transform: uppercase;">${statusTitle}</strong></span>
          ${isApproved ? '<span class="badge badge-success" style="padding: 4px 10px; font-size: 12px;">Active</span>' : ''}
        </div>
        ${kycRes.kyc_notes ? `<div style="font-size: 13px; font-weight: normal; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.15);"><strong>Admin Reason:</strong> ${kycRes.kyc_notes}</div>` : ''}
        ${isApproved ? '<div style="font-size: 12px; font-weight: normal; margin-top: 6px; opacity: 0.9;">Your contract is verified and active. You can start daily optimization tasks.</div>' : ''}
        ${isRejected ? '<div style="font-size: 12px; font-weight: normal; margin-top: 6px; color: #dc3545;">Please review the admin reason and re-submit your valid ID documents below.</div>' : ''}
      `;
      const formBody = document.querySelector('.form-body') || form;
      if (formBody) formBody.parentNode.insertBefore(banner, formBody);

      // Pre-fill existing submission previews if available
      if (kycRes.latest_submission) {
        const sub = kycRes.latest_submission;
        if (sub.name && nameInput) nameInput.value = sub.name;
        if (investmentInput) {
          if (isSecondContract && Number.isFinite(workingBalanceAmount) && workingBalanceAmount > 0) {
            investmentInput.value = workingBalanceAmount.toFixed(2);
          } else if (!isSecondContract && Number.isFinite(canonicalInvestmentAmount)) {
            investmentInput.value = canonicalInvestmentAmount.toFixed(2);
          } else if (sub.investment_amount) {
            investmentInput.value = Number(sub.investment_amount).toFixed(2);
          }
        }
        if (sub.front_id_image) {
          const frontImg = document.getElementById('frontPreviewImg');
          const frontContainer = document.getElementById('frontPreviewContainer');
          const frontPlaceholder = document.getElementById('frontUploadPlaceholder');
          if (frontImg) frontImg.src = sub.front_id_image;
          if (frontContainer) frontContainer.style.display = 'block';
          if (frontPlaceholder) frontPlaceholder.style.display = 'none';
        }
        if (sub.back_id_image) {
          const backImg = document.getElementById('backPreviewImg');
          const backContainer = document.getElementById('backPreviewContainer');
          const backPlaceholder = document.getElementById('backUploadPlaceholder');
          if (backImg) backImg.src = sub.back_id_image;
          if (backContainer) backContainer.style.display = 'block';
          if (backPlaceholder) backPlaceholder.style.display = 'none';
        }
      }
    }

    // Helper: compress data URL
    async function ensureCompressedDataUrl(dataUrl, maxDim = 1200, quality = 0.72) {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return dataUrl;
      }
      if (dataUrl.length < 180000) return dataUrl; // Already compact
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    // Helper: detect if a canvas contains any user drawing
    function isCanvasSigned(canvas) {
      if (!canvas) return false;
      try {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) return false;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        let drawnPixels = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 20) {
            drawnPixels++;
            if (drawnPixels > 25) return true;
          }
        }
      } catch (_) {}
      return false;
    }

    // Helper: read file as data URL
    function readFileAsDataUrl(file) {
      return new Promise((resolve) => {
        if (!file || !(file instanceof Blob)) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    // Core Submit Handler
    async function handleKycSubmit(e) {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }

      const activeBtn = document.getElementById('invite_submit_form_btn') || (form && form.querySelector('button.form-submit-btn, button[type="submit"], button[type="button"]'));

      const nameEl = document.getElementById('name');
      const investmentEl = document.getElementById('investmentAmount');
      const sigCEl = document.getElementById('signatureCInput');
      const sigAEl = document.getElementById('signatureAInput');
      const canvasC = document.getElementById('signature_c');
      const canvasA = document.getElementById('signature_a');
      const frontImgEl = document.getElementById('frontPreviewImg');
      const backImgEl = document.getElementById('backPreviewImg');
      const frontInput = document.getElementById('frontIdInput');
      const backInput = document.getElementById('backIdInput');

      let nameVal = nameEl ? nameEl.value.trim() : (user.fullname || user.username || '');
      let investmentVal = investmentEl ? investmentEl.value.trim() : '0.00';

      if (!isSecondContract && (!Number.isFinite(workingBalanceAmount) || workingBalanceAmount < 0)) {
        showBridgeToast('Contract Unavailable', 'Your Working Balance is negative. Please clear the deficit before submitting a contract.', 'error');
        return false;
      }

      // 1. Validate Name
      if (!nameVal) {
        if (nameEl) {
          nameEl.focus();
          nameEl.style.border = '2px solid #ef4444';
          nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showBridgeToast('Name Required', 'Please enter your full legal name.', 'error');
        return false;
      }
      if (nameEl) nameEl.style.border = '';

      // The requested investment must be explicit and match the server's cents precision.
      if (!/^\d+(?:\.\d{1,2})?$/.test(investmentVal) || !Number.isFinite(Number(investmentVal)) || Number(investmentVal) <= 0) {
        if (investmentEl) {
          investmentEl.focus();
          investmentEl.style.border = '2px solid #ef4444';
        }
        showBridgeToast('Invalid Investment Amount', 'Enter a positive amount with no more than two decimal places.', 'error');
        return false;
      }
      if (investmentEl) investmentEl.style.border = '';

      // 2. Validate Front ID
      let front_id = '';
      if (frontImgEl && frontImgEl.src && frontImgEl.src.startsWith('data:image/')) {
        front_id = frontImgEl.src;
      } else if (frontInput && frontInput.files && frontInput.files[0]) {
        front_id = await readFileAsDataUrl(frontInput.files[0]);
      }

      if (!front_id) {
        const frontBox = document.getElementById('frontUploadBox');
        if (frontBox) {
          frontBox.style.border = '2px dashed #ef4444';
          frontBox.style.background = '#fef2f2';
          frontBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const frontErr = document.getElementById('frontIdError');
        if (frontErr) frontErr.textContent = 'Please select or upload the front side of your ID card.';
        showBridgeToast('Front ID Required', 'Please upload the front side of your ID card.', 'error');
        return false;
      }
      const frontErr = document.getElementById('frontIdError');
      if (frontErr) frontErr.textContent = '';

      // 3. Validate Back ID
      let back_id = '';
      if (backImgEl && backImgEl.src && backImgEl.src.startsWith('data:image/')) {
        back_id = backImgEl.src;
      } else if (backInput && backInput.files && backInput.files[0]) {
        back_id = await readFileAsDataUrl(backInput.files[0]);
      }

      if (!back_id) {
        const backBox = document.getElementById('backUploadBox');
        if (backBox) {
          backBox.style.border = '2px dashed #ef4444';
          backBox.style.background = '#fef2f2';
          backBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const backErr = document.getElementById('backIdError');
        if (backErr) backErr.textContent = 'Please select or upload the back side of your ID card.';
        showBridgeToast('Back ID Required', 'Please upload the back side of your ID card.', 'error');
        return false;
      }
      const backErr = document.getElementById('backIdError');
      if (backErr) backErr.textContent = '';

      // 4. Validate Signature
      let signature = '';
      if (sigCEl && sigCEl.value && sigCEl.value.length > 200) {
        signature = sigCEl.value.trim();
      } else if (isCanvasSigned(canvasC)) {
        signature = canvasC.toDataURL('image/png');
        if (sigCEl) sigCEl.value = signature;
      } else if (sigAEl && sigAEl.value && sigAEl.value.length > 200) {
        signature = sigAEl.value.trim();
      } else if (isCanvasSigned(canvasA)) {
        signature = canvasA.toDataURL('image/png');
        if (sigAEl) sigAEl.value = signature;
      }

      if (!signature) {
        if (canvasC) {
          canvasC.style.border = '2px solid #ef4444';
          canvasC.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const sigErr = document.getElementById('signature_c_error');
        if (sigErr) sigErr.textContent = 'Please draw your signature before submitting.';
        showBridgeToast('Signature Required', 'Please draw your signature before submitting.', 'error');
        return false;
      }
      const sigErr = document.getElementById('signature_c_error');
      if (sigErr) sigErr.textContent = '';
      if (canvasC) canvasC.style.border = '';

      // Set Loading State
      if (activeBtn) {
        activeBtn.disabled = true;
        activeBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Submitting Contract & KYC...';
      }

      try {
        // High quality client-side compression (< 150KB per image)
        front_id = await ensureCompressedDataUrl(front_id, 1200, 0.72);
        back_id = await ensureCompressedDataUrl(back_id, 1200, 0.72);

        const payload = {
          name: nameVal,
          front_id,
          back_id,
          signature,
          investment_amount: Number(Number(investmentVal).toFixed(2))
        };

        const res = await Promise.race([
          API.post('/api/user/kyc', payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Submission timed out. Please check your network connection.')), 25000))
        ]);

        if (res && res.success) {
          if (window.__currentUser) {
            window.__currentUser.kyc_status = 'pending';
          }
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'success',
              title: 'Contract Submitted!',
              text: res.message || 'Merchant KYC and verification contract submitted successfully! Under review by administration.',
              confirmButtonText: 'Go to Dashboard',
              confirmButtonColor: '#007bff'
            });
            window.location.href = '/dashboard';
          } else {
            showBridgeToast('Contract Submitted!', res.message || 'Verification submitted! Under review.', 'success');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1500);
          }
        } else {
          const errMsg = (res && res.message) || 'Error submitting KYC verification contract.';
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Submission Error', text: errMsg });
          } else {
            showBridgeToast('Submission Error', errMsg, 'error');
          }
          if (activeBtn) {
            activeBtn.disabled = false;
            activeBtn.innerHTML = 'Submit';
          }
        }
      } catch (err) {
        console.error('KYC submit error:', err);
        const errMsg = err.message || 'Network error processing your request.';
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Network Error', text: errMsg });
        } else {
          showBridgeToast('Submission Error', errMsg, 'error');
        }
        if (activeBtn) {
          activeBtn.disabled = false;
          activeBtn.innerHTML = 'Submit';
        }
      }
      return false;
    }

    // Expose globally and bind events
    window.handleKycSubmit = handleKycSubmit;
    if (submitBtn) {
      submitBtn.onclick = handleKycSubmit;
    }
    if (form) {
      form.onsubmit = handleKycSubmit;
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
        top: 45%;
        transform: translateY(-50%);
        background: #00a650;
        color: #ffffff;
        border-radius: 8px 0 0 8px;
        padding: 10px 6px 12px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        box-shadow: -2px 4px 14px rgba(0, 166, 80, 0.35);
        cursor: pointer;
        z-index: 999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        user-select: none;
      }
      #nativeChatFloatingBtn:hover {
        transform: translateY(-50%) translateX(-3px);
        box-shadow: -3px 6px 18px rgba(0, 166, 80, 0.5);
      }
      #nativeChatFloatingBtn:active {
        transform: translateY(-50%) scale(0.97);
      }
      .native-chat-label {
        display: inline-block;
        font-weight: 700;
        font-size: 14.5px;
        line-height: 1;
        color: #ffffff;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        letter-spacing: 0.5px;
        margin: 4px 0 6px 0;
      }
      #nativeChatBadge {
        position: absolute;
        top: -7px;
        left: -7px;
        background: #e02424;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        width: 19px;
        height: 19px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      }
      #nativeChatPromptBox {
        display: none !important;
      }
      .native-chat-prompt-header {
        font-size: 13.5px;
        font-weight: 600;
        color: #1f2937;
        white-space: nowrap;
        align-self: flex-start;
      }
      .native-chat-prompt-chip {
        background: #ffffff;
        border: 1.5px solid #00a650;
        color: #00a650;
        border-radius: 20px;
        padding: 5px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
      }
      .native-chat-prompt-chip:hover, .native-chat-prompt-chip:active {
        background: #00a650;
        color: #ffffff;
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
          top: 45%;
          right: 0;
          padding: 8px 5px 10px 5px;
        }
        #nativeChatPromptBox {
          right: 38px;
          padding: 8px 10px 10px 10px;
          gap: 6px;
        }
        .native-chat-prompt-header {
          font-size: 12px;
        }
        .native-chat-prompt-chip {
          font-size: 11px;
          padding: 4px 10px;
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
        font-size: 14.5px;
      }
      .native-chat-agent-status {
        font-size: 11.5px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .native-chat-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        display: inline-block;
      }
      .native-chat-actions button {
        background: none;
        border: none;
        color: #ffffff;
        font-size: 20px;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
        opacity: 0.8;
      }
      .native-chat-actions button:hover { opacity: 1; }
      .native-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f8fafc;
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

    // Create Floating Trigger Button with Authentic Right-Edge Vertical Tab
    const floatBtn = document.createElement('div');
    floatBtn.id = 'nativeChatFloatingBtn';
    floatBtn.title = 'Live Support Chat';
    floatBtn.innerHTML = `
      <span id="nativeChatBadge">1</span>
      <span class="native-chat-label">Chat</span>
      <img src="/client/assets/img/icons/chat_agent_avatar.png" alt="Support" style="width: 25px; height: 32px; object-fit: contain; margin-top: 3px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));" onerror="this.src='/client/assets/img/icons/customer-service1.svg';">
    `;
    document.body.appendChild(floatBtn);

    // Create Floating Prompt Box next to tab (matches WhatsApp Image 2026-09-07 at 07.10.28.jpeg)
    const promptBox = document.createElement('div');
    promptBox.id = 'nativeChatPromptBox';
    promptBox.innerHTML = `
      <div class="native-chat-prompt-header">👋 Hi! How can we help?</div>
      <button type="button" class="native-chat-prompt-chip" id="nativeChatChipQuestion">I have a question</button>
      <button type="button" class="native-chat-prompt-chip" id="nativeChatChipMore">Tell me more</button>
    `;
    document.body.appendChild(promptBox);

    // Create Chat Window with Reliable Crisp SVG Send Icon
    const chatWin = document.createElement('div');
    chatWin.id = 'nativeChatWindow';
    chatWin.innerHTML = `
      <div class="native-chat-header">
        <div class="native-chat-agent">
          <img src="/client/assets/img/icons/chat_agent_avatar.png" alt="Support Agent" style="width: 38px; height: 38px; border-radius: 50%; background: #ffffff; object-fit: contain; padding: 2px;" onerror="this.src='/client/assets/img/icons/customer-service1.svg'" />
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
      </div>
      <div class="native-chat-footer">
        <label for="nativeChatImageInput" title="Attach an image" style="width: 38px; height: 38px; border: 1px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #00875a; cursor: pointer; flex-shrink: 0;">
          <span style="font-size: 18px;">📎</span>
          <input type="file" id="nativeChatImageInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" />
        </label>
        <span id="nativeChatAttachmentName" style="display:none; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:#64748b;"></span>
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
    const userImageInput = document.getElementById('nativeChatImageInput');
    if (userImageInput) userImageInput.addEventListener('change', () => {
      const name = document.getElementById('nativeChatAttachmentName');
      if (userImageInput.files[0]) {
        userImageInput.parentElement.title = userImageInput.files[0].name;
        if (name) { name.textContent = userImageInput.files[0].name; name.style.display = 'inline-block'; }
      } else if (name) name.style.display = 'none';
    });

    let chatOpen = false;
    let pollInterval = null;
    let chatSessionStartedAt = sessionStorage.getItem('ama_chat_session_started_at') || '';

    async function fetchAndRenderChatMessages() {
      try {
        const query = chatSessionStartedAt ? `?since=${encodeURIComponent(chatSessionStartedAt)}` : '';
        const res = await API.get('/api/user/chat' + query);
        const container = document.getElementById('nativeChatMsgContainer');
        if (!container) return;

        if (!res || !res.success || !Array.isArray(res.messages) || res.messages.length === 0) {
          if (!container.children.length) {
            container.innerHTML = `
              <div style="text-align: center; color: #64748b; font-size: 13px; margin: auto 0; padding: 24px 16px;">
                <div style="font-size: 34px; margin-bottom: 8px;">💬</div>
                <div style="font-weight: 700; color: #0f172a; font-size: 15px; margin-bottom: 4px;">Live Official Support</div>
                <div style="font-size: 13px; line-height: 1.5; color: #475569;">Admin is online. Type your inquiry below for instant direct assistance.</div>
                <div style="font-size: 11px; color: #00875a; background: #e8f5e9; padding: 5px 12px; border-radius: 20px; display: inline-block; font-weight: 600; margin-top: 12px;">
                  ● Support Agent Active
                </div>
              </div>
            `;
          }
          return;
        }

        // We have messages! Remove initial welcome placeholder banner if present
        const welcomeBanner = container.querySelector('div[style*="text-align: center"]');
        if (welcomeBanner) welcomeBanner.remove();

        const attachmentHtml = (message) => {
          const url = String(message.attachment_url || '');
          if (!url || !/^(https?:\/\/|\/|client\/|assets\/)/i.test(url)) return '';
          return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="Attached image" style="display:block; max-width:210px; max-height:180px; object-fit:contain; border-radius:8px; margin-top:6px; background:#fff;" /></a>`;
        };
        let addedNew = false;
        res.messages.forEach(m => {
          const msgId = `chat-msg-${m.id}`;
          if (!document.getElementById(msgId)) {
            addedNew = true;
            const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const bubble = document.createElement('div');
            bubble.id = msgId;

            if (m.sender === 'admin') {
              bubble.className = 'native-chat-bubble native-bubble-admin';
              bubble.innerHTML = `
                <img src="/client/assets/img/icons/customer-service1.svg" style="width: 20px; height: 20px; border-radius: 50%; background: #fff; padding: 1px; flex-shrink: 0;" onerror="this.style.display='none'" />
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px; opacity: 0.9;">Amazon Support</div>
                  <div>${escapeHtml(m.text || m.message_text || '')}</div>${attachmentHtml(m)}
                  <div class="native-bubble-time" style="text-align: left; color: #e2e8f0;">${time}</div>
                </div>
              `;
            } else {
              bubble.className = 'native-chat-bubble native-bubble-user';
              bubble.innerHTML = `
                <div>${escapeHtml(m.text || m.message_text || '')}</div>${attachmentHtml(m)}
                <div class="native-bubble-time" style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                  <span>${time}</span>
                  <span style="font-size: 11px; color: #00875a; font-weight: bold;">✓</span>
                </div>
              `;
            }
            container.appendChild(bubble);
          }
        });

        if (addedNew) {
          container.scrollTop = container.scrollHeight;
        }
      } catch (_) {}
    }

    function toggleChat(open) {
      chatOpen = open !== undefined ? open : !chatOpen;
      window._nativeChatOpen = chatOpen;
      chatWin.style.display = chatOpen ? 'flex' : 'none';
      if (chatOpen) {
        if (!chatSessionStartedAt) {
          chatSessionStartedAt = new Date().toISOString();
          sessionStorage.setItem('ama_chat_session_started_at', chatSessionStartedAt);
        }
        floatBtn.style.display = 'none';
        if (promptBox) promptBox.style.display = 'none';
        const chatBadge = document.getElementById('nativeChatBadge');
        if (chatBadge) chatBadge.style.display = 'none';
        API.post('/api/user/chat/read', {});

        // Fetch & render messages immediately
        fetchAndRenderChatMessages();

        if (!pollInterval) pollInterval = setInterval(fetchAndRenderChatMessages, 3000);
        setTimeout(() => {
          const input = document.getElementById('nativeChatTextInput');
          if (input) input.focus();
        }, 100);
      } else {
        floatBtn.style.display = 'flex';
        if (promptBox) promptBox.style.display = 'none';
        sessionStorage.removeItem('ama_chat_session_started_at');
        chatSessionStartedAt = '';
        const messageContainer = document.getElementById('nativeChatMsgContainer');
        if (messageContainer) messageContainer.innerHTML = '';
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }
    window._toggleNativeChat = toggleChat;

    floatBtn.addEventListener('click', () => toggleChat(true));
    document.getElementById('nativeChatCloseBtn').addEventListener('click', () => toggleChat(false));

    const chipQ = document.getElementById('nativeChatChipQuestion');
    if (chipQ) {
      chipQ.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat(true);
        const input = document.getElementById('nativeChatTextInput');
        if (input) { input.value = 'I have a question'; input.focus(); }
      });
    }

    const chipM = document.getElementById('nativeChatChipMore');
    if (chipM) {
      chipM.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat(true);
        const input = document.getElementById('nativeChatTextInput');
        if (input) { input.value = 'Tell me more'; input.focus(); }
      });
    }

    // Also bind click on any element with id/class for online chat (e.g. on contact.html)
    document.querySelectorAll('.contact-item, #onlineChatTrigger, [onclick*="tawk"]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChat(true);
      });
    });

    async function sendMessage() {
      const input = document.getElementById('nativeChatTextInput');
      const text = input.value.trim();
      const imageInput = document.getElementById('nativeChatImageInput');
      const file = imageInput && imageInput.files ? imageInput.files[0] : null;
      if (!text && !file) return;

      input.value = '';
      if (imageInput) imageInput.value = '';
      const attachmentName = document.getElementById('nativeChatAttachmentName');
      if (attachmentName) attachmentName.style.display = 'none';
      const container = document.getElementById('nativeChatMsgContainer');

      // Clear any initial greeting placeholder
      const welcomeBanner = container.querySelector('div[style*="text-align: center"]');
      if (welcomeBanner) welcomeBanner.remove();

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Instant UI render with formatted time and checkmark
      const tempBubble = document.createElement('div');
      tempBubble.className = 'native-chat-bubble native-bubble-user';
      tempBubble.innerHTML = `
        <div>${escapeHtml(text)}</div>
        ${file ? `<img src="${URL.createObjectURL(file)}" alt="Attached image" style="display:block; max-width:210px; max-height:180px; object-fit:contain; border-radius:8px; margin-top:6px; background:#fff;" />` : ''}
        <div class="native-bubble-time" style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
          <span>${timeStr}</span>
          <span style="font-size: 11px; color: #00875a; font-weight: bold;">✓</span>
        </div>
      `;
      container.appendChild(tempBubble);
      container.scrollTop = container.scrollHeight;

      // Send in background asynchronously without blocking UI
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const formData = new FormData();
        formData.append('text', text);
        formData.append('timezone', timezone);
        formData.append('since', chatSessionStartedAt);
        if (file) formData.append('image', file);
        API.postForm('/api/user/chat', formData).then(res => {
          if (res && res.newMessage && res.newMessage.id) {
            tempBubble.id = `chat-msg-${res.newMessage.id}`;
          }
        }).catch((err) => {
          console.error('Chat image send failed:', err);
          tempBubble.remove();
          if (typeof showBridgeToast === 'function') showBridgeToast('Chat upload failed', 'Please try the image again.', 'error');
        });
      } catch (err) {
        tempBubble.remove();
        if (typeof showBridgeToast === 'function') showBridgeToast('Chat upload failed', 'Please try the image again.', 'error');
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

        const isSupport = (n.title || '').includes('Support');
        return `
          <div class="user-notif-card type-${type} ${isUnread ? 'unread' : ''}" ${isSupport ? 'style="cursor: pointer;" onclick="if(window._toggleNativeChat){window._toggleNativeChat(true);document.getElementById(\'userNotifDrawer\').style.display=\'none\';}"' : ''}>
            <div class="user-notif-icon ${iconClass}">${iconSymbol}</div>
            <div class="user-notif-content">
              <div class="user-notif-card-title">${escapeHtml(n.title || 'Notification')}</div>
              <div class="user-notif-card-msg">${escapeHtml(n.message || '')}</div>
              <div class="user-notif-card-time">${timeStr}${isSupport ? ' · <span style="color:#0284c7;font-weight:600;">Open Chat &rarr;</span>' : ''}</div>
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
