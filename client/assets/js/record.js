let allBtn = document.getElementById('allBtn');
let pendingBtn = document.getElementById('pendingBtn');
let completedBtn = document.getElementById('completedBtn');

let allRecords = document.getElementById('allRecords');
let pendingRecords = document.getElementById('pendingRecords');
let completedRecords = document.getElementById('completedRecords');

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

function allBtnClick() {
    if (allRecords) allRecords.style.display = "flex";
    if (pendingRecords) pendingRecords.style.display = "none";
    if (completedRecords) completedRecords.style.display = "none";

    if (allBtn) allBtn.classList.add('record-nav-item-active');
    if (pendingBtn) pendingBtn.classList.remove('record-nav-item-active');
    if (completedBtn) completedBtn.classList.remove('record-nav-item-active');
}

function pendingBtnClick() {
    if (allRecords) allRecords.style.display = "none";
    if (pendingRecords) pendingRecords.style.display = "flex";
    if (completedRecords) completedRecords.style.display = "none";

    if (allBtn) allBtn.classList.remove('record-nav-item-active');
    if (pendingBtn) pendingBtn.classList.add('record-nav-item-active');
    if (completedBtn) completedBtn.classList.remove('record-nav-item-active');
}

function completedBtnClick() {
    if (allRecords) allRecords.style.display = "none";
    if (pendingRecords) pendingRecords.style.display = "none";
    if (completedRecords) completedRecords.style.display = "flex";

    if (allBtn) allBtn.classList.remove('record-nav-item-active');
    if (pendingBtn) pendingBtn.classList.remove('record-nav-item-active');
    if (completedBtn) completedBtn.classList.add('record-nav-item-active');
}

function renderTaskCard(task) {
    const isCompleted = task.status === 'completed' || task.status === 'approved';
    let imgUrl = task.product_image || '/client/assets/uploads/products/outdoor_shed.jpg';
    if (!imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
        imgUrl = '/' + imgUrl;
    }

    const totalAmount = parseFloat(task.product_price || 0).toFixed(2);
    const profit = parseFloat(task.commission_amount || task.commission_earned || 0).toFixed(2);
    const dateStr = formatDate(task.created_at);

    const statusPill = isCompleted
        ? `<div class="completed-pill-outline">completed</div>`
        : `<button type="button" data-id="${task.id}" class="submit-btn submit-btn-${task.id}">Submit</button>`;

    return `
        <div class="record-item-tab-field" id="record-${task.id}">
            <div class="record-item-tab-field-up">
                <img src="${imgUrl}" alt="" class="record-item-image" onerror="this.onerror=null;this.src='/client/assets/uploads/products/outdoor_shed.jpg';">
                <div class="record-item-description">${escapeHtml(task.product_name || task.title)}</div>
            </div>
            <div class="record-item-tab-field-down">
                <div class="record-item-tab-field-down-item">
                    <div class="tiny-text">Total Amount</div>
                    <div class="small-text">USD ${totalAmount}</div>
                </div>
                <div class="record-item-tab-field-down-item" style="text-align: right;">
                    <div class="tiny-text">Profit</div>
                    <div class="small-text">USD ${profit}</div>
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

function renderEmptyState(message) {
    return `<div class="record-empty-state">${message}</div>`;
}

async function loadTaskRecords() {
    try {
        const res = await fetch('/api/tasks/records');
        const data = await res.json();

        if (!data || !data.success || !Array.isArray(data.tasks)) {
            if (allRecords) allRecords.innerHTML = renderEmptyState('No order records found.');
            if (pendingRecords) pendingRecords.innerHTML = renderEmptyState('No pending orders.');
            if (completedRecords) completedRecords.innerHTML = renderEmptyState('No completed orders.');
            return;
        }

        const allTasks = data.all_tasks || data.tasks;
        const pendingList = allTasks.filter(t => t.status === 'pending');
        const completedList = allTasks.filter(t => t.status === 'completed' || t.status === 'approved');

        if (allRecords) {
            allRecords.innerHTML = allTasks.length > 0 
                ? allTasks.map(renderTaskCard).join('')
                : renderEmptyState('No order records found.');
        }

        if (pendingRecords) {
            pendingRecords.innerHTML = pendingList.length > 0
                ? pendingList.map(renderTaskCard).join('')
                : renderEmptyState('No pending orders.');
        }

        if (completedRecords) {
            completedRecords.innerHTML = completedList.length > 0
                ? completedList.map(renderTaskCard).join('')
                : renderEmptyState('No completed orders.');
        }

        // Attach event listeners to any submit buttons
        document.querySelectorAll('.submit-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const taskId = this.getAttribute('data-id');
                if (!taskId) return;
                await submitOrderFromRecord(taskId, this);
            });
        });

    } catch (err) {
        console.error('Error loading records:', err);
        if (allRecords) allRecords.innerHTML = renderEmptyState('Failed to load order records.');
    }
}

async function submitOrderFromRecord(taskId, btn) {
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
                    text: data.message || 'Your order submitted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3085d6'
                }).then(() => {
                    loadTaskRecords();
                });
            } else {
                alert(data.message || 'Your order submitted successfully.');
                loadTaskRecords();
            }
        } else {
            const froz = data && (data.userFrozenBalance || data.deficit_amount);
            if (data && (data.reachedLimit || froz || (data.message && data.message.includes('frozen limit')))) {
                const deficitVal = froz ? parseFloat(froz).toFixed(2) : '25.00';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: "Account Limit Reached!",
                        icon: "info",
                        html: `Please contact <a target="_blank" href="contactData" autofocus>customer care service</a> to clear your balance of -${deficitVal} USDT.`,
                        focusConfirm: false,
                        confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`
                    });
                } else {
                    alert(`Account Limit Reached! Please contact customer care service to clear your balance of -${deficitVal} USDT.`);
                }
            } else {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Notice',
                        text: (data && data.message) || 'Insufficient balance or task could not be submitted.',
                        icon: 'warning'
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
    allBtnClick();
    loadTaskRecords();
});
