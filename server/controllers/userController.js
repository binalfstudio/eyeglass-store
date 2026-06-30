const { getConnection } = require('../config/mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendAdminRegistrationAlert } = require('../utils/smsService');
const { getJwtSecret, getAdminRegistrationKey } = require('../utils/securityConfig');

const BCRYPT_ROUNDS = 12;

const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      console.error('No database connection available');
      return res.status(500).json({ message: 'Database not connected' });
    }
    const { name, email, password, phone, address, adminKey } = req.body;

    // Check if user exists
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkQuery, [email], async (err, results) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const adminRegistrationKey = getAdminRegistrationKey();
      const isAdmin =
        adminRegistrationKey &&
        adminKey &&
        adminKey === adminRegistrationKey
          ? 1
          : 0;

      // Create user
      const insertQuery = 'INSERT INTO users (name, email, password, phone, address, profile_image, isAdmin) VALUES (?, ?, ?, ?, ?, ?, ?)';
      connection.query(insertQuery, [name, email, hashedPassword, phone, address, null, isAdmin], (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ message: 'Error creating user' });
        }

        const userId = result.insertId;

        const notificationQuery = `
          INSERT INTO admin_notifications (type, title, message, metadata, is_read)
          VALUES (?, ?, ?, ?, 0)
        `;
        const notificationTitle = 'New User Registration';
        const notificationMessage = `${name} (${email}) has created a new account.`;
        const notificationMetadata = JSON.stringify({ userId, name, email, isAdmin: Boolean(isAdmin) });
        connection.query(
          notificationQuery,
          ['user_registered', notificationTitle, notificationMessage, notificationMetadata],
          (notificationErr) => {
            if (notificationErr) {
              console.error('Error creating admin notification:', notificationErr);
            }
          }
        );

        sendAdminRegistrationAlert({
          name,
          email,
          phone,
          isAdmin: Boolean(isAdmin),
        }).catch((smsErr) => {
          console.error('Error sending admin registration SMS:', smsErr?.message || smsErr);
        });

        res.status(201).json({
          id: userId,
          name,
          email,
          profile_image: null,
          isAdmin,
          token: generateToken(userId),
        });
      });
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const connection = getConnection();
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = results[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        isAdmin: user.isAdmin,
        token: generateToken(user.id),
      });
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const connection = getConnection();
    const query = 'SELECT id, name, email, phone, address, profile_image, isAdmin, created_at FROM users WHERE id = ?';
    connection.query(query, [req.user.id], (err, results) => {
      if (err) {
        console.error('Error fetching profile:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(results[0]);
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const connection = getConnection();
    const { name, phone, address, profile_image } = req.body;

    if (profile_image && typeof profile_image === 'string') {
      if (profile_image.startsWith('data:image/')) {
        const mime = profile_image.slice(5, profile_image.indexOf(';'));
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(mime)) {
          return res.status(400).json({ message: 'Profile image must be JPEG, PNG, WebP, or GIF.' });
        }
        const payload = profile_image.split(',')[1] || '';
        const imageSizeBytes = Buffer.byteLength(payload, 'base64');
        if (imageSizeBytes > 2 * 1024 * 1024) {
          return res.status(400).json({ message: 'Profile image is too large. Please use an image under 2 MB.' });
        }
      } else if (profile_image.length > 4096) {
        return res.status(400).json({ message: 'Invalid profile image format.' });
      }
    }

    const query = 'UPDATE users SET name = ?, phone = ?, address = ?, profile_image = ? WHERE id = ?';
    connection.query(query, [name, phone, address, profile_image || null, req.user.id], (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ message: 'Error updating profile' });
      }

      const selectQuery = 'SELECT id, name, email, phone, address, profile_image, isAdmin, created_at FROM users WHERE id = ?';
      connection.query(selectQuery, [req.user.id], (selectErr, results) => {
        if (selectErr) {
          console.error('Error fetching updated profile:', selectErr);
          return res.status(500).json({ message: 'Profile updated but could not fetch profile' });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.json({
          message: 'Profile updated successfully',
          profile: results[0],
        });
      });
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get admin notifications
// @route   GET /api/users/admin/notifications
// @access  Private/Admin
const getAdminNotifications = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT id, type, title, message, metadata, is_read, created_at
      FROM admin_notifications
      ORDER BY created_at DESC
      LIMIT 50
    `;

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching admin notifications:', err);
        return res.status(500).json({ message: 'Error fetching admin notifications' });
      }

      const notifications = (results || []).map((item) => {
        let parsedMetadata = null;
        try {
          parsedMetadata = item.metadata ? JSON.parse(item.metadata) : null;
        } catch {
          parsedMetadata = item.metadata || null;
        }

        return {
          ...item,
          is_read: Boolean(item.is_read),
          metadata: parsedMetadata,
        };
      });

      res.json(notifications);
    });
  } catch (error) {
    console.error('Error in getAdminNotifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users for admin management
// @route   GET /api/users/admin/users
// @access  Private/Admin
const getAdminUsers = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT id, name, email, phone, address, isAdmin, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
    `;

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching admin users:', err);
        return res.status(500).json({ message: 'Error fetching users' });
      }

      res.json(results || []);
    });
  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark admin notification as read
// @route   PUT /api/users/admin/notifications/:id/read
// @access  Private/Admin
const markAdminNotificationRead = async (req, res) => {
  try {
    const connection = getConnection();
    const notificationId = Number(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const query = 'UPDATE admin_notifications SET is_read = 1 WHERE id = ?';
    connection.query(query, [notificationId], (err, result) => {
      if (err) {
        console.error('Error updating admin notification:', err);
        return res.status(500).json({ message: 'Error updating notification' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ message: 'Notification marked as read' });
    });
  } catch (error) {
    console.error('Error in markAdminNotificationRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's own notifications
// @route   GET /api/users/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT id, type, title, message, metadata, is_read, created_at
      FROM user_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;

    connection.query(query, [req.user.id], (err, results) => {
      if (err) {
        console.error('Error fetching user notifications:', err);
        return res.status(500).json({ message: 'Error fetching notifications' });
      }

      const notifications = (results || []).map((item) => {
        let parsedMetadata = null;
        try {
          parsedMetadata = item.metadata ? JSON.parse(item.metadata) : null;
        } catch {
          parsedMetadata = item.metadata || null;
        }
        return { ...item, is_read: Boolean(item.is_read), metadata: parsedMetadata };
      });

      res.json(notifications);
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a user notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
const markUserNotificationRead = async (req, res) => {
  try {
    const connection = getConnection();
    const notificationId = Number(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    // Only update if it belongs to this user
    const query = 'UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?';
    connection.query(query, [notificationId, req.user.id], (err, result) => {
      if (err) {
        console.error('Error updating user notification:', err);
        return res.status(500).json({ message: 'Error updating notification' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ message: 'Notification marked as read' });
    });
  } catch (error) {
    console.error('Error in markUserNotificationRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/users/notifications/read-all
// @access  Private
const markAllUserNotificationsRead = async (req, res) => {
  try {
    const connection = getConnection();
    connection.query(
      'UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id],
      (err) => {
        if (err) {
          console.error('Error marking all notifications read:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        res.json({ message: 'All notifications marked as read' });
      }
    );
  } catch (error) {
    console.error('Error in markAllUserNotificationsRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAdminUsers,
  getAdminNotifications,
  markAdminNotificationRead,
  getUserNotifications,
  markUserNotificationRead,
  markAllUserNotificationsRead,
};
