const { getConnection } = require('../config/mysql');

// @desc    Get all eyeglasses
// @route   GET /api/eyeglasses
// @access  Public
const getEyeglasses = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT e.*, c.name as category_name 
      FROM eyeglasses e 
      LEFT JOIN categories c ON e.category_id = c.id
      ORDER BY e.created_at DESC
    `;
    
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching eyeglasses:', err);
        return res.status(500).json({ message: 'Error fetching eyeglasses' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Error in getEyeglasses:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get low stock eyeglasses for admin
// @route   GET /api/eyeglasses/admin/low-stock
// @access  Private/Admin
const getAdminLowStock = async (req, res) => {
  try {
    const connection = getConnection();
    const threshold = Math.min(Math.max(Number(req.query?.threshold) || 10, 1), 200);

    const query = `
      SELECT e.*, c.name as category_name
      FROM eyeglasses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.quantity_in_stock <= ?
      ORDER BY e.quantity_in_stock ASC, e.updated_at DESC
      LIMIT 200
    `;

    connection.query(query, [threshold], (err, results) => {
      if (err) {
        console.error('Error fetching low stock eyeglasses:', err);
        return res.status(500).json({ message: 'Error fetching low stock eyeglasses' });
      }

      res.json({
        threshold,
        items: results || [],
      });
    });
  } catch (error) {
    console.error('Error in getAdminLowStock:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single eyeglass
// @route   GET /api/eyeglasses/:id
// @access  Public
const getEyeglass = async (req, res) => {
  try {
    const connection = getConnection();
    const query = `
      SELECT e.*, c.name as category_name 
      FROM eyeglasses e 
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `;
    
    connection.query(query, [req.params.id], (err, results) => {
      if (err) {
        console.error('Error fetching eyeglass:', err);
        return res.status(500).json({ message: 'Error fetching eyeglass' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Eyeglass not found' });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Error in getEyeglass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new eyeglass
// @route   POST /api/eyeglasses/create
// @access  Private/Admin
const createEyeglass = async (req, res) => {
  try {
    const connection = getConnection();
    const {
      name,
      description,
      category_id,
      brand,
      frame_type,
      lens_type,
      frame_material,
      quantity_in_stock,
      buying_price,
      selling_price,
      image_url,
      prescription_required
    } = req.body;

    const query = `
      INSERT INTO eyeglasses (
        name, description, category_id, brand, frame_type, lens_type,
        frame_material, quantity_in_stock, buying_price, selling_price,
        image_url, prescription_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      query,
      [name, description, category_id, brand, frame_type, lens_type,
       frame_material, quantity_in_stock, buying_price, selling_price,
       image_url, prescription_required || 0],
      (err, result) => {
        if (err) {
          console.error('Error creating eyeglass:', err);
          return res.status(500).json({ message: 'Error creating eyeglass' });
        }

        res.status(201).json({
          message: 'Eyeglass created successfully',
          id: result.insertId
        });
      }
    );
  } catch (error) {
    console.error('Error in createEyeglass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update eyeglass
// @route   PUT /api/eyeglasses/:id
// @access  Private/Admin
const updateEyeglass = async (req, res) => {
  try {
    const connection = getConnection();
    const {
      name,
      description,
      category_id,
      brand,
      frame_type,
      lens_type,
      frame_material,
      quantity_in_stock,
      buying_price,
      selling_price,
      image_url,
      prescription_required
    } = req.body;

    const query = `
      UPDATE eyeglasses SET
        name = ?, description = ?, category_id = ?, brand = ?, frame_type = ?,
        lens_type = ?, frame_material = ?, quantity_in_stock = ?, buying_price = ?,
        selling_price = ?, image_url = ?, prescription_required = ?
      WHERE id = ?
    `;

    connection.query(
      query,
      [name, description, category_id, brand, frame_type, lens_type,
       frame_material, quantity_in_stock, buying_price, selling_price,
       image_url, prescription_required, req.params.id],
      (err, result) => {
        if (err) {
          console.error('Error updating eyeglass:', err);
          return res.status(500).json({ message: 'Error updating eyeglass' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Eyeglass not found' });
        }

        res.json({ message: 'Eyeglass updated successfully' });
      }
    );
  } catch (error) {
    console.error('Error in updateEyeglass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Restock an eyeglass quantity
// @route   PUT /api/eyeglasses/admin/:id/restock
// @access  Private/Admin
const restockEyeglass = async (req, res) => {
  try {
    const connection = getConnection();
    const eyeglassId = Number(req.params.id);
    const quantityToAdd = Number(req.body?.quantity);

    if (!eyeglassId) {
      return res.status(400).json({ message: 'Invalid eyeglass id' });
    }

    if (!Number.isInteger(quantityToAdd) || quantityToAdd <= 0 || quantityToAdd > 10000) {
      return res.status(400).json({ message: 'Quantity must be a positive whole number up to 10000' });
    }

    const updateQuery = `
      UPDATE eyeglasses
      SET quantity_in_stock = quantity_in_stock + ?
      WHERE id = ?
    `;

    connection.query(updateQuery, [quantityToAdd, eyeglassId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error restocking eyeglass:', updateErr);
        return res.status(500).json({ message: 'Error restocking eyeglass' });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Eyeglass not found' });
      }

      const selectQuery = `
        SELECT e.*, c.name as category_name
        FROM eyeglasses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ?
        LIMIT 1
      `;

      connection.query(selectQuery, [eyeglassId], (selectErr, rows) => {
        if (selectErr) {
          console.error('Error fetching restocked eyeglass:', selectErr);
          return res.status(500).json({ message: 'Restocked but failed to fetch updated eyeglass' });
        }

        return res.json({
          message: 'Eyeglass restocked successfully',
          quantityAdded: quantityToAdd,
          eyeglass: rows?.[0] || null,
        });
      });
    });
  } catch (error) {
    console.error('Error in restockEyeglass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete eyeglass
// @route   DELETE /api/eyeglasses/:id
// @access  Private/Admin
const deleteEyeglass = async (req, res) => {
  try {
    const connection = getConnection();
    const query = 'DELETE FROM eyeglasses WHERE id = ?';
    
    connection.query(query, [req.params.id], (err, result) => {
      if (err) {
        console.error('Error deleting eyeglass:', err);
        return res.status(500).json({ message: 'Error deleting eyeglass' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Eyeglass not found' });
      }

      res.json({ message: 'Eyeglass deleted successfully' });
    });
  } catch (error) {
    console.error('Error in deleteEyeglass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getEyeglasses,
  getAdminLowStock,
  getEyeglass,
  createEyeglass,
  restockEyeglass,
  updateEyeglass,
  deleteEyeglass
};
