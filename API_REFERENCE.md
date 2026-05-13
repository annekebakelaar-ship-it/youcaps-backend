## Youcaps Backend API Documentation

Complete reference for all endpoints.

## Base URL

**Production**: `https://youcaps-backend.onrender.com`
**Development**: `http://localhost:3000`

## Authentication

Currently no authentication required (open API). Future versions should implement JWT.

---

## Health Check Endpoints

### GET /health
Basic health check - always returns 200

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-13T10:30:00.000Z",
  "service": "Youcaps Backend",
  "version": "1.0.0",
  "environment": "production"
}
```

### GET /health/ready
Readiness check - verifies all dependencies

**Response:**
```json
{
  "success": true,
  "status": "ready",
  "dependencies": {
    "database": { "status": "connected", "configured": true },
    "email": { "status": "configured", "configured": true },
    "payment": { "status": "configured", "configured": true }
  }
}
```

### GET /health/live
Liveness check - for Kubernetes/container orchestration

---

## Subscription Endpoints

### POST /api/subscribe
Create new subscription and customer

**Request:**
```json
{
  "email": "user@example.com",
  "firstName": "Jan",
  "lastName": "Jansen",
  "phone": "+31612345678",
  "age": 35,
  "healthGoals": ["energy", "immunity", "sleep"],
  "currentSupplements": ["vitamin_d", "magnesium"],
  "medicalConditions": ["diabetes"]
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Subscription created successfully. Check your email for the assessment link.",
  "data": {
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "subscriptionId": "660e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "status": "pending"
  }
}
```

**Errors:**
- `400`: Email already registered
- `422`: Validation error (see errors array)

**Side Effects:**
- Welcome email sent
- 7-day nurture sequence scheduled
- Customer record created in database
- Subscription record created with status "pending"

---

### GET /api/subscribe/:customerId
Get subscription and customer details

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "Jan",
      "last_name": "Jansen",
      "age": 35,
      "health_goals": ["energy", "immunity"],
      "created_at": "2026-05-13T10:30:00.000Z"
    },
    "subscriptions": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "customer_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "active",
        "price_eur": 29.00,
        "mollie_subscription_id": "tr_12345678",
        "created_at": "2026-05-13T10:30:00.000Z"
      }
    ]
  }
}
```

---

### PUT /api/subscribe/:subscriptionId
Update subscription details

**Request:**
```json
{
  "status": "paused",
  "notes": "Pausing temporarily"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "paused",
    "updated_at": "2026-05-13T11:00:00.000Z"
  }
}
```

---

### DELETE /api/subscribe/:subscriptionId
Cancel subscription

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancelled_at": "2026-05-13T11:00:00.000Z"
  }
}
```

---

## Assessment Endpoints

### POST /api/assessment
Submit health assessment

**Request:**
```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "answers": [
    {
      "questionId": "energy",
      "question": "How is your energy level?",
      "value": 3,
      "scale": 1-10
    },
    {
      "questionId": "stress",
      "question": "How stressed are you?",
      "value": 8
    },
    {
      "questionId": "sleep",
      "question": "Sleep quality?",
      "value": 4
    },
    {
      "questionId": "immunity",
      "question": "How's your immunity?",
      "value": 5
    },
    {
      "questionId": "digestion",
      "question": "Any digestion issues?",
      "value": 7
    }
  ]
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Assessment processed successfully",
  "data": {
    "assessmentId": "770e8400-e29b-41d4-a716-446655440000",
    "score": 80,
    "recommendations": [
      {
        "category": "Energy",
        "suggestion": "B-Complex vitamins and Iron supplements recommended",
        "priority": "high"
      },
      {
        "category": "Stress",
        "suggestion": "Magnesium, Ashwagandha, and L-Theanine recommended",
        "priority": "high"
      },
      {
        "category": "Sleep",
        "suggestion": "Melatonin, Valerian Root, and Magnesium recommended",
        "priority": "high"
      }
    ],
    "message": "Based on your answers, we recommend the following supplements tailored to your needs."
  }
}
```

---

### GET /api/assessment/:customerId
Get assessment history for customer

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "assessmentCount": 3,
    "assessments": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "customer_id": "550e8400-e29b-41d4-a716-446655440000",
        "score": 80,
        "created_at": "2026-05-13T10:30:00.000Z"
      }
    ]
  }
}
```

