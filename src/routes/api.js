const express = require('express');
const router = express.Router();
const {
  validateExtractLinks,
  validateAddInspirations,
  validateRegister,
  validateLogin,
} = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const rateLimit = require('../middlewares/rateLimiter');
const {
  extractLinksHandler,
  addInspirations,
  getInspirations,
  getInspirationBySlug,
} = require('../controllers/inspirationController');
const { register, login } = require('../controllers/authController');
const logger = require('../config/logger');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/extract-links', auth, validateExtractLinks, extractLinksHandler);
router.post('/inspirations', auth, rateLimit, validateAddInspirations, addInspirations);
router.get('/inspirations', rateLimit, getInspirations);
router.get('/inspirations/:slug', rateLimit, getInspirationBySlug);

module.exports = router;