import { PrismaClient } from '@prisma/client';

export class HealthService {
  constructor(private prisma: PrismaClient) {}

  async getDailyHealthData(userId: string, date: string) {
    return this.prisma.dailyHealthData.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      include: {
        meals: {
          orderBy: { timestamp: 'asc' },
        },
        waterEntries: {
          orderBy: { timestamp: 'asc' },
        },
        workouts: {
          include: {
            exercises: true,
            locationPoints: {
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        fastingSession: true,
      },
    });
  }

  async getWeeklyHealthData(userId: string, startDate: string) {
    const dates: string[] = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return this.prisma.dailyHealthData.findMany({
      where: {
        userId,
        date: { in: dates },
      },
      include: {
        meals: true,
        waterEntries: true,
        workouts: {
          include: {
            exercises: true,
            locationPoints: true,
          },
        },
        fastingSession: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async saveDailyHealthData(userId: string, data: any) {
    const {
      date,
      caloriesConsumed = 0,
      caloriesBurned = 0,
      activeEnergyBurned,
      dietaryEnergyConsumed,
      heartRate,
      restingHeartRate,
      steps = 0,
      waterIntake = 0,
    } = data;

    return this.prisma.dailyHealthData.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        caloriesConsumed,
        caloriesBurned,
        activeEnergyBurned,
        dietaryEnergyConsumed,
        heartRate,
        restingHeartRate,
        steps,
        waterIntake,
      },
      create: {
        userId,
        date,
        caloriesConsumed,
        caloriesBurned,
        activeEnergyBurned,
        dietaryEnergyConsumed,
        heartRate,
        restingHeartRate,
        steps,
        waterIntake,
      },
      include: {
        meals: true,
        waterEntries: true,
        workouts: {
          include: {
            exercises: true,
            locationPoints: true,
          },
        },
        fastingSession: true,
      },
    });
  }

  async addMeal(userId: string, date: string, mealData: any) {
    // Get or create daily health data
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
      });
    }

    const meal = await this.prisma.meal.create({
      data: {
        dailyHealthDataId: dailyData.id,
        type: mealData.type,
        name: mealData.name,
        calories: mealData.calories,
        carbs: mealData.carbs,
        protein: mealData.protein,
        fat: mealData.fat,
        timestamp: new Date(mealData.timestamp),
      },
    });

    // Update total calories consumed
    await this.prisma.dailyHealthData.update({
      where: { id: dailyData.id },
      data: {
        caloriesConsumed: {
          increment: mealData.calories,
        },
      },
    });

