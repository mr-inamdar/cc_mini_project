const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById
} = require('../controllers/orderController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.get('/all', requireAdmin, getAllOrders);
router.get('/:id', optionalAuth, getOrderById);
router.put('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;
