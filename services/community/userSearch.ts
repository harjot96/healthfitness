import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';

export interface SearchableUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  usernameLower?: string;
}

export interface UserData extends SearchableUser {
  createdAt?: any;
  privacy?: {
    ringsVisibility?: string;
    allowFriendRequests?: boolean;
    allowClanInvites?: boolean;
  };
  profile?: any;
}

// Cache for user data to prevent excessive function calls
interface CacheEntry {
  data: UserData | null;
  timestamp: number;
  pending?: Promise<UserData | null>;
}

const userCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms debounce

// Debounce map to prevent rapid successive calls
const pendingCalls = new Map<string, Promise<UserData | null>>();

export const searchUsersByUsername = async (username: string, maxResults: number = 20): Promise<SearchableUser[]> => {
  const usernameLower = username.toLowerCase().trim();
  if (!usernameLower) return [];
  
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('usernameLower', '>=', usernameLower),
    where('usernameLower', '<=', usernameLower + '\uf8ff'),
    limit(maxResults)
  );
  
  const usersSnap = await getDocs(q);
  return usersSnap.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName || '',
      email: data.email || '',
      photoURL: data.photoURL || '',
      usernameLower: data.usernameLower,
    };
  });
};

export const searchUsersByEmail = async (email: string, maxResults: number = 20): Promise<SearchableUser[]> => {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return [];
  
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('email', '>=', emailLower),
    where('email', '<=', emailLower + '\uf8ff'),
    limit(maxResults)
  );
  
  const usersSnap = await getDocs(q);
  return usersSnap.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName || '',
      email: data.email || '',
      photoURL: data.photoURL || '',
      usernameLower: data.usernameLower,
    };
  });
};

export const getUserById = async (uid: string): Promise<SearchableUser | null> => {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return null;
  
  const data = userDoc.data();
  return {
    uid: userDoc.id,
    displayName: data.displayName || '',
    email: data.email || '',
    photoURL: data.photoURL || '',
    usernameLower: data.usernameLower,
  };
};

/**
 * Fetch user data with caching and debouncing
 * Prefers direct Firestore access (faster, cheaper) over cloud functions
 * Only uses cloud function if Firestore access fails
 */
export const fetchUser = async (uid: string, useCache: boolean = true): Promise<UserData | null> => {
  if (!uid) return null;

  // Check cache first
  if (useCache) {
    const cached = userCache.get(uid);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        // Return cached data if still valid
        return cached.data;
      }
      // If there's a pending request, wait for it
      if (cached.pending) {
        return cached.pending;
      }
    }
  }

  // Check if there's already a pending call for this UID (debouncing)
  const pending = pendingCalls.get(uid);
  if (pending) {
    return pending;
  }

  // Create new fetch promise
  const fetchPromise = (async () => {
    try {
      // Try direct Firestore access first (faster and cheaper)
      const userData = await getUserById(uid);
      
      if (userData) {
        // Convert to UserData format
        const fullUserData: UserData = {
          ...userData,
          createdAt: undefined,
          privacy: undefined,
          profile: undefined,
        };
        
        // Cache the result
        if (useCache) {
          userCache.set(uid, {
            data: fullUserData,
            timestamp: Date.now(),
          });
        }
        
        return fullUserData;
      }

      // If Firestore fails or returns null, try cloud function
      // (only if we need privacy settings or profile data)
      const functions = getFunctions();
      const getUserFunction = httpsCallable(functions, 'getUser');
      const result = await getUserFunction({ uid });
      const data = result.data as { success: boolean; user: UserData };
      
      if (data.success && data.user) {
        // Cache the result
        if (useCache) {
          userCache.set(uid, {
            data: data.user,
            timestamp: Date.now(),
          });
        }
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('[UserSearch] Error fetching user:', error);
      // Cache null result to prevent repeated failed calls
      if (useCache) {
        userCache.set(uid, {
          data: null,
          timestamp: Date.now(),
        });
      }
      return null;
    } finally {
      // Remove from pending calls
      pendingCalls.delete(uid);
    }
  })();

  // Store pending call for debouncing
  pendingCalls.set(uid, fetchPromise);
  
  // Cache the pending promise
  if (useCache) {
    userCache.set(uid, {
      data: null,
      timestamp: Date.now(),
      pending: fetchPromise,
    });
  }

  return fetchPromise;
};

/**
 * Fetch multiple users by UIDs with caching and batching
 * Prefers direct Firestore access, batches requests efficiently
 */
