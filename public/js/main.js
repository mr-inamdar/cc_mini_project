/* ══════════════════════════════════════
   main.js — App entry point
   ══════════════════════════════════════ */

/* ─── Toast System ──────────────────────────────────────────── */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
      <span class="toast-text">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* ─── UI helpers ────────────────────────────────────────────── */
const UI = {
  openAuthModal() {
    document.getElementById('authModal').classList.add('open');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  },
  closeAuthModal() { document.getElementById('authModal').classList.remove('open'); }
};

/* ─── 3D Tilt Effect ────────────────────────────────────────── */
function initTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-y * 18}deg) rotateY(${x * 18}deg) scale(1.04)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function initProductTilt() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(8px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ─── Products ──────────────────────────────────────────────── */
let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';

async function loadProducts() {
  try {
    const resp = await fetch('/api/products');
    const data = await resp.json();
    allProducts = data.products || data;
    renderProducts();
  } catch (e) {
    console.error('Failed to load products', e);
    document.getElementById('productsGrid').innerHTML = '<div class="no-results" style="display:block"><i class="fa-solid fa-wifi"></i><p>Could not load products.</p></div>';
  }
}

function renderProducts() {
  let filtered = allProducts;
  if (activeCategory !== 'all') filtered = filtered.filter(p => p.category === activeCategory);
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery));

  const grid = document.getElementById('productsGrid');
  const noResults = document.getElementById('noResults');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="card-shimmer"></div>
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="product-details">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <div class="product-price">₹${p.price.toLocaleString('en-IN')}</div>
          <button class="add-cart-btn" onclick="event.stopPropagation(); Cart.add(${JSON.stringify(JSON.stringify(p))})" title="Add to cart">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Fix: safe add-to-cart via data attribute
  grid.querySelectorAll('.add-cart-btn').forEach((btn, i) => {
    const p = filtered[i];
    btn.onclick = (e) => { e.stopPropagation(); Cart.add(p); };
  });

  initProductTilt();
}

/* ─── Navbar scroll ─────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

/* ─── Category buttons ──────────────────────────────────────── */
function bindCatButtons() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Sync mobile + desktop
      const cat = btn.dataset.cat;
      document.querySelectorAll(`.cat-btn[data-cat="${cat}"]`).forEach(b => b.classList.add('active'));
      activeCategory = cat;
      renderProducts();
      document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─── Search ────────────────────────────────────────────────── */
function bindSearch() {
  const toggle = document.getElementById('searchToggle');
  const bar = document.getElementById('searchBar');
  const input = document.getElementById('searchInput');
  const close = document.getElementById('searchClose');

  toggle.addEventListener('click', () => { bar.classList.toggle('open'); if (bar.classList.contains('open')) input.focus(); });
  close.addEventListener('click', () => { bar.classList.remove('open'); searchQuery = ''; input.value = ''; renderProducts(); });
  input.addEventListener('input', () => { searchQuery = input.value.toLowerCase().trim(); renderProducts(); });
}

/* ─── Auth Modal ────────────────────────────────────────────── */
function bindAuthModal() {
  const toggle = document.getElementById('authToggle');
  toggle.addEventListener('click', () => {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      if (confirm(`Signed in as ${user.name}.\nSign out?`)) Auth.logout();
    } else {
      UI.openAuthModal();
    }
  });

  document.getElementById('authModalClose').addEventListener('click', UI.closeAuthModal);
  document.getElementById('authModal').addEventListener('click', e => { if (e.target === document.getElementById('authModal')) UI.closeAuthModal(); });
  document.getElementById('switchToRegister').addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  });
  document.getElementById('switchToLogin').addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  });

  // Eye toggle
  document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.querySelector('i').className = inp.type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
    });
  });

  // Login
  document.getElementById('loginFormEl').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const msgEl = document.getElementById('loginMsg');
    btn.disabled = true; btn.textContent = 'Signing in…';
    msgEl.className = 'form-msg'; msgEl.style.display = 'none';

    const r = await Auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
    if (r.ok) {
      UI.closeAuthModal(); Auth.updateUI(); Toast.show(`Welcome back, ${r.data.user.name}!`, 'success');
    } else {
      msgEl.textContent = r.data.error || 'Login failed.';
      msgEl.className = 'form-msg error';
    }
    btn.disabled = false; btn.textContent = 'Sign In';
  });

  // Register
  document.getElementById('registerFormEl').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const msgEl = document.getElementById('registerMsg');
    btn.disabled = true; btn.textContent = 'Creating…';
    msgEl.className = 'form-msg'; msgEl.style.display = 'none';

    const pass = document.getElementById('regPassword').value;
    if (pass.length < 6) {
      msgEl.textContent = 'Password must be at least 6 characters.';
      msgEl.className = 'form-msg error';
      btn.disabled = false; btn.textContent = 'Create Account';
      return;
    }

    const r = await Auth.register(
      document.getElementById('regName').value,
      document.getElementById('regEmail').value,
      pass,
      document.getElementById('regPhone').value
    );
    if (r.ok) {
      UI.closeAuthModal(); Auth.updateUI(); Toast.show(`Welcome, ${r.data.user.name}!`, 'success');
    } else {
      msgEl.textContent = r.data.error || 'Registration failed.';
      msgEl.className = 'form-msg error';
    }
    btn.disabled = false; btn.textContent = 'Create Account';
  });

  // Footer shortcuts
  document.getElementById('footerLogin').addEventListener('click', e => { e.preventDefault(); UI.openAuthModal(); });
  document.getElementById('footerRegister').addEventListener('click', e => { e.preventDefault(); UI.openAuthModal(); document.getElementById('switchToRegister').click(); });
}

/* ─── Cart Drawer ───────────────────────────────────────────── */
function bindCartDrawer() {
  const open = () => {
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
  };
  const close = () => {
    document.getElementById('cartDrawer').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
  };
  document.getElementById('cartToggle').addEventListener('click', open);
  document.getElementById('cartClose').addEventListener('click', close);
  document.getElementById('cartOverlay').addEventListener('click', close);
  document.getElementById('checkoutBtn').addEventListener('click', () => { close(); Payment.initCheckout(); });
}

/* ─── Mobile Menu ───────────────────────────────────────────── */
function bindMobileMenu() {
  document.getElementById('mobileMenu').addEventListener('click', () => {
    document.getElementById('mobileNav').classList.toggle('open');
  });
}

/* ─── Hero Buttons ──────────────────────────────────────────── */
function bindHeroButtons() {
  document.getElementById('heroShop').addEventListener('click', () => {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('heroDeals').addEventListener('click', () => {
    activeCategory = 'gaming';
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'gaming'));
    renderProducts();
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ─── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Cart.init();
  loadProducts();
  bindCatButtons();
  bindSearch();
  bindAuthModal();
  bindCartDrawer();
  bindMobileMenu();
  bindHeroButtons();
  Payment.bindEvents();
  initTilt();
});
