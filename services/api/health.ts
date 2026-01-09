import { apolloClient } from './client';
import {
  GET_DAILY_HEALTH_DATA,
} from './queries';
import {
  SAVE_DAILY_HEALTH_DATA,
  ADD_MEAL,
  ADD_WATER_ENTRY,
  ADD_WORKOUT,
  SAVE_FASTING_SESSION,
  UPDATE_RING_STATS,
} from './mutations';
import { DailyHealthData, Meal, WaterEntry, Workout, FastingSession } from '../../types';

/**
 * Get daily health data for a specific date
 */
export const getDailyHealthData = async (date: string): Promise<DailyHealthData | null> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_DAILY_HEALTH_DATA,
      variables: { date },
      fetchPolicy: 'network-only',
    });

    if (!data?.dailyHealthData) {
      return null;
    }

    const healthData = data.dailyHealthData;

    // Transform GraphQL response to DailyHealthData format
    return {
      date: healthData.date,
      caloriesConsumed: healthData.caloriesConsumed || 0,
      caloriesBurned: healthData.caloriesBurned || 0,
      activeEnergyBurned: healthData.activeEnergyBurned || 0,
      dietaryEnergyConsumed: healthData.dietaryEnergyConsumed || 0,
      heartRate: healthData.heartRate || 0,
      restingHeartRate: healthData.restingHeartRate || 0,
      steps: healthData.steps || 0,
      waterIntake: healthData.waterIntake || 0,
      meals: (healthData.meals || []).map((meal: any) => ({
        id: meal.id,
        type: meal.type,
        name: meal.name,
        calories: meal.calories,
        macros: {
          carbs: meal.carbs || 0,
          protein: meal.protein || 0,
          fat: meal.fat || 0,
        },
        timestamp: new Date(meal.timestamp),
      })),
      waterEntries: (healthData.waterEntries || []).map((entry: any) => ({
        id: entry.id,
        glasses: entry.glasses,
        timestamp: new Date(entry.timestamp),
      })),
      workouts: (healthData.workouts || []).map((workout: any) => ({
        id: workout.id,
        name: workout.name,
        type: workout.type,
        startTime: new Date(workout.startTime),
        endTime: workout.endTime ? new Date(workout.endTime) : undefined,
        duration: workout.duration || 0,
        totalCaloriesBurned: workout.totalCaloriesBurned || 0,
        distance: workout.distance || 0,
        averageSpeed: workout.averageSpeed || 0,
        maxSpeed: workout.maxSpeed || 0,
        exercises: (workout.exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          duration: ex.duration || 0,
          sets: ex.sets || 0,
          reps: ex.reps || 0,
          weight: ex.weight || 0,
          caloriesBurned: ex.caloriesBurned || 0,
          notes: ex.notes || '',
        })),
        locationTrack: (workout.locationPoints || []).map((point: any) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date(point.timestamp),
          altitude: point.altitude || 0,
          speed: point.speed || 0,
          accuracy: point.accuracy || 0,
        })),
      })),
      fastingSession: healthData.fastingSession ? {
        id: healthData.fastingSession.id,
        type: healthData.fastingSession.type,
        startTime: new Date(healthData.fastingSession.startTime),
        endTime: healthData.fastingSession.endTime ? new Date(healthData.fastingSession.endTime) : undefined,
        duration: healthData.fastingSession.duration || 0,
        targetDuration: healthData.fastingSession.targetDuration || undefined,
        eatingWindow: healthData.fastingSession.eatingWindowStart && healthData.fastingSession.eatingWindowEnd ? {
          startHour: new Date(healthData.fastingSession.eatingWindowStart).getHours(),
          endHour: new Date(healthData.fastingSession.eatingWindowEnd).getHours(),
          value: `${new Date(healthData.fastingSession.eatingWindowStart).getHours()}-${new Date(healthData.fastingSession.eatingWindowEnd).getHours()}`,
        } : undefined,
      } : undefined,
    };
  } catch (error: any) {
    console.error('Error getting daily health data:', error);
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get health data';
    throw new Error(message);
  }
};

/**
 * Save daily health data
 */
export const saveDailyHealthData = async (data: DailyHealthData): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: SAVE_DAILY_HEALTH_DATA,
      variables: {
        data: {
          date: data.date,
          caloriesConsumed: data.caloriesConsumed,
          caloriesBurned: data.caloriesBurned,
          activeEnergyBurned: data.activeEnergyBurned,
          dietaryEnergyConsumed: data.dietaryEnergyConsumed,
          heartRate: data.heartRate,
          restingHeartRate: data.restingHeartRate,
          steps: data.steps,
          waterIntake: data.waterIntake,
        },
      },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to save health data';
    throw new Error(message);
  }
};

/**
 * Add a meal
 */
export const addMeal = async (date: string, meal: Meal): Promise<Meal> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: ADD_MEAL,
      variables: {
        date,
        meal: {
          type: meal.type,
          name: meal.name,
          calories: meal.calories,
          carbs: meal.macros?.carbs || 0,
          protein: meal.macros?.protein || 0,
          fat: meal.macros?.fat || 0,
          timestamp: meal.timestamp.toISOString(),
        },
      },
    });

    if (!data?.addMeal) {
      throw new Error('Failed to add meal');
    }

    return {
      id: data.addMeal.id,
      type: data.addMeal.type,
      name: data.addMeal.name,
      calories: data.addMeal.calories,
      macros: {
        carbs: data.addMeal.carbs || 0,
        protein: data.addMeal.protein || 0,
        fat: data.addMeal.fat || 0,
      },
      timestamp: new Date(data.addMeal.timestamp),
    };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to add meal';
    throw new Error(message);
  }
};

