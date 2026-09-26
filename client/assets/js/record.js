// Records Page Controller
let currentTab = 'all';
let allTasksList = [];
let currentUserInfo = {};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formatDate(dateVal) {
    if (!dateVal) return 'Just now';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        let hours = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hStr = String(hours).padStart(2, '0');
        return `${y}-${m}-${day} --- ${hStr}:${mins} ${ampm}`;
    } catch (_) {
        return dateVal;
    }
}

function isDateToday(dateVal) {
    if (!dateVal) return false;
    try {
        const d = new Date(dateVal);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    } catch (_) {
        return false;
    }
}

function isTaskCompleted(t) {
    if (!t) return false;
    const s = String(t.status || '').toLowerCase().trim();
    return s === 'completed' || s === 'approved' || s === 'complete' || s === 'done';
}

function isTaskCancelled(t) {
    const status = String((t && (t.status || t.order_status || t.payment_status)) || '').toLowerCase().trim();
    return status === 'cancelled' || status === 'canceled';
}

function isTaskPending(t) {
    return !isTaskCancelled(t) && !isTaskCompleted(t);
}

function renderEmptyState(icon, message, subtext = '') {
    return `
        <div class="record-empty-state">
            <div class="empty-state-icon">${icon}</div>
            <div style="font-weight: 700; color: #334155;">${escapeHtml(message)}</div>
            ${subtext ? `<div style="font-size: 12.5px; color: #94a3b8; max-width: 280px;">${escapeHtml(subtext)}</div>` : ''}
        </div>
    `;
}

function renderTaskCard(task, activeTabContext = 'all', userDeficitInfo = {}) {
    const isCompleted = isTaskCompleted(task);
    const isDeficit = Boolean(task.is_deficit || parseFloat(task.deficit_amount || 0) > 0 || (!isCompleted && userDeficitInfo.is_deficit));
    const deficitAmt = parseFloat(task.deficit_amount || userDeficitInfo.deficit_amount || 0).toFixed(2);

    let imgUrl = task.product_image || '/client/assets/uploads/products/outdoor_shed.jpg';
    if (!imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
        imgUrl = '/' + imgUrl;
    }

    const totalAmount = parseFloat(task.product_price || task.total_amount || 0).toFixed(2);
    let profit = parseFloat(task.commission_amount !== undefined && task.commission_amount !== null ? task.commission_amount : (task.commission_earned || task.profit || 0));
    if (!profit || profit <= 0) {
        const rate = parseFloat(task.commission_rate || 0.20);
        profit = parseFloat((parseFloat(totalAmount) * rate).toFixed(2));
    }
    const profitStr = profit.toFixed(2);
    const dateStr = formatDate(isCompleted ? (task.completed_at || task.created_at) : task.created_at);

    // Deficit alert banner for pending orders with deficit / shortfall
    let deficitBannerHtml = '';
    if (!isCompleted && isDeficit) {
        deficitBannerHtml = `
            <div class="deficit-alert-box">
                <div class="deficit-alert-top">
                    <span class="deficit-tag">Shortfall Required</span>
                    <span class="deficit-val">-USD $${deficitAmt}</span>
                </div>
                <div class="deficit-msg">
                    This order requires account shortfall clearance before it can be finalized.
                </div>
                <div class="deficit-btn-row">
                    <a href="depositData" class="deposit-shortcut-btn">Deposit Shortfall</a>
                </div>
            </div>
        `;
    }

    // Submit button: ONLY shown for pending tasks
    const submitBtnHtml = isCompleted
        ? ''
        : `<button type="button" data-id="${task.id}" class="submit-btn submit-btn-${task.id}">Submit</button>`;

    // Status pill: completed or pending
    const statusPill = isCompleted
        ? `<div class="completed-pill-outline">completed</div>`
        : `<div class="pending-pill-outline">pending</div>`;

    return `
        <div class="record-item-tab-field" id="record-${task.id}">
            ${deficitBannerHtml}

            <div class="record-item-tab-field-up">
                <img src="${imgUrl}" alt="" class="record-item-image" onerror="this.onerror=null;this.src='/client/assets/uploads/products/outdoor_shed.jpg';">
                <div class="record-item-description">${escapeHtml(task.product_name || task.title)}</div>
            </div>

            <div class="record-item-tab-field-down">
                <div class="record-item-tab-field-down-item">
                    <div class="tiny-text">Total Amount</div>
                    <div class="small-text">USD ${totalAmount}</div>
                </div>
                <div class="record-item-tab-field-down-item">
                    <div class="tiny-text">Profit</div>
                    <div class="small-text">USD ${profitStr}</div>
                </div>
                <div class="record-item-tab-field-down-item">
                    ${submitBtnHtml}
                </div>
            </div>

            <div class="record-item-tab-title">
                <div class="record-item-tab-title-left">${dateStr}</div>
                <div class="record-item-tab-title-right">
                    ${statusPill}
                </div>
            </div>
        </div>
    `;
}

