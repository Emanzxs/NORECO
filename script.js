// ── GLOBAL TOAST ───────────────────────────────────────────────
function showToast(message, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity .4s';
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// ── LOGOUT ─────────────────────────────────────────────────────
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('ecmsUser');
    window.location.href = 'login.html';
  }
}

// ── DOM READY ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // 1. Active nav highlight
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href') === page && link.id !== 'loginNavBtn') {
  link.classList.add('active');
}
  });

  // 2. Update nav based on logged-in user
  const user = JSON.parse(localStorage.getItem('ecmsUser') || 'null');
  if (user) {
    // Transform Login button into a User Profile / Logout button
    const loginLink = document.querySelector('nav a[href="login.html"]');
    if (loginLink) {
      loginLink.textContent = '👤 ' + (user.name || 'Account');
      loginLink.removeAttribute('href');
      loginLink.style.cursor = 'pointer';
      loginLink.title = 'Click to logout';
      loginLink.onclick = (e) => { e.preventDefault(); logout(); };
    }

    // Show dashboard links for staff/admin
    const dashLink = document.getElementById('dashLink');
    if (dashLink && (user.role === 'staff' || user.role === 'admin')) {
      dashLink.style.display = 'flex';
    }

    // Show admin link for admin only
    const adminLink = document.getElementById('adminLink');
    if (adminLink && user.role === 'admin') {
      adminLink.style.display = 'flex';
    }
  }

  // 3. Hamburger menu toggle
  const toggle = document.querySelector('.menu-toggle');
  const nav    = document.querySelector('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
    });
    // Close menu when a link is clicked
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.classList.remove('open');
      nav.classList.remove('open');
    }));
  }
});
