import { Stack, Redirect } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';

const screenOptions = {
  headerShown: false,
};

function RootLayoutNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <Stack screenOptions={screenOptions}>
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
          <RootLayoutNav />
        </HealthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

