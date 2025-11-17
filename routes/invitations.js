const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Invitation = require('../models/Invitation');
const SharedBudget = require('../models/SharedBudget'); // Used the defined model
const SharedGoal = require('../models/SharedGoal'); // Used the defined model
const { nanoid } = require('nanoid'); // 🛑 Improvement: Use nanoid for reliability

// Helper for generating a reliable, unique code
const generateUniqueCode = async () => {
    let code;
    let isUnique = false;
    while (!isUnique) {
        // Generates 6-character uppercase code
        code = nanoid(6).toUpperCase(); 
        const existing = await Invitation.findOne({ code });
        if (!existing) isUnique = true;
    }
    return code;
};

// Helper for getting user color (consistent with budget.js)
const memberColors = ['#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const getUniqueColor = (userId, existingMembers) => {
    // Assigns next available color from the list based on current member count
    const colorIndex = existingMembers.length % memberColors.length;
    return memberColors[colorIndex];
};


// @route   POST /api/invitations
// @desc    Create invitation code for budget or goal
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { type, referenceId, expirationMinutes } = req.body;

        if (!['budget', 'goal'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid invitation type' });
        }

        // Verify the budget/goal exists and user is the creator
        const Model = type === 'budget' ? SharedBudget : SharedGoal;
        const item = await Model.findById(referenceId);

        if (!item) {
            return res.status(404).json({ success: false, message: `${type === 'budget' ? 'Budget' : 'Goal'} not found` });
        }

        // 🛑 FIX: Standardize access to creator ID (assuming your Mongoose model uses ._id)
        if (item.creator.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the creator can generate invitation codes' });
        }

        const code = await generateUniqueCode(); // 🛑 APPLIED FIX: Use dedicated helper
        
        // Calculate expiration (default 30 minutes for better UX)
        const expireIn = expirationMinutes || 30; 
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
        res.status(500).json({ success: false, message: 'Server error creating invitation' });
    }
});

// @route   POST /api/invitations/join
// @desc    Join budget or goal using invitation code
// @access  Private
router.post('/join', protect, async (req, res) => {
    try {
        const { code } = req.body;
        const joiningUserId = req.user.id; // 🛑 FIX: Use req.user.id (from protect middleware)

        if (!code) {
            return res.status(400).json({ success: false, message: 'Invitation code is required' });
        }

        // 1. Find and validate invitation
        const invitation = await Invitation.getInvitationByCode(code.toUpperCase());
        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invalid invitation code' });
        }
        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({ success: false, message: 'Invitation code has expired' });
        }
        
        // 2. Get the budget or goal and check membership
        const Model = invitation.type === 'budget' ? SharedBudget : SharedGoal; 
        const item = invitation.type === 'budget'
            ? await Model.getSharedBudgetById(invitation.referenceId)
            : await Model.getSharedGoalById(invitation.referenceId); 
            
        if (!item) {
            return res.status(404).json({ success: false, message: `${invitation.type === 'budget' ? 'Budget' : 'Goal'} not found` });
        }

        const isMember = item.members && item.members.some(m => m.user.toString() === joiningUserId.toString());
        if (isMember) {
            return res.status(400).json({ success: false, message: `You are already a member of this ${invitation.type}` });
        }
        
        // 3. Add user to members with a unique color
        const newMemberColor = getUniqueColor(joiningUserId, item.members); // 🛑 APPLIED FIX: Get next unique color
        const newMember = {
            user: joiningUserId,
            color: newMemberColor,
            joinedAt: new Date()
        };
        const updatedMembers = [...item.members, newMember];

        // 4. Update the Budget/Goal item
        if (invitation.type === 'budget') {
            await SharedBudget.updateSharedBudget(invitation.referenceId, { members: updatedMembers });
        } else {
            await SharedGoal.updateSharedGoal(invitation.referenceId, { members: updatedMembers });
        }

        // 5. Mark invitation as used by this user (allows multi-use if item.members allows it)
        const updatedUsedBy = invitation.usedBy ? [...invitation.usedBy, joiningUserId] : [joiningUserId];
        await Invitation.updateInvitation(invitation.id, { usedBy: updatedUsedBy });
        
        // 6. Return the updated item
        const updatedItem = invitation.type === 'budget'
             ? await SharedBudget.getSharedBudgetById(invitation.referenceId)
             : await SharedGoal.getSharedGoalById(invitation.referenceId);

        res.json({
            success: true,
            message: `Successfully joined ${invitation.type}`,
            type: invitation.type,
            item: updatedItem
        });
    } catch (error) {
        console.error('Join invitation error:', error);
        res.status(500).json({ success: false, message: 'Server error joining with invitation' });
    }
});

// @route   GET /api/invitations/:code
// @desc    Verify invitation code
// @access  Private
router.get('/:code', protect, async (req, res) => {
    try {
        const invitation = await Invitation.getInvitationByCode(req.params.code.toUpperCase());
        
        if (!invitation || new Date() > invitation.expiresAt) {
             // Return 404 for security reasons if not found/expired
            return res.status(404).json({ success: false, message: 'Invalid or expired invitation code' });
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
        res.status(500).json({ success: false, message: 'Server error verifying invitation' });
    }
});

module.exports = router;