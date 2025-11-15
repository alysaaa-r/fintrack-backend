const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SharedBudget = require('../models/SharedBudget');

// @route   POST /api/budgets
// @desc    Create a new shared budget
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, category, totalBudget, currency } = req.body;

    const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    const budget = await SharedBudget.create({
      name,
      category,
      totalBudget,
      currency: currency || 'PHP',
      creator: req.user._id,
      members: [{
        user: req.user._id,
        color: memberColors[0]
      }]
    });

    await budget.populate('members.user', 'name phone');

    res.status(201).json({
      success: true,
      budget
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating budget'
    });
  }
});

// @route   GET /api/budgets
// @desc    Get all budgets for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const budgets = await SharedBudget.find({
      'members.user': req.user._id
    }).populate('members.user', 'name phone').populate('expenses.user', 'name');

    res.json({
      success: true,
      budgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching budgets'
    });
  }
});

// @route   GET /api/budgets/:id
// @desc    Get single budget
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const budget = await SharedBudget.findById(req.params.id)
      .populate('members.user', 'name phone')
      .populate('expenses.user', 'name');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if user is a member
    const isMember = budget.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this budget'
      });
    }

    res.json({
      success: true,
      budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching budget'
    });
  }
});

// @route   POST /api/budgets/:id/expenses
// @desc    Add expense to budget
// @access  Private
router.post('/:id/expenses', protect, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    const budget = await SharedBudget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if user is a member
    const isMember = budget.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add expenses to this budget'
      });
    }

    budget.expenses.push({
      user: req.user._id,
      amount,
      description,
      date: new Date()
    });

    await budget.save();
    await budget.populate('expenses.user', 'name');

    res.json({
      success: true,
      budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error adding expense'
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const budget = await SharedBudget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Only creator can delete
    if (budget.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this budget'
      });
    }

    await budget.deleteOne();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting budget'
    });
  }
});

module.exports = router;
