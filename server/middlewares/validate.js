const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('adminKey').optional({ nullable: true }).trim().isLength({ max: 128 }),
  handleValidationErrors,
];

const loginRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const profileUpdateRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  handleValidationErrors,
];

module.exports = {
  registerRules,
  loginRules,
  profileUpdateRules,
};
