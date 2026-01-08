import { Workout, Exercise } from '../types';

export interface PredefinedWorkout {
  id: string;
  name: string;
  type: Workout['type'];
  description: string;
  icon: string;
  duration: number; // estimated duration in minutes
  exercises: Omit<Exercise, 'id' | 'caloriesBurned'>[];
  estimatedCalories: number;
  requiresLocation?: boolean; // for running/walking/cycling
}

export const predefinedWorkouts: PredefinedWorkout[] = [
  // Cardio Workouts
  {
    id: 'morning-run',
    name: 'Morning Run',
    type: 'running',
    description: 'Start your day with a refreshing run',
    icon: 'footsteps',
    duration: 30,
    estimatedCalories: 300,
    requiresLocation: true,
    exercises: [
      {
        name: 'Warm-up Walk',
        category: 'cardio',
        duration: 5,
      },
      {
        name: 'Running',
        category: 'cardio',
        duration: 20,
      },
      {
        name: 'Cool-down Walk',
        category: 'cardio',
        duration: 5,
      },
    ],
  },
  {
    id: 'evening-walk',
    name: 'Evening Walk',
    type: 'walking',
    description: 'Relaxing walk to end your day',
    icon: 'walk-outline',
    duration: 45,
    estimatedCalories: 150,
    requiresLocation: true,
    exercises: [
      {
        name: 'Brisk Walking',
        category: 'cardio',
        duration: 45,
      },
    ],
  },
  {
    id: 'interval-running',
    name: 'Interval Running',
    type: 'running',
    description: 'High-intensity interval running',
    icon: 'flash',
    duration: 25,
    estimatedCalories: 350,
    requiresLocation: true,
    exercises: [
      {
        name: 'Warm-up',
        category: 'cardio',
        duration: 5,
      },
      {
        name: 'Interval Sprints',
        category: 'cardio',
        duration: 15,
      },
      {
        name: 'Cool-down',
        category: 'cardio',
        duration: 5,
      },
    ],
  },
  
  // Strength Workouts
  {
    id: 'full-body-strength',
    name: 'Full Body Strength',
    type: 'strength',
    description: 'Complete body strength training',
    icon: 'barbell',
    duration: 45,
    estimatedCalories: 250,
    exercises: [
      {
        name: 'Push-ups',
        category: 'strength',
        sets: 3,
        reps: 15,
      },
      {
        name: 'Squats',
        category: 'strength',
        sets: 3,
        reps: 20,
      },
      {
        name: 'Pull-ups',
        category: 'strength',
        sets: 3,
        reps: 10,
      },
      {
        name: 'Plank',
        category: 'strength',
        duration: 1,
      },
      {
        name: 'Lunges',
        category: 'strength',
        sets: 3,
        reps: 12,
      },
    ],
  },
  {
    id: 'upper-body',
    name: 'Upper Body Focus',
    type: 'strength',
    description: 'Target your arms, chest, and back',
    icon: 'fitness-outline',
    duration: 35,
    estimatedCalories: 200,
    exercises: [
      {
        name: 'Bench Press',
        category: 'strength',
        sets: 4,
        reps: 8,
        weight: 60,
      },
      {
        name: 'Shoulder Press',
        category: 'strength',
        sets: 3,
        reps: 10,
        weight: 20,
      },
      {
        name: 'Bicep Curls',
        category: 'strength',
        sets: 3,
        reps: 12,
        weight: 12,
      },
      {
        name: 'Tricep Dips',
        category: 'strength',
        sets: 3,
        reps: 15,
      },
    ],
  },
  {
    id: 'lower-body',
    name: 'Lower Body Focus',
    type: 'strength',
    description: 'Focus on legs and glutes',
    icon: 'walk',
    duration: 40,
    estimatedCalories: 220,
    exercises: [
      {
        name: 'Barbell Squats',
        category: 'strength',
        sets: 4,
        reps: 10,
        weight: 80,
      },
      {
        name: 'Romanian Deadlifts',
        category: 'strength',
        sets: 3,
        reps: 10,
        weight: 60,
      },
      {
        name: 'Leg Press',
        category: 'strength',
        sets: 3,
        reps: 12,
        weight: 100,
      },
      {
        name: 'Calf Raises',
        category: 'strength',
        sets: 4,
        reps: 15,
        weight: 40,
      },
    ],
  },
  
  // HIIT Workouts
  {
    id: 'hiit-cardio',
    name: 'HIIT Cardio Blast',
    type: 'hiit',
    description: 'High-intensity interval training',
    icon: 'flash',
    duration: 20,
    estimatedCalories: 300,
    exercises: [
      {
        name: 'Jumping Jacks',
        category: 'cardio',
        duration: 1,
      },
      {
        name: 'Burpees',
        category: 'cardio',
        duration: 1,
      },
      {
        name: 'Mountain Climbers',
        category: 'cardio',
        duration: 1,
      },
      {
        name: 'High Knees',
        category: 'cardio',
        duration: 1,
      },
    ],
  },
  {
    id: 'hiit-full-body',
    name: 'HIIT Full Body',
    type: 'hiit',
    description: 'Complete body HIIT workout',
    icon: 'fitness-outline',
    duration: 25,
    estimatedCalories: 350,
    exercises: [
      {
        name: 'Burpees',
        category: 'cardio',
        duration: 1,
      },
      {
        name: 'Squat Jumps',
        category: 'cardio',
        duration: 1,
      },
      {
        name: 'Push-ups',
        category: 'strength',
        sets: 1,
        reps: 15,
      },
      {
        name: 'Plank Hold',
        category: 'strength',
        duration: 1,
      },
    ],
  },
  
  // Yoga Workouts
  {
    id: 'morning-yoga',
    name: 'Morning Yoga Flow',
    type: 'yoga',
    description: 'Gentle yoga to start your day',
    icon: 'leaf',
    duration: 30,
    estimatedCalories: 100,
    exercises: [
      {
        name: 'Sun Salutation',
        category: 'flexibility',
        duration: 10,
      },
      {
        name: 'Warrior Poses',
        category: 'flexibility',
        duration: 10,
      },
      {
        name: 'Tree Pose',
        category: 'flexibility',
        duration: 5,
      },
      {
        name: 'Savasana',
        category: 'flexibility',
        duration: 5,
      },
    ],
  },
  {
    id: 'evening-yoga',
    name: 'Evening Yoga Relax',
    type: 'yoga',
    description: 'Calming yoga before bed',
    icon: 'moon',
    duration: 25,
    estimatedCalories: 80,
    exercises: [
      {
        name: 'Child\'s Pose',
        category: 'flexibility',
        duration: 5,
      },
      {
        name: 'Cat-Cow Stretch',
        category: 'flexibility',
        duration: 5,
      },
      {
        name: 'Forward Fold',
        category: 'flexibility',
        duration: 5,
      },
      {
        name: 'Corpse Pose',
        category: 'flexibility',
        duration: 10,
      },
    ],
  },
  
  // Cycling
  {
    id: 'bike-ride',
    name: 'Bike Ride',
    type: 'cycling',
    description: 'Enjoy a scenic bike ride',
    icon: 'bicycle',
    duration: 60,
    estimatedCalories: 400,
    requiresLocation: true,
    exercises: [
      {
        name: 'Cycling',
        category: 'cardio',
        duration: 60,
      },
    ],
  },
  
  // Cardio
  {
    id: 'cardio-session',
    name: 'Cardio Session',
    type: 'cardio',
    description: 'General cardio workout',
    icon: 'heart',
    duration: 35,
    estimatedCalories: 280,
    exercises: [
      {
        name: 'Treadmill Running',
        category: 'cardio',
        duration: 25,
      },
      {
        name: 'Rowing Machine',
        category: 'cardio',
        duration: 10,
      },
    ],
  },
];

