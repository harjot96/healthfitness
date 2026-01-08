/**
 * WatchSyncHandler
 * 
 * Handles syncing data from Apple Watch to Firebase
 */

import { watchConnectivityService } from './WatchConnectivityService';
import { addWorkout, saveDailyHealthData } from '../storage/firestore';
import { format } from 'date-fns';
import { Workout } from '../../types';

class WatchSyncHandler {
  private unsubscribeCallbacks: (() => void)[] = [];
  private refreshCallback: (() => Promise<void>) | null = null;

  /**
   * Initialize watch sync handlers
   */
  initialize(userId: string, refreshHealthData?: () => Promise<void>) {
    // Clean up existing listeners
    this.cleanup();

    // Store refresh callback
    this.refreshCallback = refreshHealthData || null;

    // Listen for workout sync requests
    const workoutUnsubscribe = watchConnectivityService.onSyncWorkoutToFirebase(
      async (workoutData: any) => {
        try {
          await this.syncWorkoutToFirebase(userId, workoutData);
          // Refresh health data in mobile app after workout is synced
          if (this.refreshCallback) {
            console.log('[WatchSync] Refreshing health data after workout sync');
            await this.refreshCallback();
          }
        } catch (error) {
          console.error('[WatchSync] Error syncing workout:', error);
        }
      }
    );

    // Listen for health data sync requests
    const healthDataUnsubscribe = watchConnectivityService.onSyncHealthDataToFirebase(
      async (healthData: any) => {
        try {
          await this.syncHealthDataToFirebase(userId, healthData);
          // Refresh health data in mobile app after health data is synced
          if (this.refreshCallback) {
            console.log('[WatchSync] Refreshing health data after health data sync');
            await this.refreshCallback();
          }
        } catch (error) {
          console.error('[WatchSync] Error syncing health data:', error);
        }
      }
    );

    // Listen for sync pending data requests
    const syncPendingUnsubscribe = watchConnectivityService.onRequestSyncPendingData(
      async () => {
        try {
          // Watch is requesting to sync all pending data
          // This is handled by the watch app itself, but we can acknowledge
          console.log('[WatchSync] Watch requested sync of pending data');
        } catch (error) {
          console.error('[WatchSync] Error handling sync request:', error);
        }
      }
    );

    this.unsubscribeCallbacks = [
      workoutUnsubscribe,
      healthDataUnsubscribe,
      syncPendingUnsubscribe,
    ];
  }

  /**
   * Sync workout data from watch to Firebase
   */
  private async syncWorkoutToFirebase(userId: string, workoutData: any) {
    try {
      console.log('[WatchSync] ===== WORKOUT SYNC STARTED =====');
      console.log('[WatchSync] Received workout data:', JSON.stringify(workoutData, null, 2));
      console.log('[WatchSync] User ID:', userId);

      // Convert workout data from watch format to app format
      const workout: Workout = {
        id: workoutData.id || Date.now().toString(),
        name: workoutData.type ? `${workoutData.type.charAt(0).toUpperCase() + workoutData.type.slice(1)} Workout` : 'Watch Workout',
        type: workoutData.type || 'running',
        startTime: workoutData.startTime
          ? new Date(workoutData.startTime * 1000)
          : new Date(),
        endTime: workoutData.endTime
          ? new Date(workoutData.endTime * 1000)
          : undefined,
        duration: workoutData.duration || 0,
        totalCaloriesBurned: workoutData.calories || 0,
        distance: workoutData.distance || 0,
        exercises: [],
        date: format(workoutData.startTime ? new Date(workoutData.startTime * 1000) : new Date(), 'yyyy-MM-dd'),
      };

      console.log('[WatchSync] Converted workout:', {
        id: workout.id,
        name: workout.name,
        type: workout.type,
        duration: workout.duration,
        calories: workout.totalCaloriesBurned,
        date: workout.date,
      });

      const date = workout.date;
      await addWorkout(userId, date, workout);

      console.log('[WatchSync] ✅ Workout synced successfully to Firebase:', workout.id);
      console.log('[WatchSync] ===== WORKOUT SYNC COMPLETED =====');
    } catch (error: any) {
      console.error('[WatchSync] ❌ Error syncing workout:', error);
      console.error('[WatchSync] Error details:', {
        message: error.message,
        stack: error.stack,
        workoutData: workoutData,
      });
      throw error;
    }
  }

  /**
   * Sync health data from watch to Firebase
   */
  private async syncHealthDataToFirebase(userId: string, healthData: any) {
    try {
      console.log('[WatchSync] Syncing health data to Firebase:', healthData.date);

      // The healthData.data should already be in the correct format
      // We just need to ensure it's properly structured
      const date = healthData.date || format(new Date(), 'yyyy-MM-dd');
      
      // If the data is already in DailyHealthData format, use it directly
      // Otherwise, we might need to merge it with existing data
      if (healthData.data) {
        // Convert timestamp fields if needed
        const processedData = {
          ...healthData.data,
          date: date,
        };

        // Use saveDailyHealthData to save/update
        // Note: This might need adjustment based on the exact structure
        await saveDailyHealthData(userId, processedData as any);

        console.log('[WatchSync] Health data synced successfully:', date);
      }
    } catch (error: any) {
      console.error('[WatchSync] Error syncing health data:', error);
      throw error;
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.refreshCallback = null;
  }
}

export const watchSyncHandler = new WatchSyncHandler();

