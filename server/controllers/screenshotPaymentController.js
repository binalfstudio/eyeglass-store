const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getConnection } = require('../config/mysql');

// ---------------------------------------------------------------------------
// Multer config — store screenshots on disk
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'payment-screenshots');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `pay-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Export the middleware so routes can use it
const uploadScreenshotMiddleware = upload.single('screenshot');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const runQuery = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });

const SHIPPING_ETB = 12;
const FREE_SHIPPING_THRESHOLD = 250;
const TAX_RATE = 0.08;

const getUserCart = (connection, userId) =>
  runQuery(
    connection,
    `SELECT c.id, c.user_id, c.eyeglass_id, c.quantity,
            e.name, e.selling_price, e.quantity_in_stock
     FROM cart c
     JOIN eyeglasses e ON c.eyeglass_id = e.id
     WHERE c.user_id = ?`,
    [userId]
  );

const calculateTotals = (items) => {
  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.selling_price) * Number(i.quantity),
    0
  );
  const shipping =
    subtotal > FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_ETB;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

const createAdminNotification = (connection, payload) =>
  new Promise((resolve, reject) => {
    connection.query(
      `INSERT INTO admin_notifications (type, title, message, metadata, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [
        payload.type,
        payload.title,
        payload.message,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

const createUserNotification = (connection, userId, payload) =>
  new Promise((resolve, reject) => {
    connection.query(
      `INSERT INTO user_notifications (user_id, type, title, message, metadata, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [
        userId,
        payload.type,
        payload.title,
        payload.message,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

// ---------------------------------------------------------------------------
// POST /api/screenshot-payments/submit
// User uploads a payment screenshot after manual bank transfer
// ---------------------------------------------------------------------------
const submitScreenshotPayment = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Payment screenshot is required' });
    }

    const notes = String(req.body?.notes || '').trim().slice(0, 500);

    const cartItems = await getUserCart(connection, req.user.id);
    if (!cartItems.length) {
      // Remove the uploaded file — nothing to do
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const outOfStock = cartItems.find(
      (i) => Number(i.quantity_in_stock) < Number(i.quantity)
    );
    if (outOfStock) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: `${outOfStock.name} does not have enough stock`,
      });
    }

    const totals = calculateTotals(cartItems);
    if (totals.total <= 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Order total must be greater than zero' });
    }

    // Insert order
    const orderResult = await new Promise((resolve, reject) => {
      connection.query(
        `INSERT INTO orders (user_id, status, currency, subtotal, shipping, tax, total)
         VALUES (?, 'pending_payment', 'ETB', ?, ?, ?, ?)`,
        [req.user.id, totals.subtotal, totals.shipping, totals.tax, totals.total],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
    const orderId = orderResult.insertId;

    // Insert order items
    const orderItemValues = cartItems.map((i) => [
      orderId,
      i.eyeglass_id,
      i.name,
      Number(i.selling_price),
      Number(i.quantity),
      Number((Number(i.selling_price) * Number(i.quantity)).toFixed(2)),
    ]);
    await runQuery(
      connection,
      `INSERT INTO order_items (order_id, eyeglass_id, product_name, unit_price, quantity, line_total) VALUES ?`,
      [orderItemValues]
    );

    // Store screenshot record
    const screenshotPath = `/uploads/payment-screenshots/${path.basename(req.file.path)}`;
    await runQuery(
      connection,
      `INSERT INTO payment_screenshots
         (order_id, user_id, screenshot_path, original_name, notes, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [orderId, req.user.id, screenshotPath, req.file.originalname, notes || null]
    );

    // Clear cart
    await runQuery(connection, `DELETE FROM cart WHERE user_id = ?`, [req.user.id]);

    // Notify admin
    try {
      await createAdminNotification(connection, {
        type: 'screenshot_payment_submitted',
        title: 'Screenshot Payment Submitted',
        message: `User #${req.user.id} submitted a payment screenshot for order #${orderId}. Total: ETB ${totals.total}.`,
        metadata: {
          orderId,
          userId: req.user.id,
          total: totals.total,
          currency: 'ETB',
          screenshotPath,
        },
      });
    } catch (notifErr) {
      console.error('Failed to create screenshot payment notification:', notifErr);
    }

    return res.status(201).json({
      message: 'Payment screenshot submitted successfully. We will verify and confirm your order.',
      orderId,
    });
  } catch (error) {
    console.error('Error in submitScreenshotPayment:', error);
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ message: 'Unable to submit payment screenshot' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/screenshot-payments/admin/list
// Admin: list all screenshot payment submissions
// ---------------------------------------------------------------------------
const adminListScreenshotPayments = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const statusFilter = String(req.query?.status || '').trim();
    const allowed = ['pending', 'approved', 'rejected'];

    let sql = `
      SELECT ps.id, ps.order_id, ps.user_id, ps.screenshot_path, ps.original_name,
             ps.notes, ps.status, ps.admin_note, ps.reviewed_at, ps.created_at,
             u.name AS customer_name, u.email AS customer_email,
             o.total, o.currency, o.status AS order_status
      FROM payment_screenshots ps
      JOIN users u ON u.id = ps.user_id
      JOIN orders o ON o.id = ps.order_id
    `;
    const params = [];

    if (allowed.includes(statusFilter)) {
      sql += ' WHERE ps.status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY ps.created_at DESC LIMIT 200';

    const rows = await runQuery(connection, sql, params);
    return res.json(rows);
  } catch (error) {
    console.error('Error in adminListScreenshotPayments:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/screenshot-payments/admin/:id/review
// Admin: approve or reject a screenshot payment
// ---------------------------------------------------------------------------
const adminReviewScreenshotPayment = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const screenshotId = Number(req.params.id);
    const action = String(req.body?.action || '').trim(); // 'approve' | 'reject'
    const adminNote = String(req.body?.adminNote || '').trim().slice(0, 500);

    if (!screenshotId) {
      return res.status(400).json({ message: 'Invalid screenshot payment id' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
    }

    // Fetch the record
    const rows = await runQuery(
      connection,
      `SELECT ps.*, o.user_id AS order_user_id, o.total, o.status AS order_status
       FROM payment_screenshots ps
       JOIN orders o ON o.id = ps.order_id
       WHERE ps.id = ? LIMIT 1`,
      [screenshotId]
    );

    const record = rows[0];
    if (!record) {
      return res.status(404).json({ message: 'Screenshot payment not found' });
    }

    if (record.status !== 'pending') {
      return res.status(409).json({
        message: `This payment has already been ${record.status}`,
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const newOrderStatus = action === 'approve' ? 'paid' : 'cancelled';

    // Update screenshot record
    await runQuery(
      connection,
      `UPDATE payment_screenshots
       SET status = ?, admin_note = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [newStatus, adminNote || null, screenshotId]
    );

    // Update order status
    await runQuery(
      connection,
      `UPDATE orders SET status = ? WHERE id = ? AND status <> 'paid'`,
      [newOrderStatus, record.order_id]
    );

    if (action === 'approve') {
      // Record in payment_transactions
      await runQuery(
        connection,
        `INSERT INTO payment_transactions
           (order_id, user_id, stripe_session_id, amount, currency, payment_status)
         VALUES (?, ?, ?, ?, 'ETB', 'paid')
         ON DUPLICATE KEY UPDATE payment_status = 'paid'`,
        [
          record.order_id,
          record.user_id,
          `screenshot-${screenshotId}`,
          Number(record.total),
        ]
      );
    }

    // Notify admin of the action taken
    try {
      await createAdminNotification(connection, {
        type: action === 'approve' ? 'screenshot_payment_approved' : 'screenshot_payment_rejected',
        title: action === 'approve' ? 'Screenshot Payment Approved' : 'Screenshot Payment Rejected',
        message:
          action === 'approve'
            ? `Order #${record.order_id} has been marked as paid after screenshot verification.`
            : `Order #${record.order_id} payment screenshot was rejected.`,
        metadata: {
          screenshotId,
          orderId: record.order_id,
          userId: record.user_id,
          adminNote: adminNote || null,
          reviewedByAdminId: req.user?.id || null,
        },
      });
    } catch (notifErr) {
      console.error('Failed to create review notification:', notifErr);
    }

    // Notify the customer with the result
    try {
      const userTitle =
        action === 'approve'
          ? '✅ Payment Verified – Order Confirmed!'
          : '❌ Payment Screenshot Rejected';
      const userMessage =
        action === 'approve'
          ? `Great news! Your payment for Order #${record.order_id} (ETB ${Number(record.total).toFixed(2)}) has been verified and confirmed. Your order is now being processed.${adminNote ? ` Admin note: ${adminNote}` : ''}`
          : `Unfortunately, your payment screenshot for Order #${record.order_id} could not be verified.${adminNote ? ` Reason: ${adminNote}` : ' Please re-submit a clear screenshot or contact support.'}`;

      await createUserNotification(connection, record.user_id, {
        type: action === 'approve' ? 'payment_approved' : 'payment_rejected',
        title: userTitle,
        message: userMessage,
        metadata: {
          screenshotId,
          orderId: record.order_id,
          total: record.total,
          adminNote: adminNote || null,
        },
      });
    } catch (userNotifErr) {
      console.error('Failed to create user notification:', userNotifErr);
    }

    return res.json({
      message: `Payment ${newStatus} successfully`,
      screenshotId,
      orderId: record.order_id,
      status: newStatus,
      orderStatus: newOrderStatus,
    });
  } catch (error) {
    console.error('Error in adminReviewScreenshotPayment:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/screenshot-payments/my-submissions
// User: view their own screenshot payment submissions
// ---------------------------------------------------------------------------
const getUserScreenshotPayments = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const rows = await runQuery(
      connection,
      `SELECT ps.id, ps.order_id, ps.screenshot_path, ps.original_name,
              ps.notes, ps.status, ps.admin_note, ps.reviewed_at, ps.created_at,
              o.total, o.currency, o.status AS order_status
       FROM payment_screenshots ps
       JOIN orders o ON o.id = ps.order_id
       WHERE ps.user_id = ?
       ORDER BY ps.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Error in getUserScreenshotPayments:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadScreenshotMiddleware,
  submitScreenshotPayment,
  adminListScreenshotPayments,
  adminReviewScreenshotPayment,
  getUserScreenshotPayments,
};
