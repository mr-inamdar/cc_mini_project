/* ══════════════════════════════════════
   cart.js — Cart state manager
   ══════════════════════════════════════ */

const Cart = (() => {
  let items = JSON.parse(localStorage.getItem('apex_cart') || '[]');

  function save() { localStorage.setItem('apex_cart', JSON.stringify(items)); }

  function add(product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) { existing.quantity = Math.min(existing.quantity + 1, 10); }
    else { items.push({ ...product, quantity: 1 }); }
    save();
    renderCart();
    Toast.show(`${product.name} added to cart`, 'success');
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    save(); renderCart();
  }

  function updateQty(id, delta) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(10, item.quantity + delta));
    save(); renderCart();
  }

  function clear() { items = []; save(); renderCart(); }

  function getItems() { return [...items]; }

  function getSubtotal() { return items.reduce((s, i) => s + i.price * i.quantity, 0); }

  function getDeliveryFee() { return getSubtotal() >= 999 ? 0 : 99; }

  function getTotal() { return getSubtotal() + getDeliveryFee(); }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const badge = document.getElementById('cartBadge');
    if (!container) return;

    const count = items.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-cart"><i class="fa-solid fa-box-open"></i><p>Your cart is empty</p></div>';
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    container.innerHTML = items.map(item => `
      <div class="cart-item" id="ci-${item.id}">
        <img src="${item.img}" alt="${item.name}" loading="lazy" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="Cart.updateQty(${item.id}, -1)"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn" onclick="Cart.updateQty(${item.id}, 1)"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <button class="remove-btn" onclick="Cart.remove(${item.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join('');

    const sub = getSubtotal();
    const delivery = getDeliveryFee();
    document.getElementById('cartSubtotal').textContent = '₹' + sub.toLocaleString('en-IN');
    document.getElementById('cartDelivery').textContent = delivery === 0 ? 'FREE' : '₹' + delivery;
    document.getElementById('cartTotal').textContent = '₹' + getTotal().toLocaleString('en-IN');
  }

  function init() { renderCart(); }

  return { add, remove, updateQty, clear, getItems, getSubtotal, getDeliveryFee, getTotal, renderCart, init };
})();
