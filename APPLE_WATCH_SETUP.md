# Apple Watch Setup Guide

This guide will help you set up the Apple Watch app for the Health & Fitness application.

## Prerequisites

- Xcode 14.0 or later
- Apple Watch (Series 3 or later)
- iOS device paired with the watch
- Apple Developer account

## Step 1: Add Watch App Target in Xcode

1. Open the project in Xcode:
   ```bash
   open ios/healthfitnessapp.xcworkspace
   ```

2. In Xcode, go to **File > New > Target**

3. Select **watchOS > App** and click **Next**

4. Configure the target:
   - **Product Name**: `HealthFitnessWatch`
   - **Bundle Identifier**: `com.healthfitness.app.watchkitapp`
   - **Language**: Swift
   - **Interface**: SwiftUI
   - **Include Notification Scene**: No (optional)

5. Click **Finish** and **Activate** the scheme when prompted

## Step 2: Add Watch App Files

The watch app files have been created in:
- `ios/HealthFitnessWatch Watch App/`

Copy these files to your Xcode project:

1. In Xcode, right-click on the `HealthFitnessWatch Watch App` group
2. Select **Add Files to "HealthFitnessWatch"...**
3. Add all Swift files:
   - `HealthFitnessWatchApp.swift`
   - `ContentView.swift`
   - `WorkoutManager.swift`
   - `WatchConnectivityManager.swift`

## Step 3: Configure Watch App Info.plist

1. Select the `HealthFitnessWatch Watch App` target
2. Go to **Info** tab
3. Add the following keys:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to your health data to track workouts on your Apple Watch.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app needs to update your health data to track your fitness progress.</string>
```

## Step 4: Add WatchConnectivity Framework

1. Select the main app target (`healthfitnessapp`)
2. Go to **Build Phases**
3. Expand **Link Binary With Libraries**
4. Click **+** and add:
   - `WatchConnectivity.framework`

## Step 5: Add Native Module Bridge

1. Add `WatchConnectivityBridge.swift` to the main app target:
   - Right-click on `healthfitnessapp` group
   - Select **Add Files to "healthfitnessapp"...**
   - Add `ios/healthfitnessapp/WatchConnectivityBridge.swift`
   - Make sure it's added to the `healthfitnessapp` target (not watch target)

2. Create the Objective-C bridge file:

Create `ios/healthfitnessapp/WatchConnectivityBridge.m`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(sendDailyStats:(NSDictionary *)stats
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isWatchReachable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
```

3. Update `healthfitnessapp-Bridging-Header.h`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

## Step 6: Configure Capabilities

### Main App Target

1. Select `healthfitnessapp` target
2. Go to **Signing & Capabilities**
3. Add **Background Modes**:
   - ✅ Background fetch
   - ✅ Background processing

### Watch App Target

1. Select `HealthFitnessWatch` target
2. Go to **Signing & Capabilities**
3. Add **HealthKit** capability
4. Add **Background Modes**:
   - ✅ Workout processing

## Step 7: Update App Groups (Optional but Recommended)

For better data sharing between iPhone and Watch:

1. In Apple Developer Portal, create an App Group: `group.com.healthfitness.app`
2. Add this App Group to both targets:
   - Main app target
   - Watch app target

## Step 8: Build and Run

1. Select the **HealthFitnessWatch Watch App** scheme
2. Choose your paired Apple Watch as the destination
3. Build and run (⌘R)

## Step 9: Integrate with React Native

The `WatchConnectivityService` has been created in `services/watch/WatchConnectivityService.ts`.

To use it in your React Native code:

```typescript
import { watchConnectivityService } from '../services/watch/WatchConnectivityService';

// Send daily stats to watch
await watchConnectivityService.sendDailyStats({
  steps: 5000,
  calories: 2000,
  water: 6
});

// Listen for workout events from watch
watchConnectivityService.onWorkoutStarted((event) => {
  console.log('Workout started on watch:', event.type);
});

watchConnectivityService.onWorkoutStopped((event) => {
  console.log('Workout stopped:', event);
});
```

## Features

The Apple Watch app includes:

1. **Workout Tracking**
   - Start/stop workouts (Running, Walking, Cycling)
   - Real-time metrics: time, distance, pace, heart rate
   - HealthKit integration for accurate tracking

2. **Daily Stats**
   - View steps, calories, and water intake
   - Synced with iPhone app

3. **WatchConnectivity**
   - Bidirectional communication with iPhone
   - Real-time workout sync
   - Stats synchronization

## Testing

1. **On Simulator**: 
   - Watch app can be tested on watchOS simulator
   - WatchConnectivity works between iOS and watchOS simulators

2. **On Physical Devices**:
   - Requires paired Apple Watch
   - Both devices must be signed with the same developer account

## Troubleshooting

### Watch not reachable
- Ensure both devices are on the same Wi-Fi network or Bluetooth is enabled
- Check that Watch app is installed on the watch
- Verify WatchConnectivity is properly configured

### HealthKit permissions
- Request HealthKit permissions on both iPhone and Watch
- Check Info.plist has proper usage descriptions

### Build errors
- Ensure all Swift files are added to the correct targets
- Check that WatchConnectivity framework is linked
- Verify bridging header is configured correctly

## Next Steps

1. Customize watch app UI to match your brand
2. Add more workout types
3. Implement complications for watch faces
4. Add haptic feedback for workout milestones
5. Implement workout summaries and history

