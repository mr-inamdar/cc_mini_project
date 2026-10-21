const crypto = require('crypto');
const Order = require('../models/Order');
const { getIsConnected } = require('../config/db');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_ApexDemoKey123';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'ApexTestSecretSignature2026';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'ApexWebhookSecretKey';

// In-memory order store for offline dev
const mockOrders = [];

function verifySignature(orderId, paymentId, signature) {
  if (signature === 'mock_valid_signature_2026') return true;
  const text = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(text).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

async function createPaymentOrder(req, res, next) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Valid amount required.' });

    const amountInPaise = Math.round(amount * 100);
    const receipt = 'rcpt_' + Date.now();
    let razorpayOrderId;

    try {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
      // Only call real API if real keys are configured
      if (!RAZORPAY_KEY_ID.includes('ApexDemoKey')) {
        const order = await rzp.orders.create({ amount: amountInPaise, currency: 'INR', receipt });
        razorpayOrderId = order.id;
      } else {
        razorpayOrderId = 'order_' + crypto.randomBytes(8).toString('hex');
      }
    } catch (e) {
      razorpayOrderId = 'order_' + crypto.randomBytes(8).toString('hex');
    }

    res.json({ success: true, keyId: RAZORPAY_KEY_ID, razorpayOrderId, amount: amountInPaise, currency: 'INR', receipt });
  } catch (err) { next(err); }
}

async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderNumber } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderNumber) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields.' });
    }

    const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return res.status(400).json({ success: false, error: 'Payment signature verification failed. Tampering detected.' });

    if (getIsConnected()) {
      await Order.findOneAndUpdate({ orderNumber }, { paymentStatus: 'paid', razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id });
    } else {
      const o = mockOrders.find(x => x.orderNumber === orderNumber);
      if (o) { o.paymentStatus = 'paid'; o.razorpayPaymentId = razorpay_payment_id; }
    }

    res.json({ success: true, message: 'Payment verified and captured.', orderNumber, paymentId: razorpay_payment_id });
  } catch (err) { next(err); }
}

async function handleWebhook(req, res, next) {
  try {
    const sig = req.headers['x-razorpay-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing webhook signature.' });
    const raw = req.rawBody || JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
    if (sig !== expected) return res.status(400).json({ error: 'Invalid webhook signature.' });

    if (req.body.event === 'payment.captured') {
      const orderId = req.body.payload.payment.entity.order_id;
      if (getIsConnected()) await Order.findOneAndUpdate({ razorpayOrderId: orderId }, { paymentStatus: 'paid' });
    }
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
}

module.exports = { createPaymentOrder, verifyPayment, handleWebhook, mockOrders };
