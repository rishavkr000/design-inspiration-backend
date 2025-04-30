const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    logger.warn('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`Authenticated user: ${decoded.id}`);
    next();
  } catch (error) {
    logger.error(`JWT verification error: ${error.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;