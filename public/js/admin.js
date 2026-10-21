/* ══════════════════════════════════════
   admin.js — Apex Administrator Dashboard Controller
   ══════════════════════════════════════ */

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

let adminProducts = [];
let adminOrders = [];

// ─── Authentication Guard ─────────────────────────────────────────────
async function checkAdminAuth() {
  const gate = document.getElementById('adminLoginGate');
  const main = document.getElementById('adminMainContent');
  const userBadge = document.getElementById('adminUserBadge');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (!Auth.isLoggedIn()) {
    gate.style.display = 'block';
    main.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return false;
  }

  // Verify role with backend
  const { ok, data } = await Auth.apiFetch('/api/auth/me');
  if (ok && data.user && data.user.role === 'admin') {
    gate.style.display = 'none';
    main.style.display = 'block';
    if (userBadge) {
      userBadge.style.display = 'flex';
      document.getElementById('adminUserName').textContent = data.user.name;
    }
    if (logoutBtn) logoutBtn.style.display = 'block';
    loadDashboardData();
    return true;
  } else {
    gate.style.display = 'block';
    main.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    Toast.show('Please sign in with an Administrator account', 'error');
    return false;
  }
}

// ─── Load Dashboard Data ──────────────────────────────────────────────
async function loadDashboardData() {
  await Promise.all([loadAdminProducts(), loadAdminOrders()]);
  updateDashboardStats();
}

function updateDashboardStats() {
  document.getElementById('statTotalProducts').textContent = adminProducts.length;
  document.getElementById('statTotalOrders').textContent = adminOrders.length;

  const totalRev = adminOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  document.getElementById('statTotalRevenue').textContent = '₹' + totalRev.toLocaleString('en-IN');

  const activeShip = adminOrders.filter(o => o.orderStatus === 'shipped' || o.orderStatus === 'processing').length;
  document.getElementById('statActiveShipments').textContent = activeShip;
}

// ─── Products Management ──────────────────────────────────────────────
async function loadAdminProducts() {
  try {
    const { ok, data } = await Auth.apiFetch('/api/products');
    if (ok && data.products) {
      adminProducts = data.products;
      renderAdminProducts(adminProducts);
    }
  } catch (err) {
    Toast.show('Failed to load products: ' + err.message, 'error');
  }
}

