const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const SHARED_BUDGETS_COLLECTION = 'sharedBudgets';

async function createSharedBudget(budgetData) {
  const budget = {
    ...budgetData,
    createdAt: new Date(),
  };
  const budgetRef = db.collection(SHARED_BUDGETS_COLLECTION).doc();
  await budgetRef.set(budget);
  return { id: budgetRef.id, ...budget };
}

async function getSharedBudgetById(id) {
  const doc = await db.collection(SHARED_BUDGETS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function updateSharedBudget(id, updates) {
  await db.collection(SHARED_BUDGETS_COLLECTION).doc(id).update(updates);
  return getSharedBudgetById(id);
}

async function deleteSharedBudget(id) {
  await db.collection(SHARED_BUDGETS_COLLECTION).doc(id).delete();
}

module.exports = {
  createSharedBudget,
  getSharedBudgetById,
  updateSharedBudget,
  deleteSharedBudget,
};
