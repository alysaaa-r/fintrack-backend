const mongoose = require('mongoose');

const SharedBudgetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0
  },
  totalBudgetPHP: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'PHP',
    uppercase: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    color: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expenses: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    amountPHP: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      uppercase: true
    },
    exchangeRate: {
      type: Number,
      required: true
    },
    description: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SharedBudget', SharedBudgetSchema);
