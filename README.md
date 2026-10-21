# ⚡ Apex Studio Store — Full-Stack E-Commerce Web Application

A modern, responsive full-stack online shopping website with **dark glassmorphism aesthetics**, multi-category product catalog, **Mongoose/MongoDB persistence with automatic in-memory fallback**, **JWT & bcrypt authentication**, **Wishlist management**, **Cart with live calculations & promo codes**, **Simulated Demo Payment (Zero real money charged)**, **Real-time Order History**, and a **Protected Administrator Dashboard**.

Built strictly using **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and MongoDB**. No frontend frameworks (No React, Angular, Vue, or Tailwind CSS).

---

## 🌟 Key Upgrades & Highlights

### 1. 🎨 Modern Glassmorphism & Motion UI
- **Dark Theme with Ambient Glow**: Multi-layer blurred ambient orbs and CSS glassmorphism.
- **3D Card Hover Effects**: Mouse-tracking perspective tilt on product cards and hero banners.
- **Micro-Animations**: Smooth drawers, modal transitions, glowing borders, and toast alerts.
- **Fully Responsive**: Optimized for ultra-wide desktop, laptops, tablets, and smartphones.

### 2. 🛍️ Complete Shopping Flow
- **Product Catalog**: Live search, category filtering (Mobiles, Laptops, Gaming, Clothes), and price sorting.
- **Product Details Modal**: High-res image display, specifications, warranty, stock counters, quantity controls, and direct Wishlist / Cart buttons.
- **Wishlist Functionality**: Save products with the floating heart button; synchronized with MongoDB for signed-in users with a dedicated slide-out drawer.
- **Shopping Cart**: Real-time subtotal, coupon engine (`APEX10` for 10% OFF), dynamic delivery calculation (Free above ₹999), and item quantity adjustments.
- **Simulated Demo Payment**: Realistic sandbox payment processing (Demo Card / UPI) with zero real money charged.
- **Cash on Delivery (COD)**: Instant order confirmation without upfront payment.
- **Order Confirmation**: Instant receipt with auto-generated Order ID (e.g., `APX-849204`).
- **Order History**: Logged-in users can view all past orders, purchased items, status, and transaction totals.

### 3. 🔐 Authentication & Profile Management
- **Registration & Login**: Secure password hashing with `bcryptjs` and session tokens with `jsonwebtoken`.
- **Role-Based Access Control**: `user` (Customer) and `admin` (Store Administrator).
- **Profile Modal**: Quick overview of user credentials, orders shortcut, and administrator portal entry.
- **Default Demo Accounts**:
  - **Admin**: `admin@apex.com` / `admin123`
  - **Customer**: `demo@techstore.com` / `pass123`

### 4. 🛡️ Protected Administrator Dashboard (`/admin`)
- Accessible at `/admin` or via the Admin Dashboard link in the profile modal.
- **Stat Cards**: Real-time counts of Total Products, Total Orders, Total Revenue, and Active Shipments.
- **Product Inventory Management**:
  - Add new products with name, category, price, stock, image URL, and features.
  - Edit existing product prices, descriptions, and stock quantities.
  - Delete products with immediate database synchronization.
  - One-click button to synchronize default seed catalog.
- **Customer Order Management**:
  - Inspect all customer orders placed across the store.
  - Real-time dropdown to update order fulfillment status: `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`.

### 5. 🗄️ Backend & Database Architecture
- **Express.js REST API**: Clean controller-route-middleware architecture with rate limiting and helmet security headers.
- **MongoDB / Mongoose Models**:
  - `User`: Handles credentials, hashed passwords, roles, and status.
  - `Product`: Stores name, category, price, stock, image, rating, and features.
  - `Wishlist`: Links user accounts to their saved products.
  - `Order`: Records order ID, items, delivery address, payment method, payment status, and order status.
- **Resilient Fallback Mode**: If MongoDB is not running locally, the server seamlessly falls back to high-fidelity in-memory storage so every single feature remains 100% interactive and testable.

---

## 📁 Project Structure

```text
CCMiniProject/
├── config/
│   └── db.js                 # MongoDB connection & resilient fallback
├── controllers/
│   ├── authController.js     # Auth, register, login, session, admin seeding
│   ├── productController.js  # Product CRUD, search, category filters
│   ├── wishlistController.js # Wishlist toggle, fetch, removal
│   └── orderController.js    # Demo payment order placement & status updates
├── middleware/
│   ├── auth.js               # JWT verification, requireAdmin & optionalAuth
│   └── errorHandler.js       # Centralized error handler
├── models/
│   ├── User.js               # User Mongoose schema
│   ├── Product.js            # Product Mongoose schema
│   ├── Wishlist.js           # Wishlist Mongoose schema
│   └── Order.js              # Order Mongoose schema
├── public/
│   ├── css/
│   │   └── style.css         # Glassmorphism design system & animations
│   ├── js/
│   │   ├── auth.js           # Auth state & profile manager
│   │   ├── cart.js           # Cart state, quantities & promo codes
│   │   ├── wishlist.js       # Wishlist manager & backend sync
│   │   ├── orders.js         # Order history renderer
│   │   ├── payment.js        # Simulated Demo Payment checkout flow
│   │   ├── admin.js          # Admin dashboard controller
│   │   └── main.js           # Main app bootstrap & product modals
│   ├── admin.html            # Admin dashboard UI
│   ├── index.html            # Storefront homepage UI
│   └── assets/               # Brand logos and icons
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── productRoutes.js      # /api/products routes
│   ├── wishlistRoutes.js     # /api/wishlist routes
│   └── orderRoutes.js        # /api/orders routes
├── .env.example              # Environment variables template
├── package.json              # Project dependencies & scripts
├── server.js                 # Main Express server entrypoint
└── README.md                 # Project documentation
```

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Default settings connect to `mongodb://127.0.0.1:27017/apex_store` or fall back to built-in in-memory storage automatically).*

### 3. Start the Server
```bash
npm start
```

Open your browser at:
- **🛍️ Storefront**: [http://localhost:3000](http://localhost:3000)
- **🛡️ Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🧪 Testing the Shopping Flow

1. **Browse Products**: Use category buttons or the search bar to find products. Hover over cards for 3D tilt.
2. **Product Details**: Click any card to open the Product Details modal.
3. **Wishlist**: Click the heart button on cards or inside the details modal to save items to your wishlist.
4. **Cart & Promo**: Add items to cart. Open cart drawer, enter coupon `APEX10`, and click Apply for 10% off.
5. **Simulated Checkout**:
   - Click "Proceed to Checkout".
   - Fill in your delivery address.
   - Choose **Instant Demo Payment** (or Cash on Delivery).
   - Click "Complete Order" — observe simulated authorization latency and order generation.
6. **Order History**: Click the account button -> "My Order History" to inspect your order details.
7. **Admin Dashboard**: Go to `/admin`, sign in with `admin@apex.com` / `admin123`, add/edit products, and update order statuses!