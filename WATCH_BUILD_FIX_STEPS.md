# Fix Watch Build - Step by Step

## The Problem
Xcode is trying to both copy and process Info.plist, causing a conflict.

## Solution: Use Build Settings (GENERATE_INFOPLIST_FILE = YES)

Since your watch target has `GENERATE_INFOPLIST_FILE = YES`, Xcode auto-generates Info.plist. We need to add HealthKit keys via Build Settings.

### Steps in Xcode:

1. **Open Xcode:**
   ```bash
   open ios/healthfitnessapp.xcworkspace
   ```

2. **Select `HealthFitnessWatch Watch App` target**

3. **Go to Build Settings tab**

4. **Search for "Info.plist"** or scroll to find "Info.plist Values"

5. **Add these keys** (click the + button to add each):

   **Key:** `INFOPLIST_KEY_NSHealthShareUsageDescription`
   **Value:** `This app needs access to your health data to track your steps, calories, and activity on your Apple Watch.`

   **Key:** `INFOPLIST_KEY_NSHealthUpdateUsageDescription`
   **Value:** `This app needs to update your health data to track your fitness progress and workouts on your Apple Watch.`

   **Key:** `INFOPLIST_KEY_WKCompanionAppBundleIdentifier`
   **Value:** `com.healthfitness.app`

6. **Verify these settings exist:**
   - `GENERATE_INFOPLIST_FILE` = `YES` ✅
   - `INFOPLIST_KEY_CFBundleDisplayName` = `HealthFitnessWatch` ✅

7. **Make sure Info.plist is NOT in "Copy Bundle Resources":**
   - Go to **Build Phases** tab
   - Expand **"Copy Bundle Resources"**
   - If you see `Info.plist`, remove it (select and click minus)

8. **Clean and Build:**
   - Product > Clean Build Folder (⇧⌘K)
   - Product > Build (⌘B)

## Alternative: If Build Settings Don't Work

If you can't add the keys via Build Settings UI:

1. **Set GENERATE_INFOPLIST_FILE to NO**
2. **Create Info.plist file** (I'll provide the content)
3. **Set INFOPLIST_FILE path** to point to it
4. **Make sure it's NOT in Copy Bundle Resources**

Let me know which approach works for you!

