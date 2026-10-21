-- =====================================================================
-- MULTI-BRAND E-COMMERCE DATABASE SCHEMA & SEED DATA (SQL)
-- Compatible with: MySQL 8.0+, PostgreSQL 13+, and SQLite 3
-- Universal Electronics, Gadgets & Lifestyle Store
-- =====================================================================

-- 1. DROP EXISTING TABLES (Safely in reverse dependency order)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- =====================================================================
-- 2. USERS TABLE
-- Stores customer accounts, profile details, and auth credentials
-- Supports User Registration, Login, Profile Updates, and Deletion
-- =====================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    role VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. CATEGORIES TABLE
-- Classifications: Mobiles, Laptops, Audio & Wearables, Gaming, Fashion
-- =====================================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(64) DEFAULT '🛍️',
    display_order INT DEFAULT 0
);

-- =====================================================================
-- 4. PRODUCTS TABLE
-- Main product catalog with specs, stock, rating, and e-com tags
-- =====================================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(128) NOT NULL,
    brand VARCHAR(64) NOT NULL,
    tagline VARCHAR(255) DEFAULT '',
    badge VARCHAR(64) DEFAULT '',       -- 'Bestseller', 'Top Rated', 'Hot Deal'
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) DEFAULT NULL,
    rating DECIMAL(2, 1) DEFAULT 4.8,
    reviews_count INT DEFAULT 0,
    img_url VARCHAR(512) NOT NULL,
    specs_json TEXT,                    -- JSON string with tech specs
    in_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- =====================================================================
-- 5. PRODUCT VARIANTS TABLE
-- Stores color finishes, storage capacities, sizes, and price offsets
-- =====================================================================
CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    variant_type VARCHAR(32) NOT NULL,   -- 'storage', 'color', 'size'
    variant_name VARCHAR(64) NOT NULL,
    price_offset DECIMAL(10, 2) DEFAULT 0.00,
    hex_code VARCHAR(16) DEFAULT NULL,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================================
-- 6. ORDERS TABLE
-- Stores orders, shipping info, payment tags, and fulfillment status
-- =====================================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL UNIQUE, -- e.g. 'ORD-2026-9842'
    user_id INT DEFAULT NULL,                 -- Nullable for guest checkout
    customer_name VARCHAR(128) NOT NULL,
    customer_email VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    city VARCHAR(64) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,      -- 'upi', 'card', 'netbanking', 'cod'
    payment_status VARCHAR(32) DEFAULT 'paid',-- 'pending', 'paid', 'cod_unpaid'
    order_status VARCHAR(32) DEFAULT 'Processing', -- 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'
    tracking_id VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================================
-- 7. ORDER ITEMS TABLE
-- Line items purchased in an order
-- =====================================================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT DEFAULT NULL,
    product_name VARCHAR(128) NOT NULL,
    selected_color VARCHAR(64) DEFAULT '',
    selected_storage VARCHAR(64) DEFAULT '',
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =====================================================================
-- 8. INDEXES FOR OPTIMIZED QUERY SPEED
-- =====================================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =====================================================================
-- 9. SEED DATA: CATEGORIES
-- =====================================================================
INSERT INTO categories (id, name, slug, description, icon, display_order) VALUES
(1, 'All Products', 'all', 'Browse all premium devices & apparel', '🛍️', 1),
(2, 'Smartphones', 'mobile', 'Flagship 5G smartphones & titanium devices', '📱', 2),
(3, 'Laptops & PCs', 'laptop', 'Ultrabooks, MacBooks, and creator workstations', '💻', 3),
(4, 'Audio & Wearables', 'audio', 'TWS Earbuds, smartwatches, and headphones', '🎧', 4),
(5, 'Gaming', 'gaming', 'Consoles, graphics rigs, and handhelds', '🎮', 5),
(6, 'Apparel & Lifestyle', 'clothes', 'Minimalist organic cotton tees, hoodies & outfits', '👕', 6);