function renderActiveTab() {
    const container = document.getElementById('recordsContainer') || document.getElementById('allRecords');
    if (!container) return;

    if (currentTab === 'pending') {
        // STRICT FILTER: ONLY pending tasks
        const pendingList = allTasksList.filter(isTaskPending);
        if (pendingList.length > 0) {
            container.innerHTML = pendingList.map(t => renderTaskCard(t, 'pending', currentUserInfo)).join('');
        } else {
            container.innerHTML = renderEmptyState('🎉', 'No pending orders', 'You have completed all pending tasks for now.');
        }
    } else if (currentTab === 'completed') {
        // STRICT FILTER: ONLY completed tasks
        const completedList = allTasksList.filter(isTaskCompleted);
        const todayCompletedList = completedList.filter(t => t.is_completed_today === true || isDateToday(t.completed_at || t.created_at));
        const listToRender = todayCompletedList.length > 0 ? todayCompletedList : completedList;

        if (listToRender.length > 0) {
            container.innerHTML = listToRender.map(t => renderTaskCard(t, 'completed', currentUserInfo)).join('');
        } else {
            container.innerHTML = renderEmptyState('📅', 'No completed orders', 'Orders you complete will appear here.');
        }
    } else {
        // ALL TAB: Shows all orders (pending and completed)
        if (allTasksList.length > 0) {
            container.innerHTML = allTasksList.map(t => renderTaskCard(t, 'all', currentUserInfo)).join('');
        } else {
            container.innerHTML = renderEmptyState('📦', 'No order records yet', 'Your orders and tasks will appear here once generated.');
        }
    }

    // Bind Submit Buttons
    container.querySelectorAll('.submit-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const taskId = this.getAttribute('data-id');
            if (!taskId) return;
            await submitOrderFromRecord(taskId, this);
        });
    });
}

function switchRecordTab(tabName) {
    currentTab = tabName;

    const allBtn = document.getElementById('allBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    const completedBtn = document.getElementById('completedBtn');

    if (allBtn) allBtn.classList.toggle('record-nav-item-active', tabName === 'all');
    if (pendingBtn) pendingBtn.classList.toggle('record-nav-item-active', tabName === 'pending');
    if (completedBtn) completedBtn.classList.toggle('record-nav-item-active', tabName === 'completed');

    renderActiveTab();
}

function bindTabButtons() {
    const allBtn = document.getElementById('allBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    const completedBtn = document.getElementById('completedBtn');

    if (allBtn) {
        allBtn.onclick = function(e) {
            if (e) e.preventDefault();
            switchRecordTab('all');
        };
    }
    if (pendingBtn) {
        pendingBtn.onclick = function(e) {
            if (e) e.preventDefault();
            switchRecordTab('pending');
        };
    }
    if (completedBtn) {
        completedBtn.onclick = function(e) {
            if (e) e.preventDefault();
            switchRecordTab('completed');
        };
    }
}

// Backward compatibility
function allBtnClick() { switchRecordTab('all'); }
function pendingBtnClick() { switchRecordTab('pending'); }
function completedBtnClick() { switchRecordTab('completed'); }

// Expose on window
window.switchRecordTab = switchRecordTab;
window.allBtnClick = allBtnClick;
window.pendingBtnClick = pendingBtnClick;
window.completedBtnClick = completedBtnClick;
window.loadTaskRecords = loadTaskRecords;

async function loadTaskRecords() {
    try {
        bindTabButtons();
        const res = await fetch('/api/tasks/records');
        const data = await res.json();

        if (!data || !data.success) {
            const container = document.getElementById('recordsContainer') || document.getElementById('allRecords');
            if (container) container.innerHTML = renderEmptyState('⚠️', 'Unable to load orders', 'Please check your connection and try again.');
            return;
        }

        const records = (data.all_tasks || data.tasks || []).filter(task => !isTaskCancelled(task));
        const uniqueRecords = new Map();
        records.forEach(task => {
            const key = task.order_number ? `order:${task.order_number}` : `id:${task.id}`;
            if (!uniqueRecords.has(key)) uniqueRecords.set(key, task);
        });
        allTasksList = Array.from(uniqueRecords.values());
        currentUserInfo = data.user || {};

        renderActiveTab();

    } catch (err) {
        console.error('Error loading task records:', err);
        const container = document.getElementById('recordsContainer') || document.getElementById('allRecords');
        if (container) container.innerHTML = renderEmptyState('⚠️', 'Error loading records', 'Please refresh the page.');
    }
}

async function submitOrderFromRecord(taskId, btn) {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Submitting...';

    try {
        const res = await fetch('/api/tasks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.textContent = oldText;

        if (data && data.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Success!',
                    text: data.message || 'Order completed successfully!',
                    icon: 'success',
                    confirmButtonColor: '#16a34a'
                }).then(() => {
                    loadTaskRecords();
                });
            } else {
                alert(data.message || 'Order completed successfully!');
                loadTaskRecords();
            }
        } else {
            const froz = data && (data.userFrozenBalance || data.deficit_amount);
            if (data && (data.reachedLimit || froz || (data.message && (data.message.includes('frozen limit') || data.message.includes('deficit'))))) {
                const deficitVal = froz ? parseFloat(froz).toFixed(2) : '25.00';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: "Shortfall Deposit Required",
                        icon: "warning",
                        html: `<div style="font-size: 14.5px; line-height: 1.5; color: #334155;">This order exceeds your working balance.<br>Required Shortfall: <strong style="color: #ef4444; font-size: 16px;">USD $${deficitVal}</strong>.<br><br>Please clear the shortfall to complete this order.</div>`,
                        showCancelButton: true,
                        confirmButtonColor: '#2563eb',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Deposit Shortfall',
                        cancelButtonText: 'Contact Support'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'depositData';
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            window.location.href = 'contactData';
                        }
                    });
                } else {
                    alert(`Shortfall Deposit Required! Your balance has a shortfall of USD $${deficitVal}. Please clear the shortfall.`);
                }
            } else {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Notice',
                        text: (data && data.message) || 'Insufficient balance or task could not be submitted.',
                        icon: 'warning',
                        confirmButtonColor: '#2563eb'
                    });
                } else {
                    alert((data && data.message) || 'Insufficient balance or task could not be submitted.');
                }
            }
        }
    } catch (err) {
        btn.disabled = false;
        btn.textContent = oldText;
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error!', 'Network error processing your request.', 'error');
        } else {
            alert('Network error processing your request.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    bindTabButtons();
    switchRecordTab('all');
    loadTaskRecords();
});
