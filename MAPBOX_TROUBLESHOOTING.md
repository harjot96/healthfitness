# Mapbox Troubleshooting Guide

## Why Maps Might Not Be Showing

Mapbox requires **native modules** that must be compiled into your app. This means:

### ❌ Maps WILL NOT work in:
- Expo Go (development client)
- Web browser
- Without rebuilding the app

### ✅ Maps WILL work after:
- Creating a development build
- Rebuilding the native app

## Steps to Get Maps Working

### 1. Rebuild Your App

Since Mapbox uses native modules, you **must** rebuild your app:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

**Important:** You cannot use `expo start` with Expo Go. You need a development build.

### 2. Verify Mapbox Token

The token is configured in two places:
- `app/_layout.tsx` - Initialized at app startup
- `components/health/WorkoutTracker.tsx` - Fallback initialization

Your token: `pk.eyJ1IjoiZGFyam90IiwiYSI6ImNtYTJqdGF6MzE5YjYya29rdGdlNmZqNmoifQ.beVEa-CdojkfoT9G3XVeng`

### 3. Check Console Logs

After rebuilding, check your console for:
- `[Mapbox] Access token configured successfully` - ✅ Token is set
- `[Mapbox] MapView component not available` - ❌ Native module not linked
- `[Mapbox] Map loaded successfully` - ✅ Map is working

### 4. Debug Information

In development mode, the fallback screen will show:
- `MapboxGL = loaded` - Mapbox is available
- `MapboxGL = null` - Mapbox is not available (needs rebuild)

## Common Issues

### Issue: "Map view is not available"
**Solution:** Rebuild the app with `npx expo run:ios` or `npx expo run:android`

### Issue: Map shows but is blank
**Solution:** 
1. Check your Mapbox token is valid at https://account.mapbox.com/access-tokens/
2. Verify you haven't exceeded your Mapbox quota
3. Check console for error messages

### Issue: "MapboxGL = null" in debug
**Solution:** The native module isn't linked. Rebuild the app.

## Testing

1. Start a workout that requires location (Running, Walking, Cycling)
2. The map should appear in the modal
3. You should see:
   - Your current location (blue marker)
   - Route line (green) as you move
   - Start marker (green flag)

## Need Help?

If maps still don't work after rebuilding:
1. Check console logs for errors
2. Verify Mapbox token is valid
3. Ensure you're using a development build (not Expo Go)
4. Try clearing cache: `npx expo start --clear`

