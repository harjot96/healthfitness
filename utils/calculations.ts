import { UserProfile } from '../types';

// Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
export const calculateBMR = (profile: UserProfile): number => {
  const { age, weight, height, gender } = profile;
  // Weight in kg, height in cm
  const heightInCm = height;
  const weightInKg = weight;
  
  if (gender === 'male') {
    return 10 * weightInKg + 6.25 * heightInCm - 5 * age + 5;
  } else {
    return 10 * weightInKg + 6.25 * heightInCm - 5 * age - 161;
  }
};

// Calculate TDEE (Total Daily Energy Expenditure)
export const calculateTDEE = (profile: UserProfile): number => {
  const bmr = calculateBMR(profile);
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  
  return Math.round(bmr * activityMultipliers[profile.activityLevel]);
};

// Calculate calories for weight loss/gain
export const calculateCalorieGoal = (
  tdee: number,
  goal: 'lose' | 'maintain' | 'gain',
  weeklyChange: number = 0.5 // kg per week
): number => {
  const calorieDeficitPerKg = 7700; // calories per kg
  const dailyDeficit = (weeklyChange * calorieDeficitPerKg) / 7;
  
  if (goal === 'lose') {
    return Math.round(tdee - dailyDeficit);
  } else if (goal === 'gain') {
    return Math.round(tdee + dailyDeficit);
  }
  return Math.round(tdee);
};

// Estimate calories burned from steps
export const estimateCaloriesFromSteps = (steps: number, weight: number): number => {
  // Average: 0.04 calories per step per kg
  return Math.round(steps * 0.04 * (weight / 70)); // Normalized to 70kg average
};

