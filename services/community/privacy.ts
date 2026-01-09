import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RingsVisibility } from '../../types';

export const canViewRings = async (
  viewerUid: string,
  targetUid: string
): Promise<boolean> => {
  // Always allow viewing own stats
  if (viewerUid === targetUid) return true;
  
  // Get target user's privacy settings
  const userRef = doc(db, 'users', targetUid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  const privacy = userData?.privacy;
  if (!privacy) return false;
  
  const visibility: RingsVisibility = privacy.ringsVisibility || 'private';
  
  if (visibility === 'public') return true;
  if (visibility === 'private') return false;
  
  if (visibility === 'friends') {
    // Check if users are friends
    const friendRef = doc(db, 'friends', viewerUid, 'list', targetUid);
    const friendDoc = await getDoc(friendRef);
    return friendDoc.exists();
  }
  
  if (visibility === 'clan') {
    // Check if users share any clan
    // This is a simplified check - full implementation would query all clans
    // For now, we'll rely on Cloud Functions for accurate clan membership checks
    return false;
  }
  
  return false;
};

export const canSendFriendRequest = async (targetUid: string): Promise<boolean> => {
  const userRef = doc(db, 'users', targetUid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  const privacy = userData?.privacy;
  return privacy?.allowFriendRequests !== false;
};

export const canSendClanInvite = async (targetUid: string): Promise<boolean> => {
  const userRef = doc(db, 'users', targetUid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  const privacy = userData?.privacy;
  return privacy?.allowClanInvites !== false;
};

