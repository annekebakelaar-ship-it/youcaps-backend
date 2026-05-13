# Youcaps Backend - Deployment Guide

## Render Deployment Instructions

### Step 1: Prepare GitHub Repository

```bash
cd /home/danib/youcaps-backend

# Initialize git repo if not done
git init
git add .
git commit -m "Initial Youcaps backend commit"

# Add to existing GitHub repo (replace with your actual repo)
git remote add origin https://github.com/yourusername/youcaps-backend.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **+ New** → **Web Service**
3. Connect GitHub account if not done
4. Select **youcaps-backend** repository
5. Configure:
   - **Name**: `youcaps-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)

### Step 3: Set Environment Variables

In Render dashboard, add the following environment variables:

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

FRONTEND_URL=https://youcaps.app
CORS_ORIGIN=https://youcaps.app,https://www.youcaps.app

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

SMTP_HOST=smtp.strato.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@youcaps.app
SMTP_PASS=Sissimailyoucaps2013!
SMTP_FROM=info@youcaps.app
SUPPORT_EMAIL=support@youcaps.app

MOLLIE_API_KEY=live_AW8tpmvUBF82aJv2j283MCyYc3QRWp
MOLLIE_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Database Setup (Supabase)

1. Go to [Supabase Dashboard](https://supabase.com)
2. Create new project (if needed):
   - **Project Name**: youcaps
   - **Region**: eu-west-1 (Ireland - closest to EU)
   - **Database Password**: Generate strong password
3. Go to **SQL Editor**
4. Create new query
5. Copy entire content from `src/database/schema.sql`
6. Execute the query
7. Copy credentials to `.env`:
   - **SUPABASE_URL**: From Settings → API → Project URL
   - **SUPABASE_KEY**: From Settings → API → anon public key

### Step 5: Mollie Webhook Setup

1. Go to [Mollie Dashboard](https://www.mollie.com)
2. Click **Settings** → **Webhooks**
3. Add webhook:
   - **URL**: `https://youcaps-backend.onrender.com/api/payment/webhook`
   - **Events**: All payment events
   - **Test Mode**: Off (use Live)
4. Click **Create**
5. Copy webhook secret to `MOLLIE_WEBHOOK_SECRET` in Render

### Step 6: Deploy

1. In Render dashboard, click **Deploy**
2. Wait for build to complete (5-10 minutes)
3. Once live, test:
   ```bash
   curl https://youcaps-backend.onrender.com/health
   ```

Expected response:
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

### Step 7: Verify All Systems

```bash
# Health check
curl https://youcaps-backend.onrender.com/health

# Readiness check (all dependencies)
curl https://youcaps-backend.onrender.com/health/ready

# Should return:
# {
#   "success": true,
#   "status": "ready",
#   "dependencies": {
#     "database": { "status": "connected", "configured": true },
#     "email": { "status": "configured", "configured": true },
#     "payment": { "status": "configured", "configured": true }
#   }
# }
```

## Testing the Complete Flow

### 1. Test Subscription Creation

```bash
curl -X POST https://youcaps-backend.onrender.com/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+31612345678",
    "age": 30,
    "healthGoals": ["energy", "immunity"],
    "currentSupplements": [],
    "medicalConditions": []
  }'
```

Expected: 201 Created with customerId and subscriptionId

### 2. Test Assessment Submission

```bash
CUSTOMER_ID="uuid-from-previous-response"

curl -X POST https://youcaps-backend.onrender.com/api/assessment \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "answers": [
      {"questionId": "energy", "value": 3},
      {"questionId": "stress", "value": 8},
      {"questionId": "sleep", "value": 4}
    ]
  }'
```

Expected: 201 Created with score and recommendations

### 3. Test Payment Creation

```bash
SUBSCRIPTION_ID="uuid-from-subscribe-response"

curl -X POST https://youcaps-backend.onrender.com/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "subscriptionId": "'$SUBSCRIPTION_ID'",
    "redirectUrl": "https://youcaps.app/payment-success"
  }'
```

Expected: 201 Created with checkoutUrl (Mollie payment link)

## Monitoring & Logging

### View Logs in Render

1. Go to Render dashboard
2. Select **youcaps-backend** service
3. Click **Logs** tab
4. View real-time application logs

### Check Application Health

```bash
# Every minute during operation
watch -n 60 'curl -s https://youcaps-backend.onrender.com/health/ready | jq'
```

## Troubleshooting

### Issue: "SUPABASE_URL not configured"
- Check environment variables in Render dashboard
- Verify URL format: `https://xxxxx.supabase.co`
- Restart service after updating

### Issue: "SMTP connection error"
- Verify Strato SMTP credentials in .env
- Check firewall: Strato uses port 465 (secure)
- Test locally first: `npm run dev`

### Issue: "Mollie payment not creating"
- Check MOLLIE_API_KEY is set correctly
- Ensure it's LIVE key (starts with `live_`)
- Verify test mode is OFF in Mollie dashboard

### Issue: "Email not sending"
- Check logs: `curl https://youcaps-backend.onrender.com/logs/combined.log`
- Verify SMTP_FROM email is correct
- Check spam folder for test emails

## Scaling for Production

### Performance Optimization

1. **Database Connection Pooling**
   - Supabase includes built-in connection pooling
   - No additional config needed

2. **Caching**
   - Add Redis for session/cache layer
   - Currently: In-memory (sufficient for MVP)

3. **Rate Limiting**
   - Add `express-rate-limit` to prevent abuse
   - Configure per endpoint

### High Availability Setup

1. **Multiple Render Instances**
   - Deploy second instance for redundancy
   - Use Render's load balancer

2. **Database Backups**
   - Supabase: Automated daily backups
   - Manual backups: Dashboard → Backups → Request backup

3. **Monitoring Alerts**
   - Set up Render alerts for errors
   - Monitor SMTP/Mollie API status

## Security Checklist

- [ ] Environment variables set in Render (not in code)
- [ ] Mollie webhook secret configured
- [ ] CORS origin set to production domain only
- [ ] SMTP password stored as environment variable
- [ ] Database connection uses SSL
- [ ] Helmet.js headers enabled
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled
- [ ] Logs contain no sensitive data

## Maintenance

### Weekly
- Check application logs for errors
- Monitor email delivery success rate
- Verify payment transactions

### Monthly
- Review Render usage and costs
- Update dependencies: `npm update`
- Backup database manually

### Quarterly
- Review security updates
- Optimize slow queries
- Plan scaling if needed

## Support

**Current Deployment:**
- Service: `youcaps-backend` on Render
- URL: `https://youcaps-backend.onrender.com`
- Status: Live (as of May 13, 2026)

**Emergency Contacts:**
- Render Support: [dashboard.render.com/support](https://dashboard.render.com/support)
- Mollie Support: [mollie.com/support](https://mollie.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
