const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getFirestore } = require('firebase-admin/firestore'); // Import Firestore
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const { generateToken } = require('../middleware/auth');

// Initialize Firestore
const db = getFirestore();

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().matches(/^\d{11}$/).withMessage('Phone number must be 11 digits'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, phone, password } = req.body;

    // 1. Check if user already exists in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();

    if (!snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user object
    const newUser = {
      name,
      phone,
      password: hashedPassword, // Save the HASHED password, not plain text
      username: phone, // using phone as username for now
      profileImage: '',
      createdAt: new Date().toISOString()
    };

    // 4. Save to Firestore
    // We use .add() to let Firestore generate a unique ID
    const docRef = await usersRef.add(newUser);

    // 5. Generate token
    const token = generateToken(docRef.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: docRef.id,
        name: newUser.name,
        phone: newUser.phone,
        username: newUser.username,
        profileImage: newUser.profileImage
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('phone').trim().matches(/^\d{11}$/).withMessage('Phone number must be 11 digits'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { phone, password } = req.body;

    // 1. Find user by phone in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Get the user document (first match)
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // 2. Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // 3. Generate token
    const token = generateToken(userDoc.id);

    res.json({
      success: true,
      token,
      user: {
        id: userDoc.id,
        name: user.name,
        phone: user.phone,
        username: user.username,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;