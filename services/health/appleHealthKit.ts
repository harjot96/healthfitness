import { NativeModules, Platform } from 'react-native';

// HealthKit requires a custom iOS build with the react-native-health native module linked.

export interface HealthKitData {
  steps: number;
  activeEnergyBurned: number;
  dietaryEnergyConsumed: number;
  heartRate?: number;
  restingHeartRate?: number;
  timestamp: Date;
}

class AppleHealthKitService {
  private isAvailable: boolean = false;
  private healthKitModule: any | null = null;

  private getHealthKitModule() {
    if (this.healthKitModule) {
      return this.healthKitModule;
    }

    const module =
      NativeModules.AppleHealthKit ||
      NativeModules.ReactNativeHealth ||
      null;
    this.healthKitModule = module;
    return module;
  }

  private async callHealthKit<T>(methodName: string, options: Record<string, any>): Promise<T> {
    const module = this.getHealthKitModule();
    if (!module || typeof module[methodName] !== 'function') {
      throw new Error(`HealthKit method not available: ${methodName}`);
    }

    return new Promise((resolve, reject) => {
      module[methodName](options, (error: any, results: T) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(results);
      });
    });
  }

  private getTodayRange() {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  private sumSamples(samples: Array<{ value?: number }> | number | null | undefined) {
    if (typeof samples === 'number') {
      return samples;
    }
    if (!samples || !Array.isArray(samples)) {
      return 0;
    }
    return samples.reduce((total, sample) => total + (sample.value || 0), 0);
  }

  private latestSample(samples: Array<{ value?: number; endDate?: string; startDate?: string }> | null | undefined) {
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return undefined;
    }
    const sorted = [...samples].sort((a, b) => {
      const aDate = new Date(a.endDate || a.startDate || 0).getTime();
      const bDate = new Date(b.endDate || b.startDate || 0).getTime();
      return bDate - aDate;
    });
    return sorted[0]?.value;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    const module = this.getHealthKitModule();
    this.isAvailable = !!module;
    return this.isAvailable;
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }
    
    const permissions = {
      permissions: {
        read: [
          'StepCount',
          'ActiveEnergyBurned',
          'DietaryEnergyConsumed',
          'HeartRate',
          'RestingHeartRate',
        ],
      },
    };

    try {
      const module = this.getHealthKitModule();
      if (!module || typeof module.initHealthKit !== 'function') {
        return false;
      }

      await new Promise<void>((resolve, reject) => {
        module.initHealthKit(permissions, (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      return true;
    } catch (error) {
      console.warn('[HealthKit] Permission request failed:', error);
      return false;
    }
  }

  async getStepsToday(): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }
    
    try {
      const rangeOptions = this.getTodayRange();
      const steps = await this.callHealthKit<any>('getStepCount', rangeOptions);
      return typeof steps === 'number' ? steps : this.sumSamples(steps);
    } catch (error) {
      try {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const steps = await this.callHealthKit<any>('getStepCount', {
          date: startDate.toISOString(),
        });
        return typeof steps === 'number' ? steps : this.sumSamples(steps);
      } catch (fallbackError) {
        console.warn('[HealthKit] Failed to fetch steps:', fallbackError);
        return 0;
      }
    }
  }

  async getActiveEnergyBurned(): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }
    
    try {
      const options = this.getTodayRange();
      const samples = await this.callHealthKit<any>('getActiveEnergyBurned', options);
      return this.sumSamples(samples);
    } catch (error) {
      console.warn('[HealthKit] Failed to fetch active energy burned:', error);
      return 0;
    }
  }

  async getDietaryEnergyConsumed(): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }
    
    try {
      const options = this.getTodayRange();
      const samples = await this.callHealthKit<any>('getDietaryEnergyConsumed', options);
      return this.sumSamples(samples);
    } catch (error) {
      console.warn('[HealthKit] Failed to fetch dietary energy consumed:', error);
      return 0;
    }
  }

  async getHeartRate(): Promise<number | undefined> {
    if (!this.isAvailable) {
      return undefined;
    }

    try {
      const options = this.getTodayRange();
      const samples = await this.callHealthKit<any>('getHeartRateSamples', options);
      return this.latestSample(samples);
    } catch (error) {
      console.warn('[HealthKit] Failed to fetch heart rate:', error);
      return undefined;
    }
  }

  async getRestingHeartRate(): Promise<number | undefined> {
    if (!this.isAvailable) {
      return undefined;
    }

    try {
      const options = this.getTodayRange();
      const samples = await this.callHealthKit<any>('getRestingHeartRateSamples', options);
      return this.latestSample(samples);
    } catch (error) {
      console.warn('[HealthKit] Failed to fetch resting heart rate:', error);
      return undefined;
    }
  }

  async getTodayData(): Promise<HealthKitData> {
    const [steps, activeEnergy, dietaryEnergy, heartRate, restingHeartRate] = await Promise.all([
      this.getStepsToday(),
      this.getActiveEnergyBurned(),
      this.getDietaryEnergyConsumed(),
      this.getHeartRate(),
      this.getRestingHeartRate(),
    ]);

    return {
      steps,
      activeEnergyBurned: activeEnergy,
      dietaryEnergyConsumed: dietaryEnergy,
      heartRate,
      restingHeartRate,
      timestamp: new Date(),
    };
  }
}

export const appleHealthKitService = new AppleHealthKitService();
