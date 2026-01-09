# Health & Fitness App

A comprehensive React Native health and fitness application built with Expo, featuring diet tracking, fasting timers, calorie calculators, and health data integration.

## Features

- **Authentication**: Firebase email/password authentication with sign up and sign in flows
- **Diet Tracking**: Log meals (breakfast, lunch, dinner, snacks) with calories and macros
  - **AI-Powered Food Recognition**: Upload food images to automatically detect calories, protein, carbs, and fat using OpenAI Vision API
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

### 2. Configure OpenAI API Key (for Food Image Recognition)

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a `.env` file in the root directory
3. Add your API key:

```env
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
```

**Note:** The food image recognition feature uses OpenAI's GPT-4 Vision API to analyze food images and automatically detect calories and macros. Make sure you have API credits available.

### 2. Configure OpenAI API Key (Optional - for Food Image Recognition)

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a `.env` file in the root directory (if it doesn't exist)
3. Add your API key:

```env
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
```

**Note:** This is optional. The food image recognition feature will be disabled if no API key is provided. Users can still manually enter meal information.

### 3. Configure Firebase

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

### 4. Configure Health Permissions

The app.json file is already configured with:
- **iOS**: HealthKit permissions (NSHealthShareUsageDescription, NSHealthUpdateUsageDescription)
- **Android**: Activity recognition permissions for step counting

### 5. Run the App

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
- **AI Food Recognition**: Upload food images to automatically detect nutritional information
- View daily calorie summary and macros breakdown (pie chart)
- View weekly calories trend graph

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

