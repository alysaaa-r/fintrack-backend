const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const INVITATIONS_COLLECTION = 'invitations';

async function createInvitation(invitationData) {
  const invitation = {
    ...invitationData,
    createdAt: new Date(),
  };
  const invitationRef = db.collection(INVITATIONS_COLLECTION).doc();
  await invitationRef.set(invitation);
  return { id: invitationRef.id, ...invitation };
}

async function getInvitationByCode(code) {
  const snapshot = await db.collection(INVITATIONS_COLLECTION)
    .where('code', '==', code)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function updateInvitation(id, updates) {
  await db.collection(INVITATIONS_COLLECTION).doc(id).update(updates);
  return getInvitationById(id);
}

async function getInvitationById(id) {
  const doc = await db.collection(INVITATIONS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function deleteInvitation(id) {
  await db.collection(INVITATIONS_COLLECTION).doc(id).delete();
}

module.exports = {
  createInvitation,
  getInvitationByCode,
  updateInvitation,
  getInvitationById,
  deleteInvitation,
};