function renderAdminProducts(list) {
  const tbody = document.getElementById('adminProductsTbody');
  const countLabel = document.getElementById('productCountLabel');
  if (!tbody) return;

  if (countLabel) countLabel.textContent = `Showing ${list.length} products`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">No products found in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const id = p._id || p.id;
    return `
      <tr>
        <td>
          <img src="${p.img}" alt="${p.name}" class="table-img" onerror="this.src='/assets/icon.png'" />
        </td>
        <td>
          <strong style="color:#fff;">${p.name}</strong><br />
          <span style="font-size:0.8rem; color:var(--muted);">${p.brand || 'Apex'}</span>
        </td>
        <td>
          <span class="badge-tag sale" style="font-size:0.75rem;">${p.category}</span>
        </td>
        <td>
          <strong style="color:var(--cyan)">₹${Number(p.price).toLocaleString('en-IN')}</strong>
        </td>
        <td>
          <span style="color:${(p.stock || 0) < 5 ? '#f87171' : '#4ade80'}; font-weight:600;">
            ${p.stock !== undefined ? p.stock : 25} units
          </span>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; margin-right:6px;" onclick="openEditProductModal('${id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:#f87171; border-color:rgba(239,68,68,0.3);" onclick="deleteProduct('${id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Orders Management ────────────────────────────────────────────────
async function loadAdminOrders() {
  try {
    const { ok, data } = await Auth.apiFetch('/api/orders/all');
    if (ok && data.orders) {
      adminOrders = data.orders;
      renderAdminOrders(adminOrders);
    }
  } catch (err) {
    Toast.show('Failed to load orders: ' + err.message, 'error');
  }
}

function renderAdminOrders(list) {
  const tbody = document.getElementById('adminOrdersTbody');
  const countLabel = document.getElementById('orderCountLabel');
  if (!tbody) return;

  if (countLabel) countLabel.textContent = `${list.length} orders total`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">No customer orders recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(o => {
    const id = o._id || o.orderNumber;
    const dateStr = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const itemsPreview = (o.items || []).map(i => `${i.name} (${i.quantity})`).join(', ');

    return `
      <tr>
        <td>
          <strong style="color:var(--cyan); font-family:monospace;">${o.orderNumber}</strong><br />
          <span style="font-size:0.75rem; color:var(--muted);">${dateStr}</span>
        </td>
        <td>
          <strong>${o.customerName}</strong><br />
          <span style="font-size:0.78rem; color:var(--muted);">${o.customerPhone || o.customerEmail}</span>
        </td>
        <td style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${itemsPreview}">
          <span style="font-size:0.85rem;">${itemsPreview}</span>
        </td>
        <td>
          <strong style="color:#fff;">₹${(o.totalAmount || 0).toLocaleString('en-IN')}</strong>
        </td>
        <td>
          <span style="font-size:0.8rem; color:${o.paymentMethod === 'cod' ? '#facc15' : '#4ade80'};">
            ${o.paymentMethod === 'cod' ? 'COD' : 'Paid (Demo)'}
          </span>
        </td>
        <td>
          <select class="status-select" onchange="updateOrderStatus('${id}', this.value)">
            <option value="confirmed" ${o.orderStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="processing" ${o.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${o.orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${o.orderStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${o.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <span class="order-status-pill ${o.orderStatus || 'confirmed'}">${o.orderStatus || 'Confirmed'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const { ok, data } = await Auth.apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ orderStatus: newStatus })
    });
    if (ok) {
      Toast.show(`Order status updated to ${newStatus}`, 'success');
      loadAdminOrders();
      updateDashboardStats();
    } else {
      Toast.show(data.error || 'Failed to update order', 'error');
    }
  } catch (err) {
    Toast.show('Error updating status: ' + err.message, 'error');
  }
}

// ─── Product CRUD Modals & Actions ─────────────────────────────────────
function openAddProductModal() {
  document.getElementById('pmId').value = '';
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('pmStock').value = '25';
  document.getElementById('productModal').classList.add('open');
}

function openEditProductModal(id) {
  const p = adminProducts.find(item => String(item._id || item.id) === String(id));
  if (!p) return;

  document.getElementById('pmId').value = p._id || p.id;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('pmName').value = p.name || '';
  document.getElementById('pmBrand').value = p.brand || '';
  document.getElementById('pmCategory').value = p.category || 'mobile';
  document.getElementById('pmStock').value = p.stock !== undefined ? p.stock : 25;
  document.getElementById('pmPrice').value = p.price || '';
  document.getElementById('pmOriginalPrice').value = p.originalPrice || '';
  document.getElementById('pmImg').value = p.img || '';
  document.getElementById('pmDesc').value = p.description || '';
  document.getElementById('pmFeatures').value = Array.isArray(p.features) ? p.features.join(', ') : (p.features || '');

  document.getElementById('productModal').classList.add('open');
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product from the store?')) return;

  try {
    const { ok, data } = await Auth.apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    if (ok) {
      Toast.show('Product deleted successfully', 'success');
      loadAdminProducts();
      updateDashboardStats();
    } else {
      Toast.show(data.error || 'Failed to delete product', 'error');
    }
  } catch (err) {
    Toast.show('Error deleting product: ' + err.message, 'error');
  }
}

// ─── Bind Page Events ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  checkAdminAuth();

  // Admin login form submit
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admEmail').value;
      const pass = document.getElementById('admPass').value;
      const btn = document.getElementById('admLoginBtn');
      const msg = document.getElementById('admLoginMsg');

      btn.disabled = true;
      btn.textContent = 'Verifying Admin…';
      msg.style.display = 'none';

      const r = await Auth.login(email, pass);
      if (r.ok && r.data.user && r.data.user.role === 'admin') {
        Toast.show('Welcome Administrator!', 'success');
        checkAdminAuth();
      } else {
        msg.textContent = r.data.error || 'Access denied: Valid administrator credentials required.';
        msg.className = 'form-msg error';
        msg.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Sign In to Dashboard';
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await Auth.logout();
      window.location.reload();
    });
  }

  // Tab switching
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tabProducts').style.display = tab === 'products' ? 'block' : 'none';
      document.getElementById('tabOrders').style.display = tab === 'orders' ? 'block' : 'none';
    });
  });

  // Product search filter in admin table
  const searchInp = document.getElementById('adminProductSearch');
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      const q = searchInp.value.toLowerCase().trim();
      const filtered = adminProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
      renderAdminProducts(filtered);
    });
  }

  // Open Add modal
  const openAddBtn = document.getElementById('openAddProductModal');
  if (openAddBtn) openAddBtn.addEventListener('click', openAddProductModal);

  // Close modal
  const modalClose = document.getElementById('productModalClose');
  const prodModal = document.getElementById('productModal');
  if (modalClose) modalClose.addEventListener('click', () => prodModal.classList.remove('open'));
  if (prodModal) {
    prodModal.addEventListener('click', (e) => {
      if (e.target === prodModal) prodModal.classList.remove('open');
    });
  }

  // Save product form submit (Create or Update)
  const prodForm = document.getElementById('productForm');
  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('pmId').value;
      const name = document.getElementById('pmName').value;
      const brand = document.getElementById('pmBrand').value;
      const category = document.getElementById('pmCategory').value;
      const stock = document.getElementById('pmStock').value;
      const price = document.getElementById('pmPrice').value;
      const originalPrice = document.getElementById('pmOriginalPrice').value;
      const img = document.getElementById('pmImg').value;
      const description = document.getElementById('pmDesc').value;
      const featuresRaw = document.getElementById('pmFeatures').value;
      const features = featuresRaw.split(',').map(s => s.trim()).filter(Boolean);

      const payload = { name, brand, category, stock, price, originalPrice, img, description, features };
      const btn = document.getElementById('pmSubmitBtn');
      const msg = document.getElementById('pmMsg');

      btn.disabled = true;
      btn.textContent = 'Saving…';
      msg.style.display = 'none';

      let res;
      if (id) {
        res = await Auth.apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        res = await Auth.apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (res.ok) {
        Toast.show(id ? 'Product updated successfully!' : 'Product added to catalog!', 'success');
        prodModal.classList.remove('open');
        loadAdminProducts();
        updateDashboardStats();
      } else {
        msg.textContent = res.data.error || 'Failed to save product.';
        msg.className = 'form-msg error';
        msg.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Save Product';
    });
  }

  // Sync default catalog
  const syncBtn = document.getElementById('syncCatalogBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing…';
      const res = await Auth.apiFetch('/api/products/seed', { method: 'POST' });
      if (res.ok) {
        Toast.show('Catalog synchronized!', 'success');
        loadAdminProducts();
        updateDashboardStats();
      } else {
        Toast.show(res.data.error || 'Catalog sync completed', 'info');
      }
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync Default Catalog';
    });
  }
});
