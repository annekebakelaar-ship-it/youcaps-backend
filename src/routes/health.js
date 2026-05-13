const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Youcaps Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /health/ready
 * Readiness check (dependencies)
 */
router.get('/ready', async (req, res) => {
  try {
    const { supabase } = require('../database/models');
    
    // Check Supabase connection
    const { data, error } = await supabase.from('customers').select('count(*)', { count: 'exact' }).limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Check SMTP
    const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    
    // Check Mollie
    const mollieConfigured = process.env.MOLLIE_API_KEY;

    res.json({
      success: true,
      status: 'ready',
      dependencies: {
        database: { status: 'connected', configured: true },
        email: { status: 'configured', configured: smtpConfigured },
        payment: { status: 'configured', configured: mollieConfigured }
      }
    });
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      success: false,
      status: 'not_ready',
      error: error.message
    });
  }
});

/**
 * GET /health/live
 * Liveness check
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
