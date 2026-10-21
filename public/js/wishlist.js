/* ══════════════════════════════════════
   wishlist.js — Wishlist Manager
   ══════════════════════════════════════ */

const Wishlist = (() => {
  let items = JSON.parse(localStorage.getItem('apex_wishlist') || '[]');

  function save() {
    localStorage.setItem('apex_wishlist', JSON.stringify(items));
  }

  function getWishlist() {
    return [...items];
  }

  function isInWishlist(id) {
    return items.some(p => String(p._id || p.id) === String(id));
  }

  async function toggle(product) {
    const id = String(product._id || product.id);
    const existingIndex = items.findIndex(p => String(p._id || p.id) === id);

    let added = false;
    if (existingIndex > -1) {
      items.splice(existingIndex, 1);
      Toast.show(`Removed ${product.name} from wishlist`, 'info');
    } else {
      items.push(product);
      added = true;
      Toast.show(`Added ${product.name} to wishlist`, 'success');
    }

    save();
    updateUI();
    renderWishlist();

    // Sync with backend if authenticated
    if (Auth.isLoggedIn()) {
      try {
        await Auth.apiFetch('/api/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId: id })
        });
      } catch (err) {
        console.warn('Backend wishlist sync skipped:', err.message);
      }
    }

    return added;
  }

  async function remove(id) {
    items = items.filter(p => String(p._id || p.id) !== String(id));
    save();
    updateUI();
    renderWishlist();

    if (Auth.isLoggedIn()) {
      try {
        await Auth.apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Backend wishlist removal skipped:', err.message);
      }
    }
  }

  function moveToCart(id) {
    const prod = items.find(p => String(p._id || p.id) === String(id));
    if (prod) {
      Cart.add(prod);
      remove(id);
    }
  }

  async function syncFromBackend() {
    if (!Auth.isLoggedIn()) return;
    try {
      const { ok, data } = await Auth.apiFetch('/api/wishlist');
      if (ok && data.wishlist) {
        // Merge without duplicates
        const backendItems = data.wishlist;
        backendItems.forEach(bp => {
          if (!items.some(p => String(p._id || p.id) === String(bp._id || bp.id))) {
            items.push(bp);
          }
        });
        save();
        updateUI();
        renderWishlist();
      }
    } catch (e) {
      console.warn('Failed to sync backend wishlist:', e);
    }
  }

  function updateUI() {
    const count = items.length;
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('show', count > 0);
    }

    // Update heart icons on product cards in grid
    document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
      const id = btn.dataset.id;
      const active = isInWishlist(id);
      btn.classList.toggle('active', active);
      btn.innerHTML = `<i class="fa-${active ? 'solid' : 'regular'} fa-heart"></i>`;
    });
  }

  function renderWishlist() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <i class="fa-regular fa-heart"></i>
          <p>Your wishlist is empty</p>
          <span style="font-size:0.8rem; color:var(--muted)">Heart items while shopping to save them here.</span>
        </div>`;
      return;
    }

    container.innerHTML = items.map(p => {
      const pId = p._id || p.id;
      return `
        <div class="wishlist-item" id="wl-${pId}">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
          <div class="wishlist-item-info">
            <div class="wishlist-item-name">${p.name}</div>
            <div class="wishlist-item-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
          </div>
          <div class="wishlist-item-actions">
            <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="Wishlist.moveToCart('${pId}')" title="Move to Cart">
              <i class="fa-solid fa-cart-plus"></i>
            </button>
            <button class="remove-btn" onclick="Wishlist.remove('${pId}')" title="Remove">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function init() {
    updateUI();
    renderWishlist();
    syncFromBackend();
  }

  return { toggle, remove, moveToCart, isInWishlist, getWishlist, updateUI, renderWishlist, syncFromBackend, init };
})();
