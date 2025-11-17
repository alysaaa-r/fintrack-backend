const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Invitation = require('../models/Invitation');
const SharedBudget = require('../models/SharedBudget');
const SharedGoal = require('../models/SharedGoal');

// Generate random code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @route   POST /api/invitations
// @desc    Create invitation code for budget or goal
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, referenceId, expirationMinutes } = req.body;

    if (!['budget', 'goal'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation type'
      });
    }

    // Verify the budget/goal exists and user is the creator
    const Model = type === 'budget' ? SharedBudget : SharedGoal;
    const item = await Model.findById(referenceId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${type === 'budget' ? 'Budget' : 'Goal'} not found`
      });
    }

    if (item.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can generate invitation codes'
      });
    }

    // Generate unique code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generateCode();
      const existing = await Invitation.findOne({ code });
      if (!existing) isUnique = true;
    }

    // Calculate expiration (default 5 minutes)
    const expireIn = expirationMinutes || 5;
    const expiresAt = new Date(Date.now() + expireIn * 60 * 1000);

    const invitation = await Invitation.createInvitation({
      code,
      type,
      referenceId,
      creator: req.user.id,
      expiresAt,
      usedBy: []
    });
    res.status(201).json({
      success: true,
      invitation: {
        code: invitation.code,
        type: invitation.type,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating invitation'
    });
  }
});

// @route   POST /api/invitations/join
// @desc    Join budget or goal using invitation code
// @access  Private
router.post('/join', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Invitation code is required'
      });
    }

    // Find invitation
    const invitation = await Invitation.getInvitationByCode(code.toUpperCase());
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation code' });
    }
    // Check expiration
    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invitation code has expired' });
    }
    // Check if user already used this code
    if (invitation.usedBy && invitation.usedBy.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You have already used this invitation code' });
    }
    // Get the budget or goal
    const Model = invitation.type === 'budget' ? require('../models/SharedBudget') : require('../models/SharedGoal');
    const item = invitation.type === 'budget'
      ? await Model.getSharedBudgetById(invitation.referenceId)
      : await Model.getSharedGoalById(invitation.referenceId);
    if (!item) {
      return res.status(404).json({ success: false, message: `${invitation.type === 'budget' ? 'Budget' : 'Goal'} not found` });
    }
    // Check if user is already a member
    const isMember = item.members && item.members.some(m => m.user === req.user.id);
    if (isMember) {
      return res.status(400).json({ success: false, message: `You are already a member of this ${invitation.type}` });
    }
    // Add user to members with a color
    const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const colorIndex = item.members.length % memberColors.length;
    const newMember = {
      user: req.user.id,
      color: memberColors[colorIndex],
      joinedAt: new Date()
    };
    const updatedMembers = [...item.members, newMember];
    if (invitation.type === 'budget') {
      await Model.updateSharedBudget(invitation.referenceId, { members: updatedMembers });
    } else {
      await Model.updateSharedGoal(invitation.referenceId, { members: updatedMembers });
    }
    // Mark invitation as used by this user
    const updatedUsedBy = invitation.usedBy ? [...invitation.usedBy, req.user.id] : [req.user.id];
    await Invitation.updateInvitation(invitation.id, { usedBy: updatedUsedBy });
    res.json({
      success: true,
      message: `Successfully joined ${invitation.type}`,
      type: invitation.type,
      item: invitation.type === 'budget'
        ? await Model.getSharedBudgetById(invitation.referenceId)
        : await Model.getSharedGoalById(invitation.referenceId)
    });
  } catch (error) {
    console.error('Join invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining with invitation'
    });
  }
});

// @route   GET /api/invitations/:code
// @desc    Verify invitation code
// @access  Private
router.get('/:code', protect, async (req, res) => {
  try {
    const invitation = await Invitation.getInvitationByCode(req.params.code.toUpperCase());
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation code' });
    }
    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invitation code has expired' });
    }
    res.json({
      success: true,
      invitation: {
        code: invitation.code,
        type: invitation.type,
        expiresAt: invitation.expiresAt,
        isValid: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error verifying invitation'
    });
  }
});

module.exports = router;
