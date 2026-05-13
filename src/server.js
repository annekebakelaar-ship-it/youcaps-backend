const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

app.use(cors());
app.use(express.json());

const MOLLIE_API_KEY = 'live_tWjtCRcpt796wQ3PAS7FPEynmuqWcK';
const FRONTEND_URL = 'https://youcaps-frontend.onrender.com';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Create Mollie payment
async function createMolliePayment(amount, description, redirectUrl) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      amount: {
        value: (amount / 100).toFixed(2),
        currency: 'EUR'
      },
      description: description,
      redirectUrl: redirectUrl,
      locale: 'en_US'
    });

    const options = {
      hostname: 'api.mollie.com',
      path: '/v2/payments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLLIE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 201) {
            resolve(response);
          } else {
            reject(new Error(response.detail || 'Mollie API error'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Mollie response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Checkout endpoint
app.post('/api/payment/checkout', async (req, res) => {
  try {
    const { email, firstName, lastName, amount, description } = req.body;

    console.log(`[Checkout] Email: ${email}, Amount: ${amount}`);

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount required' });
    }

    const mollieDescription = description || `Youcaps - ${firstName} ${lastName}`;
    const redirectUrl = `${FRONTEND_URL}/success.html?email=${encodeURIComponent(email)}`;

    // Create Mollie payment
    const payment = await createMolliePayment(amount, mollieDescription, redirectUrl);

    console.log(`[Checkout] Payment created: ${payment.id}`);
    console.log(`[Checkout] Payment object:`, JSON.stringify(payment, null, 2));
    console.log(`[Checkout] Links:`, payment._links);
    console.log(`[Checkout] Checkout link:`, payment._links?.checkout?.href);

    const checkoutUrl = payment._links?.checkout?.href;
    if (!checkoutUrl) {
      console.error('[Checkout] No checkout URL in Mollie response!');
      throw new Error('Mollie payment created but no checkout URL returned');
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: amount / 100,
        currency: 'EUR',
        checkoutUrl: checkoutUrl,
        status: payment.status
      }
    });
  } catch (err) {
    console.error('[Checkout] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
