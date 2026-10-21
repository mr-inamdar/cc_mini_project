const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, deleteAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
