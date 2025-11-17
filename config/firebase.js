// backend/config/firebase.js - Firebase initialization
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const connectFirebase = () => {
  try {
    console.log('🔄 Initializing Firebase...');
    let serviceAccount;

    // PRIORITY 1: Check for Base64 Variable (Render Production)
    if (process.env.FIREBASE_KEY_BASE64) {
      console.log('🔑 Detected Base64 Service Account...');
      // Decode the long string back into JSON
      const decodedConfig = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedConfig);
    } 
    
    // PRIORITY 2: Check for Local File (Development)
    else {
      const localPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (fs.existsSync(localPath)) {
        console.log('📂 Detected Local Service Account File...');
        serviceAccount = require(localPath);
      } else {
        throw new Error('No service account found! Set FIREBASE_KEY_BASE64 or add serviceAccountKey.json');
      }
    }

    // Initialize the App
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