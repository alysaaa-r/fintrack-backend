const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const SHARED_GOALS_COLLECTION = 'sharedGoals';

async function createSharedGoal(goalData) {
  const goal = {
    ...goalData,
    createdAt: new Date(),
  };
  const goalRef = db.collection(SHARED_GOALS_COLLECTION).doc();
  await goalRef.set(goal);
  return { id: goalRef.id, ...goal };
}

async function getSharedGoalById(id) {
  const doc = await db.collection(SHARED_GOALS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function updateSharedGoal(id, updates) {
  await db.collection(SHARED_GOALS_COLLECTION).doc(id).update(updates);
  return getSharedGoalById(id);
}

async function deleteSharedGoal(id) {
  await db.collection(SHARED_GOALS_COLLECTION).doc(id).delete();
}

module.exports = {
  createSharedGoal,
  getSharedGoalById,
  updateSharedGoal,
  deleteSharedGoal,
};
