const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SharedBudget = require('../models/SharedBudget');
const currencyService = require('../services/currencyService');

// @route   POST /api/budgets
// @desc    Create a new shared budget
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, category, totalBudget, currency } = req.body;

    const budgetCurrency = currency || 'PHP';
    
    // Convert budget to PHP for database storage
    const totalBudgetPHP = await currencyService.convertToBase(totalBudget, budgetCurrency);

    const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    const budget = await SharedBudget.createSharedBudget({
      name,
      category,
      totalBudget,
      totalBudgetPHP,
      currency: budgetCurrency,
      creator: req.user.id,
      members: [{
        user: req.user.id,
        color: memberColors[0],
        joinedAt: new Date()
      }],
      expenses: []
    });

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
    // Firestore: Query budgets where user is a member
    // This requires a custom query or filtering after fetch
    const allBudgetsSnapshot = await SharedBudget.getAllBudgets();
    const budgets = allBudgetsSnapshot.filter(budget =>
      budget.members && budget.members.some(m => m.user === req.user.id)
    );
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
    const budget = await SharedBudget.getSharedBudgetById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    // Check if user is a member
    const isMember = budget.members && budget.members.some(m => m.user === req.user.id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this budget' });
    }
    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching budget'
    });
  }
});

// @route   POST /api/budgets/:id/expenses
// @desc    Add expense to budget (with real-time currency conversion)
// @access  Private
router.post('/:id/expenses', protect, async (req, res) => {
  try {
    const { amount, description, currency } = req.body;
    
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Amount and currency are required'
      });
    }

    const budget = await SharedBudget.getSharedBudgetById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    // Check if user is a member
    const isMember = budget.members && budget.members.some(m => m.user === req.user.id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to add expenses to this budget' });
    }
    // Convert expense amount to PHP for storage
    const amountPHP = await currencyService.convertToBase(amount, currency);
    const exchangeRate = await currencyService.getRate(currency, 'PHP');
    // Add expense to Firestore
    const newExpense = {
      user: req.user.id,
      amount,
      amountPHP,
      currency,
      exchangeRate,
      description,
      date: new Date()
    };
    const updatedExpenses = budget.expenses ? [...budget.expenses, newExpense] : [newExpense];
    await SharedBudget.updateSharedBudget(req.params.id, { expenses: updatedExpenses });
    const updatedBudget = await SharedBudget.getSharedBudgetById(req.params.id);
    res.json({
      success: true,
      budget: updatedBudget,
      conversionInfo: {
        originalAmount: amount,
        originalCurrency: currency,
        convertedAmount: amountPHP,
        baseCurrency: 'PHP',
        exchangeRate
      }
    });
  } catch (error) {
    console.error('Add expense error:', error);
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
    const budget = await SharedBudget.getSharedBudgetById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    // Only creator can delete
    if (budget.creator !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the creator can delete this budget' });
    }
    await SharedBudget.deleteSharedBudget(req.params.id);
    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting budget'
    });
  }
});

module.exports = router;
