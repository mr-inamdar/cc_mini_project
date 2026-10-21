const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { getIsConnected } = require('../config/db');
const { mockProducts } = require('./productController');

// In-memory fallback wishlist by user ID
const mockWishlists = {};

// GET /api/wishlist
async function getWishlist(req, res, next) {
  try {
    const userId = req.user.id;

    if (getIsConnected()) {
      let wl = await Wishlist.findOne({ user: userId }).populate('products');
      if (!wl) {
        wl = await Wishlist.create({ user: userId, products: [] });
      }
      return res.json({ success: true, wishlist: wl.products });
    } else {
      const ids = mockWishlists[userId] || [];
      const prods = mockProducts.filter(p => ids.includes(String(p._id)) || ids.includes(String(p.id)));
      return res.json({ success: true, wishlist: prods });
    }
  } catch (err) {
    next(err);
  }
}

// POST /api/wishlist/toggle
async function toggleWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'Product ID required.' });

    if (getIsConnected()) {
      let wl = await Wishlist.findOne({ user: userId });
      if (!wl) {
        wl = new Wishlist({ user: userId, products: [] });
      }

      // Check if product exists in MongoDB or find it
      let prodObjId = productId;
      if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
        // Look up by name or mock id
        const found = await Product.findOne({ $or: [{ _id: productId.match(/^[0-9a-fA-F]{24}$/) ? productId : null }] });
        if (found) prodObjId = found._id;
      }

      const idx = wl.products.findIndex(p => String(p) === String(productId) || String(p) === String(prodObjId));
      let action = 'added';
      if (idx > -1) {
        wl.products.splice(idx, 1);
        action = 'removed';
      } else {
        if (prodObjId.match(/^[0-9a-fA-F]{24}$/)) {
          wl.products.push(prodObjId);
        }
      }
      await wl.save();

      // Return populated
      await wl.populate('products');
      return res.json({ success: true, action, message: action === 'added' ? 'Added to wishlist!' : 'Removed from wishlist!', wishlist: wl.products });
    } else {
      if (!mockWishlists[userId]) mockWishlists[userId] = [];
      const idx = mockWishlists[userId].indexOf(String(productId));
      let action = 'added';
      if (idx > -1) {
        mockWishlists[userId].splice(idx, 1);
        action = 'removed';
      } else {
        mockWishlists[userId].push(String(productId));
      }

      const prods = mockProducts.filter(p => mockWishlists[userId].includes(String(p._id)) || mockWishlists[userId].includes(String(p.id)));
      return res.json({ success: true, action, message: action === 'added' ? 'Added to wishlist!' : 'Removed from wishlist!', wishlist: prods });
    }
  } catch (err) {
    next(err);
  }
}

// DELETE /api/wishlist/:productId
async function removeFromWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    if (getIsConnected()) {
      let wl = await Wishlist.findOne({ user: userId });
      if (wl) {
        wl.products = wl.products.filter(p => String(p) !== String(productId));
        await wl.save();
        await wl.populate('products');
        return res.json({ success: true, message: 'Removed from wishlist', wishlist: wl.products });
      }
      return res.json({ success: true, wishlist: [] });
    } else {
      if (mockWishlists[userId]) {
        mockWishlists[userId] = mockWishlists[userId].filter(id => id !== String(productId));
      }
      const ids = mockWishlists[userId] || [];
      const prods = mockProducts.filter(p => ids.includes(String(p._id)) || ids.includes(String(p.id)));
      return res.json({ success: true, message: 'Removed from wishlist', wishlist: prods });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { getWishlist, toggleWishlist, removeFromWishlist };
