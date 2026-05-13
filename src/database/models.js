const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Customer model
const Customer = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('customers')
      .insert([{
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        age: data.age || null,
        health_goals: data.healthGoals || [],
        current_supplements: data.currentSupplements || [],
        medical_conditions: data.medicalConditions || [],
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Customer creation error:', error);
      throw error;
    }
    return result;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Customer fetch error:', error);
      throw error;
    }
    return data || null;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Customer email fetch error:', error);
      throw error;
    }
    return data || null;
  },

  async update(id, data) {
    const { data: result, error } = await supabase
      .from('customers')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Customer update error:', error);
      throw error;
    }
    return result;
  }
};

// Subscription model
const Subscription = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('subscriptions')
      .insert([{
        customer_id: data.customerId,
        plan_type: data.planType || 'monthly',
        price_eur: data.priceEur || 29.00,
        billing_interval: data.billingInterval || 'month',
        status: 'pending',
        mollie_customer_id: data.mollieCustomerId || null,
        mollie_subscription_id: data.mollieSubscriptionId || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Subscription creation error:', error);
      throw error;
    }
    return result;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Subscription fetch error:', error);
      throw error;
    }
    return data || null;
  },

  async findByCustomerId(customerId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Subscription customer fetch error:', error);
      throw error;
    }
    return data || [];
  },

  async update(id, data) {
    const { data: result, error } = await supabase
      .from('subscriptions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Subscription update error:', error);
      throw error;
    }
    return result;
  },

  async updateByMollieId(mollieSubscriptionId, data) {
    const { data: result, error } = await supabase
      .from('subscriptions')
      .update(data)
      .eq('mollie_subscription_id', mollieSubscriptionId)
      .select()
      .single();

    if (error) {
      logger.error('Subscription Mollie update error:', error);
      throw error;
    }
    return result;
  }
};

// Assessment model
const Assessment = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('assessments')
      .insert([{
        customer_id: data.customerId,
        answers: data.answers,
        score: data.score || null,
        recommendations: data.recommendations || [],
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Assessment creation error:', error);
      throw error;
    }
    return result;
  },

  async findByCustomerId(customerId) {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Assessment fetch error:', error);
      throw error;
    }
    return data || [];
  }
};

// Email log model
const EmailLog = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('email_logs')
      .insert([{
        customer_id: data.customerId,
        email_type: data.emailType,
        recipient: data.recipient,
        subject: data.subject,
        sent_at: new Date().toISOString(),
        status: data.status || 'sent',
        error_message: data.errorMessage || null
      }])
      .select()
      .single();

    if (error) {
      logger.error('Email log creation error:', error);
      throw error;
    }
    return result;
  }
};

// Payment transaction model
const PaymentTransaction = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('payment_transactions')
      .insert([{
        subscription_id: data.subscriptionId,
        customer_id: data.customerId,
        mollie_payment_id: data.molliePaymentId,
        amount_eur: data.amountEur,
        status: data.status || 'open',
        description: data.description || null
      }])
      .select()
      .single();

    if (error) {
      logger.error('Payment transaction creation error:', error);
      throw error;
    }
    return result;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Payment transaction fetch error:', error);
      throw error;
    }
    return data || null;
  },

  async findByMolliePaymentId(molliePaymentId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('mollie_payment_id', molliePaymentId);

    if (error) {
      logger.error('Payment transaction Mollie fetch error:', error);
      throw error;
    }
    return data || [];
  },

  async update(id, data) {
    const { data: result, error } = await supabase
      .from('payment_transactions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Payment transaction update error:', error);
      throw error;
    }
    return result;
  }
};

// Nurture sequence model
const NurtureSequence = {
  async create(data) {
    const { data: result, error } = await supabase
      .from('nurture_sequences')
      .insert([{
        customer_id: data.customerId,
        email_day: data.emailDay,
        scheduled_date: data.scheduledDate,
        status: data.status || 'pending'
      }])
      .select()
      .single();

    if (error) {
      logger.error('Nurture sequence creation error:', error);
      throw error;
    }
    return result;
  },

  async findPending() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('nurture_sequences')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_date', today);

    if (error) {
      logger.error('Nurture sequence fetch error:', error);
      throw error;
    }
    return data || [];
  },

  async update(id, data) {
    const { data: result, error } = await supabase
      .from('nurture_sequences')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Nurture sequence update error:', error);
      throw error;
    }
    return result;
  }
};

module.exports = {
  Customer,
  Subscription,
  Assessment,
  EmailLog,
  PaymentTransaction,
  NurtureSequence,
  supabase
};
