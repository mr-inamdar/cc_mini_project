/* ══════════════════════════════════════
   main.js — Apex Studio App Entry Point
   ══════════════════════════════════════ */

/* ─── Toast System ──────────────────────────────────────────── */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const container = document.getElementById('toastContainer');
    if (!container) return;

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

/* ─── UI Helpers ────────────────────────────────────────────── */
const UI = {
  openAuthModal() {
    document.getElementById('authModal').classList.add('open');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  },
  closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
  },
  openWishlistDrawer() {
    const drawer = document.getElementById('wishlistDrawer');
    const overlay = document.getElementById('wishlistOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    Wishlist.renderWishlist();
  },
  closeWishlistDrawer() {
    const drawer = document.getElementById('wishlistDrawer');
    const overlay = document.getElementById('wishlistOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
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

/* ─── Products Catalog & Detail Modal ───────────────────────── */
let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';
let activeSort = 'default';
let currentDetailProduct = null;
let currentDetailQty = 1;

async function loadProducts() {
  try {
    let url = '/api/products';
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.append('category', activeCategory);
    if (searchQuery) params.append('q', searchQuery);
    if (activeSort !== 'default') params.append('sort', activeSort);

    const queryString = params.toString();
    if (queryString) url += '?' + queryString;

    const resp = await fetch(url);
    const data = await resp.json();
    allProducts = data.products || [];
    renderProducts();
  } catch (e) {
    console.error('Failed to load products', e);
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = '<div class="no-results" style="display:block"><i class="fa-solid fa-wifi"></i><p>Could not load products. Please ensure the server is running.</p></div>';
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  if (allProducts.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  grid.innerHTML = allProducts.map((p, idx) => {
    const pId = String(p._id || p.id);
    const isWished = Wishlist.isInWishlist(pId);
    const origPrice = p.originalPrice || Math.round(p.price * 1.18);
    const discount = Math.round(((origPrice - p.price) / origPrice) * 100);

    return `
      <div class="product-card" data-id="${pId}">
        <div class="card-shimmer"></div>
        <div class="card-badges">
          ${discount > 0 ? `<span class="badge-tag sale">${discount}% OFF</span>` : ''}
          ${p.isFeatured || idx < 3 ? `<span class="badge-tag hot">HOT</span>` : ''}
        </div>
        <button class="card-wishlist-btn ${isWished ? 'active' : ''}" data-id="${pId}" title="Add to Wishlist">
          <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart"></i>
        </button>
        <div class="product-img-wrap">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="product-details">
          <div class="product-brand">${p.brand || 'Apex'}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star-half-stroke"></i>
            <span>(${p.reviewsCount || 48})</span>
          </div>
          <div class="product-footer">
            <div class="product-price-row">
              <span class="product-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
              ${origPrice > p.price ? `<span class="product-old-price">₹${origPrice.toLocaleString('en-IN')}</span>` : ''}
            </div>
            <button class="add-cart-btn" data-id="${pId}" title="Add to cart">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers for details modal
  grid.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    const p = allProducts.find(item => String(item._id || item.id) === id);

    card.addEventListener('click', (e) => {
      // If clicked wishlist or add-to-cart button, don't open modal
      if (e.target.closest('.card-wishlist-btn') || e.target.closest('.add-cart-btn')) return;
      if (p) openProductDetail(p);
    });

    const addBtn = card.querySelector('.add-cart-btn');
    if (addBtn && p) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Cart.add(p);
      });
    }

    const wlBtn = card.querySelector('.card-wishlist-btn');
    if (wlBtn && p) {
      wlBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Wishlist.toggle(p);
      });
    }
  });

  initProductTilt();
}

/* ─── Product Detail Modal ──────────────────────────────────── */
function openProductDetail(p) {
  currentDetailProduct = p;
  currentDetailQty = 1;

  const modal = document.getElementById('productDetailModal');
  if (!modal) return;

  const pId = String(p._id || p.id);
  const origPrice = p.originalPrice || Math.round(p.price * 1.18);
  const discount = Math.round(((origPrice - p.price) / origPrice) * 100);
  const isWished = Wishlist.isInWishlist(pId);

  document.getElementById('detailImg').src = p.img;
  document.getElementById('detailBrand').textContent = p.brand || 'Apex Exclusive';
  document.getElementById('detailTitle').textContent = p.name;
  document.getElementById('detailPrice').textContent = '₹' + Number(p.price).toLocaleString('en-IN');
  document.getElementById('detailOldPrice').textContent = origPrice > p.price ? '₹' + origPrice.toLocaleString('en-IN') : '';
  document.getElementById('detailDiscount').textContent = discount > 0 ? `${discount}% OFF` : '';
  document.getElementById('detailDiscount').style.display = discount > 0 ? 'inline-block' : 'none';
  document.getElementById('detailDesc').textContent = p.description || `${p.name} combines precision engineering with next-generation aesthetics.`;
  document.getElementById('detailStock').innerHTML = `<i class="fa-solid fa-circle-check"></i> In Stock (${p.stock || 25} units available)`;
  document.getElementById('detailQtyDisplay').textContent = currentDetailQty;

  const featuresContainer = document.getElementById('detailFeatures');
  if (featuresContainer) {
    const feats = p.features && p.features.length ? p.features : ['1-Year Comprehensive Warranty', 'Instant Free Dispatch', 'Original Certified Quality', '7-Day Easy Returns'];
    featuresContainer.innerHTML = feats.map(f => `<span class="feature-pill"><i class="fa-solid fa-check"></i> ${f}</span>`).join('');
  }

  const wlBtn = document.getElementById('detailWishlistBtn');
  if (wlBtn) {
    wlBtn.innerHTML = `<i class="fa-${isWished ? 'solid' : 'regular'} fa-heart"></i> ${isWished ? 'In Wishlist' : 'Add to Wishlist'}`;
    wlBtn.classList.toggle('active', isWished);
  }

  modal.classList.add('open');
}

function bindProductDetailModal() {
  const modal = document.getElementById('productDetailModal');
  const closeBtn = document.getElementById('productDetailClose');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  const qtyMinus = document.getElementById('detailQtyMinus');
  const qtyPlus = document.getElementById('detailQtyPlus');
  const qtyDisplay = document.getElementById('detailQtyDisplay');

  if (qtyMinus && qtyPlus && qtyDisplay) {
    qtyMinus.addEventListener('click', () => {
      if (currentDetailQty > 1) {
        currentDetailQty--;
        qtyDisplay.textContent = currentDetailQty;
      }
    });
    qtyPlus.addEventListener('click', () => {
      if (currentDetailQty < 10) {
        currentDetailQty++;
        qtyDisplay.textContent = currentDetailQty;
      }
    });
  }

  const addBtn = document.getElementById('detailAddToCart');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (currentDetailProduct) {
        Cart.add(currentDetailProduct, currentDetailQty);
        modal.classList.remove('open');
      }
    });
  }

  const wlBtn = document.getElementById('detailWishlistBtn');
  if (wlBtn) {
    wlBtn.addEventListener('click', async () => {
      if (currentDetailProduct) {
        const added = await Wishlist.toggle(currentDetailProduct);
        wlBtn.innerHTML = `<i class="fa-${added ? 'solid' : 'regular'} fa-heart"></i> ${added ? 'In Wishlist' : 'Add to Wishlist'}`;
        wlBtn.classList.toggle('active', added);
      }
    });
  }
}

/* ─── Navbar Scroll & Category Buttons ──────────────────────── */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
});

function bindCatButtons() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll(`.cat-btn[data-cat="${cat}"]`).forEach(b => b.classList.add('active'));
      activeCategory = cat;
      loadProducts();
      document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─── Search & Sort ─────────────────────────────────────────── */
function bindSearch() {
  const toggle = document.getElementById('searchToggle');
  const bar = document.getElementById('searchBar');
  const input = document.getElementById('searchInput');
  const close = document.getElementById('searchClose');

  if (toggle && bar && input) {
    toggle.addEventListener('click', () => {
      bar.classList.toggle('open');
      if (bar.classList.contains('open')) input.focus();
    });
  }
  if (close && bar && input) {
    close.addEventListener('click', () => {
      bar.classList.remove('open');
      searchQuery = '';
      input.value = '';
      loadProducts();
    });
  }
  if (input) {
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = input.value.trim();
        loadProducts();
      }, 250);
    });
  }
}

/* ─── Auth & Profile Modal ──────────────────────────────────── */
function bindAuthModal() {
  const toggle = document.getElementById('authToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (Auth.isLoggedIn()) {
        Auth.openProfileModal();
      } else {
        UI.openAuthModal();
      }
    });
  }

  const closeBtn = document.getElementById('authModalClose');
  if (closeBtn) closeBtn.addEventListener('click', UI.closeAuthModal);

  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) UI.closeAuthModal();
    });
  }

  const switchToReg = document.getElementById('switchToRegister');
  const switchToLog = document.getElementById('switchToLogin');
  if (switchToReg) {
    switchToReg.addEventListener('click', () => {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
    });
  }
  if (switchToLog) {
    switchToLog.addEventListener('click', () => {
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'none';
    });
  }

  // Password visibility eye
  document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (inp) {
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.querySelector('i').className = inp.type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
      }
    });
  });

  // Login Form
  const loginForm = document.getElementById('loginFormEl');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const msgEl = document.getElementById('loginMsg');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      msgEl.className = 'form-msg';
      msgEl.style.display = 'none';

      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;

      const r = await Auth.login(email, pass);
      if (r.ok) {
        UI.closeAuthModal();
        Auth.updateUI();
        Wishlist.syncFromBackend();
        Toast.show(`Welcome back, ${r.data.user.name}!`, 'success');
      } else {
        msgEl.textContent = r.data.error || 'Login failed.';
        msgEl.className = 'form-msg error';
        msgEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Sign In';
    });
  }

  // Register Form
  const regForm = document.getElementById('registerFormEl');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('registerBtn');
      const msgEl = document.getElementById('registerMsg');
      btn.disabled = true;
      btn.textContent = 'Creating…';
      msgEl.className = 'form-msg';
      msgEl.style.display = 'none';

      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const phone = document.getElementById('regPhone').value;
      const pass = document.getElementById('regPassword').value;

      if (pass.length < 6) {
        msgEl.textContent = 'Password must be at least 6 characters.';
        msgEl.className = 'form-msg error';
        msgEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
      }

      const r = await Auth.register(name, email, pass, phone);
      if (r.ok) {
        UI.closeAuthModal();
        Auth.updateUI();
        Toast.show(`Welcome, ${r.data.user.name}!`, 'success');
      } else {
        msgEl.textContent = r.data.error || 'Registration failed.';
        msgEl.className = 'form-msg error';
        msgEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Create Account';
    });
  }

  // Footer Shortcuts
  const footerLogin = document.getElementById('footerLogin');
  const footerReg = document.getElementById('footerRegister');
  if (footerLogin) {
    footerLogin.addEventListener('click', e => { e.preventDefault(); UI.openAuthModal(); });
  }
  if (footerReg) {
    footerReg.addEventListener('click', e => {
      e.preventDefault();
      UI.openAuthModal();
      document.getElementById('switchToRegister').click();
    });
  }
}

/* ─── Cart & Wishlist Drawers ───────────────────────────────── */
function bindDrawers() {
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const openCart = () => {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
  };
  const closeCart = () => {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
  };

  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCart();
      Payment.initCheckout();
    });
  }

  // Wishlist Drawer
  const wlToggle = document.getElementById('wishlistToggle');
  const wlClose = document.getElementById('wishlistClose');
  const wlOverlay = document.getElementById('wishlistOverlay');

  if (wlToggle) wlToggle.addEventListener('click', UI.openWishlistDrawer);
  if (wlClose) wlClose.addEventListener('click', UI.closeWishlistDrawer);
  if (wlOverlay) wlOverlay.addEventListener('click', UI.closeWishlistDrawer);
}

/* ─── Mobile Menu & Hero ────────────────────────────────────── */
function bindMobileMenu() {
  const menuBtn = document.getElementById('mobileMenu');
  const mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }
}

function bindHeroButtons() {
  const heroShop = document.getElementById('heroShop');
  const heroDeals = document.getElementById('heroDeals');

  if (heroShop) {
    heroShop.addEventListener('click', () => {
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (heroDeals) {
    heroDeals.addEventListener('click', () => {
      activeCategory = 'gaming';
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'gaming'));
      loadProducts();
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

/* ─── Application Bootstrap ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Cart.init();
  Wishlist.init();
  Orders.bindEvents();
  loadProducts();
  bindCatButtons();
  bindSearch();
  bindAuthModal();
  bindProductDetailModal();
  bindDrawers();
  bindMobileMenu();
  bindHeroButtons();
  Payment.bindEvents();
  initTilt();
});
