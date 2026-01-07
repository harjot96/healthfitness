import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useHealth } from '../../context/HealthContext';

export const StepCounter: React.FC = () => {
  const { healthMetrics, refreshHealthData } = useHealth();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      refreshHealthData();
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [refreshHealthData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Steps Today</Text>
      <View style={styles.counterContainer}>
        <Text style={styles.counter}>{healthMetrics.steps.toLocaleString()}</Text>
        <Text style={styles.label}>steps</Text>
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {healthMetrics.caloriesBurned.toLocaleString()}
          </Text>
          <Text style={styles.metricLabel}>Calories Burned</Text>
        </View>
      </View>

      <Text style={styles.source}>
        Data from {Platform.OS === 'ios' ? 'Apple Health' : 'Step Counter'}
      </Text>
      <Text style={styles.updateTime}>
        Last updated: {lastUpdate.toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    color: '#666',
    marginBottom: 20,
  },
  counterContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  counter: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    color: '#666',
  },
  metricsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  source: {
    fontSize: 12,
    color: '#999',
    marginTop: 40,
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});

