/**
 * Ads Merchants Asia - Master Admin Control Center Engine
 * Pure Vanilla JavaScript - 100% Robust & Self-Contained
 */

(function() {
  'use strict';

  const CATEGORY_MARKER = '__CATEGORY__:';
  const CATEGORY_RANDOM_VALUE = '__random__';
  const TASK_PRODUCT_CATEGORIES = {
    budget: {
      label: 'Budget Accessories',
      products: [
        ['DAIMOND PRODUCT 1', 9.00],
        ['Stanley Quencher Reusable Straw Replacement Pack, BPA-Free Tritan (4-Pack)', 9.99],
        ['Logitech M185 Wireless Compact Mouse with Nano USB Receiver, 2.4GHz, Grey', 12.99],
        ['Anker Powerline III USB-C to USB-C 100W Fast Charging Cable 6ft (2-Pack)', 14.99],
        ['Ringke Onyx Heavy Duty Shockproof Matte Finish Protective Case for Smartphones', 16.99],
        ['SanDisk 128GB Extreme PRO MicroSDXC UHS-I Memory Card with Adapter up to 200MB/s', 18.99],
        ['Anker Nano 30W USB-C GaN Fast Charger, Compact Foldable Plug for Phones & Tablets', 22.99],
        ['Contigo West Loop Stainless Steel Vacuum-Insulated Autoseal Travel Mug 20oz, Matte Black', 23.99],
        ['Echo Pop Compact Smart Speaker with Full Sound and Alexa Built-in, Charcoal', 24.99]
      ]
    },
    fashion_travel: {
      label: 'Fashion & Travel',
      products: [
        ['Garment Bags for Travel, Convertible Carry on Garment Bag with Shoe Compartment, SOLOSAIC Garment Duffle Bags for Travel for Men Women, 2 in 1 Hanging Dress Suitcase Suit Bag with Toiletry Bag, Black', 11.00],
        ['Levi\'s Men\'s The Trucker Denim Jacket, Standard Fit, Dark Stonewash', 79.99]
      ]
    },
    beauty_health: {
      label: 'Beauty & Health',
      products: [
        ['CeraVe Daily Moisturizing Lotion with Hyaluronic Acid for Normal to Dry Skin 16oz', 15.99],
        ['L\'Oreal Paris Revitalift 1.5% Pure Hyaluronic Acid Face Serum for Anti-Aging 1 fl oz', 21.99],
        ['Oral-B Pro 1000 CrossAction Electric Rechargeable Toothbrush with Pressure Sensor', 49.99]
      ]
    },
    mobile_audio: {
      label: 'Mobile & Audio',
      products: [
        ['JBL GO 4 Ultra-Portable Waterproof and Dustproof Bluetooth Speaker, Black', 39.95],
        ['Amazon Fire TV Stick 4K Streaming Media Player with Alexa Voice Remote (Latest Gen)', 49.99],
        ['Soundcore by Anker Life P3 Active Noise Cancelling True Wireless Earbuds, Black', 69.99],
        ['Apple AirPods Pro (2nd Generation) Wireless Earbuds with MagSafe Case (USB-C)', 249.00],
        ['Sony WH-1000XM5 Wireless Noise-Canceling Over-Ear Headphones, Black', 398.00],
        ['Bose Smart Ultra Soundbar with Dolby Atmos and Voice Control, Black Wireless', 899.00]
      ]
    },
    home_kitchen: {
      label: 'Home & Kitchen',
      products: [
        ['Crock-Pot 7-Quart Oval Manual Slow Cooker, Brushed Stainless Steel Exterior', 49.99],
        ['Shark NV360 Navigator Lift-Away Deluxe Upright Vacuum with Anti-Allergen Seal, Blue', 199.99],
        ['Ninja Foodi 10-in-1 DualZone 2-Basket Air Fryer XL, 10-Qt Capacity', 249.99],
        ['KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer, Stainless Steel Bowl, Empire Red', 449.95],
        ['Dyson V15 Detect Cordless Vacuum Cleaner with Laser Dust Detection, Yellow/Iron', 749.99],
        ['Breville Barista Touch Espresso Machine, Brushed Stainless Steel, Touch Screen', 999.95]
      ]
    },
    tools: {
      label: 'Tools & Hardware',
      products: [
        ['BLACK+DECKER 20V MAX Cordless Drill and Driver Kit with 30-Piece Accessory Set', 49.99],
        ['DeWalt 20V MAX Cordless Drill and Impact Driver Combo Kit, 2-Tool with 2.0Ah Batteries', 229.00]
      ]
    },
    outdoor: {
      label: 'Outdoor & Camping',
      products: [
        ['Coleman WeatherMaster 10-Person Outdoor Camping Tent with Screen Room', 329.99],
        ['Anker SOLIX C1000 Portable Power Station, 1800W Solar Generator, 1056Wh LiFePO4', 649.00],
        ['EcoFlow Glacier Portable Refrigerator 40L with Integrated Ice Maker Dual Zone', 849.00],
        ['Segway Ninebot KickScooter MAX G2, 22 mph Max Speed, 43 Miles Long Range', 899.99],
        ['Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)', 3674.00]
      ]
    },
    gaming_entertainment: {
      label: 'Gaming & Entertainment',
      products: [
        ['Sony PlayStation 5 Slim Console (PS5 Disc Edition) 1TB SSD with DualSense Controller', 499.99],
        ['LG 34-Inch UltraWide Curved Gaming Monitor 144Hz 1ms Nano IPS QHD, G-SYNC', 799.99]
      ]
    },
    premium_electronics: {
      label: 'Premium Electronics',
      products: [
        ['DJI Mini 4 Pro Fly More Combo Drone with DJI RC 2, 4K HDR Video', 1099.00],
        ['Apple iPhone 16 Pro Max 256GB - Desert Titanium, 5G Unlocked', 1199.00],
        ['Apple MacBook Air 15-inch Laptop with M3 chip, 16GB Memory, 512GB SSD, Midnight', 1499.00],
        ['Samsung 65-Inch Class OLED 4K S90D Series HDR+ Smart TV with Dolby Atmos', 1597.99],
        ['Canon EOS R6 Mark II Mirrorless Camera with 24-105mm STM Lens, 24.2 MP, 4K60p', 2399.00]
      ]
    },
    high_ticket: {
      label: 'High Ticket Deficit',
      products: [
        ['Anker SOLIX C1000 Portable Power Station, 1800W Solar Generator, 1056Wh LiFePO4', 649.00],
        ['Dyson V15 Detect Cordless Vacuum Cleaner with Laser Dust Detection, Yellow/Iron', 749.99],
        ['Bose Smart Ultra Soundbar with Dolby Atmos and Voice Control, Black Wireless', 899.00],
        ['Breville Barista Touch Espresso Machine, Brushed Stainless Steel, Touch Screen', 999.95],
        ['DJI Mini 4 Pro Fly More Combo Drone with DJI RC 2, 4K HDR Video', 1099.00],
        ['Apple iPhone 16 Pro Max 256GB - Desert Titanium, 5G Unlocked', 1199.00],
        ['Samsung 65-Inch Class OLED 4K S90D Series HDR+ Smart TV with Dolby Atmos', 1597.99],
        ['Bulk 15000 PCS Foam Glow Sticks with 3 Modes Colorful Flashing, Glow in Dark Party Supplies', 1856.00],
        ['Canon EOS R6 Mark II Mirrorless Camera with 24-105mm STM Lens, 24.2 MP, 4K60p', 2399.00],
        ['Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)', 3674.00]
      ]
    }
  };

  // UI Dialog & Modal Controller
  window.AdminUI = {
    openModal: function(modalId) {
      const el = document.getElementById(modalId);
      if (el) el.classList.add('active');
    },
    closeModal: function(modalId) {
      const el = document.getElementById(modalId);
      if (el) el.classList.remove('active');
    },
    toast: function(title, message, type) {
      type = type || 'info';
      const container = document.getElementById('adminToastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `admin-toast admin-toast-${type}`;

      const iconMap = {
        success: 'fa-check-circle text-success',
        error: 'fa-exclamation-circle text-danger',
        warning: 'fa-exclamation-triangle text-warning',
        info: 'fa-info-circle text-info'
      };

      toast.innerHTML = `
        <i class="fa ${iconMap[type] || 'fa-info-circle'}" style="font-size: 20px;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${escapeHtml(title)}</div>
          <div style="color: #475569; font-size: 12.5px;">${escapeHtml(message)}</div>
        </div>
        <button style="background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer;" onclick="this.parentElement.remove()">&times;</button>
      `;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    },
    confirm: function(options) {
      return new Promise((resolve) => {
        const backdrop = document.getElementById('adminActionDialogBackdrop');
        const iconContainer = document.getElementById('dialogIconContainer');
        const icon = document.getElementById('dialogIcon');
        const title = document.getElementById('dialogTitle');
        const msg = document.getElementById('dialogMessage');
        const inputWrap = document.getElementById('dialogInputWrapper');
        const cancelBtn = document.getElementById('dialogCancelBtn');
        const confirmBtn = document.getElementById('dialogConfirmBtn');

        title.textContent = options.title || 'Confirm Action';
        msg.textContent = options.message || 'Are you sure you want to proceed?';
        inputWrap.style.display = 'none';

        const type = options.type || 'question';
        if (type === 'danger' || type === 'error') {
          iconContainer.style.background = '#fee2e2';
          iconContainer.style.color = '#dc2626';
          icon.className = 'fa fa-exclamation-triangle';
          confirmBtn.className = 'btn-action btn-reject';
        } else if (type === 'success') {
          iconContainer.style.background = '#dcfce7';
          iconContainer.style.color = '#16a34a';
          icon.className = 'fa fa-check-circle';
          confirmBtn.className = 'btn-action btn-approve';
        } else {
          iconContainer.style.background = '#e0f2fe';
          iconContainer.style.color = '#0284c7';
          icon.className = 'fa fa-question-circle';
          confirmBtn.className = 'btn-action btn-approve';
        }

        confirmBtn.textContent = options.confirmText || 'Confirm';
        cancelBtn.textContent = options.cancelText || 'Cancel';

        backdrop.classList.add('active');

        function cleanup() {
          backdrop.classList.remove('active');
          confirmBtn.onclick = null;
          cancelBtn.onclick = null;
        }

        confirmBtn.onclick = () => {
          cleanup();
          resolve(true);
        };

        cancelBtn.onclick = () => {
          cleanup();
          resolve(false);
        };
      });
    },
    prompt: function(options) {
      return new Promise((resolve) => {
        const backdrop = document.getElementById('adminActionDialogBackdrop');
        const iconContainer = document.getElementById('dialogIconContainer');
        const icon = document.getElementById('dialogIcon');
        const title = document.getElementById('dialogTitle');
        const msg = document.getElementById('dialogMessage');
        const inputWrap = document.getElementById('dialogInputWrapper');
        const inputLabel = document.getElementById('dialogInputLabel');
        const inputField = document.getElementById('dialogInputField');
        const cancelBtn = document.getElementById('dialogCancelBtn');
        const confirmBtn = document.getElementById('dialogConfirmBtn');

        title.textContent = options.title || 'Input Required';
        msg.textContent = options.message || 'Please provide details:';
        inputLabel.textContent = options.inputLabel || 'Reason / Notes:';
        inputField.placeholder = options.placeholder || 'Type here...';
        inputField.value = options.defaultValue || '';
        inputWrap.style.display = 'block';

        iconContainer.style.background = '#fef3c7';
        iconContainer.style.color = '#d97706';
        icon.className = 'fa fa-edit';
        confirmBtn.className = options.type === 'danger' ? 'btn-action btn-reject' : 'btn-action btn-approve';
        confirmBtn.textContent = options.confirmText || 'Submit';
        cancelBtn.textContent = options.cancelText || 'Cancel';

        backdrop.classList.add('active');
        setTimeout(() => inputField.focus(), 100);

        function cleanup() {
          backdrop.classList.remove('active');
          confirmBtn.onclick = null;
          cancelBtn.onclick = null;
        }

        confirmBtn.onclick = () => {
          const val = inputField.value.trim();
          if (!val && options.required !== false) {
            AdminUI.toast('Required Field', 'Please provide a valid input value.', 'warning');
            inputField.focus();
            return;
          }
          cleanup();
          resolve(val);
        };

        cancelBtn.onclick = () => {
          cleanup();
          resolve(null);
        };
      });
    }
  };

  // Admin API Client
  const AdminAPI = {
    token: localStorage.getItem('ama_admin_token') || '',
    setToken(token) {
      this.token = token;
      if (token) localStorage.setItem('ama_admin_token', token);
      else localStorage.removeItem('ama_admin_token');
    },
    async request(url, options = {}) {
      options.headers = options.headers || {};
      options.headers['Content-Type'] = 'application/json';
      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }
      options.credentials = 'same-origin';
      try {
        const res = await fetch(url, options);
        if (res.status === 401 || res.status === 403) {
          const isLoginPage = url.includes('/login');
          if (!isLoginPage) {
            document.getElementById('adminLoginModal').style.display = 'flex';
          }
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        const text = await res.text();
        return { success: false, message: `Server error (${res.status}): ${text.slice(0, 150)}` };
      } catch (err) {
        console.error('API Error:', err);
        return { success: false, message: err.message || 'Network connection failed' };
      }
    },
    get(url) { return this.request(url, { method: 'GET' }); },
    post(url, data) { return this.request(url, { method: 'POST', body: JSON.stringify(data) }); },
    put(url, data) { return this.request(url, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(url) { return this.request(url, { method: 'DELETE' }); }
  };

  // Safe global toast helper ensuring legacy or future calls never throw ReferenceError
  const showToast = function(title, message, type = 'info') {
    if (window.AdminUI && typeof window.AdminUI.toast === 'function') {
      window.AdminUI.toast(title, message, type);
    } else {
      console.log(`[Admin Toast ${type}] ${title}: ${message}`);
    }
  };
  window.showToast = showToast;

  // State Management
  const state = {
    metrics: {},
    users: [],
    staff: [],
    kycs: [],
    deposits: [],
    withdrawals: [],
    settings: {},
    chatConversations: [],
    activeChatUserId: null
  };

  // Real-time Automated Polling for Badges & Incoming Chats (Every 4s)
  let adminPollingTimer = null;
  function startAdminPolling() {
    if (adminPollingTimer) clearInterval(adminPollingTimer);
    adminPollingTimer = setInterval(async () => {
      const modal = document.getElementById('adminLoginModal');
      if (modal && modal.style.display === 'none') {
        await loadMetrics();
        await loadChatConversations();
        if (state.activeChatUserId) {
          await loadActiveUserMessages();
        }
      }
    }, 4000);
  }

  // 1. Initial Authentication Check & Role Permissions
  function applyRolePermissions(role, adminData) {
    const r = (role || 'super_admin').toLowerCase();
    state.currentRole = r;
    if (adminData) state.currentAdmin = adminData;

    const allTabs = {
      tabUsers: document.getElementById('tabBtnUsers'),
      tabOrders: document.getElementById('tabBtnOrders'),
      tabProducts: document.getElementById('tabBtnProducts'),
      tabAudit: document.getElementById('tabBtnAudit'),
      tabSessions: document.getElementById('tabBtnSessions'),
      tabStaff: document.getElementById('tabBtnStaff'),
      tabChat: document.getElementById('tabBtnChat'),
      tabKyc: document.getElementById('tabBtnKyc'),
      tabDeposits: document.getElementById('tabBtnDeposits'),
      tabWithdrawals: document.getElementById('tabBtnWithdrawals'),
      tabSettings: document.getElementById('tabBtnSettings')
    };

    // Full administrative capability across all modules
    let allowedTabIds = ['tabUsers', 'tabSessions', 'tabOrders', 'tabProducts', 'tabAudit', 'tabStaff', 'tabChat', 'tabKyc', 'tabDeposits', 'tabWithdrawals', 'tabSettings'];
    let roleTitle = 'Master Authority';

    if (r === 'super_admin') {
      roleTitle = 'Master Authority';
    } else if (r === 'sub_admin') {
      roleTitle = 'Sub-Admin Manager';
    } else if (r === 'support' || r === 'support_operator') {
      roleTitle = 'Support & Operations Officer';
    } else if (r === 'finance' || r === 'finance_officer') {
      roleTitle = 'Finance & Treasury Officer';
    } else {
      roleTitle = 'Staff Member';
    }

    // Update Header Badge and Greeting
    const roleBadge = document.getElementById('adminRoleBadge');
    if (roleBadge) roleBadge.textContent = roleTitle;

    const greeting = document.getElementById('adminUserGreeting');
    if (greeting && adminData) {
      greeting.textContent = `${adminData.fullname || adminData.email || 'Admin'}`;
    }

    // Show only permitted tabs, hide others completely
    Object.keys(allTabs).forEach(tabKey => {
      const btn = allTabs[tabKey];
      const content = document.getElementById(tabKey);
      if (btn) {
        btn.style.display = allowedTabIds.includes(tabKey) ? 'inline-flex' : 'none';
      }
      if (content && !allowedTabIds.includes(tabKey)) {
        content.style.display = 'none';
      }
    });

    // Make sure the active tab is one of the allowed tabs
    const currentActiveBtn = document.querySelector('.admin-tab-btn.active');
    const currentActiveTabId = currentActiveBtn ? currentActiveBtn.getAttribute('data-tab') : null;

    if (!currentActiveTabId || !allowedTabIds.includes(currentActiveTabId)) {
      const firstAllowedId = allowedTabIds[0];
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

      const targetBtn = allTabs[firstAllowedId];
      const targetContent = document.getElementById(firstAllowedId);
      if (targetBtn) targetBtn.classList.add('active');
      if (targetContent) targetContent.style.display = 'block';
    }
  }

  async function checkAuthAndLoad() {
    const res = await AdminAPI.get('/api/admin/metrics');
    if (res && res.success) {
      document.getElementById('adminLoginModal').style.display = 'none';
      applyRolePermissions(res.admin ? res.admin.role : 'super_admin', res.admin);
      loadAllData();
      startAdminPolling();
    } else {
      document.getElementById('adminLoginModal').style.display = 'flex';
    }
  }

  window.loadAllData = async function() {
    await loadMetrics();
    const r = (state.currentRole || 'super_admin').toLowerCase();

    if (r === 'super_admin' || r === 'sub_admin' || r === 'finance' || r === 'finance_officer') {
      loadDeposits();
      loadWithdrawals();
    }
    if (r === 'super_admin' || r === 'sub_admin' || r === 'support' || r === 'support_operator') {
      loadKycs();
      loadChatConversations();
    }
    if (r === 'super_admin') {
      loadStaff();
      loadSettings();
    }
    loadUsers();
    loadSessions();
  };

  // 2. Metrics & Dashboard Stats
  async function loadMetrics() {
    const res = await AdminAPI.get('/api/admin/metrics');
    if (res && res.success && res.metrics) {
      state.metrics = res.metrics;
      if (document.getElementById('statUsers')) document.getElementById('statUsers').textContent = res.metrics.totalUsers;
      if (document.getElementById('statUserBalance')) document.getElementById('statUserBalance').textContent = `$${res.metrics.totalUserBalance}`;
      if (document.getElementById('statPendingDeposits')) document.getElementById('statPendingDeposits').textContent = res.metrics.pendingDeposits;
      if (document.getElementById('statPendingWithdrawals')) document.getElementById('statPendingWithdrawals').textContent = res.metrics.pendingWithdrawals;
      if (document.getElementById('statPendingKycs')) document.getElementById('statPendingKycs').textContent = res.metrics.pendingKycs;

      // Update Navigation Tab Badges
      const depBadge = document.getElementById('adminDepositUnreadBadge');
      if (depBadge) {
        if (res.metrics.pendingDeposits > 0) {
          depBadge.textContent = res.metrics.pendingDeposits;
          depBadge.style.display = 'inline-block';
        } else {
          depBadge.style.display = 'none';
        }
      }

      const withBadge = document.getElementById('adminWithdrawUnreadBadge');
      if (withBadge) {
        if (res.metrics.pendingWithdrawals > 0) {
          withBadge.textContent = res.metrics.pendingWithdrawals;
          withBadge.style.display = 'inline-block';
        } else {
          withBadge.style.display = 'none';
        }
      }

      const kycBadge = document.getElementById('adminKycUnreadBadge');
      if (kycBadge) {
        if (res.metrics.pendingKycs > 0) {
          kycBadge.textContent = res.metrics.pendingKycs;
          kycBadge.style.display = 'inline-block';
        } else {
          kycBadge.style.display = 'none';
        }
      }

      const chatBadge = document.getElementById('adminChatUnreadBadge');
      if (chatBadge) {
        const unreadChats = res.metrics.unreadChats || 0;
        if (unreadChats > 0) {
          chatBadge.textContent = unreadChats;
          chatBadge.style.display = 'inline-block';
        } else {
          chatBadge.style.display = 'none';
        }
      }

      const totalBadge = document.getElementById('adminTotalAlertsBadge');
      if (totalBadge) {
        const totalAlerts = res.metrics.totalAlerts || ((res.metrics.pendingDeposits || 0) + (res.metrics.pendingWithdrawals || 0) + (res.metrics.pendingKycs || 0) + (res.metrics.unreadChats || 0));
        if (totalAlerts > 0) {
          totalBadge.textContent = totalAlerts;
          totalBadge.style.display = 'inline-block';
        } else {
          totalBadge.style.display = 'none';
        }
      }
    }
  }

  // 3. Users Management
  window.loadUsers = async function() {
    const res = await AdminAPI.get('/api/admin/users');
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (res && res.success && res.users) {
      // Sort online users to the top, then sort by latest creation date
      state.users = res.users.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        const dateDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
        if (dateDiff !== 0) return dateDiff;
        return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
      });

      // Update online badge if available
      const onlineCount = state.users.filter(u => u.is_online).length;
      const onlineBadge = document.getElementById('adminOnlineBadge');
      if (onlineBadge) {
        onlineBadge.textContent = onlineCount;
        onlineBadge.style.display = onlineCount > 0 ? 'inline-block' : 'none';
      }

      if (state.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">No registered users found.</td></tr>`;
        return;
      }
      const role = (state.currentRole || 'super_admin').toLowerCase();

      tbody.innerHTML = state.users.map(u => {
        const actionButtonsHtml = `
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn-action btn-edit" onclick="openEditUserModal('${u.id}')" title="Edit Balance & User Details">
              <i class="fa fa-pen"></i> Edit
            </button>
            <button class="btn-action" style="background: #2563eb; color: white;" onclick="openCreateOrderModal('${u.id}')" title="Create Merchant Order & Push Task">
              <i class="fa fa-cart-plus"></i> Push Order
            </button>
            <button class="btn-action" style="background: #f59e0b; color: white;" onclick="openAssignTaskModal('${u.id}')" title="Assign Smart Task & Deficit Order">
              <i class="fa fa-tasks"></i> Assign Task
            </button>
            <button class="btn-action btn-reset" onclick="openPasswordResetModal('${u.id}')" title="Reset Password">
              <i class="fa fa-key"></i> Reset Pass
            </button>
            ${u.is_online ? `
              <button class="btn-action" style="background: #64748b; color: white;" onclick="kickUserSession('${u.id}', '${escapeHtml(u.fullname || u.username)}')" title="End Active Session">
                <i class="fa fa-power-off"></i> End Session
              </button>
            ` : ''}
            <button class="btn-action btn-reject" onclick="deleteUser('${u.id}', '${escapeHtml(u.fullname || u.username)}')" title="Permanently Delete User" style="background: #ef4444; color: white;">
              <i class="fa fa-trash"></i> Delete
            </button>
          </div>
        `;

        const bal = parseFloat(u.balance || 0);

        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${u.is_online 
                  ? `<span style="display:inline-block; width:10px; height:10px; min-width:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;" title="🟢 Online Now (Active Session)"></span>` 
                  : `<span style="display:inline-block; width:8px; height:8px; min-width:8px; border-radius:50%; background:#cbd5e1;" title="Offline"></span>`
                }
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(u.fullname || u.username || 'User')}</div>
              </div>
              <div style="font-size: 12px; color: #0284c7; font-weight: 600; margin-left: ${u.is_online ? '16px' : '14px'};">@${escapeHtml(u.username || 'user')}</div>
              <small style="color: #94a3b8; font-size: 11px; margin-left: ${u.is_online ? '16px' : '14px'};">ID: ${u.id}</small>
            </td>
            <td>
              <div style="font-weight: 600; color: #334155;">${escapeHtml(u.email)}</div>
              ${u.phone ? `<small style="color: #64748b;"><i class="fa fa-phone mr-1"></i>${escapeHtml(u.phone)}</small>` : ''}
            </td>
            <td><span class="badge-status badge-primary">${u.vip_level} VIP</span></td>
            <td style="font-weight: 800; color: ${bal < 0 ? '#ef4444' : '#10b981'}; font-size: 14.5px;">
              ${bal < 0 ? '-' : ''}$${Math.abs(bal).toFixed(2)}
              <small style="display: block; color: #0284c7; font-size: 11px; font-weight: 600; margin-top: 2px;">
                Tot w/ Comm: $${parseFloat(u.commission_balance || 0).toFixed(2)}
              </small>
            </td>
            <td style="font-weight: 700; color: #64748b;">$${parseFloat(u.frozen_balance || 0).toFixed(2)}</td>
            <td style="font-weight: 700; color: #0284c7;">+$${parseFloat(u.today_profit || 0).toFixed(2)}</td>
            <td>
              <span class="badge-status badge-${(u.kyc_status || 'none').toLowerCase()}">
                ${(u.kyc_status || 'none').toUpperCase()}
              </span>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="badge-status badge-${u.status === 'active' ? 'active' : 'banned'}">${(u.status || 'active').toUpperCase()}</span>
                ${u.is_online 
                  ? `<span class="badge-status" style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; border: 1px solid #86efac; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block;"></span> Active Session</span>` 
                  : `<span class="badge-status" style="background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 600;">Offline</span>`
                }
              </div>
            </td>
            <td>
              ${actionButtonsHtml}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #dc2626;">Failed to load user accounts.</td></tr>`;
    }
  };

  window.openEditUserModal = function(userId) {
    const user = state.users.find(u => String(u.id) === String(userId));
    if (!user) { console.warn('[EditUserModal] User not found in state for id:', userId); return; }
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = `${user.fullname} (@${user.username}) - ${user.email}`;
    document.getElementById('editUserVip').value = user.vip_level;
    document.getElementById('editUserBalance').value = user.balance;
    document.getElementById('editUserFrozenBalance').value = user.frozen_balance || 0;
    const profitEl = document.getElementById('editUserTodayProfit');
    if (profitEl) profitEl.textContent = `$${parseFloat(user.today_profit || 0).toFixed(2)}`;
    document.getElementById('editUserAddBalance').value = '';
    document.getElementById('editUserDeductBalance').value = '';
    document.getElementById('editUserStatus').value = user.status;
    const kycStatusEl = document.getElementById('editUserKycStatus');
    if (kycStatusEl) kycStatusEl.value = (user.kyc_status || 'none').toLowerCase();
    document.getElementById('editUserResetTasks').checked = false;
    // Populate custom daily limit
    const dailyLimitEl = document.getElementById('editUserDailyLimit');
    const currentLimitBadge = document.getElementById('editCurrentDailyLimit');
    if (dailyLimitEl) dailyLimitEl.value = user.custom_daily_limit || '';
    if (currentLimitBadge) {
      if (user.custom_daily_limit) {
        currentLimitBadge.textContent = `Active: ${user.custom_daily_limit} tasks/day`;
        currentLimitBadge.style.display = 'inline-block';
      } else {
        currentLimitBadge.style.display = 'none';
      }
    }
    AdminUI.openModal('editUserModal');
  };

  window.clearDailyLimit = function() {
    const el = document.getElementById('editUserDailyLimit');
    if (el) el.value = '';
    const badge = document.getElementById('editCurrentDailyLimit');
    if (badge) badge.style.display = 'none';
  };

  window.openPasswordResetModal = function(userId) {
    const user = state.users.find(u => String(u.id) === String(userId));
    if (!user) return;
    document.getElementById('resetPassUserId').value = user.id;
    document.getElementById('resetPassUserName').textContent = `${user.fullname} (@${user.username}) [${user.email}]`;
    document.getElementById('newDirectPassword').value = '';
    AdminUI.openModal('resetPasswordModal');
  };

  window.openAssignTaskModal = function(userId) {
    const user = state.users.find(u => String(u.id) === String(userId));
    if (!user) return;
    document.getElementById('assignTaskUserId').value = user.id;
    const bal = parseFloat(user.balance || 0);
    document.getElementById('assignTaskUserName').value = `${user.fullname || user.username} (@${user.username}) - Working Balance: $${bal.toFixed(2)}`;
    document.getElementById('assignTaskOrderNum').value = user.custom_order_num || (user.today_tasks_completed + 1 || 5);
    document.getElementById('assignTaskDeficitAmount').value = (user.custom_deficit_amount !== null && user.custom_deficit_amount !== undefined) ? user.custom_deficit_amount : '25.00';
    const customProductName = user.custom_product_name || '';
    const savedCategory = customProductName.startsWith(CATEGORY_MARKER) ? customProductName.slice(CATEGORY_MARKER.length) : '';
    document.getElementById('assignTaskProductName').value = savedCategory ? '' : customProductName;
    document.getElementById('assignTaskProductPrice').value = user.custom_product_price || '';
    const categoryEl = document.getElementById('assignTaskProductCategory');
    const categoryProductEl = document.getElementById('assignTaskCategoryProduct');
    if (categoryEl) categoryEl.value = TASK_PRODUCT_CATEGORIES[savedCategory] ? savedCategory : '';
    if (categoryEl && categoryEl.value) {
      window.populateAssignTaskCategoryProducts();
    } else if (categoryProductEl) {
      categoryProductEl.innerHTML = '<option value="">Select category first</option>';
      categoryProductEl.disabled = true;
    }
    const pushImm = document.getElementById('assignTaskPushImmediate');
    if (pushImm) pushImm.checked = false;

    // Initialize Sequence Plan Tab
    const seqUserName = document.getElementById('seqPlanUserName');
    if (seqUserName) {
      seqUserName.value = `${user.fullname || user.username} (@${user.username}) - Working Balance: $${bal.toFixed(2)}`;
    }
    const seqBalInput = document.getElementById('seqPlanBalanceInput');
    if (seqBalInput) {
      seqBalInput.value = bal > 0 ? bal.toFixed(2) : '100.00';
    }

    if (user.task_sequence_plan && Array.isArray(user.task_sequence_plan) && user.task_sequence_plan.length > 0) {
      const tot = user.task_sequence_plan.length;
      const totEl = document.getElementById('seqPlanTotalOrders');
      if (totEl) totEl.value = String(tot);
      window.renderSequenceStepRows(user.task_sequence_plan);
    } else {
      window.applyVoiceNotePreset100();
    }
    window.switchAssignTaskTab('single');

    AdminUI.openModal('assignTaskModal');
    // Initialize the 10-category tab preset UI
    setTimeout(() => window.initCategoryPresetTabs(savedCategory || 'outdoor'), 50);
  };

  window.selectPresetTaskProduct = function(name, price, deficit) {
    document.getElementById('assignTaskProductName').value = name;
    document.getElementById('assignTaskProductPrice').value = price.toFixed(2);
    if (deficit !== undefined) {
      document.getElementById('assignTaskDeficitAmount').value = deficit.toFixed(2);
    }
    // Visual feedback - flash the fields
    ['assignTaskProductName', 'assignTaskProductPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.background = '#fef3c7'; setTimeout(() => el.style.background = '', 600); }
    });
  };

  // Category preset tab definitions
  const PRESET_CATEGORIES = [
    { key: 'outdoor',             emoji: '📦', label: 'Outdoor' },
    { key: 'high_ticket',         emoji: '💎', label: 'High Ticket' },
    { key: 'premium_electronics', emoji: '📱', label: 'Premium Tech' },
    { key: 'mobile_audio',        emoji: '🎧', label: 'Audio' },
    { key: 'home_kitchen',        emoji: '🏠', label: 'Home' },
    { key: 'gaming_entertainment',emoji: '🎮', label: 'Gaming' },
    { key: 'fashion_travel',      emoji: '👜', label: 'Fashion' },
    { key: 'beauty_health',       emoji: '💄', label: 'Beauty' },
    { key: 'tools',               emoji: '🔧', label: 'Tools' },
    { key: 'budget',              emoji: '🛒', label: 'Budget' }
  ];

  window.initCategoryPresetTabs = function(defaultCat) {
    const tabsRow = document.getElementById('categoryTabsRow');
    if (!tabsRow) return;
    tabsRow.innerHTML = '';
    PRESET_CATEGORIES.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.cat = cat.key;
      const isFirst = i === 0;
      btn.className = 'cat-tab-btn';
      btn.textContent = `${cat.emoji} ${cat.label}`;
      Object.assign(btn.style, {
        padding: '4px 10px', fontSize: '11px', borderRadius: '20px',
        border: '1.5px solid ' + (isFirst ? '#f59e0b' : '#cbd5e1'),
        background: isFirst ? '#f59e0b' : '#fff',
        color: isFirst ? '#fff' : '#475569',
        fontWeight: isFirst ? '700' : '600', cursor: 'pointer', transition: 'all .15s'
      });
      btn.onclick = () => window.switchPresetCategory(btn, cat.key);
      tabsRow.appendChild(btn);
    });
    window.switchPresetCategory(tabsRow.querySelector('[data-cat="' + (defaultCat || 'outdoor') + '"]') || tabsRow.firstChild, defaultCat || 'outdoor');
  };

  window.switchPresetCategory = function(btn, catKey) {
    // Update tab styles
    document.querySelectorAll('.cat-tab-btn').forEach(b => {
      Object.assign(b.style, { background: '#fff', color: '#475569', border: '1.5px solid #cbd5e1', fontWeight: '600' });
    });
    if (btn) Object.assign(btn.style, { background: '#f59e0b', color: '#fff', border: '1.5px solid #f59e0b', fontWeight: '700' });

    // Render products for this category
    const row = document.getElementById('categoryProductsRow');
    if (!row) return;
    const cat = TASK_PRODUCT_CATEGORIES[catKey];
    if (!cat || !cat.products || cat.products.length === 0) {
      row.innerHTML = '<span style="color:#94a3b8;font-size:12px;">No products in this category.</span>';
      return;
    }
    row.innerHTML = cat.products.map(([name, price]) => {
      const shortName = name.length > 40 ? name.slice(0, 40) + '…' : name;
      const encoded = encodeURIComponent(JSON.stringify([name, price]));
      return `<button type="button" onclick="window._applyPreset(${JSON.stringify([name, price])})"
        style="padding:5px 10px;font-size:11.5px;border-radius:8px;border:1px solid #f59e0b;background:#fff;
        color:#b45309;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;"
        onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fff'"
        title="${name.replace(/"/g,'&quot;')}">
        $${price.toFixed(2)} &mdash; ${shortName}
      </button>`;
    }).join('');

    // Also sync the form category dropdown
    const catEl = document.getElementById('assignTaskProductCategory');
    if (catEl) catEl.value = catKey;
  };

  window._applyPreset = function([name, price]) {
    window.selectPresetTaskProduct(name, price, price);
  };

  window.populateAssignTaskCategoryProducts = function() {
    const categoryEl = document.getElementById('assignTaskProductCategory');
    const productEl = document.getElementById('assignTaskCategoryProduct');
    const productNameEl = document.getElementById('assignTaskProductName');
    const productPriceEl = document.getElementById('assignTaskProductPrice');
    if (!categoryEl || !productEl) return;

    const categoryKey = categoryEl.value;
    const category = TASK_PRODUCT_CATEGORIES[categoryKey];
    productEl.innerHTML = '';

    if (!category) {
      productEl.disabled = true;
      productEl.innerHTML = '<option value="">Select category first</option>';
      return;
    }

    productEl.disabled = false;
    productEl.appendChild(new Option(`Random from ${category.label}`, CATEGORY_RANDOM_VALUE));
    category.products.forEach(([name, price]) => {
      productEl.appendChild(new Option(`${name.slice(0, 72)}${name.length > 72 ? '...' : ''} ($${price.toFixed(2)})`, name));
    });

    if (productNameEl) productNameEl.value = '';
    if (productPriceEl) productPriceEl.value = '';
  };

  window.applyAssignTaskCategoryProduct = function() {
    const categoryEl = document.getElementById('assignTaskProductCategory');
    const productEl = document.getElementById('assignTaskCategoryProduct');
    const productNameEl = document.getElementById('assignTaskProductName');
    const productPriceEl = document.getElementById('assignTaskProductPrice');
    if (!categoryEl || !productEl || !productNameEl || !productPriceEl) return;

    const category = TASK_PRODUCT_CATEGORIES[categoryEl.value];
    if (!category || !productEl.value || productEl.value === CATEGORY_RANDOM_VALUE) {
      productNameEl.value = '';
      productPriceEl.value = '';
      return;
    }

    const selected = category.products.find(([name]) => name === productEl.value);
    if (!selected) return;
    productNameEl.value = selected[0];
    productPriceEl.value = selected[1].toFixed(2);
  };

  window.clearUserCustomTask = async function() {
    const userId = document.getElementById('assignTaskUserId').value;
    if (!userId) return;
    if (!confirm('Clear custom task override for this user?')) return;
    const res = await AdminAPI.post('/api/admin/users/assign-task', { userId, clearCustom: true });
    if (res && res.success) {
      AdminUI.toast('Cleared', res.message, 'success');
      AdminUI.closeModal('assignTaskModal');
      loadUsers();
    } else {
      AdminUI.toast('Error', (res && res.message) || 'Could not clear override', 'error');
    }
  };

  // --- Start Order Sequence Planner (Wave-Off Plan) ---
  window.switchAssignTaskTab = function(tab) {
    const singleView = document.getElementById('assignTaskSingleView');
    const seqView = document.getElementById('assignTaskSequenceView');
    const tabBtnSingle = document.getElementById('tabBtnSingleTask');
    const tabBtnSeq = document.getElementById('tabBtnSequencePlan');

    if (tab === 'sequence') {
      if (singleView) singleView.style.display = 'none';
      if (seqView) seqView.style.display = 'block';
      if (tabBtnSingle) {
        tabBtnSingle.style.background = '#f1f5f9';
        tabBtnSingle.style.color = '#64748b';
      }
      if (tabBtnSeq) {
        tabBtnSeq.style.background = '#eff6ff';
        tabBtnSeq.style.color = '#1d4ed8';
      }
    } else {
      if (singleView) singleView.style.display = 'block';
      if (seqView) seqView.style.display = 'none';
      if (tabBtnSingle) {
        tabBtnSingle.style.background = '#fef3c7';
        tabBtnSingle.style.color = '#92400e';
      }
      if (tabBtnSeq) {
        tabBtnSeq.style.background = '#f1f5f9';
        tabBtnSeq.style.color = '#64748b';
      }
    }
  };

  window.onSeqPlanTotalOrdersChange = function() {
    window.autoDistributeSeqPlan();
  };

  window.applyVoiceNotePreset100 = function() {
    const totEl = document.getElementById('seqPlanTotalOrders');
    if (totEl) totEl.value = '5';
    const balInput = document.getElementById('seqPlanBalanceInput');
    if (balInput && (!balInput.value || parseFloat(balInput.value) <= 0)) {
      balInput.value = '100.00';
    }
    const currentBal = parseFloat(balInput ? balInput.value : 100) || 100;
    const defaultSteps = [
      { order_num: 1, amount: 10.00, is_deficit: false, deficit_amount: 0 },
      { order_num: 2, amount: 20.00, is_deficit: false, deficit_amount: 0 },
      { order_num: 3, amount: 30.00, is_deficit: false, deficit_amount: 0 },
      { order_num: 4, amount: 40.00, is_deficit: false, deficit_amount: 0 },
      { order_num: 5, amount: 2000.00, is_deficit: true, deficit_amount: Math.max(25, parseFloat((2000 - currentBal).toFixed(2))) }
    ];
    window.renderSequenceStepRows(defaultSteps);
  };

  window.autoDistributeSeqPlan = function() {
    const totEl = document.getElementById('seqPlanTotalOrders');
    const count = parseInt(totEl ? totEl.value : 5, 10) || 5;
    const balInput = document.getElementById('seqPlanBalanceInput');
    const budget = parseFloat(balInput && balInput.value ? balInput.value : 100) || 100;

    const steps = [];
    const normalCount = Math.max(1, count - 1);
    for (let i = 1; i <= normalCount; i++) {
      const fraction = (i / (normalCount * (normalCount + 1) / 2));
      const amt = parseFloat((budget * fraction).toFixed(2));
      steps.push({
        order_num: i,
        amount: Math.max(5, amt),
        is_deficit: false,
        deficit_amount: 0
      });
    }

    const deficitPrice = budget >= 500 ? parseFloat((budget * 2).toFixed(2)) : 2000.00;
    steps.push({
      order_num: count,
      amount: deficitPrice,
      is_deficit: true,
      deficit_amount: Math.max(25, parseFloat((deficitPrice - budget).toFixed(2)))
    });

    window.renderSequenceStepRows(steps);
  };

  window.renderSequenceStepRows = function(steps) {
    const tbody = document.getElementById('seqPlanStepsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    steps.forEach((step, idx) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.dataset.orderNum = step.order_num || (idx + 1);

      tr.innerHTML = `
        <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">
          Click #${step.order_num || (idx + 1)}
        </td>
        <td style="padding: 6px 10px;">
          <input type="number" step="0.01" class="form-control seq-step-amt" value="${parseFloat(step.amount || 0).toFixed(2)}" style="width: 105px; padding: 4px 8px; font-size: 12px; font-weight: 700;" onchange="window.recalcStepRow(${idx})" />
        </td>
        <td style="padding: 6px 10px;">
          <select class="form-control seq-step-deficit" style="width: 110px; padding: 4px 8px; font-size: 11.5px; font-weight: 600;" onchange="window.recalcStepRow(${idx})">
            <option value="false" ${!step.is_deficit ? 'selected' : ''}>Normal</option>
            <option value="true" ${step.is_deficit ? 'selected' : ''} style="color: #dc2626; font-weight: 700;">Forced Deficit</option>
          </select>
        </td>
        <td style="padding: 6px 10px;">
          <input type="number" step="0.01" class="form-control seq-step-defamt" value="${step.is_deficit ? parseFloat(step.deficit_amount || 0).toFixed(2) : '0.00'}" style="width: 100px; padding: 4px 8px; font-size: 12px;" ${!step.is_deficit ? 'disabled' : ''} />
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  window.recalcStepRow = function(idx) {
    const tbody = document.getElementById('seqPlanStepsTbody');
    if (!tbody) return;
    const row = tbody.children[idx];
    if (!row) return;

    const amtEl = row.querySelector('.seq-step-amt');
    const defSelect = row.querySelector('.seq-step-deficit');
    const defAmtEl = row.querySelector('.seq-step-defamt');
    const balInput = document.getElementById('seqPlanBalanceInput');
    const budget = parseFloat(balInput && balInput.value ? balInput.value : 100) || 100;

    const amt = parseFloat(amtEl.value || 0);
    const isDef = defSelect.value === 'true';

    if (isDef) {
      defAmtEl.disabled = false;
      if (parseFloat(defAmtEl.value || 0) <= 0) {
        defAmtEl.value = Math.max(10, parseFloat((amt - budget).toFixed(2))).toFixed(2);
      }
    } else {
      defAmtEl.disabled = true;
      defAmtEl.value = '0.00';
    }
  };

  window.clearUserSequencePlan = async function() {
    const userId = document.getElementById('assignTaskUserId').value;
    if (!userId) return;
    if (!confirm('Clear active start sequence plan for this user?')) return;
    const res = await AdminAPI.post('/api/admin/users/sequence-plan/clear', { userId });
    if (res && res.success) {
      AdminUI.toast('Cleared', res.message, 'success');
      AdminUI.closeModal('assignTaskModal');
      loadUsers();
    } else {
      AdminUI.toast('Error', (res && res.message) || 'Could not clear plan', 'error');
    }
  };

  // Helper: format time ago for live pings
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }

  // 3.5 Active Sessions Management (Real-time live merchants tracking)
  window.loadSessions = async function() {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/sessions');
    if (res && res.success && Array.isArray(res.sessions)) {
      state.sessions = res.sessions;
      const count = res.count || res.sessions.length;
      
      const badge = document.getElementById('adminOnlineBadge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
      }

      if (state.sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;"><i class="fa fa-info-circle mr-1"></i> No active merchant sessions in the last 3 minutes.</td></tr>`;
        return;
      }

      tbody.innerHTML = state.sessions.map(s => {
        const timeAgo = formatTimeAgo(s.last_seen);
        const bal = parseFloat(s.balance || 0);
        return `
          <tr>
            <td>
              <span style="display:inline-flex; align-items:center; gap:6px; font-weight:700; color:#16a34a; background:#dcfce7; padding:4px 10px; border-radius:20px; font-size:12px;">
                <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 6px #22c55e;"></span> Online
              </span>
            </td>
            <td>
              <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(s.fullname || s.username || 'Merchant')}</div>
              <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(s.username || 'user')}</div>
              <small style="color: #94a3b8; font-size: 11px;">ID: ${s.userId} | ${s.vip_level || 'Bronze'} VIP</small>
            </td>
            <td>
              <div style="font-weight: 600; color: #334155; font-size: 13px;">${s.flagEmoji || '🌐'} ${escapeHtml(s.city ? s.city + ', ' : '')}${escapeHtml(s.countryName || 'Unknown')}</div>
              <code style="font-size: 11.5px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${escapeHtml(s.ip || '127.0.0.1')}</code>
            </td>
            <td>
              <div style="font-size: 12.5px; color: #334155; font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(s.user_agent || '')}">
                ${escapeHtml(s.user_agent ? (s.user_agent.includes('Mobile') ? '📱 Mobile Device' : '💻 Desktop') : 'Browser')}
              </div>
            </td>
            <td>
              <span style="font-weight: 600; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 6px; font-size: 12px;">
                /${escapeHtml(s.path || 'home')}
              </span>
            </td>
            <td style="font-size: 12.5px; color: #475569; font-weight: 500;">${timeAgo}</td>
            <td style="font-weight: 800; font-size: 14px; color: ${bal < 0 ? '#ef4444' : '#10b981'};">
              ${bal < 0 ? '-' : ''}$${Math.abs(bal).toFixed(2)}
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn-action" style="background: #f59e0b; color: white;" onclick="openAssignTaskModal('${s.userId}')" title="Assign Task">
                  <i class="fa fa-tasks"></i> Task
                </button>
                <button class="btn-action btn-edit" onclick="openChatWithUser('${s.userId}', '${escapeHtml(s.username || s.fullname)}')" title="Live Chat">
                  <i class="fa fa-comment"></i> Chat
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  };

  // Permanently delete user
  window.deleteUser = async function(userId, name) {
    if (!userId) return;
    const confirmed = await AdminUI.confirm({
      title: 'Permanently Delete User?',
      message: `Are you sure you want to permanently delete merchant "${name}" (ID: ${userId})? This will completely delete their account, tasks, orders, deposits, withdrawals, and chat records. This action CANNOT be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete Permanently'
    });
    if (!confirmed) return;

    const res = await AdminAPI.post('/api/admin/users/delete', { userId });
    if (res && res.success) {
      AdminUI.toast('User Deleted', res.message || 'User account successfully deleted.', 'success');
      loadUsers();
      loadMetrics();
      loadSessions();
    } else {
      AdminUI.toast('Delete Failed', (res && res.message) || 'Error deleting user', 'error');
    }
  };

  // Terminate active merchant session
  window.kickUserSession = async function(userId, name) {
    const confirmed = await AdminUI.confirm({
      title: 'Terminate Active Session?',
      message: `Are you sure you want to end the active session for "${name || 'User #' + userId}"? They will be logged out immediately.`,
      type: 'warning',
      confirmText: 'Yes, End Session'
    });
    if (!confirmed) return;

    try {
      const res = await AdminAPI.post('/api/admin/sessions/kick', { userId });
      if (res && res.success) {
        AdminUI.toast('Session Terminated', res.message || 'User session terminated.', 'success');
        loadUsers();
        if (typeof loadSessions === 'function') loadSessions();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Failed to end user session.', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', 'Network error ending session.', 'error');
    }
  };

  // Quick Chat opener
  window.openChatWithUser = function(userId, userName) {
    switchAdminTab('tabChat');
    setTimeout(() => {
      if (typeof selectUserChat === 'function') {
        selectUserChat(userId, userName);
      }
    }, 200);
  };

  // Self-Balancing / Reinvest profit into working balance
  window.reinvestProfitToBalance = async function() {
    const userId = document.getElementById('editUserId').value;
    if (!userId) return;
    const user = state.users.find(u => String(u.id) === String(userId));
    const profit = user ? parseFloat(user.today_profit || 0) : 0;
    if (profit <= 0) {
      AdminUI.toast('No Profit', 'This merchant currently has $0.00 accumulated profit to transfer.', 'warning');
      return;
    }

    const confirmed = await AdminUI.confirm({
      title: 'Reinvest Profit to Working Balance?',
      message: `Transfer $${profit.toFixed(2)} accumulated today's profit directly into Working Balance for merchant "${user.fullname || user.username}"? Their today's tasks will also be reset to 0 so they can continue a full new order cycle.`,
      type: 'success',
      confirmText: 'Yes, Transfer & Reset Tasks'
    });
    if (!confirmed) return;

    const res = await AdminAPI.post('/api/admin/users/update', {
      userId,
      reinvest_profit: true
    });

    if (res && res.success) {
      AdminUI.toast('Profit Reinvested', res.message || 'Profit moved to working balance successfully.', 'success');
      AdminUI.closeModal('editUserModal');
      loadUsers();
      loadMetrics();
    } else {
      AdminUI.toast('Reinvest Failed', (res && res.message) || 'Error transferring profit', 'error');
    }
  };

  // 4. Staff & Sub-Admin Management
  window.loadStaff = async function() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/staff');
    if (res && res.success && res.staff) {
      state.staff = res.staff;
      if (state.staff.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No sub-admin accounts registered yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = state.staff.map(s => {
        const isSuper = s.role === 'super_admin';
        const roleBadge = isSuper 
          ? `<span class="badge-status badge-primary">Super Admin</span>`
          : (s.role === 'support' 
              ? `<span class="badge-status badge-info">Support Operator</span>`
              : (s.role === 'finance'
                  ? `<span class="badge-status badge-success">Finance Officer</span>`
                  : `<span class="badge-status badge-warning">Sub-Admin</span>`));

        const statusBadge = s.status === 'active'
          ? `<span class="badge-status badge-active">ACTIVE</span>`
          : `<span class="badge-status badge-suspended">SUSPENDED</span>`;

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(s.fullname)}</div>
              <small style="color: #94a3b8; font-size: 11px;">ID: ${s.id}</small>
            </td>
            <td>
              <span style="font-family: monospace; font-weight: 600; color: #0284c7;">${escapeHtml(s.email)}</span>
            </td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td><small style="color: #64748b;">${new Date(s.created_at).toLocaleString()}</small></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn-action btn-edit" onclick="openEditStaffModal('${s.id}', '${escapeHtml(s.fullname)}', '${s.role}', '${s.status}')">
                  <i class="fa fa-edit"></i> Edit
                </button>
                ${!isSuper ? `
                  <button class="btn-action btn-reject" onclick="deleteStaff('${s.id}', '${escapeHtml(s.fullname)}')">
                    <i class="fa fa-trash"></i> Delete
                  </button>
                ` : `<span style="color: #94a3b8; font-size: 12px; font-weight: 600; padding: 6px;">(Master Admin)</span>`}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #dc2626;">Failed to load staff accounts.</td></tr>`;
    }
  };

  window.openEditStaffModal = function(id, fullname, role, status) {
    document.getElementById('editStaffId').value = id;
    document.getElementById('editStaffFullName').value = fullname;
    document.getElementById('editStaffRole').value = role;
    document.getElementById('editStaffStatus').value = status;
    document.getElementById('editStaffNewPassword').value = '';
    AdminUI.openModal('editStaffModal');
  };

  window.deleteStaff = async function(id, fullname) {
    const confirmed = await AdminUI.confirm({
      title: 'Revoke Admin Access?',
      message: `Are you sure you want to permanently delete sub-admin account "${fullname}"?`,
      type: 'danger',
      confirmText: 'Yes, Delete Account'
    });
    if (!confirmed) return;

    const res = await AdminAPI.post('/api/admin/staff/delete', { id });
    if (res && res.success) {
      AdminUI.toast('Sub-Admin Deleted', res.message, 'success');
      loadStaff();
    } else {
      AdminUI.toast('Delete Error', (res && res.message) || 'Could not delete staff account', 'error');
    }
  };

  // 5. KYC / Identity Document Verification
  window.loadKycs = async function() {
    const res = await AdminAPI.get('/api/admin/kyc');
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;

    if (res && res.success && res.submissions) {
      state.kycs = res.submissions;
      if (state.kycs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No KYC verification requests found.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.kycs.map(k => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(k.name || k.fullname || 'Applicant')}</div>
            ${k.username ? `<div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(k.username)}</div>` : ''}
            <small style="color: #64748b;">${escapeHtml(k.user_email)}</small>
          </td>
          <td>
            <button class="btn-refresh" style="font-size: 12px; padding: 5px 10px;" onclick="zoomKycDoc('${k.id}', 'front')">
              <i class="fa fa-id-card"></i> View Front
            </button>
          </td>
          <td>
            <button class="btn-refresh" style="font-size: 12px; padding: 5px 10px;" onclick="zoomKycDoc('${k.id}', 'back')">
              <i class="fa fa-id-card"></i> View Back
            </button>
          </td>
          <td>
            <button class="btn-refresh" style="font-size: 12px; padding: 5px 10px;" onclick="zoomKycDoc('${k.id}', 'sig')">
              <i class="fa fa-signature"></i> Signature
            </button>
          </td>
          <td style="font-weight: 800; color: #0284c7;">$${parseFloat(k.investment_amount || 0).toFixed(2)}</td>
          <td>
            <span class="badge-status badge-${(k.status || 'pending').toLowerCase()}">${k.status}</span>
            ${k.rejection_reason ? `<div style="font-size: 11px; color: #dc2626; margin-top: 3px;">Note: ${escapeHtml(k.rejection_reason)}</div>` : ''}
          </td>
          <td>
            ${k.status === 'pending' || k.status === 'reupload_required' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn-action btn-approve" onclick="confirmKycAction('${k.id}', 'approve')"><i class="fa fa-check"></i> Approve</button>
                <button class="btn-action btn-reject" onclick="confirmKycAction('${k.id}', 'reject')"><i class="fa fa-times"></i> Reject</button>
                <button class="btn-action btn-edit" style="background: #f59e0b;" onclick="confirmKycAction('${k.id}', 'reupload')"><i class="fa fa-redo"></i> Re-upload</button>
              </div>
            ` : `<small style="color: #64748b; font-weight: 600;">Completed (${k.status})</small>`}
          </td>
        </tr>
      `).join('');
    }
  };

  window.zoomKycDoc = function(kycId, type) {
    const kyc = state.kycs.find(k => k.id === kycId);
    if (!kyc) return;

    let src = '';
    let title = '';

    if (type === 'front') {
      src = kyc.front_id_image || 'assets/uploads/contracts/id_sample_front.png';
      title = `Front Side of ID Card - ${kyc.name || kyc.fullname}`;
    } else if (type === 'back') {
      src = kyc.back_id_image || 'assets/uploads/contracts/id_sample_back.png';
      title = `Back Side of ID Card - ${kyc.name || kyc.fullname}`;
    } else {
      src = kyc.signature_image || 'assets/uploads/contracts/defaultsignature.jpeg';
      title = `Applicant Signature - ${kyc.name || kyc.fullname}`;
    }

    document.getElementById('imageViewerTitle').innerHTML = `<i class="fa fa-image" style="color: var(--primary);"></i> ${escapeHtml(title)}`;
    document.getElementById('imageViewerImg').src = src;
    document.getElementById('imageViewerLink').href = src;
    AdminUI.openModal('imageViewerModal');
  };

  window.confirmKycAction = async function(kycId, action) {
    const kyc = state.kycs.find(k => String(k.id) === String(kycId));
    const applicantName = kyc ? (kyc.name || kyc.fullname) : 'User';

    if (action === 'approve') {
      const confirmed = await AdminUI.confirm({
        title: 'Approve KYC Verification?',
        message: `Are you sure you want to approve merchant documents for ${applicantName}?`,
        type: 'success',
        confirmText: 'Yes, Approve Verification'
      });
      if (!confirmed) return;

      const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'approve' });
      if (res && res.success) {
        AdminUI.toast('KYC Approved', res.message, 'success');
        loadKycs();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Action failed', 'error');
      }
    } else if (action === 'reject') {
      const reason = await AdminUI.prompt({
        title: 'Reject KYC Submission',
        message: 'Please enter the rejection reason for the applicant:',
        placeholder: 'e.g. Document image is blurry or unreadable',
        type: 'danger',
        required: false,
        confirmText: 'Reject Submission'
      });
      if (reason === null) return;
      const finalReason = (reason || '').trim() || 'Document image is blurry or unreadable';

      const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'reject', reason: finalReason });
      if (res && res.success) {
        AdminUI.toast('KYC Rejected', res.message, 'warning');
        loadKycs();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Action failed', 'error');
      }
    } else if (action === 'reupload') {
      const reason = await AdminUI.prompt({
        title: 'Request Document Re-upload',
        message: 'Specify which document needs to be re-uploaded:',
        placeholder: 'e.g. Back side of ID is cropped or blurry',
        type: 'warning',
        required: false,
        confirmText: 'Request Re-upload'
      });
      if (reason === null) return;
      const finalReason = (reason || '').trim() || 'Please re-upload clearer photos of verification documents';

      const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'reupload', reason: finalReason });
      if (res && res.success) {
        AdminUI.toast('Requested', res.message, 'info');
        loadKycs();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Action failed', 'error');
      }
    }
  };

  // 6. Deposits & Proof Receipts
  window.loadDeposits = async function() {
    const res = await AdminAPI.get('/api/admin/deposits');
    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) return;

    if (res && res.success && res.deposits) {
      state.deposits = res.deposits;
      if (state.deposits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No deposit records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.deposits.map(d => `
        <tr>
          <td>
            <div style="font-weight: 700; font-family: monospace; font-size: 12px; color: #475569;">${d.id}</div>
            <small style="color: #64748b;">${new Date(d.created_at).toLocaleString()}</small>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(d.fullname || d.username || 'Merchant User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(d.username || 'user')}</div>
            <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(d.user_email)}</div>
          </td>
          <td style="font-weight: 800; color: #10b981; font-size: 15px;">+$${parseFloat(d.amount).toFixed(2)}</td>
          <td><span class="badge-status badge-info">${d.method}</span></td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <code style="font-size: 11px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${d.txid}</code>
              <button class="btn-refresh" style="font-size: 11.5px; padding: 4px 10px;" onclick="zoomDepositReceipt('${d.id}')">
                <i class="fa fa-receipt"></i> View Receipt
              </button>
            </div>
          </td>
          <td><span class="badge-status badge-${(d.status || 'pending').toLowerCase()}">${d.status}</span></td>
          <td>
            ${d.status === 'pending' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn-action btn-approve" onclick="confirmDepositAction('${d.id}', 'approve')"><i class="fa fa-check"></i> Approve (Credit)</button>
                <button class="btn-action btn-reject" onclick="confirmDepositAction('${d.id}', 'reject')"><i class="fa fa-times"></i> Reject</button>
              </div>
            ` : d.status === 'approved' ? `
              <div style="display: flex; align-items: center; gap: 6px;">
                <small style="color: #10b981; font-weight: 700;">Resolved (approved)</small>
                <button class="btn-action btn-reject" style="font-size: 11px; padding: 4px 8px;" title="Reverse & Reject Deposit" onclick="confirmDepositAction('${d.id}', 'reject')"><i class="fa fa-undo"></i> Reject</button>
              </div>
            ` : `
              <div style="display: flex; align-items: center; gap: 6px;">
                <small style="color: #ef4444; font-weight: 700;">Resolved (rejected)</small>
                <button class="btn-action btn-approve" style="font-size: 11px; padding: 4px 8px;" title="Re-Approve & Credit Balance" onclick="confirmDepositAction('${d.id}', 'approve')"><i class="fa fa-check"></i> Approve</button>
              </div>
            `}
          </td>
        </tr>
      `).join('');
    }
  };

  window.zoomDepositReceipt = function(depositId) {
    const dep = state.deposits.find(d => d.id === depositId);
    if (!dep) return;

    const proofImgSrc = dep.proof_image || 'assets/uploads/contracts/id_sample_front.png';
    const container = document.getElementById('receiptInspectorBody');

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; background: #f1f5f9; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
        <img src="${proofImgSrc}" style="max-height: 340px; max-width: 100%; border-radius: 8px; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="Receipt Screenshot" />
        <div style="margin-top: 10px;">
          <a href="${proofImgSrc}" target="_blank" class="btn-refresh" style="text-decoration: none; font-size: 12px;">
            <i class="fa fa-external-link-alt"></i> Open Original Resolution
          </a>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 13.5px;">
        <div><span style="color: #64748b;">Deposit ID:</span> <strong>${dep.id}</strong></div>
        <div><span style="color: #64748b;">User Account:</span> <strong>${escapeHtml(dep.fullname || dep.username || 'User')} (${dep.user_email})</strong></div>
        <div><span style="color: #64748b;">Deposit Amount:</span> <strong style="color: #10b981; font-size: 16px;">+$${parseFloat(dep.amount).toFixed(2)}</strong></div>
        <div><span style="color: #64748b;">Payment Method:</span> <span class="badge-status badge-info">${dep.method}</span></div>
        <div style="grid-column: span 2;">
          <span style="color: #64748b;">Blockchain TxHash:</span>
          <div style="background: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 12px; word-break: break-all; margin-top: 4px;">
            ${dep.txid}
          </div>
        </div>
        <div><span style="color: #64748b;">Status:</span> <span class="badge-status badge-${(dep.status || 'pending').toLowerCase()}">${dep.status}</span></div>
        <div><span style="color: #64748b;">Timestamp:</span> <small>${new Date(dep.created_at).toLocaleString()}</small></div>
      </div>
      ${dep.status === 'pending' ? `
        <div style="display: flex; gap: 10px;">
          <button class="btn-action btn-approve" style="flex: 1; justify-content: center; padding: 12px; font-size: 14px;" onclick="AdminUI.closeModal('receiptInspectorModal'); confirmDepositAction('${dep.id}', 'approve');">
            <i class="fa fa-check"></i> Approve & Credit Balance
          </button>
          <button class="btn-action btn-reject" style="flex: 1; justify-content: center; padding: 12px; font-size: 14px;" onclick="AdminUI.closeModal('receiptInspectorModal'); confirmDepositAction('${dep.id}', 'reject');">
            <i class="fa fa-times"></i> Reject Deposit
          </button>
        </div>
      ` : dep.status === 'approved' ? `
        <div style="display: flex; gap: 10px;">
          <button class="btn-action btn-reject" style="flex: 1; justify-content: center; padding: 12px; font-size: 14px;" onclick="AdminUI.closeModal('receiptInspectorModal'); confirmDepositAction('${dep.id}', 'reject');">
            <i class="fa fa-undo"></i> Reverse & Reject Deposit
          </button>
        </div>
      ` : `
        <div style="display: flex; gap: 10px;">
          <button class="btn-action btn-approve" style="flex: 1; justify-content: center; padding: 12px; font-size: 14px;" onclick="AdminUI.closeModal('receiptInspectorModal'); confirmDepositAction('${dep.id}', 'approve');">
            <i class="fa fa-check"></i> Re-Approve & Credit Balance
          </button>
        </div>
      `}
    `;

    AdminUI.openModal('receiptInspectorModal');
  };

  window.confirmDepositAction = async function(depositId, action) {
    const dep = state.deposits.find(d => d.id === depositId);
    const amountStr = dep ? `$${parseFloat(dep.amount).toFixed(2)}` : 'funds';

    if (action === 'approve') {
      const confirmed = await AdminUI.confirm({
        title: `Approve Deposit of ${amountStr}?`,
        message: `The deposit will be immediately verified and ${amountStr} will be credited to the user's working balance.`,
        type: 'success',
        confirmText: 'Yes, Approve & Credit'
      });
      if (!confirmed) return;

      const res = await AdminAPI.post('/api/admin/deposits/action', { depositId, action: 'approve' });
      if (res && res.success) {
        AdminUI.toast('Deposit Approved', res.message, 'success');
        loadDeposits();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Action Failed', (res && res.message) || 'Error approving deposit', 'error');
      }
    } else if (action === 'reject') {
      const isReversing = dep && dep.status === 'approved';
      const promptTitle = isReversing ? `Reverse & Reject Deposit (${amountStr})` : 'Reject Deposit Request';
      const promptMsg = isReversing
        ? `⚠️ This deposit of ${amountStr} was already approved. Rejecting it will reverse and deduct ${amountStr} from the user's balance. Reason:`
        : 'Reason for rejection (e.g. Unverified blockchain transaction hash):';

      const notes = await AdminUI.prompt({
        title: promptTitle,
        message: promptMsg,
        placeholder: 'Enter rejection reason (optional)',
        type: 'danger',
        required: false,
        confirmText: isReversing ? 'Reverse & Reject' : 'Reject Deposit'
      });
      if (notes === null) return;
      const finalNotes = (notes || '').trim() || (isReversing ? 'Reversed and rejected by admin' : 'Invalid transaction hash / receipt');

      const res = await AdminAPI.post('/api/admin/deposits/action', { depositId, action: 'reject', notes: finalNotes });
      if (res && res.success) {
        AdminUI.toast('Deposit Rejected', res.message, 'warning');
        loadDeposits();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Action Failed', (res && res.message) || 'Error rejecting deposit', 'error');
      }
    }
  };

  // 7. Withdrawals & Payouts
  window.loadWithdrawals = async function() {
    const res = await AdminAPI.get('/api/admin/withdrawals');
    const tbody = document.getElementById('withdrawalsTableBody');
    if (!tbody) return;

    if (res && res.success && res.withdrawals) {
      state.withdrawals = res.withdrawals;
      if (state.withdrawals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No withdrawal requests recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.withdrawals.map(w => {
        const cleanW = (w.wallet_address || '').trim().toLowerCase();
        const platformW = (state.settings && state.settings.trc20_address ? state.settings.trc20_address.trim().toLowerCase() : '');
        const isReinvest = Boolean(cleanW && platformW && cleanW === platformW) || (w.status === 'reinvested');

        return `
        <tr>
          <td>
            <div style="font-weight: 700; font-family: monospace; font-size: 12px; color: #475569;">${w.id}</div>
            <small style="color: #64748b;">${new Date(w.created_at).toLocaleString()}</small>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(w.fullname || w.username || 'Merchant User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(w.username || 'user')}</div>
            <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(w.user_email)}</div>
          </td>
          <td style="font-weight: 800; color: #ef4444; font-size: 15px;">-$${parseFloat(w.amount).toFixed(2)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <strong style="font-size: 13px;">${w.method || 'USDT'} (${w.network || 'TRC20'})</strong>
              ${isReinvest ? '<span class="badge-status badge-info" style="font-size: 10.5px; padding: 2px 6px; background: #e0f2fe; color: #0284c7;"><i class="fa fa-sync-alt"></i> Internal Reinvest</span>' : ''}
            </div>
            <code style="font-size: 11px;">${w.wallet_address || (w.bank_name ? w.bank_name + ' - ' + w.account_number : 'Address Pending')}</code>
          </td>
          <td><span class="badge-status badge-${(w.status || 'pending').toLowerCase()}">${w.status === 'reinvested' ? 'Reinvested' : w.status}</span></td>
          <td>
            ${w.status === 'pending' ? `
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn-action" style="background: #0284c7; color: #fff;" onclick="confirmWithdrawAction('${w.id}', 'reinvest')" title="Approve and transfer directly to working balance for next cycle"><i class="fa fa-sync-alt"></i> Approve & Reinvest</button>
                <button class="btn-action btn-approve" onclick="confirmWithdrawAction('${w.id}', 'approve')"><i class="fa fa-check"></i> Approve (Paid External)</button>
                <button class="btn-action btn-reject" onclick="confirmWithdrawAction('${w.id}', 'reject')"><i class="fa fa-undo"></i> Reject & Refund</button>
              </div>
            ` : `<small style="color: #64748b; font-weight: 600;">Resolved (${w.status})</small>`}
          </td>
        </tr>
      `;}).join('');
    }
  };

  window.confirmWithdrawAction = async function(withdrawalId, action) {
    const w = state.withdrawals.find(item => item.id === withdrawalId);
    const amountStr = w ? `$${parseFloat(w.amount).toFixed(2)}` : 'payout';

    if (action === 'reinvest') {
      const confirmed = await AdminUI.confirm({
        title: `Approve & Reinvest ${amountStr}?`,
        message: `Transfer ${amountStr} directly into user's Working Balance and reset today's completed tasks to 0 so the user can immediately begin their next optimization cycle.`,
        type: 'info',
        confirmText: 'Yes, Approve & Reinvest'
      });
      if (!confirmed) return;

      const res = await AdminAPI.post('/api/admin/withdrawals/action', { withdrawalId, action: 'reinvest' });
      if (res && res.success) {
        AdminUI.toast('Reinvested to Working Balance', res.message, 'success');
        loadWithdrawals();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Action Failed', (res && res.message) || 'Error approving reinvestment', 'error');
      }
      return;
    } else if (action === 'approve') {
      const confirmed = await AdminUI.confirm({
        title: `Confirm Payout of ${amountStr}?`,
        message: `Mark withdrawal request of ${amountStr} as paid and released to user wallet/bank.`,
        type: 'success',
        confirmText: 'Yes, Approve Payout'
      });
      if (!confirmed) return;

      const res = await AdminAPI.post('/api/admin/withdrawals/action', { withdrawalId, action: 'approve' });
      if (res && res.success) {
        AdminUI.toast('Payout Approved', res.message, 'success');
        loadWithdrawals();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Action Failed', (res && res.message) || 'Error approving withdrawal', 'error');
      }
    } else if (action === 'reject') {
      const notes = await AdminUI.prompt({
        title: 'Reject & Refund Withdrawal',
        message: `Reject withdrawal of ${amountStr} and return funds back to user working balance:`,
        placeholder: 'Enter rejection notes (optional)',
        type: 'danger',
        required: false,
        confirmText: 'Reject & Refund'
      });
      if (notes === null) return;
      const finalNotes = (notes || '').trim() || 'Withdrawal request rejected by admin';

      const res = await AdminAPI.post('/api/admin/withdrawals/action', { withdrawalId, action: 'reject', notes: finalNotes });
      if (res && res.success) {
        AdminUI.toast('Withdrawal Refunded', res.message, 'warning');
        loadWithdrawals();
        loadUsers();
        loadMetrics();
      } else {
        AdminUI.toast('Action Failed', (res && res.message) || 'Error rejecting withdrawal', 'error');
      }
    }
  };

  // 8. Settings Management
  window.loadSettings = async function() {
    const res = await AdminAPI.get('/api/admin/settings');
    if (res && res.success && res.settings) {
      state.settings = res.settings;
      if (document.getElementById('setTrc20')) document.getElementById('setTrc20').value = res.settings.trc20_address || '';
      if (document.getElementById('setErc20')) document.getElementById('setErc20').value = res.settings.erc20_address || '';
      if (document.getElementById('setBtc')) document.getElementById('setBtc').value = res.settings.btc_address || '';
      if (document.getElementById('setMinDeposit')) document.getElementById('setMinDeposit').value = res.settings.min_deposit || 20;
      if (document.getElementById('setMinWithdraw')) document.getElementById('setMinWithdraw').value = res.settings.min_withdraw || 30;
      if (document.getElementById('setTelegram')) document.getElementById('setTelegram').value = res.settings.telegram_support || '';
      if (document.getElementById('setWhatsapp')) document.getElementById('setWhatsapp').value = res.settings.whatsapp_support || '';
    }
  };

  // 9. Live Customer Chat
  window.loadChatConversations = async function() {
    try {
      const res = await AdminAPI.get('/api/admin/chat/conversations');
      const listEl = document.getElementById('adminConversationsList');
      if (!listEl) return;

      if (res && res.success && res.conversations) {
        state.chatConversations = res.conversations;
        const totalUnread = res.conversations.reduce((sum, c) => sum + (c.unread_count || c.unread_admin_count || 0), 0);
        const badge = document.getElementById('adminChatUnreadBadge');
        if (badge) {
          if (totalUnread > 0) {
            badge.textContent = totalUnread;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }

        if (res.conversations.length === 0) {
          listEl.innerHTML = `<div style="text-align: center; color: #64748b; padding: 24px; font-size: 13px;">No active conversations.</div>`;
          return;
        }

        function renderFlagBadge(code, emoji) {
          if (code && typeof code === 'string' && code.length === 2) {
            const c = code.toLowerCase();
            return `<img src="https://flagcdn.com/24x18/${c}.png" style="width: 20px; height: 14px; border-radius: 2px; vertical-align: middle; margin-right: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.18); display: inline-block;" onerror="this.outerHTML='${emoji || '🌐'}';" alt="${code}">`;
          }
          return emoji ? `<span style="margin-right: 4px;">${emoji}</span>` : '🌐 ';
        }

        listEl.innerHTML = res.conversations.map(c => {
          const unread = c.unread_count || c.unread_admin_count || 0;
          const flagHtml = renderFlagBadge(c.country_code, c.flag_emoji);
          const countryTag = c.country_name ? `<span style="font-size: 11px; font-weight: normal; color: #64748b; margin-left: 4px;">(${escapeHtml(c.country_name)})</span>` : '';
          return `
            <div class="admin-chat-user-item ${state.activeChatUserId === c.user_id ? 'active' : ''}" onclick="selectChatUser('${c.user_id}')" style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; background: ${state.activeChatUserId === c.user_id ? '#eff6ff' : '#ffffff'}; transition: background 0.15s ease;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; display: flex; align-items: center;">${flagHtml} ${escapeHtml(c.user_name || 'Customer')} ${countryTag}</div>
                <small style="font-size: 10.5px; color: #94a3b8;">${new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;">
                  ${escapeHtml(c.last_message || 'Attachment/image')}
                </div>
                ${unread > 0 ? `<span class="badge-status badge-danger" style="font-size: 10px; padding: 2px 6px; font-weight: bold; border-radius: 10px;">${unread}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error('Chat load error:', e);
    }
  };

  window.selectChatUser = async function(userId) {
    state.activeChatUserId = userId;
    const userConv = state.chatConversations.find(c => c.user_id === userId);

    document.getElementById('adminChatNoSelection').style.display = 'none';
    document.getElementById('adminChatMainContent').style.display = 'flex';

    if (userConv) {
      function renderFlagBadge(code, emoji) {
        if (code && typeof code === 'string' && code.length === 2) {
          const c = code.toLowerCase();
          return `<img src="https://flagcdn.com/24x18/${c}.png" style="width: 20px; height: 14px; border-radius: 2px; vertical-align: middle; margin-right: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.18); display: inline-block;" onerror="this.outerHTML='${emoji || '🌐'}';" alt="${code}">`;
        }
        return emoji ? `<span style="margin-right: 4px;">${emoji}</span>` : '🌐 ';
      }
      const flagHtml = renderFlagBadge(userConv.country_code, userConv.flag_emoji);
      const country = userConv.country_name || 'Unknown';
      const ip = userConv.ip_address || userConv.last_ip || '127.0.0.1';
      document.getElementById('adminChatSelectedName').innerHTML = `<span style="display: inline-flex; align-items: center;">${flagHtml} ${escapeHtml(userConv.user_name || 'Customer')}</span> <span style="font-size: 12px; font-weight: normal; color: #64748b; margin-left: 6px;">📍 ${escapeHtml(country)} (${escapeHtml(ip)})</span>`;
      document.getElementById('adminChatSelectedEmail').textContent = userConv.user_email || '';
      document.getElementById('adminChatSelectedVip').textContent = `${userConv.vip_level || 'Bronze'} VIP`;
      document.getElementById('adminChatSelectedBalance').textContent = `$${parseFloat(userConv.balance || 0).toFixed(2)}`;
    }

    loadChatConversations();
    await loadActiveUserMessages();
  };

  async function loadActiveUserMessages() {
    if (!state.activeChatUserId) return;
    try {
      const res = await AdminAPI.get(`/api/admin/chat/${state.activeChatUserId}`);
      const container = document.getElementById('adminChatMessagesContainer');
      if (container && res && res.success && res.messages) {
        if (res.messages.length === 0) {
          container.innerHTML = `<div style="text-align: center; color: #94a3b8; margin: auto; font-size: 13px;">No message history. Type a message below to start chatting.</div>`;
        } else {
          container.innerHTML = res.messages.map(m => {
            const isUser = m.sender === 'user';
            return `
              <div style="align-self: ${isUser ? 'flex-start' : 'flex-end'}; max-width: 75%; background: ${isUser ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}; color: ${isUser ? '#1e293b' : '#ffffff'}; padding: 10px 14px; border-radius: 14px; ${isUser ? 'border-bottom-left-radius: 4px; border: 1px solid #e2e8f0;' : 'border-bottom-right-radius: 4px;'}; box-shadow: 0 2px 6px rgba(0,0,0,0.04); font-size: 13.5px;">
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px; color: ${isUser ? '#0284c7' : '#dcfce7'};">
                  ${isUser ? escapeHtml(m.sender_name || 'Customer') : 'Support Desk'}
                </div>
                <div>${escapeHtml(m.text || '')}</div>
                <div style="font-size: 10px; color: ${isUser ? '#94a3b8' : '#e2e8f0'}; text-align: right; margin-top: 4px;">
                  ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            `;
          }).join('');
          container.scrollTop = container.scrollHeight;
        }
      }
    } catch (e) {
      console.error('Error loading chat messages:', e);
    }
  }

  window.sendAdminReply = async function() {
    if (!state.activeChatUserId) return;
    const input = document.getElementById('adminReplyInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const container = document.getElementById('adminChatMessagesContainer');

    const tempBubble = document.createElement('div');
    tempBubble.style.cssText = 'align-self:flex-end;max-width:75%;background:#10b981;color:#fff;padding:10px 14px;border-radius:14px;border-bottom-right-radius:4px;font-size:13.5px;';
    tempBubble.innerHTML = `<div style="font-weight:700;font-size:11px;color:#dcfce7;">Support Desk</div><div>${escapeHtml(text)}</div><div style="font-size:10px;color:#e2e8f0;text-align:right;">Sending...</div>`;
    container.appendChild(tempBubble);
    container.scrollTop = container.scrollHeight;

    const res = await AdminAPI.post(`/api/admin/chat/${state.activeChatUserId}`, { text });
    if (res && res.success) {
      await loadActiveUserMessages();
      loadChatConversations();
    } else {
      AdminUI.toast('Send Error', (res && res.message) || 'Could not dispatch message', 'error');
    }
  };

  window.applyQuickReply = function(text) {
    const input = document.getElementById('adminReplyInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  };

  // ==========================================
  // ORDERS & TASKS CONTROL CENTER
  // ==========================================
  state.orders = [];
  state.tasks = [];
  state.products = [];

  window.loadOrders = async function() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const statusFilter = (document.getElementById('orderStatusFilter') || {}).value || 'ALL';
    let url = '/api/admin/orders';
    if (statusFilter && statusFilter !== 'ALL') url += `?status=${encodeURIComponent(statusFilter)}`;

    const res = await AdminAPI.get(url);
    if (res && res.success && Array.isArray(res.orders)) {
      state.orders = res.orders;
      renderOrdersTable(state.orders);
    } else {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load orders.</td></tr>`;
    }
  };

  window.filterOrdersTable = function() {
    const q = (document.getElementById('orderSearchInput') || {}).value || '';
    const cleanQ = q.trim().toLowerCase();
    if (!cleanQ) {
      renderOrdersTable(state.orders);
      return;
    }
    const filtered = (state.orders || []).filter(o => 
      (o.order_number && o.order_number.toLowerCase().includes(cleanQ)) ||
      (o.username && o.username.toLowerCase().includes(cleanQ)) ||
      (o.product_name && o.product_name.toLowerCase().includes(cleanQ))
    );
    renderOrdersTable(filtered);
  };

  function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">No matching orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      let statusBadge = '<span class="badge-status badge-secondary">Pending</span>';
      const st = (o.order_status || '').toUpperCase();
      if (st === 'COMPLETED') {
        statusBadge = '<span class="badge-status" style="background:#10b981; color:#fff;">COMPLETED</span>';
      } else if (st === 'PROCESSING') {
        statusBadge = '<span class="badge-status" style="background:#3b82f6; color:#fff;">PROCESSING</span>';
      } else if (st === 'SHORTFALL' || (o.payment_status || '').toUpperCase() === 'SHORTFALL') {
        statusBadge = '<span class="badge-status" style="background:#ef4444; color:#fff;">SHORTFALL / DEFICIT</span>';
      } else if (st === 'CANCELLED') {
        statusBadge = '<span class="badge-status" style="background:#64748b; color:#fff;">CANCELLED</span>';
      }

      const img = o.product_image || '/client/assets/uploads/products/outdoor_shed.jpg';
      const unitPr = parseFloat(o.unit_price || 0).toFixed(2);
      const gross = parseFloat(o.gross_amount || 0).toFixed(2);
      const comm = parseFloat(o.commission_amount || 0).toFixed(2);
      const dateStr = formatDate(o.created_at);

      let actionBtns = '';
      if (st === 'PROCESSING' || st === 'PENDING' || st === 'SHORTFALL') {
        actionBtns += `
          <button class="btn-action" style="background:#ef4444; color:white; padding:4px 8px; font-size:11px;" onclick="cancelOrder('${o.id}', true)">
            Cancel & Refund
          </button>
        `;
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 700; font-family: monospace; color: #1e293b;">${escapeHtml(o.order_number)}</div>
            <small style="color: #64748b;">ID: ${escapeHtml(o.id)}</small>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(o.username || 'User #' + o.user_id)}</div>
            <div style="font-size: 11px; color: #2563eb; font-weight: 600;">${escapeHtml(o.vip_level || 'Bronze')} VIP</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${img}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.onerror=null;this.src='/client/assets/uploads/products/outdoor_shed.jpg';" />
              <div style="max-width: 200px; font-size: 12.5px; font-weight: 600; color: #1e293b; line-height: 1.3;">
                ${escapeHtml(o.product_name)}
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 700;">$${unitPr}</div>
            <small style="color: #64748b;">Qty: ${o.quantity || 1}</small>
          </td>
          <td>
            <div style="font-weight: 800; color: #0f172a;">$${gross}</div>
            ${o.payment_status === 'SHORTFALL' ? '<span style="font-size: 10.5px; color: #ef4444; font-weight: 700;">Deficit Active</span>' : ''}
          </td>
          <td>
            <div style="font-weight: 700; color: #16a34a;">+$${comm}</div>
            <small style="color: #64748b;">${(parseFloat(o.commission_rate || 0.20) * 100).toFixed(0)}%</small>
          </td>
          <td>${statusBadge}</td>
          <td><small style="color: #475569;">${dateStr}</small></td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${actionBtns || '<span style="color:#94a3b8; font-size:12px;">--</span>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.cancelOrder = async function(orderId, refundUser = true) {
    if (!confirm('Are you sure you want to cancel this order? If confirmed, reserved balance will be refunded to user.')) return;
    try {
      const res = await AdminAPI.post(`/api/admin/orders/${orderId}/status`, { status: 'CANCELLED', refundUser });
      if (res && res.success) {
        AdminUI.toast('Order Cancelled', res.message, 'success');
        loadOrders();
        loadTasks();
        loadUsers();
      } else {
        AdminUI.toast('Cancellation Failed', (res && res.message) || 'Error cancelling order', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // TASKS QUEUE
  // -------------------------------------------------------------
  window.loadTasks = async function() {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/tasks');
    if (res && res.success && Array.isArray(res.tasks)) {
      state.tasks = res.tasks;
      renderTasksTable(state.tasks);
    } else {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load user tasks.</td></tr>`;
    }
  };

  function renderTasksTable(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;

    if (!tasks || tasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">No active tasks in user queues.</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks.map(t => {
      const isCompleted = t.status === 'completed';
      const statusBadge = isCompleted
        ? '<span class="badge-status" style="background:#10b981; color:#fff;">COMPLETED</span>'
        : '<span class="badge-status" style="background:#f59e0b; color:#fff;">PENDING REVIEW</span>';

      const pr = parseFloat(t.product_price || 0).toFixed(2);
      const comm = parseFloat(t.commission_amount || 0).toFixed(2);
      const deficitBadge = t.is_deficit
        ? `<span class="badge-status" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Deficit: $${parseFloat(t.deficit_amount || 0).toFixed(2)}</span>`
        : '<span style="color:#64748b; font-size:11.5px;">Normal</span>';

      return `
        <tr>
          <td><code style="font-size:11.5px; color:#475569;">${escapeHtml(t.id)}</code></td>
          <td><strong>${escapeHtml(t.order_number || 'N/A')}</strong></td>
          <td>
            <div style="font-weight:700;">${escapeHtml(t.username || 'User #' + t.user_id)}</div>
            <small style="color:#64748b;">Bal: $${parseFloat(t.user_balance || 0).toFixed(2)}</small>
          </td>
          <td>
            <div style="max-width: 220px; font-size: 12.5px; font-weight:600;">${escapeHtml(t.product_name)}</div>
          </td>
          <td><strong>$${pr}</strong></td>
          <td><strong style="color:#16a34a;">+$${comm}</strong></td>
          <td>${deficitBadge}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px;">
              ${!isCompleted ? `
                <button class="btn-action" style="background:#10b981; color:white; padding:4px 8px; font-size:11px;" onclick="forceCompleteTask('${t.id}')">
                  <i class="fa fa-check"></i> Complete
                </button>
                <button class="btn-action" style="background:#ef4444; color:white; padding:4px 8px; font-size:11px;" onclick="deleteTask('${t.id}')">
                  <i class="fa fa-trash"></i> Cancel & Refund
                </button>
              ` : '<span style="color:#94a3b8; font-size:12px;">Completed</span>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.forceCompleteTask = async function(taskId) {
    if (!confirm('Force complete this optimization task? This will release the principal order price + commission reward directly to the user.')) return;
    try {
      const res = await AdminAPI.post(`/api/admin/tasks/${taskId}/complete`);
      if (res && res.success) {
        AdminUI.toast('Task Completed', res.message, 'success');
        loadTasks();
        loadOrders();
        loadUsers();
      } else {
        AdminUI.toast('Failed', (res && res.message) || 'Error completing task', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', err.message, 'error');
    }
  };

  window.deleteTask = async function(taskId) {
    if (!confirm('Are you sure you want to cancel & delete this task? If pending, the reserved balance will be refunded to user.')) return;
    try {
      const res = await AdminAPI.delete(`/api/admin/tasks/${taskId}`);
      if (res && res.success) {
        AdminUI.toast('Task Deleted', res.message, 'success');
        loadTasks();
        loadOrders();
        loadUsers();
      } else {
        AdminUI.toast('Failed', (res && res.message) || 'Error deleting task', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // PRODUCTS CATALOG
  // -------------------------------------------------------------
  window.loadProducts = async function() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/products');
    if (res && res.success && Array.isArray(res.products)) {
      state.products = res.products;
      renderProductsTable(state.products);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load products.</td></tr>`;
    }
  };

  function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No products found in catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const img = p.image || '/client/assets/uploads/products/outdoor_shed.jpg';
      const activePill = p.is_active
        ? '<span class="badge-status" style="background:#10b981; color:#fff;">ACTIVE</span>'
        : '<span class="badge-status" style="background:#94a3b8; color:#fff;">INACTIVE</span>';

      return `
        <tr>
          <td>
            <img src="${img}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" onerror="this.onerror=null;this.src='/client/assets/uploads/products/outdoor_shed.jpg';" />
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; max-width: 320px;">${escapeHtml(p.name)}</div>
          </td>
          <td><span class="badge-status" style="background:#f1f5f9; color:#475569;">${escapeHtml(p.category || 'General')}</span></td>
          <td><strong style="font-size: 15px; color: #0f172a;">$${parseFloat(p.price || 0).toFixed(2)}</strong></td>
          <td>${activePill}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-action" style="background: #2563eb; color: white; padding: 4px 10px; font-size: 12px;" onclick="editProduct('${p.id}')">
                <i class="fa fa-edit"></i> Edit
              </button>
              <button class="btn-action" style="background: #ef4444; color: white; padding: 4px 10px; font-size: 12px;" onclick="deleteProduct('${p.id}')">
                <i class="fa fa-trash"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.openProductModal = function(prod = null) {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = prod ? prod.id : '';
    document.getElementById('productModalTitle').innerHTML = prod 
      ? '<i class="fa fa-edit" style="color:#2563eb;"></i> Edit Product'
      : '<i class="fa fa-box-open" style="color:#10b981;"></i> Add New Product';

    if (prod) {
      document.getElementById('prodName').value = prod.name || '';
      document.getElementById('prodPrice').value = prod.price || '';
      document.getElementById('prodCategory').value = prod.category || '';
      document.getElementById('prodImage').value = prod.image || '';
      document.getElementById('prodActive').checked = Boolean(prod.is_active);
    } else {
      document.getElementById('prodActive').checked = true;
    }

    AdminUI.openModal('productModal');
  };

  window.editProduct = function(prodId) {
    const prod = (state.products || []).find(p => String(p.id) === String(prodId));
    if (prod) openProductModal(prod);
  };

  window.submitProductForm = async function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('productId').value;
    const data = {
      name: document.getElementById('prodName').value,
      price: parseFloat(document.getElementById('prodPrice').value),
      category: document.getElementById('prodCategory').value,
      image: document.getElementById('prodImage').value,
      is_active: document.getElementById('prodActive').checked ? 1 : 0
    };

    try {
      let res;
      if (id) {
        res = await AdminAPI.put(`/api/admin/products/${id}`, data);
      } else {
        res = await AdminAPI.post('/api/admin/products', data);
      }
      if (res && res.success) {
        AdminUI.toast('Product Saved', res.message || 'Product catalog updated', 'success');
        AdminUI.closeModal('productModal');
        loadProducts();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Error saving product', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', err.message, 'error');
    }
  };

  window.deleteProduct = async function(prodId) {
    if (!confirm('Are you sure you want to delete this product from the catalog?')) return;
    try {
      const res = await AdminAPI.delete(`/api/admin/products/${prodId}`);
      if (res && res.success) {
        AdminUI.toast('Product Deleted', res.message, 'success');
        loadProducts();
      } else {
        AdminUI.toast('Error', (res && res.message) || 'Error deleting product', 'error');
      }
    } catch (err) {
      AdminUI.toast('Error', err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // LEDGER & AUDIT LOGS
  // -------------------------------------------------------------
  window.loadLedger = async function() {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/ledger');
    if (res && res.success && Array.isArray(res.transactions)) {
      renderLedgerTable(res.transactions);
    } else {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load financial ledger.</td></tr>`;
    }
  };

  function renderLedgerTable(transactions) {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">No wallet ledger transactions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = transactions.map(t => {
      const amt = parseFloat(t.amount || 0);
      const isPos = amt >= 0;
      const amtColor = isPos ? '#16a34a' : '#dc2626';
      const amtStr = (isPos ? '+' : '') + amt.toFixed(2);

      let badgeColor = '#64748b';
      if (t.transaction_type === 'ORDER_RESERVE') badgeColor = '#b45309';
      else if (t.transaction_type === 'ORDER_RELEASE') badgeColor = '#2563eb';
      else if (t.transaction_type === 'REWARD') badgeColor = '#16a34a';
      else if (t.transaction_type === 'DEPOSIT') badgeColor = '#10b981';
      else if (t.transaction_type === 'WITHDRAWAL') badgeColor = '#ef4444';
      else if (t.transaction_type === 'ADMIN_CREDIT') badgeColor = '#059669';
      else if (t.transaction_type === 'ADMIN_DEBIT') badgeColor = '#dc2626';

      return `
        <tr>
          <td><code style="font-size:11.5px;">${escapeHtml(t.id)}</code></td>
          <td><strong>${escapeHtml(t.username || 'User #' + t.user_id)}</strong></td>
          <td><span class="badge-status" style="background:${badgeColor}; color:#fff; font-size:10.5px;">${escapeHtml(t.transaction_type)}</span></td>
          <td><strong style="color:${amtColor}; font-size:14px;">${amtStr} USD</strong></td>
          <td>
            <span style="color:#64748b; font-size:12px;">$${parseFloat(t.balance_before || 0).toFixed(2)}</span>
            <i class="fa fa-arrow-right" style="font-size:10px; color:#94a3b8; margin:0 4px;"></i>
            <strong style="color:#0f172a; font-size:12.5px;">$${parseFloat(t.balance_after || 0).toFixed(2)}</strong>
          </td>
          <td><code style="font-size:11px; color:#475569;">${escapeHtml(t.reference || '--')}</code></td>
          <td><small style="color:#475569;">${escapeHtml(t.description || '--')}</small></td>
          <td><small style="color:#64748b;">${formatDate(t.created_at)}</small></td>
        </tr>
      `;
    }).join('');
  }

  window.loadAuditLogs = async function() {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/audit-logs');
    if (res && res.success && Array.isArray(res.logs)) {
      renderAuditLogsTable(res.logs);
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load audit logs.</td></tr>`;
    }
  };

  function renderAuditLogsTable(logs) {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No admin audit logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      let detailsStr = '';
      if (l.new_value) {
        try {
          detailsStr = typeof l.new_value === 'string' ? l.new_value : JSON.stringify(l.new_value);
        } catch (_) { detailsStr = String(l.new_value); }
      }

      return `
        <tr>
          <td><small style="color:#64748b;">${formatDate(l.created_at)}</small></td>
          <td><strong>${escapeHtml(l.admin_name || 'Admin #' + l.admin_id)}</strong></td>
          <td><span class="badge-status" style="background:#3b82f6; color:#fff; font-size:11px;">${escapeHtml(l.action)}</span></td>
          <td><span class="badge-status" style="background:#f1f5f9; color:#475569;">${escapeHtml(l.entity)}</span></td>
          <td><code style="font-size:11px;">${escapeHtml(l.entity_id || '--')}</code></td>
          <td><div style="max-width:280px; font-size:11.5px; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(detailsStr)}">${escapeHtml(detailsStr || '--')}</div></td>
          <td><small style="color:#64748b;">${escapeHtml(l.ip_address || '--')}</small></td>
        </tr>
      `;
    }).join('');
  }

  // -------------------------------------------------------------
  // CREATE ORDER & PUSH TASK MODAL
  // -------------------------------------------------------------
  window.openCreateOrderModal = async function(preselectedUserId = null) {
    document.getElementById('createOrderForm').reset();
    document.getElementById('orderModalQuantity').value = 1;
    document.getElementById('orderModalCommissionRate').value = 20;
    document.getElementById('orderModalPushTask').checked = true;

    // Populate Users dropdown
    const userSelect = document.getElementById('orderModalUserId');
    if (userSelect) {
      if (!state.users || state.users.length === 0) {
        await loadUsers();
      }
      userSelect.innerHTML = '<option value="">Select target merchant...</option>' + 
        (state.users || []).map(u => `
          <option value="${u.id}" ${preselectedUserId && String(u.id) === String(preselectedUserId) ? 'selected' : ''}>
            ${escapeHtml(u.fullname || u.username)} (${u.email}) - Bal: $${parseFloat(u.balance || 0).toFixed(2)} - ${u.vip_level || 'Bronze'} VIP
          </option>
        `).join('');
    }

    // Populate Products dropdown
    const prodSelect = document.getElementById('orderModalProductSelect');
    if (prodSelect) {
      if (!state.products || state.products.length === 0) {
        await loadProducts();
      }
      prodSelect.innerHTML = '<option value="">Custom Product / Manual Entry</option>' + 
        (state.products || []).map(p => `
          <option value="${p.id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}" data-image="${escapeHtml(p.image || '')}" data-category="${escapeHtml(p.category || 'General')}">
            ${escapeHtml(p.name)} - $${parseFloat(p.price).toFixed(2)}
          </option>
        `).join('');
    }

    onOrderUserChange();
    recalcOrderModal();
    AdminUI.openModal('createOrderModal');
  };

  window.onOrderUserChange = function() {
    const userSelect = document.getElementById('orderModalUserId');
    const statsCard = document.getElementById('orderUserStatsCard');
    if (!userSelect || !statsCard) return;

    const selectedId = userSelect.value;
    const user = (state.users || []).find(u => String(u.id) === String(selectedId));

    if (user) {
      statsCard.style.display = 'block';
      const bal = parseFloat(user.balance || 0);
      document.getElementById('orderUserWorkingBal').textContent = `$${bal.toFixed(2)}`;
      document.getElementById('orderUserWorkingBal').style.color = bal < 0 ? '#ef4444' : '#0f172a';
      document.getElementById('orderUserVip').textContent = `${user.vip_level || 'Bronze'} VIP`;
      const dailyCap = user.custom_daily_limit || (user.task_sequence_plan && user.task_sequence_plan.total_orders) || 5;
      document.getElementById('orderUserTasks').textContent = `${user.today_tasks_completed || 0} / ${dailyCap}`;

      // Pre-fill VIP commission rate
      const vipRates = { Bronze: 20, Silver: 30, Gold: 40, Diamond: 50 };
      const commRate = vipRates[user.vip_level] || 20;
      document.getElementById('orderModalCommissionRate').value = commRate;
    } else {
      statsCard.style.display = 'none';
    }

    recalcOrderModal();
  };

  window.onOrderProductSelect = function() {
    const prodSelect = document.getElementById('orderModalProductSelect');
    if (!prodSelect) return;
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];

    if (selectedOpt && selectedOpt.value) {
      document.getElementById('orderModalProductName').value = selectedOpt.getAttribute('data-name') || '';
      document.getElementById('orderModalUnitPrice').value = selectedOpt.getAttribute('data-price') || '';
      document.getElementById('orderModalCategory').value = selectedOpt.getAttribute('data-category') || 'General';
      document.getElementById('orderModalImage').value = selectedOpt.getAttribute('data-image') || '';
    }
    recalcOrderModal();
  };

  window.recalcOrderModal = function() {
    const unitPrice = parseFloat(document.getElementById('orderModalUnitPrice').value) || 0;
    const qty = parseInt(document.getElementById('orderModalQuantity').value, 10) || 1;
    const commRate = (parseFloat(document.getElementById('orderModalCommissionRate').value) || 20) / 100;

    const subtotal = Math.round(unitPrice * qty * 100) / 100;
    const gross = subtotal;
    const comm = Math.round(subtotal * commRate * 100) / 100;

    const userSelect = document.getElementById('orderModalUserId');
    const selectedId = userSelect ? userSelect.value : null;
    const user = (state.users || []).find(u => String(u.id) === String(selectedId));
    const availBal = user ? parseFloat(user.balance || 0) : 0;

    const shortfall = gross > availBal ? Math.round((gross - availBal) * 100) / 100 : 0.00;

    document.getElementById('orderBreakdownSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('orderBreakdownGross').textContent = `$${gross.toFixed(2)}`;
    document.getElementById('orderBreakdownAvailable').textContent = `$${availBal.toFixed(2)}`;
    
    const shortfallEl = document.getElementById('orderBreakdownShortfall');
    shortfallEl.textContent = `$${shortfall.toFixed(2)}`;
    shortfallEl.style.color = shortfall > 0 ? '#ef4444' : '#10b981';

    document.getElementById('orderBreakdownCommission').textContent = `+$${comm.toFixed(2)}`;
  };

  window.submitCreateOrder = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitCreateOrder');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Creating Order...';
    }

    const userSelect = document.getElementById('orderModalUserId');
    const selectedUserId = userSelect ? userSelect.value.trim() : '';
    if (!selectedUserId) {
      AdminUI.toast('Merchant Required', 'Please select a target merchant user from the dropdown.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Confirm & Create Order';
      }
      return;
    }

    const prodNameInput = document.getElementById('orderModalProductName');
    const productName = prodNameInput ? prodNameInput.value.trim() : '';
    if (!productName) {
      AdminUI.toast('Product Required', 'Please enter a product name.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Confirm & Create Order';
      }
      return;
    }

    const unitPriceInput = document.getElementById('orderModalUnitPrice');
    const unitPrice = unitPriceInput ? parseFloat(unitPriceInput.value) : 0;
    if (isNaN(unitPrice) || unitPrice <= 0) {
      AdminUI.toast('Valid Price Required', 'Please enter a valid unit price greater than 0.00.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Confirm & Create Order';
      }
      return;
    }

    const qtyInput = document.getElementById('orderModalQuantity');
    const quantity = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

    const commRateInput = document.getElementById('orderModalCommissionRate');
    const commissionRate = (commRateInput ? (parseFloat(commRateInput.value) || 20) : 20) / 100;

    const categoryInput = document.getElementById('orderModalCategory');
    const category = (categoryInput && categoryInput.value.trim()) || 'General';

    const imageInput = document.getElementById('orderModalImage');
    const productImage = (imageInput && imageInput.value.trim()) || '';

    const pushTaskInput = document.getElementById('orderModalPushTask');
    const pushAsTask = pushTaskInput ? pushTaskInput.checked : true;

    const payload = {
      userId: selectedUserId,
      productName,
      category,
      unitPrice,
      quantity,
      commissionRate,
      productImage,
      pushAsTask
    };

    // Auto-safety fallback: re-enable button after 15s if network freezes
    const safetyTimer = setTimeout(() => {
      if (btn && btn.disabled) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Confirm & Create Order';
      }
    }, 15000);

    try {
      const res = await AdminAPI.post('/api/admin/orders/create', payload);
      clearTimeout(safetyTimer);
      if (res && res.success) {
        AdminUI.toast('Order Created', res.message || 'Order created successfully!', 'success');
        AdminUI.closeModal('createOrderModal');
        if (typeof loadOrders === 'function') loadOrders();
        if (typeof loadTasks === 'function') loadTasks();
        if (typeof loadUsers === 'function') loadUsers();
      } else {
        AdminUI.toast('Creation Failed', (res && res.message) || 'Error creating order', 'error');
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Order creation error:', err);
      AdminUI.toast('Error', err.message || 'An unexpected error occurred while creating order', 'error');
    } finally {
      clearTimeout(safetyTimer);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Confirm & Create Order';
      }
    }
  };

  // Bind All Forms & Event Listeners
  document.addEventListener('DOMContentLoaded', () => {

    // Tab Navigation
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

        btn.classList.add('active');
        const target = document.getElementById(tabId);
        if (target) target.style.display = 'block';
        if (tabId === 'tabSessions') loadSessions();
        if (tabId === 'tabUsers') loadUsers();
        if (tabId === 'tabOrders') { loadOrders(); loadTasks(); }
        if (tabId === 'tabProducts') loadProducts();
        if (tabId === 'tabAudit') { loadLedger(); loadAuditLogs(); }
        if (tabId === 'tabDeposits') loadDeposits();
        if (tabId === 'tabWithdrawals') loadWithdrawals();
        if (tabId === 'tabKyc') loadKycSubmissions();
        if (tabId === 'tabStaff') loadStaff();
      });
    });

    // Toggle Password Visibility in Admin Login Modal
    const togglePass = document.getElementById('toggleAdminPass');
    const passInput = document.getElementById('adminPassword');
    if (togglePass && passInput) {
      togglePass.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          togglePass.classList.remove('fa-eye');
          togglePass.classList.add('fa-eye-slash');
        } else {
          passInput.type = 'password';
          togglePass.classList.remove('fa-eye-slash');
          togglePass.classList.add('fa-eye');
        }
      });
    }

    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        const res = await AdminAPI.post('/api/admin/login', { email, password });
        if (res && res.success) {
          AdminAPI.setToken(res.token);
          document.getElementById('adminLoginModal').style.display = 'none';
          AdminUI.toast('Signed In', res.message || 'Welcome to Admin Control Center', 'success');
          applyRolePermissions(res.admin ? res.admin.role : 'super_admin', res.admin);
          loadAllData();
          startAdminPolling();
        } else {
          AdminUI.toast('Login Failed', (res && res.message) || 'Invalid admin credentials', 'error');
        }
      });
    }

    // Admin Logout Button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', async () => {
        const confirmed = await AdminUI.confirm({
          title: 'Sign Out Administrator?',
          message: 'Are you sure you want to end your master admin session?',
          type: 'danger',
          confirmText: 'Yes, Sign Out'
        });
        if (!confirmed) return;

        await AdminAPI.post('/api/admin/logout', {});
        AdminAPI.setToken('');
        window.location.reload();
      });
    }

    // Edit User Form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
      editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (editUserForm.dataset.submitting === 'true') return;
        editUserForm.dataset.submitting = 'true';

        const submitBtn = editUserForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...'; }

        try {
          const userId = document.getElementById('editUserId').value;
          const vip_level = document.getElementById('editUserVip').value;
          const balance = document.getElementById('editUserBalance').value;
          const frozen_balance = document.getElementById('editUserFrozenBalance').value;
          const add_balance = document.getElementById('editUserAddBalance').value;
          const deduct_balance = document.getElementById('editUserDeductBalance').value;
          const status = document.getElementById('editUserStatus').value;
          const reset_tasks = document.getElementById('editUserResetTasks').checked;
          const customDailyEl = document.getElementById('editUserDailyLimit');
          const custom_daily_limit = customDailyEl ? customDailyEl.value.trim() : '';

          const kycStatusEl = document.getElementById('editUserKycStatus');
          const kyc_status = kycStatusEl ? kycStatusEl.value : undefined;

          const res = await AdminAPI.post('/api/admin/users/update', {
            userId, vip_level, balance, frozen_balance, add_balance, deduct_balance, status, reset_tasks, custom_daily_limit, kyc_status
          });

          if (res && res.success) {
            // Immediately update state.users so next modal open shows correct (fresh) balance
            if (res.user) {
              const idx = state.users.findIndex(u => String(u.id) === String(userId));
              if (idx !== -1) state.users[idx] = res.user;
            }
            AdminUI.closeModal('editUserModal');
            AdminUI.toast('User Updated', res.message || 'Changes saved successfully.', 'success');
            loadUsers();
            loadMetrics();
          } else {
            AdminUI.toast('Update Failed', (res && res.message) || 'Error updating user', 'error');
          }
        } catch (err) {
          AdminUI.toast('Update Failed', err.message || 'Error updating user', 'error');
        } finally {
          editUserForm.dataset.submitting = 'false';
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes'; }
        }
      });
    }

    // Reset Password Form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('resetPassUserId').value;
        const newPassword = document.getElementById('newDirectPassword').value.trim();

        const res = await AdminAPI.post('/api/admin/users/reset-password', { userId, newPassword });
        if (res && res.success) {
          AdminUI.closeModal('resetPasswordModal');
          AdminUI.toast('Password Reset', res.message, 'success');
        } else {
          AdminUI.toast('Reset Failed', (res && res.message) || 'Error resetting password', 'error');
        }
      });
    }

    // Create Staff Form
    const createStaffForm = document.getElementById('createStaffForm');
    if (createStaffForm) {
      createStaffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('staffFullName').value.trim();
        const email = document.getElementById('staffEmail').value.trim();
        const password = document.getElementById('staffPassword').value;
        const role = document.getElementById('staffRole').value;

        const res = await AdminAPI.post('/api/admin/staff/create', { fullname, email, password, role });
        if (res && res.success) {
          AdminUI.closeModal('createStaffModal');
          createStaffForm.reset();
          AdminUI.toast('Sub-Admin Created', res.message, 'success');
          loadStaff();
        } else {
          AdminUI.toast('Creation Failed', (res && res.message) || 'Error creating sub-admin', 'error');
        }
      });
    }

    // Assign Task / Deficit Form
    const assignTaskForm = document.getElementById('assignTaskForm');
    if (assignTaskForm) {
      const assignTaskProductCategory = document.getElementById('assignTaskProductCategory');
      const assignTaskCategoryProduct = document.getElementById('assignTaskCategoryProduct');
      if (assignTaskProductCategory) {
        assignTaskProductCategory.addEventListener('change', window.populateAssignTaskCategoryProducts);
      }
      if (assignTaskCategoryProduct) {
        assignTaskCategoryProduct.addEventListener('change', window.applyAssignTaskCategoryProduct);
      }

      assignTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('assignTaskUserId').value;
        const orderNum = document.getElementById('assignTaskOrderNum').value;
        const deficitAmount = document.getElementById('assignTaskDeficitAmount').value;
        const productName = document.getElementById('assignTaskProductName').value;
        const productPrice = document.getElementById('assignTaskProductPrice').value;
        const productCategory = document.getElementById('assignTaskProductCategory')?.value || '';
        const categoryProduct = document.getElementById('assignTaskCategoryProduct')?.value || '';
        const pushImmediate = document.getElementById('assignTaskPushImmediate')?.checked || false;

        const res = await AdminAPI.post('/api/admin/users/assign-task', {
          userId,
          orderNum,
          deficitAmount,
          productName,
          productPrice,
          productCategory,
          categoryProduct,
          pushImmediate
        });

        if (res && res.success) {
          AdminUI.closeModal('assignTaskModal');
          AdminUI.toast('Task Assigned', res.message, 'success');
          loadUsers();
          loadSessions();
          loadMetrics();
        } else {
          AdminUI.toast('Assignment Failed', (res && res.message) || 'Error saving task override', 'error');
        }
      });
    }

    // Sequence Plan Form Submit Listener
    const sequencePlanForm = document.getElementById('sequencePlanForm');
    if (sequencePlanForm) {
      sequencePlanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('assignTaskUserId').value;
        if (!userId) return;

        const applyBalance = document.getElementById('seqPlanApplyBalance')?.checked || false;
        const balanceInput = document.getElementById('seqPlanBalanceInput')?.value;
        const balance = applyBalance && balanceInput !== '' ? parseFloat(balanceInput) : undefined;
        const totalOrders = parseInt(document.getElementById('seqPlanTotalOrders')?.value || 5, 10);
        const resetProgress = document.getElementById('seqPlanResetProgress')?.checked || false;

        const tbody = document.getElementById('seqPlanStepsTbody');
        const stepRows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
        const steps = stepRows.map((row, idx) => {
          const orderNum = parseInt(row.dataset.orderNum, 10) || (idx + 1);
          const amt = parseFloat(row.querySelector('.seq-step-amt')?.value || 0);
          const isDef = row.querySelector('.seq-step-deficit')?.value === 'true';
          const defAmt = isDef ? parseFloat(row.querySelector('.seq-step-defamt')?.value || 0) : 0;
          return {
            order_num: orderNum,
            amount: amt,
            is_deficit: isDef,
            deficit_amount: defAmt
          };
        });

        const res = await AdminAPI.post('/api/admin/users/sequence-plan', {
          userId,
          balance,
          totalOrders,
          steps,
          resetProgress
        });

        if (res && res.success) {
          AdminUI.closeModal('assignTaskModal');
          AdminUI.toast('Sequence Plan Activated', res.message, 'success');
          loadUsers();
          loadSessions();
          loadMetrics();
        } else {
          AdminUI.toast('Plan Error', (res && res.message) || 'Error saving sequence plan', 'error');
        }
      });
    }

    // Edit Staff Form
    const editStaffForm = document.getElementById('editStaffForm');
    if (editStaffForm) {
      editStaffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editStaffId').value;
        const fullname = document.getElementById('editStaffFullName').value.trim();
        const role = document.getElementById('editStaffRole').value;
        const status = document.getElementById('editStaffStatus').value;
        const newPassword = document.getElementById('editStaffNewPassword').value;

        const res = await AdminAPI.post('/api/admin/staff/update', { id, fullname, role, status, newPassword });
        if (res && res.success) {
          AdminUI.closeModal('editStaffModal');
          AdminUI.toast('Staff Updated', res.message, 'success');
          loadStaff();
        } else {
          AdminUI.toast('Update Failed', (res && res.message) || 'Error updating staff', 'error');
        }
      });
    }

    // System Settings Form
    const systemSettingsForm = document.getElementById('systemSettingsForm');
    if (systemSettingsForm) {
      systemSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
          trc20_address: document.getElementById('setTrc20').value.trim(),
          erc20_address: document.getElementById('setErc20').value.trim(),
          btc_address: document.getElementById('setBtc').value.trim(),
          min_deposit: parseFloat(document.getElementById('setMinDeposit').value) || 20,
          min_withdraw: parseFloat(document.getElementById('setMinWithdraw').value) || 30,
          telegram_support: document.getElementById('setTelegram').value.trim(),
          whatsapp_support: document.getElementById('setWhatsapp').value.trim(),
          new_admin_password: document.getElementById('setAdminPassword').value
        };

        const res = await AdminAPI.post('/api/admin/settings', settings);
        if (res && res.success) {
          document.getElementById('setAdminPassword').value = '';
          AdminUI.toast('Settings Saved', res.message, 'success');
        } else {
          AdminUI.toast('Save Failed', (res && res.message) || 'Error saving settings', 'error');
        }
      });
    }

    // Chat Send Button & Enter Key
    const sendBtn = document.getElementById('adminSendReplyBtn');
    if (sendBtn) sendBtn.addEventListener('click', sendAdminReply);

    const replyInput = document.getElementById('adminReplyInput');
    if (replyInput) {
      replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendAdminReply();
        }
      });
    }

    // Close Modals on Backdrop Click
    document.querySelectorAll('.admin-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    // Check Authentication & Load Data
    checkAuthAndLoad();

    // Auto-poll metrics, sessions and chat every 4 seconds
    setInterval(() => {
      loadMetrics();
      loadSessions();
      loadChatConversations();
      const chatTab = document.getElementById('tabChat');
      if (chatTab && chatTab.style.display !== 'none' && state.activeChatUserId) {
        loadActiveUserMessages();
      }
    }, 4000);
  });


  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Tab switcher helper for navigation from notifications
  window.switchAdminTab = function(tabId) {
    const btn = document.querySelector(`.admin-tab-btn[data-tab="${tabId}"]`);
    if (btn) {
      btn.click();
    }
    const dropdown = document.getElementById('adminNotifDropdown');
    if (dropdown) dropdown.style.display = 'none';
  };

  // Admin Notification Bell Dropdown Handler
  (function initAdminNotifBell() {
    const bellBtn = document.getElementById('adminNotificationBellBtn');
    const dropdown = document.getElementById('adminNotifDropdown');
    const closeBtn = document.getElementById('adminNotifCloseBtn');
    const listEl = document.getElementById('adminNotifList');

    if (!bellBtn || !dropdown) return;

    let isOpen = false;

    function renderAdminNotifList() {
      const m = state.metrics || {};
      const items = [];

      if ((m.pendingDeposits || 0) > 0) {
        items.push({
          icon: '💳', label: 'Pending Deposits',
          desc: `${m.pendingDeposits} new deposit awaiting verification`,
          count: m.pendingDeposits, color: '#3b82f6',
          tabId: 'tabDeposits'
        });
      }
      if ((m.pendingWithdrawals || 0) > 0) {
        items.push({
          icon: '🏦', label: 'Pending Withdrawals',
          desc: `${m.pendingWithdrawals} withdrawal payout request pending`,
          count: m.pendingWithdrawals, color: '#f59e0b',
          tabId: 'tabWithdrawals'
        });
      }
      if ((m.pendingKycs || 0) > 0) {
        items.push({
          icon: '📋', label: 'KYC Document Reviews',
          desc: `${m.pendingKycs} identity verification waiting`,
          count: m.pendingKycs, color: '#8b5cf6',
          tabId: 'tabKyc'
        });
      }
      if ((m.unreadChats || 0) > 0) {
        items.push({
          icon: '💬', label: 'Unread Customer Chats',
          desc: `${m.unreadChats} message from active users`,
          count: m.unreadChats, color: '#10b981',
          tabId: 'tabChat'
        });
      }
      if ((m.openTickets || 0) > 0) {
        items.push({
          icon: '🎫', label: 'Open Support Tickets',
          desc: `${m.openTickets} inquiry waiting response`,
          count: m.openTickets, color: '#ef4444',
          tabId: 'tabChat'
        });
      }

      if (!listEl) return;

      if (items.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; color: #94a3b8; padding: 36px 16px; font-size: 13px;">
            <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
            <div style="font-weight: 700; color: #475569; font-size: 14px;">All caught up!</div>
            <div style="font-size: 12px; margin-top: 4px; color: #94a3b8;">No pending deposits, withdrawals, or KYC requests.</div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = items.map(item => `
        <div onclick="switchAdminTab('${item.tabId}')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f8fafc;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: ${item.color}15; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            ${item.icon}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13px; color: #1e293b;">${escapeHtml(item.label)}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.desc)}</div>
          </div>
          <div style="background: ${item.color}; color: #fff; font-size: 11px; font-weight: 800; border-radius: 12px; padding: 3px 9px; min-width: 22px; text-align: center; box-shadow: 0 2px 6px ${item.color}40;">
            ${item.count}
          </div>
        </div>
      `).join('');
    }

    async function toggleDropdown(open) {
      isOpen = open !== undefined ? open : !isOpen;
      dropdown.style.display = isOpen ? 'block' : 'none';
      if (isOpen) {
        renderAdminNotifList();
        try {
          await loadMetrics();
          renderAdminNotifList();
        } catch (_) {}
      }
    }

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(false);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (isOpen && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
        toggleDropdown(false);
      }
    });
  })();

})();
