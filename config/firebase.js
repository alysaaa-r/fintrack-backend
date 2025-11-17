// backend/config/firebase.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const connectFirebase = () => {
  try {
    console.log('🔄 Initializing Firebase...');
    let serviceAccount;

    // 1. PRODUCTION: Use Base64 Variable (Render)
    if (process.env.FIREBASE_KEY_BASE64) {
      console.log('🔑 Detected Base64 Configuration...');
      // Decode the string back into a JSON object
      const decodedKey = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedKey);
    } 
    
    // 2. DEVELOPMENT: Use Local File (Laptop)
    else {
      console.log('⚠️ No Base64 variable found. Looking for local file...');
      const localPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (fs.existsSync(localPath)) {
        serviceAccount = require(localPath);
      } else {
        throw new Error('CRITICAL: No credentials found. Set FIREBASE_KEY_BASE64 on Render.');
      }
    }

    initializeApp({
      credential: cert(serviceAccount)
    });
    
    console.log('✅ Firebase Initialization Successful!');
    return getFirestore();

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw error;
  }
};

module.exports = connectFirebase;