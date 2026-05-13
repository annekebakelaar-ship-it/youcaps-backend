const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      logger.warn('SMTP connection error:', error.message);
    } else {
      logger.info('✓ SMTP connection verified successfully');
    }
  });
} catch (error) {
  logger.error('SMTP transporter initialization error:', error);
}

// Email templates
const emailTemplates = {
  welcome: (firstName, assessmentUrl) => ({
    subject: 'Welcome to Youcaps - Let\'s Find Your Perfect Supplement Stack',
    html: `
      <h2>Hello ${firstName},</h2>
      <p>Welcome to Youcaps! We're excited to have you join our community of health-conscious individuals.</p>
      <p>Your personalized AI supplement assessment is ready. It takes just 5 minutes to discover which supplements are perfect for YOU.</p>
      <p><a href="${assessmentUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Your Assessment</a></p>
      <p>Questions? Reply to this email anytime.</p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  confirmationEmail: (firstName, productLink) => ({
    subject: 'Your Youcaps Supplement Stack is Ready! 🎯',
    html: `
      <h2>Hi ${firstName},</h2>
      <p>Great news! Your personalized supplement stack is ready based on your assessment.</p>
      <p><a href="${productLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your Stack</a></p>
      <p>Your subscription is starting with €29/month. You'll receive your first shipment within 3-5 business days.</p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  day3: (firstName) => ({
    subject: 'How are you feeling? - Youcaps Day 3 Check-in',
    html: `
      <h2>Day 3 Check-in, ${firstName}!</h2>
      <p>We hope you've had a chance to start your supplement routine!</p>
      <p>Most customers report feeling more energized after just a few days. Share your experience with us.</p>
      <p><a href="https://youcaps.app/feedback" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Share Your Experience</a></p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  day5: (firstName) => ({
    subject: 'Boost Your Results - Youcaps Day 5 Tips',
    html: `
      <h2>Optimize Your Stack, ${firstName}!</h2>
      <p>You're halfway through your first week. Here are some pro tips to maximize your results:</p>
      <ul>
        <li>Take supplements with breakfast for better absorption</li>
        <li>Stay hydrated - it helps your body process nutrients</li>
        <li>Keep a simple health journal to track changes</li>
      </ul>
      <p><a href="https://youcaps.app/tips" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View More Tips</a></p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  day7: (firstName) => ({
    subject: 'You Did It! - Week 1 Complete 🎉',
    html: `
      <h2>Congratulations, ${firstName}!</h2>
      <p>You've completed your first week on Youcaps. That's a big step towards better health!</p>
      <p>Give us your feedback - it helps us improve and helps other customers too.</p>
      <p><a href="https://youcaps.app/review" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Leave a Review</a></p>
      <p>Ready to discuss your results? Schedule a free consultation with our health experts.</p>
      <p><a href="https://youcaps.app/consultation" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Book Consultation</a></p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  paymentConfirmation: (firstName, amount, orderId) => ({
    subject: `Payment Confirmed - Order #${orderId}`,
    html: `
      <h2>Payment Received!</h2>
      <p>Thank you, ${firstName}!</p>
      <p>We've received your payment of €${amount.toFixed(2)} for your Youcaps subscription.</p>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Your supplements will be shipped within 3-5 business days.</p>
      <p>Track your order: <a href="https://youcaps.app/orders/${orderId}">View Order</a></p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  }),

  paymentFailed: (firstName, supportEmail) => ({
    subject: 'Payment Issue - We Need Your Help',
    html: `
      <h2>Payment Could Not Be Processed</h2>
      <p>Hi ${firstName},</p>
      <p>We tried to process your subscription payment but encountered an issue.</p>
      <p>This is usually due to:</p>
      <ul>
        <li>Incorrect card details</li>
        <li>Insufficient funds</li>
        <li>Bank security blocks</li>
      </ul>
      <p><a href="https://youcaps.app/update-payment" style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Update Payment Method</a></p>
      <p>Questions? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      <p>Best regards,<br>The Youcaps Team 🧬</p>
    `
  })
};

// Send email function
async function sendEmail(to, template, data = {}) {
  try {
    if (!transporter) {
      throw new Error('Email transporter not initialized');
    }

    const emailContent = typeof template === 'function' ? template(...Object.values(data)) : template;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'info@youcaps.app',
      to,
      ...emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${emailContent.subject} to ${to}`, {
      messageId: info.messageId,
      response: info.response
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send error:', {
      to,
      subject: typeof template === 'function' ? 'dynamic' : template.subject,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  emailTemplates,
  transporter
};