/**
 * Add a water entry
 */
export const addWaterEntry = async (date: string, entry: WaterEntry): Promise<number> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: ADD_WATER_ENTRY,
      variables: {
        date,
        entry: {
          glasses: entry.glasses,
          timestamp: entry.timestamp.toISOString(),
        },
      },
    });

    if (!data?.addWaterEntry) {
      throw new Error('Failed to add water entry');
    }

    // Return the updated water intake (would need to query or calculate)
    // For now, we'll need to refetch daily data to get updated waterIntake
    return entry.glasses;
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to add water entry';
    throw new Error(message);
  }
};

/**
 * Add a workout
 */
export const addWorkout = async (date: string, workout: Workout): Promise<Workout> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: ADD_WORKOUT,
      variables: {
        date,
        workout: {
          name: workout.name,
          type: workout.type,
          startTime: workout.startTime.toISOString(),
          endTime: workout.endTime?.toISOString(),
          duration: workout.duration,
          totalCaloriesBurned: workout.totalCaloriesBurned,
          distance: workout.distance,
          averageSpeed: workout.averageSpeed,
          maxSpeed: workout.maxSpeed,
          exercises: workout.exercises?.map(ex => ({
            name: ex.name,
            category: ex.category,
            duration: ex.duration,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            caloriesBurned: ex.caloriesBurned,
            notes: ex.notes,
          })),
          locationPoints: workout.locationTrack?.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp.toISOString(),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })),
        },
      },
    });

    if (!data?.addWorkout) {
      throw new Error('Failed to add workout');
    }

    return {
      id: data.addWorkout.id,
      name: data.addWorkout.name,
      type: data.addWorkout.type,
      startTime: new Date(data.addWorkout.startTime),
      endTime: data.addWorkout.endTime ? new Date(data.addWorkout.endTime) : undefined,
      duration: data.addWorkout.duration,
      totalCaloriesBurned: data.addWorkout.totalCaloriesBurned,
      distance: data.addWorkout.distance || 0,
      averageSpeed: data.addWorkout.averageSpeed || 0,
      maxSpeed: data.addWorkout.maxSpeed || 0,
        exercises: workout.exercises || [],
        locationTrack: workout.locationTrack || [],
        date: date,
    };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to add workout';
    throw new Error(message);
  }
};

/**
 * Save a fasting session
 */
export const saveFastingSession = async (date: string, session: FastingSession): Promise<FastingSession> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: SAVE_FASTING_SESSION,
      variables: {
        date,
        session: {
          type: session.type,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime?.toISOString(),
          duration: session.duration,
          targetDuration: session.targetDuration,
          eatingWindowStart: session.eatingWindow?.startHour ? new Date().setHours(session.eatingWindow.startHour, 0, 0, 0) : undefined,
          eatingWindowEnd: session.eatingWindow?.endHour ? new Date().setHours(session.eatingWindow.endHour, 0, 0, 0) : undefined,
        },
      },
    });

    if (!data?.saveFastingSession) {
      throw new Error('Failed to save fasting session');
    }

    return {
      id: data.saveFastingSession.id,
      type: data.saveFastingSession.type,
      startTime: new Date(data.saveFastingSession.startTime),
      endTime: data.saveFastingSession.endTime ? new Date(data.saveFastingSession.endTime) : undefined,
      duration: data.saveFastingSession.duration,
      targetDuration: data.saveFastingSession.targetDuration,
      eatingWindow: session.eatingWindow,
    };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to save fasting session';
    throw new Error(message);
  }
};

/**
 * Update ring stats
 */
export const updateRingStats = async (stats: {
  date: string;
  caloriesBurned: number;
  steps: number;
  workoutMinutes: number;
  goalCalories: number;
  goalSteps: number;
  goalMinutes: number;
}): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: UPDATE_RING_STATS,
      variables: {
        stats: {
          date: stats.date.replace(/-/g, ''), // Format as yyyyMMdd
          caloriesBurned: stats.caloriesBurned,
          steps: stats.steps,
          workoutMinutes: stats.workoutMinutes,
          goalCalories: stats.goalCalories,
          goalSteps: stats.goalSteps,
          goalMinutes: stats.goalMinutes,
        },
      },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to update ring stats';
    throw new Error(message);
  }
};

/**
 * Update health metrics (steps, calories, etc.)
 * This is a convenience function that saves daily health data
 */
export const updateHealthMetrics = async (date: string, metrics: {
  steps?: number;
  caloriesBurned?: number;
  activeEnergyBurned?: number;
  dietaryEnergyConsumed?: number;
  heartRate?: number;
  restingHeartRate?: number;
}): Promise<void> => {
  try {
    // Get current data first
    const currentData = await getDailyHealthData(date);
    
    await apolloClient.mutate({
      mutation: SAVE_DAILY_HEALTH_DATA,
      variables: {
        data: {
          date,
          caloriesConsumed: currentData?.caloriesConsumed || 0,
          caloriesBurned: metrics.caloriesBurned ?? currentData?.caloriesBurned ?? 0,
          activeEnergyBurned: metrics.activeEnergyBurned ?? currentData?.activeEnergyBurned ?? 0,
          dietaryEnergyConsumed: metrics.dietaryEnergyConsumed ?? currentData?.dietaryEnergyConsumed ?? 0,
          heartRate: metrics.heartRate ?? currentData?.heartRate ?? 0,
          restingHeartRate: metrics.restingHeartRate ?? currentData?.restingHeartRate ?? 0,
          steps: metrics.steps ?? currentData?.steps ?? 0,
          waterIntake: currentData?.waterIntake || 0,
        },
      },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to update health metrics';
    throw new Error(message);
  }
};

