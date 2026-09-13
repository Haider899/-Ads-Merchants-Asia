// Records Page Controller
let currentTab = 'all';

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
        return `${y}-${m}-${day} ${hStr}:${mins} ${ampm}`;
    } catch (_) {
        return dateVal;
    }
}

function switchRecordTab(tabName) {
    currentTab = tabName;

    const allBtn = document.getElementById('allBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    const completedBtn = document.getElementById('completedBtn');

    const allRecords = document.getElementById('allRecords');
    const pendingRecords = document.getElementById('pendingRecords');
    const completedRecords = document.getElementById('completedRecords');

    if (allBtn) allBtn.classList.toggle('record-nav-item-active', tabName === 'all');
    if (pendingBtn) pendingBtn.classList.toggle('record-nav-item-active', tabName === 'pending');
    if (completedBtn) completedBtn.classList.toggle('record-nav-item-active', tabName === 'completed');

    if (allRecords) allRecords.classList.toggle('active', tabName === 'all');
    if (pendingRecords) pendingRecords.classList.toggle('active', tabName === 'pending');
    if (completedRecords) completedRecords.classList.toggle('active', tabName === 'completed');
}

// Backward compatibility for inline onclicks
function allBtnClick() { switchRecordTab('all'); }
function pendingBtnClick() { switchRecordTab('pending'); }
function completedBtnClick() { switchRecordTab('completed'); }

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
    const isCompleted = task.status === 'completed' || task.status === 'approved';
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
    const orderId = escapeHtml(task.order_number || (String(task.id).startsWith('TSK') ? task.id : `ORD-${task.id}`));

    // Deficit / Negative balance alert banner for pending orders
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

    // Status pill & Action button
    let statusPill = '';
    let actionBtnHtml = '';

    if (isCompleted) {
        if (task.is_completed_today) {
            statusPill = `<div class="completed-today-badge">✓ Completed Today</div>`;
        } else {
            statusPill = `<div class="completed-pill-outline">✓ Completed</div>`;
        }
    } else {
        statusPill = `<div class="pending-pill-outline">⏳ Pending</div>`;
        actionBtnHtml = `<button type="button" data-id="${task.id}" class="submit-btn submit-btn-${task.id}">Submit Order</button>`;
    }

    return `
        <div class="record-item-tab-field" id="record-${task.id}">
            <div class="record-card-header">
                <span class="record-order-id">#${orderId}</span>
                ${statusPill}
            </div>

            ${deficitBannerHtml}

            <div class="record-item-tab-field-up">
                <img src="${imgUrl}" alt="" class="record-item-image" onerror="this.onerror=null;this.src='/client/assets/uploads/products/outdoor_shed.jpg';">
                <div class="record-item-description">${escapeHtml(task.product_name || task.title)}</div>
            </div>

            <div class="record-item-tab-field-down">
                <div class="record-item-tab-field-down-item">
                    <div class="tiny-text">Total Amount</div>
                    <div class="small-text">USD $${totalAmount}</div>
                </div>
                <div class="record-item-tab-field-down-item" style="text-align: right;">
                    <div class="tiny-text">Profit Earned</div>
                    <div class="small-text profit-text">+USD $${profitStr}</div>
                </div>
            </div>

            <div class="record-item-tab-title">
                <div class="record-item-tab-title-left">${dateStr}</div>
                <div class="record-item-tab-title-right">
                    ${actionBtnHtml}
                </div>
            </div>
        </div>
    `;
}

function renderTodayCompletedSummary(todayTasks, todayDate, todayProfit) {
    const count = todayTasks.length;
    const profitVal = parseFloat(todayProfit || todayTasks.reduce((sum, t) => sum + parseFloat(t.commission_amount || t.profit || 0), 0)).toFixed(2);
    const displayDate = todayDate || new Date().toISOString().slice(0, 10);

    return `
        <div class="today-summary-bar">
            <div class="today-summary-left">
                <div class="today-summary-icon">✓</div>
                <div>
                    <div class="today-summary-title">Today's Completed Orders</div>
                    <div class="today-summary-sub">${displayDate} • ${count} Order${count === 1 ? '' : 's'} Done</div>
                </div>
            </div>
            <div class="today-summary-profit">
                <div class="today-profit-label">Today's Profit</div>
                <div class="today-profit-value">+$${profitVal}</div>
            </div>
        </div>
    `;
}

