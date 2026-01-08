# Watch App Info.plist Setup

## Adding Info.plist to Watch Target

After creating the `Info.plist` file, you need to add it to your watch app target in Xcode:

### Method 1: Through Xcode UI

1. **Open Xcode** with your workspace:
   ```bash
   open ios/healthfitnessapp.xcworkspace
   ```

2. **Select the `HealthFitnessWatch Watch App` target**

3. Go to **Build Settings** tab

4. Search for **"Info.plist File"** or **"INFOPLIST_FILE"**

5. Set the value to:
   ```
   HealthFitnessWatch Watch App/Info.plist
   ```

### Method 2: Add File to Project

1. **Right-click** on `HealthFitnessWatch Watch App` group in Project Navigator

2. Select **"Add Files to 'HealthFitnessWatch'..."**

3. Navigate to and select:
   ```
   ios/HealthFitnessWatch Watch App/Info.plist
   ```

4. In the dialog:
   - ✅ **"Copy items if needed"** - UNCHECKED (file is already in project)
   - ✅ **"Create groups"** - Selected
   - ✅ **"Add to targets"** - Check ONLY `HealthFitnessWatch Watch App`
   - Click **Add**

### Method 3: Verify in Build Settings

1. Select **HealthFitnessWatch Watch App** target
2. Go to **Build Settings**
3. Search for **"INFOPLIST_FILE"**
4. Verify it points to: `HealthFitnessWatch Watch App/Info.plist`

## Required Keys

The Info.plist must include:

- ✅ **NSHealthShareUsageDescription** - For reading health data
- ✅ **NSHealthUpdateUsageDescription** - For writing workout data (REQUIRED for workouts)
- ✅ **WKCompanionAppBundleIdentifier** - Links to main iPhone app

## Verify It's Working

1. **Build the watch app** (⌘B)
2. **Run on simulator or device**
3. The HealthKit permission dialog should appear when you start a workout
4. No more "NSHealthUpdateUsageDescription must be set" errors

## Troubleshooting

### Still seeing the error?

1. **Clean build folder**: Product > Clean Build Folder (⇧⌘K)
2. **Check target membership**: Info.plist should only be in Watch target
3. **Verify path**: Build Settings > INFOPLIST_FILE should be correct
4. **Delete derived data**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

### Info.plist not found?

- Make sure the file is in: `ios/HealthFitnessWatch Watch App/Info.plist`
- Check that it's added to the Watch target (not main app target)
- Verify the path in Build Settings matches the actual file location

