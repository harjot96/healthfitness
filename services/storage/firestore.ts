import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '../firebase/config';
import { DailyHealthData, Meal, FastingSession, MealSuggestion, WaterEntry, Workout } from '../../types';

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val === undefined) return;
      result[key] = stripUndefined(val as unknown);
    });
    return result as T;
  }

  return value;
};

export const saveDailyHealthData = async (uid: string, data: DailyHealthData) => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    console.log('[Firestore] Saving daily health data for user:', uid, 'date:', data.date);
    const healthRef = doc(db, 'users', uid, 'health', data.date);
    
    const dataToSave = stripUndefined({
      date: data.date,
      caloriesConsumed: data.caloriesConsumed || 0,
      caloriesBurned: data.caloriesBurned || 0,
      activeEnergyBurned: data.activeEnergyBurned || 0,
      dietaryEnergyConsumed: data.dietaryEnergyConsumed || 0,
      heartRate: data.heartRate || 0,
      restingHeartRate: data.restingHeartRate || 0,
      steps: data.steps || 0,
      waterIntake: data.waterIntake || 0,
      meals: data.meals.map(meal => ({
        id: meal.id,
        type: meal.type,
        name: meal.name,
        calories: meal.calories || 0,
        macros: {
          carbs: meal.macros?.carbs || 0,
          protein: meal.macros?.protein || 0,
          fat: meal.macros?.fat || 0,
        },
        timestamp: Timestamp.fromDate(meal.timestamp),
      })),
      waterEntries: data.waterEntries.map(entry => ({
        id: entry.id,
        glasses: entry.glasses || 0,
        timestamp: Timestamp.fromDate(entry.timestamp),
      })),
      workouts: (data.workouts || []).map(workout => ({
        id: workout.id,
        name: workout.name,
        type: workout.type,
        startTime: Timestamp.fromDate(workout.startTime),
        endTime: workout.endTime ? Timestamp.fromDate(workout.endTime) : null,
        duration: workout.duration || 0,
        totalCaloriesBurned: workout.totalCaloriesBurned || 0,
        date: workout.date || data.date,
        exercises: (workout.exercises || []).map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category || 'other',
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          caloriesBurned: ex.caloriesBurned,
          notes: ex.notes,
        })),
        locationTrack: workout.locationTrack ? workout.locationTrack.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: Timestamp.fromDate(point.timestamp),
          altitude: point.altitude,
          speed: point.speed,
          accuracy: point.accuracy,
        })) : undefined,
        distance: workout.distance,
        averageSpeed: workout.averageSpeed,
        maxSpeed: workout.maxSpeed,
      })),
      fastingSession: data.fastingSession ? {
        id: data.fastingSession.id,
        type: data.fastingSession.type,
        startTime: Timestamp.fromDate(data.fastingSession.startTime),
        endTime: data.fastingSession.endTime ? Timestamp.fromDate(data.fastingSession.endTime) : null,
        duration: data.fastingSession.duration || 0,
        targetDuration: data.fastingSession.targetDuration,
      } : null,
    });
    
    await setDoc(healthRef, dataToSave);
    console.log('[Firestore] Successfully saved daily health data');
  } catch (error: any) {
    console.error('[Firestore] Error saving daily health data:', error);
    console.error('[Firestore] Error code:', error.code);
    console.error('[Firestore] Error message:', error.message);
    throw new Error(error.message || 'Failed to save health data');
  }
};

