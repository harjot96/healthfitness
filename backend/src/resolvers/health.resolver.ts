import { AuthenticationError } from 'apollo-server-express';
import { HealthService } from '../services/health.service';

interface Context {
  prisma: any;
  user?: { userId: string; email: string };
  req: any;
}

export const healthResolvers = {
  Query: {
    dailyHealthData: async (_: any, args: { date: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.getDailyHealthData(context.user.userId, args.date);
    },

    weeklyHealthData: async (_: any, args: { startDate: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.getWeeklyHealthData(context.user.userId, args.startDate);
    },
  },

  Mutation: {
    saveDailyHealthData: async (_: any, args: { data: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.saveDailyHealthData(context.user.userId, args.data);
    },

    addMeal: async (_: any, args: { date: string; meal: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.addMeal(context.user.userId, args.date, args.meal);
    },

    updateMeal: async (_: any, args: { id: string; meal: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.updateMeal(args.id, args.meal);
    },

    deleteMeal: async (_: any, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.deleteMeal(args.id);
    },

    addWaterEntry: async (_: any, args: { date: string; entry: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.addWaterEntry(context.user.userId, args.date, args.entry);
    },

    addWorkout: async (_: any, args: { date: string; workout: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.addWorkout(context.user.userId, args.date, args.workout);
    },

    updateWorkout: async (_: any, args: { id: string; workout: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.updateWorkout(args.id, args.workout);
    },

    deleteWorkout: async (_: any, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.deleteWorkout(args.id);
    },

    saveFastingSession: async (_: any, args: { date: string; session: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const healthService = new HealthService(context.prisma);
      return healthService.saveFastingSession(context.user.userId, args.date, args.session);
    },
  },
};

