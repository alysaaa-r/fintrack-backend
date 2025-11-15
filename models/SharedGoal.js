const mongoose = require('mongoose');

const SharedGoalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'PHP',
    enum: ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']
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
  contributions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['add', 'withdraw'],
      default: 'add'
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

module.exports = mongoose.model('SharedGoal', SharedGoalSchema);
