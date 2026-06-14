const { getConnection } = require('../config/mysql');
const { isAllowedRedirectUrl } = require('../utils/securityConfig');

const chapaSecretKey = process.env.CHAPA_SECRET_KEY || process.env.CHAPA_SECRET || '';
const chapaBaseUrl = process.env.CHAPA_API_BASE_URL || 'https://api.chapa.co/v1';
const chapaConfiguredCallbackUrl =
  process.env.CHAPA_CALLBACK_URL ||
  `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/webhook/chapa`;
const chapaConfiguredReturnUrl = process.env.CHAPA_RETURN_URL || '';
const chapaTestPhoneNumber = process.env.CHAPA_TEST_PHONE_NUMBER || '';

const SHIPPING_ETB = 12;
const FREE_SHIPPING_THRESHOLD_ETB = 250;
const TAX_RATE = 0.08;
const ADMIN_ALLOWED_ORDER_STATUSES = [
  'pending_payment',
  'processing',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
];
const PROFIT_RELEVANT_ORDER_STATUSES = ['paid', 'shipped', 'completed'];

const appendQueryParam = (url, key, value) => {
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const normalizeChapaPhone = (rawPhone) => {
  if (!rawPhone) return null;

  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  if (/^2519\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^09\d{8}$/.test(digits)) {
    return `+251${digits.slice(1)}`;
  }

  if (/^9\d{8}$/.test(digits)) {
    return `+251${digits}`;
  }

  return null;
};

const safeParseBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const sanitizeChapaCustomization = (value, maxLength) => {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9._\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (!maxLength || cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim();
};

const toReadableMessage = (value, fallback = 'Unable to initialize payment session') => {
  if (!value) return fallback;

  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toReadableMessage(item, '')).filter(Boolean).join(', ') || fallback;
  }

  if (typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error;
    }

    if (typeof value.detail === 'string' && value.detail.trim()) {
      return value.detail;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
};

const runQuery = (connection, query, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });

const parseAnalyticsRange = (queryParams) => {
  const now = new Date();
  const endDate = queryParams?.to ? new Date(queryParams.to) : now;
  const startDate = queryParams?.from
    ? new Date(queryParams.from)
    : new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  if (startDate > endDate) {
    return null;
  }

  const maxSpanDays = 365;
  const spanDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  if (spanDays > maxSpanDays) {
    return null;
  }

  return {
    from: startDate,
    to: endDate,
  };
};

const normalizeDateStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const normalizeDateEnd = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const calculateTotals = (items) => {
  const subtotal = items.reduce(
    (total, item) => total + Number(item.selling_price) * Number(item.quantity),
    0
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD_ETB || subtotal === 0 ? 0 : SHIPPING_ETB;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

const getUserCart = (connection, userId) =>
  new Promise((resolve, reject) => {
    const query = `
      SELECT c.id, c.user_id, c.eyeglass_id, c.quantity, e.name, e.selling_price, e.quantity_in_stock
      FROM cart c
      JOIN eyeglasses e ON c.eyeglass_id = e.id
      WHERE c.user_id = ?
    `;

    connection.query(query, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });

const insertOrder = (connection, userId, totals) =>
  new Promise((resolve, reject) => {
    const query = `
      INSERT INTO orders (user_id, status, currency, subtotal, shipping, tax, total)
      VALUES (?, 'pending_payment', 'ETB', ?, ?, ?, ?)
    `;
    connection.query(
      query,
      [userId, totals.subtotal, totals.shipping, totals.tax, totals.total],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });

const insertOrderItems = (connection, orderId, items) =>
  new Promise((resolve, reject) => {
    if (!items.length) return resolve();

    const query = `
      INSERT INTO order_items (order_id, eyeglass_id, product_name, unit_price, quantity, line_total)
      VALUES ?
    `;

    const values = items.map((item) => [
      orderId,
      item.eyeglass_id,
      item.name,
      Number(item.selling_price),
      Number(item.quantity),
      Number((Number(item.selling_price) * Number(item.quantity)).toFixed(2)),
    ]);

    connection.query(query, [values], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const deleteOrder = (connection, orderId) =>
  new Promise((resolve, reject) => {
    connection.query('DELETE FROM orders WHERE id = ?', [orderId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const updateOrderSession = (connection, orderId, sessionId) =>
  new Promise((resolve, reject) => {
    const query = 'UPDATE orders SET stripe_session_id = ? WHERE id = ?';
    connection.query(query, [sessionId, orderId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const findOrderBySession = (connection, sessionId) =>
  new Promise((resolve, reject) => {
    const query = `
      SELECT id, user_id, status, total
      FROM orders
      WHERE stripe_session_id = ?
      LIMIT 1
    `;
    connection.query(query, [sessionId], (err, results) => {
      if (err) return reject(err);
      resolve(results?.[0] || null);
    });
  });

const markOrderPaid = (connection, orderId) =>
  new Promise((resolve, reject) => {
    const query = `
      UPDATE orders
      SET status = 'paid'
      WHERE id = ? AND status <> 'paid'
    `;
    connection.query(query, [orderId], (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows > 0);
    });
  });

const upsertPaymentTransaction = (connection, paymentData) =>
  new Promise((resolve, reject) => {
    const query = `
      INSERT INTO payment_transactions (
        order_id,
        user_id,
        stripe_session_id,
        stripe_payment_intent_id,
        amount,
        currency,
        payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        stripe_payment_intent_id = VALUES(stripe_payment_intent_id),
        amount = VALUES(amount),
        currency = VALUES(currency),
        payment_status = VALUES(payment_status)
    `;

    connection.query(
      query,
      [
        paymentData.orderId,
        paymentData.userId,
        paymentData.sessionId,
        paymentData.paymentIntentId,
        paymentData.amount,
        paymentData.currency,
        paymentData.status,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

const clearUserCart = (connection, userId) =>
  new Promise((resolve, reject) => {
    connection.query('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const createAdminNotification = (connection, payload) =>
  new Promise((resolve, reject) => {
    const query = `
      INSERT INTO admin_notifications (type, title, message, metadata, is_read)
      VALUES (?, ?, ?, ?, 0)
    `;

    connection.query(
      query,
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

const finalizePaidSession = async (sessionLike) => {
  const connection = getConnection();
  if (!connection) return;

  const orderId = Number(sessionLike?.metadata?.orderId);
  const userId = Number(sessionLike?.metadata?.userId);
  if (!orderId || !userId) return;

  const paymentAmount = Number(sessionLike.amount || 0);

  const orderMarkedAsPaid = await markOrderPaid(connection, orderId);
  await upsertPaymentTransaction(connection, {
    orderId,
    userId,
    sessionId: sessionLike.id,
    paymentIntentId: sessionLike.paymentIntentId || null,
    amount: paymentAmount,
    currency: (sessionLike.currency || 'etb').toUpperCase(),
    status: sessionLike.paymentStatus || 'paid',
  });
  await clearUserCart(connection, userId);

  if (orderMarkedAsPaid) {
    try {
      await createAdminNotification(connection, {
        type: 'payment_confirmed',
        title: 'Payment Received',
        message: `Order #${orderId} has been paid successfully.`,
        metadata: {
          orderId,
          userId,
          txRef: sessionLike.id,
          amount: paymentAmount,
          currency: (sessionLike.currency || 'etb').toUpperCase(),
          paymentStatus: sessionLike.paymentStatus || 'paid',
        },
      });
    } catch (notificationError) {
      console.error('Failed to create admin payment notification:', notificationError);
    }
  }
};

const verifyChapaTransaction = async (txRef) => {
  const response = await fetch(`${chapaBaseUrl}/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${chapaSecretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const message = result?.message || 'Unable to verify transaction with Chapa';
    throw new Error(message);
  }

  return result;
};

const finalizeByTransactionRef = async (txRef) => {
  const connection = getConnection();
  if (!connection) {
    throw new Error('Database connection unavailable');
  }

  const order = await findOrderBySession(connection, txRef);
  if (!order) {
    return { processed: false, reason: 'order_not_found' };
  }

  if (order.status === 'paid') {
    await clearUserCart(connection, order.user_id);
    return {
      processed: true,
      alreadyPaid: true,
      orderId: Number(order.id),
      userId: Number(order.user_id),
    };
  }

  const verification = await verifyChapaTransaction(txRef);
  const txData = verification?.data || {};
  if (txData.status !== 'success') {
    return {
      processed: false,
      reason: 'payment_not_successful',
      paymentStatus: txData.status || 'unknown',
    };
  }

  await finalizePaidSession({
    id: txRef,
    amount: Number(txData.amount || order.total || 0),
    currency: (txData.currency || 'ETB').toLowerCase(),
    paymentStatus: txData.status,
    paymentIntentId: txData.reference || txData.id || null,
    metadata: {
      orderId: String(order.id),
      userId: String(order.user_id),
    },
  });

  return {
    processed: true,
    orderId: Number(order.id),
    userId: Number(order.user_id),
    paymentStatus: txData.status,
  };
};

const createCheckoutSession = async (req, res) => {
  try {
    if (!chapaSecretKey) {
      return res.status(500).json({
        message:
          'Payment provider is not configured. Set CHAPA_SECRET_KEY in your server environment.',
      });
    }

    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const cartItems = await getUserCart(connection, req.user.id);
    if (!cartItems.length) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const outOfStockItem = cartItems.find(
      (item) => Number(item.quantity_in_stock) < Number(item.quantity)
    );
    if (outOfStockItem) {
      return res.status(400).json({
        message: `${outOfStockItem.name} does not have enough stock for checkout`,
      });
    }

    const totals = calculateTotals(cartItems);
    if (totals.total <= 0) {
      return res.status(400).json({
        message: 'Order total must be greater than zero to initialize payment.',
      });
    }

    const orderId = await insertOrder(connection, req.user.id, totals);

    try {
      await createAdminNotification(connection, {
        type: 'order_created',
        title: 'New Order Created',
        message: `Order #${orderId} is awaiting payment.`,
        metadata: {
          orderId,
          userId: req.user.id,
          total: totals.total,
          currency: 'ETB',
          status: 'pending_payment',
        },
      });
    } catch (notificationError) {
      console.error('Failed to create admin order notification:', notificationError);
    }

    try {
      await insertOrderItems(connection, orderId, cartItems);

      const txRef = `order-${orderId}-${Date.now()}`;

      const requestOrigin = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5174';
      const clientBaseUrl = requestOrigin.replace(/\/+$/, '');
      const configuredCancelUrl = chapaConfiguredReturnUrl
        ? appendQueryParam(chapaConfiguredReturnUrl, 'status', 'cancelled')
        : null;
      const defaultSuccessUrl = `${clientBaseUrl}/payment-result?status=success`;
      const defaultCancelUrl = `${clientBaseUrl}/payment-result?status=cancelled`;

      let providedSuccessUrl = req.body?.successUrl || chapaConfiguredReturnUrl || defaultSuccessUrl;
      let providedCancelUrl = req.body?.cancelUrl || configuredCancelUrl || defaultCancelUrl;

      if (!isAllowedRedirectUrl(providedSuccessUrl, requestOrigin)) {
        providedSuccessUrl = defaultSuccessUrl;
      }
      if (!isAllowedRedirectUrl(providedCancelUrl, requestOrigin)) {
        providedCancelUrl = defaultCancelUrl;
      }

      const successUrl = appendQueryParam(providedSuccessUrl, 'tx_ref', txRef);
      const cancelUrl = appendQueryParam(providedCancelUrl, 'tx_ref', txRef);

      const initializePayload = {
        amount: totals.total.toFixed(2),
        currency: 'ETB',
        email: req.user.email || 'customer@example.com',
        first_name: req.user.name || 'Customer',
        last_name: 'User',
        tx_ref: txRef,
        callback_url: chapaConfiguredCallbackUrl,
        return_url: successUrl,
        customization: {
          title: sanitizeChapaCustomization('Eyeglass Pay', 16),
          description: sanitizeChapaCustomization(`Payment order ${orderId}`, 100),
        },
        metadata: {
          order_id: String(orderId),
          user_id: String(req.user.id),
          cancel_url: cancelUrl,
        },
      };

      const normalizedPhone = normalizeChapaPhone(chapaTestPhoneNumber);
      if (normalizedPhone) {
        initializePayload.phone_number = normalizedPhone;
      }

      const initializeResponse = await fetch(`${chapaBaseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chapaSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initializePayload),
      });

      const initializeResult = await safeParseBody(initializeResponse);
      if (!initializeResponse.ok || initializeResult?.status !== 'success') {
        const providerMessageRaw =
          initializeResult?.message ||
          initializeResult?.error ||
          initializeResult?.errors ||
          initializeResult?.data?.error ||
          initializeResult?.data?.message ||
          'Failed to initialize Chapa checkout';
        const providerMessage = toReadableMessage(providerMessageRaw, 'Failed to initialize Chapa checkout');
        console.error('Chapa initialize failed:', {
          status: initializeResponse.status,
          providerMessage,
          payload: initializePayload,
          result: initializeResult,
        });
        throw new Error(providerMessage);
      }

      await updateOrderSession(connection, orderId, txRef);
      await clearUserCart(connection, req.user.id);

      return res.status(201).json({
        checkoutUrl: initializeResult?.data?.checkout_url,
        sessionId: txRef,
      });
    } catch (sessionError) {
      try {
        await createAdminNotification(connection, {
          type: 'payment_init_failed',
          title: 'Checkout Initialization Failed',
          message: `Unable to initialize checkout for order #${orderId}.`,
          metadata: {
            orderId,
            userId: req.user.id,
            error: toReadableMessage(sessionError?.message || sessionError, 'Checkout initialization failed'),
          },
        });
      } catch (notificationError) {
        console.error('Failed to create admin payment failure notification:', notificationError);
      }

      await deleteOrder(connection, orderId);
      throw sessionError;
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const readableError = toReadableMessage(error?.message || error, 'Unable to initialize payment session');
    return res.status(500).json({
      message: readableError,
    });
  }
};

const getPendingCheckoutSession = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const rows = await runQuery(
      connection,
      `
        SELECT id, stripe_session_id AS session_id, status, created_at
        FROM orders
        WHERE user_id = ?
          AND status = 'pending_payment'
          AND stripe_session_id IS NOT NULL
          AND stripe_session_id <> ''
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [req.user.id]
    );

    const pending = rows?.[0];
    if (!pending) {
      return res.status(404).json({ message: 'No pending checkout session found' });
    }

    return res.json({
      orderId: Number(pending.id),
      sessionId: pending.session_id,
      status: pending.status,
    });
  } catch (error) {
    console.error('Error fetching pending checkout session:', error);
    return res.status(500).json({ message: 'Unable to fetch pending checkout session' });
  }
};

const confirmCheckoutSession = async (req, res) => {
  try {
    if (!chapaSecretKey) {
      return res.status(500).json({
        message:
          'Payment provider is not configured. Set CHAPA_SECRET_KEY in your server environment.',
      });
    }

    const sessionId = req.params.sessionId || req.query.tx_ref || req.query.trx_ref;
    if (!sessionId) {
      return res.status(400).json({ message: 'Missing session id' });
    }

    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const order = await findOrderBySession(connection, sessionId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found for this checkout session' });
    }

    if (Number(order.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to access this payment session' });
    }

    if (order.status === 'paid') {
      await clearUserCart(connection, req.user.id);
      return res.json({
        message: 'Payment already confirmed',
        orderId: Number(order.id),
      });
    }

    const finalized = await finalizeByTransactionRef(sessionId);
    if (!finalized.processed) {
      return res.status(400).json({
        message:
          finalized.reason === 'payment_not_successful'
            ? `Payment is not completed yet (status: ${finalized.paymentStatus || 'unknown'})`
            : 'Payment is not completed yet',
      });
    }

    return res.json({
      message: 'Payment confirmed',
      orderId: Number(order.id),
    });
  } catch (error) {
    console.error('Error confirming checkout session:', error);
    return res.status(500).json({ message: 'Unable to confirm payment status' });
  }
};

const chapaWebhookHandler = async (req, res) => {
  try {
    const txRef =
      req.body?.tx_ref ||
      req.body?.data?.tx_ref ||
      req.body?.trx_ref ||
      req.body?.data?.trx_ref;

    if (!txRef) {
      return res.status(400).json({ message: 'Missing tx_ref in webhook payload' });
    }

    const finalized = await finalizeByTransactionRef(txRef);
    if (!finalized.processed && finalized.reason === 'order_not_found') {
      return res.json({ received: true, processed: false, reason: 'order_not_found' });
    }

    if (!finalized.processed) {
      return res.json({
        received: true,
        processed: false,
        paymentStatus: finalized.paymentStatus || 'unknown',
      });
    }

    return res.json({
      received: true,
      processed: true,
      alreadyPaid: Boolean(finalized.alreadyPaid),
      orderId: finalized.orderId,
    });
  } catch (error) {
    console.error('Payment webhook error:', error.message || error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const range = parseAnalyticsRange(req.query);
    if (!range) {
      return res.status(400).json({
        message: 'Invalid date range. Use valid from/to dates and keep the range within 365 days.',
      });
    }

    const from = normalizeDateStart(range.from);
    const to = normalizeDateEnd(range.to);

    const [summaryRows, profitSummaryRows, trendRows, profitTrendRows, topProductsRows, statusRows] = await Promise.all([
      runQuery(
        connection,
        `
          SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(total), 0) AS total_revenue,
            COALESCE(AVG(total), 0) AS average_order_value,
            COALESCE(SUM(CASE WHEN status = 'paid' OR status = 'completed' OR status = 'shipped' THEN 1 ELSE 0 END), 0) AS paid_orders,
            COALESCE(SUM(CASE WHEN status = 'paid' OR status = 'completed' OR status = 'shipped' THEN total ELSE 0 END), 0) AS collected_revenue
          FROM orders
          WHERE created_at BETWEEN ? AND ?
        `,
        [from, to]
      ),
      runQuery(
        connection,
        `
          SELECT
            COUNT(DISTINCT o.id) AS paid_orders_count,
            COALESCE(SUM(oi.line_total), 0) AS gross_sales,
            COALESCE(SUM(oi.quantity * COALESCE(e.buying_price, 0)), 0) AS total_cost,
            COALESCE(SUM(oi.quantity), 0) AS units_sold
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          LEFT JOIN eyeglasses e ON e.id = oi.eyeglass_id
          WHERE o.created_at BETWEEN ? AND ?
            AND o.status IN (${PROFIT_RELEVANT_ORDER_STATUSES.map(() => '?').join(', ')})
        `,
        [from, to, ...PROFIT_RELEVANT_ORDER_STATUSES]
      ),
      runQuery(
        connection,
        `
          SELECT
            DATE(created_at) AS day,
            COUNT(*) AS orders,
            COALESCE(SUM(total), 0) AS revenue
          FROM orders
          WHERE created_at BETWEEN ? AND ?
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC
        `,
        [from, to]
      ),
      runQuery(
        connection,
        `
          SELECT
            DATE(o.created_at) AS day,
            COALESCE(SUM(oi.line_total), 0) AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(e.buying_price, 0)), 0) AS cost
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          LEFT JOIN eyeglasses e ON e.id = oi.eyeglass_id
          WHERE o.created_at BETWEEN ? AND ?
            AND o.status IN (${PROFIT_RELEVANT_ORDER_STATUSES.map(() => '?').join(', ')})
          GROUP BY DATE(o.created_at)
          ORDER BY DATE(o.created_at) ASC
        `,
        [from, to, ...PROFIT_RELEVANT_ORDER_STATUSES]
      ),
      runQuery(
        connection,
        `
          SELECT
            oi.eyeglass_id,
            COALESCE(MAX(oi.product_name), MAX(e.name), 'Unknown Product') AS product_name,
            SUM(oi.quantity) AS total_quantity,
            COALESCE(SUM(oi.line_total), 0) AS total_sales,
            COALESCE(SUM(oi.quantity * COALESCE(e.buying_price, 0)), 0) AS total_cost
          FROM order_items oi
          LEFT JOIN orders o ON o.id = oi.order_id
          LEFT JOIN eyeglasses e ON e.id = oi.eyeglass_id
          WHERE o.created_at BETWEEN ? AND ?
            AND o.status IN (${PROFIT_RELEVANT_ORDER_STATUSES.map(() => '?').join(', ')})
          GROUP BY oi.eyeglass_id
          ORDER BY (total_sales - total_cost) DESC, total_sales DESC
          LIMIT 5
        `,
        [from, to, ...PROFIT_RELEVANT_ORDER_STATUSES]
      ),
      runQuery(
        connection,
        `
          SELECT
            status,
            COUNT(*) AS count
          FROM orders
          WHERE created_at BETWEEN ? AND ?
          GROUP BY status
          ORDER BY count DESC
        `,
        [from, to]
      ),
    ]);

    const summary = summaryRows?.[0] || {};
    const profitSummary = profitSummaryRows?.[0] || {};

    const grossSales = Number(profitSummary.gross_sales || 0);
    const totalCost = Number(profitSummary.total_cost || 0);
    const grossProfit = grossSales - totalCost;
    const profitMarginPercent = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;
    const paidOrdersCount = Number(profitSummary.paid_orders_count || 0);
    const averageProfitPerOrder = paidOrdersCount > 0 ? grossProfit / paidOrdersCount : 0;

    return res.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalOrders: Number(summary.total_orders || 0),
        totalRevenue: Number(summary.total_revenue || 0),
        averageOrderValue: Number(summary.average_order_value || 0),
        paidOrders: Number(summary.paid_orders || 0),
        collectedRevenue: Number(summary.collected_revenue || 0),
        estimatedCost: totalCost,
        estimatedGrossProfit: grossProfit,
        profitMarginPercent,
        averageProfitPerOrder,
        unitsSold: Number(profitSummary.units_sold || 0),
        profitScopeOrderCount: paidOrdersCount,
      },
      trends: (trendRows || []).map((item) => ({
        day: item.day,
        orders: Number(item.orders || 0),
        revenue: Number(item.revenue || 0),
      })),
      profitTrends: (profitTrendRows || []).map((item) => {
        const revenue = Number(item.revenue || 0);
        const cost = Number(item.cost || 0);
        const profit = revenue - cost;
        return {
          day: item.day,
          revenue,
          cost,
          profit,
          marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
        };
      }),
      topProducts: (topProductsRows || []).map((item) => {
        const totalSales = Number(item.total_sales || 0);
        const itemCost = Number(item.total_cost || 0);
        const itemProfit = totalSales - itemCost;
        return {
          eyeglassId: Number(item.eyeglass_id || 0),
          productName: item.product_name,
          totalQuantity: Number(item.total_quantity || 0),
          totalSales,
          estimatedCost: itemCost,
          estimatedProfit: itemProfit,
          marginPercent: totalSales > 0 ? (itemProfit / totalSales) * 100 : 0,
        };
      }),
      statusDistribution: (statusRows || []).map((item) => ({
        status: item.status || 'unknown',
        count: Number(item.count || 0),
      })),
      meta: {
        profitStatuses: PROFIT_RELEVANT_ORDER_STATUSES,
        note: 'Profit metrics are estimated using order line totals and current product buying prices.',
      },
    });
  } catch (error) {
    console.error('Error in getAdminAnalytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const bulkUpdateAdminOrderStatus = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const nextStatus = String(req.body?.status || '').trim();
    const orderIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.map((id) => Number(id)).filter(Boolean)
      : [];

    if (!ADMIN_ALLOWED_ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid order status value' });
    }

    if (!orderIds.length) {
      return res.status(400).json({ message: 'Provide at least one valid order id' });
    }

    const uniqueOrderIds = [...new Set(orderIds)];
    const updateQuery = 'UPDATE orders SET status = ? WHERE id IN (?)';

    connection.query(updateQuery, [nextStatus, uniqueOrderIds], async (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error bulk updating order statuses:', updateErr);
        return res.status(500).json({ message: 'Error updating order statuses' });
      }

      try {
        await createAdminNotification(connection, {
          type: 'order_status_bulk_updated',
          title: 'Bulk Order Status Updated',
          message: `${updateResult?.affectedRows || 0} orders changed to ${nextStatus}.`,
          metadata: {
            status: nextStatus,
            orderIds: uniqueOrderIds,
            affectedRows: updateResult?.affectedRows || 0,
            changedByAdminId: req.user?.id || null,
          },
        });
      } catch (notificationError) {
        console.error('Failed to create admin bulk status notification:', notificationError);
      }

      return res.json({
        message: 'Order statuses updated successfully',
        affectedRows: updateResult?.affectedRows || 0,
        status: nextStatus,
      });
    });
  } catch (error) {
    console.error('Error in bulkUpdateAdminOrderStatus:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getAdminOrders = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const query = `
      SELECT
        o.id,
        o.user_id,
        u.name AS customer_name,
        u.email AS customer_email,
        o.status,
        o.currency,
        o.subtotal,
        o.shipping,
        o.tax,
        o.total,
        o.created_at,
        o.updated_at,
        o.stripe_session_id AS tx_ref,
        pt.payment_status,
        pt.amount AS paid_amount,
        pt.currency AS paid_currency,
        pt.updated_at AS paid_at,
        (
          SELECT COUNT(*)
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) AS item_count
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN payment_transactions pt ON pt.order_id = o.id
      ORDER BY o.created_at DESC
      LIMIT 300
    `;

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching admin orders:', err);
        return res.status(500).json({ message: 'Error fetching orders' });
      }

      res.json(results || []);
    });
  } catch (error) {
    console.error('Error in getAdminOrders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAdminOrderStatus = async (req, res) => {
  try {
    const connection = getConnection();
    if (!connection) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const orderId = Number(req.params.orderId);
    const nextStatus = String(req.body?.status || '').trim();
    const allowedStatuses = [
      'pending_payment',
      'processing',
      'paid',
      'shipped',
      'completed',
      'cancelled',
      'refunded',
    ];

    if (!orderId) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid order status value' });
    }

    const updateQuery = 'UPDATE orders SET status = ? WHERE id = ?';
    connection.query(updateQuery, [nextStatus, orderId], async (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error updating order status:', updateErr);
        return res.status(500).json({ message: 'Error updating order status' });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const selectQuery = `
        SELECT id, user_id, status, total, currency
        FROM orders
        WHERE id = ?
        LIMIT 1
      `;

      connection.query(selectQuery, [orderId], async (selectErr, rows) => {
        if (selectErr) {
          console.error('Error fetching updated order:', selectErr);
          return res.status(500).json({ message: 'Order status updated but failed to fetch order' });
        }

        const order = rows?.[0] || null;
        if (order) {
          try {
            await createAdminNotification(connection, {
              type: 'order_status_updated',
              title: 'Order Status Updated',
              message: `Order #${order.id} status changed to ${order.status}.`,
              metadata: {
                orderId: order.id,
                userId: order.user_id,
                status: order.status,
                total: order.total,
                currency: order.currency,
                changedByAdminId: req.user?.id || null,
              },
            });
          } catch (notificationError) {
            console.error('Failed to create admin order status notification:', notificationError);
          }
        }

        return res.json({
          message: 'Order status updated successfully',
          order,
        });
      });
    });
  } catch (error) {
    console.error('Error in updateAdminOrderStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const stripeWebhookHandler = chapaWebhookHandler;

module.exports = {
  createCheckoutSession,
  getPendingCheckoutSession,
  confirmCheckoutSession,
  getAdminAnalytics,
  getAdminOrders,
  bulkUpdateAdminOrderStatus,
  updateAdminOrderStatus,
  chapaWebhookHandler,
  stripeWebhookHandler,
};
