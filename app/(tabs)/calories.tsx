import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalorieCalculator } from '../../components/health/CalorieCalculator';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/api/auth';

export default function CaloriesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Ensure profile data is loaded from Firebase when screen mounts
  useEffect(() => {
    if (user) {
      // Profile is already loaded via AuthContext, but we ensure it's fresh
      getUserProfile().catch(console.error);
    }
  }, [user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CalorieCalculator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

