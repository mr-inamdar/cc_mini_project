const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getIsConnected } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'apex_dev_secret_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// In-memory fallback store when MongoDB is not available
const mockUsers = [
  {
    _id: 'demo_user_001',
    name: 'Alex Hunter',
    email: 'demo@techstore.com',
    password: '$2a$10$vUz4CmSmjz9aD8ECUbz5muRPbipzfCmC1kNe0.G3DEQe7ICJkVTyq', // pass123
    phone: '+91 9876543210',
    role: 'user',
    isActive: true
  }
];

function signToken(user) {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, name: user.name, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });

    const normalEmail = email.toLowerCase().trim();
    const hash = await bcrypt.hash(password, 10);

    let newUser;
    if (getIsConnected()) {
      const existing = await User.findOne({ email: normalEmail });
      if (existing) return res.status(409).json({ success: false, error: 'Email already registered.' });
      newUser = await User.create({ name, email: normalEmail, password: hash, phone: phone || '' });
    } else {
      if (mockUsers.find(u => u.email === normalEmail)) return res.status(409).json({ success: false, error: 'Email already registered.' });
      newUser = { _id: 'user_' + Date.now(), name, email: normalEmail, password: hash, phone: phone || '', role: 'user' };
      mockUsers.push(newUser);
    }

    const token = signToken(newUser);
    setCookie(res, token);
    res.status(201).json({ success: true, message: 'Account created!', token, user: { id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role } });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required.' });

    const normalEmail = email.toLowerCase().trim();
    let user;

    if (getIsConnected()) {
      user = await User.findOne({ email: normalEmail });
    } else {
      user = mockUsers.find(u => u.email === normalEmail);
    }

    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

    const token = signToken(user);
    setCookie(res, token);
    res.json({ success: true, message: 'Signed in!', token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) { next(err); }
}

async function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true, message: 'Signed out.' });
}

async function getMe(req, res, next) {
  try {
    let user;
    if (getIsConnected()) {
      user = await User.findById(req.user.id).select('-password');
    } else {
      user = mockUsers.find(u => u._id === req.user.id || u._id === req.user.id);
    }
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) { next(err); }
}

async function deleteAccount(req, res, next) {
  try {
    if (getIsConnected()) {
      await User.findByIdAndDelete(req.user.id);
    } else {
      const idx = mockUsers.findIndex(u => u._id === req.user.id);
      if (idx !== -1) mockUsers.splice(idx, 1);
    }
    res.clearCookie('token');
    res.json({ success: true, message: 'Account permanently deleted.' });
  } catch (err) { next(err); }
}

module.exports = { register, login, logout, getMe, deleteAccount };
