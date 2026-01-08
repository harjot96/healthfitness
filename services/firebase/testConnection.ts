import { db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from './config';

/**
 * Test Firestore connection and permissions
 * Call this function to verify Firebase is working correctly
 */
export const testFirestoreConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log('[Firestore Test] Testing connection for user:', user.uid);
    
    // Try to write a test document
    const testRef = doc(db, 'users', user.uid, 'test', 'connection');
    await setDoc(testRef, {
      timestamp: new Date().toISOString(),
      test: true,
    });
    console.log('[Firestore Test] Write test successful');

    // Try to read it back
    const testSnap = await getDoc(testRef);
    if (testSnap.exists()) {
      console.log('[Firestore Test] Read test successful');
      console.log('[Firestore Test] Data:', testSnap.data());
      return { success: true };
    } else {
      return { success: false, error: 'Test document not found after write' };
    }
  } catch (error: any) {
    console.error('[Firestore Test] Connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};




