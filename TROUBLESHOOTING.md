# Troubleshooting: Firestore Data Not Uploading

## Common Issues and Solutions

### 1. Check Firestore Security Rules

**Most Common Issue**: Firestore security rules are blocking writes.

**Solution**: 
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `fitness-712c2`
3. Navigate to **Firestore Database** → **Rules**
4. Apply the rules from `firestore.rules` file
5. Click **Publish**

### 2. Check Console Logs

The app now includes detailed logging. Check your console for:

- `[Firebase] Initialized with project:` - Confirms Firebase is initialized
- `[HealthContext] User authenticated` - Confirms user is logged in
- `[Firestore] Saving daily health data` - Shows when save is attempted
- `[Firestore] Successfully saved` - Confirms successful save
- `[Firestore] Error` - Shows any errors with error codes

### 3. Verify User Authentication

Make sure the user is properly authenticated:
- Check if `user.uid` exists in console logs
- Verify user is signed in before trying to save data

### 4. Check Network Connection

- Ensure device/emulator has internet connection
- Check if Firebase services are accessible

### 5. Verify Firestore Database is Created

1. Go to Firebase Console
2. Navigate to **Firestore Database**
3. Make sure database is created (not just planned)
4. If not created, click **Create Database**
5. Choose **Start in test mode** (then update rules) or **Start in production mode**

### 6. Test Connection

You can test the Firestore connection by importing and calling:

```typescript
import { testFirestoreConnection } from './services/firebase/testConnection';

// Call this in your component
const result = await testFirestoreConnection();
console.log('Connection test:', result);
```

### 7. Common Error Codes

- **permission-denied**: Security rules are blocking access
  - Solution: Update Firestore security rules
  
- **unauthenticated**: User is not authenticated
  - Solution: Ensure user is signed in
  
- **not-found**: Document doesn't exist (this is normal for new data)
  - Solution: The app will create it automatically
  
- **failed-precondition**: Database not initialized
  - Solution: Create Firestore database in Firebase Console

### 8. Enable Firestore in Firebase Console

If Firestore is not enabled:
1. Go to Firebase Console
2. Click **Firestore Database** in left sidebar
3. Click **Create Database**
4. Choose location (closest to your users)
5. Choose security mode (test mode for development, then update rules)

### 9. Check Firebase Project Configuration

Verify `services/firebase/config.ts` has correct:
- `projectId`: `fitness-712c2`
- `apiKey`: Should match Firebase Console
- All other config values should match

### 10. Debug Steps

1. **Check Console Logs**: Look for `[Firestore]` prefixed messages
2. **Verify Authentication**: Check if user is logged in
3. **Test Save**: Try adding a meal or water entry
4. **Check Firebase Console**: Look in Firestore Database to see if data appears
5. **Check Rules**: Verify security rules are published

## Quick Test

Add this to any screen to test:

```typescript
import { testFirestoreConnection } from '../services/firebase/testConnection';

// In your component
useEffect(() => {
  const test = async () => {
    const result = await testFirestoreConnection();
    console.log('Firestore test result:', result);
  };
  test();
}, []);
```

## Still Not Working?

1. Check browser/device console for detailed error messages
2. Verify Firebase project is active and billing is enabled (if required)
3. Check Firebase status page for service outages
4. Try creating a test document manually in Firebase Console to verify database is working


