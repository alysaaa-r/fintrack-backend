const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to Firebase
require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const invitationRoutes = require('./routes/invitations');
const currencyRoutes = require('./routes/currency');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger to help debug connectivity from devices
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Backend is reachable!' });
});

// Database health check (Firestore)
const { getFirestore } = require('firebase-admin/firestore');
app.get('/api/test-db', async (req, res) => {
  try {
    const db = getFirestore();
    // Try to list collections as a connectivity test
    const collections = await db.listCollections();
    res.json({
      success: true,
      message: 'Connected to Firebase Firestore',
      collections: collections.map(col => col.id)
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Firestore connection failed',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/currency', currencyRoutes);


// Add this AFTER your existing routes (around line 50-60):

// Health check endpoint for app connectivity (Firestore)
app.get('/api/health', async (req, res) => {
  try {
    const db = getFirestore();
    // Try a simple Firestore operation
    await db.collection('healthcheck').get();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'FinTrack Backend',
      database: 'Connected to Firebase Firestore',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware (keep this at the end)
app.use((err, req, res, next) => {
  // ... existing error handling
});


// Health check
app.get('/api/health/', (req, res) => {
  res.json({ message: 'FinTrack API Server Running',status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
