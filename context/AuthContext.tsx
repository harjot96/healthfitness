import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { signIn, signUp, logout, getUserProfile, saveUserProfile, signInWithGoogle, signInWithApple } from '../services/firebase/auth';
import { User, UserProfile } from '../types';
import { watchConnectivityService } from '../services/watch/WatchConnectivityService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  userProfile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
        };
        setUser(userData);
        
        // Sync authentication status to Apple Watch
        watchConnectivityService.sendUserAuthStatus(
          firebaseUser.uid,
          firebaseUser.email || ''
        ).catch(error => {
          console.debug('Watch not available for auth sync:', error);
        });
        
        // Load user profile
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        
        // Notify watch that user signed out
        watchConnectivityService.sendUserSignedOut().catch(error => {
          console.debug('Watch not available for sign out sync:', error);
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen for auth status requests from watch
  useEffect(() => {
    const unsubscribe = watchConnectivityService.onRequestAuthStatus(() => {
      // Watch is requesting auth status, send current user if available
      if (user) {
        watchConnectivityService.sendUserAuthStatus(
          user.uid,
          user.email
        ).catch(error => {
          console.debug('Watch not available for auth status response:', error);
        });
      } else {
        watchConnectivityService.sendUserSignedOut().catch(error => {
          console.debug('Watch not available for sign out response:', error);
        });
      }
    });

    return unsubscribe;
  }, [user]);

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleSignUp = async (email: string, password: string, displayName?: string) => {
    await signUp(email, password, displayName);
  };

  const handleSignOut = async () => {
    await logout();
    setUserProfile(null);
    
    // Notify watch that user signed out
    watchConnectivityService.sendUserSignedOut().catch(error => {
      console.debug('Watch not available for sign out sync:', error);
    });
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    if (!user) throw new Error('User not authenticated');
    await saveUserProfile(user.uid, profile);
    setUserProfile(profile);
  };

  const handleSignInWithGoogle = async () => {
    await signInWithGoogle();
  };

  const handleSignInWithApple = async () => {
    await signInWithApple();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithApple: handleSignInWithApple,
        signOut: handleSignOut,
        updateProfile: handleUpdateProfile,
        userProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