// Calculate fasting duration in hours
export const calculateFastingDuration = (startTime: Date, endTime?: Date): number => {
  if (!endTime) {
    return (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
  }
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
};

// MET (Metabolic Equivalent of Task) values for different activities
// Based on Compendium of Physical Activities (standard reference)
const MET_VALUES: Record<string, number> = {
  // Cardio activities
  'running': 11.5, // Running, 8 km/h (5 mph) - moderate pace
  'running_fast': 14.5, // Running, 10 km/h (6.2 mph)
  'running_sprint': 19.0, // Running, 12 km/h (7.5 mph) or faster
  'walking': 3.5, // Walking, 4 km/h (2.5 mph) - moderate pace
  'walking_brisk': 5.0, // Walking, 6.4 km/h (4 mph) - brisk pace
  'cycling': 8.0, // Cycling, 16-19 km/h (10-12 mph) - moderate effort
  'cycling_fast': 12.0, // Cycling, 20-22 km/h (12.5-14 mph) - vigorous effort
  'swimming': 8.0, // Swimming, general
  'swimming_vigorous': 10.0, // Swimming, vigorous effort
  
  // Strength training
  'strength_training': 5.0, // Weight lifting, general
  'strength_training_vigorous': 6.0, // Weight lifting, vigorous effort
  'calisthenics': 8.0, // Calisthenics (push-ups, pull-ups, etc.)
  
  // HIIT
  'hiit': 12.0, // High-intensity interval training
  
  // Yoga and flexibility
  'yoga': 3.0, // Hatha yoga
  'yoga_power': 4.0, // Power yoga
  'pilates': 3.5, // Pilates
  'stretching': 2.5, // Stretching, mild
  
  // Sports
  'basketball': 8.0,
  'soccer': 10.0,
  'tennis': 7.0,
  'volleyball': 3.0,
  
  // Exercise categories (fallback values)
  'cardio': 8.0,
  'strength': 5.0,
  'flexibility': 3.0,
  'sports': 8.0,
  'other': 5.0,
};

// Get MET value for a specific exercise or workout type
const getMETValue = (
  workoutType: string,
  exerciseCategory?: string,
  exerciseName?: string,
  speed?: number // m/s for running/cycling
): number => {
  // For running with speed data
  if (workoutType === 'running' && speed !== undefined) {
    const speedKmh = speed * 3.6; // Convert m/s to km/h
    if (speedKmh >= 12) return MET_VALUES['running_sprint'];
    if (speedKmh >= 10) return MET_VALUES['running_fast'];
    return MET_VALUES['running'];
  }
  
  // For cycling with speed data
  if (workoutType === 'cycling' && speed !== undefined) {
    const speedKmh = speed * 3.6;
    if (speedKmh >= 20) return MET_VALUES['cycling_fast'];
    return MET_VALUES['cycling'];
  }
  
  // Check for specific workout types
  if (MET_VALUES[workoutType]) {
    return MET_VALUES[workoutType];
  }
  
  // Check exercise name for specific activities
  if (exerciseName) {
    const nameLower = exerciseName.toLowerCase();
    if (nameLower.includes('sprint') || nameLower.includes('interval')) {
      if (workoutType === 'running') return MET_VALUES['running_fast'];
      if (workoutType === 'cycling') return MET_VALUES['cycling_fast'];
    }
    if (nameLower.includes('brisk') || nameLower.includes('fast')) {
      if (workoutType === 'walking') return MET_VALUES['walking_brisk'];
    }
    if (nameLower.includes('power') || nameLower.includes('vigorous')) {
      if (workoutType === 'yoga') return MET_VALUES['yoga_power'];
      if (exerciseCategory === 'strength') return MET_VALUES['strength_training_vigorous'];
    }
    if (nameLower.includes('calisthenics') || nameLower.includes('bodyweight')) {
      return MET_VALUES['calisthenics'];
    }
  }
  
  // Fallback to exercise category
  if (exerciseCategory && MET_VALUES[exerciseCategory]) {
    return MET_VALUES[exerciseCategory];
  }
  
  // Default fallback
  return MET_VALUES['other'];
};

/**
 * Calculate calories burned during exercise using standard MET formula
 * Formula: Calories = MET × weight (kg) × duration (hours)
 * 
 * @param weight - User weight in kg
 * @param duration - Exercise duration in minutes
 * @param workoutType - Type of workout (running, cycling, strength, etc.)
 * @param exerciseCategory - Category of exercise (cardio, strength, flexibility, etc.)
 * @param exerciseName - Name of the exercise (optional, for more specific MET values)
 * @param speed - Speed in m/s (optional, for running/cycling to adjust MET value)
 * @returns Calories burned (rounded to nearest integer)
 */
export const calculateWorkoutCalories = (
  weight: number,
  duration: number, // in minutes
  workoutType: string,
  exerciseCategory?: string,
  exerciseName?: string,
  speed?: number // m/s
): number => {
  if (weight <= 0 || duration <= 0) return 0;
  
  const met = getMETValue(workoutType, exerciseCategory, exerciseName, speed);
  const durationHours = duration / 60;
  
  // Standard formula: MET × weight (kg) × duration (hours)
  const calories = met * weight * durationHours;
  
  return Math.round(calories);
};

/**
 * Calculate total calories burned for a workout session
 * Sums up calories from all exercises, or calculates based on workout type and total duration
 * 
 * @param weight - User weight in kg
 * @param totalDuration - Total workout duration in minutes
 * @param workoutType - Type of workout
 * @param exercises - Array of exercises with their individual calories (if already calculated)
 * @param averageSpeed - Average speed in m/s (for running/cycling)
 * @returns Total calories burned for the workout
 */
export const calculateTotalWorkoutCalories = (
  weight: number,
  totalDuration: number,
  workoutType: string,
  exercises?: Array<{ category?: string; name?: string; duration?: number; caloriesBurned?: number }>,
  averageSpeed?: number
): number => {
  if (weight <= 0 || totalDuration <= 0) return 0;
  
  // If exercises have individual calorie calculations, sum them
  if (exercises && exercises.length > 0) {
    const totalFromExercises = exercises.reduce((sum, ex) => {
      if (ex.caloriesBurned) {
        return sum + ex.caloriesBurned;
      }
      // Calculate for this exercise if not already calculated
      if (ex.duration) {
        return sum + calculateWorkoutCalories(
          weight,
          ex.duration,
          workoutType,
          ex.category,
          ex.name,
          averageSpeed
        );
      }
      return sum;
    }, 0);
    
    if (totalFromExercises > 0) {
      return totalFromExercises;
    }
  }
  
  // Otherwise, calculate based on total duration and workout type
  return calculateWorkoutCalories(weight, totalDuration, workoutType, undefined, undefined, averageSpeed);
};

