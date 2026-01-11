import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, updateAuthToken, getAuthToken } from './client';
import { User, UserProfile } from '../../types';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
  };
}

/**
 * Register a new user
 */
export const signUp = async (
  email: string,
  password: string,
  displayName?: string,
  username?: string
): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<{
      token: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        displayName: string;
        photoURL?: string;
      };
    }>('/auth/register', {
      email,
      password,
      displayName,
      username,
    }, { skipAuth: true });

    // Store tokens
    await updateAuthToken(response.token);
    await apiClient.updateRefreshToken(response.refreshToken);

    return {
      token: response.token,
      refreshToken: response.refreshToken,
      user: response.user,
    };
  } catch (error: any) {
    const message = error.message || 'Failed to sign up';
    throw new Error(message);
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<{
      token: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        displayName: string;
        photoURL?: string;
      };
    }>('/auth/login', {
      email,
      password,
    }, { skipAuth: true });

    // Store tokens
    await updateAuthToken(response.token);
    await apiClient.updateRefreshToken(response.refreshToken);

    return {
      token: response.token,
      refreshToken: response.refreshToken,
      user: response.user,
    };
  } catch (error: any) {
    const message = error.message || 'Failed to sign in';
    throw new Error(message);
  }
};

/**
 * Sign out
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.clearTokens();
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

/**
 * Get current user from token
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }

    const user = await apiClient.get<{
      id: string;
      email: string;
      displayName: string;
      photoURL?: string;
      profile?: {
        age?: number;
        weight?: number;
        height?: number;
        activityLevel?: string;
        gender?: string;
      };
    }>('/auth/me');

    return {
      uid: user.id,
      email: user.email,
      profile: user.profile ? {
        age: user.profile.age || 0,
        weight: user.profile.weight || 0,
        height: user.profile.height || 0,
        activityLevel: (user.profile.activityLevel as any) || 'sedentary',
        gender: (user.profile.gender as any) || 'other',
      } : undefined,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const user = await apiClient.get<{
      profile?: {
        age?: number;
        weight?: number;
        height?: number;
        activityLevel?: string;
        gender?: string;
      };
    }>('/auth/me');

    if (!user.profile) {
      return null;
    }

    return {
      age: user.profile.age || 0,
      weight: user.profile.weight || 0,
      height: user.profile.height || 0,
      activityLevel: (user.profile.activityLevel as any) || 'sedentary',
      gender: (user.profile.gender as any) || 'other',
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Save user profile
 */
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await apiClient.put('/auth/profile', {
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      activityLevel: profile.activityLevel,
      gender: profile.gender,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to save profile';
    throw new Error(message);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await apiClient.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await apiClient.post<{
      token: string;
      refreshToken: string;
    }>('/auth/refresh', {
      refreshToken,
    }, { skipAuth: true });

    // Update tokens
    await updateAuthToken(response.token);
    await apiClient.updateRefreshToken(response.refreshToken);

    return response.token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await logout();
    return null;
  }
};

// OAuth sign-in functions (to be implemented with backend later)
export const signInWithGoogle = async (): Promise<void> => {
  // TODO: Implement Google OAuth with backend
  throw new Error('Google sign-in not yet implemented');
};

export const signInWithApple = async (): Promise<void> => {
  // TODO: Implement Apple OAuth with backend
  throw new Error('Apple sign-in not yet implemented');
};
