import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RingStats } from '../../types';

interface FitnessRingsProps {
  stats: RingStats;
  size?: number;
  showLabels?: boolean;
}

export const FitnessRings: React.FC<FitnessRingsProps> = ({
  stats,
  size = 120,
  showLabels = true,
}) => {
  const caloriesProgress = Math.min(stats.caloriesBurned / stats.goalCalories, 1);
  const stepsProgress = Math.min(stats.steps / stats.goalSteps, 1);
  const minutesProgress = Math.min(stats.workoutMinutes / stats.goalMinutes, 1);

  const ringSize = size;
  const strokeWidth = size * 0.1;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const Ring = ({ progress, color, label, value, goal }: {
    progress: number;
    color: string;
    label: string;
    value: number;
    goal: number;
  }) => {
    const strokeDashoffset = circumference * (1 - progress);
    
    return (
      <View style={styles.ringContainer}>
        <View style={[styles.ringWrapper, { width: ringSize, height: ringSize }]}>
          {/* Background ring */}
          <View
            style={[
              styles.ringBackground,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: strokeWidth,
                borderColor: '#f0f0f0',
              },
            ]}
          />
          {/* Progress ring */}
          <View
            style={[
              styles.ringProgress,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopColor: 'transparent',
                borderRightColor: progress > 0.25 ? color : 'transparent',
                borderBottomColor: progress > 0.5 ? color : 'transparent',
                borderLeftColor: progress > 0.75 ? color : 'transparent',
                transform: [{ rotate: '-90deg' }],
              },
            ]}
          />
          {/* Center content */}
          <View style={styles.ringCenter}>
            <Text style={[styles.ringValue, { color }]}>{Math.round(value)}</Text>
            {showLabels && <Text style={styles.ringLabel}>{label}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.ringsRow}>
        <Ring
          progress={caloriesProgress}
          color="#FF6B6B"
          label="Calories"
          value={stats.caloriesBurned}
          goal={stats.goalCalories}
        />
        <Ring
          progress={stepsProgress}
          color="#4ECDC4"
          label="Steps"
          value={stats.steps}
          goal={stats.goalSteps}
        />
        <Ring
          progress={minutesProgress}
          color="#45B7D1"
          label="Minutes"
          value={stats.workoutMinutes}
          goal={stats.goalMinutes}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBackground: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});

