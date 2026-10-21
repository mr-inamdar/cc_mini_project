/* ══════════════════════════════════════
   cart.js — Shopping Cart State Manager
   ══════════════════════════════════════ */

const Cart = (() => {
  let items = JSON.parse(localStorage.getItem('apex_cart') || '[]');
  let promoDiscount = 0; // percentage
  let promoCodeApplied = '';

  function save() {
    localStorage.setItem('apex_cart', JSON.stringify(items));
  }

  function add(product, qty = 1) {
    const id = String(product._id || product.id);
    const existing = items.find(i => String(i._id || i.id) === id);

    if (existing) {
      existing.quantity = Math.min((existing.quantity || 1) + qty, 10);
    } else {
      items.push({
        _id: id,
        id: id,
        name: product.name,
        brand: product.brand || 'Apex',
        category: product.category,
        price: Number(product.price),
        img: product.img,
        quantity: Math.max(1, qty)
      });
    }

    save();
    renderCart();
    Toast.show(`${product.name} added to cart`, 'success');
  }

  function remove(id) {
    const strId = String(id);
    items = items.filter(i => String(i._id || i.id) !== strId);
    save();
    renderCart();
    Toast.show('Item removed from cart', 'info');
  }

  function updateQty(id, delta) {
    const strId = String(id);
    const item = items.find(i => String(i._id || i.id) === strId);
    if (!item) return;

    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
      remove(id);
      return;
    }
    item.quantity = Math.min(10, item.quantity);
    save();
    renderCart();
  }

  function clear() {
    items = [];
    promoDiscount = 0;
    promoCodeApplied = '';
    save();
    renderCart();
  }

  function getItems() {
    return [...items];
  }

  function getSubtotal() {
    return items.reduce((s, i) => s + (Number(i.price) * (Number(i.quantity) || 1)), 0);
  }

  function getDiscount() {
    if (!promoDiscount) return 0;
    return Math.round(getSubtotal() * (promoDiscount / 100));
  }

  function getDeliveryFee() {
    const sub = getSubtotal();
    if (sub === 0) return 0;
    return sub >= 999 ? 0 : 99;
  }

  function getTotal() {
    return Math.max(0, getSubtotal() - getDiscount() + getDeliveryFee());
  }

  function applyPromo(code) {
    if (!code) return { ok: false, msg: 'Please enter a coupon code' };
    const clean = code.trim().toUpperCase();
    if (clean === 'APEX10') {
      promoDiscount = 10;
      promoCodeApplied = 'APEX10';
      renderCart();
      return { ok: true, msg: 'Coupon APEX10 applied! 10% OFF' };
    } else if (clean === 'VIP20') {
      promoDiscount = 20;
      promoCodeApplied = 'VIP20';
      renderCart();
      return { ok: true, msg: 'VIP Coupon applied! 20% OFF' };
    }
    return { ok: false, msg: 'Invalid promo code. Try APEX10' };
  }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const badge = document.getElementById('cartBadge');
    if (!container) return;

    const totalCount = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    if (badge) {
      badge.textContent = totalCount;
      badge.classList.toggle('show', totalCount > 0);
    }

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-cart"><i class="fa-solid fa-box-open"></i><p>Your cart is empty</p></div>';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (footer) footer.style.display = 'block';
    container.innerHTML = items.map(item => {
      const pId = String(item._id || item.id);
      return `
        <div class="cart-item" id="ci-${pId}">
          <img src="${item.img}" alt="${item.name}" loading="lazy" />
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="Cart.updateQty('${pId}', -1)"><i class="fa-solid fa-minus"></i></button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" onclick="Cart.updateQty('${pId}', 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <button class="remove-btn" onclick="Cart.remove('${pId}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
    }).join('');

    const sub = getSubtotal();
    const disc = getDiscount();
    const delivery = getDeliveryFee();
    const total = getTotal();

    const subEl = document.getElementById('cartSubtotal');
    const delivEl = document.getElementById('cartDelivery');
    const totalEl = document.getElementById('cartTotal');
    const discRow = document.getElementById('cartDiscountRow');
    const discEl = document.getElementById('cartDiscount');

    if (subEl) subEl.textContent = '₹' + sub.toLocaleString('en-IN');
    if (delivEl) delivEl.textContent = delivery === 0 ? 'FREE' : '₹' + delivery;
    if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');

    if (discRow && discEl) {
      if (disc > 0) {
        discRow.style.display = 'flex';
        discEl.textContent = '-₹' + disc.toLocaleString('en-IN');
      } else {
        discRow.style.display = 'none';
      }
    }
  }

  function init() {
    renderCart();

    const promoBtn = document.getElementById('applyPromoBtn');
    const promoInput = document.getElementById('promoCodeInput');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => {
        const res = applyPromo(promoInput.value);
        Toast.show(res.msg, res.ok ? 'success' : 'error');
      });
    }
  }

  return {
    add,
    remove,
    updateQty,
    clear,
    getItems,
    getSubtotal,
    getDiscount,
    getDeliveryFee,
    getTotal,
    applyPromo,
    renderCart,
    init
  };
})();
