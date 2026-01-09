import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, app } from '../firebase/config';
import { Clan, ClanMember, ClanInvite } from '../../types';

const functions = getFunctions(app);

export const createClan = async (
  name: string,
  description?: string,
  privacy?: 'inviteOnly' | 'friendsOnly'
): Promise<{ clanId: string }> => {
  const create = httpsCallable(functions, 'createClan');
  const result = await create({ name, description, privacy });
  return (result.data as { success: boolean; clanId: string });
};

export const inviteToClan = async (clanId: string, toUid: string): Promise<void> => {
  const invite = httpsCallable(functions, 'inviteToClan');
  await invite({ clanId, toUid });
};

export const respondClanInvite = async (clanId: string, action: 'accept' | 'reject'): Promise<void> => {
  const respond = httpsCallable(functions, 'respondClanInvite');
  await respond({ clanId, action });
};

export const leaveClan = async (clanId: string): Promise<void> => {
  const leave = httpsCallable(functions, 'leaveClan');
  await leave({ clanId });
};

export const removeClanMember = async (clanId: string, memberUid: string): Promise<void> => {
  const remove = httpsCallable(functions, 'removeClanMember');
  await remove({ clanId, memberUid });
};

export const updateClanRole = async (
  clanId: string,
  memberUid: string,
  newRole: 'owner' | 'admin' | 'member'
): Promise<void> => {
  const update = httpsCallable(functions, 'updateClanRole');
  await update({ clanId, memberUid, newRole });
};

export const updateClanDetails = async (
  clanId: string,
  updates: { name?: string; description?: string; photoURL?: string; privacy?: string }
): Promise<void> => {
  const update = httpsCallable(functions, 'updateClanDetails');
  await update({ clanId, updates });
};

export const getClan = async (clanId: string): Promise<Clan | null> => {
  const clanRef = doc(db, 'clans', clanId);
  const clanDoc = await getDoc(clanRef);
  
  if (!clanDoc.exists()) return null;
  
  const data = clanDoc.data();
  return {
    id: clanDoc.id,
    name: data.name,
    description: data.description || '',
    photoURL: data.photoURL || '',
    ownerUid: data.ownerUid,
    privacy: data.privacy || 'inviteOnly',
    createdAt: data.createdAt?.toDate() || new Date(),
  };
};

export const getClanMembers = async (clanId: string): Promise<ClanMember[]> => {
  const membersRef = collection(db, 'clans', clanId, 'members');
  const membersSnap = await getDocs(membersRef);
  
  return membersSnap.docs
    .filter(doc => doc.data().status === 'active')
    .map(doc => ({
      uid: doc.id,
      role: doc.data().role,
      status: doc.data().status,
      joinedAt: doc.data().joinedAt?.toDate() || new Date(),
    }));
};

export const subscribeToClanMembers = (
  clanId: string,
  callback: (members: ClanMember[]) => void
): Unsubscribe => {
  const membersRef = collection(db, 'clans', clanId, 'members');
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs
      .filter(doc => doc.data().status === 'active')
      .map(doc => ({
        uid: doc.id,
        role: doc.data().role,
        status: doc.data().status,
        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
      }));
    callback(members);
  });
};

export const getUserClans = async (uid: string): Promise<Clan[]> => {
  const clansRef = collection(db, 'clans');
  const clansSnap = await getDocs(clansRef);
  
  const userClans: Clan[] = [];
  
  for (const clanDoc of clansSnap.docs) {
    const memberRef = doc(db, 'clans', clanDoc.id, 'members', uid);
    const memberDoc = await getDoc(memberRef);
    
    if (memberDoc.exists() && memberDoc.data()?.status === 'active') {
      const data = clanDoc.data();
      userClans.push({
        id: clanDoc.id,
        name: data.name,
        description: data.description || '',
        photoURL: data.photoURL || '',
        ownerUid: data.ownerUid,
        privacy: data.privacy || 'inviteOnly',
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    }
  }
  
  return userClans;
};

export const getClanInvites = async (uid: string): Promise<ClanInvite[]> => {
  const invitesRef = collection(db, 'clanInvites');
  const q = query(invitesRef, where('toUid', '==', uid), where('status', '==', 'pending'));
  const invitesSnap = await getDocs(q);
  
  return invitesSnap.docs.map(doc => {
    const data = doc.data();
    return {
      clanId: data.clanId,
      fromUid: data.fromUid,
      toUid: data.toUid,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
};

export const subscribeToClanInvites = (
  uid: string,
  callback: (invites: ClanInvite[]) => void
): Unsubscribe => {
  const invitesRef = collection(db, 'clanInvites');
  const q = query(invitesRef, where('toUid', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    const invites = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        clanId: data.clanId,
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
    callback(invites);
  });
};

