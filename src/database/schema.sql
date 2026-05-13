-- Youcaps Backend Schema for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  age INTEGER,
  health_goals JSONB DEFAULT '[]'::jsonb,
  current_supplements JSONB DEFAULT '[]'::jsonb,
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) DEFAULT 'monthly',
  price_eur DECIMAL(10, 2) DEFAULT 29.00,
  billing_interval VARCHAR(20) DEFAULT 'month',
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, paused, cancelled, expired
  mollie_customer_id VARCHAR(255),
  mollie_subscription_id VARCHAR(255) UNIQUE,
  mollie_mandate_id VARCHAR(255),
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_mollie_subscription_id ON subscriptions(mollie_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assessments_customer_id ON assessments(customer_id);
CREATE INDEX idx_assessments_created_at ON assessments(created_at);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- welcome, confirmation, day3, day5, day7, etc.
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent', -- sent, failed, bounced
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_customer_id ON email_logs(customer_id);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mollie_payment_id VARCHAR(255) UNIQUE,
  amount_eur DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, pending, canceled, failed, expired, paid
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customer_id);
CREATE INDEX idx_payment_transactions_mollie_payment_id ON payment_transactions(mollie_payment_id);

-- Nurture sequences table
CREATE TABLE IF NOT EXISTS nurture_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email_day INTEGER NOT NULL, -- 0 (welcome), 1, 3, 5, 7, etc.
  scheduled_date DATE NOT NULL,
  sent_date TIMESTAMP,
  email_log_id UUID REFERENCES email_logs(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, skipped
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nurture_sequences_customer_id ON nurture_sequences(customer_id);
CREATE INDEX idx_nurture_sequences_scheduled_date ON nurture_sequences(scheduled_date);
CREATE INDEX idx_nurture_sequences_status ON nurture_sequences(status);

-- Refresh updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (if needed - disable for API use)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_sequences DISABLE ROW LEVEL SECURITY;
