import { apiClient } from './client';
import { DailyHealthData, Meal, WaterEntry, Workout, FastingSession } from '../../types';
import { format } from 'date-fns';

/**
 * Get daily health data for a specific date
 */
export const getDailyHealthData = async (date: string): Promise<DailyHealthData | null> => {
  try {
    const data = await apiClient.get<any>(`/health/daily/${date}`);

    if (!data) {
      return null;
    }

    // Transform backend response to DailyHealthData format
    return {
      date: data.date,
      caloriesConsumed: data.caloriesConsumed || 0,
      caloriesBurned: data.caloriesBurned || 0,
      activeEnergyBurned: data.activeEnergyBurned || 0,
      dietaryEnergyConsumed: data.dietaryEnergyConsumed || 0,
      heartRate: data.heartRate || 0,
      restingHeartRate: data.restingHeartRate || 0,
      steps: data.steps || 0,
      waterIntake: data.waterIntake || 0,
      meals: (data.meals || []).map((meal: any) => ({
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
      waterEntries: (data.waterEntries || []).map((entry: any) => ({
        id: entry.id,
        glasses: entry.glasses,
        timestamp: new Date(entry.timestamp),
      })),
      workouts: (data.workouts || []).map((workout: any) => ({
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
      fastingSession: data.fastingSession ? {
        id: data.fastingSession.id,
        type: data.fastingSession.type,
        startTime: new Date(data.fastingSession.startTime),
        endTime: data.fastingSession.endTime ? new Date(data.fastingSession.endTime) : undefined,
        duration: data.fastingSession.duration || 0,
        targetDuration: data.fastingSession.targetDuration || undefined,
        eatingWindow: data.fastingSession.eatingWindowStart && data.fastingSession.eatingWindowEnd ? {
          startHour: new Date(data.fastingSession.eatingWindowStart).getHours(),
          endHour: new Date(data.fastingSession.eatingWindowEnd).getHours(),
          value: `${new Date(data.fastingSession.eatingWindowStart).getHours()}-${new Date(data.fastingSession.eatingWindowEnd).getHours()}`,
        } : undefined,
      } : undefined,
    };
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('Error getting daily health data:', error);
    const message = error.message || 'Failed to get health data';
    throw new Error(message);
  }
};

/**
 * Save daily health data
 */
export const saveDailyHealthData = async (data: DailyHealthData): Promise<void> => {
  try {
    await apiClient.post('/health/daily', {
      date: data.date,
      caloriesConsumed: data.caloriesConsumed,
      caloriesBurned: data.caloriesBurned,
      activeEnergyBurned: data.activeEnergyBurned,
      dietaryEnergyConsumed: data.dietaryEnergyConsumed,
      heartRate: data.heartRate,
      restingHeartRate: data.restingHeartRate,
      steps: data.steps,
      waterIntake: data.waterIntake,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to save health data';
    throw new Error(message);
  }
};

/**
 * Add a meal
 */
export const addMeal = async (date: string, meal: Meal): Promise<Meal> => {
  try {
    const response = await apiClient.post<any>('/health/meals', {
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
    });

    return {
      id: response.id,
      type: response.type,
      name: response.name,
      calories: response.calories,
      macros: {
        carbs: response.carbs || 0,
        protein: response.protein || 0,
        fat: response.fat || 0,
      },
      timestamp: new Date(response.timestamp),
    };
  } catch (error: any) {
    const message = error.message || 'Failed to add meal';
    throw new Error(message);
  }
};

/**
 * Add a water entry
 */
export const addWaterEntry = async (date: string, entry: WaterEntry): Promise<number> => {
  try {
    await apiClient.post('/health/water', {
      date,
      entry: {
        glasses: entry.glasses,
        timestamp: entry.timestamp.toISOString(),
      },
    });

    // Return the glasses added (would need to refetch daily data to get updated waterIntake)
    return entry.glasses;
  } catch (error: any) {
    const message = error.message || 'Failed to add water entry';
    throw new Error(message);
  }
};

/**
 * Add a workout
 */
export const addWorkout = async (date: string, workout: Workout): Promise<Workout> => {
  try {
    const response = await apiClient.post<any>('/health/workouts', {
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
    });

    return {
      id: response.id,
      name: response.name,
      type: response.type,
      startTime: new Date(response.startTime),
      endTime: response.endTime ? new Date(response.endTime) : undefined,
      duration: response.duration,
      totalCaloriesBurned: response.totalCaloriesBurned,
      distance: response.distance || 0,
      averageSpeed: response.averageSpeed || 0,
      maxSpeed: response.maxSpeed || 0,
      exercises: workout.exercises || [],
      locationTrack: workout.locationTrack || [],
      date: date,
    };
  } catch (error: any) {
    const message = error.message || 'Failed to add workout';
    throw new Error(message);
  }
};

/**
 * Save a fasting session
 */
export const saveFastingSession = async (date: string, session: FastingSession): Promise<FastingSession> => {
  try {
    const response = await apiClient.post<any>('/health/fasting', {
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
    });

    return {
      id: response.id,
      type: response.type,
      startTime: new Date(response.startTime),
      endTime: response.endTime ? new Date(response.endTime) : undefined,
      duration: response.duration,
      targetDuration: response.targetDuration,
      eatingWindow: session.eatingWindow,
    };
  } catch (error: any) {
    const message = error.message || 'Failed to save fasting session';
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
    await apiClient.put('/community/ring-stats', {
      date: stats.date.replace(/-/g, ''), // Format as yyyyMMdd
      caloriesBurned: stats.caloriesBurned,
      steps: stats.steps,
      workoutMinutes: stats.workoutMinutes,
      goalCalories: stats.goalCalories,
      goalSteps: stats.goalSteps,
      goalMinutes: stats.goalMinutes,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to update ring stats';
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
    
    await apiClient.post('/health/daily', {
      date,
      caloriesConsumed: currentData?.caloriesConsumed || 0,
      caloriesBurned: metrics.caloriesBurned ?? currentData?.caloriesBurned ?? 0,
      activeEnergyBurned: metrics.activeEnergyBurned ?? currentData?.activeEnergyBurned ?? 0,
      dietaryEnergyConsumed: metrics.dietaryEnergyConsumed ?? currentData?.dietaryEnergyConsumed ?? 0,
      heartRate: metrics.heartRate ?? currentData?.heartRate ?? 0,
      restingHeartRate: metrics.restingHeartRate ?? currentData?.restingHeartRate ?? 0,
      steps: metrics.steps ?? currentData?.steps ?? 0,
      waterIntake: currentData?.waterIntake || 0,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to update health metrics';
    throw new Error(message);
  }
};