async function loadTaskRecords() {
    const allRecords = document.getElementById('allRecords');
    const pendingRecords = document.getElementById('pendingRecords');
    const completedRecords = document.getElementById('completedRecords');

    const countAll = document.getElementById('countAll');
    const countPending = document.getElementById('countPending');
    const countCompleted = document.getElementById('countCompleted');

    try {
        const res = await fetch('/api/tasks/records');
        const data = await res.json();

        if (!data || !data.success) {
            const errHtml = renderEmptyState('⚠️', 'Unable to load orders', 'Please check your connection and try again.');
            if (allRecords) allRecords.innerHTML = errHtml;
            if (pendingRecords) pendingRecords.innerHTML = errHtml;
            if (completedRecords) completedRecords.innerHTML = errHtml;
            return;
        }

        const allTasks = data.all_tasks || data.tasks || [];
        const pendingTasks = data.pending_tasks || allTasks.filter(t => t.status === 'pending');
        const todayCompletedTasks = data.today_completed_tasks || allTasks.filter(t => (t.status === 'completed' || t.status === 'approved') && t.is_completed_today);
        const userInfo = data.user || {};
        const todayDate = data.today_date;

        // Update Nav Count Badges
        if (countAll) countAll.textContent = allTasks.length;
        if (countPending) countPending.textContent = pendingTasks.length;
        if (countCompleted) countCompleted.textContent = todayCompletedTasks.length;

        // 1. Render ALL Tab (Shows all orders: pending & completed)
        if (allRecords) {
            if (allTasks.length > 0) {
                allRecords.innerHTML = allTasks.map(t => renderTaskCard(t, 'all', userInfo)).join('');
            } else {
                allRecords.innerHTML = renderEmptyState('📦', 'No order records yet', 'Your orders and tasks will appear here once generated.');
            }
        }

        // 2. Render PENDING Tab (Orders with deficit/negative balance to complete)
        if (pendingRecords) {
            if (pendingTasks.length > 0) {
                pendingRecords.innerHTML = pendingTasks.map(t => renderTaskCard(t, 'pending', userInfo)).join('');
            } else {
                pendingRecords.innerHTML = renderEmptyState('🎉', 'No pending orders', 'You have completed all pending tasks for now.');
            }
        }

        // 3. Render COMPLETED Tab (Only orders completed TODAY)
        if (completedRecords) {
            const summaryHtml = renderTodayCompletedSummary(todayCompletedTasks, todayDate, userInfo.today_profit);
            if (todayCompletedTasks.length > 0) {
                completedRecords.innerHTML = summaryHtml + todayCompletedTasks.map(t => renderTaskCard(t, 'completed', userInfo)).join('');
            } else {
                completedRecords.innerHTML = summaryHtml + renderEmptyState('📅', 'No orders completed today', 'Orders you finish today will be tracked right here.');
            }
        }

        // Bind Submit Buttons
        document.querySelectorAll('.submit-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const taskId = this.getAttribute('data-id');
                if (!taskId) return;
                await submitOrderFromRecord(taskId, this);
            });
        });

    } catch (err) {
        console.error('Error loading task records:', err);
        const errHtml = renderEmptyState('⚠️', 'Error loading records', 'Please refresh the page.');
        if (allRecords) allRecords.innerHTML = errHtml;
        if (pendingRecords) pendingRecords.innerHTML = errHtml;
        if (completedRecords) completedRecords.innerHTML = errHtml;
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
            if (data && (data.reachedLimit || froz || (data.message && data.message.includes('frozen limit')))) {
                const deficitVal = froz ? parseFloat(froz).toFixed(2) : '25.00';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: "Account Limit Reached!",
                        icon: "warning",
                        html: `Your account balance is currently in deficit (-USD $${deficitVal}).<br><br>Please clear the shortfall to complete this order.`,
                        showCancelButton: true,
                        confirmButtonColor: '#2563eb',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Deposit Now',
                        cancelButtonText: 'Contact Support'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'depositData';
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            window.location.href = 'contactData';
                        }
                    });
                } else {
                    alert(`Account Limit Reached! Your balance is in deficit (-USD $${deficitVal}). Please clear the shortfall.`);
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
    switchRecordTab('all');
    loadTaskRecords();
});