export const getDailyHealthData = async (uid: string, date: string): Promise<DailyHealthData | null> => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    console.log('[Firestore] Loading daily health data for user:', uid, 'date:', date);
    const healthRef = doc(db, 'users', uid, 'health', date);
    const healthSnap = await getDoc(healthRef);
    
    if (healthSnap.exists()) {
      const data = healthSnap.data();
      console.log('[Firestore] Data found for date:', date);
      // Helper function to safely convert Firestore Timestamp to Date
      const toDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (timestamp instanceof Date) return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        // If it's already a date string or number
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          return new Date(timestamp);
        }
        return new Date();
      };

      return {
        ...data,
        meals: (data.meals || []).map((meal: any) => ({
          ...meal,
          id: meal.id,
          type: meal.type,
          name: meal.name,
          calories: meal.calories || 0,
          macros: {
            carbs: meal.macros?.carbs || 0,
            protein: meal.macros?.protein || 0,
            fat: meal.macros?.fat || 0,
          },
          timestamp: toDate(meal.timestamp),
        })),
        waterEntries: (data.waterEntries || []).map((entry: any) => ({
          ...entry,
          id: entry.id,
          glasses: entry.glasses || 0,
          timestamp: toDate(entry.timestamp),
        })),
        workouts: (data.workouts || []).map((workout: any) => ({
          ...workout,
          id: workout.id,
          name: workout.name,
          type: workout.type,
          startTime: toDate(workout.startTime),
          endTime: workout.endTime ? toDate(workout.endTime) : undefined,
          duration: workout.duration || 0,
          totalCaloriesBurned: workout.totalCaloriesBurned || 0,
          date: workout.date,
          exercises: (workout.exercises || []).map((ex: any) => ({
            id: ex.id,
            name: ex.name,
            category: ex.category,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            caloriesBurned: ex.caloriesBurned,
            notes: ex.notes,
          })),
          locationTrack: workout.locationTrack ? workout.locationTrack.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp?.toDate ? point.timestamp.toDate() : new Date(point.timestamp),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })) : undefined,
          distance: workout.distance,
          averageSpeed: workout.averageSpeed,
          maxSpeed: workout.maxSpeed,
        })),
        waterIntake: data.waterIntake || 0,
        fastingSession: data.fastingSession ? {
          ...data.fastingSession,
          id: data.fastingSession.id,
          type: data.fastingSession.type,
          startTime: toDate(data.fastingSession.startTime),
          endTime: data.fastingSession.endTime ? toDate(data.fastingSession.endTime) : undefined,
          duration: data.fastingSession.duration || 0,
          targetDuration: data.fastingSession.targetDuration,
          eatingWindow: data.fastingSession.eatingWindow || undefined,
        } : undefined,
      } as DailyHealthData;
    }
    console.log('[Firestore] No data found for date:', date);
    return null;
  } catch (error: any) {
    console.error('[Firestore] Error loading daily health data:', error);
    console.error('[Firestore] Error code:', error.code);
    console.error('[Firestore] Error message:', error.message);
    throw new Error(error.message || 'Failed to get health data');
  }
};

export const addMeal = async (uid: string, date: string, meal: Meal) => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    console.log('[Firestore] Adding meal for user:', uid, 'date:', date);
    const healthRef = doc(db, 'users', uid, 'health', date);
    const healthSnap = await getDoc(healthRef);
    
    const existingData = healthSnap.exists() ? healthSnap.data() : {
      date,
      caloriesConsumed: 0,
      caloriesBurned: 0,
      steps: 0,
      meals: [],
      waterIntake: 0,
      waterEntries: [],
      workouts: [],
    };
    
    const updatedMeals = [...(existingData.meals || []), {
      ...meal,
      timestamp: Timestamp.fromDate(meal.timestamp),
    }];
    
    const updatedCalories = updatedMeals.reduce((sum, m) => sum + m.calories, 0);
    
    await setDoc(healthRef, {
      ...existingData,
      meals: updatedMeals,
      caloriesConsumed: updatedCalories,
    }, { merge: true });
    console.log('[Firestore] Successfully added meal');
  } catch (error: any) {
    console.error('[Firestore] Error adding meal:', error);
    console.error('[Firestore] Error code:', error.code);
    throw new Error(error.message || 'Failed to add meal');
  }
};

