const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { validateSubscribe } = require('../middleware/validation');
const { Customer, Subscription } = require('../database/models');
const { onboardNewCustomer } = require('../services/automationService');

const router = express.Router();

/**
 * POST /api/subscribe
 * Create new subscription and customer record
 * Body: { email, firstName, lastName, phone?, age?, healthGoals?, currentSupplements?, medicalConditions? }
 */
router.post('/', validateSubscribe, async (req, res, next) => {
  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      age,
      healthGoals = [],
      currentSupplements = [],
      medicalConditions = []
    } = req.body;

    logger.info(`New subscription request: ${email}`);

    // Check if customer already exists
    let customer = await Customer.findByEmail(email);

    if (customer) {
      logger.warn(`Customer already exists: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'This email is already registered. Please log in or use a different email.'
      });
    }

    // Create customer
    customer = await Customer.create({
      email,
      firstName,
      lastName,
      phone,
      age,
      healthGoals,
      currentSupplements,
      medicalConditions
    });

    logger.info(`Customer created: ${customer.id}`);

    // Create subscription record
    const subscription = await Subscription.create({
      customerId: customer.id,
      planType: 'monthly',
      priceEur: 29.00,
      billingInterval: 'month',
      status: 'pending'
    });

    logger.info(`Subscription created: ${subscription.id}`);

    // Send onboarding email and schedule nurture sequence
    const assessmentUrl = `${process.env.FRONTEND_URL || 'https://youcaps.app'}/assessment/${subscription.id}`;
    await onboardNewCustomer(customer, assessmentUrl);

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully. Check your email for the assessment link.',
      data: {
        customerId: customer.id,
        subscriptionId: subscription.id,
        email: customer.email,
        status: subscription.status
      }
    });
  } catch (error) {
    logger.error('Subscription creation error:', error);
    next(error);
  }
});

/**
 * GET /api/subscribe/:customerId
 * Get subscription details
 */
router.get('/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const subscriptions = await Subscription.findByCustomerId(customerId);

    res.json({
      success: true,
      data: {
        customer,
        subscriptions
      }
    });
  } catch (error) {
    logger.error('Subscription fetch error:', error);
    next(error);
  }
});

/**
 * PUT /api/subscribe/:subscriptionId
 * Update subscription
 */
router.put('/:subscriptionId', async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const updates = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const updated = await Subscription.update(subscriptionId, updates);

    logger.info(`Subscription updated: ${subscriptionId}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Subscription update error:', error);
    next(error);
  }
});

/**
 * DELETE /api/subscribe/:subscriptionId
 * Cancel subscription
 */
router.delete('/:subscriptionId', async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const updated = await Subscription.update(subscriptionId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    });

    logger.info(`Subscription cancelled: ${subscriptionId}`);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Subscription cancellation error:', error);
    next(error);
  }
});

module.exports = router;
