require('dotenv').config();
const express = require('express');
const logger = require('./src/config/logger');
const apiRoutes = require('./src/routes/api');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}, Stack: ${err.stack}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});