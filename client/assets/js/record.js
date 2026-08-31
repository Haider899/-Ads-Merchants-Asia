const base_url = document.getElementById('base_url').value;

let allBtn = document.getElementById('allBtn');
let pendingBtn = document.getElementById('pendingBtn');
let completedBtn = document.getElementById('completedBtn');


let allRecords = document.getElementById('allRecords');
let pendingRecords = document.getElementById('pendingRecords');
let completedRecords = document.getElementById('completedRecords');


// document.addEventListener('DOMContentLoaded', function(){
    
//     const pendingSubmitBtns = document.querySelectorAll('.submit-btn');

//     pendingSubmitBtns.forEach(function(btn, index){
//         btn.addEventListener('click', function(){
//             this.preventDefault;
//             const id = this.getAttribute('data-id');
            

//             updateTaskOrProductRecord({status: 'completed', id: id}, this);

//         })
//     })

// })

document.addEventListener('DOMContentLoaded', function () {
    const pendingSubmitBtns = document.querySelectorAll('.submit-btn');

    pendingSubmitBtns.forEach(function (btn) {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');

            // 🔄 Fetch task details via API (you may already have this data in the DOM or JS object)
            const response = await fetch(`${base_url}User/get_task_details/${id}`);
            const data = await response.json();

            const commission = data.product.commission;
            const platformCommission = data.product.platform_commission;
            const balance = data.user_remaining_balance;
            const warningMessage = "⚠️ Balance too low. ";

            if (balance == 0) {
                Swal.fire({
                    title: `<span style="font-size: 16px; background-color: orange; color: white; padding: 4px 8px; border-radius: 4px;">Pending</span>
                            <span style="font-size: 12px; color: red;"> First Proceed Your Pending Task Please!</span><br>${capitalize(data.product.product_name)}`,
                    html: `Total Order Amount: ${data.product.product_price}<br>My Commission: ${commission}<br>Platform Commission: ${platformCommission}`,
                    imageUrl: base_url + "assets/uploads/products/" + data.product.picture,
                    imageWidth: 300,
                    imageHeight: 300,
                    imageAlt: data.product.product_name,
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Submit",
                    preConfirm: () => {
                        const confirmButton = Swal.getConfirmButton();
                        data.product.status = "completed";
                        data.product.task_id = data.task_id;
                        data.product.set_number = data.set_number;
                        data.product.total_in_set = data.total_in_set;
                        data.product.membership_level_id = data.membership_level_id;
                        return updateTaskOrProductRecord(data.product, confirmButton);
                    }
                });
            } else {
                Swal.fire({
                    title: `<span style="font-size: 16px; background-color: orange; color: white; padding: 4px 8px; border-radius: 4px;">Pending</span>
                            <span style="font-size: 12px; color: red;"> Complete Your Pending Task First Please!</span><br>${capitalize(data.product.product_name)}`,
                    html: `${warningMessage} Total Order Amount: ${data.product.product_price}<br>My Commission: ${commission}<br>Platform Commission: ${platformCommission}<br><br>
                           Your account balance is below ${balance} USDT. Please deposit to complete your pending task.<br>
                           <img src="${base_url}client/assets/img/icons/chatbtn.png" alt="Live Chat" style="width:35px;">
                           <div class="contact-title">
                               Need Help? Please click the <strong>Online Chat</strong> button below to contact our support team.
                           </div>`,
                    imageUrl: base_url + "assets/uploads/products/" + data.product.picture,
                    imageWidth: 300,
                    imageHeight: 300,
                    imageAlt: data.product.product_name,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Deposit Now"
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = base_url + "deposit";
                    }
                });
            }
        });
    });
});



allBtn.classList.add('record-nav-item-active');
pendingBtn.classList.remove('record-nav-item-active');
completedBtn.classList.remove('record-nav-item-active');



function allBtnClick(){
    allRecords.style.display = "flex";
    pendingRecords.style.display = "none";
    completedRecords.style.display = "none";

    allBtn.classList.add('record-nav-item-active');
    pendingBtn.classList.remove('record-nav-item-active');
    completedBtn.classList.remove('record-nav-item-active');

}

function pendingBtnClick(){
    allRecords.style.display = "none";
    pendingRecords.style.display = "flex";
    completedRecords.style.display = "none";

    allBtn.classList.remove('record-nav-item-active');
    pendingBtn.classList.add('record-nav-item-active');
    completedBtn.classList.remove('record-nav-item-active');

}

function completedBtnClick(){
    allRecords.style.display = "none";
    pendingRecords.style.display = "none";
    completedRecords.style.display = "flex";

    allBtn.classList.remove('record-nav-item-active');
    pendingBtn.classList.remove('record-nav-item-active');
    completedBtn.classList.add('record-nav-item-active');

}   

function undoneBtnClick(){
    allRecords.style.display = "none";
    pendingRecords.style.display = "none";
    completedRecords.style.display = "none";

    allBtn.classList.remove('record-nav-item-active');
    pendingBtn.classList.remove('record-nav-item-active');
    completedBtn.classList.remove('record-nav-item-active');
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}


const updateTaskOrProductRecord = (task, event) => {
    console.log(task);
    event.disabled = true;
    event.innerHTML = 'Submitting...';
    const base_url = document.getElementById('base_url').value;

    fetch(`${base_url}User/submit_task_if_balance`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ task_id: task.id, set_number:task.set_number, total_in_set:task.total_in_set })
    })
    .then(response => response.json())
    .then(data => {
        event.disabled = false;
        event.innerHTML = 'Submit';

        if (data.success && data.status === 'completed') {
            // Update UI
            const pills = document.querySelectorAll(`.pending-pill-${task.id}`);
            const submitBtns = document.querySelectorAll(`.submit-btn-${task.id}`);
            const pendingRecordTab = document.getElementById(`pendingRecord-${task.id}`);
            submitBtns.forEach(btn => btn.remove());
            pills.forEach(pill => pill.innerHTML = 'completed');
            if (pendingRecordTab) pendingRecordTab.remove();

            // Swal.fire({
            //     title: 'Success!',
            //     text: data.message || 'Task submitted successfully.',
            //     icon: 'success',
            //     confirmButtonColor: "#3085d6",
            //     timer: 3000
            // });

            if(data.completed_tasks == data.total_tasks_in_set){
                Swal.fire({
                    title: 'Congratulation!',
                    text: `Your have successfully completed Set of orders.`,
                    icon: 'success',
                    confirmButtonColor: "#3085d6",
                       // timer: 3000
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "recordData";
                        }
                    });
            }else{
    
            Swal.fire({
                title: 'Success!',
                text: 'Your order submitted successfully.',
                icon: 'success',
                confirmButtonColor: "#3085d6",
                   // timer: 3000
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = "recordData";
                    }
                });
            }

        } else {
            if (data.message && data.message.includes("Insufficient balance")) {
                Swal.fire({
                    title: "Insufficient Balance!",
                    html: `
                        Your current balance is <strong>${data.balance}</strong> USDT.<br>
                        This task requires <strong>${data.required}</strong> USDT.<br><br>
                        Please deposit to continue.
                    `,
                    icon: "warning",
                    confirmButtonText: "Deposit Now",
                    showCancelButton: true
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = `${base_url}deposit`;
                    }
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Insufficient balance or task could not be submitted.',
                    icon: 'error'
                });
            }
            
        }
    })
    .catch(error => {
        console.error('Error:', error);
        event.disabled = false;
        event.innerHTML = 'Submit';
        Swal.fire('Error!', 'There was an error processing your request.', 'error');
    });
}
