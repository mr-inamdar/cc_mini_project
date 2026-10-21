const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getWishlist);
router.post('/toggle', authenticate, toggleWishlist);
router.delete('/:productId', authenticate, removeFromWishlist);

module.exports = router;
