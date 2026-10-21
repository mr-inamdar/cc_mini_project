/* ══════════════════════════════════════
   orders.js — Order History Client
   ══════════════════════════════════════ */

const Orders = (() => {
  async function loadMyOrders() {
    const listEl = document.getElementById('orderHistoryList');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--blue)"></i><p style="margin-top:10px; color:var(--muted)">Loading your order history...</p></div>';

    if (!Auth.isLoggedIn()) {
      listEl.innerHTML = `
        <div class="empty-cart">
          <i class="fa-solid fa-lock"></i>
          <p>Please sign in to view your orders</p>
          <button class="btn btn-primary" onclick="UI.openAuthModal(); document.getElementById('orderHistoryModal').classList.remove('open');">Sign In Now</button>
        </div>`;
      return;
    }

    try {
      const { ok, data } = await Auth.apiFetch('/api/orders/my-orders');
      if (!ok) throw new Error(data.error || 'Failed to fetch orders');

      const orders = data.orders || [];
      if (orders.length === 0) {
        listEl.innerHTML = `
          <div class="empty-cart">
            <i class="fa-solid fa-receipt"></i>
            <p>No orders placed yet</p>
            <span style="font-size:0.85rem; color:var(--muted)">Start shopping and your confirmed orders will appear here.</span>
          </div>`;
        return;
      }

      listEl.innerHTML = orders.map(ord => {
        const dateStr = new Date(ord.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const statusClass = (ord.orderStatus || 'confirmed').toLowerCase();
        const payStatus = ord.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid (Demo Sandbox)';

        return `
          <div class="order-history-card">
            <div class="order-header-row">
              <div>
                <span class="order-id-tag">${ord.orderNumber}</span>
                <span class="order-date" style="margin-left: 10px;">• ${dateStr}</span>
              </div>
              <div>
                <span class="order-status-pill ${statusClass}">${ord.orderStatus || 'Confirmed'}</span>
              </div>
            </div>

            <div class="order-items-preview">
              ${(ord.items || []).map(it => `
                <div class="order-item-snippet">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-box" style="color:var(--blue); font-size:0.8rem;"></i>
                    <span><strong>${it.name}</strong> × ${it.quantity}</span>
                  </div>
                  <span>₹${(it.price * it.quantity).toLocaleString('en-IN')}</span>
                </div>
              `).join('')}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px dashed var(--border); font-size:0.85rem;">
              <span style="color:var(--muted);">
                <i class="fa-solid fa-shield-halved" style="color:var(--cyan); margin-right:4px;"></i>
                ${payStatus}
              </span>
              <span style="font-size:1rem; font-weight:700; color:#fff;">Total: ₹${(ord.totalAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      listEl.innerHTML = `<div class="form-msg error" style="display:block;">${err.message}</div>`;
    }
  }

  function openOrderModal() {
    const modal = document.getElementById('orderHistoryModal');
    if (modal) {
      modal.classList.add('open');
      loadMyOrders();
    }
  }

  function closeOrderModal() {
    const modal = document.getElementById('orderHistoryModal');
    if (modal) modal.classList.remove('open');
  }

  function bindEvents() {
    const closeBtn = document.getElementById('orderHistoryClose');
    if (closeBtn) closeBtn.addEventListener('click', closeOrderModal);

    const modal = document.getElementById('orderHistoryModal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeOrderModal();
      });
    }
  }

  return { loadMyOrders, openOrderModal, closeOrderModal, bindEvents };
})();
