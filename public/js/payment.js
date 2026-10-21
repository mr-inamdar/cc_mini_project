/* ══════════════════════════════════════
   payment.js — Simulated Demo Payment Flow
   ══════════════════════════════════════ */

const Payment = (() => {
  let _addressData = null;

  function initCheckout() {
    if (Cart.getItems().length === 0) {
      Toast.show('Your cart is empty', 'error');
      return;
    }

    _addressData = null;
    goToStep(1);
    document.getElementById('checkoutModal').classList.add('open');

    // Pre-fill user data if logged in
    const user = Auth.getUser();
    if (user) {
      const nameInput = document.getElementById('ckName');
      const emailInput = document.getElementById('ckEmail');
      const phoneInput = document.getElementById('ckPhone');
      if (nameInput && !nameInput.value) nameInput.value = user.name || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
    }
  }

  function goToStep(n) {
    ['checkoutStep1', 'checkoutStep2', 'checkoutStep3'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.style.display = (i + 1 === n) ? 'block' : 'none';
    });
    ['step1Ind', 'step2Ind', 'step3Ind'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', i + 1 <= n);
    });
  }

  function buildOrderSummary() {
    const items = Cart.getItems();
    const sub = Cart.getSubtotal();
    const discount = Cart.getDiscount();
    const delivery = Cart.getDeliveryFee();
    const total = Cart.getTotal();
    const box = document.getElementById('orderSummaryBox');
    if (!box) return;

    box.innerHTML = `
      <div style="font-weight:700; margin-bottom:8px; font-size:0.95rem; color:var(--text);">Order Summary (${items.length} items)</div>
      ${items.map(it => `
        <div class="summary-row" style="font-size:0.88rem; display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>${it.name} <strong style="color:var(--muted)">× ${it.quantity}</strong></span>
          <span>₹${(it.price * it.quantity).toLocaleString('en-IN')}</span>
        </div>
      `).join('')}
      <div class="summary-row" style="display:flex; justify-content:space-between; margin-top:8px; border-top:1px dashed var(--border); padding-top:8px;">
        <span style="color:var(--muted)">Subtotal</span>
        <span>₹${sub.toLocaleString('en-IN')}</span>
      </div>
      ${discount > 0 ? `
        <div class="summary-row" style="display:flex; justify-content:space-between; color:#4ade80;">
          <span>Coupon Discount</span>
          <span>-₹${discount.toLocaleString('en-IN')}</span>
        </div>
      ` : ''}
      <div class="summary-row" style="display:flex; justify-content:space-between;">
        <span style="color:var(--muted)">Delivery</span>
        <span style="color:${delivery === 0 ? '#4ade80' : 'inherit'}">${delivery === 0 ? 'FREE' : '₹' + delivery}</span>
      </div>
      <div class="summary-row total" style="display:flex; justify-content:space-between; margin-top:10px; border-top:1px solid var(--border); padding-top:10px; font-size:1.15rem; font-weight:800; color:#fff;">
        <span>Total Payable</span>
        <span style="color:var(--cyan)">₹${total.toLocaleString('en-IN')}</span>
      </div>
    `;
  }

  async function executePayment(method) {
    const btn = document.getElementById('placeOrderBtn');
    const msgEl = document.getElementById('payMsg');
    btn.disabled = true;
    msgEl.className = 'form-msg';
    msgEl.style.display = 'none';

    try {
      const items = Cart.getItems();
      const subtotal = Cart.getSubtotal();
      const discount = Cart.getDiscount();
      const deliveryFee = Cart.getDeliveryFee();
      const totalAmount = Cart.getTotal();

      if (method === 'demo_payment') {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Demo Payment…';
        // Simulate realistic 1.2s sandbox transaction latency
        await new Promise(r => setTimeout(r, 1200));
      } else {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing COD Order…';
        await new Promise(r => setTimeout(r, 600));
      }

      // Send to Backend API
      const { ok, data } = await Auth.apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ..._addressData,
          items: items.map(i => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            img: i.img,
            category: i.category
          })),
          subtotal,
          discount,
          deliveryFee,
          totalAmount,
          paymentMethod: method
        })
      });

      if (!ok) {
        throw new Error(data.error || 'Failed to complete order.');
      }

      // Success! Clear cart
      Cart.clear();

      // Update success screen
      const orderNumEl = document.getElementById('successOrderNum');
      if (orderNumEl) {
        orderNumEl.innerHTML = `Order ID: <strong style="color:var(--cyan)">${data.orderNumber}</strong>`;
      }

      const noteEl = document.getElementById('successNote');
      if (noteEl) {
        noteEl.textContent = method === 'demo_payment'
          ? 'Demo payment verified instantly. Estimated delivery in 2-3 business days.'
          : 'Cash on Delivery verified. Pay when your parcel arrives.';
      }

      goToStep(3);
      Toast.show(data.message || 'Order placed successfully!', 'success');

    } catch (err) {
      showPayMsg('error', err.message);
      resetBtn(btn);
    }
  }

  function showPayMsg(type, msg) {
    const el = document.getElementById('payMsg');
    if (el) {
      el.textContent = msg;
      el.className = `form-msg ${type}`;
      el.style.display = 'block';
    }
  }

  function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = 'Complete Order <i class="fa-solid fa-shield-halved"></i>';
  }

  function bindEvents() {
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
      addressForm.addEventListener('submit', e => {
        e.preventDefault();
        _addressData = {
          customerName: document.getElementById('ckName').value,
          customerEmail: document.getElementById('ckEmail').value,
          customerPhone: document.getElementById('ckPhone').value,
          shippingAddress: document.getElementById('ckAddress').value,
          city: document.getElementById('ckCity').value,
          pincode: document.getElementById('ckPin').value
        };
        buildOrderSummary();
        goToStep(2);
      });
    }

    const backBtn = document.getElementById('backToAddress');
    if (backBtn) {
      backBtn.addEventListener('click', () => goToStep(1));
    }

    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
      placeBtn.addEventListener('click', () => {
        const checked = document.querySelector('input[name="payMethod"]:checked');
        const method = checked ? checked.value : 'demo_payment';
        executePayment(method);
      });
    }

    // Payment method selector
    document.querySelectorAll('.pay-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        const demoCardUI = document.getElementById('demoCardBox');
        if (demoCardUI) {
          demoCardUI.style.display = radio.value === 'demo_payment' ? 'block' : 'none';
        }
      });
    });

    const closeBtn = document.getElementById('checkoutClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('checkoutModal').classList.remove('open');
      });
    }

    const continueBtn = document.getElementById('continueShopping');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        document.getElementById('checkoutModal').classList.remove('open');
        const drawer = document.getElementById('cartDrawer');
        const overlay = document.getElementById('cartOverlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
      });
    }

    const viewHistoryBtn = document.getElementById('viewHistoryFromSuccess');
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', () => {
        document.getElementById('checkoutModal').classList.remove('open');
        Orders.openOrderModal();
      });
    }
  }

  return { initCheckout, bindEvents };
})();
