/**
 * WatchConnectivityService
 * 
 * Service to communicate with Apple Watch app
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { WatchConnectivityModule } = NativeModules;

export interface DailyStats {
  steps: number;
  calories: number;
  water: number;
}

export interface WorkoutEvent {
  type: 'running' | 'walking' | 'cycling';
  duration?: number;
  distance?: number;
}

class WatchConnectivityService {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'ios' && WatchConnectivityModule) {
      this.eventEmitter = new NativeEventEmitter(WatchConnectivityModule);
    }
  }

  /**
   * Check if Apple Watch is reachable
   */
  async isWatchReachable(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityModule) {
      return false;
    }

    try {
      return await WatchConnectivityModule.isWatchReachable();
    } catch (error) {
      console.warn('Error checking watch reachability:', error);
      return false;
    }
  }

  /**
   * Send daily stats to Apple Watch
   */
  async sendDailyStats(stats: DailyStats): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityModule) {
      return false;
    }

    try {
      await WatchConnectivityModule.sendDailyStats({
        steps: stats.steps,
        calories: stats.calories,
        water: stats.water,
      });
      return true;
    } catch (error) {
      console.warn('Error sending daily stats to watch:', error);
      return false;
    }
  }

  /**
   * Send user authentication status to Apple Watch
   */
  async sendUserAuthStatus(userId: string, email: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityModule) {
      return false;
    }

    try {
      await WatchConnectivityModule.sendUserAuthStatus(userId, email);
      return true;
    } catch (error) {
      console.warn('Error sending user auth status to watch:', error);
      return false;
    }
  }

  /**
   * Notify watch that user signed out
   */
  async sendUserSignedOut(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityModule) {
      return false;
    }

    try {
      await WatchConnectivityModule.sendUserSignedOut();
      return true;
    } catch (error) {
      console.warn('Error sending user signed out to watch:', error);
      return false;
    }
  }

  /**
   * Listen for workout started events from watch
   */
  onWorkoutStarted(callback: (event: WorkoutEvent) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('workoutStarted', (event: WorkoutEvent) => {
      callback(event);
    });

    return () => subscription.remove();
  }

  /**
   * Listen for workout stopped events from watch
   */
  onWorkoutStopped(callback: (event: WorkoutEvent) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('workoutStopped', (event: WorkoutEvent) => {
      callback(event);
    });

    return () => subscription.remove();
  }

  /**
   * Listen for auth status requests from watch
   */
  onRequestAuthStatus(callback: () => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('requestAuthStatus', () => {
      callback();
    });

    return () => subscription.remove();
  }

  /**
   * Listen for workout sync requests from watch
   */
  onSyncWorkoutToFirebase(callback: (workoutData: any) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('syncWorkoutToFirebase', (event: { workoutData: any }) => {
      callback(event.workoutData);
    });

    return () => subscription.remove();
  }

  /**
   * Listen for health data sync requests from watch
   */
  onSyncHealthDataToFirebase(callback: (healthData: any) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('syncHealthDataToFirebase', (event: { healthData: any }) => {
      callback(event.healthData);
    });

    return () => subscription.remove();
  }

  /**
   * Listen for sync pending data requests from watch
   */
  onRequestSyncPendingData(callback: () => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('requestSyncPendingData', () => {
      callback();
    });

    return () => subscription.remove();
  }
}

export const watchConnectivityService = new WatchConnectivityService();

