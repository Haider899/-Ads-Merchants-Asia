var withdrawSection = document.getElementById('withdraw-section');
var historySection = document.getElementById('history-section');
var cryptoSection = document.getElementById('crypto-section');
var fiatSection = document.getElementById('fiat-section');

var withdrawBtn = document.getElementById('withdraw-btn');
var historyBtn = document.getElementById('history-btn');
var cryptoBtn = document.getElementById('crypto-btn');
var fiatBtn = document.getElementById('fiat-btn');


withdrawSection.style.display = 'flex';
historySection.style.display = 'none';
fiatSection.style.display = 'none';
withdrawBtn.classList.add('withdraw-nav-item-active');
historyBtn.classList.remove('withdraw-nav-item-active');

withdrawBtn.addEventListener('click', function(){
    withdrawSection.style.display = 'flex';
    historySection.style.display = 'none';
    withdrawBtn.classList.add('withdraw-nav-item-active');
    historyBtn.classList.remove('withdraw-nav-item-active');
});


historyBtn.addEventListener('click', function(){
    historySection.style.display = 'flex';
    withdrawSection.style.display = 'none';
    historyBtn.classList.add('withdraw-nav-item-active');
    withdrawBtn.classList.remove('withdraw-nav-item-active');
});

cryptoBtn.addEventListener('click', function(){
    cryptoSection.style.display = 'flex';
    fiatSection.style.display = 'none';
    cryptoBtn.classList.add('deposit-nav-item-active');
    fiatBtn.classList.remove('deposit-nav-item-active');
});

fiatBtn.addEventListener('click', function(){
    fiatSection.style.display = 'flex';
    cryptoSection.style.display = 'none';
    fiatBtn.classList.add('deposit-nav-item-active');
    cryptoBtn.classList.remove('deposit-nav-item-active');
});