    return meal;
  }

  async updateMeal(mealId: string, mealData: any) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    const oldCalories = meal.calories;
    const newCalories = mealData.calories || oldCalories;

    const updated = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        type: mealData.type,
        name: mealData.name,
        calories: mealData.calories,
        carbs: mealData.carbs,
        protein: mealData.protein,
        fat: mealData.fat,
        timestamp: mealData.timestamp ? new Date(mealData.timestamp) : undefined,
      },
    });

    // Update daily calories if changed
    if (oldCalories !== newCalories) {
      const dailyData = await this.prisma.dailyHealthData.findUnique({
        where: { id: meal.dailyHealthDataId },
      });

      if (dailyData) {
        await this.prisma.dailyHealthData.update({
          where: { id: meal.dailyHealthDataId },
          data: {
            caloriesConsumed: dailyData.caloriesConsumed - oldCalories + newCalories,
          },
        });
      }
    }

    return updated;
  }

  async deleteMeal(mealId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    await this.prisma.meal.delete({
      where: { id: mealId },
    });

    // Update daily calories
    const dailyData = await this.prisma.dailyHealthData.findUnique({
      where: { id: meal.dailyHealthDataId },
    });

    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: meal.dailyHealthDataId },
        data: {
          caloriesConsumed: Math.max(0, dailyData.caloriesConsumed - meal.calories),
        },
      });
    }

    return true;
  }

  async addWaterEntry(userId: string, date: string, entryData: any) {
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
      });
    }

    const entry = await this.prisma.waterEntry.create({
      data: {
        dailyHealthDataId: dailyData.id,
        glasses: entryData.glasses,
        timestamp: new Date(entryData.timestamp),
      },
    });

    // Update total water intake
    await this.prisma.dailyHealthData.update({
      where: { id: dailyData.id },
      data: {
        waterIntake: {
          increment: entryData.glasses,
        },
      },
    });

    return entry;
  }

  async addWorkout(userId: string, date: string, workoutData: any) {
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
      });
    }

    const workout = await this.prisma.workout.create({
      data: {
        dailyHealthDataId: dailyData.id,
        name: workoutData.name,
        type: workoutData.type,
        startTime: new Date(workoutData.startTime),
        endTime: workoutData.endTime ? new Date(workoutData.endTime) : null,
        duration: workoutData.duration,
        totalCaloriesBurned: workoutData.totalCaloriesBurned,
        distance: workoutData.distance,
        averageSpeed: workoutData.averageSpeed,
        maxSpeed: workoutData.maxSpeed,
        exercises: {
          create: workoutData.exercises?.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            duration: exercise.duration,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            caloriesBurned: exercise.caloriesBurned,
            notes: exercise.notes,
          })) || [],
        },
        locationPoints: {
          create: workoutData.locationPoints?.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: new Date(point.timestamp),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })) || [],
        },
      },
      include: {
        exercises: true,
        locationPoints: true,
      },
    });

    // Update daily calories burned
    await this.prisma.dailyHealthData.update({
      where: { id: dailyData.id },
      data: {
        caloriesBurned: {
          increment: workoutData.totalCaloriesBurned,
        },
      },
    });

    return workout;
  }

  async updateWorkout(workoutId: string, workoutData: any) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      include: { exercises: true, locationPoints: true },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    const oldCalories = workout.totalCaloriesBurned;
    const newCalories = workoutData.totalCaloriesBurned || oldCalories;

    // Delete existing exercises and location points
    await this.prisma.exercise.deleteMany({
      where: { workoutId },
    });
    await this.prisma.locationPoint.deleteMany({
      where: { workoutId },
    });

    const updated = await this.prisma.workout.update({
      where: { id: workoutId },
      data: {
        name: workoutData.name,
        type: workoutData.type,
        startTime: workoutData.startTime ? new Date(workoutData.startTime) : undefined,
        endTime: workoutData.endTime ? new Date(workoutData.endTime) : undefined,
        duration: workoutData.duration,
        totalCaloriesBurned: workoutData.totalCaloriesBurned,
        distance: workoutData.distance,
        averageSpeed: workoutData.averageSpeed,
        maxSpeed: workoutData.maxSpeed,
        exercises: {
          create: workoutData.exercises?.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            duration: exercise.duration,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            caloriesBurned: exercise.caloriesBurned,
            notes: exercise.notes,
          })) || [],
        },
        locationPoints: {
          create: workoutData.locationPoints?.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: new Date(point.timestamp),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })) || [],
        },
      },
      include: {
        exercises: true,
        locationPoints: true,
      },
    });

    // Update daily calories if changed
    if (oldCalories !== newCalories) {
      const dailyData = await this.prisma.dailyHealthData.findUnique({
        where: { id: workout.dailyHealthDataId },
      });

      if (dailyData) {
        await this.prisma.dailyHealthData.update({
          where: { id: workout.dailyHealthDataId },
          data: {
            caloriesBurned: dailyData.caloriesBurned - oldCalories + newCalories,
          },
        });
      }
    }

    return updated;
  }

  async deleteWorkout(workoutId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    await this.prisma.workout.delete({
      where: { id: workoutId },
    });

    // Update daily calories
    const dailyData = await this.prisma.dailyHealthData.findUnique({
      where: { id: workout.dailyHealthDataId },
    });

    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: workout.dailyHealthDataId },
        data: {
          caloriesBurned: Math.max(0, dailyData.caloriesBurned - workout.totalCaloriesBurned),
        },
      });
    }

    return true;
  }

  async saveFastingSession(userId: string, date: string, sessionData: any) {
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
      });
    }

    return this.prisma.fastingSession.upsert({
      where: { dailyHealthDataId: dailyData.id },
      update: {
        type: sessionData.type,
        startTime: new Date(sessionData.startTime),
        endTime: sessionData.endTime ? new Date(sessionData.endTime) : null,
        duration: sessionData.duration,
        targetDuration: sessionData.targetDuration,
        eatingWindowStart: sessionData.eatingWindowStart,
        eatingWindowEnd: sessionData.eatingWindowEnd,
      },
      create: {
        dailyHealthDataId: dailyData.id,
        type: sessionData.type,
        startTime: new Date(sessionData.startTime),
        endTime: sessionData.endTime ? new Date(sessionData.endTime) : null,
        duration: sessionData.duration,
        targetDuration: sessionData.targetDuration,
        eatingWindowStart: sessionData.eatingWindowStart,
        eatingWindowEnd: sessionData.eatingWindowEnd,
      },
    });
  }
}

