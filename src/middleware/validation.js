const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn({
      message: 'Validation errors',
      errors: errors.array(),
      path: req.path
    });
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }
  next();
};

const validateSubscribe = [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').isMobilePhone().optional(),
  body('age').isInt({ min: 18, max: 120 }).optional(),
  body('healthGoals').isArray().optional(),
  body('currentSupplements').isArray().optional(),
  body('medicalConditions').isArray().optional(),
  validateRequest
];

const validateAssessment = [
  body('customerId').isUUID().withMessage('Invalid customer ID'),
  body('answers').isArray().notEmpty().withMessage('Assessment answers required'),
  validateRequest
];

const validatePayment = [
  body('customerId').isUUID().withMessage('Invalid customer ID'),
  body('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
  body('redirectUrl').isURL().withMessage('Invalid redirect URL'),
  validateRequest
];

module.exports = {
  validateSubscribe,
  validateAssessment,
  validatePayment,
  validateRequest
};
