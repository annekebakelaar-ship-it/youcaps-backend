const express = require('express');
const logger = require('../utils/logger');
const { validateAssessment } = require('../middleware/validation');
const { Assessment, Customer } = require('../database/models');
const { scoreAssessment } = require('../services/automationService');

const router = express.Router();

/**
 * POST /api/assessment
 * Process health assessment and generate recommendations
 * Body: { customerId, answers[] }
 */
router.post('/', validateAssessment, async (req, res, next) => {
  try {
    const { customerId, answers } = req.body;

    logger.info(`Assessment submitted for customer: ${customerId}`);

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Score assessment
    const { score, recommendations } = scoreAssessment(answers);

    // Save assessment
    const assessment = await Assessment.create({
      customerId,
      answers,
      score,
      recommendations
    });

    logger.info(`Assessment processed: ${assessment.id}, Score: ${score}`);

    res.status(201).json({
      success: true,
      message: 'Assessment processed successfully',
      data: {
        assessmentId: assessment.id,
        score,
        recommendations,
        message: `Based on your answers, we recommend the following supplements tailored to your needs.`
      }
    });
  } catch (error) {
    logger.error('Assessment processing error:', error);
    next(error);
  }
});

/**
 * GET /api/assessment/:customerId
 * Get customer's assessment history
 */
router.get('/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const assessments = await Assessment.findByCustomerId(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        assessmentCount: assessments.length,
        assessments
      }
    });
  } catch (error) {
    logger.error('Assessment fetch error:', error);
    next(error);
  }
});

/**
 * GET /api/assessment/:customerId/latest
 * Get latest assessment
 */
router.get('/:customerId/latest', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const assessments = await Assessment.findByCustomerId(customerId);
    const latest = assessments.length > 0 ? assessments[0] : null;

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No assessment found'
      });
    }

    res.json({
      success: true,
      data: latest
    });
  } catch (error) {
    logger.error('Latest assessment fetch error:', error);
    next(error);
  }
});

module.exports = router;
