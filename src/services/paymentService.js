const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const axios = require('axios');

const MOLLIE_API_URL = 'https://api.mollie.com/v2';
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY;

if (!MOLLIE_API_KEY) {
  logger.warn('Mollie API key not configured');
}

const mollieClient = axios.create({
  baseURL: MOLLIE_API_URL,
  headers: {
    'Authorization': `Bearer ${MOLLIE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Create or get Mollie customer
async function createOrGetMollieCustomer(email, firstName, lastName) {
  try {
    // List customers to check if exists
    const existingRes = await mollieClient.get('/customers', {
      params: {
        include: 'subscriptions',
        limit: 250
      }
    });

    const existing = existingRes.data._embedded?.customers?.find(c => c.email === email);
    if (existing) {
      logger.info(`Mollie customer found: ${existing.id}`);
      return existing;
    }

    // Create new customer
    const res = await mollieClient.post('/customers', {
      email,
      name: `${firstName} ${lastName}`
    });

    logger.info(`Mollie customer created: ${res.data.id}`);
    return res.data;
  } catch (error) {
    logger.error('Mollie customer operation error:', error.response?.data || error.message);
    throw error;
  }
}

// Create payment for subscription setup
async function createPayment(customerId, amount, description, redirectUrl) {
  try {
    const res = await mollieClient.post('/payments', {
      amount: {
        currency: 'EUR',
        value: amount.toFixed(2)
      },
      description,
      redirectUrl,
      customerId,
      metadata: {
        customerId,
        type: 'subscription_setup'
      }
    });

    logger.info(`Payment created: ${res.data.id}`);
    return res.data;
  } catch (error) {
    logger.error('Payment creation error:', error.response?.data || error.message);
    throw error;
  }
}

// Get payment status
async function getPayment(paymentId) {
  try {
    const res = await mollieClient.get(`/payments/${paymentId}`);
    return res.data;
  } catch (error) {
    logger.error('Payment fetch error:', error.response?.data || error.message);
    throw error;
  }
}

// Create subscription (after first payment)
async function createSubscription(mollieCustomerId, mandateId, amount, interval = '1 months') {
  try {
    const res = await mollieClient.post(`/customers/${mollieCustomerId}/subscriptions`, {
      amount: {
        currency: 'EUR',
        value: amount.toFixed(2)
      },
      interval,
      description: 'Youcaps Monthly Supplement Subscription',
      mandateId,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      metadata: {
        type: 'supplement_subscription'
      }
    });

    logger.info(`Mollie subscription created: ${res.data.id}`);
    return res.data;
  } catch (error) {
    logger.error('Subscription creation error:', error.response?.data || error.message);
    throw error;
  }
}

// Get subscription
async function getSubscription(mollieCustomerId, subscriptionId) {
  try {
    const res = await mollieClient.get(`/customers/${mollieCustomerId}/subscriptions/${subscriptionId}`);
    return res.data;
  } catch (error) {
    logger.error('Subscription fetch error:', error.response?.data || error.message);
    throw error;
  }
}

// Cancel subscription
async function cancelSubscription(mollieCustomerId, subscriptionId) {
  try {
    const res = await mollieClient.delete(`/customers/${mollieCustomerId}/subscriptions/${subscriptionId}`);
    logger.info(`Subscription cancelled: ${subscriptionId}`);
    return res.data;
  } catch (error) {
    logger.error('Subscription cancellation error:', error.response?.data || error.message);
    throw error;
  }
}

// Handle webhook payment status
async function handlePaymentWebhook(paymentId) {
  try {
    const payment = await getPayment(paymentId);
    
    // Payment statuses: open, pending, canceled, failed, expired, paid
    logger.info(`Payment webhook: ${paymentId} - ${payment.status}`);
    
    return {
      paymentId,
      status: payment.status,
      isPaid: payment.status === 'paid',
      mandate: payment._links?.mandate
    };
  } catch (error) {
    logger.error('Payment webhook handling error:', error.message);
    throw error;
  }
}

module.exports = {
  createOrGetMollieCustomer,
  createPayment,
  getPayment,
  createSubscription,
  getSubscription,
  cancelSubscription,
  handlePaymentWebhook,
  mollieClient
};
