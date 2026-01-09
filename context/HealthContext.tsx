import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { DailyHealthData, Meal, FastingSession, HealthMetrics, WaterEntry, Workout } from '../types';
import { getDailyHealthData, updateHealthMetrics, addMeal as saveMeal, saveFastingSession, saveDailyHealthData, addWaterEntry as saveWaterEntry, addWorkout as saveWorkout } from '../services/storage/firestore';
import { waterTrackingService } from '../services/health/waterTracking';
import { fastingNotificationService } from '../services/health/fastingNotifications';
import { stepCounterService } from '../services/health/stepCounter';
import { appleHealthKitService } from '../services/health/appleHealthKit';
import { watchConnectivityService } from '../services/watch/WatchConnectivityService';
import { watchSyncHandler } from '../services/watch/WatchSyncHandler';
import { format } from 'date-fns';

interface HealthContextType {
  todayData: DailyHealthData | null;
  loading: boolean;
  healthMetrics: HealthMetrics;
  addMeal: (meal: Meal) => Promise<void>;
  startFasting: (type: string, targetDuration?: number, eatingWindow?: { startHour: number; endHour: number; value: string }) => Promise<void>;
  stopFasting: () => Promise<void>;
  addWaterEntry: (glasses: number) => Promise<void>;
  addWorkout: (workout: Workout) => Promise<void>;
  refreshHealthData: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState<DailyHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    steps: 0,
    caloriesBurned: 0,
    activeEnergyBurned: 0,
    dietaryEnergyConsumed: 0,
    heartRate: 0,
    restingHeartRate: 0,
  });

  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const today = currentDate;

  // Check if date has changed (e.g., at midnight)
  useEffect(() => {
    const checkDateChange = async () => {
      const newDate = format(new Date(), 'yyyy-MM-dd');
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        if (user && todayData) {
          // Save previous day's data before loading new day
          try {
            await saveDailyHealthData(user.uid, todayData);
          } catch (error) {
            console.error('Error saving previous day data:', error);
          }
        }
        // Load new day's data
        if (user) {
          loadTodayData();
        }
      }
    };

    // Check every minute for date change
    const dateCheckInterval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(dateCheckInterval);
  }, [currentDate, user]);

  useEffect(() => {
    if (user) {
      console.log('[HealthContext] User authenticated, initializing...', user.uid);
      loadTodayData();
      initializeHealthTracking();
      initializeWaterTracking();
      
      return () => {
        stepCounterService.stopTracking();
        watchSyncHandler.cleanup();
      };
    } else {
      console.log('[HealthContext] No user authenticated');
    }
  }, [user]);

  // Update watch sync handler with refresh callback when refreshHealthData is available
  // The watch sync handler will work regardless of connection status
  // WatchConnectionContext manages the connection state separately
  useEffect(() => {
    if (user) {
      // Initialize watch sync handler with refresh callback
      // This ensures mobile app updates when watch syncs workouts
      // The handler will receive workout data when watch is connected
      watchSyncHandler.initialize(user.uid, refreshHealthData);
    }
  }, [user, refreshHealthData]);

  useEffect(() => {
    if (!user) return;
    syncFastingNotifications(todayData?.fastingSession);
  }, [user, todayData?.fastingSession?.id, todayData?.fastingSession?.endTime]);

  // Auto-save data to Firebase periodically (every 30 seconds)
  // Also saves active fasting sessions to update duration in real-time
  useEffect(() => {
    if (!user || !todayData) return;

    const autoSaveInterval = setInterval(() => {
      // If there's an active fasting session, update its duration before saving
      if (todayData.fastingSession && !todayData.fastingSession.endTime) {
        const updatedSession: FastingSession = {
          ...todayData.fastingSession,
          duration: (Date.now() - todayData.fastingSession.startTime.getTime()) / (1000 * 60 * 60),
        };
        const updatedData: DailyHealthData = {
          ...todayData,
          fastingSession: updatedSession,
        };
        setTodayData(updatedData);
        saveDailyHealthData(user.uid, updatedData).catch(error => {
          console.error('[HealthContext] Error auto-saving fasting session:', error);
        });
      } else {
        saveTodayDataToFirebase();
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [user, todayData]);

  // Save data when app goes to background or component unmounts
  useEffect(() => {
    if (!user || !todayData) return;

    const handleBeforeUnload = () => {
      saveTodayDataToFirebase();
    };

    // Save on component unmount
    return () => {
      handleBeforeUnload();
    };
  }, [user, todayData]);

  const initializeWaterTracking = async () => {
    try {
      await waterTrackingService.requestPermissions();
      const settings = await waterTrackingService.getNotificationSettings();
      if (settings.enabled) {
        await waterTrackingService.scheduleNotifications(settings);
      }
    } catch (error) {
      console.error('Error initializing water tracking:', error);
    }
  };

  const syncFastingNotifications = async (session?: FastingSession) => {
    try {
      if (!session || session.endTime) {
        await fastingNotificationService.cancelAllNotifications();
        return;
      }

      const granted = await fastingNotificationService.requestPermissions();
      if (!granted) return;

      await fastingNotificationService.scheduleHourlyNotifications(
        session.startTime,
        session.targetDuration
      );

      // Schedule eating window notifications if available
      if (session.eatingWindow) {
        await fastingNotificationService.scheduleEatingWindowNotifications(
          session.startTime,
          session.eatingWindow
        );
      }
    } catch (error) {
      console.error('Error syncing fasting notifications:', error);
    }
  };

  const initializeHealthTracking = async () => {
    if (Platform.OS === 'ios') {
      await appleHealthKitService.initialize();
      await appleHealthKitService.requestPermissions();
      loadHealthKitData();
    } else if (Platform.OS === 'android') {
      await stepCounterService.requestPermissions();
      stepCounterService.startTracking();
      stepCounterService.addListener(async (data) => {
        setHealthMetrics(prev => ({
          ...prev,
          steps: data.steps,
        }));
        if (user && todayData) {
          await updateHealthMetrics(user.uid, today, { steps: data.steps });
          // Update local data and save complete data to Firebase
          const updatedData: DailyHealthData = {
            ...todayData,
            steps: data.steps,
          };
          setTodayData(updatedData);
          await saveDailyHealthData(user.uid, updatedData);
        }
      });
    }
  };

  const loadHealthKitData = async () => {
    try {
      const data = await appleHealthKitService.getTodayData();
      setHealthMetrics({
        steps: data.steps,
        caloriesBurned: data.activeEnergyBurned,
        activeEnergyBurned: data.activeEnergyBurned,
        dietaryEnergyConsumed: data.dietaryEnergyConsumed,
        heartRate: data.heartRate,
        restingHeartRate: data.restingHeartRate,
      });
      if (user && todayData) {
        await updateHealthMetrics(user.uid, today, {
          steps: data.steps,
          caloriesBurned: data.activeEnergyBurned,
          activeEnergyBurned: data.activeEnergyBurned,
          dietaryEnergyConsumed: data.dietaryEnergyConsumed,
          heartRate: data.heartRate,
          restingHeartRate: data.restingHeartRate,
        });
        // Update local data and save complete data to Firebase
        const updatedData: DailyHealthData = {
          ...todayData,
          steps: data.steps,
          caloriesBurned: data.activeEnergyBurned,
          activeEnergyBurned: data.activeEnergyBurned,
          dietaryEnergyConsumed: data.dietaryEnergyConsumed,
          heartRate: data.heartRate,
          restingHeartRate: data.restingHeartRate,
        };
        setTodayData(updatedData);
        await saveDailyHealthData(user.uid, updatedData);
      }
    } catch (error) {
      console.error('Error loading HealthKit data:', error);
    }
  };

  // Sync daily stats to Apple Watch
  const syncStatsToWatch = async () => {
    if (!todayData || Platform.OS !== 'ios') return;
    
    try {
      const isReachable = await watchConnectivityService.isWatchReachable();
      if (isReachable) {
        await watchConnectivityService.sendDailyStats({
          steps: todayData.steps,
          calories: Math.round(todayData.caloriesConsumed),
          water: todayData.waterIntake || 0,
        });
      }
    } catch (error) {
      // Silently fail - watch might not be available
      console.debug('Watch not available:', error);
    }
  };

  const loadTodayData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getDailyHealthData(user.uid, today);
      if (data) {
        setTodayData(data);
        setHealthMetrics({
          steps: data.steps,
          caloriesBurned: data.caloriesBurned,
          activeEnergyBurned: data.activeEnergyBurned || 0,
          dietaryEnergyConsumed: data.dietaryEnergyConsumed || 0,
          heartRate: data.heartRate || 0,
          restingHeartRate: data.restingHeartRate || 0,
        });
        // Sync to watch after loading
        syncStatsToWatch();
      } else {
        // Initialize empty data for today and save to Firebase
        const emptyData: DailyHealthData = {
          date: today,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          activeEnergyBurned: 0,
          dietaryEnergyConsumed: 0,
          heartRate: 0,
          restingHeartRate: 0,
          steps: 0,
          meals: [],
          waterIntake: 0,
          waterEntries: [],
          workouts: [],
        };
        setTodayData(emptyData);
        // Save empty data to Firebase to ensure document exists
        await saveDailyHealthData(user.uid, emptyData);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save complete daily data to Firebase
  const saveTodayDataToFirebase = async () => {
    if (!user || !todayData) {
      console.warn('[HealthContext] Cannot save: user or todayData is missing', { user: !!user, todayData: !!todayData });
      return;
    }
    
    try {
      console.log('[HealthContext] Saving today data to Firebase...');
      await saveDailyHealthData(user.uid, todayData);
      console.log('[HealthContext] Successfully saved today data to Firebase');
    } catch (error: any) {
      console.error('[HealthContext] Error saving today data to Firebase:', error);
      console.error('[HealthContext] Error details:', {
        code: error.code,
        message: error.message,
        userId: user.uid,
        date: todayData.date,
      });
    }
  };

  const addMeal = async (meal: Meal) => {
    if (!user || !todayData) return;
    
    try {
      await saveMeal(user.uid, today, meal);
      const updatedMeals = [...todayData.meals, meal];
      const updatedCalories = updatedMeals.reduce((sum, m) => sum + m.calories, 0);
      
      const updatedData: DailyHealthData = {
        ...todayData,
        meals: updatedMeals,
        caloriesConsumed: updatedCalories,
      };
      
      setTodayData(updatedData);
      // Save complete data to Firebase
      await saveDailyHealthData(user.uid, updatedData);
    } catch (error) {
      console.error('Error adding meal:', error);
      throw error;
    }
  };

  const startFasting = async (type: string, targetDuration?: number, eatingWindow?: { startHour: number; endHour: number; value: string }) => {
    if (!user || !todayData) return;
    
    try {
      const session: FastingSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        duration: 0,
        type,
        targetDuration,
        eatingWindow,
      };
      
      await saveFastingSession(user.uid, today, session);
      
      const updatedData: DailyHealthData = {
        ...todayData,
        fastingSession: session,
      };
      
      setTodayData(updatedData);
      // Save complete data to Firebase
      await saveDailyHealthData(user.uid, updatedData);
    } catch (error) {
      console.error('Error starting fasting:', error);
      throw error;
    }
  };

  const stopFasting = async () => {
    if (!user || !todayData || !todayData.fastingSession) return;
    
    try {
      const session: FastingSession = {
        ...todayData.fastingSession,
        endTime: new Date(),
        duration: (Date.now() - todayData.fastingSession.startTime.getTime()) / (1000 * 60 * 60),
      };
      
      await saveFastingSession(user.uid, today, session);
      
      const updatedData: DailyHealthData = {
        ...todayData,
        fastingSession: session,
      };
      
      setTodayData(updatedData);
      // Save complete data to Firebase
      await saveDailyHealthData(user.uid, updatedData);
      await fastingNotificationService.cancelAllNotifications();
    } catch (error) {
      console.error('Error stopping fasting:', error);
      throw error;
    }
  };

  const addWaterEntry = async (glasses: number) => {
    if (!user || !todayData) return;
    
    const WATER_GOAL = 8; // 8 glasses per day
    const currentWater = todayData.waterIntake || 0;
    const newTotal = currentWater + glasses;
    
    // Validate that water intake doesn't exceed the goal
    if (newTotal > WATER_GOAL) {
      const remaining = WATER_GOAL - currentWater;
      if (remaining > 0) {
        // Allow adding only the remaining amount
        glasses = remaining;
      } else {
        throw new Error(`You've already reached your daily goal of ${WATER_GOAL} glasses!`);
      }
    }
    
    try {
      const entry: WaterEntry = {
        id: Date.now().toString(),
        glasses,
        timestamp: new Date(),
      };
      
      const updatedWaterIntake = await saveWaterEntry(user.uid, today, entry);
      const updatedEntries = [...(todayData.waterEntries || []), entry];

      const updatedData: DailyHealthData = {
        ...todayData,
        waterEntries: updatedEntries,
        waterIntake: updatedWaterIntake,
      };

      setTodayData(updatedData);
      // Save complete data to Firebase
      await saveDailyHealthData(user.uid, updatedData);
    } catch (error) {
      console.error('Error adding water entry:', error);
      throw error;
    }
  };

  const addWorkout = async (workout: Workout) => {
    if (!user || !todayData) return;
    
    try {
      await saveWorkout(user.uid, today, workout);
      const updatedWorkouts = [...(todayData.workouts || []), workout];
      
      const updatedData: DailyHealthData = {
        ...todayData,
        workouts: updatedWorkouts,
        caloriesBurned: (todayData.caloriesBurned || 0) + workout.totalCaloriesBurned,
      };
      
      setTodayData(updatedData);
      // Save complete data to Firebase
      await saveDailyHealthData(user.uid, updatedData);
    } catch (error) {
      console.error('Error adding workout:', error);
      throw error;
    }
  };

  const refreshHealthData = async () => {
    await loadTodayData();
    if (Platform.OS === 'ios') {
      await loadHealthKitData();
    } else if (Platform.OS === 'android' && user && todayData) {
      // For Android, ensure current step data is saved
      await saveTodayDataToFirebase();
    }
    // Always save current state after refresh
    if (user && todayData) {
      await saveTodayDataToFirebase();
    }
  };

  return (
    <HealthContext.Provider
      value={{
        todayData,
        loading,
        healthMetrics,
        addMeal,
        startFasting,
        stopFasting,
        addWaterEntry,
        addWorkout,
        refreshHealthData,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
