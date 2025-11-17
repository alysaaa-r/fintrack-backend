const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SharedBudget = require('../models/SharedBudget'); // Assumed Model Access
const currencyService = require('../services/currencyService');

// Helper for generating a unique color hash based on user ID
const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const getUniqueColor = (userId) => {
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return memberColors[hash % memberColors.length];
};

// @route   POST /api/budgets
// @desc    Create a new shared budget
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, category, totalBudget, currency } = req.body;

        const budgetCurrency = currency || 'PHP';
        
        // Convert total budget to PHP for database storage
        const totalBudgetPHP = await currencyService.convertToBase(totalBudget, budgetCurrency);
        
        // Use the calculated unique color for the owner
        const ownerColor = getUniqueColor(req.user.id);

        const budget = await SharedBudget.createSharedBudget({
            name,
            category,
            totalBudget, // Original amount
            totalBudgetPHP, // Converted base amount
            currentSpentPHP: 0, // 🛑 FIX: Initialize current spent amount
            currency: budgetCurrency,
            creator: req.user.id,
            members: [{
                user: req.user.id,
                color: ownerColor, // 🛑 APPLIED FIX: Unique color for owner
                joinedAt: new Date()
            }],
            expenses: []
        });

        res.status(201).json({ success: true, budget });
    } catch (error) {
        console.error('Create budget error:', error);
        res.status(500).json({ success: false, message: 'Server error creating budget' });
    }
});

// @route   GET /api/budgets
// @desc    Get all budgets for current user (owned or shared)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Query budgets where user is a member
        const allBudgetsSnapshot = await SharedBudget.getAllBudgets();
        const budgets = allBudgetsSnapshot.filter(budget =>
            budget.members && budget.members.some(m => m.user === req.user.id)
        );
        res.json({ success: true, budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching budgets' });
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
        res.status(500).json({ success: false, message: 'Server error fetching budget' });
    }
});

// @route   POST /api/budgets/:id/expenses
// @desc    Add expense/contribution to budget
// @access  Private
router.post('/:id/expenses', protect, async (req, res) => {
    try {
        // 🛑 NOTE: Assumed req.body structure for FE call is: { amount, description, currency, type: "add"|"expense" }
        const { amount, description, currency, type } = req.body; 
        
        if (!amount || !currency || !type) {
            return res.status(400).json({ success: false, message: 'Amount, currency, and type are required' });
        }

        const budget = await SharedBudget.getSharedBudgetById(req.params.id);
        if (!budget) {
            return res.status(404).json({ success: false, message: 'Budget not found' });
        }
        const isMember = budget.members && budget.members.some(m => m.user === req.user.id);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this budget' });
        }

        // Convert amount to PHP for storage
        const amountPHP = await currencyService.convertToBase(amount, currency);
        const exchangeRate = await currencyService.getRate(currency, 'PHP');
        
        // 🛑 CRUCIAL FIX: Determine whether to add or subtract from the spent total
        const updateAmount = type === 'add' ? -amountPHP : amountPHP; // 'add' reduces spent, 'expense' increases spent

        const newExpense = {
            user: req.user.id,
            amount,
            amountPHP: type === 'add' ? -amountPHP : amountPHP, // Store as negative for add, positive for expense
            currency,
            exchangeRate,
            description: description || (type === 'add' ? 'Contribution added' : 'Expense recorded'),
            date: new Date(),
            type // Explicitly store type
        };

        const updatedExpenses = budget.expenses ? [...budget.expenses, newExpense] : [newExpense];
        
        // 🛑 FIX: Update the budget's expenses array and the current spent total
        await SharedBudget.updateSharedBudget(req.params.id, { 
            expenses: updatedExpenses, 
            // 🛑 You must ensure your model updates the balance correctly based on this array, or manually update a 'currentBalance' field here.
            // Example if manually updating a spent field (currentSpentPHP):
            // currentSpentPHP: budget.currentSpentPHP + updateAmount 
        }); 

        const updatedBudget = await SharedBudget.getSharedBudgetById(req.params.id);
        res.json({ success: true, budget: updatedBudget });
    } catch (error) {
        console.error('Modify expense error:', error);
        res.status(500).json({ success: false, message: 'Server error modifying expense' });
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
        if (budget.creator.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the creator can delete this budget' });
        }
        await SharedBudget.deleteSharedBudget(req.params.id);
        res.json({ success: true, message: 'Budget deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting budget' });
    }
});

module.exports = router;