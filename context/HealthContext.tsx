import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { DailyHealthData, Meal, FastingSession, HealthMetrics, WaterEntry, Workout } from '../types';
import { getDailyHealthData, saveDailyHealthData, addMeal as saveMeal, saveFastingSession, addWaterEntry as saveWaterEntry, addWorkout as saveWorkout, updateHealthMetrics, updateRingStats } from '../services/api/health';
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
  flushTodayData: () => Promise<void>;
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
  
  // Use ref to get latest todayData in intervals
  const todayDataRef = React.useRef<DailyHealthData | null>(null);
  useEffect(() => {
    todayDataRef.current = todayData;
  }, [todayData]);

  // Check if date has changed (e.g., at midnight)
  useEffect(() => {
    const checkDateChange = async () => {
      const newDate = format(new Date(), 'yyyy-MM-dd');
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        if (user && todayData) {
          // Save previous day's data before loading new day
          try {
            await saveDailyHealthData(todayData);
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
  // Checks for fasting completion and auto-completes if target duration is reached
  useEffect(() => {
    if (!user) return;

    const autoSaveInterval = setInterval(async () => {
      // Use ref to get latest todayData to avoid stale closure
      const currentData = todayDataRef.current;
      if (!currentData) {
        return;
      }

      // If there's an active fasting session, update its duration before saving
      if (currentData.fastingSession && !currentData.fastingSession.endTime) {
        const now = Date.now();
        const startTime = currentData.fastingSession.startTime.getTime();
        const durationHours = (now - startTime) / (1000 * 60 * 60);
        
        // Check if target duration is reached and auto-complete
        if (currentData.fastingSession.targetDuration && durationHours >= currentData.fastingSession.targetDuration) {
          // Auto-complete the fasting session
          const completedSession: FastingSession = {
            ...currentData.fastingSession,
            endTime: new Date(),
            duration: currentData.fastingSession.targetDuration, // Use target duration as actual duration
          };
          
          const updatedData: DailyHealthData = {
            ...currentData,
            fastingSession: completedSession,
          };
          
          setTodayData(updatedData);
          
          try {
            await saveFastingSession(today, completedSession);
            await saveDailyHealthData(updatedData);
            await fastingNotificationService.cancelAllNotifications();
            console.log('[HealthContext] Fasting completed automatically - target duration reached');
            
            // TODO: Trigger completion notification via GraphQL
          } catch (error) {
            console.error('[HealthContext] Error auto-completing fasting session:', error);
          }
        } else {
          // Double-check that session hasn't been stopped (using latest ref)
          const latestData = todayDataRef.current;
          if (latestData?.fastingSession && !latestData.fastingSession.endTime) {
            // Update duration without completing
            const updatedSession: FastingSession = {
              ...latestData.fastingSession,
              duration: durationHours,
            };
            const updatedData: DailyHealthData = {
              ...latestData,
              fastingSession: updatedSession,
            };
            setTodayData(updatedData);
            saveFastingSession(latestData.date, updatedSession).catch(error => {
              console.error('[HealthContext] Error auto-saving fasting session:', error);
            });
            saveDailyHealthData(updatedData).catch(error => {
              console.error('[HealthContext] Error auto-saving daily health data:', error);
            });
          }
        }
      } else {
        // Save other data (not fasting-related)
        saveTodayDataToFirebase();
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [user]);

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
          await updateHealthMetrics(today, { steps: data.steps });
          // Update local data and save complete data
          const updatedData: DailyHealthData = {
            ...todayData,
            steps: data.steps,
          };
          setTodayData(updatedData);
          await saveDailyHealthData(updatedData);
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
        await updateHealthMetrics(today, {
          steps: data.steps,
          caloriesBurned: data.activeEnergyBurned,
          activeEnergyBurned: data.activeEnergyBurned,
          dietaryEnergyConsumed: data.dietaryEnergyConsumed,
          heartRate: data.heartRate,
          restingHeartRate: data.restingHeartRate,
        });
        // Update local data and save complete data
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
        await saveDailyHealthData(updatedData);
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
      const data = await getDailyHealthData(today);
      if (data) {
        // Check if we have a local stopped session that hasn't been saved yet
        const currentLocalData = todayDataRef.current;
        if (currentLocalData?.fastingSession?.endTime && 
            (!data.fastingSession?.endTime || 
             data.fastingSession.endTime.getTime() !== currentLocalData.fastingSession.endTime.getTime())) {
          // Local data has a stopped session that Firebase doesn't have yet
          // Keep the local stopped session and save it again
          console.log('[HealthContext] Local stopped session not yet in Firebase, preserving it...');
          const preservedData: DailyHealthData = {
            ...data,
            fastingSession: currentLocalData.fastingSession,
          };
          setTodayData(preservedData);
          todayDataRef.current = preservedData;
          // Try to save again
          if (currentLocalData.fastingSession) {
            await saveFastingSession(today, currentLocalData.fastingSession);
            await saveDailyHealthData(preservedData);
          }
        } else {
          // Normal load - Firebase data is up to date
          setTodayData(data);
          todayDataRef.current = data;
        }
        
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
        todayDataRef.current = emptyData;
        // Save empty data to ensure document exists
        await saveDailyHealthData(emptyData);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update ring stats
  const updateRingStatsToBackend = async (data: DailyHealthData) => {
    if (!user) return;

    try {
      // Calculate workout minutes from workouts
      const workoutMinutes = data.workouts.reduce((total, workout) => {
        return total + (workout.duration || 0);
      }, 0);

      // Default goals (can be customized later)
      const goalCalories = 600;
      const goalSteps = 8000;
      const goalMinutes = 45;

      await updateRingStats({
        date: data.date,
        caloriesBurned: data.caloriesBurned || 0,
        steps: data.steps || 0,
        workoutMinutes,
        goalCalories,
        goalSteps,
        goalMinutes,
      });

      console.log('[HealthContext] Ring stats updated');
    } catch (error) {
      console.error('[HealthContext] Error updating ring stats:', error);
      // Don't throw - ring stats update is not critical
    }
  };

  // Save complete daily data
  const saveTodayDataToFirebase = async () => {
    if (!user) {
      console.warn('[HealthContext] Cannot save: user is missing');
      return;
    }
    
    // Use ref to get latest data
    const currentData = todayDataRef.current;
    if (!currentData) {
      console.warn('[HealthContext] Cannot save: todayData is missing');
      return;
    }
    
    try {
      console.log('[HealthContext] Saving today data...');
      let dataToSave = currentData;

      if (currentData.fastingSession) {
        let sessionToSave = currentData.fastingSession;
        if (!currentData.fastingSession.endTime) {
          const durationHours = (Date.now() - currentData.fastingSession.startTime.getTime()) / (1000 * 60 * 60);
          sessionToSave = {
            ...currentData.fastingSession,
            duration: durationHours,
          };
          dataToSave = {
            ...currentData,
            fastingSession: sessionToSave,
          };
        }

        try {
          await saveFastingSession(currentData.date, sessionToSave);
        } catch (error) {
          console.error('[HealthContext] Error saving fasting session:', error);
        }
      }

      if (dataToSave !== currentData) {
        todayDataRef.current = dataToSave;
      }

      await saveDailyHealthData(dataToSave);
      console.log('[HealthContext] Successfully saved today data');
      
      // Update ring stats
      await updateRingStatsToBackend(dataToSave);
    } catch (error: any) {
      console.error('[HealthContext] Error saving today data:', error);
      console.error('[HealthContext] Error details:', {
        message: error.message,
        userId: user.uid,
        date: currentData.date,
      });
    }
  };

  const addMeal = async (meal: Meal) => {
    if (!user || !todayData) return;
    
    try {
      await saveMeal(today, meal);
      const updatedMeals = [...todayData.meals, meal];
      const updatedCalories = updatedMeals.reduce((sum, m) => sum + m.calories, 0);
      
      const updatedData: DailyHealthData = {
        ...todayData,
        meals: updatedMeals,
        caloriesConsumed: updatedCalories,
      };
      
      setTodayData(updatedData);
      // Save complete data
      await saveDailyHealthData(updatedData);
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
      
      await saveFastingSession(today, session);
      
      const updatedData: DailyHealthData = {
        ...todayData,
        fastingSession: session,
      };
      
      setTodayData(updatedData);
      // Save complete data
      await saveDailyHealthData(updatedData);
      
      // Schedule completion notification if target duration is set
      if (targetDuration && targetDuration > 0) {
        const remainingMinutes = targetDuration * 60;
        await fastingNotificationService.scheduleCompletionNotification(remainingMinutes, targetDuration);
      }
    } catch (error) {
      console.error('Error starting fasting:', error);
      throw error;
    }
  };

  const stopFasting = async () => {
    if (!user || !todayData || !todayData.fastingSession) {
      console.error('[HealthContext] Cannot stop fasting: No active session', {
        hasUser: !!user,
        hasTodayData: !!todayData,
        hasFastingSession: !!todayData?.fastingSession,
      });
      throw new Error('No active fasting session to stop');
    }
    
    if (todayData.fastingSession.endTime) {
      console.warn('[HealthContext] Fasting session already completed');
      throw new Error('Fasting session is already completed');
    }
    
    try {
      console.log('[HealthContext] Stopping fasting session...');
      const now = new Date();
      const durationHours = (now.getTime() - todayData.fastingSession.startTime.getTime()) / (1000 * 60 * 60);
      
      const session: FastingSession = {
        ...todayData.fastingSession,
        endTime: now,
        duration: durationHours,
      };
      
      console.log('[HealthContext] Session data:', {
        id: session.id,
        type: session.type,
        duration: durationHours,
        hasEndTime: !!session.endTime,
        targetDuration: session.targetDuration,
      });
      
      // Update local state first for immediate UI feedback
      const updatedData: DailyHealthData = {
        ...todayData,
        fastingSession: session,
      };
      setTodayData(updatedData);
      // Update ref immediately to prevent auto-save from overwriting
      todayDataRef.current = updatedData;
      
      // Save - CRITICAL: Must complete before any reloads
      console.log('[HealthContext] Saving fasting session...');
      await saveFastingSession(today, session);
      
      console.log('[HealthContext] Saving complete daily health data...');
      await saveDailyHealthData(updatedData);
      
      // Verify the save by checking one more time
      console.log('[HealthContext] Verifying save completed...');
      const verifyData = await getDailyHealthData(today);
      if (verifyData?.fastingSession) {
        const savedEndTime = verifyData.fastingSession.endTime;
        if (savedEndTime) {
          console.log('[HealthContext] ✓ Verified: endTime is saved in Firebase:', savedEndTime.toISOString());
        } else {
          console.warn('[HealthContext] ⚠ Warning: endTime not found after save. Retrying...');
          // Retry save if verification failed
          await saveFastingSession(today, session);
          await saveDailyHealthData(updatedData);
        }
      }
      
      // Cancel all notifications
      console.log('[HealthContext] Cancelling notifications...');
      await fastingNotificationService.cancelAllNotifications();
      
      // TODO: Trigger completion notification via GraphQL if target was reached
      if (todayData.fastingSession.targetDuration && durationHours >= todayData.fastingSession.targetDuration * 0.9) {
        console.log('[HealthContext] Fasting target reached - notification can be sent via backend');
      }
      
      console.log('[HealthContext] Fasting session stopped successfully');
    } catch (error: any) {
      console.error('[HealthContext] Error stopping fasting:', error);
      console.error('[HealthContext] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
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
      
      await saveWaterEntry(today, entry);
      const updatedEntries = [...(todayData.waterEntries || []), entry];
      const updatedWaterIntake = (todayData.waterIntake || 0) + glasses;

      const updatedData: DailyHealthData = {
        ...todayData,
        waterEntries: updatedEntries,
        waterIntake: updatedWaterIntake,
      };

      setTodayData(updatedData);
      // Save complete data
      await saveDailyHealthData(updatedData);
    } catch (error) {
      console.error('Error adding water entry:', error);
      throw error;
    }
  };

  const addWorkout = async (workout: Workout) => {
    if (!user || !todayData) return;
    
    try {
      await saveWorkout(today, workout);
      const updatedWorkouts = [...(todayData.workouts || []), workout];
      
      const updatedData: DailyHealthData = {
        ...todayData,
        workouts: updatedWorkouts,
        caloriesBurned: (todayData.caloriesBurned || 0) + workout.totalCaloriesBurned,
      };
      
      setTodayData(updatedData);
      // Save complete data
      await saveDailyHealthData(updatedData);
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

  const flushTodayData = async () => {
    if (!user || !todayData) return;

    try {
      let updatedData = todayData;

      if (todayData.fastingSession && !todayData.fastingSession.endTime) {
        const activeSession: FastingSession = {
          ...todayData.fastingSession,
          duration: (Date.now() - todayData.fastingSession.startTime.getTime()) / (1000 * 60 * 60),
        };
        updatedData = {
          ...todayData,
          fastingSession: activeSession,
        };
        await saveFastingSession(today, activeSession);
      }

      await saveDailyHealthData(updatedData);
    } catch (error) {
      console.error('Error flushing health data:', error);
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
        flushTodayData,
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
