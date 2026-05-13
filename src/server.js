const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Simple checkout endpoint (Mollie redirect only)
app.post('/api/payment/checkout', (req, res) => {
  try {
    const { email, firstName, lastName, amount, description } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount required' });
    }

    // Return Mollie test checkout URL
    res.json({
      success: true,
      data: {
        paymentId: `test_${Date.now()}`,
        amount: amount / 100,
        currency: 'EUR',
        checkoutUrl: 'https://www.mollie.com/en/checkout/test-mode',
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
