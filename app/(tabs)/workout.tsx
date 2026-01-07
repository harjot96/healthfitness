import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutTracker } from '../../components/health/WorkoutTracker';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { refreshHealthData } = useHealth();
  const { user } = useAuth();

  // Refresh data from Firebase when screen mounts
  useEffect(() => {
    if (user) {
      refreshHealthData();
    }
  }, [user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WorkoutTracker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});


