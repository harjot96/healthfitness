import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../services/api/client';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';
import { WatchConnectionProvider } from '../context/WatchConnectionContext';
import { CommunityProvider } from '../context/CommunityContext';

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <HealthProvider>
          <WatchConnectionProvider>
            <CommunityProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </CommunityProvider>
          </WatchConnectionProvider>
        </HealthProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
