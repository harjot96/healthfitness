import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DietTracker } from '../../components/health/DietTracker';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';

export default function DietScreen() {
  const insets = useSafeAreaInsets();
  const { refreshHealthData } = useHealth();
  const { user } = useAuth();
  const router = useRouter();

  // Refresh data from Firebase when screen mounts
  useEffect(() => {
    if (user) {
      refreshHealthData();
    }
  }, [user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DietTracker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

