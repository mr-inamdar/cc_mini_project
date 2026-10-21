/* ══════════════════════════════════════
   auth.js — Authentication & Profile Manager
   ══════════════════════════════════════ */

const Auth = (() => {
  let _user = null;

  function getToken() { return localStorage.getItem('apex_token'); }
  function setToken(t) { localStorage.setItem('apex_token', t); }
  function clearToken() {
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_user');
  }
  function getUser() {
    if (_user) return _user;
    try {
      return JSON.parse(localStorage.getItem('apex_user') || 'null');
    } catch (e) {
      return null;
    }
  }
  function setUser(u) {
    _user = u;
    localStorage.setItem('apex_user', JSON.stringify(u));
  }

  function isLoggedIn() { return !!getToken(); }
  function isAdmin() {
    const u = getUser();
    return !!(u && u.role === 'admin');
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers, credentials: 'include' });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  }

  async function register(name, email, password, phone, role) {
    const r = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, role })
    });
    if (r.ok) {
      setToken(r.data.token);
      setUser(r.data.user);
      updateUI();
    }
    return r;
  }

  async function login(email, password) {
    const r = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (r.ok) {
      setToken(r.data.token);
      setUser(r.data.user);
      updateUI();
    }
    return r;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    _user = null;
    updateUI();
    closeProfileModal();
    Toast.show('Signed out successfully', 'info');
  }

  async function checkSession() {
    if (!getToken()) return;
    try {
      const { ok, data } = await apiFetch('/api/auth/me');
      if (ok && data.user) {
        setUser(data.user);
        updateUI();
      } else {
        clearToken();
        _user = null;
        updateUI();
      }
    } catch (e) {
      // offline/fallback
    }
  }

  function openProfileModal() {
    const u = getUser();
    if (!u) {
      UI.openAuthModal();
      return;
    }

    const modal = document.getElementById('profileModal');
    if (!modal) return;

    const initials = (u.name || 'User').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileEmail').textContent = u.email;
    const roleBadge = document.getElementById('profileRole');
    if (roleBadge) {
      roleBadge.textContent = u.role === 'admin' ? 'Administrator' : 'Customer';
      roleBadge.className = `profile-role-badge ${u.role || 'user'}`;
    }

    const adminBtn = document.getElementById('profileAdminBtn');
    if (adminBtn) {
      adminBtn.style.display = u.role === 'admin' ? 'flex' : 'none';
    }

    modal.classList.add('open');
  }

  function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('open');
  }

  function updateUI() {
    const user = getUser();
    const btn = document.getElementById('authToggle');
    if (!btn) return;

    if (isLoggedIn() && user) {
      btn.innerHTML = user.role === 'admin' ? `<i class="fa-solid fa-user-shield" style="color:var(--pink)"></i>` : `<i class="fa-solid fa-user-check" style="color:var(--cyan)"></i>`;
      btn.title = `${user.name} (${user.role === 'admin' ? 'Admin' : 'Account'})`;
    } else {
      btn.innerHTML = `<i class="fa-regular fa-user"></i>`;
      btn.title = 'Sign in';
    }
  }

  function init() {
    updateUI();
    checkSession();

    const profileClose = document.getElementById('profileModalClose');
    if (profileClose) profileClose.addEventListener('click', closeProfileModal);

    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
      profileModal.addEventListener('click', e => {
        if (e.target === profileModal) closeProfileModal();
      });
    }

    const logoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const profileOrdersBtn = document.getElementById('profileOrdersBtn');
    if (profileOrdersBtn) {
      profileOrdersBtn.addEventListener('click', () => {
        closeProfileModal();
        Orders.openOrderModal();
      });
    }
  }

  return {
    register,
    login,
    logout,
    isLoggedIn,
    isAdmin,
    getUser,
    getToken,
    apiFetch,
    openProfileModal,
    closeProfileModal,
    updateUI,
    init
  };
})();
