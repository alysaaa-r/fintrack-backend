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
      const decodedBuffer = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64');
      const decodedString = decodedBuffer.toString('utf-8');
      serviceAccount = JSON.parse(decodedString);
    } 
    
    // 2. DEVELOPMENT: Use Local File (Laptop)
    else {
      const localPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (fs.existsSync(localPath)) {
        console.log('📂 Detected Local Service Account File...');
        serviceAccount = require(localPath);
      } else {
        throw new Error('CRITICAL: No credentials found. Set FIREBASE_KEY_BASE64 on Render.');
      }
    }

    // Initialize App
    initializeApp({
      credential: cert(serviceAccount)
    });
    
    console.log('✅ Firebase Initialized Successfully!');
    return getFirestore();

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw error;
  }
};

module.exports = connectFirebase;