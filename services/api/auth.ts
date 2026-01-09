import AsyncStorage from '@react-native-async-storage/async-storage';
import { apolloClient, updateAuthToken, getAuthToken } from './client';
import { REGISTER, LOGIN, REFRESH_TOKEN, UPDATE_PROFILE, GET_ME } from './queries';
import { User, UserProfile } from '../../types';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    photoURL: string;
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
    const { data } = await apolloClient.mutate({
      mutation: REGISTER,
      variables: {
        email,
        password,
        displayName,
        username,
      },
    });

    if (!data?.register) {
      throw new Error('Registration failed');
    }

    const { token, refreshToken, user } = data.register;

    // Store tokens
    await updateAuthToken(token);
    await AsyncStorage.setItem('refreshToken', refreshToken);

    return { token, refreshToken, user };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to sign up';
    throw new Error(message);
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: LOGIN,
      variables: {
        email,
        password,
      },
    });

    if (!data?.login) {
      throw new Error('Login failed');
    }

    const { token, refreshToken, user } = data.login;

    // Store tokens
    await updateAuthToken(token);
    await AsyncStorage.setItem('refreshToken', refreshToken);

    return { token, refreshToken, user };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to sign in';
    throw new Error(message);
  }
};

/**
 * Sign out
 */
export const logout = async (): Promise<void> => {
  try {
    await updateAuthToken(null);
    await AsyncStorage.removeItem('refreshToken');
    await apolloClient.clearStore();
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

    const { data } = await apolloClient.query({
      query: GET_ME,
      fetchPolicy: 'network-only',
    });

    if (!data?.me) {
      return null;
    }

    return {
      uid: data.me.id,
      email: data.me.email,
      profile: data.me.profile ? {
        age: data.me.profile.age || 0,
        weight: data.me.profile.weight || 0,
        height: data.me.profile.height || 0,
        activityLevel: (data.me.profile.activityLevel as any) || 'sedentary',
        gender: (data.me.profile.gender as any) || 'other',
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
    const { data } = await apolloClient.query({
      query: GET_ME,
      fetchPolicy: 'network-only',
    });

    if (!data?.me?.profile) {
      return null;
    }

    return {
      age: data.me.profile.age || 0,
      weight: data.me.profile.weight || 0,
      height: data.me.profile.height || 0,
      activityLevel: (data.me.profile.activityLevel as any) || 'sedentary',
      gender: (data.me.profile.gender as any) || 'other',
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
    await apolloClient.mutate({
      mutation: UPDATE_PROFILE,
      variables: {
        profile: {
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
          activityLevel: profile.activityLevel,
          gender: profile.gender,
        },
      },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to save profile';
    throw new Error(message);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const { data } = await apolloClient.mutate({
      mutation: REFRESH_TOKEN,
      variables: {
        refreshToken,
      },
    });

    if (!data?.refreshToken) {
      return null;
    }

    const { token, refreshToken: newRefreshToken } = data.refreshToken;

    // Update tokens
    await updateAuthToken(token);
    await AsyncStorage.setItem('refreshToken', newRefreshToken);

    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await logout();
    return null;
  }
};

// OAuth sign-in functions (to be implemented with backend later)
export const signInWithGoogle = async (): Promise<void> => {
  // TODO: Implement Google OAuth with backend
  throw new Error('Google sign-in not yet implemented with GraphQL backend');
};

export const signInWithApple = async (): Promise<void> => {
  // TODO: Implement Apple OAuth with backend
  throw new Error('Apple sign-in not yet implemented with GraphQL backend');
};

