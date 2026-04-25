const ui = {
  nav: document.getElementById('topNav'),
  navToggle: document.getElementById('navToggle'),
  navMenu: document.getElementById('navMenu'),
  navLinks: Array.from(document.querySelectorAll('.nav-link')),
  loginModal: document.getElementById('loginModal'),
  signupModal: document.getElementById('signupModal'),
  loginButton: document.getElementById('loginButton'),
  ctaLoginBtn: document.getElementById('ctaLoginBtn'),
  closeModalBtn: document.getElementById('closeLoginModal'),
  closeSignupModalBtn: document.getElementById('closeSignupModal'),
  openSignupFromLogin: document.getElementById('openSignupFromLogin'),
  openLoginFromSignup: document.getElementById('openLoginFromSignup'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  loginFeedback: document.getElementById('loginFeedback'),
  signupFeedback: document.getElementById('signupFeedback'),
  submitLogin: document.getElementById('submitLogin'),
  submitSignup: document.getElementById('submitSignup'),
  scrollButtons: Array.from(document.querySelectorAll('[data-scroll-target]')),
  revealNodes: Array.from(document.querySelectorAll('.reveal')),
};

const AUTH_API = {
  login: '/api/auth/login',
  signup: '/api/auth/signup',
};

function scrollWithOffset(target) {
  if (!target) return;
  const navHeight = ui.nav ? ui.nav.getBoundingClientRect().height : 0;
  const offset = 16;
  const top = window.scrollY + target.getBoundingClientRect().top - navHeight - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

function updateNavScrollState() {
  if (!ui.nav) return;
  ui.nav.classList.toggle('scrolled', window.scrollY > 20);
}

function closeMobileMenu() {
  if (!ui.nav || !ui.navToggle) return;
  ui.nav.classList.remove('menu-open');
  ui.navToggle.setAttribute('aria-expanded', 'false');
}

function toggleMobileMenu() {
  if (!ui.nav || !ui.navToggle) return;
  const isOpen = ui.nav.classList.toggle('menu-open');
  ui.navToggle.setAttribute('aria-expanded', String(isOpen));
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');

  const hasOpenModal = ui.loginModal?.classList.contains('show') || ui.signupModal?.classList.contains('show');
  if (!hasOpenModal) {
    document.body.style.overflow = '';
  }
}

function switchModal(fromModal, toModal) {
  closeModal(fromModal);
  setTimeout(() => {
    openModal(toModal);
  }, 120);
}

function openLoginModal() {
  openModal(ui.loginModal);
}

function closeLoginModal() {
  closeModal(ui.loginModal);
}

function openSignupModal() {
  openModal(ui.signupModal);
}

function closeSignupModal() {
  closeModal(ui.signupModal);
}

function setFeedback(element, message, variant = '') {
  if (!element) return;
  element.textContent = message;
  element.className = 'feedback';
  if (variant) {
    element.classList.add(variant);
  }
}

function saveSession(data) {
  const payload = {
    email: data.user?.email || '',
    username: data.user?.name || data.user?.email || 'User',
    token: data.token || '',
    loginTime: new Date().toISOString(),
  };
  sessionStorage.setItem('user', JSON.stringify(payload));
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    setFeedback(ui.loginFeedback, 'Please enter both email and password.', 'error');
    return;
  }

  ui.submitLogin.disabled = true;
  ui.submitLogin.textContent = 'Signing in...';
  setFeedback(ui.loginFeedback, '');

  try {
    const response = await fetch(AUTH_API.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setFeedback(ui.loginFeedback, result.message || 'Invalid credentials. Try again.', 'error');
      return;
    }

    saveSession(result);
    setFeedback(ui.loginFeedback, 'Login successful. Redirecting to dashboard...', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 450);
  } catch (error) {
    setFeedback(ui.loginFeedback, 'Unable to login right now. Please try again.', 'error');
  } finally {
    ui.submitLogin.disabled = false;
    ui.submitLogin.textContent = 'Login';
  }
}

function isDigitsOnly(value) {
  return /^\d+$/.test(value);
}

async function handleSignup(event) {
  event.preventDefault();

  const formData = new FormData(ui.signupForm);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    contact: String(formData.get('contact') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || '').trim(),
    gmail_otp: String(formData.get('gmail_otp') || '').trim(),
  };

  if (!payload.name || !payload.contact || !payload.email || !payload.password || !payload.gmail_otp) {
    setFeedback(ui.signupFeedback, 'Please complete all signup fields.', 'error');
    return;
  }

  if (!isDigitsOnly(payload.contact) || payload.contact.length < 10) {
    setFeedback(ui.signupFeedback, 'Contact must be a valid numeric value.', 'error');
    return;
  }

  if (!isDigitsOnly(payload.gmail_otp) || payload.gmail_otp.length !== 6) {
    setFeedback(ui.signupFeedback, 'Gmail OTP must be a 6-digit number.', 'error');
    return;
  }

  ui.submitSignup.disabled = true;
  ui.submitSignup.textContent = 'Creating account...';
  setFeedback(ui.signupFeedback, '');

  try {
    const response = await fetch(AUTH_API.signup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setFeedback(ui.signupFeedback, result.message || 'Signup failed. Please try again.', 'error');
      return;
    }

    setFeedback(ui.signupFeedback, 'Signup successful. Redirecting to login...', 'success');
    setTimeout(() => {
      closeSignupModal();
      openLoginModal();
      const loginEmail = document.getElementById('email');
      if (loginEmail) {
        loginEmail.value = payload.email;
      }
      const loginPassword = document.getElementById('password');
      if (loginPassword) {
        loginPassword.value = '';
      }
      setFeedback(ui.loginFeedback, 'Account created successfully. Please login.', 'success');
      ui.signupForm.reset();
      setFeedback(ui.signupFeedback, '');
    }, 450);
  } catch (error) {
    setFeedback(ui.signupFeedback, 'Unable to signup right now. Please try again.', 'error');
  } finally {
    ui.submitSignup.disabled = false;
    ui.submitSignup.textContent = 'Create Account';
  }
}