-- =====================================================================
-- 10. SEED DATA: PRODUCTS
-- =====================================================================
INSERT INTO products (id, category_id, name, brand, tagline, badge, price, original_price, rating, reviews_count, img_url, specs_json, in_stock) VALUES
(1, 2, 'iPhone 15 Pro', 'Apple', 'Grade 5 Titanium frame with A17 Pro 3nm chip.', 'Pro Flagship', 134900.00, 144900.00, 4.9, 342, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80', '{"Chip":"A17 Pro (3nm)","Display":"6.1 Super Retina XDR OLED (120Hz)","Camera":"48MP Main | 3x Telephoto"}', 1),
(2, 2, 'Galaxy S24 Ultra', 'Samsung', 'Galaxy AI built-in with 200MP camera and S-Pen.', 'AI Powered', 129999.00, 139999.00, 4.8, 189, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80', '{"Chip":"Snapdragon 8 Gen 3","Display":"6.8 Dynamic AMOLED 2X","Camera":"200MP Quad Telephoto"}', 1),
(3, 2, 'Pixel 8 Pro', 'Google', 'Engineered by Google with Tensor G3 & AI photography.', 'Top Camera', 106999.00, 115999.00, 4.7, 165, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80', '{"Chip":"Google Tensor G3","Display":"6.7 Super Actua 120Hz","Camera":"50MP Main | 48MP Ultrawide"}', 1),
(4, 3, 'MacBook Air M3', 'Apple', 'Incredibly thin and fast with 18-hour battery.', 'Bestseller', 114900.00, 124900.00, 4.9, 218, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80', '{"Chip":"Apple M3 8-core CPU","Display":"13.6 Liquid Retina","Battery":"Up to 18 hours"}', 1),
(5, 3, 'Dell XPS 15 OLED', 'Dell', 'Precision CNC aluminum chassis with 3.5K OLED.', 'Creator Pick', 145000.00, 160000.00, 4.7, 112, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80', '{"Processor":"Intel Core i7-13700H","Graphics":"NVIDIA RTX 4060 8GB","Display":"15.6 3.5K OLED Touch"}', 1),
(6, 5, 'PlayStation 5 Slim', 'Sony', 'Next-gen gaming with ultra-fast custom NVMe SSD.', 'Console King', 54990.00, 59990.00, 4.9, 420, 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80', '{"Storage":"1TB Custom SSD","Resolution":"4K 120Hz & 8K","Controller":"DualSense Wireless"}', 1),
(7, 5, 'ROG Strix G16', 'ASUS', 'High-refresh 240Hz display with RTX 4070 graphics.', 'Top Gaming', 135990.00, 149990.00, 4.8, 132, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80', '{"Processor":"Intel i9-13980HX","Graphics":"NVIDIA RTX 4070 8GB","Display":"16 QHD+ 240Hz"}', 1),
(8, 6, 'APX Titanium Fleece Hoodie', 'APX Studio', 'Heavyweight 450 GSM French terry organic cotton.', 'Essential', 2499.00, 3499.00, 4.7, 78, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80', '{"Material":"100% French Terry Cotton 450 GSM","Fit":"Relaxed Drop-Shoulder"}', 1),
(9, 6, 'APX Studio Supima T-Shirt', 'APX Studio', 'Silky bio-washed extra-long staple Supima cotton.', 'Wardrobe Pick', 799.00, 1299.00, 4.6, 115, 'https://i.pinimg.com/1200x/df/32/3e/df323e4927de0162e6ec6a22617ce8bf.jpg', '{"Material":"100% Supima Cotton 220 GSM","Finish":"Silk-soft bio-washed"}', 1),
(10, 3, 'ThinkPad X1 Carbon', 'Lenovo', 'Ultralight carbon-fiber business laptop with OLED.', 'Enterprise', 135000.00, 149000.00, 4.8, 88, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80', '{"Processor":"Intel Core i7 vPro 13th Gen","Display":"14 2.8K OLED","Weight":"1.12 kg"}', 1),
(11, 2, 'Realme 12 Pro 5G', 'Realme', 'Luxury watch design with 64MP periscope telephoto.', 'Hot Deal', 49999.00, 54999.00, 4.6, 94, 'https://tse3.mm.bing.net/th/id/OIP.CXPpfU3FJY60ypwWRLop_QHaHa?r=0&w=1440&h=1440&rs=1&pid=ImgDetMain&o=7&rm=3', '{"Chip":"Snapdragon 6 Gen 1 5G","Display":"6.7 120Hz Curved Vision","Charging":"67W SUPERVOOC"}', 1),
(12, 6, 'APX Classic Tailored Trousers', 'APX Studio', 'Modern pleated silhouette with 4-way stretch fabric.', 'Formal Pick', 1499.00, 2299.00, 4.7, 63, 'https://i.pinimg.com/736x/91/fc/85/91fc8557f2d334d64bc0aab271e70e7a.jpg', '{"Fabric":"Viscose-Poly stretch blend","Fit":"Clean tapered crop cut"}', 1),
(13, 5, 'Custom BattleStation Pro', 'Alienware', 'Liquid-cooled i9 14900KS with RTX 4090 24GB.', 'Extreme Rig', 445000.00, 475000.00, 5.0, 42, 'https://i.pinimg.com/1200x/e3/de/d6/e3ded6b09a25c557fe2277a63bbc123f.jpg', '{"Processor":"Intel i9-14900KS 6.2GHz","Graphics":"NVIDIA RTX 4090 24GB","RAM":"64GB DDR5 6400MHz"}', 1),
(14, 5, 'Nintendo Switch OLED', 'Nintendo', 'Vibrant 7-inch OLED panel for tabletop & TV gaming.', 'Handheld', 34990.00, 38990.00, 4.8, 310, 'https://images.unsplash.com/photo-1617096200347-cb04ae810b1d?auto=format&fit=crop&w=600&q=80', '{"Display":"7-inch OLED Multi-touch","Battery":"Up to 9 hours","Modes":"TV, Tabletop, Handheld"}', 1),
(15, 6, 'APX Classic Kurti Co-Ord Set', 'APX Studio', 'Artisanal pure Chanderi silk and cotton co-ord set.', 'Festive', 1699.00, 2499.00, 4.8, 82, 'https://i.pinimg.com/736x/05/48/e0/0548e0938e056723473003502f5454b5.jpg', '{"Fabric":"Pure Chanderi Silk & Cotton","Set":"Kurti & Ankle-trousers"}', 1),
(16, 5, 'Nintendo Switch OLED X2 Edition', 'Nintendo', 'Special Edition bundle with Spigen armor grip case.', 'Special Bundle', 34990.00, 37990.00, 4.9, 85, 'https://spigen.ph/sites/default/files/images/products/agl03829-4.jpg', '{"Display":"7-inch OLED","Bundle":"Spigen Rugged Armor Case included"}', 1),
(17, 4, 'AirPods Pro (2nd Gen)', 'Apple', 'Pro Active Noise Cancellation with Transparency mode.', 'Audio Pick', 24900.00, 26900.00, 4.8, 512, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80', '{"Audio":"Active Noise Cancellation","Chip":"H2 Audio Chip","Battery":"Up to 30 hrs with case"}', 1),
(18, 4, 'Galaxy Watch 6 Classic', 'Samsung', 'Rotating physical bezel with advanced health sensors.', 'Smartwatch', 36990.00, 42990.00, 4.8, 140, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', '{"Bezel":"Rotating Stainless Steel","Display":"Super AMOLED Sapphire Crystal","Sensors":"BioActive Sensor"}', 1);

-- =====================================================================
-- 11. SAMPLE USER & AUTH QUERIES
-- =====================================================================
INSERT INTO users (id, username, email, password_hash, full_name, phone, role) VALUES
(1, 'alex_hunter', 'alex@techstore.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Alex Hunter', '+91 9876543210', 'customer');

-- =====================================================================
-- 12. CRUD QUERIES CHEATSHEET FOR BACKEND DEVELOPERS
-- =====================================================================

-- 1. USER REGISTRATION:
-- INSERT INTO users (username, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?);

-- 2. USER LOGIN:
-- SELECT id, username, email, full_name, phone, role FROM users WHERE username = ? AND password_hash = ? AND is_active = TRUE;

-- 3. USER ACCOUNT DELETION (Hard Delete or Soft Delete):
-- Hard Delete: DELETE FROM users WHERE id = ?;
-- Soft Delete: UPDATE users SET is_active = FALSE WHERE id = ?;

-- 4. CREATE ORDER IN TRANSACTION:
-- START TRANSACTION;
-- INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, city, pincode, subtotal, discount, delivery_fee, total_amount, payment_method, payment_status, order_status, tracking_id) 
-- VALUES ('ORD-2026-9842', 1, 'Alex Hunter', 'alex@techstore.com', '+91 9876543210', '42 Tech Boulevard', 'Bangalore', '560001', 134900.00, 0.00, 0.00, 134900.00, 'upi', 'paid', 'Processing', 'TRK-9842-EXP');
-- INSERT INTO order_items (order_id, product_id, product_name, selected_color, selected_storage, unit_price, quantity, total_price)
-- VALUES (LAST_INSERT_ID(), 1, 'iPhone 15 Pro', 'Natural Titanium', '256GB', 144900.00, 1, 144900.00);
-- COMMIT;

-- 5. FETCH USER ORDERS:
-- SELECT o.*, oi.product_name, oi.selected_color, oi.selected_storage, oi.quantity, oi.unit_price
-- FROM orders o
-- JOIN order_items oi ON o.id = oi.order_id
-- WHERE o.user_id = ?
-- ORDER BY o.created_at DESC;
