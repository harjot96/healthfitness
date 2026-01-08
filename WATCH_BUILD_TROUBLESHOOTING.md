# Watch App Build Troubleshooting

## Combine Framework Errors

If you're seeing errors like:
- "Type 'WorkoutManager' does not conform to protocol 'ObservableObject'"
- "Initializer 'init(wrappedValue:)' is not available due to missing import of defining module 'Combine'"

### Solution 1: Verify Imports

Make sure both files have `import Combine`:

**WorkoutManager.swift:**
```swift
import Foundation
import Combine  // ← Must be here
import HealthKit
import WatchKit
```

**WatchConnectivityManager.swift:**
```swift
import Foundation
import Combine  // ← Must be here
import WatchConnectivity
```

### Solution 2: Clean Build

1. In Xcode: **Product > Clean Build Folder** (⇧⌘K)
2. Close Xcode completely
3. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
4. Reopen Xcode
5. Build again (⌘B)

### Solution 3: Verify Target Membership

1. Select `WorkoutManager.swift` in Project Navigator
2. Open **File Inspector** (right sidebar, or View > Inspectors > File)
3. Under **Target Membership**, check:
   - ✅ `HealthFitnessWatch Watch App` - CHECKED
   - ❌ `healthfitnessapp` - UNCHECKED
4. Repeat for `WatchConnectivityManager.swift`

### Solution 4: Check Build Settings

1. Select **HealthFitnessWatch Watch App** target
2. Go to **Build Settings**
3. Search for "Swift Language Version"
4. Ensure it's set to **Swift 5** or later
5. Search for "Enable Modules"
6. Ensure it's set to **Yes**

### Solution 5: Re-add Files

If nothing works, try removing and re-adding:

1. **Remove files from project** (right-click > Delete > Remove Reference)
2. **Add files again** using "Add Files to 'HealthFitnessWatch'..."
3. Make sure to check the correct target

### Solution 6: Check watchOS Deployment Target

1. Select **HealthFitnessWatch Watch App** target
2. Go to **General** tab
3. Check **Deployment Target** - should be **watchOS 9.0** or later (Combine requires watchOS 6.0+)

### Still Not Working?

1. **Check Xcode version** - Need Xcode 14.0 or later
2. **Verify watchOS SDK** - Should be available in Xcode
3. **Try building from command line:**
   ```bash
   cd ios
   xcodebuild -workspace healthfitnessapp.xcworkspace \
     -scheme "HealthFitnessWatch Watch App" \
     -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (44mm)' \
     clean build
   ```

## Common Error Messages

### "Cannot find 'ObservableObject' in scope"
→ Add `import Combine`

### "Cannot find 'Published' in scope"  
→ Add `import Combine`

### "Module 'Combine' not found"
→ Check watchOS deployment target (needs 6.0+)
→ Verify you're building for watchOS, not iOS

### "No such module 'HealthKit'"
→ Add HealthKit framework in Build Phases > Link Binary With Libraries

### "No such module 'WatchConnectivity'"
→ Add WatchConnectivity framework in Build Phases > Link Binary With Libraries

