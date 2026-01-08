# Fix "Multiple commands produce Info.plist" Error

## The Problem

Xcode is trying to both **copy** and **process** the Info.plist file, causing a conflict.

## Solution: Remove Info.plist from Copy Bundle Resources

### Step 1: Check Build Phases

1. **Select the `HealthFitnessWatch Watch App` target** in Xcode
2. Go to **Build Phases** tab
3. Expand **"Copy Bundle Resources"**
4. **Look for `Info.plist`** in the list
5. If you see it, **select it and click the minus (-) button** to remove it

### Step 2: Verify Info.plist is NOT in Resources

The Info.plist should:
- ✅ Be in the project (for editing)
- ✅ Be referenced in Build Settings > INFOPLIST_FILE
- ❌ NOT be in "Copy Bundle Resources" build phase

### Step 3: Alternative - Use Build Settings Only

If the above doesn't work, you can remove the physical Info.plist file and configure everything through Build Settings:

1. **Select the `HealthFitnessWatch Watch App` target**
2. Go to **Build Settings** tab
3. Search for **"Info.plist"**
4. Set **"Generate Info.plist File"** to **NO**
5. Set **"Info.plist File"** to: `HealthFitnessWatch Watch App/Info.plist`
6. Add the HealthKit keys directly in Build Settings:
   - Search for **"Info.plist Values"** or add as **"User-Defined Settings"**
   - Add:
     - `NSHealthShareUsageDescription` = "This app needs access to your health data to track your steps, calories, and activity on your Apple Watch."
     - `NSHealthUpdateUsageDescription` = "This app needs to update your health data to track your fitness progress and workouts on your Apple Watch."

### Step 4: Clean and Rebuild

1. **Product > Clean Build Folder** (⇧⌘K)
2. **Product > Build** (⌘B)

## Quick Fix (Recommended)

The easiest solution is to:

1. **Remove Info.plist from Copy Bundle Resources** (Step 1 above)
2. **Keep the Info.plist file** in the project
3. **Set INFOPLIST_FILE** in Build Settings to point to it

This way Xcode will process it (not copy it), which is what we want.

