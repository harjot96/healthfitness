# Mapbox Setup Instructions

## Getting Your Mapbox Access Token

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Sign up for a free account (or log in if you already have one)
3. Navigate to [Access Tokens](https://account.mapbox.com/access-tokens/)
4. Copy your default public token or create a new one

## Setting the Token

You have two options:

### Option 1: Environment Variable (Recommended)
Create a `.env` file in the root of your project:
```
EXPO_PUBLIC_MAPBOX_TOKEN=your-mapbox-token-here
```

### Option 2: Direct Configuration
Edit `components/health/WorkoutTracker.tsx` and replace the token in the initialization code:
```typescript
const MAPBOX_TOKEN = 'your-mapbox-token-here';
```

## Rebuilding the App

After setting up the token, rebuild your app:
```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

## Free Tier Limits

Mapbox offers a generous free tier:
- 50,000 map loads per month
- Perfect for development and small apps

For production apps with higher usage, consider upgrading your plan.

