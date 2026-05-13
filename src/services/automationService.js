const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { Customer, Subscription, Assessment, EmailLog, NurtureSequence } = require('../database/models');
const { sendEmail, emailTemplates } = require('./emailService');

// Process health assessment and generate recommendations
function scoreAssessment(answers) {
  // Simple scoring logic - customize based on your assessment questions
  let score = 0;
  let recommendations = [];

  // Example: Check energy levels
  const energyLevel = answers.find(a => a.questionId === 'energy')?.value || 0;
  if (energyLevel < 5) {
    recommendations.push({
      category: 'Energy',
      suggestion: 'B-Complex vitamins and Iron supplements recommended',
      priority: 'high'
    });
    score += 20;
  }

  // Example: Check stress levels
  const stressLevel = answers.find(a => a.questionId === 'stress')?.value || 0;
  if (stressLevel > 7) {
    recommendations.push({
      category: 'Stress',
      suggestion: 'Magnesium, Ashwagandha, and L-Theanine recommended',
      priority: 'high'
    });
    score += 25;
  }

  // Example: Check sleep quality
  const sleepQuality = answers.find(a => a.questionId === 'sleep')?.value || 0;
  if (sleepQuality < 5) {
    recommendations.push({
      category: 'Sleep',
      suggestion: 'Melatonin, Valerian Root, and Magnesium recommended',
      priority: 'high'
    });
    score += 20;
  }

  // Example: Check immunity
  const immunityLow = answers.find(a => a.questionId === 'immunity')?.value || 0;
  if (immunityLow < 5) {
    recommendations.push({
      category: 'Immunity',
      suggestion: 'Vitamin C, Vitamin D, and Zinc recommended',
      priority: 'medium'
    });
    score += 15;
  }

  // Example: Check digestion
  const digestionIssues = answers.find(a => a.questionId === 'digestion')?.value || 0;
  if (digestionIssues > 6) {
    recommendations.push({
      category: 'Digestion',
      suggestion: 'Probiotics and Digestive Enzymes recommended',
      priority: 'medium'
    });
    score += 10;
  }

  return {
    score: Math.min(score, 100),
    recommendations
  };
}

// Schedule 7-day nurture email sequence
async function scheduleNurtureSequence(customerId, startDate = new Date()) {
  try {
    const emailSchedule = [
      { day: 0, emailType: 'welcome', daysOffset: 0 },
      { day: 3, emailType: 'day3', daysOffset: 3 },
      { day: 5, emailType: 'day5', daysOffset: 5 },
      { day: 7, emailType: 'day7', daysOffset: 7 }
    ];

    const { NurtureSequence } = require('../database/models');

    for (const schedule of emailSchedule) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + schedule.daysOffset);

      await NurtureSequence.create({
        customerId,
        emailDay: schedule.day,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        emailType: schedule.emailType,
        status: 'pending'
      });

      logger.info(`Nurture sequence scheduled: Day ${schedule.day} for customer ${customerId}`);
    }

    return {
      success: true,
      sequencesScheduled: emailSchedule.length
    };
  } catch (error) {
    logger.error('Nurture sequence scheduling error:', error);
    throw error;
  }
}

// Send immediate welcome email and schedule sequence
async function onboardNewCustomer(customer, assessmentUrl) {
  try {
    // Send immediate welcome email
    const welcomeEmail = emailTemplates.welcome(customer.first_name, assessmentUrl);
    const emailResult = await sendEmail(customer.email, () => welcomeEmail, {});

    // Log the email
    if (emailResult.success) {
      await EmailLog.create({
        customerId: customer.id,
        emailType: 'welcome',
        recipient: customer.email,
        subject: welcomeEmail.subject,
        status: 'sent'
      });
    } else {
      await EmailLog.create({
        customerId: customer.id,
        emailType: 'welcome',
        recipient: customer.email,
        subject: welcomeEmail.subject,
        status: 'failed',
        errorMessage: emailResult.error
      });
    }

    // Schedule nurture sequence
    await scheduleNurtureSequence(customer.id);

    return { success: true, emailSent: emailResult.success };
  } catch (error) {
    logger.error('Customer onboarding error:', error);
    throw error;
  }
}

// Send confirmation email on successful payment
async function sendSubscriptionConfirmation(customer, subscription) {
  try {
    const productLink = `https://youcaps.app/my-stack/${subscription.id}`;
    const confirmationEmail = emailTemplates.confirmationEmail(customer.first_name, productLink);
    
    const emailResult = await sendEmail(customer.email, () => confirmationEmail, {});

    if (emailResult.success) {
      await EmailLog.create({
        customerId: customer.id,
        emailType: 'confirmation',
        recipient: customer.email,
        subject: confirmationEmail.subject,
        status: 'sent'
      });
    }

    return emailResult;
  } catch (error) {
    logger.error('Confirmation email send error:', error);
    throw error;
  }
}

// Send payment confirmation
async function sendPaymentConfirmation(customer, amount, orderId) {
  try {
    const paymentEmail = emailTemplates.paymentConfirmation(customer.first_name, amount, orderId);
    const emailResult = await sendEmail(customer.email, () => paymentEmail, {});

    if (emailResult.success) {
      await EmailLog.create({
        customerId: customer.id,
        emailType: 'payment_confirmation',
        recipient: customer.email,
        subject: paymentEmail.subject,
        status: 'sent'
      });
    }

    return emailResult;
  } catch (error) {
    logger.error('Payment confirmation email error:', error);
    throw error;
  }
}

// Send payment failure notification
async function sendPaymentFailureNotification(customer) {
  try {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@youcaps.app';
    const failureEmail = emailTemplates.paymentFailed(customer.first_name, supportEmail);
    const emailResult = await sendEmail(customer.email, () => failureEmail, {});

    if (emailResult.success) {
      await EmailLog.create({
        customerId: customer.id,
        emailType: 'payment_failed',
        recipient: customer.email,
        subject: failureEmail.subject,
        status: 'sent'
      });
    }

    return emailResult;
  } catch (error) {
    logger.error('Payment failure notification error:', error);
    throw error;
  }
}

module.exports = {
  scoreAssessment,
  scheduleNurtureSequence,
  onboardNewCustomer,
  sendSubscriptionConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailureNotification
};
