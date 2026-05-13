const express = require('express');
const logger = require('../utils/logger');
const { validatePayment } = require('../middleware/validation');
const { Subscription, Customer, PaymentTransaction } = require('../database/models');
const paymentService = require('../services/paymentService');
const { sendPaymentConfirmation, sendPaymentFailureNotification } = require('../services/automationService');

const router = express.Router();

/**
 * POST /api/payment/checkout
 * Simple checkout endpoint - creates customer, subscription, and payment in one call
 * Body: { email, firstName, lastName, address, city, postalCode, country, marketing, amount, currency, description }
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      address, 
      city, 
      postalCode, 
      country, 
      marketing,
      amount,
      currency,
      description
    } = req.body;

    logger.info(`Checkout request for email: ${email}`);

    // Validate required fields
    if (!email || !firstName || !lastName || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, lastName, amount'
      });
    }

    // Create or get customer
    let customer = await Customer.findByEmail(email);
    if (!customer) {
      customer = await Customer.create({
        email,
        first_name: firstName,
        last_name: lastName,
        address,
        city,
        postal_code: postalCode,
        country: country || 'NL',
        marketing_consent: marketing || false,
        status: 'pending'
      });
      logger.info(`New customer created: ${customer.id}`);
    }

    // Create or get Mollie customer
    const mollieCustomer = await paymentService.createOrGetMollieCustomer(
      customer.email,
      customer.first_name,
      customer.last_name
    );

    // Create payment
    const amountCents = Math.round((amount || 2900) / 100); // Normalize to euros
    const payment = await paymentService.createPayment(
      mollieCustomer.id,
      amountCents,
      description || 'Youcaps Subscription',
      `${process.env.FRONTEND_URL || 'https://youcaps-frontend.onrender.com'}/success.html`
    );

    // Save payment transaction
    const transaction = await PaymentTransaction.create({
      customerId: customer.id,
      molliePaymentId: payment.id,
      amountEur: amountCents,
      status: payment.status,
      description: description || 'Youcaps Subscription'
    });

    logger.info(`Payment created: ${payment.id}`);

    res.status(201).json({
      success: true,
      data: {
        customerId: customer.id,
        paymentId: payment.id,
        transactionId: transaction.id,
        amount: amountCents,
        currency: currency || 'EUR',
        checkoutUrl: payment._links?.checkout?.href || payment.getCheckoutUrl?.(),
        status: payment.status
      }
    });
  } catch (error) {
    logger.error('Checkout error:', error);
    next(error);
  }
});

/**
 * POST /api/payment/create
 * Create payment for subscription
 * Body: { customerId, subscriptionId, redirectUrl }
 */
router.post('/create', validatePayment, async (req, res, next) => {
  try {
    const { customerId, subscriptionId, redirectUrl } = req.body;

    logger.info(`Payment creation request for customer: ${customerId}, subscription: ${subscriptionId}`);

    // Verify customer and subscription
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    if (subscription.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        error: 'Subscription does not belong to this customer'
      });
    }

    // Create or get Mollie customer
    const mollieCustomer = await paymentService.createOrGetMollieCustomer(
      customer.email,
      customer.first_name,
      customer.last_name
    );

    // Create payment
    const payment = await paymentService.createPayment(
      mollieCustomer.id,
      subscription.price_eur,
      `Youcaps Monthly Subscription - €${subscription.price_eur}`,
      redirectUrl
    );

    // Save payment transaction
    const transaction = await PaymentTransaction.create({
      subscriptionId,
      customerId,
      molliePaymentId: payment.id,
      amountEur: subscription.price_eur,
      status: payment.status,
      description: payment.description
    });

    logger.info(`Payment created: ${payment.id}`);

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: transaction.id,
        amount: subscription.price_eur,
        currency: 'EUR',
        checkoutUrl: payment._links?.checkout?.href,
        status: payment.status
      }
    });
  } catch (error) {
    logger.error('Payment creation error:', error);
    next(error);
  }
});

/**
 * POST /api/payment/webhook
 * Mollie webhook for payment status updates
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const { id: paymentId } = req.body;

    if (!paymentId) {
      logger.warn('Webhook received without payment ID');
      return res.status(400).json({
        success: false,
        error: 'Payment ID required'
      });
    }

    logger.info(`Payment webhook received: ${paymentId}`);

    // Get payment status from Mollie
    const paymentInfo = await paymentService.handlePaymentWebhook(paymentId);

    // Find transaction by Mollie payment ID
    const { PaymentTransaction } = require('../database/models');
    const transactions = await PaymentTransaction.findByMolliePaymentId(paymentId);
    
    if (transactions && transactions.length > 0) {
      const transaction = transactions[0];

      // Update transaction status
      await PaymentTransaction.update(transaction.id, {
        status: paymentInfo.status
      });

      // Get subscription and customer
      const subscription = await Subscription.findById(transaction.subscription_id);
      const customer = await Customer.findById(transaction.customer_id);

      if (paymentInfo.isPaid) {
        // Payment successful
        logger.info(`Payment confirmed: ${paymentId}`);

        // Update subscription status
        await Subscription.update(subscription.id, {
          status: 'active',
          mollie_customer_id: paymentInfo.mollieCustomerId
        });

        // Send confirmation email
        await sendPaymentConfirmation(customer, transaction.amount_eur, transaction.id);

      } else if (paymentInfo.status === 'failed' || paymentInfo.status === 'expired') {
        // Payment failed
        logger.warn(`Payment failed/expired: ${paymentId}`);

        // Send failure notification
        await sendPaymentFailureNotification(customer);
      }
    }

    // Always respond 200 to Mollie
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Payment webhook error:', error);
    // Still return 200 to acknowledge webhook
    res.status(200).json({ success: true, error: error.message });
  }
});

/**
 * GET /api/payment/status/:paymentId
 * Get payment status
 */
router.get('/status/:paymentId', async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentService.getPayment(paymentId);

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
        isPaid: payment.status === 'paid'
      }
    });
  } catch (error) {
    logger.error('Payment status fetch error:', error);
    next(error);
  }
});

/**
 * POST /api/payment/retry
 * Retry failed payment
 * Body: { subscriptionId, redirectUrl }
 */
router.post('/retry', async (req, res, next) => {
  try {
    const { subscriptionId, redirectUrl } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const customer = await Customer.findById(subscription.customer_id);

    // Create new payment
    const mollieCustomer = await paymentService.createOrGetMollieCustomer(
      customer.email,
      customer.first_name,
      customer.last_name
    );

    const payment = await paymentService.createPayment(
      mollieCustomer.id,
      subscription.price_eur,
      `Youcaps Subscription Retry - €${subscription.price_eur}`,
      redirectUrl
    );

    logger.info(`Payment retry created: ${payment.id}`);

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: payment._links?.checkout?.href
      }
    });
  } catch (error) {
    logger.error('Payment retry error:', error);
    next(error);
  }
});

module.exports = router;
