var depositSection = document.getElementById('deposit-section');
var historySection = document.getElementById('history-section');
var cryptoSection = document.getElementById('crypto-section');
var fiatSection = document.getElementById('fiat-section');

var depositBtn = document.getElementById('deposit-btn');
var historyBtn = document.getElementById('history-btn');
var cryptoBtn = document.getElementById('crypto-btn');
var fiatBtn = document.getElementById('fiat-btn');


depositSection.style.display = 'flex';
historySection.style.display = 'none';
fiatSection.style.display = 'none';
depositBtn.classList.add('deposit-nav-item-active');
historyBtn.classList.remove('deposit-nav-item-active');

depositBtn.addEventListener('click', function(){
    depositSection.style.display = 'flex';
    historySection.style.display = 'none';
    depositBtn.classList.add('deposit-nav-item-active');
    historyBtn.classList.remove('deposit-nav-item-active');
});


historyBtn.addEventListener('click', function(){
    historySection.style.display = 'flex';
    depositSection.style.display = 'none';
    historyBtn.classList.add('deposit-nav-item-active');
    depositBtn.classList.remove('deposit-nav-item-active');
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