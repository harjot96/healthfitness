# Firestore Security Rules Setup

## Error: Missing or insufficient permissions

This error occurs because Firestore security rules haven't been configured. Follow these steps to fix it:

## Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fitness-712c2**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

## Step 2: Apply Security Rules

Copy and paste the following security rules into the Firestore Rules editor:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can read/write their own profile
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      // Health subcollection - users can read/write their own health data
      match /health/{date} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

## Step 3: Publish Rules

1. Click the **Publish** button
2. Wait for the confirmation message
3. Rules will be active immediately

## What These Rules Do

- **Authentication Required**: Only authenticated users can access data
- **User Isolation**: Users can only read/write their own data
- **Path Protection**: 
  - `users/{userId}` - User profile data
  - `users/{userId}/health/{date}` - Daily health data (meals, workouts, water, fasting, etc.)

## Testing

After applying the rules:
1. Restart your app
2. Sign in with a user account
3. The "Missing or insufficient permissions" error should be resolved

## Alternative: Temporary Development Rules (NOT FOR PRODUCTION)

If you need to test quickly during development, you can use these rules (⚠️ **ONLY FOR DEVELOPMENT**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: These rules allow any authenticated user to read/write any document. Only use for development and testing!

## Production Best Practices

For production, always use the specific rules above that ensure users can only access their own data.


