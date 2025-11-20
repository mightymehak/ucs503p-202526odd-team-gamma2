// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Needed for comparing the password hash
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { protect, protectAdmin } = require('../middleware/auth');

// Generate JWT Token for users
const generateToken = (id) => {
  return jwt.sign({ id, type: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate JWT Token for admins
const generateAdminToken = (id) => {
  return jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register new student
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate email domain for students
    if (!email.endsWith('@thapar.edu')) {
      return res.status(400).json({ message: 'Please use a valid Thapar email ID' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'student',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check role matches
    if (user.role !== role) {
      return res.status(401).json({ message: 'Invalid credentials for this role' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin-login
// @desc    Login admin using email, password, and 6-digit unique ID
// @access  Public
router.post('/admin-login', async (req, res) => {
  try {
    // UPDATED: Require password in the body
    const { email, password, uniqueId } = req.body;

    if (!email || !password || !uniqueId) {
      return res.status(400).json({ message: 'Email, password, and unique ID are required' });
    }

    if (!/^\d{6}$/.test(uniqueId)) {
      return res.status(400).json({ message: 'Unique ID must be 6 digits' });
    }

    // 1. Try Admin collection first (password is select:false in model)
    let admin = await Admin.findOne({ email }).select('+password'); 

    if (admin) {
      const isPasswordMatch = await bcrypt.compare(password, admin.password); 
      if (!isPasswordMatch || admin.uniqueId !== uniqueId) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
      // Login successful using Admin collection
      return res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        token: generateAdminToken(admin._id),
      });
    }

    // 2. Fallback: Support legacy admins stored in User collection with role 'admin'
    const legacyAdminUser = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!legacyAdminUser) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    const isLegacyPasswordMatch = await bcrypt.compare(password, legacyAdminUser.password);
    if (!isLegacyPasswordMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    // Unique ID check cannot be performed for legacy user as no field exists; accept provided value

    return res.json({
      _id: legacyAdminUser._id,
      name: legacyAdminUser.name,
      email: legacyAdminUser.email,
      role: 'admin',
      token: generateAdminToken(legacyAdminUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

// @route   GET /api/auth/admin-me
// @desc    Get current admin
// @access  Private (Admin)
router.get('/admin-me', protectAdmin, async (req, res) => {
  res.json({
    _id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    role: 'admin',
  });
});

module.exports = router;