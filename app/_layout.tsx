import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';
import { WatchConnectionProvider } from '../context/WatchConnectionContext';
import { CommunityProvider } from '../context/CommunityContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <HealthProvider>
        <WatchConnectionProvider>
          <CommunityProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </CommunityProvider>
        </WatchConnectionProvider>
      </HealthProvider>
    </AuthProvider>
  );
}
