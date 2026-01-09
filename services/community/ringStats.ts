import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RingStats, RingsVisibility } from '../../types';

export const getRingStats = async (
  viewerUid: string,
  targetUid: string,
  date: string // yyyyMMdd format
): Promise<RingStats | null> => {
  // Check privacy
  const canView = await checkRingVisibility(viewerUid, targetUid);
  if (!canView) return null;
  
  const statsRef = doc(db, 'ringStats', targetUid, 'daily', date);
  const statsDoc = await getDoc(statsRef);
  
  if (!statsDoc.exists()) return null;
  
  const data = statsDoc.data();
  return {
    caloriesBurned: data.caloriesBurned || 0,
    steps: data.steps || 0,
    workoutMinutes: data.workoutMinutes || 0,
    goalCalories: data.goalCalories || 0,
    goalSteps: data.goalSteps || 0,
    goalMinutes: data.goalMinutes || 0,
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

export const checkRingVisibility = async (viewerUid: string, targetUid: string): Promise<boolean> => {
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
    return await areFriends(viewerUid, targetUid);
  }
  
  if (visibility === 'clan') {
    // Check if users share any clan
    const clansRef = collection(db, 'clans');
    const clansSnap = await getDocs(clansRef);
    
    for (const clanDoc of clansSnap.docs) {
      const viewerMemberRef = doc(db, 'clans', clanDoc.id, 'members', viewerUid);
      const targetMemberRef = doc(db, 'clans', clanDoc.id, 'members', targetUid);
      
      const [viewerMember, targetMember] = await Promise.all([
        getDoc(viewerMemberRef),
        getDoc(targetMemberRef),
      ]);
      
      if (viewerMember.exists() && targetMember.exists()) {
        const viewerData = viewerMember.data();
        const targetData = targetMember.data();
        if (viewerData?.status === 'active' && targetData?.status === 'active') {
          return true;
        }
      }
    }
    
    return false;
  }
  
  return false;
};

export const getClanRingStats = async (
  clanId: string,
  date: string // yyyyMMdd format
): Promise<Array<{ uid: string; stats: RingStats }>> => {
  // Get all active members
  const membersRef = collection(db, 'clans', clanId, 'members');
  const membersSnap = await getDocs(membersRef);
  
  const members = membersSnap.docs
    .filter(doc => doc.data().status === 'active')
    .map(doc => doc.id);
  
  // Get ring stats for each member
  const statsPromises = members.map(async (uid) => {
    const statsRef = doc(db, 'ringStats', uid, 'daily', date);
    const statsDoc = await getDoc(statsRef);
    
    if (!statsDoc.exists()) return null;
    
    const data = statsDoc.data();
    return {
      uid,
      stats: {
        caloriesBurned: data.caloriesBurned || 0,
        steps: data.steps || 0,
        workoutMinutes: data.workoutMinutes || 0,
        goalCalories: data.goalCalories || 0,
        goalSteps: data.goalSteps || 0,
        goalMinutes: data.goalMinutes || 0,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      },
    };
  });
  
  const results = await Promise.all(statsPromises);
  return results.filter((result): result is { uid: string; stats: RingStats } => result !== null);
};

// Helper function to check friendship
async function areFriends(uid1: string, uid2: string): Promise<boolean> {
  const friendRef = doc(db, 'friends', uid1, 'list', uid2);
  const friendDoc = await getDoc(friendRef);
  return friendDoc.exists();
}

