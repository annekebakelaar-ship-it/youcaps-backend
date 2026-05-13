# Youcaps Backend

Production-ready Node.js Express backend for Youcaps AI supplement subscriptions with full email automation, payment integration, and database management.

## Features

- ✅ **Express.js REST API** - Fully documented endpoints
- ✅ **Email Automation** - Strato SMTP integration with 7-day nurture sequence
- ✅ **Payment Integration** - Mollie recurring payments (€29/month)
- ✅ **Database** - Supabase PostgreSQL with comprehensive schema
- ✅ **Health Assessment** - AI-powered supplement recommendations
- ✅ **Error Handling** - Global error handling with logging (Winston)
- ✅ **Security** - Helmet, CORS, input validation (express-validator)
- ✅ **Logging** - Winston logger with file rotation
- ✅ **Production Ready** - Deploy to Render with zero config

## Project Structure

```
youcaps-backend/
├── src/
│   ├── server.js                 # Express server entry point
│   ├── app.js                    # Express app configuration
│   ├── database/
│   │   ├── models.js             # Database models (Customer, Subscription, etc.)
│   │   └── schema.sql            # PostgreSQL schema
│   ├── routes/
│   │   ├── health.js             # Health check endpoints
│   │   ├── subscribe.js          # /api/subscribe endpoint
│   │   ├── assessment.js         # /api/assessment endpoint
│   │   └── payment.js            # /api/payment endpoint
│   ├── services/
│   │   ├── emailService.js       # Strato SMTP + templates
│   │   ├── paymentService.js     # Mollie API integration
│   │   └── automationService.js  # Email sequences, scoring
│   ├── middleware/
│   │   ├── errorHandler.js       # Global error handler
│   │   └── validation.js         # Request validation
│   └── utils/
│       └── logger.js             # Winston logger setup
├── logs/                         # Application logs
├── .env                          # Environment variables (production)
├── .env.example                  # Example configuration
├── package.json                  # Dependencies & scripts
└── README.md                     # This file
```

## Installation

```bash
# Clone repository
cd /home/danib/youcaps-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your actual credentials

# Run migrations (setup database schema)
npm run migrate
```

## Environment Variables

See `.env.example` for complete configuration. Key variables:

- **Node.js**: `NODE_ENV`, `PORT`, `LOG_LEVEL`
- **Database**: `SUPABASE_URL`, `SUPABASE_KEY`
- **Email**: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Payment**: `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_SECRET`
- **Frontend**: `FRONTEND_URL`, `CORS_ORIGIN`

## API Endpoints

### Health Check
```bash
GET /health          # Basic health check
GET /health/ready    # Readiness check (dependencies)
GET /health/live     # Liveness check
```

### Subscriptions
```bash
POST /api/subscribe              # Create new subscription
GET /api/subscribe/:customerId   # Get subscription details
PUT /api/subscribe/:subscriptionId    # Update subscription
DELETE /api/subscribe/:subscriptionId # Cancel subscription
```

**Example Request:**
```json
{
  "email": "user@example.com",
  "firstName": "Jan",
  "lastName": "Jansen",
  "phone": "+31612345678",
  "age": 35,
  "healthGoals": ["energy", "immunity"],
  "currentSupplements": ["vitamin_d"],
  "medicalConditions": []
}
```

### Assessment
```bash
POST /api/assessment              # Submit health assessment
GET /api/assessment/:customerId   # Get assessment history
GET /api/assessment/:customerId/latest  # Get latest assessment
```

**Example Request:**
```json
{
  "customerId": "uuid-here",
  "answers": [
    {"questionId": "energy", "value": 3},
    {"questionId": "stress", "value": 8},
    {"questionId": "sleep", "value": 4}
  ]
}
```

### Payments
```bash
POST /api/payment/create       # Create payment for subscription
POST /api/payment/webhook      # Mollie webhook (automatic)
GET /api/payment/status/:paymentId  # Get payment status
POST /api/payment/retry        # Retry failed payment
```

**Example Request:**
```json
{
  "customerId": "uuid-here",
  "subscriptionId": "uuid-here",
  "redirectUrl": "https://youcaps.app/payment-success"
}
```

## Database Schema

### Tables
- **customers** - User accounts
- **subscriptions** - Active subscriptions
- **assessments** - Health assessments & recommendations
- **email_logs** - Email sending logs
- **payment_transactions** - Payment history
- **nurture_sequences** - Email campaign scheduling

### Setup Database

1. Go to [Supabase Dashboard](https://supabase.com)
2. Create new project
3. Open SQL Editor
4. Paste contents of `src/database/schema.sql`
5. Execute
6. Copy Project URL and API Key to `.env`

## Email Templates

7-day nurture sequence automatically scheduled:

- **Day 0**: Welcome email + assessment link
- **Day 3**: Progress check-in
- **Day 5**: Optimization tips
- **Day 7**: Week 1 celebration + consultation booking

All templates in `src/services/emailService.js`

## Payment Integration

Mollie subscription flow:

1. User submits subscription
2. Payment endpoint creates Mollie payment
3. User completes payment
4. Mollie webhook updates status
5. Subscription activated on payment success
6. Confirmation email sent

**Webhook Configuration (Mollie Dashboard):**
- URL: `https://youcaps-backend.onrender.com/api/payment/webhook`
- Events: `payment.paid`, `payment.failed`, `payment.expired`

## Local Development

```bash
# Install dev dependencies
npm install

# Run with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# View logs
tail -f logs/combined.log
```

## Deployment to Render

1. Push to GitHub repository
2. Create new Web Service on Render
3. Connect GitHub repository (youcaps-backend)
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env`
7. Deploy

**Post-Deployment:**
- Set webhook URL in Mollie: `https://youcaps-backend.onrender.com/api/payment/webhook`
- Test endpoints: `https://youcaps-backend.onrender.com/health`

## Error Handling

All errors logged to `logs/error.log` and `logs/combined.log` with:
- Timestamp
- Error message and stack trace
- Request details (method, path, body, IP)
- Service context

## Security Features

- **Helmet.js** - HTTP headers security
- **CORS** - Configurable cross-origin
- **Input Validation** - express-validator
- **Rate Limiting** - Ready to add
- **HTTPS Only** - Production environment

## Testing

```bash
npm test                    # Run all tests
npm test -- --coverage     # With coverage report
```

## Support

For issues or questions:
- Email: support@youcaps.app
- GitHub: https://github.com/yourusername/youcaps-backend

## License

MIT - Youcaps 2026
