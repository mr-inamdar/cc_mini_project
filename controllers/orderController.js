const Order = require('../models/Order');
const { getIsConnected } = require('../config/db');

// In-memory fallback orders
const mockOrders = [
  {
    _id: 'ord_demo_01',
    orderNumber: 'APX-783921',
    user: 'demo_user_001',
    customerName: 'Alex Hunter',
    customerEmail: 'demo@techstore.com',
    customerPhone: '+91 9876543210',
    shippingAddress: 'Flat 402, Skyline Towers, MG Road',
    city: 'Mumbai',
    pincode: '400001',
    items: [
      {
        name: 'iPhone 15 Pro',
        price: 134900,
        quantity: 1,
        img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=300&q=80',
        category: 'mobile'
      }
    ],
    subtotal: 134900,
    discount: 0,
    deliveryFee: 0,
    totalAmount: 134900,
    paymentMethod: 'demo_payment',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    transactionRef: 'DEMO_TXN_9847291',
    createdAt: new Date(Date.now() - 86400000 * 2)
  }
];

// POST /api/orders
async function createOrder(req, res, next) {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      pincode,
      items,
      subtotal,
      discount,
      deliveryFee,
      totalAmount,
      paymentMethod
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Shopping cart is empty.' });
    }

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !city || !pincode) {
      return res.status(400).json({ success: false, error: 'All shipping details are required.' });
    }

    // Server-side total recalculation
    const calcSubtotal = items.reduce((sum, it) => sum + (Number(it.price) * (Number(it.quantity) || 1)), 0);
    const disc = Number(discount) || 0;
    const deliv = calcSubtotal > 999 ? 0 : 99;
    const expectedTotal = Math.max(0, calcSubtotal - disc + deliv);

    const orderNumber = 'APX-' + Math.floor(100000 + Math.random() * 900000);
    const method = paymentMethod === 'cod' ? 'cod' : 'demo_payment';
    const payStatus = method === 'cod' ? 'pending' : 'paid';
    const txnRef = method === 'demo_payment' ? 'DEMO_TXN_' + Math.floor(10000000 + Math.random() * 90000000) : 'COD_PENDING';

    const userId = req.user ? req.user.id : null;

    const payload = {
      orderNumber,
      user: userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      items: items.map(it => ({
        name: it.name,
        price: Number(it.price),
        quantity: Number(it.quantity) || 1,
        img: it.img || '',
        category: it.category || 'general'
      })),
      subtotal: calcSubtotal,
      discount: disc,
      deliveryFee: deliv,
      totalAmount: expectedTotal,
      paymentMethod: method,
      paymentStatus: payStatus,
      orderStatus: 'confirmed',
      transactionRef: txnRef
    };

    let order;
    if (getIsConnected()) {
      order = await Order.create(payload);
    } else {
      order = { _id: 'ord_' + Date.now(), ...payload, createdAt: new Date() };
      mockOrders.unshift(order);
    }

    res.status(201).json({
      success: true,
      message: method === 'demo_payment' ? 'Demo payment successful! Order placed.' : 'Order placed with Cash on Delivery!',
      order,
      orderNumber: order.orderNumber
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/my-orders
async function getMyOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email ? req.user.email.toLowerCase() : '';

    let orders = [];
    if (getIsConnected()) {
      orders = await Order.find({
        $or: [{ user: userId }, { customerEmail: userEmail }]
      }).sort({ createdAt: -1 });
    } else {
      orders = mockOrders.filter(o =>
        String(o.user) === String(userId) ||
        (o.customerEmail && o.customerEmail.toLowerCase() === userEmail)
      );
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/all (Admin only)
async function getAllOrders(req, res, next) {
  try {
    let orders = [];
    if (getIsConnected()) {
      orders = await Order.find().sort({ createdAt: -1 });
    } else {
      orders = [...mockOrders];
    }
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/status (Admin only)
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (orderStatus && !validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid order status value.' });
    }

    let order;
    if (getIsConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
      const updates = {};
      if (orderStatus) updates.orderStatus = orderStatus;
      if (paymentStatus) updates.paymentStatus = paymentStatus;
      order = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }

    const idx = mockOrders.findIndex(o => String(o._id) === id || o.orderNumber === id);
    if (idx !== -1) {
      if (orderStatus) mockOrders[idx].orderStatus = orderStatus;
      if (paymentStatus) mockOrders[idx].paymentStatus = paymentStatus;
      if (!order) order = mockOrders[idx];
    }

    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    res.json({ success: true, message: `Order status updated to ${order.orderStatus}`, order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    let order;

    if (getIsConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = mockOrders.find(o => String(o._id) === id || o.orderNumber === id);
    }

    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
  mockOrders
};
