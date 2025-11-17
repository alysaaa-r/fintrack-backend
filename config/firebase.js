// backend/config/firebase.js - Firebase initialization
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const connectFirebase = () => {
  try {
    console.log('🔄 Initializing Firebase...');

    const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'serviceAccountKey.json');

    if (fs.existsSync(svcPath)) {
      const serviceAccount = require(svcPath);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase Initialized using service account:', svcPath);
    } else {
      console.warn('⚠️ Firebase service account not found at', svcPath);
      console.warn('⚠️ Falling back to application default credentials.');
      console.warn('   To run locally, either place the service account JSON at the backend root as `serviceAccountKey.json`',
        'or set the env var FIREBASE_SERVICE_ACCOUNT_PATH to its full path.');
      initializeApp({
        credential: applicationDefault(),
      });
      console.log('✅ Firebase Initialized using application default credentials');
    }

    return getFirestore(); // return Firestore instance after initialization
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message || error);
    throw error;
  }
};

module.exports = connectFirebase;
