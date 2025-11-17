const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');

const db = getFirestore();
const USERS_COLLECTION = 'users';

async function createUser(userData) {
  // Hash password before saving
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  const user = {
    ...userData,
    password: hashedPassword,
    createdAt: new Date(),
  };
  const userRef = db.collection(USERS_COLLECTION).doc();
  await userRef.set(user);
  return { id: userRef.id, ...user };
}

async function getUserByUsername(username) {
  const snapshot = await db.collection(USERS_COLLECTION)
    .where('username', '==', username)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function comparePassword(storedPassword, candidatePassword) {
  return await bcrypt.compare(candidatePassword, storedPassword);
}

module.exports = {
  createUser,
  getUserByUsername,
  comparePassword,
};
