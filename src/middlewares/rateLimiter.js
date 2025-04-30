const redis = require('redis');
const logger = require('../config/logger');

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
  },
});

client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
client.connect().catch((err) => logger.error(`Redis connection error: ${err.message}`));

const rateLimit = async (req, res, next) => {
  const ip = req.ip;
  const key = `rate-limit:${ip}`;
  const limit = 100;
  const windowMs = 60 * 1000;

  try {
    if (!client.isOpen) {
      logger.warn('Redis not connected, bypassing rate limiting');
      return next();
    }

    const requests = parseInt(await client.get(key) || '0', 10);
    if (requests >= limit) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ error: 'Too many requests' });
    }

    await client.setEx(key, windowMs / 1000, (requests + 1).toString());
    logger.info(`Rate limit updated for IP: ${ip}, requests: ${requests + 1}`);
    next();
  } catch (error) {
    logger.error(`Rate limiter error: ${error.message}`);
    next();
  }
};

module.exports = rateLimit;