function setupSmoothScroll() {
  ui.scrollButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-scroll-target');
      const target = document.getElementById(targetId);
      if (!target) return;
      scrollWithOffset(target);
    });
  });

  ui.navLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;

    link.addEventListener('click', (event) => {
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      scrollWithOffset(target);
      history.replaceState(null, '', href);
    });
  });
}

function setupRevealAnimations() {
  if (!('IntersectionObserver' in window)) {
    ui.revealNodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
  );

  ui.revealNodes.forEach((node) => observer.observe(node));
}

function bindEvents() {
  window.addEventListener('scroll', updateNavScrollState, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) {
      closeMobileMenu();
    }
  });

  ui.navToggle?.addEventListener('click', toggleMobileMenu);

  ui.navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 780) {
        closeMobileMenu();
      }
    });
  });

  ui.loginButton?.addEventListener('click', openLoginModal);
  ui.ctaLoginBtn?.addEventListener('click', openLoginModal);
  ui.closeModalBtn?.addEventListener('click', closeLoginModal);
  ui.closeSignupModalBtn?.addEventListener('click', closeSignupModal);

  ui.openSignupFromLogin?.addEventListener('click', () => {
    switchModal(ui.loginModal, ui.signupModal);
    setFeedback(ui.loginFeedback, '');
  });

  ui.openLoginFromSignup?.addEventListener('click', () => {
    switchModal(ui.signupModal, ui.loginModal);
    setFeedback(ui.signupFeedback, '');
  });

  ui.loginModal?.addEventListener('click', (event) => {
    const closeByBackdrop = event.target?.getAttribute('data-close-modal') === 'true';
    if (closeByBackdrop) {
      closeLoginModal();
    }
  });

  ui.signupModal?.addEventListener('click', (event) => {
    const closeByBackdrop = event.target?.getAttribute('data-close-modal') === 'true';
    if (closeByBackdrop) {
      closeSignupModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (ui.loginModal?.classList.contains('show')) {
      closeLoginModal();
    }

    if (ui.signupModal?.classList.contains('show')) {
      closeSignupModal();
    }
  });

  ui.loginForm?.addEventListener('submit', handleLogin);
  ui.signupForm?.addEventListener('submit', handleSignup);
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavScrollState();
  bindEvents();
  setupSmoothScroll();
  setupRevealAnimations();
});
