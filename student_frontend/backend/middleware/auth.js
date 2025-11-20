// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const getIdFromDecoded = (decoded) => {
  // accept multiple possible id field names that your token might contain
  return decoded && (decoded.id || decoded._id || decoded.userId || decoded.userid);
};

exports.protect = async (req, res, next) => {
  let token;

  const auth = req.headers.authorization || '';
  if (auth && auth.startsWith('Bearer ')) {
    try {
      token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // optional: check token type
      if (decoded.type && decoded.type !== 'user') {
        return res.status(401).json({ message: 'Not authorized for user routes' });
      }

      const userId = getIdFromDecoded(decoded);
      if (!userId) {
        return res.status(401).json({ message: 'Not authorized, invalid token payload' });
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('protect middleware error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // no token present
  return res.status(401).json({ message: 'Not authorized, no token' });
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin only.' });
};

exports.protectAdmin = async (req, res, next) => {
  let token;
  const auth = req.headers.authorization || '';

  if (auth && auth.startsWith('Bearer ')) {
    try {
      token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type && decoded.type !== 'admin') {
        return res.status(401).json({ message: 'Not authorized for admin routes' });
      }

      const adminId = getIdFromDecoded(decoded);
      if (!adminId) {
        return res.status(401).json({ message: 'Not authorized, invalid token payload' });
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(401).json({ message: 'Not authorized, admin not found' });
      }

      req.admin = admin;
      return next();
    } catch (error) {
      console.error('protectAdmin middleware error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};
