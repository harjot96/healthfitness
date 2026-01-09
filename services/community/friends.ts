import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy,
  startAfter,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Friend, FriendRequest, SearchableUser } from '../../types';

export interface UserWithStatus extends SearchableUser {
  isFriend?: boolean;
  friendRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'none';
  friendRequestId?: string;
}

/**
 * Get all users from the database (paginated)
 */
export const getAllUsers = async (
  currentUserId: string,
  limitCount: number = 50,
  lastDoc?: any
): Promise<{ users: UserWithStatus[]; lastDoc: any }> => {
  try {
    const usersRef = collection(db, 'users');
    const buildQuery = (orderField: 'displayName' | 'createdAt', docCursor?: any) => {
      if (docCursor) {
        return query(usersRef, orderBy(orderField), startAfter(docCursor), limit(limitCount));
      }
      return query(usersRef, orderBy(orderField), limit(limitCount));
    };

    let usersSnap;
    let orderField: 'displayName' | 'createdAt' = 'displayName';

    try {
      usersSnap = await getDocs(buildQuery('displayName', lastDoc));
    } catch (error: any) {
      console.warn('[Friends] displayName query failed, falling back to createdAt:', error?.message || error);
      orderField = 'createdAt';
      usersSnap = await getDocs(buildQuery('createdAt', undefined));
    }
    const users: UserWithStatus[] = [];

    // Get current user's friends and friend requests
    const [friendsList, sentRequests, receivedRequests] = await Promise.all([
      getUserFriends(currentUserId),
      getSentFriendRequests(currentUserId),
      getReceivedFriendRequests(currentUserId)
    ]);

    const friendsMap = new Map(friendsList.map(f => [f.friendUid, true]));
    const sentRequestsMap = new Map(sentRequests.map(r => [r.toUid, r]));
    const receivedRequestsMap = new Map(receivedRequests.map(r => [r.fromUid, r]));

    for (const userDoc of usersSnap.docs) {
      // Skip current user
      if (userDoc.id === currentUserId) continue;

      const data = userDoc.data();
      const uid = userDoc.id;

      // Check friend status
      const isFriend = friendsMap.has(uid);
      let friendRequestStatus: 'pending' | 'accepted' | 'rejected' | 'none' = 'none';
      let friendRequestId: string | undefined;

      if (sentRequestsMap.has(uid)) {
        const request = sentRequestsMap.get(uid)!;
        friendRequestStatus = request.status;
        friendRequestId = `${request.fromUid}_${request.toUid}`;
      } else if (receivedRequestsMap.has(uid)) {
        const request = receivedRequestsMap.get(uid)!;
        friendRequestStatus = request.status;
        friendRequestId = `${request.fromUid}_${request.toUid}`;
      }

      users.push({
        uid,
        displayName: data.displayName || data.email?.split('@')[0] || '',
        email: data.email || '',
        photoURL: data.photoURL || '',
        usernameLower: data.usernameLower,
        isFriend,
        friendRequestStatus: isFriend ? 'accepted' : friendRequestStatus,
        friendRequestId,
      });
    }

    const lastDocument = usersSnap.docs[usersSnap.docs.length - 1];

    return {
      users: orderField === 'displayName'
        ? users
        : users.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      lastDoc: lastDocument,
    };
  } catch (error) {
    console.error('[Friends] Error getting all users:', error);
    throw error;
  }
};

/**
 * Get user's friends list
 */
export const getUserFriends = async (uid: string): Promise<Friend[]> => {
  try {
    const friendsRef = collection(db, 'friends', uid, 'list');
    const friendsSnap = await getDocs(friendsRef);

    return friendsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        friendUid: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        ringsShare: data.ringsShare || false,
      };
    });
  } catch (error) {
    console.error('[Friends] Error getting user friends:', error);
    return [];
  }
};

/**
 * Subscribe to user's friends list
 */
export const subscribeToUserFriends = (
  uid: string,
  callback: (friends: Friend[]) => void
): Unsubscribe => {
  const friendsRef = collection(db, 'friends', uid, 'list');
  return onSnapshot(friendsRef, (snapshot) => {
    const friends = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        friendUid: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        ringsShare: data.ringsShare || false,
      };
    });
    callback(friends);
  });
};

/**
 * Subscribe to received friend requests
 */
export const subscribeToReceivedFriendRequests = (
  uid: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe => {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    callback(requests);
  });
};

/**
 * Subscribe to sent friend requests
 */
export const subscribeToSentFriendRequests = (
  uid: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe => {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('fromUid', '==', uid),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    callback(requests);
  });
};

/**
 * Get sent friend requests
 */
export const getSentFriendRequests = async (uid: string): Promise<FriendRequest[]> => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('fromUid', '==', uid),
      where('status', '==', 'pending')
    );
    const requestsSnap = await getDocs(q);

    return requestsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('[Friends] Error getting sent friend requests:', error);
    return [];
  }
};

/**
 * Get received friend requests
 */
export const getReceivedFriendRequests = async (uid: string): Promise<FriendRequest[]> => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('toUid', '==', uid),
      where('status', '==', 'pending')
    );
    const requestsSnap = await getDocs(q);

    return requestsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('[Friends] Error getting received friend requests:', error);
    return [];
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (fromUid: string, toUid: string): Promise<void> => {
  try {
    if (fromUid === toUid) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends
    const friendRef = doc(db, 'friends', fromUid, 'list', toUid);
    const friendDoc = await getDoc(friendRef);
    if (friendDoc.exists()) {
      throw new Error('Already friends with this user');
    }

    // Check if request already exists
    const requestId = `${fromUid}_${toUid}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (requestDoc.exists()) {
      const data = requestDoc.data();
      if (data.status === 'pending') {
        throw new Error('Friend request already sent');
      }
    }

    // Create friend request
    await setDoc(requestRef, {
      fromUid,
      toUid,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[Friends] Error sending friend request:', error);
    throw error;
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (fromUid: string, toUid: string): Promise<void> => {
  try {
    const requestId = `${fromUid}_${toUid}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    
    // Update request status
    await updateDoc(requestRef, {
      status: 'accepted',
      updatedAt: Timestamp.now(),
    });

    // Add to both users' friends lists
    const friendRef1 = doc(db, 'friends', fromUid, 'list', toUid);
    const friendRef2 = doc(db, 'friends', toUid, 'list', fromUid);

    await Promise.all([
      setDoc(friendRef1, {
        createdAt: Timestamp.now(),
        ringsShare: false,
      }),
      setDoc(friendRef2, {
        createdAt: Timestamp.now(),
        ringsShare: false,
      }),
    ]);
  } catch (error) {
    console.error('[Friends] Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (fromUid: string, toUid: string): Promise<void> => {
  try {
    const requestId = `${fromUid}_${toUid}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    
    await updateDoc(requestRef, {
      status: 'rejected',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[Friends] Error rejecting friend request:', error);
    throw error;
  }
};

/**
 * Cancel a friend request
 */
export const cancelFriendRequest = async (fromUid: string, toUid: string): Promise<void> => {
  try {
    const requestId = `${fromUid}_${toUid}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    
    await updateDoc(requestRef, {
      status: 'canceled',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[Friends] Error canceling friend request:', error);
    throw error;
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (uid: string, friendUid: string): Promise<void> => {
  try {
    const friendRef1 = doc(db, 'friends', uid, 'list', friendUid);
    const friendRef2 = doc(db, 'friends', friendUid, 'list', uid);

    await Promise.all([
      friendRef1.delete(),
      friendRef2.delete(),
    ]);
  } catch (error) {
    console.error('[Friends] Error removing friend:', error);
    throw error;
  }
};
