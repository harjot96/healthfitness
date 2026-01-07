import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FastingTimer } from '../../components/health/FastingTimer';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';

export default function FastingScreen() {
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
      <FastingTimer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