---

### GET /api/assessment/:customerId/latest
Get most recent assessment

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "score": 80,
    "recommendations": [...],
    "created_at": "2026-05-13T10:30:00.000Z"
  }
}
```

---

## Payment Endpoints

### POST /api/payment/create
Create payment for subscription

**Request:**
```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "subscriptionId": "660e8400-e29b-41d4-a716-446655440000",
  "redirectUrl": "https://youcaps.app/payment-success"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "paymentId": "tr_WDqYK6vNsS",
    "transactionId": "880e8400-e29b-41d4-a716-446655440000",
    "amount": 29.00,
    "currency": "EUR",
    "checkoutUrl": "https://www.mollie.com/checkout/select-method/...",
    "status": "open"
  }
}
```

**Side Effects:**
- Payment created in Mollie
- Transaction record created in database
- Customer created in Mollie (if new)

---

### POST /api/payment/webhook
Mollie webhook endpoint (automatic)

**Mollie will POST:**
```json
{
  "id": "tr_WDqYK6vNsS"
}
```

**Response:** 200 OK
```json
{
  "success": true
}
```

**Side Effects:**
- Payment status updated in database
- Subscription status updated (if payment confirmed)
- Confirmation email sent (if payment successful)
- Retry notification sent (if payment failed)

---

### GET /api/payment/status/:paymentId
Get payment status

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "paymentId": "tr_WDqYK6vNsS",
    "status": "paid",
    "amount": {
      "value": "29.00",
      "currency": "EUR"
    },
    "createdAt": "2026-05-13T10:30:00.000Z",
    "isPaid": true
  }
}
```

**Status Values:**
- `open` - Awaiting payment
- `pending` - Processing
- `paid` - Successfully paid ✓
- `failed` - Payment rejected
- `cancelled` - User cancelled
- `expired` - Payment link expired

---

### POST /api/payment/retry
Retry failed payment

**Request:**
```json
{
  "subscriptionId": "660e8400-e29b-41d4-a716-446655440000",
  "redirectUrl": "https://youcaps.app/payment-success"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "paymentId": "tr_NewPaymentId",
    "checkoutUrl": "https://www.mollie.com/checkout/select-method/..."
  }
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Customer not found"
}
```

### 422 - Validation Error
```json
{
  "success": false,
  "errors": [
    {
      "field": "firstName",
      "message": "First name is required"
    }
  ]
}
```

### 500 - Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently: No rate limiting (implement for production)

**Recommended:**
- 100 requests per minute (global)
- 10 requests per minute per IP for payment endpoints
- 50 requests per minute per IP for subscription endpoints

---

## Pagination

Not implemented yet (all endpoints return full data).

**Future plan:**
```
GET /api/assessments?page=1&limit=20
GET /api/customers?limit=50&offset=0
```

---

## Webhooks

### Mollie Webhook
**URL:** `POST /api/payment/webhook`
**Trigger:** Payment status changes
**Payload:** `{ "id": "payment_id" }`

### Future: Nurture Email Webhook
```
POST /api/email/webhook
{ "sequenceId": "...", "status": "sent" }
```

---

## Testing with cURL

```bash
# Subscribe
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }'

# Assessment
curl -X POST http://localhost:3000/api/assessment \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "answers": [{"questionId": "energy", "value": 5}]
  }'

# Health check
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

---

## Changelog

### v1.0.0 (2026-05-13)
- Initial release
- All core endpoints implemented
- Mollie payment integration
- Email automation with 7-day sequence
- Database with comprehensive schema
- Deployment ready for Render

### Planned (v1.1.0)
- Authentication (JWT)
- Rate limiting
- API key management
- Customer dashboard API
- Subscription management (pause, resume, change plan)
- Refund handling
- Email template customization API
