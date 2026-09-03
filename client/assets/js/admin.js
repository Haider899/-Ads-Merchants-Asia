/**
 * Ads Merchants Asia - Master Admin Control Center Engine
 * Pure Vanilla JavaScript - 100% Robust & Self-Contained
 */

(function() {
  'use strict';

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
        return await res.json();
      } catch (err) {
        console.error('API Error:', err);
        return { success: false, message: err.message || 'Network connection failed' };
      }
    },
    get(url) { return this.request(url, { method: 'GET' }); },
    post(url, data) { return this.request(url, { method: 'POST', body: JSON.stringify(data) }); }
  };

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

  // 1. Initial Authentication Check
  async function checkAuthAndLoad() {
    const res = await AdminAPI.get('/api/admin/metrics');
    if (res && res.success) {
      document.getElementById('adminLoginModal').style.display = 'none';
      loadAllData();
      startAdminPolling();
    } else {
      document.getElementById('adminLoginModal').style.display = 'flex';
    }
  }

  window.loadAllData = async function() {
    loadMetrics();
    loadUsers();
    loadStaff();
    loadKycs();
    loadDeposits();
    loadWithdrawals();
    loadSettings();
    loadChatConversations();
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
    }
  }

  // 3. Users Management
  window.loadUsers = async function() {
    const res = await AdminAPI.get('/api/admin/users');
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (res && res.success && res.users) {
      state.users = res.users;
      if (state.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">No registered users found.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.users.map(u => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(u.fullname || u.username || 'User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(u.username || 'user')}</div>
            <small style="color: #94a3b8; font-size: 11px;">ID: ${u.id}</small>
          </td>
          <td>
            <div style="font-weight: 600; color: #334155;">${escapeHtml(u.email)}</div>
            <small style="color: #64748b; font-size: 11.5px;"><i class="fa fa-phone mr-1"></i>${escapeHtml(u.phone || 'No phone')}</small>
          </td>
          <td><span class="badge-status badge-primary">${u.vip_level} VIP</span></td>
          <td style="font-weight: 800; color: #10b981; font-size: 14.5px;">$${parseFloat(u.balance || 0).toFixed(2)}</td>
          <td style="font-weight: 700; color: #64748b;">$${parseFloat(u.frozen_balance || 0).toFixed(2)}</td>
          <td style="font-weight: 700; color: #0284c7;">+$${parseFloat(u.today_profit || 0).toFixed(2)}</td>
          <td>
            <span class="badge-status badge-${(u.kyc_status || 'none').toLowerCase()}">
              ${(u.kyc_status || 'none').toUpperCase()}
            </span>
          </td>
          <td><span class="badge-status badge-${u.status === 'active' ? 'active' : 'banned'}">${(u.status || 'active').toUpperCase()}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-action btn-edit" onclick="openEditUserModal('${u.id}')">
                <i class="fa fa-pen"></i> Edit
              </button>
              <button class="btn-action btn-reset" onclick="openPasswordResetModal('${u.id}')" title="Reset Password">
                <i class="fa fa-key"></i> Reset Pass
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #dc2626;">Failed to load user accounts.</td></tr>`;
    }
  };

  window.openEditUserModal = function(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = `${user.fullname} (@${user.username}) - ${user.email}`;
    document.getElementById('editUserVip').value = user.vip_level;
    document.getElementById('editUserBalance').value = user.balance;
    document.getElementById('editUserFrozenBalance').value = user.frozen_balance || 0;
    document.getElementById('editUserAddBalance').value = '';
    document.getElementById('editUserStatus').value = user.status;
    document.getElementById('editUserResetTasks').checked = false;
    AdminUI.openModal('editUserModal');
  };

  window.openPasswordResetModal = function(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('resetPassUserId').value = user.id;
    document.getElementById('resetPassUserName').textContent = `${user.fullname} (@${user.username}) [${user.email}]`;
    document.getElementById('newDirectPassword').value = '';
    AdminUI.openModal('resetPasswordModal');
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
            ` : `<small style="color: #64748b; font-weight: 600;">Resolved (${d.status})</small>`}
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
      ` : ''}
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
      const notes = await AdminUI.prompt({
        title: 'Reject Deposit Request',
        message: 'Reason for rejection (e.g. Unverified blockchain transaction hash):',
        placeholder: 'Enter rejection reason (optional)',
        type: 'danger',
        required: false,
        confirmText: 'Reject Deposit'
      });
      if (notes === null) return;
      const finalNotes = (notes || '').trim() || 'Invalid transaction hash / receipt';

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
      tbody.innerHTML = state.withdrawals.map(w => `
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
            <div><strong style="font-size: 13px;">${w.method || 'USDT'} (${w.network || 'TRC20'})</strong></div>
            <code style="font-size: 11px;">${w.wallet_address || (w.bank_name ? w.bank_name + ' - ' + w.account_number : 'Address Pending')}</code>
          </td>
          <td><span class="badge-status badge-${(w.status || 'pending').toLowerCase()}">${w.status}</span></td>
          <td>
            ${w.status === 'pending' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn-action btn-approve" onclick="confirmWithdrawAction('${w.id}', 'approve')"><i class="fa fa-check"></i> Approve (Paid)</button>
                <button class="btn-action btn-reject" onclick="confirmWithdrawAction('${w.id}', 'reject')"><i class="fa fa-undo"></i> Reject & Refund</button>
              </div>
            ` : `<small style="color: #64748b; font-weight: 600;">Resolved (${w.status})</small>`}
          </td>
        </tr>
      `).join('');
    }
  };

  window.confirmWithdrawAction = async function(withdrawalId, action) {
    const w = state.withdrawals.find(item => item.id === withdrawalId);
    const amountStr = w ? `$${parseFloat(w.amount).toFixed(2)}` : 'payout';

    if (action === 'approve') {
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

        listEl.innerHTML = res.conversations.map(c => {
          const unread = c.unread_count || c.unread_admin_count || 0;
          return `
            <div class="admin-chat-user-item ${state.activeChatUserId === c.user_id ? 'active' : ''}" onclick="selectChatUser('${c.user_id}')" style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; background: ${state.activeChatUserId === c.user_id ? '#eff6ff' : '#ffffff'}; transition: background 0.15s ease;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="font-weight: 700; font-size: 13.5px; color: #0f172a;">${escapeHtml(c.user_name || 'Customer')}</div>
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
      document.getElementById('adminChatSelectedName').textContent = userConv.user_name || 'Customer';
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
        const userId = document.getElementById('editUserId').value;
        const vip_level = document.getElementById('editUserVip').value;
        const balance = document.getElementById('editUserBalance').value;
        const frozen_balance = document.getElementById('editUserFrozenBalance').value;
        const add_balance = document.getElementById('editUserAddBalance').value;
        const status = document.getElementById('editUserStatus').value;
        const reset_tasks = document.getElementById('editUserResetTasks').checked;

        const res = await AdminAPI.post('/api/admin/users/update', {
          userId, vip_level, balance, frozen_balance, add_balance, status, reset_tasks
        });

        if (res && res.success) {
          AdminUI.closeModal('editUserModal');
          AdminUI.toast('User Updated', res.message, 'success');
          loadUsers();
          loadMetrics();
        } else {
          AdminUI.toast('Update Failed', (res && res.message) || 'Error updating user', 'error');
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

    // Auto-poll metrics and chat every 4 seconds
    setInterval(() => {
      loadMetrics();
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

})();
