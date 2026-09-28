"use strict";

document.addEventListener('DOMContentLoaded', () => {
    const startButtonText = document.getElementById('start-button-text');
    startButtonText.addEventListener('click', () => {
        console.log('start button clicked');
    });

    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', (e) => {
        e.preventDefault();
        const startButtonSubmit = document.getElementById('start-button-submit');
        startButtonSubmit.disabled = true;
        const startGifImage = document.getElementById('start-gif-image');
        startGifImage.style.display = 'block';

        //const userId = document.getElementById('start-form').getAttribute('data-user_id');
        //console.log(userId);
        const base_url = document.getElementById("base_url").value;
        const form = document.getElementById("start-form");
        //const csrfToken = document.getElementById("csrf_token").value;
        const userId = form.getAttribute("data-user_id");
        const data = {
            user_id: userId,
            //csrf_token: csrfToken
        };
//data[CSRF_TOKEN_NAME] = CSRF_TOKEN_VALUE;
// const formData = new FormData();
// formData.append("user_id", userId);
// formData.append("csrf_token", csrfToken);

// fetch(base_url + "pick_product", {
//     method: "POST",
//     body: formData 
// })
// .then(response => response.json())
// .then(data => {
//     console.log(data);
// })
// .catch(error => {
//     console.error("Error:", error);
// });


sleep(2000).then(() => {
    const formData = new FormData();
    formData.append("user_id", userId);
    //formData.append("csrf_token", csrfToken);

    fetch(base_url + "pick_product", {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error("Something went wrong");
        return response.json();
    })
    .then(data => {
        console.log(data);
        startButtonSubmit.disabled = false;
        startGifImage.style.display = 'none';
        startButton.style.top = '0px';
        
        if (data.new_csrf_token) {
            document.getElementById("csrf_token").value = data.new_csrf_token;
            document.cookie = "csrf_cookie_name=" + data.new_csrf_token + "; path=/";
        }

        
        
        // Handling based on returned messages
        const rawDeficit = data.deficit_amount !== undefined ? data.deficit_amount : data.userFrozenBalance;
        const deficitNumber = Math.abs(Number(rawDeficit));
        const formattedDeficit = Number.isFinite(deficitNumber) && deficitNumber > 0
            ? deficitNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : null;
        if (data.reachedLimit || formattedDeficit || data.message === "You have reached the frozen limit." || data.message === "You have reached frozen balance limit.") {
            const balanceText = document.getElementById('start-total-balance-text');
            if (balanceText && formattedDeficit) balanceText.innerHTML = `USD -${formattedDeficit}`;
            Swal.fire({
                title: "Account Limit Reached!",
                icon: "info",
                text: formattedDeficit
                    ? `Your current balance is insufficient to complete this order. Please recharge ${formattedDeficit} USDT to your account to proceed with the order.`
                    : 'Your current balance is insufficient to complete this order. Please recharge your account to proceed with the order.',
                focusConfirm: false,
                confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`,
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "startData";
                }
            });

        } else if (data.message === "You have reached the data limit.") {
            const balanceText = document.getElementById('start-total-balance-text');
            balanceText.innerHTML = `USDT ${data.userbalance}`;
            Swal.fire({
                title: "Account Limit Reached!",
                icon: "info",
                html: `Please contact <a target="_blank" href="contactData" autofocus>customer care service</a>.`,
                focusConfirm: false,
                confirmButtonText: `<i class="fa fa-thumbs-up"></i> Ok`,
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "startData";
                }
            });

        } else if (data.message === "No Task Available for this Set.") {

            Swal.fire({
                title: "No Task Available for this Set!",
                icon: "info",
                html: `<img src="${base_url}client/assets/img/icons/chatbtn.png" alt="Live Chat" style="width:35px;">
    <div class="contact-title">
        Need Help? Please click the <strong>"Online Chat"</strong> button below to contact our support team.
    </div>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Ok"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "startData";
                }
            }); 

        }else if (data.message === "Membership not found") {

            Swal.fire({
                title: "Membership not found!",
                icon: "info",
                html: `<img src="${base_url}client/assets/img/icons/chatbtn.png" alt="Live Chat" style="width:35px;">
    <div class="contact-title">
        Need Help? Please click the <strong>"Online Chat"</strong> button below to contact our support team.
    </div>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Ok"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "startData";
                }
            }); 

        }else if (data.message === "You have a pending task to complete first.") {
            const balance = data.balance;
            const user_remaining_balance = data.user_remaining_balance;
            const productPrice = parseFloat(data.product.product_price);
            const commission = data.product.commission;
            const platformCommission = data.product.platform_commission;

            let warningMessage = "";
            if (productPrice > balance) {
                warningMessage = `<div style="background-color: black; color: white; padding: 10px; margin-bottom: 10px; border-radius: 5px; font-weight: bold;">
                    
                        <span style="color: white;">Need Recharge: $${user_remaining_balance}</span>
                </div>`;
            }
            
            if (data.require_deposit) {

                if(user_remaining_balance == 0){

                    Swal.fire({
                        title: `<span style="font-size: 16px; background-color: orange; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">Pending</span> <span style="font-size: 12px; color: red; font-weight: lighter;">First Proceed Your Pending Task Please!</span> <br> ${capitalize(data.product.product_name)}`,
                        html: `Total Order Amount: ${data.product.product_price} <br> My Commission: ${commission} <br> Platform Commission: ${platformCommission}`,
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

                }else{
                // 🔒 Balance too low — show deposit-only alert
                Swal.fire({
                    title: `<span style="font-size: 16px; background-color: orange; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">Pending</span> <span style="font-size: 12px; color: red; font-weight: lighter;">Complete Your Pending Task First Please!</span> <br> ${capitalize(data.product.product_name)}`,
                    //icon: "info",
                    html: `${warningMessage} Total Order Amount: ${data.product.product_price} <br> My Commission: ${commission} <br> Platform Commission: ${platformCommission} <br><br>
                        Your account balance is below ${balance} USDT, Not able to proceed. Please make a deposit to complete your pending task.<br>
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
                        window.location.href = "deposit";
                    }
                });
            }
        
            } else {
                
                // ✅ Balance is enough — show standard task alert
                Swal.fire({
                    title: `<span style="font-size: 16px; background-color: orange; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">Pending</span> <span style="font-size: 12px; color: red; font-weight: lighter;">First Proceed Your Pending Task Please!</span> <br> ${capitalize(data.product.product_name)}`,
                    html: `Total Order Amount: ${data.product.product_price} <br> My Commission: ${commission} <br> Platform Commission: ${platformCommission}`,
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
            }

        }else if (data.message === "Your account balance is below the minimum membership level.") {

            Swal.fire({
                title: "Insufficient Balance, Not able to proceed!",
                icon: "info",
                //html: `Insufficient Balance, Not able to start.`,
                html: `<img src="${base_url}client/assets/img/icons/chatbtn.png" alt="Live Chat" style="width:35px;">
                <div class="contact-title">
                    Need Help? Please click the <strong>"Online Chat"</strong> button below to contact our support team.
                </div>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Deposit Now"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "deposit";
                }
            });

        } else if (data.message === "Random product or task successfully selected!") {
            const balance = parseFloat(data.balance);
const productPrice = parseFloat(data.task.product_price);

Swal.fire({
    title: capitalize(data.task.product_name),
    html: `Total Order Amount: ${data.task.product_price} <br> My Commission: ${data.task.profit} <br> Platform Commission: ${data.task.platform_commission}`,
    imageUrl: base_url + "assets/uploads/products/" + data.task.picture_url,
    imageWidth: 300,
    imageHeight: 300,
    imageAlt: data.task.product_name,
    showCancelButton: balance >= productPrice, // Show buttons only if balance is enough
    showConfirmButton: balance >= productPrice,
    confirmButtonText: "Submit",
    cancelButtonText: "Cancel",
    allowOutsideClick: false,
    allowEscapeKey: false,
    timer: balance < productPrice ? 3000 : undefined, // Auto-close after 3s if not enough balance
    didClose: () => {
        if (balance < productPrice) {
            // Auto-submit as pending
            data.task.status = "pending";
            data.task.task_id = data.task_id;
            data.task.total_in_set = data.total_in_set;
            data.task.membership_level_id = data.membership_level_id;
            updateTaskOrProduct(data.task);

            // Then show feedback alert
            // Swal.fire({
            //     icon: "warning",
            //     title: "Order Submitted",
            //     text: "Your order has been submitted but not completed due to insufficient balance.",
            // });
        }
    }
}).then((result) => {
    if (balance >= productPrice && result.isConfirmed) {
        data.task.status = "completed";
        data.task.task_id = data.task_id;
        data.task.total_in_set = data.total_in_set;
        data.task.membership_level_id = data.task.membership_level_id;
        updateTaskOrProduct(data.task);
    } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire("Cancelled", "The task has not been submitted.", "info");
    }
});

        }
    })
    .catch(error => {
        console.error('Error:', error);
        startButtonSubmit.disabled = false;
    });
    });     
    });
});


const updateTaskOrProduct = (task) => {
    console.log(task);
    const base_url = document.getElementById("base_url").value;
   // const csrfToken = document.getElementById("csrf_token").value
    const startButtonSubmit = document.getElementById('start-button-submit');
    startButtonSubmit.disabled = true;
    fetch(base_url + 'save_task_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...task,
            //csrf_token: csrfToken
        })
    })
    .then(response => response.json())
    .then(data => {
        startButtonSubmit.disabled = false;
        // if (data.new_csrf_token) {
        //     document.getElementById("csrf_token").value = data.new_csrf_token;
        //     document.cookie = "csrf_cookie_name=" + data.new_csrf_token + "; path=/";
        // }
        
        //if(task.status === "completed"){
            const todaysProfitText = document.getElementById('start-todays-profit-text');
            const balanceText = document.getElementById('start-total-balance-text');

            startButtonSubmit.innerHTML = `${data.frozenCount} / ${data.membershipLevel.vipLevel_data_limit}`;

            const btn = document.getElementById("start-button-submit");
            if (data.set_name && data.current_count !== undefined && data.total_in_set !== undefined) {
                btn.innerHTML = `${data.set_name}:<br> ${data.current_count} / ${data.total_in_set}`;
            } else {
                btn.innerHTML = `Task Completed`;
            }


            const formatUSD = (num) => {
                const isNeg = num < 0;
                const absVal = Math.abs(num).toFixed(2);
                const parts = absVal.split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return (isNeg ? '-' : '') + parts.join('.');
            };
            if (todaysProfitText) todaysProfitText.innerHTML = `USD ${formatUSD(parseFloat(data.todayProfit || 0))}`;
            if (balanceText) balanceText.innerHTML = `USD ${formatUSD(parseFloat(data.balance || 0))}`;

            if(data.completed_tasks == data.total_tasks_in_set){
                Swal.fire({
                    title: 'Congratulation!',
                    text: `Your have successfully completed Set of orders.`,
                    icon: 'success',
                    confirmButtonColor: "#3085d6",
                       // timer: 3000
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "startData";
                        }
                    });
            }else if (data.message === "Balance goes insufficient!") {

                Swal.fire({
                    title: `You have insufficient balance - USDT ${data.balance}`,
                    icon: "error",
                    //html: `You have insufficient balance - USDT ${data.balance}`,
                    // html: `<img src="${base_url}client/assets/img/icons/chatbtn.png" alt="Live Chat" style="width:35px;">
                    // <div class="contact-title">
                    //     Please Recharge to complete your pending task <br>
                    //     Need Help? Please click the <strong>"Online Chat"</strong> button below to contact our support team.
                    // </div>`,
                    focusConfirm: false,
                    showCancelButton: false,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Ok"
                }).then((result) => {
                    if (result.isConfirmed) {
                        //window.location.href = "deposit";
                        window.location.href = "startData";
                    }
                });
    
            }else{

            Swal.fire({
                title: 'Saved!',
                text: 'Your order submitted successfully.',
                icon: 'success',
                confirmButtonColor: "#3085d6",
                   // timer: 3000
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = "startData";
                    }
                });
            }
        // }else{
        //     console.log(data);
        // }
    })
    .catch(error => {
        console.log('Error:', error);
        Swal.fire('Error!', 'There was an error saving your data.', 'error');
    });
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener("DOMContentLoaded", function () {
    const base_url = document.getElementById("base_url").value;
    //const csrfToken = document.getElementById("csrf_token").value;
    const userId = document.getElementById("start-form").getAttribute("data-user_id");

    fetch(base_url + "get_task_progress", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: userId,
            //csrf_token: csrfToken
        })
    })
    .then(response => response.json())
    .then(data => {
        const btn = document.getElementById("start-button-submit");
        if (data.set_name && data.current_count !== undefined && data.total_in_set !== undefined) {
            btn.innerHTML = `${data.set_name}:<br> ${data.current_count} / ${data.total_in_set}`;
        } else {
            btn.innerHTML = `All tasks completed`;
        }

        // Update CSRF token if sent back
        // if (data.new_csrf_token) {
        //     document.getElementById("csrf_token").value = data.new_csrf_token;
        //     document.cookie = "csrf_cookie_name=" + data.new_csrf_token + "; path=/";
        // }
    })
    .catch(error => {
        console.error("Progress fetch failed:", error);
        const subBtn = document.getElementById("start-button-submit");
        if (subBtn) subBtn.style.display = 'none';
    });
});

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
        body: JSON.stringify({ task_id: task.id, set_number:task.set_number, total_in_set:task.total_in_set  })
    })
    .then(response => response.json())
    .then(data => {
        event.disabled = false;
        event.innerHTML = 'Submit';

        

        if (data.success && data.status === 'completed') {

            if(data.completed_tasks == data.total_tasks_in_set){
                Swal.fire({
                    title: 'Congratulation!',
                    text: `Your have successfully completed Set of orders.`,
                    icon: 'success',
                    confirmButtonColor: "#3085d6",
                       // timer: 3000
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "startData";
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
                        window.location.href = "startData";
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

