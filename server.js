require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { seedDefaultAdmin } = require('./controllers/authController');
const { autoSeedProducts } = require('./controllers/productController');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || `http://localhost:${PORT}`,
  credentials: true
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: 'Too many attempts. Please try again later.' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// ─── Static Frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Apex Studio E-Commerce', timestamp: new Date() }));

// Admin dashboard direct route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
connectDB().then(async () => {
  await seedDefaultAdmin();
  await autoSeedProducts();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀  Apex Studio Store running at http://localhost:${PORT}`);
    console.log(`🛍️   Frontend Store    : http://localhost:${PORT}`);
    console.log(`🛡️   Admin Dashboard   : http://localhost:${PORT}/admin`);
    console.log(`📦  Products API      : http://localhost:${PORT}/api/products`);
    console.log(`❤️   Wishlist API      : http://localhost:${PORT}/api/wishlist`);
    console.log(`📋  Orders API        : http://localhost:${PORT}/api/orders`);
    console.log(`🔐  Auth API          : http://localhost:${PORT}/api/auth`);
    console.log(`======================================================\n`);
  });
});
