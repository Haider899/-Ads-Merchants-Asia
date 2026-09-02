/**
 * ADS MERCHANTS ASIA - MASTER ADMIN CONTROL ENGINE
 * High-end UI/UX with SweetAlert2 modals, Receipt Inspector, KYC Document Zoomer, and Complete Account Controls.
 */

(function() {
  const AdminAPI = {
    getToken() {
      return localStorage.getItem('admin_token') || '';
    },
    setToken(token) {
      localStorage.setItem('admin_token', token);
    },
    clearToken() {
      localStorage.removeItem('admin_token');
    },
    async request(endpoint, options = {}) {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
        ...(options.headers || {})
      };

      try {
        const res = await fetch(endpoint, { ...options, headers });
        if (res.status === 401) {
          document.getElementById('adminLoginModal').style.display = 'flex';
          return { success: false, message: 'Admin authentication required' };
        }
        return await res.json();
      } catch (err) {
        console.error('Admin API Error:', err);
        return { success: false, message: 'Network connection error' };
      }
    },
    get(endpoint) {
      return this.request(endpoint, { method: 'GET' });
    },
    post(endpoint, body) {
      return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }
  };

  // Toast notification
  window.showAdminToast = function(title, message, type = 'info') {
    if (window.Swal) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type === 'success' ? 'success' : (type === 'error' ? 'error' : 'info'),
        title: title,
        text: message,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true
      });
      return;
    }

    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999999;display:flex;flex-direction:column;gap:10px;max-width:380px;width:calc(100% - 40px);';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bg = type === 'success' ? '#2ec4b6' : (type === 'error' ? '#e71d36' : '#4361ee');
    toast.style.cssText = `background:${bg};color:#fff;padding:14px 18px;border-radius:10px;box-shadow:0 8px 25px rgba(0,0,0,0.25);font-size:14px;`;
    toast.innerHTML = `<div style="font-weight:800;margin-bottom:2px;">${title}</div><div style="font-size:13px;opacity:0.95;">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  let state = {
    users: [],
    kycs: [],
    deposits: [],
    withdrawals: [],
    metrics: {}
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAuth();
    initModals();
    checkAuthAndLoad();
  });

  function initTabs() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.style.display = 'block';
      });
    });
  }

  function initAuth() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const btn = document.getElementById('adminLoginBtn');

        btn.disabled = true;
        btn.textContent = 'Verifying Credentials...';

        const res = await AdminAPI.post('/api/admin/login', { email, password });
        btn.disabled = false;
        btn.textContent = 'Unlock Control Center';

        if (res && res.success && res.token) {
          AdminAPI.setToken(res.token);
          document.getElementById('adminLoginModal').style.display = 'none';
          showAdminToast('Access Granted', 'Master Control Center Unlocked', 'success');
          loadAllData();
        } else {
          showAdminToast('Access Denied', (res && res.message) || 'Invalid admin credentials', 'error');
        }
      });
    }

    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await AdminAPI.post('/api/admin/logout', {});
        AdminAPI.clearToken();
        window.location.reload();
      });
    }
  }

  async function checkAuthAndLoad() {
    const res = await AdminAPI.get('/api/admin/metrics');
    if (res && res.success) {
      document.getElementById('adminLoginModal').style.display = 'none';
      loadAllData();
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

  // 1. Users Management
  window.loadUsers = async function() {
    const res = await AdminAPI.get('/api/admin/users');
    const tbody = document.getElementById('usersTableBody');
    if (res && res.success && res.users) {
      state.users = res.users;
      if (state.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No registered users found.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.users.map(u => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(u.fullname || u.username || 'User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(u.username || 'user')}</div>
            <small class="text-muted">ID: ${u.id}</small>
          </td>
          <td>
            <div style="font-weight: 600; color: #334155;">${escapeHtml(u.email)}</div>
            <small class="text-muted"><i class="fa fa-phone mr-1"></i>${escapeHtml(u.phone || 'No phone')}</small>
          </td>
          <td><span class="badge badge-primary" style="padding: 5px 8px; font-weight: 700;">${u.vip_level} VIP</span></td>
          <td class="font-weight-bold text-success" style="font-size: 14.5px;">$${parseFloat(u.balance).toFixed(2)}</td>
          <td class="text-muted font-weight-bold">$${parseFloat(u.frozen_balance || 0).toFixed(2)}</td>
          <td class="text-info font-weight-bold">+$${parseFloat(u.today_profit || 0).toFixed(2)}</td>
          <td>
            <span class="badge ${u.kyc_status === 'approved' ? 'badge-success' : (u.kyc_status === 'pending' ? 'badge-warning' : 'badge-secondary')}" style="font-weight: 700;">
              ${(u.kyc_status || 'none').toUpperCase()}
            </span>
          </td>
          <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}" style="font-weight: 700;">${(u.status || 'active').toUpperCase()}</span></td>
          <td>
            <div class="btn-group">
              <button class="btn-action btn-edit mr-1" onclick="openEditUserModal('${u.id}')">
                <i class="fa fa-pen"></i> Edit
              </button>
              <button class="btn-action btn-reject" style="background: #64748b;" onclick="openPasswordResetModal('${u.id}')" title="Reset Password">
                <i class="fa fa-key"></i> Reset Pass
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Failed to load user accounts.</td></tr>`;
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
    $('#editUserModal').modal('show');
  };

  window.openPasswordResetModal = function(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('resetPassUserId').value = user.id;
    document.getElementById('resetPassUserName').textContent = `${user.fullname} (@${user.username}) [${user.email}]`;
    document.getElementById('newDirectPassword').value = '';
    $('#resetPasswordModal').modal('show');
  };

  // 2. KYC / Identity Document Verification (Clean pill buttons, no broken images)
  window.loadKycs = async function() {
    const res = await AdminAPI.get('/api/admin/kyc');
    const tbody = document.getElementById('kycTableBody');
    if (res && res.success && res.submissions) {
      state.kycs = res.submissions;
      if (state.kycs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No KYC verification requests found.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.kycs.map(k => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(k.name || k.fullname || 'Applicant')}</div>
            ${k.username ? `<div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(k.username)}</div>` : ''}
            <small class="text-muted">${escapeHtml(k.user_email)}</small>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary font-weight-bold py-1 px-2" style="font-size: 12px; border-radius: 6px;" onclick="zoomKycDoc('${k.id}', 'front')">
              <i class="fa fa-id-card mr-1"></i> View Front ID
            </button>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary font-weight-bold py-1 px-2" style="font-size: 12px; border-radius: 6px;" onclick="zoomKycDoc('${k.id}', 'back')">
              <i class="fa fa-id-card mr-1"></i> View Back ID
            </button>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-secondary font-weight-bold py-1 px-2" style="font-size: 12px; border-radius: 6px;" onclick="zoomKycDoc('${k.id}', 'sig')">
              <i class="fa fa-signature mr-1"></i> View Signature
            </button>
          </td>
          <td class="font-weight-bold text-primary">$${parseFloat(k.investment_amount || 0).toFixed(2)}</td>
          <td>
            <span class="badge-status badge-${k.status}">${k.status}</span>
            ${k.rejection_reason ? `<div style="font-size: 11px; color: #e71d36; margin-top: 3px;">Note: ${k.rejection_reason}</div>` : ''}
          </td>
          <td>
            ${k.status === 'pending' || k.status === 'reupload_required' ? `
              <button class="btn-action btn-approve mr-1" onclick="confirmKycAction('${k.id}', 'approve')"><i class="fa fa-check"></i> Approve</button>
              <button class="btn-action btn-reject mr-1" onclick="confirmKycAction('${k.id}', 'reject')"><i class="fa fa-times"></i> Reject</button>
              <button class="btn-action btn-edit" style="background: #ff9f1c;" onclick="confirmKycAction('${k.id}', 'reupload')"><i class="fa fa-redo"></i> Re-upload</button>
            ` : `<small class="text-muted">Completed (${k.status})</small>`}
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

    zoomImage(src, title);
  };

  // SweetAlert2 KYC Confirmation
  window.confirmKycAction = async function(kycId, action) {
    const kyc = state.kycs.find(k => k.id === kycId);
    const applicantName = kyc ? (kyc.name || kyc.fullname) : 'User';

    if (action === 'approve') {
      const result = await Swal.fire({
        title: 'Approve KYC Verification?',
        text: `Are you sure you want to approve merchant documents for ${applicantName}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2ec4b6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Approve Verification',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'approve' });
        if (res && res.success) {
          Swal.fire('Approved!', res.message, 'success');
          loadKycs();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    } else if (action === 'reject') {
      const { value: reason } = await Swal.fire({
        title: 'Reject KYC Submission',
        input: 'text',
        inputLabel: 'Please enter the rejection reason for the applicant:',
        inputPlaceholder: 'e.g. Document image is blurry or expired',
        showCancelButton: true,
        confirmButtonColor: '#e71d36',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Reject Submission',
        inputValidator: (value) => {
          if (!value) return 'You need to write a rejection reason!';
        }
      });

      if (reason) {
        const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'reject', reason });
        if (res && res.success) {
          Swal.fire('Rejected', res.message, 'info');
          loadKycs();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    } else if (action === 'reupload') {
      const { value: reason } = await Swal.fire({
        title: 'Request Document Re-upload',
        input: 'text',
        inputLabel: 'Specify which document needs to be re-uploaded:',
        inputPlaceholder: 'e.g. Back side of ID is missing/edges cropped',
        showCancelButton: true,
        confirmButtonColor: '#ff9f1c',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Request Re-upload',
        inputValidator: (value) => {
          if (!value) return 'Please specify instructions for the user!';
        }
      });

      if (reason) {
        const res = await AdminAPI.post('/api/admin/kyc/action', { kycId, action: 'reupload', reason });
        if (res && res.success) {
          Swal.fire('Requested', res.message, 'warning');
          loadKycs();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    }
  };

  // 3. Deposits & Receipts (Always show stylish View Receipt button)
  window.loadDeposits = async function() {
    const res = await AdminAPI.get('/api/admin/deposits');
    const tbody = document.getElementById('depositsTableBody');
    if (res && res.success && res.deposits) {
      state.deposits = res.deposits;
      if (state.deposits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No deposit records.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.deposits.map(d => `
        <tr>
          <td>
            <div class="font-weight-bold" style="font-family: monospace; font-size: 12px; color: #475569;">${d.id}</div>
            <small class="text-muted">${new Date(d.created_at).toLocaleString()}</small>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(d.fullname || d.username || 'Merchant User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(d.username || 'user')}</div>
            <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(d.user_email)}</div>
          </td>
          <td class="font-weight-bold text-success" style="font-size: 15px;">+$${parseFloat(d.amount).toFixed(2)}</td>
          <td><span class="badge badge-info" style="padding: 4px 8px; font-weight: 700;">${d.method}</span></td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <code style="font-size: 11px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${d.txid}</code>
              <button class="btn btn-sm btn-outline-primary font-weight-bold py-1 px-2" style="font-size: 12px; border-radius: 6px;" onclick="zoomDepositReceipt('${d.id}')">
                <i class="fa fa-receipt mr-1"></i> View Receipt
              </button>
            </div>
          </td>
          <td><span class="badge-status badge-${d.status}">${d.status}</span></td>
          <td>
            ${d.status === 'pending' ? `
              <button class="btn-action btn-approve mr-1" onclick="confirmDepositAction('${d.id}', 'approve')"><i class="fa fa-check"></i> Approve (Credit)</button>
              <button class="btn-action btn-reject" onclick="confirmDepositAction('${d.id}', 'reject')"><i class="fa fa-times"></i> Reject</button>
            ` : `<small class="text-muted">Resolved (${d.status})</small>`}
          </td>
        </tr>
      `).join('');
    }
  };

  // Dedicated High-Resolution Receipt & Proof Modal
  window.zoomDepositReceipt = function(depositId) {
    const dep = state.deposits.find(d => d.id === depositId);
    if (!dep) return;

    let receiptModal = document.getElementById('receiptInspectorModal');
    if (!receiptModal) {
      receiptModal = document.createElement('div');
      receiptModal.id = 'receiptInspectorModal';
      receiptModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.9);display:flex;align-items:center;justify-content:center;z-index:99999999;padding:20px;backdrop-filter:blur(6px);';
      document.body.appendChild(receiptModal);
    }

    const proofImgSrc = dep.proof_image || 'assets/uploads/contracts/id_sample_front.png';

    receiptModal.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.5);font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:16px 16px 0 0;">
          <h5 style="margin:0;font-weight:800;font-size:17px;color:#0f172a;"><i class="fa fa-receipt text-primary mr-2"></i> Payment Receipt & Proof Inspector</h5>
          <button onclick="document.getElementById('receiptInspectorModal').style.display='none'" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div style="padding:24px;">
          <div style="text-align:center;margin-bottom:20px;background:#f1f5f9;border-radius:12px;padding:12px;border:1px solid #e2e8f0;">
            <img src="${proofImgSrc}" style="max-height:340px;max-width:100%;border-radius:8px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1);" alt="Receipt Screenshot" />
            <div style="margin-top:8px;">
              <a href="${proofImgSrc}" target="_blank" class="btn btn-sm btn-light border" style="font-size:12px;font-weight:700;"><i class="fa fa-external-link-alt mr-1"></i> Open Original Resolution</a>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#f8fafc;padding:16px;border-radius:12px;margin-bottom:20px;font-size:13.5px;">
            <div><span class="text-muted">Deposit ID:</span> <strong>${dep.id}</strong></div>
            <div><span class="text-muted">User Account:</span> <strong>${escapeHtml(dep.fullname || dep.username || 'User')} (${dep.user_email})</strong></div>
            <div><span class="text-muted">Deposit Amount:</span> <strong style="color:#2ec4b6;font-size:16px;">+$${parseFloat(dep.amount).toFixed(2)}</strong></div>
            <div><span class="text-muted">Payment Method:</span> <span class="badge badge-info">${dep.method}</span></div>
            <div style="grid-column: span 2;">
              <span class="text-muted">Blockchain TxHash:</span>
              <div style="background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #cbd5e1;font-family:monospace;font-size:12px;word-break:break-all;margin-top:4px;">
                ${dep.txid}
              </div>
            </div>
            <div><span class="text-muted">Status:</span> <span class="badge-status badge-${dep.status}">${dep.status}</span></div>
            <div><span class="text-muted">Timestamp:</span> <small>${new Date(dep.created_at).toLocaleString()}</small></div>
          </div>
          ${dep.status === 'pending' ? `
            <div style="display:flex;gap:10px;">
              <button class="btn btn-success flex-grow-1 py-2 font-weight-bold" onclick="document.getElementById('receiptInspectorModal').style.display='none';confirmDepositAction('${dep.id}', 'approve');"><i class="fa fa-check mr-1"></i> Approve & Credit Balance</button>
              <button class="btn btn-danger flex-grow-1 py-2 font-weight-bold" onclick="document.getElementById('receiptInspectorModal').style.display='none';confirmDepositAction('${dep.id}', 'reject');"><i class="fa fa-times mr-1"></i> Reject Deposit</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    receiptModal.style.display = 'flex';
    receiptModal.onclick = (e) => {
      if (e.target === receiptModal) receiptModal.style.display = 'none';
    };
  };

  // SweetAlert2 Deposit Action
  window.confirmDepositAction = async function(depositId, action) {
    const dep = state.deposits.find(d => d.id === depositId);
    const amountStr = dep ? `$${parseFloat(dep.amount).toFixed(2)}` : 'funds';

    if (action === 'approve') {
      const result = await Swal.fire({
        title: `Approve Deposit of ${amountStr}?`,
        text: `The deposit will be immediately verified and ${amountStr} will be credited to the user's working balance.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2ec4b6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Approve & Credit',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const res = await AdminAPI.post('/api/admin/deposits/action', { depositId, action: 'approve' });
        if (res && res.success) {
          Swal.fire('Approved!', res.message, 'success');
          loadDeposits();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    } else if (action === 'reject') {
      const { value: notes } = await Swal.fire({
        title: 'Reject Deposit Request',
        input: 'text',
        inputLabel: 'Reason for rejection (e.g. Unverified blockchain hash):',
        inputPlaceholder: 'Enter rejection notes',
        showCancelButton: true,
        confirmButtonColor: '#e71d36',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Reject Deposit',
        inputValidator: (value) => {
          if (!value) return 'Please enter a rejection reason!';
        }
      });

      if (notes) {
        const res = await AdminAPI.post('/api/admin/deposits/action', { depositId, action: 'reject', notes });
        if (res && res.success) {
          Swal.fire('Rejected', res.message, 'info');
          loadDeposits();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    }
  };

  // 4. Withdrawals & Payouts with SweetAlert2
  window.loadWithdrawals = async function() {
    const res = await AdminAPI.get('/api/admin/withdrawals');
    const tbody = document.getElementById('withdrawalsTableBody');
    if (res && res.success && res.withdrawals) {
      state.withdrawals = res.withdrawals;
      if (state.withdrawals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No withdrawal requests recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = state.withdrawals.map(w => `
        <tr>
          <td>
            <div class="font-weight-bold" style="font-family: monospace; font-size: 12px; color: #475569;">${w.id}</div>
            <small class="text-muted">${new Date(w.created_at).toLocaleString()}</small>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(w.fullname || w.username || 'Merchant User')}</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: 600;">@${escapeHtml(w.username || 'user')}</div>
            <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(w.user_email)}</div>
          </td>
          <td class="font-weight-bold text-danger" style="font-size: 15px;">-$${parseFloat(w.amount).toFixed(2)}</td>
          <td>
            <div><strong style="font-size: 13px;">${w.method} (${w.network || 'TRC20'})</strong></div>
            <code style="font-size: 11px;">${w.wallet_address || (w.bank_name + ' - ' + w.iban)}</code>
          </td>
          <td><span class="badge-status badge-${w.status}">${w.status}</span></td>
          <td>
            ${w.status === 'pending' ? `
              <button class="btn-action btn-approve mr-1" onclick="confirmWithdrawAction('${w.id}', 'approve')"><i class="fa fa-check"></i> Approve (Paid)</button>
              <button class="btn-action btn-reject" onclick="confirmWithdrawAction('${w.id}', 'reject')"><i class="fa fa-undo"></i> Reject & Refund</button>
            ` : `<small class="text-muted">Resolved (${w.status})</small>`}
          </td>
        </tr>
      `).join('');
    }
  };

  window.confirmWithdrawAction = async function(withdrawalId, action) {
    const w = state.withdrawals.find(item => item.id === withdrawalId);
    const amountStr = w ? `$${parseFloat(w.amount).toFixed(2)}` : 'payout';

    if (action === 'approve') {
      const result = await Swal.fire({
        title: `Confirm Payout of ${amountStr}?`,
        text: `Mark withdrawal request of ${amountStr} as paid and released to user wallet/bank.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2ec4b6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Mark Paid & Complete',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const res = await AdminAPI.post('/api/admin/withdrawals/action', { withdrawalId, action: 'approve' });
        if (res && res.success) {
          Swal.fire('Paid!', res.message, 'success');
          loadWithdrawals();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    } else if (action === 'reject') {
      const { value: notes } = await Swal.fire({
        title: 'Reject & Refund Withdrawal',
        input: 'text',
        inputLabel: `Enter rejection reason (${amountStr} will be refunded back to user's working balance):`,
        inputPlaceholder: 'e.g. Incomplete receiving bank details',
        showCancelButton: true,
        confirmButtonColor: '#e71d36',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Reject & Refund',
        inputValidator: (value) => {
          if (!value) return 'Please provide a reason for the refund!';
        }
      });

      if (notes) {
        const res = await AdminAPI.post('/api/admin/withdrawals/action', { withdrawalId, action: 'reject', notes });
        if (res && res.success) {
          Swal.fire('Refunded', res.message, 'info');
          loadWithdrawals();
          loadUsers();
          loadMetrics();
        } else {
          Swal.fire('Error', (res && res.message) || 'Action failed', 'error');
        }
      }
    }
  };

  // 5. Settings & Wallets
  window.loadSettings = async function() {
    const res = await AdminAPI.get('/api/admin/settings');
    if (res && res.success && res.settings) {
      const s = res.settings;
      if (document.getElementById('setTrc20')) document.getElementById('setTrc20').value = s.trc20_address || '';
      if (document.getElementById('setErc20')) document.getElementById('setErc20').value = s.erc20_address || '';
      if (document.getElementById('setBtc')) document.getElementById('setBtc').value = s.btc_address || '';
      if (document.getElementById('setMinDeposit')) document.getElementById('setMinDeposit').value = s.min_deposit || 20;
      if (document.getElementById('setMinWithdraw')) document.getElementById('setMinWithdraw').value = s.min_withdraw || 30;
      if (document.getElementById('setTelegram')) document.getElementById('setTelegram').value = s.telegram_support || '';
      if (document.getElementById('setWhatsapp')) document.getElementById('setWhatsapp').value = s.whatsapp_support || '';
    }
  };

  // Modals & Image Zoomer
  function initModals() {
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
          userId,
          vip_level,
          balance: add_balance ? undefined : balance,
          frozen_balance,
          add_balance,
          status,
          reset_tasks
        });

        if (res && res.success) {
          $('#editUserModal').modal('hide');
          showAdminToast('User Updated', res.message, 'success');
          loadUsers();
          loadMetrics();
        } else {
          showAdminToast('Error', (res && res.message) || 'Update failed', 'error');
        }
      });
    }

    const resetPassForm = document.getElementById('resetPasswordForm');
    if (resetPassForm) {
      resetPassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('resetPassUserId').value;
        const newPassword = document.getElementById('newDirectPassword').value;

        if (!newPassword || newPassword.length < 6) {
          showAdminToast('Validation', 'Password must be at least 6 characters.', 'error');
          return;
        }

        const res = await AdminAPI.post('/api/admin/users/reset-password', { userId, newPassword });
        if (res && res.success) {
          $('#resetPasswordModal').modal('hide');
          showAdminToast('Password Reset', res.message, 'success');
        } else {
          showAdminToast('Error', (res && res.message) || 'Reset failed', 'error');
        }
      });
    }

    const settingsForm = document.getElementById('systemSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await AdminAPI.post('/api/admin/settings', {
          trc20_address: document.getElementById('setTrc20').value,
          erc20_address: document.getElementById('setErc20').value,
          btc_address: document.getElementById('setBtc').value,
          min_deposit: document.getElementById('setMinDeposit').value,
          min_withdraw: document.getElementById('setMinWithdraw').value,
          telegram_support: document.getElementById('setTelegram').value,
          whatsapp_support: document.getElementById('setWhatsapp').value,
          new_admin_password: document.getElementById('setAdminPassword').value
        });

        if (res && res.success) {
          showAdminToast('Settings Saved', res.message, 'success');
          document.getElementById('setAdminPassword').value = '';
        } else {
          showAdminToast('Error', (res && res.message) || 'Could not update settings', 'error');
        }
      });
    }
  }

  // ==========================================
  // LIVE CUSTOMER CHAT & TICKETS CONTROLLER
  // ==========================================
  let activeChatUserId = null;
  let chatConversationsCache = [];
  let chatMessagesCache = [];

  window.loadChatConversations = async function() {
    try {
      const res = await AdminAPI.get('/api/admin/chat/conversations');
      const listEl = document.getElementById('adminConversationsList');
      if (!listEl) return;

      if (res && res.success && res.conversations) {
        chatConversationsCache = res.conversations;
        renderConversationsList(chatConversationsCache);

        // Update total unread badge
        const totalUnread = chatConversationsCache.reduce((acc, c) => acc + (c.unread_admin_count || 0), 0);
        const badgeEl = document.getElementById('adminChatUnreadBadge');
        if (badgeEl) {
          if (totalUnread > 0) {
            badgeEl.textContent = totalUnread;
            badgeEl.style.display = 'inline-block';
          } else {
            badgeEl.style.display = 'none';
          }
        }
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  function renderConversationsList(conversations) {
    const listEl = document.getElementById('adminConversationsList');
    if (!listEl) return;

    if (conversations.length === 0) {
      listEl.innerHTML = `<div class="text-center text-muted py-5" style="font-size: 13px;">No active chat conversations yet.</div>`;
      return;
    }

    listEl.innerHTML = conversations.map(c => {
      const isActive = c.user_id === activeChatUserId;
      const time = new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div onclick="selectChatUser('${c.user_id}')" style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; background: ${isActive ? '#ffffff' : 'transparent'}; border-left: ${isActive ? '4px solid #00875a' : '4px solid transparent'}; transition: all 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(c.user_name || 'Customer')}
            </div>
            <small class="text-muted" style="font-size: 11px;">${time}</small>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; color: #64748b; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${c.last_sender === 'admin' ? '<strong style="color: #00875a;">You: </strong>' : ''}${escapeHtml(c.last_message)}
            </div>
            ${c.unread_admin_count > 0 ? `
              <span class="badge badge-danger" style="border-radius: 10px; font-size: 10px; padding: 2px 6px;">${c.unread_admin_count}</span>
            ` : ''}
          </div>
          <div style="margin-top: 4px; display: flex; gap: 6px;">
            <span class="badge badge-light border" style="font-size: 10px;">${c.vip_level || 'Bronze'} VIP</span>
            <span class="badge badge-light border text-success" style="font-size: 10px;">$${parseFloat(c.balance || 0).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  window.filterChatUsers = function(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      renderConversationsList(chatConversationsCache);
      return;
    }
    const filtered = chatConversationsCache.filter(c => 
      (c.user_name && c.user_name.toLowerCase().includes(q)) || 
      (c.user_email && c.user_email.toLowerCase().includes(q)) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    );
    renderConversationsList(filtered);
  };

  window.selectChatUser = async function(userId) {
    activeChatUserId = userId;
    renderConversationsList(chatConversationsCache);

    const noSelection = document.getElementById('adminChatNoSelection');
    const mainContent = document.getElementById('adminChatMainContent');
    if (noSelection) noSelection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'flex';

    await loadActiveUserMessages();
    setTimeout(() => {
      const input = document.getElementById('adminReplyInput');
      if (input) input.focus();
    }, 50);
  };

  async function loadActiveUserMessages() {
    if (!activeChatUserId) return;
    try {
      const res = await AdminAPI.get(`/api/admin/chat/${activeChatUserId}`);
      if (res && res.success) {
        if (res.user) {
          document.getElementById('adminChatSelectedName').textContent = res.user.fullname || res.user.email;
          document.getElementById('adminChatSelectedEmail').textContent = res.user.email;
          document.getElementById('adminChatSelectedVip').textContent = `${res.user.vip_level || 'Bronze'} VIP`;
          document.getElementById('adminChatSelectedBalance').textContent = `$${parseFloat(res.user.balance || 0).toFixed(2)}`;
        }

        const container = document.getElementById('adminChatMessagesContainer');
        if (container && res.messages) {
          chatMessagesCache = res.messages;
          container.innerHTML = res.messages.map(m => {
            const isAdmin = m.sender === 'admin';
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (isAdmin) {
              return `
                <div style="align-self: flex-end; max-width: 75%; background: #00875a; color: #ffffff; padding: 10px 14px; border-radius: 14px; border-bottom-right-radius: 4px; font-size: 13.5px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                  <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px; color: #bbf7d0;">You (Admin Support)</div>
                  <div>${escapeHtml(m.text)}</div>
                  <div style="font-size: 10px; color: #e2e8f0; margin-top: 4px; text-align: right;">${time}</div>
                </div>
              `;
            } else {
              return `
                <div style="align-self: flex-start; max-width: 75%; background: #ffffff; color: #0f172a; padding: 10px 14px; border-radius: 14px; border-bottom-left-radius: 4px; font-size: 13.5px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                  <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px; color: #0284c7;">${escapeHtml(m.user_name || 'Customer')}</div>
                  <div>${escapeHtml(m.text)}</div>
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${time}</div>
                </div>
              `;
            }
          }).join('');
          container.scrollTop = container.scrollHeight;
        }
      }
    } catch (e) {
      console.error('Error loading chat messages:', e);
    }
  }

  window.sendAdminReply = async function() {
    if (!activeChatUserId) return;
    const input = document.getElementById('adminReplyInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const container = document.getElementById('adminChatMessagesContainer');

    // Optimistic UI bubble
    const tempBubble = document.createElement('div');
    tempBubble.style.cssText = 'align-self:flex-end;max-width:75%;background:#00875a;color:#fff;padding:10px 14px;border-radius:14px;border-bottom-right-radius:4px;font-size:13.5px;';
    tempBubble.innerHTML = `<div style="font-weight:700;font-size:11px;color:#bbf7d0;">You (Admin Support)</div><div>${escapeHtml(text)}</div><div style="font-size:10px;color:#e2e8f0;text-align:right;">Sending...</div>`;
    container.appendChild(tempBubble);
    container.scrollTop = container.scrollHeight;

    const res = await AdminAPI.post(`/api/admin/chat/${activeChatUserId}`, { text });
    if (res && res.success) {
      await loadActiveUserMessages();
      loadChatConversations();
    } else {
      showAdminToast('Send Error', (res && res.message) || 'Could not dispatch message', 'error');
    }
  };

  window.applyQuickReply = function(text) {
    const input = document.getElementById('adminReplyInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  };

  // STAFF & SUB-ADMIN MANAGEMENT
  window.loadStaff = async function() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const res = await AdminAPI.get('/api/admin/staff');
    if (res && res.success && res.staff) {
      if (res.staff.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No sub-admin accounts registered yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.staff.map(s => {
        const isSuper = s.role === 'super_admin';
        const roleBadge = isSuper 
          ? `<span class="badge badge-primary px-2 py-1" style="font-weight:700;">Super Admin</span>`
          : (s.role === 'support' 
              ? `<span class="badge badge-info px-2 py-1" style="font-weight:700;">Support Operator</span>`
              : (s.role === 'finance'
                  ? `<span class="badge badge-success px-2 py-1" style="font-weight:700;">Finance Officer</span>`
                  : `<span class="badge badge-warning text-dark px-2 py-1" style="font-weight:700;">Sub-Admin</span>`));

        const statusBadge = s.status === 'active'
          ? `<span class="badge badge-success px-2 py-1" style="font-weight:700;">ACTIVE</span>`
          : `<span class="badge badge-danger px-2 py-1" style="font-weight:700;">SUSPENDED</span>`;

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #1e293b;">${escapeHtml(s.fullname)}</div>
              <small class="text-muted">ID: ${s.id}</small>
            </td>
            <td>
              <span style="font-family: monospace; font-weight: 600; color: #0284c7;">${escapeHtml(s.email)}</span>
            </td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td><small class="text-muted">${new Date(s.created_at).toLocaleString()}</small></td>
            <td>
              <button class="btn btn-sm btn-outline-primary mr-1" onclick="openEditStaffModal('${s.id}', '${escapeHtml(s.fullname)}', '${s.role}', '${s.status}')">
                <i class="fa fa-edit"></i> Edit
              </button>
              ${!isSuper ? `
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStaff('${s.id}', '${escapeHtml(s.fullname)}')">
                  <i class="fa fa-trash"></i>
                </button>
              ` : `<span class="text-muted small" style="font-weight:600;">(Protected)</span>`}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load staff accounts.</td></tr>`;
    }
  };

  window.openEditStaffModal = function(id, fullname, role, status) {
    document.getElementById('editStaffId').value = id;
    document.getElementById('editStaffFullName').value = fullname;
    document.getElementById('editStaffRole').value = role;
    document.getElementById('editStaffStatus').value = status;
    document.getElementById('editStaffNewPassword').value = '';
    $('#editStaffModal').modal('show');
  };

  window.deleteStaff = async function(id, fullname) {
    if (window.Swal) {
      const result = await Swal.fire({
        title: 'Revoke Admin Access?',
        text: `Are you sure you want to permanently delete sub-admin "${fullname}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Delete Account'
      });
      if (!result.isConfirmed) return;
    } else {
      if (!confirm(`Are you sure you want to delete sub-admin "${fullname}"?`)) return;
    }

    const res = await AdminAPI.post('/api/admin/staff/delete', { id });
    if (res && res.success) {
      showAdminToast('Sub-Admin Deleted', res.message, 'success');
      loadStaff();
    } else {
      showAdminToast('Delete Error', (res && res.message) || 'Could not delete staff account', 'error');
    }
  };

  // Bind send and staff event handlers
  document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('adminSendReplyBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', sendAdminReply);
    }
    const input = document.getElementById('adminReplyInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendAdminReply();
        }
      });
    }

    // Create Staff Form Handler
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
          $('#createStaffModal').modal('hide');
          createStaffForm.reset();
          showAdminToast('Sub-Admin Created', res.message, 'success');
          loadStaff();
        } else {
          showAdminToast('Creation Failed', (res && res.message) || 'Error creating sub-admin', 'error');
        }
      });
    }

    // Edit Staff Form Handler
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
          $('#editStaffModal').modal('hide');
          showAdminToast('Staff Updated', res.message, 'success');
          loadStaff();
        } else {
          showAdminToast('Update Failed', (res && res.message) || 'Error updating staff', 'error');
        }
      });
    }

    // Auto-poll metrics, pending action counters, and chat every 4 seconds
    setInterval(() => {
      loadMetrics();
      loadChatConversations();
      const chatTab = document.getElementById('tabChat');
      if (chatTab && chatTab.style.display !== 'none' && activeChatUserId) {
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
