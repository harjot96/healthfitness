import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';
import { WatchConnectionProvider } from '../context/WatchConnectionContext';
import { View, ActivityIndicator } from 'react-native';

// Initialize Mapbox
try {
  const Mapbox = require('@rnmapbox/maps');
  const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGFyam90IiwiYSI6ImNtYTJqdGF6MzE5YjYya29rdGdlNmZqNmoifQ.beVEa-CdojkfoT9G3XVeng';
  if (MAPBOX_TOKEN) {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
    console.log('[Mapbox] Access token configured successfully');
  }
} catch (error) {
  console.warn('[Mapbox] Failed to initialize:', error);
}

const screenOptions = {
  headerShown: false,
};

// Inner component that uses auth context - only renders after provider is ready
function RootLayoutNav() {
  const { loading } = useAuth();

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HealthProvider>
          <WatchConnectionProvider>
            <RootLayoutNav />
          </WatchConnectionProvider>
        </HealthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

