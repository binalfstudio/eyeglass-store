const { getConnection } = require('../config/mysql');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const connection = getConnection();
    const query = 'SELECT * FROM categories ORDER BY name ASC';
    
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching categories:', err);
        return res.status(500).json({ message: 'Error fetching categories' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const connection = getConnection();
    const { name, description } = req.body;

    const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';

    connection.query(query, [name, description], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Category already exists' });
        }
        console.error('Error creating category:', err);
        return res.status(500).json({ message: 'Error creating category' });
      }

      res.status(201).json({
        message: 'Category created successfully',
        id: result.insertId
      });
    });
  } catch (error) {
    console.error('Error in createCategory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const connection = getConnection();
    const { name, description } = req.body;

    const query = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';

    connection.query(query, [name, description, req.params.id], (err, result) => {
      if (err) {
        console.error('Error updating category:', err);
        return res.status(500).json({ message: 'Error updating category' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category updated successfully' });
    });
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const connection = getConnection();
    const query = 'DELETE FROM categories WHERE id = ?';
    
    connection.query(query, [req.params.id], (err, result) => {
      if (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ message: 'Error deleting category' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    });
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
