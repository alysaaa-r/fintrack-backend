// backend/config/database.js - Firebase connection
const connectFirebase = require('./firebase');

let dbInstance = null;
try {
  dbInstance = connectFirebase();
  console.log('✅ Connected to Firebase Firestore!');
} catch (error) {
  console.error('❌ Firebase connection failed:', error.message);
  // Do not exit here - allow the app to handle connection failures at runtime
}

module.exports = dbInstance;