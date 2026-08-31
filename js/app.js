/**
 * ADS MERCHANTS ASIA - AUTHENTICATION INTERACTION ENGINE
 * Handles tab transitions, password visibility toggles, strength calculation,
 * validation, mock asynchronous submission, and toast alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabSwitcher = document.getElementById('tabSwitcher');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const panelLogin = document.getElementById('panelLogin');
  const panelSignup = document.getElementById('panelSignup');
  const authHeadline = document.getElementById('authHeadline');
  const authSubhead = document.getElementById('authSubhead');
  
  // Forms
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  
  // Modal Elements
  const forgotModal = document.getElementById('forgotModal');
  const openForgotLinks = document.querySelectorAll('.open-forgot-modal');
  const closeForgotBtn = document.getElementById('closeForgotModal');
  
  // Quick fill & switch buttons
  const switchToSignupBtn = document.getElementById('switchToSignup');
  const switchToLoginBtn = document.getElementById('switchToLogin');
  const quickFillBtn = document.getElementById('quickFillDemo');
  
  // Toast container
  const toastContainer = document.getElementById('toastContainer');

  // =========================================================================
  // TAB SWITCHING LOGIC
  // =========================================================================
  function setAuthMode(mode) {
    if (mode === 'signup') {
      tabSwitcher.classList.add('signup-active');
      tabLogin.classList.remove('active');
      tabSignup.classList.add('active');
      
      panelLogin.classList.remove('active');
      panelSignup.classList.add('active');
      
      authHeadline.textContent = "Let's Get Started";
      authSubhead.textContent = 'Create your account to start shopping and earning rewards.';
      window.location.hash = '#signup';
    } else {
      tabSwitcher.classList.remove('signup-active');
      tabSignup.classList.remove('active');
      tabLogin.classList.add('active');
      
      panelSignup.classList.remove('active');
      panelLogin.classList.add('active');
      
      authHeadline.textContent = "Welcome Back";
      authSubhead.textContent = 'Sign in to access your merchant earnings and balance.';
      window.location.hash = '#login';
    }
  }

  tabLogin.addEventListener('click', () => setAuthMode('login'));
  tabSignup.addEventListener('click', () => setAuthMode('signup'));
  
  if (switchToSignupBtn) {
    switchToSignupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode('signup');
    });
  }
  
  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode('login');
    });
  }

  // Check URL hash on initial load
  if (window.location.hash === '#signup') {
    setAuthMode('signup');
  }

  // =========================================================================
  // PASSWORD VISIBILITY TOGGLE
  // =========================================================================
  const togglePasswordButtons = document.querySelectorAll('.toggle-password-btn');
  togglePasswordButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      
      // Update eye icon SVG
      if (isPassword) {
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  // =========================================================================
  // PASSWORD STRENGTH METER (FOR SIGN UP)
  // =========================================================================
  const signupPasswordInput = document.getElementById('signupPassword');
  const strengthBars = document.querySelectorAll('.strength-bar');
  const strengthText = document.getElementById('strengthText');

  if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', () => {
      const val = signupPasswordInput.value;
      let score = 0;

      if (!val) {
        strengthBars.forEach(bar => {
          bar.className = 'strength-bar';
        });
        if (strengthText) strengthText.textContent = 'Too short';
        return;
      }

      if (val.length >= 6) score++;
      if (val.length >= 9) score++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
      if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score++;

      strengthBars.forEach((bar, idx) => {
        bar.className = 'strength-bar';
        if (idx < score) {
          if (score <= 1) bar.classList.add('weak');
          else if (score <= 3) bar.classList.add('medium');
          else bar.classList.add('strong');
        }
      });

      if (strengthText) {
        if (score <= 1) {
          strengthText.textContent = 'Weak';
          strengthText.style.color = 'var(--color-accent)';
        } else if (score <= 3) {
          strengthText.textContent = 'Medium';
          strengthText.style.color = 'var(--color-warning)';
        } else {
          strengthText.textContent = 'Strong';
          strengthText.style.color = 'var(--color-success)';
        }
      }
    });
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(title, message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 4000);
  }

  // =========================================================================
  // FORM VALIDATION & SUBMISSION HELPERS
  // =========================================================================
  function clearErrors(form) {
    const errorGroups = form.querySelectorAll('.form-group.has-error');
    errorGroups.forEach(g => g.classList.remove('has-error'));
  }

  function setFieldError(inputEl, errorMsg) {
    const formGroup = inputEl.closest('.form-group');
    if (!formGroup) return;
    formGroup.classList.add('has-error');
    const msgEl = formGroup.querySelector('.form-error-msg');
    if (msgEl) {
      msgEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        ${errorMsg}
      `;
    }
  }

  // =========================================================================
  // LOGIN SUBMIT
  // =========================================================================
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors(loginForm);

      const emailOrPhone = document.getElementById('loginIdentifier');
      const password = document.getElementById('loginPassword');
      const submitBtn = document.getElementById('loginSubmitBtn');
      let isValid = true;

      if (!emailOrPhone.value.trim()) {
        setFieldError(emailOrPhone, 'Please enter your email or registered phone number.');
        isValid = false;
      }

      if (!password.value) {
        setFieldError(password, 'Please enter your password.');
        isValid = false;
      } else if (password.value.length < 6) {
        setFieldError(password, 'Password must be at least 6 characters.');
        isValid = false;
      }

      if (!isValid) return;

      // Simulate Authentication API Call
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        showToast('Login Successful', `Welcome back, ${emailOrPhone.value.trim()}! Redirecting to merchant dashboard...`, 'success');
      }, 1200);
    });
  }

  // =========================================================================
  // SIGN UP SUBMIT
  // =========================================================================
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors(signupForm);

      const name = document.getElementById('signupName');
      const phone = document.getElementById('signupPhone');
      const email = document.getElementById('signupEmail');
      const password = document.getElementById('signupPassword');
      const confirmPassword = document.getElementById('signupConfirmPassword');
      const terms = document.getElementById('signupTerms');
      const submitBtn = document.getElementById('signupSubmitBtn');
      let isValid = true;

      if (!name.value.trim()) {
        setFieldError(name, 'Please enter your full name.');
        isValid = false;
      }

      if (!phone.value.trim()) {
        setFieldError(phone, 'Valid mobile number required (1 account per mobile only).');
        isValid = false;
      } else if (phone.value.trim().length < 7) {
        setFieldError(phone, 'Please enter a valid mobile number.');
        isValid = false;
      }

      if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
        setFieldError(email, 'Please enter a valid email address.');
        isValid = false;
      }

      if (!password.value || password.value.length < 6) {
        setFieldError(password, 'Password must be at least 6 characters.');
        isValid = false;
      }

      if (password.value !== confirmPassword.value) {
        setFieldError(confirmPassword, 'Passwords do not match.');
        isValid = false;
      }

      if (terms && !terms.checked) {
        showToast('Terms Required', 'Please accept the Merchant Terms of Service & Compliance Notice.', 'error');
        isValid = false;
      }

      if (!isValid) return;

      // Simulate Registration API Call
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        showToast('Account Created!', 'Your account has been registered with Ads Merchants Asia. Verification SMS sent.', 'success');
        
        // Auto switch to login tab after 1.5s
        setTimeout(() => {
          setAuthMode('login');
          document.getElementById('loginIdentifier').value = phone.value.trim();
        }, 1400);
      }, 1300);
    });
  }

  // =========================================================================
  // FORGOT PASSWORD MODAL LOGIC
  // =========================================================================
  function openModal() {
    forgotModal.classList.add('active');
  }

  function closeModal() {
    forgotModal.classList.remove('active');
  }

  openForgotLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeForgotBtn) {
    closeForgotBtn.addEventListener('click', closeModal);
  }

  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) {
        closeModal();
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const resetInput = document.getElementById('forgotIdentifier');
      const resetBtn = document.getElementById('forgotSubmitBtn');

      if (!resetInput.value.trim()) {
        showToast('Input Required', 'Please enter your registered email or mobile number.', 'error');
        return;
      }

      resetBtn.classList.add('loading');
      resetBtn.disabled = true;

      setTimeout(() => {
        resetBtn.classList.remove('loading');
        resetBtn.disabled = false;
        closeModal();
        showToast('Reset Link Sent', `Password reset instructions sent to ${resetInput.value.trim()}`, 'success');
        resetFormInputs(forgotForm);
      }, 1100);
    });
  }

  function resetFormInputs(form) {
    form.reset();
  }

  // =========================================================================
  // DEMO QUICK FILL HELPER (FOR FAST AUDIT & TESTING)
  // =========================================================================
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      if (panelLogin.classList.contains('active')) {
        document.getElementById('loginIdentifier').value = 'haider.merchant@adsasia.com';
        document.getElementById('loginPassword').value = 'AsiaPass2026!';
        showToast('Demo Credentials Filled', 'Pre-filled demo merchant account. Click Log In!', 'info');
      } else {
        document.getElementById('signupName').value = 'Haider Ali';
        document.getElementById('signupPhone').value = '81234567';
        document.getElementById('signupEmail').value = 'haider.merchant@adsasia.com';
        document.getElementById('signupPassword').value = 'AsiaPass2026!';
        document.getElementById('signupConfirmPassword').value = 'AsiaPass2026!';
        document.getElementById('signupReferral').value = 'ASIA-VIP-888';
        document.getElementById('signupTerms').checked = true;
        
        // Trigger strength update
        signupPasswordInput.dispatchEvent(new Event('input'));
        showToast('Signup Demo Filled', 'Pre-filled registration form with referral code.', 'info');
      }
    });
  }
});
