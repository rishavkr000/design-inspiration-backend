const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

const validateExtractLinks = [
  (req, res, next) => {
    logger.info('Entering validateExtractLinks middleware');
    next();
  },
  body('url').isURL().withMessage('Valid URL is required'),
  (req, res, next) => {
    logger.info('Processing validateExtractLinks validation result');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation errors: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    logger.info('Validation passed for extract-links');
    next();
  },
];

const validateAddInspirations = [
  (req, res, next) => {
    logger.info('Entering validateAddInspirations middleware');
    next();
  },
  body('urls').isArray().withMessage('URLs must be an array'),
  body('urls.*').isURL().withMessage('Each URL must be valid'),
  (req, res, next) => {
    logger.info('Processing validateAddInspirations validation result');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation errors: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    logger.info('Validation passed for add-inspirations');
    next();
  },
];

const validateRegister = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateLogin = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateExtractLinks,
  validateAddInspirations,
  validateRegister,
  validateLogin,
};