const buildMealSuggestionId = (type: Meal['type'], name: string) => {
  const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${type}-${safeName}` || `${type}-meal`;
};

export const saveMealSuggestion = async (
  uid: string,
  suggestion: Omit<MealSuggestion, 'id' | 'updatedAt'> & { id?: string }
) => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }

    const id = suggestion.id || buildMealSuggestionId(suggestion.type, suggestion.name);
    const suggestionRef = doc(db, 'users', uid, 'mealSuggestions', id);

    const dataToSave = stripUndefined({
      type: suggestion.type,
      name: suggestion.name.trim(),
      calories: suggestion.calories || 0,
      macros: {
        carbs: suggestion.macros?.carbs || 0,
        protein: suggestion.macros?.protein || 0,
        fat: suggestion.macros?.fat || 0,
      },
      updatedAt: Timestamp.fromDate(new Date()),
    });

    await setDoc(suggestionRef, dataToSave, { merge: true });
    return id;
  } catch (error: any) {
    console.error('[Firestore] Error saving meal suggestion:', error);
    throw new Error(error.message || 'Failed to save meal suggestion');
  }
};

export const getMealSuggestions = async (uid: string): Promise<MealSuggestion[]> => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }

    const suggestionsRef = collection(db, 'users', uid, 'mealSuggestions');
    const suggestionsSnap = await getDocs(suggestionsRef);

    return suggestionsSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data.type,
        name: data.name,
        calories: data.calories || 0,
        macros: {
          carbs: data.macros?.carbs || 0,
          protein: data.macros?.protein || 0,
          fat: data.macros?.fat || 0,
        },
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
      } as MealSuggestion;
    });
  } catch (error: any) {
    console.error('[Firestore] Error getting meal suggestions:', error);
    throw new Error(error.message || 'Failed to get meal suggestions');
  }
};

export const saveFastingSession = async (uid: string, date: string, session: FastingSession) => {
  try {
    const healthRef = doc(db, 'users', uid, 'health', date);
    await setDoc(healthRef, {
      fastingSession: {
        ...session,
        startTime: Timestamp.fromDate(session.startTime),
        endTime: session.endTime ? Timestamp.fromDate(session.endTime) : null,
      },
    }, { merge: true });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to save fasting session');
  }
};

export const updateHealthMetrics = async (
  uid: string,
  date: string,
  metrics: {
    steps?: number;
    caloriesBurned?: number;
    activeEnergyBurned?: number;
    dietaryEnergyConsumed?: number;
    heartRate?: number;
    restingHeartRate?: number;
  }
) => {
  try {
    const healthRef = doc(db, 'users', uid, 'health', date);
    const healthSnap = await getDoc(healthRef);
    
    if (healthSnap.exists()) {
      // Update existing document, preserving all other fields
      await updateDoc(healthRef, metrics);
    } else {
      // If document doesn't exist, create it with all fields
      await setDoc(healthRef, {
        date,
        caloriesConsumed: 0,
        caloriesBurned: metrics.caloriesBurned || 0,
        activeEnergyBurned: metrics.activeEnergyBurned || 0,
        dietaryEnergyConsumed: metrics.dietaryEnergyConsumed || 0,
        heartRate: metrics.heartRate || 0,
        restingHeartRate: metrics.restingHeartRate || 0,
        steps: metrics.steps || 0,
        meals: [],
        waterIntake: 0,
        waterEntries: [],
      });
    }
  } catch (error: any) {
    // If update fails, try to create the document
    try {
      const healthRef = doc(db, 'users', uid, 'health', date);
      await setDoc(healthRef, {
        date,
        caloriesConsumed: 0,
        caloriesBurned: metrics.caloriesBurned || 0,
        activeEnergyBurned: metrics.activeEnergyBurned || 0,
        dietaryEnergyConsumed: metrics.dietaryEnergyConsumed || 0,
        heartRate: metrics.heartRate || 0,
        restingHeartRate: metrics.restingHeartRate || 0,
        steps: metrics.steps || 0,
        meals: [],
        waterIntake: 0,
        waterEntries: [],
        workouts: [],
      }, { merge: true });
    } catch (createError: any) {
      throw new Error(createError.message || 'Failed to update health metrics');
    }
  }
};

export const addWaterEntry = async (uid: string, date: string, entry: WaterEntry) => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    console.log('[Firestore] Adding water entry for user:', uid, 'date:', date);
    const healthRef = doc(db, 'users', uid, 'health', date);
    const healthSnap = await getDoc(healthRef);
    
    const existingData = healthSnap.exists() ? healthSnap.data() : {
      date,
      caloriesConsumed: 0,
      caloriesBurned: 0,
      steps: 0,
      meals: [],
      waterIntake: 0,
      waterEntries: [],
      workouts: [],
    };
    
    const updatedEntries = [...(existingData.waterEntries || []), {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
    }];
    
    const updatedWaterIntake = updatedEntries.reduce((sum, e) => sum + e.glasses, 0);
    
    await setDoc(healthRef, {
      ...existingData,
      waterEntries: updatedEntries,
      waterIntake: updatedWaterIntake,
    }, { merge: true });
    
    console.log('[Firestore] Successfully added water entry');
    return updatedWaterIntake;
  } catch (error: any) {
    console.error('[Firestore] Error adding water entry:', error);
    console.error('[Firestore] Error code:', error.code);
    throw new Error(error.message || 'Failed to add water entry');
  }
};

export const getWeeklyFastingData = async (uid: string): Promise<{ date: string; duration: number; type: string }[]> => {
  try {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    const startDate = format(weekStart, 'yyyy-MM-dd');
    const endDate = format(weekEnd, 'yyyy-MM-dd');
    
    const healthRef = collection(db, 'users', uid, 'health');
    const q = query(
      healthRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    const weeklyData: { date: string; duration: number; type: string }[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fastingSession && data.fastingSession.endTime) {
        weeklyData.push({
          date: data.date,
          duration: data.fastingSession.duration || 0,
          type: data.fastingSession.type || 'unknown',
        });
      }
    });
    
    return weeklyData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get weekly fasting data');
  }
};

export const getMonthlyFastingData = async (uid: string, year: number, month: number): Promise<{ date: string; duration: number; type: string }[]> => {
  try {
    // month is 1-based (1-12), but Date constructor expects 0-based (0-11)
    const monthDate = new Date(year, month - 1, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const startDate = format(monthStart, 'yyyy-MM-dd');
    const endDate = format(monthEnd, 'yyyy-MM-dd');
    
    const healthRef = collection(db, 'users', uid, 'health');
    const q = query(
      healthRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    const monthlyData: { date: string; duration: number; type: string }[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fastingSession && data.fastingSession.endTime) {
        monthlyData.push({
          date: data.date,
          duration: data.fastingSession.duration || 0,
          type: data.fastingSession.type || 'unknown',
        });
      }
    });
    
    return monthlyData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get monthly fasting data');
  }
};

export const getWeeklyHealthData = async (uid: string): Promise<{ date: string; steps: number; caloriesConsumed: number; caloriesBurned: number; waterIntake: number }[]> => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const startDate = format(weekAgo, 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');
    
    const healthRef = collection(db, 'users', uid, 'health');
    const q = query(
      healthRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    const weeklyData: { date: string; steps: number; caloriesConsumed: number; caloriesBurned: number; waterIntake: number }[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      weeklyData.push({
        date: data.date,
        steps: data.steps || 0,
        caloriesConsumed: data.caloriesConsumed || 0,
        caloriesBurned: data.caloriesBurned || 0,
        waterIntake: data.waterIntake || 0,
      });
    });
    
    return weeklyData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('[Firestore] Error loading weekly health data:', error);
    throw new Error(error.message || 'Failed to get weekly health data');
  }
};

export const getMonthlyWaterData = async (uid: string, year: number, month: number): Promise<{ date: string; waterIntake: number }[]> => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;
    
    const healthRef = collection(db, 'users', uid, 'health');
    const q = query(
      healthRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    const monthlyData: { date: string; waterIntake: number }[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      monthlyData.push({
        date: data.date,
        waterIntake: data.waterIntake || 0,
      });
    });
    
    return monthlyData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get monthly water data');
  }
};

export const addWorkout = async (uid: string, date: string, workout: Workout) => {
  try {
    if (!uid) {
      throw new Error('User ID is required');
    }
    
    console.log('[Firestore] Adding workout for user:', uid, 'date:', date);
    console.log('[Firestore] Workout data:', {
      id: workout.id,
      name: workout.name,
      type: workout.type,
      exercisesCount: workout.exercises?.length || 0,
      locationTrackLength: workout.locationTrack?.length || 0,
    });
    
    const healthRef = doc(db, 'users', uid, 'health', date);
    const healthSnap = await getDoc(healthRef);
    
    const existingData = healthSnap.exists() ? healthSnap.data() : {
      date,
      caloriesConsumed: 0,
      caloriesBurned: 0,
      steps: 0,
      meals: [],
      waterIntake: 0,
      waterEntries: [],
      workouts: [],
    };
    
    // Validate and prepare workout data
    const workoutData = {
      id: workout.id || Date.now().toString(),
      name: workout.name || 'Untitled Workout',
      type: workout.type || 'strength',
      exercises: (workout.exercises || []).map(ex => ({
        id: ex.id || Date.now().toString(),
        name: ex.name || 'Exercise',
        category: ex.category || 'strength',
        sets: ex.sets || 0,
        reps: ex.reps || 0,
        weight: ex.weight || 0,
        duration: ex.duration || 0,
        caloriesBurned: ex.caloriesBurned || 0,
        notes: ex.notes || '',
      })),
      startTime: workout.startTime instanceof Date ? Timestamp.fromDate(workout.startTime) : Timestamp.now(),
      endTime: workout.endTime && workout.endTime instanceof Date ? Timestamp.fromDate(workout.endTime) : null,
      duration: workout.duration || 0,
      totalCaloriesBurned: workout.totalCaloriesBurned || 0,
      date: workout.date || date,
      locationTrack: workout.locationTrack && Array.isArray(workout.locationTrack) && workout.locationTrack.length > 0 
        ? workout.locationTrack
            .filter(point => point && typeof point.latitude === 'number' && typeof point.longitude === 'number')
            .map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
              timestamp: point.timestamp instanceof Date ? Timestamp.fromDate(point.timestamp) : Timestamp.now(),
              altitude: point.altitude || null,
              speed: point.speed || null,
              accuracy: point.accuracy || null,
            }))
        : undefined,
      distance: workout.distance && workout.distance > 0 ? workout.distance : null,
      averageSpeed: workout.averageSpeed && workout.averageSpeed > 0 ? workout.averageSpeed : null,
      maxSpeed: workout.maxSpeed && workout.maxSpeed > 0 ? workout.maxSpeed : null,
    };

    const updatedWorkouts = [...(existingData.workouts || []), workoutData];
    
    const updatedCaloriesBurned = (existingData.caloriesBurned || 0) + workoutData.totalCaloriesBurned;
    
    await setDoc(healthRef, {
      ...existingData,
      workouts: updatedWorkouts,
      caloriesBurned: updatedCaloriesBurned,
    }, { merge: true });
    
    console.log('[Firestore] Successfully added workout');
    return updatedWorkouts;
  } catch (error: any) {
    console.error('[Firestore] Error adding workout:', error);
    console.error('[Firestore] Error code:', error.code);
    console.error('[Firestore] Error details:', {
      uid,
      date,
      workoutId: workout.id,
      workoutName: workout.name,
      locationTrackLength: workout.locationTrack?.length,
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to add workout';
    if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please check your Firestore security rules.';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Firestore is temporarily unavailable. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};
