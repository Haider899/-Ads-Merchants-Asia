document.addEventListener('DOMContentLoaded', function(){
    const membershipIcons = document.getElementById('membership-icons');
    if (membershipIcons) {
        const membershipLevel = membershipIcons.getAttribute('data-membership-level');
        if (membershipLevel == 'Bronze') {
            bronzeBtnClick();
        } else if (membershipLevel == 'Silver') {
            silverBtnClick();
        } else if (membershipLevel == 'Gold') {
            goldBtnClick();
        } else if (membershipLevel == 'Diamond') {
            diamondBtnClick();
        }
    }
});

var bronzeBtn = document.getElementById('bronze-btn');
var silverBtn = document.getElementById('silver-btn');
var goldBtn = document.getElementById('gold-btn');
var diamondBtn = document.getElementById('diamond-btn');

var bronzeDiv = document.getElementById('bronze-div');
var silverDiv = document.getElementById('silver-div');
var goldDiv = document.getElementById('gold-div');
var diamondDiv = document.getElementById('diamond-div');

if (bronzeDiv) bronzeDiv.style.display = "block";
if (silverDiv) silverDiv.style.display = "none";
if (goldDiv) goldDiv.style.display = "none";
if (diamondDiv) diamondDiv.style.display = "none";

if (bronzeBtn) bronzeBtn.classList.add('membership-icons-item-itself-active');
if (silverBtn) silverBtn.classList.remove('membership-icons-item-itself-active');
if (goldBtn) goldBtn.classList.remove('membership-icons-item-itself-active');
if (diamondBtn) diamondBtn.classList.remove('membership-icons-item-itself-active');

function bronzeBtnClick(){
    bronzeDiv.style.display = "block";
    silverDiv.style.display = "none";
    goldDiv.style.display = "none";
    diamondDiv.style.display = "none";

    bronzeBtn.classList.add('membership-icons-item-itself-active');
    silverBtn.classList.remove('membership-icons-item-itself-active');
    goldBtn.classList.remove('membership-icons-item-itself-active');
    diamondBtn.classList.remove('membership-icons-item-itself-active');
}

function silverBtnClick(){
    bronzeDiv.style.display = "none";
    silverDiv.style.display = "block";
    goldDiv.style.display = "none";
    diamondDiv.style.display = "none";

    bronzeBtn.classList.remove('membership-icons-item-itself-active');
    silverBtn.classList.add('membership-icons-item-itself-active');
    goldBtn.classList.remove('membership-icons-item-itself-active');
    diamondBtn.classList.remove('membership-icons-item-itself-active');
}

function goldBtnClick(){
    bronzeDiv.style.display = "none";
    silverDiv.style.display = "none";
    goldDiv.style.display = "block";
    diamondDiv.style.display = "none";

    bronzeBtn.classList.remove('membership-icons-item-itself-active');
    silverBtn.classList.remove('membership-icons-item-itself-active');
    goldBtn.classList.add('membership-icons-item-itself-active');
    diamondBtn.classList.remove('membership-icons-item-itself-active');
}   

function diamondBtnClick(){
    bronzeDiv.style.display = "none";
    silverDiv.style.display = "none";
    goldDiv.style.display = "none";
    diamondDiv.style.display = "block";

    bronzeBtn.classList.remove('membership-icons-item-itself-active');
    silverBtn.classList.remove('membership-icons-item-itself-active');
    goldBtn.classList.remove('membership-icons-item-itself-active');
    diamondBtn.classList.add('membership-icons-item-itself-active');
}