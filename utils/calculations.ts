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

