import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { DeviceMotion } from 'expo-sensors';

// For Android step counter
// Note: This is a simplified implementation
// For production, you'd want to use a more robust solution like react-native-pedometer
// or implement native modules for better accuracy

export interface StepCounterData {
  steps: number;
  timestamp: Date;
}

class StepCounterService {
  private stepCount: number = 0;
  private isTracking: boolean = false;
  private lastUpdate: Date = new Date();
  private listeners: ((data: StepCounterData) => void)[] = [];

  async requestPermissions(): Promise<boolean> {
    // For Android, permissions are handled in app.json
    // For iOS, we'd use HealthKit (separate service)
    if (Platform.OS === 'android') {
      // Permissions are already configured in app.json
      return true;
    }
    return false;
  }

  async getStepsToday(): Promise<number> {
    // This is a placeholder - in production, you'd integrate with
    // Android's Step Counter API or HealthKit
    // For now, return the tracked steps
    return this.stepCount;
  }

  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.stepCount = 0;
    this.lastUpdate = new Date();

    // Simplified step detection using accelerometer
    // In production, use proper step counter APIs
    if (Platform.OS === 'android') {
      Accelerometer.setUpdateInterval(100);
      Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        // Simple threshold-based step detection
        if (magnitude > 1.2 && Date.now() - this.lastUpdate.getTime() > 300) {
          this.stepCount++;
          this.lastUpdate = new Date();
          this.notifyListeners({
            steps: this.stepCount,
            timestamp: new Date(),
          });
        }
      });
    }
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    Accelerometer.removeAllListeners();
  }

  getCurrentSteps(): number {
    return this.stepCount;
  }

  addListener(callback: (data: StepCounterData) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (data: StepCounterData) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(data: StepCounterData) {
    this.listeners.forEach(listener => listener(data));
  }

  reset() {
    this.stepCount = 0;
    this.lastUpdate = new Date();
  }
}

export const stepCounterService = new StepCounterService();

