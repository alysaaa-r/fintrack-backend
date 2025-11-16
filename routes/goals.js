const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SharedGoal = require('../models/SharedGoal');
const currencyService = require('../services/currencyService');

// @route   POST /api/goals
// @desc    Create a new shared goal
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, category, targetAmount, currency } = req.body;

    const goalCurrency = currency || 'PHP';
    
    // Convert target amount to PHP for database storage
    const targetAmountPHP = await currencyService.convertToBase(targetAmount, goalCurrency);

    const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    const goal = await SharedGoal.create({
      name,
      category,
      targetAmount,
      targetAmountPHP,
      currency: goalCurrency,
      creator: req.user._id,
      members: [{
        user: req.user._id,
        color: memberColors[0]
      }]
    });

    await goal.populate('members.user', 'name phone');

    res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating goal'
    });
  }
});

// @route   GET /api/goals
// @desc    Get all goals for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const goals = await SharedGoal.find({
      'members.user': req.user._id
    }).populate('members.user', 'name phone').populate('contributions.user', 'name');

    res.json({
      success: true,
      goals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching goals'
    });
  }
});

// @route   GET /api/goals/:id
// @desc    Get single goal
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await SharedGoal.findById(req.params.id)
      .populate('members.user', 'name phone')
      .populate('contributions.user', 'name');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check if user is a member
    const isMember = goal.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this goal'
      });
    }

    res.json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching goal'
    });
  }
});

// @route   POST /api/goals/:id/contributions
// @desc    Add contribution to goal (with real-time currency conversion)
// @access  Private
router.post('/:id/contributions', protect, async (req, res) => {
  try {
    const { amount, type, description, currency } = req.body;
    
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Amount and currency are required'
      });
    }

    const goal = await SharedGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check if user is a member
    const isMember = goal.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to contribute to this goal'
      });
    }

    // Convert contribution amount to PHP for storage
    const amountPHP = await currencyService.convertToBase(amount, currency);
    const exchangeRate = await currencyService.getRate(currency, 'PHP');

    goal.contributions.push({
      user: req.user._id,
      amount,
      amountPHP,
      currency,
      exchangeRate,
      type: type || 'add',
      description,
      date: new Date()
    });

    await goal.save();
    await goal.populate('contributions.user', 'name');

    res.json({
      success: true,
      goal,
      conversionInfo: {
        originalAmount: amount,
        originalCurrency: currency,
        convertedAmount: amountPHP,
        baseCurrency: 'PHP',
        exchangeRate
      }
    });
  } catch (error) {
    console.error('Add contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding contribution'
    });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await SharedGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Only creator can delete
    if (goal.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this goal'
      });
    }

    await goal.deleteOne();

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting goal'
    });
  }
});

module.exports = router;
