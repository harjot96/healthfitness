import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  updateProfile,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { User, UserProfile } from '../../types';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

export const signUp = async (email: string, password: string, displayName?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign up');
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
};

export const saveUserProfile = async (uid: string, profile: UserProfile) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { profile }, { merge: true });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to save profile');
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().profile as UserProfile;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get profile');
  }
};

// Google Sign-In using Firebase Web OAuth
// Note: You need to configure Google OAuth in Firebase Console:
// 1. Go to Firebase Console > Authentication > Sign-in method
// 2. Enable Google Sign-in
// 3. Get your Web Client ID from Project Settings > General > Your apps > Web app
export const signInWithGoogle = async () => {
  try {
    // Use Expo's proxy server which provides a valid HTTPS redirect URI
    // This generates: https://auth.expo.io/@username/slug or similar
    // This is a valid HTTPS domain that Google OAuth accepts
    const redirectUri = AuthSession.makeRedirectUri();
    
    console.log('[Google Sign-In] Redirect URI:', redirectUri);
    console.log('[Google Sign-In] Add this HTTPS URI to Google Cloud Console > OAuth 2.0 Client > Authorized redirect URIs');

    // Firebase OAuth configuration
    // IMPORTANT: Replace with your actual Web Client ID from Firebase Console
    // Project Settings > General > Your apps > Web app > OAuth 2.0 Client IDs
    // The Web Client ID looks like: 123456789-abc123def456.apps.googleusercontent.com
    const webClientId ="1037172894910-88rfbr0frd06svqchvioievp5ot5sv8l.apps.googleusercontent.com";
    
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const request = new AuthSession.AuthRequest({
      clientId: webClientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      usePKCE: false,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params.id_token) {
      // Create Firebase credential with the ID token
      const credential = GoogleAuthProvider.credential(result.params.id_token);
      const userCredential = await signInWithCredential(auth, credential);
      
      // Create user profile if it doesn't exist
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
        });
      }

      return userCredential.user;
    } else {
      throw new Error('Google sign-in was cancelled or failed');
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    if (error.message?.includes('cancelled') || error.message?.includes('dismiss')) {
      throw new Error('Google sign-in was cancelled');
    }
    throw new Error(error.message || 'Failed to sign in with Google. Please configure Google OAuth in Firebase Console.');
  }
};

// Apple Sign-In (iOS only)
export const signInWithApple = async () => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create Firebase credential
    const { identityToken } = credential;
    if (!identityToken) {
      throw new Error('Apple Sign-In failed - no identity token');
    }

    const provider = new OAuthProvider('apple.com');
    // Note: nonce is optional for Apple Sign-In with Firebase
    const firebaseCredential = provider.credential({
      idToken: identityToken,
    });

    // Sign in with Firebase
    const userCredential = await signInWithCredential(auth, firebaseCredential);

    // Create user profile if it doesn't exist
    const userRef = doc(db, 'users', userCredential.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: credential.email || userCredential.user.email,
        displayName: credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : userCredential.user.displayName,
      });
    }

    return userCredential.user;
  } catch (error: any) {
    console.error('Apple sign-in error:', error);
    if (error.code === 'ERR_REQUEST_CANCELED') {
      throw new Error('Apple Sign-In was cancelled');
    }
    throw new Error(error.message || 'Failed to sign in with Apple');
  }
};
