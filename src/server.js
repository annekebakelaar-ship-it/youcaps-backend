#!/usr/bin/env node
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info(`🚀 Youcaps Backend Server running on port ${PORT} [${ENV}]`);
  logger.info(`Email Service: ${process.env.SMTP_HOST}`);
  logger.info(`Database: ${process.env.SUPABASE_URL ? 'Supabase' : 'Not configured'}`);
  logger.info(`Payment Gateway: ${process.env.MOLLIE_API_KEY ? 'Mollie' : 'Not configured'}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
