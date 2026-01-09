import { AuthenticationError } from 'apollo-server-express';
import { UserService } from '../services/user.service';

interface Context {
  prisma: any;
  user?: { userId: string; email: string };
  req: any;
}

export const userResolvers = {
  Query: {
    user: async (_: any, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new UserService(context.prisma);
      return userService.findById(args.id);
    },

    users: async (_: any, args: { search?: string; limit?: number; offset?: number }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new UserService(context.prisma);
      return userService.searchUsers(args.search || '', args.limit || 50, args.offset || 0);
    },
  },
};

