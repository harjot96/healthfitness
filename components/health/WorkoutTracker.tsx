import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Workout, Exercise } from '../../types';
import { format } from 'date-fns';
import { Button } from '../common/Button';
import { formatDurationFromMinutes } from '../../utils/formatDuration';

export const WorkoutTracker: React.FC = () => {
  const { todayData, addWorkout } = useHealth();
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<Workout['type']>('strength');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({
    name: '',
    category: 'strength',
  });
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const workoutTypes = [
    { label: 'Strength', value: 'strength' as const, icon: 'barbell' },
    { label: 'Cardio', value: 'cardio' as const, icon: 'heart' },
    { label: 'HIIT', value: 'hiit' as const, icon: 'flash' },
    { label: 'Yoga', value: 'yoga' as const, icon: 'leaf' },
    { label: 'Running', value: 'running' as const, icon: 'footsteps' },
    { label: 'Cycling', value: 'cycling' as const, icon: 'bicycle' },
  ];

  const exerciseCategories = [
    { label: 'Strength', value: 'strength' as const },
    { label: 'Cardio', value: 'cardio' as const },
    { label: 'Flexibility', value: 'flexibility' as const },
    { label: 'Sports', value: 'sports' as const },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && workoutStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, workoutStartTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const startWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    setIsActive(true);
    setWorkoutStartTime(new Date());
    setElapsedTime(0);
  };

  const stopWorkout = async () => {
    if (exercises.length === 0) {
      Alert.alert('Warning', 'No exercises added. Are you sure you want to end the workout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', onPress: handleEndWorkout },
      ]);
      return;
    }
    handleEndWorkout();
  };

  const handleEndWorkout = async () => {
    if (!workoutStartTime) return;

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - workoutStartTime.getTime()) / 60000); // minutes
      const totalCalories = exercises.reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0) || duration * 5; // Estimate

      const workout: Workout = {
        id: Date.now().toString(),
        name: workoutName,
        type: workoutType,
        exercises,
        startTime: workoutStartTime,
        endTime,
        duration,
        totalCaloriesBurned: totalCalories,
        date: format(new Date(), 'yyyy-MM-dd'),
      };

      await addWorkout(workout);
      
      // Reset state
      setIsActive(false);
      setWorkoutStartTime(null);
      setWorkoutName('');
      setExercises([]);
      setElapsedTime(0);
      setShowAddExercise(false);
      
      Alert.alert('Success', 'Workout saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save workout');
    }
  };

  const addExercise = () => {
    if (!currentExercise.name?.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: currentExercise.name,
      category: currentExercise.category || 'strength',
      duration: currentExercise.duration,
      sets: currentExercise.sets,
      reps: currentExercise.reps,
      weight: currentExercise.weight,
      caloriesBurned: currentExercise.caloriesBurned,
      notes: currentExercise.notes,
    };

    setExercises([...exercises, exercise]);
    setCurrentExercise({ name: '', category: 'strength' });
    setShowAddExercise(false);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const todayWorkouts = todayData?.workouts || [];
  const totalWorkoutCalories = todayWorkouts.reduce((sum, w) => sum + w.totalCaloriesBurned, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Today's Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Workouts</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{todayWorkouts.length}</Text>
            <Text style={styles.summaryLabel}>Workouts</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{totalWorkoutCalories}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {formatDurationFromMinutes(todayWorkouts.reduce((sum, w) => sum + w.duration, 0))}
            </Text>
            <Text style={styles.summaryLabel}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Active Workout */}
      {isActive ? (
        <View style={styles.activeWorkoutCard}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutName}>{workoutName}</Text>
            <TouchableOpacity onPress={stopWorkout}>
              <Ionicons name="stop-circle" size={32} color="#f44336" />
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.timerLabel}>Duration</Text>
          </View>

          <View style={styles.workoutTypeContainer}>
            <Text style={styles.sectionLabel}>Workout Type</Text>
            <View style={styles.typeButtons}>
              {workoutTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    workoutType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setWorkoutType(type.value)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={workoutType === type.value ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      workoutType === type.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercises List */}
          <View style={styles.exercisesSection}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionLabel}>Exercises ({exercises.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddExercise(true)}
              >
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
                <Text style={styles.addButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.map(exercise => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
                <View style={styles.exerciseDetails}>
                  {exercise.sets && exercise.reps && (
                    <Text style={styles.exerciseDetail}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                  )}
                  {exercise.weight && (
                    <Text style={styles.exerciseDetail}>{exercise.weight} kg</Text>
                  )}
                  {exercise.duration && (
                    <Text style={styles.exerciseDetail}>{formatDurationFromMinutes(exercise.duration)}</Text>
                  )}
                  {exercise.caloriesBurned && (
                    <Text style={styles.exerciseDetail}>{exercise.caloriesBurned} kcal</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.startWorkoutCard}>
          <Text style={styles.startTitle}>Start New Workout</Text>
          <TextInput
            style={styles.input}
            placeholder="Workout name (e.g., Morning Run, Gym Session)"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
          <Button
            title="Start Workout"
            onPress={startWorkout}
            style={styles.startButton}
          />
        </View>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Exercise name"
              value={currentExercise.name}
              onChangeText={(text) => setCurrentExercise({ ...currentExercise, name: text })}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryButtons}>
              {exerciseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    currentExercise.category === cat.value && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCurrentExercise({ ...currentExercise, category: cat.value })}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      currentExercise.category === cat.value && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Sets</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.sets?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, sets: parseInt(text) || undefined })
                  }
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reps</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.reps?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, reps: parseInt(text) || undefined })
                  }
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.weight?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, weight: parseFloat(text) || undefined })
                  }
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.duration?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, duration: parseInt(text) || undefined })
                  }
                />
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Calories burned (optional)"
              keyboardType="numeric"
              value={currentExercise.caloriesBurned?.toString()}
              onChangeText={(text) =>
                setCurrentExercise({ ...currentExercise, caloriesBurned: parseInt(text) || undefined })
              }
            />

            <Button title="Add Exercise" onPress={addExercise} style={styles.addExerciseButton} />
          </View>
        </View>
      )}

      {/* Today's Workouts History */}
      {todayWorkouts.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Today's Workouts</Text>
          {todayWorkouts.map(workout => (
            <View key={workout.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyName}>{workout.name}</Text>
                <Text style={styles.historyType}>{workout.type}</Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDetail}>
                  <Ionicons name="time" size={16} color="#666" /> {formatDurationFromMinutes(workout.duration)}
                </Text>
                <Text style={styles.historyDetail}>
                  <Ionicons name="flame" size={16} color="#f44336" /> {workout.totalCaloriesBurned} kcal
                </Text>
                <Text style={styles.historyDetail}>
                  <Ionicons name="barbell" size={16} color="#4CAF50" /> {workout.exercises.length} exercises
                </Text>
              </View>
              <Text style={styles.historyTime}>
                {format(workout.startTime, 'HH:mm')} - {workout.endTime ? format(workout.endTime, 'HH:mm') : 'Ongoing'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  activeWorkoutCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
  },
  workoutTypeContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  exercisesSection: {
    marginTop: 20,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseDetail: {
    fontSize: 14,
    color: '#666',
  },
  startWorkoutCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  startTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  startButton: {
    marginTop: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  addExerciseButton: {
    marginTop: 8,
  },
  historySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  historyDetail: {
    fontSize: 14,
    color: '#666',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
});

