const { getConnection } = require('../config/mysql');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT c.*, e.name, e.selling_price, e.image_url, e.brand, e.quantity_in_stock
      FROM cart c
      JOIN eyeglasses e ON c.eyeglass_id = e.id
      WHERE c.user_id = ?
    `;
    
    connection.query(query, [req.user.id], (err, results) => {
      if (err) {
        console.error('Error fetching cart:', err);
        return res.status(500).json({ message: 'Error fetching cart' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Error in getCart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const connection = getConnection();
    const { eyeglass_id, quantity } = req.body;
    const user_id = req.user.id;
    const requestedQuantity = Math.max(1, Number(quantity) || 1);

    const stockQuery = 'SELECT name, quantity_in_stock FROM eyeglasses WHERE id = ?';
    connection.query(stockQuery, [eyeglass_id], (err, stockResults) => {
      if (err) {
        console.error('Error checking stock:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (!stockResults.length) {
        return res.status(404).json({ message: 'Eyeglass not found' });
      }

      const { name, quantity_in_stock } = stockResults[0];
      const availableStock = Number(quantity_in_stock) || 0;

      if (availableStock <= 0) {
        return res.status(400).json({ message: `${name} is out of stock` });
      }

      // Check if item already in cart
      const checkQuery = 'SELECT * FROM cart WHERE user_id = ? AND eyeglass_id = ?';
      connection.query(checkQuery, [user_id, eyeglass_id], (err, results) => {
        if (err) {
          console.error('Error checking cart:', err);
          return res.status(500).json({ message: 'Server error' });
        }

        if (results.length > 0) {
          const existingQuantity = Number(results[0].quantity) || 0;
          const nextQuantity = existingQuantity + requestedQuantity;
          if (nextQuantity > availableStock) {
            return res.status(400).json({
              message: `Only ${availableStock} left in stock for ${name}`,
            });
          }

          // Update quantity
          const updateQuery = 'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND eyeglass_id = ?';
          connection.query(updateQuery, [requestedQuantity, user_id, eyeglass_id], (err) => {
            if (err) {
              console.error('Error updating cart:', err);
              return res.status(500).json({ message: 'Error updating cart' });
            }
            res.json({ message: 'Cart updated successfully' });
          });
        } else {
          if (requestedQuantity > availableStock) {
            return res.status(400).json({
              message: `Only ${availableStock} left in stock for ${name}`,
            });
          }

          // Insert new item
          const insertQuery = 'INSERT INTO cart (user_id, eyeglass_id, quantity) VALUES (?, ?, ?)';
          connection.query(insertQuery, [user_id, eyeglass_id, requestedQuantity], (err) => {
            if (err) {
              console.error('Error adding to cart:', err);
              return res.status(500).json({ message: 'Error adding to cart' });
            }
            res.status(201).json({ message: 'Added to cart successfully' });
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:id
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const connection = getConnection();
    const { quantity } = req.body;
    const cart_id = req.params.id;
    const user_id = req.user.id;
    const requestedQuantity = Math.max(1, Number(quantity) || 1);

    const stockQuery = `
      SELECT e.name, e.quantity_in_stock
      FROM cart c
      JOIN eyeglasses e ON c.eyeglass_id = e.id
      WHERE c.id = ? AND c.user_id = ?
    `;

    connection.query(stockQuery, [cart_id, user_id], (err, results) => {
      if (err) {
        console.error('Error checking stock:', err);
        return res.status(500).json({ message: 'Error updating cart item' });
      }

      if (!results.length) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      const { name, quantity_in_stock } = results[0];
      const availableStock = Number(quantity_in_stock) || 0;

      if (availableStock <= 0) {
        return res.status(400).json({ message: `${name} is out of stock` });
      }

      if (requestedQuantity > availableStock) {
        return res.status(400).json({
          message: `Only ${availableStock} left in stock for ${name}`,
        });
      }

      const query = 'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?';
      connection.query(query, [requestedQuantity, cart_id, user_id], (err, result) => {
        if (err) {
          console.error('Error updating cart item:', err);
          return res.status(500).json({ message: 'Error updating cart item' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Cart item not found' });
        }

        res.json({ message: 'Cart item updated successfully' });
      });
    });
  } catch (error) {
    console.error('Error in updateCartItem:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const connection = getConnection();
    const cart_id = req.params.id;
    const user_id = req.user.id;

    const query = 'DELETE FROM cart WHERE id = ? AND user_id = ?';
    connection.query(query, [cart_id, user_id], (err, result) => {
      if (err) {
        console.error('Error removing from cart:', err);
        return res.status(500).json({ message: 'Error removing from cart' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      res.json({ message: 'Item removed from cart successfully' });
    });
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear user's cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const connection = getConnection();
    const query = 'DELETE FROM cart WHERE user_id = ?';
    connection.query(query, [req.user.id], (err) => {
      if (err) {
        console.error('Error clearing cart:', err);
        return res.status(500).json({ message: 'Error clearing cart' });
      }
      res.json({ message: 'Cart cleared successfully' });
    });
  } catch (error) {
    console.error('Error in clearCart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
