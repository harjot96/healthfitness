import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn, signUp, logout, getUserProfile, saveUserProfile, signInWithGoogle, signInWithApple, getCurrentUser, refreshAccessToken } from '../services/api/auth';
import { User, UserProfile } from '../types';
import { watchConnectivityService } from '../services/watch/WatchConnectivityService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Check if we have a token
        const token = await AsyncStorage.getItem('authToken');
        
        if (token) {
          // Try to get current user
          const currentUser = await getCurrentUser();
          
          if (currentUser && mounted) {
            setUser(currentUser);
            
            // Sync authentication status to Apple Watch
            watchConnectivityService.sendUserAuthStatus(
              currentUser.uid,
              currentUser.email
            ).catch(error => {
              console.debug('Watch not available for auth sync:', error);
            });
            
            // Load user profile
            try {
              const profile = await getUserProfile();
              if (mounted) {
                setUserProfile(profile);
              }
            } catch (error) {
              console.error('Error loading user profile:', error);
            }
          } else if (mounted) {
            // Token might be expired, try to refresh
            const newToken = await refreshAccessToken();
            if (newToken) {
              const refreshedUser = await getCurrentUser();
              if (refreshedUser && mounted) {
                setUser(refreshedUser);
                const profile = await getUserProfile();
                if (mounted) {
                  setUserProfile(profile);
                }
              }
            } else if (mounted) {
              // No valid token, clear everything
              setUser(null);
              setUserProfile(null);
            }
          }
        } else if (mounted) {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
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
    try {
      const response = await signIn(email, password);
      const userData: User = {
        uid: response.user.id,
        email: response.user.email,
      };
      setUser(userData);
      
      // Load profile
      const profile = await getUserProfile();
      setUserProfile(profile);
      
      // Sync to watch
      watchConnectivityService.sendUserAuthStatus(
        userData.uid,
        userData.email
      ).catch(error => {
        console.debug('Watch not available for auth sync:', error);
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleSignUp = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await signUp(email, password, displayName);
      const userData: User = {
        uid: response.user.id,
        email: response.user.email,
      };
      setUser(userData);
      
      // Load profile
      const profile = await getUserProfile();
      setUserProfile(profile);
      
      // Sync to watch
      watchConnectivityService.sendUserAuthStatus(
        userData.uid,
        userData.email
      ).catch(error => {
        console.debug('Watch not available for auth sync:', error);
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setUserProfile(null);
    
    // Notify watch that user signed out
    watchConnectivityService.sendUserSignedOut().catch(error => {
      console.debug('Watch not available for sign out sync:', error);
    });
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    if (!user) throw new Error('User not authenticated');
    await saveUserProfile(profile);
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

