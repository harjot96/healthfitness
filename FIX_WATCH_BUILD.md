# Fix Watch Build - Info.plist Conflict

## The Error
```
error: Multiple commands produce '.../Info.plist'
Target has copy command from 'Info.plist'
Target has process command with output 'Info.plist'
```

## Solution: Remove Info.plist from Copy Bundle Resources

### Step-by-Step Fix:

1. **Open Xcode:**
   ```bash
   open ios/healthfitnessapp.xcworkspace
   ```

2. **Select the `HealthFitnessWatch Watch App` target**

3. **Go to Build Phases tab**

4. **Expand "Copy Bundle Resources"**

5. **Find `Info.plist` in the list** (if it's there)

6. **Select `Info.plist` and click the minus (-) button** to remove it

7. **Clean Build Folder:**
   - Product > Clean Build Folder (⇧⌘K)

8. **Build again:**
   - Product > Build (⌘B)

## Alternative Solution: Use Build Settings Only

If removing from Copy Bundle Resources doesn't work:

1. **Delete the physical Info.plist file** from the project (right-click > Delete > Move to Trash)

2. **Select `HealthFitnessWatch Watch App` target**

3. **Go to Build Settings tab**

4. **Search for "Generate Info.plist File"**
   - Set it to **YES**

5. **Search for "Info.plist Values"** or add as **Custom Build Settings**:
   - Add these keys:
     ```
     NSHealthShareUsageDescription = "This app needs access to your health data to track your steps, calories, and activity on your Apple Watch."
     NSHealthUpdateUsageDescription = "This app needs to update your health data to track your fitness progress and workouts on your Apple Watch."
     WKCompanionAppBundleIdentifier = com.healthfitness.app
     ```

6. **Clean and rebuild**

## Quick Command Line Check

To see what's in Copy Bundle Resources, you can check the project file, but it's easier to do it in Xcode UI.

## Why This Happens

Xcode is trying to:
- **Copy** Info.plist as a resource file (wrong)
- **Process** Info.plist to generate the final Info.plist (correct)

We only want the **process** step, not the copy step.

