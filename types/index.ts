export interface User {
  uid: string;
  email: string;
  profile?: UserProfile;
}

export interface UserProfile {
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  gender: 'male' | 'female' | 'other';
}

export interface DailyHealthData {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  activeEnergyBurned?: number;
  dietaryEnergyConsumed?: number;
  heartRate?: number;
  restingHeartRate?: number;
  steps: number;
  meals: Meal[];
  fastingSession?: FastingSession;
  waterIntake: number; // in glasses (8oz each)
  waterEntries: WaterEntry[];
  workouts: Workout[];
}

export interface WaterEntry {
  id: string;
  glasses: number;
  timestamp: Date;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  timestamp: Date;
}

export interface MealSuggestion {
  id: string;
  type: Meal['type'];
  name: string;
  calories: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  updatedAt?: Date;
}

export interface FastingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  type: string;
  targetDuration?: number;
}

export interface HealthMetrics {
  steps: number;
  caloriesBurned: number;
  activeEnergyBurned?: number;
  dietaryEnergyConsumed?: number;
  heartRate?: number;
  restingHeartRate?: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';
  duration?: number; // in minutes
  sets?: number;
  reps?: number;
  weight?: number; // in kg
  caloriesBurned?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  type: 'cardio' | 'strength' | 'hiit' | 'yoga' | 'pilates' | 'running' | 'cycling' | 'swimming' | 'other';
  exercises: Exercise[];
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  totalCaloriesBurned: number;
  date: string;
}
