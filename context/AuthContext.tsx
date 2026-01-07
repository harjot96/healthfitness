import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { signIn, signUp, logout, getUserProfile, saveUserProfile, signInWithGoogle, signInWithApple } from '../services/firebase/auth';
import { User, UserProfile } from '../types';

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
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleSignUp = async (email: string, password: string, displayName?: string) => {
    await signUp(email, password, displayName);
  };

  const handleSignOut = async () => {
    await logout();
    setUserProfile(null);
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