export const fetchUsers = async (uids: string[], useCache: boolean = true): Promise<UserData[]> => {
  if (!uids || uids.length === 0) return [];

  // Remove duplicates
  const uniqueUids = [...new Set(uids)];
  
  // Check cache first
  const cachedUsers: UserData[] = [];
  const uncachedUids: string[] = [];
  
  if (useCache) {
    for (const uid of uniqueUids) {
      const cached = userCache.get(uid);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_TTL && cached.data) {
          cachedUsers.push(cached.data);
        } else if (cached.pending) {
          // Wait for pending request
          const pendingUser = await cached.pending;
          if (pendingUser) {
            cachedUsers.push(pendingUser);
          } else {
            uncachedUids.push(uid);
          }
        } else {
          uncachedUids.push(uid);
        }
      } else {
        uncachedUids.push(uid);
      }
    }
  } else {
    uncachedUids.push(...uniqueUids);
  }

  // If all users are cached, return them
  if (uncachedUids.length === 0) {
    return cachedUsers;
  }

  // Batch fetch uncached users
  // Try direct Firestore first (cheaper)
  try {
    const userPromises = uncachedUids.map(uid => getUserById(uid));
    const firestoreUsers = await Promise.all(userPromises);
    
    const fetchedUsers: UserData[] = [];
    for (let i = 0; i < firestoreUsers.length; i++) {
      const user = firestoreUsers[i];
      if (user) {
        const fullUserData: UserData = {
          ...user,
          createdAt: undefined,
          privacy: undefined,
          profile: undefined,
        };
        fetchedUsers.push(fullUserData);
        
        // Cache the result
        if (useCache) {
          userCache.set(uncachedUids[i], {
            data: fullUserData,
            timestamp: Date.now(),
          });
        }
      }
    }

    // If we got all users from Firestore, return them
    if (fetchedUsers.length === uncachedUids.length) {
      return [...cachedUsers, ...fetchedUsers];
    }
  } catch (error) {
    console.error('[UserSearch] Error fetching users from Firestore:', error);
  }

  // Fallback to cloud function only if needed (for privacy/profile data)
  // Batch requests to cloud function (max 50 at a time)
  const batchSize = 50;
  const allUsers: UserData[] = [...cachedUsers];
  
  for (let i = 0; i < uncachedUids.length; i += batchSize) {
    const batch = uncachedUids.slice(i, i + batchSize);
    try {
      const functions = getFunctions();
      const getUsersFunction = httpsCallable(functions, 'getUsers');
      const result = await getUsersFunction({ uids: batch });
      const data = result.data as { success: boolean; users: UserData[] };
      
      if (data.success && data.users) {
        allUsers.push(...data.users);
        
        // Cache all fetched users
        if (useCache) {
          data.users.forEach((user) => {
            userCache.set(user.uid, {
              data: user,
              timestamp: Date.now(),
            });
          });
        }
      }
    } catch (error) {
      console.error('[UserSearch] Error fetching users batch:', error);
    }
  }

  return allUsers;
};

/**
 * Search/list all users with pagination
 * Uses cloud function for better performance and security
 */
export const searchAllUsers = async (
  searchTerm?: string,
  limit: number = 50,
  lastDocId?: string
): Promise<{
  users: UserData[];
  hasMore: boolean;
  lastDocId?: string;
}> => {
  try {
    const functions = getFunctions();
    const searchUsersFunction = httpsCallable(functions, 'searchAllUsers');
    const result = await searchUsersFunction({
      searchTerm,
      limit,
      lastDocId,
    });
    const data = result.data as {
      success: boolean;
      users: UserData[];
      hasMore: boolean;
      lastDocId?: string;
    };

    if (data.success && data.users) {
      // Cache all fetched users
      data.users.forEach((user) => {
        userCache.set(user.uid, {
          data: user,
          timestamp: Date.now(),
        });
      });

      return {
        users: data.users,
        hasMore: data.hasMore,
        lastDocId: data.lastDocId,
      };
    }

    return { users: [], hasMore: false };
  } catch (error) {
    console.error('[UserSearch] Error searching users:', error);
    // Fallback to direct Firestore access
    return searchUsersByUsernameDirect(searchTerm || '', limit);
  }
};

/**
 * Fallback: Direct Firestore search (used if cloud function fails)
 */
const searchUsersByUsernameDirect = async (
  searchTerm: string,
  limitCount: number
): Promise<{
  users: UserData[];
  hasMore: boolean;
  lastDocId?: string;
}> => {
  try {
    const usersRef = collection(db, 'users');
    const searchLower = searchTerm.toLowerCase().trim();
    
    let q;
    if (searchLower) {
      q = query(
        usersRef,
        where('usernameLower', '>=', searchLower),
        where('usernameLower', '<=', searchLower + '\uf8ff'),
        limit(limitCount)
      );
    } else {
      q = query(usersRef, limit(limitCount));
    }

    const usersSnap = await getDocs(q);
    const users: UserData[] = usersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || '',
        email: data.email || '',
        photoURL: data.photoURL || '',
        usernameLower: data.usernameLower,
      };
    });

    return {
      users,
      hasMore: usersSnap.docs.length === limitCount,
      lastDocId: usersSnap.docs[usersSnap.docs.length - 1]?.id,
    };
  } catch (error) {
    console.error('[UserSearch] Error in direct search:', error);
    return { users: [], hasMore: false };
  }
};

/**
 * Clear user cache (useful when user data is updated)
 */
export const clearUserCache = (uid?: string): void => {
  if (uid) {
    userCache.delete(uid);
    pendingCalls.delete(uid);
  } else {
    userCache.clear();
    pendingCalls.clear();
  }
};

