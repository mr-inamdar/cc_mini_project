/* ══════════════════════════════════════
   payment.js — Razorpay checkout flow
   ══════════════════════════════════════ */

const Payment = (() => {
  let _addressData = null;

  function initCheckout() {
    if (!Auth.isLoggedIn()) {
      UI.openAuthModal();
      Toast.show('Please sign in to checkout', 'info');
      return;
    }
    if (Cart.getItems().length === 0) {
      Toast.show('Your cart is empty', 'error');
      return;
    }
    _addressData = null;
    goToStep(1);
    document.getElementById('checkoutModal').classList.add('open');

    // Pre-fill user data
    const user = Auth.getUser();
    if (user) {
      document.getElementById('ckName').value = user.name || '';
      document.getElementById('ckEmail').value = user.email || '';
      document.getElementById('ckPhone').value = user.phone || '';
    }
  }

  function goToStep(n) {
    ['checkoutStep1', 'checkoutStep2', 'checkoutStep3'].forEach((id, i) => {
      document.getElementById(id).style.display = (i + 1 === n) ? 'block' : 'none';
    });
    ['step1Ind', 'step2Ind', 'step3Ind'].forEach((id, i) => {
      document.getElementById(id).classList.toggle('active', i + 1 <= n);
    });
  }

  function buildOrderSummary() {
    const items = Cart.getItems();
    const sub = Cart.getSubtotal();
    const delivery = Cart.getDeliveryFee();
    const total = Cart.getTotal();
    const box = document.getElementById('orderSummaryBox');
    box.innerHTML = `
      ${items.map(it => `<div class="summary-row"><span>${it.name} x${it.quantity}</span><span>₹${(it.price * it.quantity).toLocaleString('en-IN')}</span></div>`).join('')}
      <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? 'FREE' : '₹' + delivery}</span></div>
      <div class="summary-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>
    `;
  }

  async function executePayment(method) {
    const btn = document.getElementById('placeOrderBtn');
    const msgEl = document.getElementById('payMsg');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing…';
    msgEl.className = 'form-msg'; msgEl.style.display = 'none';

    try {
      const items = Cart.getItems();
      const total = Cart.getTotal();

      if (method === 'cod') {
        await placeOrder({ method: 'cod', items, total, razorpayOrderId: null, razorpayPaymentId: null });
        return;
      }

      // Create Razorpay order on server
      const { ok, data } = await Auth.apiFetch('/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount: total })
      });

      if (!ok) throw new Error(data.error || 'Could not create payment order.');

      const user = Auth.getUser();
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Apex Studio',
        description: 'Secure Checkout',
        order_id: data.razorpayOrderId,
        prefill: { name: _addressData.name, email: _addressData.email, contact: _addressData.phone },
        theme: { color: '#4f8ef7' },
        handler: async function (response) {
          // Verify on server before placing order
          const vr = await Auth.apiFetch('/api/payment/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderNumber: 'TMP_' + Date.now()
            })
          });
          if (!vr.ok) {
            showPayMsg('error', 'Payment verification failed. Contact support.');
            resetBtn(btn);
            return;
          }
          await placeOrder({ method: 'razorpay', items, total, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id });
        },
        modal: { ondismiss: () => { showPayMsg('error', 'Payment cancelled.'); resetBtn(btn); } }
      };

      // Check if Razorpay script is loaded
      if (typeof Razorpay === 'undefined') {
        // Fallback: simulate payment for demo (shows COD flow)
        Toast.show('Razorpay not configured — using demo mode', 'info');
        await placeOrder({ method: 'razorpay', items, total, razorpayOrderId: data.razorpayOrderId, razorpayPaymentId: 'pay_demo_' + Date.now() });
        return;
      }

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', () => { showPayMsg('error', 'Payment failed. Please try again.'); resetBtn(btn); });
      rzp.open();

    } catch (err) {
      showPayMsg('error', err.message);
      resetBtn(btn);
    }
  }

  async function placeOrder({ method, items, total, razorpayOrderId, razorpayPaymentId }) {
    const sub = Cart.getSubtotal();
    const delivery = Cart.getDeliveryFee();
    const { ok, data } = await Auth.apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...(_addressData),
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        subtotal: sub, discount: 0, deliveryFee: delivery, totalAmount: total,
        paymentMethod: method, razorpayOrderId, razorpayPaymentId
      })
    });

    const btn = document.getElementById('placeOrderBtn');
    if (!ok) { showPayMsg('error', data.error || 'Order failed.'); resetBtn(btn); return; }

    Cart.clear();
    document.getElementById('successOrderNum').textContent = 'Order #' + data.orderNumber;
    goToStep(3);
  }

  function showPayMsg(type, msg) {
    const el = document.getElementById('payMsg');
    el.textContent = msg;
    el.className = `form-msg ${type}`;
  }

  function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = 'Pay Now <i class="fa-solid fa-lock"></i>';
  }

  function bindEvents() {
    const addressForm = document.getElementById('addressForm');
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

    document.getElementById('backToAddress').addEventListener('click', () => goToStep(1));

    document.getElementById('placeOrderBtn').addEventListener('click', () => {
      const method = document.querySelector('input[name="payMethod"]:checked').value;
      executePayment(method);
    });

    // Pay option radio highlighting
    document.querySelectorAll('.pay-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });

    document.getElementById('checkoutClose').addEventListener('click', () => {
      document.getElementById('checkoutModal').classList.remove('open');
    });

    document.getElementById('continueShopping').addEventListener('click', () => {
      document.getElementById('checkoutModal').classList.remove('open');
      document.getElementById('cartDrawer').classList.remove('open');
      document.getElementById('cartOverlay').classList.remove('open');
    });
  }

  return { initCheckout, bindEvents };
})();
