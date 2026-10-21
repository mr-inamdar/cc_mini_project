const Order = require('../models/Order');
const { getIsConnected } = require('../config/db');
const { mockOrders } = require('./paymentController');

async function createOrder(req, res, next) {
  try {
    const { customerName, customerEmail, customerPhone, shippingAddress, city, pincode, items, subtotal, discount, deliveryFee, totalAmount, paymentMethod, razorpayOrderId, razorpayPaymentId } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'Cart is empty.' });

    // Server-side total verification
    const calc = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const expectedTotal = Math.max(0, calc - (discount || 0) + (deliveryFee || 0));
    if (Math.abs(expectedTotal - totalAmount) > 5) return res.status(400).json({ success: false, error: 'Price tamper detected.' });

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const payStatus = paymentMethod === 'cod' ? 'pending' : (razorpayPaymentId ? 'paid' : 'pending');

    const payload = { orderNumber, user: req.user.id, customerName, customerEmail, customerPhone, shippingAddress, city, pincode, items, subtotal: calc, discount: discount || 0, deliveryFee: deliveryFee || 0, totalAmount: expectedTotal, paymentMethod: paymentMethod || 'razorpay', paymentStatus: payStatus, razorpayOrderId, razorpayPaymentId };

    let order;
    if (getIsConnected()) {
      order = await Order.create(payload);
    } else {
      order = { ...payload, _id: 'ord_' + Date.now(), createdAt: new Date() };
      mockOrders.unshift(order);
    }

    res.status(201).json({ success: true, message: 'Order placed!', order, orderNumber });
  } catch (err) { next(err); }
}

async function getMyOrders(req, res, next) {
  try {
    let orders;
    if (getIsConnected()) {
      orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    } else {
      orders = mockOrders.filter(o => o.user === req.user.id);
    }
    res.json({ success: true, orders });
  } catch (err) { next(err); }
}

module.exports = { createOrder, getMyOrders };
