# Firestore Default Database Configuration

## Database Name: (default)

Your Firestore database is using the default database name `(default)`. This is the standard configuration and works perfectly with the current setup.

## Current Configuration

The app is configured to use the default Firestore database:

```typescript
export const db = getFirestore(app);
```

This automatically connects to the `(default)` database in your Firebase project.

## Important: Security Rules

Even though the database name is correct, you **MUST** configure Firestore security rules for data to upload successfully.

### Step 1: Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select project: **fitness-712c2**
3. Click **Firestore Database** in left sidebar
4. Click **Rules** tab

### Step 2: Apply These Rules

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

### Step 3: Publish Rules
Click **Publish** button to apply the rules.

## Verify Database is Created

1. In Firebase Console → **Firestore Database**
2. You should see the database interface (not a "Create Database" button)
3. If you see "Create Database", click it and create the database first

## Data Structure

With the default database, your data will be stored as:

```
(default) database
└── users/
    └── {userId}/
        ├── profile (document)
        └── health/ (subcollection)
            └── {date}/ (document)
                ├── meals
                ├── workouts
                ├── waterEntries
                ├── fastingSession
                └── ... (other health data)
```

## Testing

After applying security rules:

1. **Check Console Logs**: Look for:
   - `[Firebase] Firestore database: (default)` - Confirms default DB
   - `[Firestore] Saving daily health data` - Shows save attempts
   - `[Firestore] Successfully saved` - Confirms success

2. **Test in App**: 
   - Add a meal
   - Add water entry
   - Start a workout
   - Check if data appears in Firebase Console

3. **Verify in Firebase Console**:
   - Go to Firestore Database → Data tab
   - Navigate to `users/{your-uid}/health/{today's-date}`
   - You should see your data

## Common Issues

### Issue: "Missing or insufficient permissions"
**Solution**: Apply the security rules above

### Issue: "Database not found"
**Solution**: Create the Firestore database in Firebase Console

### Issue: Data not appearing
**Solution**: 
1. Check console logs for errors
2. Verify user is authenticated
3. Verify security rules are published
4. Check network connection

## Default Database is Correct

The current configuration is correct for a default database. The issue is most likely:
1. **Security rules not configured** (90% of cases)
2. **Database not created** in Firebase Console
3. **User not authenticated**

Fix these and data should upload successfully!


