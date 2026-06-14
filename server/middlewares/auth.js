const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/mysql');
const { getJwtSecret } = require('../utils/securityConfig');

const protect = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const query = 'SELECT id, name, email, isAdmin FROM users WHERE id = ?';
    connection.query(query, [decoded.id], (err, results) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(401).json({ message: 'Not authorized' });
      }

      if (!results.length) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      req.user = results[0];
      return next();
    });
  } catch (error) {
    console.error('Error in protect middleware:', error.message);
    return res.status(401).json({ message: 'Not authorized' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: admin access required' });
};

module.exports = { protect, admin };
