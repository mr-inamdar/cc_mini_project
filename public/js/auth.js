/* ══════════════════════════════════════
   auth.js — Authentication manager
   ══════════════════════════════════════ */

const Auth = (() => {
  let _user = null;

  function getToken() { return localStorage.getItem('apex_token'); }
  function setToken(t) { localStorage.setItem('apex_token', t); }
  function clearToken() { localStorage.removeItem('apex_token'); localStorage.removeItem('apex_user'); }
  function getUser() { return _user || JSON.parse(localStorage.getItem('apex_user') || 'null'); }
  function setUser(u) { _user = u; localStorage.setItem('apex_user', JSON.stringify(u)); }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers, credentials: 'include' });
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  }

  async function register(name, email, password, phone) {
    const r = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) });
    if (r.ok) { setToken(r.data.token); setUser(r.data.user); }
    return r;
  }

  async function login(email, password) {
    const r = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (r.ok) { setToken(r.data.token); setUser(r.data.user); }
    return r;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    _user = null;
    updateUI();
  }

  function isLoggedIn() { return !!getToken(); }

  function updateUI() {
    const user = getUser();
    const btn = document.getElementById('authToggle');
    if (!btn) return;
    if (isLoggedIn() && user) {
      btn.innerHTML = `<i class="fa-solid fa-user-check"></i>`;
      btn.title = `Signed in as ${user.name}`;
    } else {
      btn.innerHTML = `<i class="fa-regular fa-user"></i>`;
      btn.title = 'Sign in';
    }
  }

  function init() { updateUI(); }

  return { register, login, logout, isLoggedIn, getUser, getToken, apiFetch, updateUI, init };
})();
