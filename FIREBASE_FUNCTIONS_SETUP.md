# Firebase Cloud Functions Setup

This document explains how to set up and deploy Firebase Cloud Functions for fasting completion notifications.

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project initialized: `firebase login` and `firebase init`

## Setup Instructions

### 1. Initialize Firebase Functions (if not already done)

```bash
cd functions
npm install
```

### 2. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:sendFastingCompletionNotification
firebase deploy --only functions:onFastingCompleted
```

### 3. Functions Overview

#### `sendFastingCompletionNotification`
- **Type**: HTTP Callable Function
- **Purpose**: Called directly from the app when fasting completes
- **Triggers**: Manual trigger from app
- **Works**: Even when app is closed (called from server-side completion)

#### `onFastingCompleted`
- **Type**: Firestore Trigger
- **Purpose**: Automatically detects when fasting session is completed in Firestore
- **Triggers**: Firestore document update
- **Works**: Automatically when fasting data is updated in Firestore

## FCM Token Setup

For notifications to work, users need to register their FCM (Firebase Cloud Messaging) tokens. 

### Client-side FCM Token Registration

Add this to your app initialization (e.g., in `App.tsx` or `AuthContext.tsx`):

```typescript
import { getMessaging, getToken } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { db, app } from './services/firebase/config';

// Register FCM token
const registerFCMToken = async (userId: string) => {
  try {
    // Request permission for notifications
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.granted) {
      // Get FCM token (you may need to use expo-notifications for Expo)
      const token = await Notifications.getExpoPushTokenAsync();
      
      // Save token to Firestore
      await setDoc(doc(db, 'users', userId), {
        fcmToken: token.data,
        fcmTokenUpdatedAt: new Date(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error registering FCM token:', error);
  }
};
```

## Testing

### Test Locally

```bash
# Start emulator
firebase emulators:start --only functions,firestore

# Test function
# Use Firebase Console or call from your app
```

### Test in Production

1. Complete a fasting session that reaches target duration
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify notification is received on device

## Troubleshooting

### Function not found error
- Make sure functions are deployed: `firebase deploy --only functions`
- Check function name matches exactly

### No FCM token error
- Ensure FCM token is registered in Firestore under `users/{userId}.fcmToken`
- Check notification permissions are granted

### Notification not received
- Verify FCM token is valid
- Check device notification settings
- Review Firebase Functions logs for errors

