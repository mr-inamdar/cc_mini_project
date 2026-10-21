const Product = require('../models/Product');
const { getIsConnected } = require('../config/db');
const path = require('path');
const fs = require('fs');

// In-memory fallback products from pro.json
let mockProducts = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, '../pro.json'), 'utf8');
  mockProducts = JSON.parse(raw).map((p, idx) => ({
    _id: String(p.id || 'prod_' + (idx + 1)),
    name: p.name,
    brand: p.brand || 'Apex',
    category: (p.category || 'general').toLowerCase(),
    price: Number(p.price),
    originalPrice: p.price ? Math.round(Number(p.price) * 1.18) : 0,
    description: p.description || `${p.name} - Engineered for peak performance, elite craftsmanship, and superior reliability.`,
    img: p.img,
    stock: p.stock !== undefined ? p.stock : 25,
    rating: 4.8,
    reviewsCount: 84 + (idx * 7),
    features: ['Official 1-Year Warranty', 'Express 24H Dispatch', 'Zero Latency Delivery', '100% Genuine Certified'],
    isFeatured: idx < 4
  }));
} catch (e) {
  console.warn('Failed to parse pro.json for mock products:', e.message);
}

// Auto-seed into MongoDB on startup if connected and empty
async function autoSeedProducts() {
  if (!getIsConnected()) return;
  try {
    const count = await Product.countDocuments();
    if (count === 0 && mockProducts.length > 0) {
      const docs = mockProducts.map(p => {
        const { _id, ...rest } = p;
        return rest;
      });
      await Product.insertMany(docs);
      console.log(`📦 Seeded ${docs.length} products into MongoDB.`);
    }
  } catch (err) {
    console.warn('Product auto-seed error:', err.message);
  }
}

// GET /api/products
async function getProducts(req, res, next) {
  try {
    const { category, q, sort, featured } = req.query;

    if (getIsConnected()) {
      let filter = {};
      if (category && category !== 'all') {
        filter.category = category.toLowerCase().trim();
      }
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        filter.$or = [{ name: regex }, { brand: regex }, { category: regex }, { description: regex }];
      }
      if (featured === 'true') {
        filter.isFeatured = true;
      }

      let query = Product.find(filter);
      if (sort === 'price-asc') query = query.sort({ price: 1 });
      else if (sort === 'price-desc') query = query.sort({ price: -1 });
      else if (sort === 'rating') query = query.sort({ rating: -1 });
      else query = query.sort({ createdAt: -1 });

      const products = await query.exec();
      return res.json({ success: true, count: products.length, products });
    } else {
      // Fallback in-memory
      let list = [...mockProducts];
      if (category && category !== 'all') {
        list = list.filter(p => p.category === category.toLowerCase().trim());
      }
      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        list = list.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          (p.brand && p.brand.toLowerCase().includes(term))
        );
      }
      if (featured === 'true') {
        list = list.filter(p => p.isFeatured);
      }
      if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);

      return res.json({ success: true, count: list.length, products: list });
    }
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    let product;

    if (getIsConnected()) {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        product = await Product.findById(id);
      }
      if (!product) {
        // Try fallback in-memory or by numeric id
        product = mockProducts.find(p => String(p._id) === id || String(p.id) === id);
      }
    } else {
      product = mockProducts.find(p => String(p._id) === id || String(p.id) === id);
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

// POST /api/products (Admin Only)
async function createProduct(req, res, next) {
  try {
    const { name, brand, category, price, originalPrice, description, img, stock, features, isFeatured } = req.body;
    if (!name || !price || !category || !img) {
      return res.status(400).json({ success: false, error: 'Name, category, price and image URL are required.' });
    }

    const payload = {
      name: name.trim(),
      brand: brand ? brand.trim() : 'Apex',
      category: category.toLowerCase().trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.2),
      description: description || `${name} delivers supreme performance with futuristic aesthetics.`,
      img: img.trim(),
      stock: stock !== undefined ? Number(stock) : 25,
      rating: 4.9,
      reviewsCount: 1,
      features: Array.isArray(features) ? features : (features ? features.split(',').map(s => s.trim()) : ['Apex Verified Product']),
      isFeatured: !!isFeatured
    };

    let newProd;
    if (getIsConnected()) {
      newProd = await Product.create(payload);
    } else {
      newProd = { _id: 'prod_' + Date.now(), ...payload, createdAt: new Date() };
      mockProducts.unshift(newProd);
    }

    res.status(201).json({ success: true, message: 'Product created successfully!', product: newProd });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id (Admin Only)
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.category) updates.category = updates.category.toLowerCase().trim();

    let product;
    if (getIsConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }

    // Also update mock if matching
    const idx = mockProducts.findIndex(p => String(p._id) === id || String(p.id) === id);
    if (idx !== -1) {
      mockProducts[idx] = { ...mockProducts[idx], ...updates };
      if (!product) product = mockProducts[idx];
    }

    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });

    res.json({ success: true, message: 'Product updated successfully!', product });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id (Admin Only)
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    let deleted = false;

    if (getIsConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
      const resMongo = await Product.findByIdAndDelete(id);
      if (resMongo) deleted = true;
    }

    const idx = mockProducts.findIndex(p => String(p._id) === id || String(p.id) === id);
    if (idx !== -1) {
      mockProducts.splice(idx, 1);
      deleted = true;
    }

    if (!deleted) return res.status(404).json({ success: false, error: 'Product not found.' });

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/seed
async function seedProducts(req, res, next) {
  try {
    await autoSeedProducts();
    res.json({ success: true, message: 'Product database synchronized.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
  autoSeedProducts,
  mockProducts
};
