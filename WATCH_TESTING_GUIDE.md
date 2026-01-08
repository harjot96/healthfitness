# Apple Watch Testing Guide

## ⚠️ Important: Real Devices Required

**WatchConnectivity framework does NOT work in simulators.** You MUST test on:
- **Real iPhone** (paired with real Apple Watch)
- **Real Apple Watch** (with the watch app installed)

## Testing Requirements

### 1. Device Setup
- ✅ iPhone and Apple Watch must be paired
- ✅ Both devices must be signed in to the same Apple ID
- ✅ Watch app must be installed on the watch
- ✅ Both devices should be nearby (Bluetooth range)

### 2. Connection Flow

1. **Open iPhone App**
   - Navigate to Profile tab
   - Tap "Connect Watch"
   - Follow connection instructions

2. **Verify Connection**
   - Check console logs for `[WatchConnection] ✅ Watch connected successfully`
   - Profile screen should show "Connected" status

3. **Test Workout Sync**
   - Start a workout on the Apple Watch
   - Complete the workout
   - Check iPhone app - workout should appear automatically
   - Check Firebase - workout data should be saved

## Debugging Connection Issues

### Check Console Logs

Look for these log messages:

**Successful Connection:**
```
[WatchConnection] ===== CONNECTION ATTEMPT STARTED =====
[WatchConnection] Watch reachable result: true
[WatchConnection] ✅ Watch connected successfully
```

**Workout Sync:**
```
[WatchSync] ===== WORKOUT SYNC STARTED =====
[WatchSync] Received workout data: {...}
[WatchSync] ✅ Workout synced successfully to Firebase
```

### Common Issues

1. **"Watch is not reachable"**
   - Make sure watch is paired with iPhone
   - Check watch is nearby and unlocked
   - Verify watch app is installed
   - **Ensure you're using REAL devices, not simulators**

2. **"WatchConnectivityModule is not available"**
   - This means the native module isn't loaded
   - Check that the watch app target is properly configured
   - Rebuild the app on real devices

3. **Workout not syncing**
   - Check watch app logs for errors
   - Verify Firebase permissions
   - Check network connectivity
   - Look for `[WatchSync]` logs in iPhone app

### Testing Checklist

- [ ] iPhone and Watch are real devices (not simulators)
- [ ] Devices are paired and nearby
- [ ] Watch app is installed on watch
- [ ] User is authenticated in iPhone app
- [ ] Connection shows as "Connected" in Profile
- [ ] Console shows successful connection logs
- [ ] Workout started on watch
- [ ] Workout completed on watch
- [ ] Workout appears in iPhone app
- [ ] Workout data saved to Firebase

## Simulator Limitations

**What WON'T work in simulators:**
- ❌ WatchConnectivity framework
- ❌ Watch reachability checks
- ❌ Data transfer between iPhone and Watch
- ❌ Real-time workout syncing

**What WILL work in simulators:**
- ✅ App UI and navigation
- ✅ Firebase integration
- ✅ Local data storage
- ✅ All other app features

## Next Steps

If connection still doesn't work on real devices:

1. Check native iOS bridge code (`WatchConnectivityBridge.swift`)
2. Verify watch app is sending data correctly
3. Check Firebase security rules
4. Review console logs for detailed error messages
5. Test with a simple message first before testing workouts

