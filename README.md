# Health & Fitness App

A comprehensive React Native health and fitness application built with Expo, featuring diet tracking, fasting timers, calorie calculators, and health data integration.

## Features

- **Authentication**: Firebase email/password authentication with sign up and sign in flows
- **Diet Tracking**: Log meals (breakfast, lunch, dinner, snacks) with calories and macros
- **Fasting Timer**: Intermittent fasting tracker with multiple preset types (16:8, 18:6, 20:4, 24:0) and custom options
- **Calorie Calculator**: BMR and TDEE calculator with personalized recommendations
- **Step Counter**: 
  - iOS: Apple HealthKit integration
  - Android: Step counter using device sensors
- **Dashboard**: Overview of daily metrics including calories consumed/burned, steps, and fasting status
- **Data Persistence**: All data synced to Firebase Firestore

## Tech Stack

- **React Native** with **Expo**
- **TypeScript**
- **Expo Router** for navigation
- **Firebase** (Authentication & Firestore)
- **React Native Chart Kit** for data visualization
- **Date-fns** for date utilities

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Update `services/firebase/config.ts` with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Configure Health Permissions

The app.json file is already configured with:
- **iOS**: HealthKit permissions (NSHealthShareUsageDescription, NSHealthUpdateUsageDescription)
- **Android**: Activity recognition permissions for step counting

### 4. Run the App

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Project Structure

```
health-fitness-app/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Dashboard
│   │   ├── diet.tsx
│   │   ├── fasting.tsx
│   │   ├── calories.tsx
│   │   └── profile.tsx
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── auth/             # Auth components
│   ├── health/           # Health feature components
│   └── common/           # Common UI components
├── context/              # React Context providers
│   ├── AuthContext.tsx
│   └── HealthContext.tsx
├── services/             # Business logic services
│   ├── firebase/         # Firebase configuration
│   ├── health/           # Health data services
│   └── storage/          # Firestore operations
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## Health Data Integration

### iOS - Apple HealthKit

The app is configured to integrate with Apple HealthKit. For full functionality, you'll need to:
1. Create a custom development build (HealthKit requires native modules)
2. Implement the HealthKit service using `react-native-health` or a custom native module
3. The placeholder service is in `services/health/appleHealthKit.ts`

### Android - Step Counter

The app uses `expo-sensors` for step counting on Android. The implementation is in `services/health/stepCounter.ts`.

## Data Models

### User Profile
- Age, weight, height
- Gender, activity level
- Stored in Firestore under `users/{uid}/profile`

### Daily Health Data
- Date, calories consumed/burned
- Steps count
- Meals array
- Fasting session (optional)
- Stored in Firestore under `users/{uid}/health/{date}`

## Features in Detail

### Diet Tracker
- Log meals by type (breakfast, lunch, dinner, snack)
- Track calories and macros (carbs, protein, fat)
- View daily calorie summary

### Fasting Timer
- Multiple fasting types: 16:8, 18:6, 20:4, 24:0, or custom
- Real-time timer with progress indicator
- Track fasting history

### Calorie Calculator
- Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
- Calculate TDEE (Total Daily Energy Expenditure) based on activity level
- Get personalized calorie goals for weight loss/maintenance/gain

### Dashboard
- Daily overview of all metrics
- Weekly steps chart
- Quick actions for common tasks
- Active fasting session indicator

## Notes

- The HealthKit integration requires a custom development build for iOS
- For production, consider implementing proper step counter APIs for better accuracy
- Firebase configuration must be set up before the app can function
- All health data is stored securely in Firestore with user authentication

## License

This project is private and proprietary.

