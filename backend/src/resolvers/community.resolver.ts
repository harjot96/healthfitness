import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { CommunityService } from '../services/community.service';

interface Context {
  prisma: any;
  user?: { userId: string; email: string };
  req: any;
}

export const communityResolvers = {
  Query: {
    user: async (_: any, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new (await import('../services/user.service')).UserService(context.prisma);
      return userService.findById(args.id);
    },

    users: async (_: any, args: { search?: string; limit?: number; offset?: number }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new (await import('../services/user.service')).UserService(context.prisma);
      return userService.searchUsers(args.search || '', args.limit || 50, args.offset || 0);
    },

    friends: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getFriends(context.user.userId);
    },

    friendRequests: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getFriendRequests(context.user.userId);
    },

    clans: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getUserClans(context.user.userId);
    },

    clan: async (_: any, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getClan(args.id);
    },

    clanInvites: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getClanInvites(context.user.userId);
    },

    notifications: async (_: any, args: { limit?: number; offset?: number }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getNotifications(context.user.userId, args.limit || 50, args.offset || 0);
    },

    unreadNotificationCount: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getUnreadNotificationCount(context.user.userId);
    },

    ringStats: async (_: any, args: { date: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.getRingStats(context.user.userId, args.date);
    },
  },

  Mutation: {
    sendFriendRequest: async (_: any, args: { toUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.sendFriendRequest(context.user.userId, args.toUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    acceptFriendRequest: async (_: any, args: { fromUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.acceptFriendRequest(args.fromUid, context.user.userId);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    rejectFriendRequest: async (_: any, args: { fromUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.rejectFriendRequest(args.fromUid, context.user.userId);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    cancelFriendRequest: async (_: any, args: { toUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.cancelFriendRequest(context.user.userId, args.toUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    removeFriend: async (_: any, args: { friendUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.removeFriend(context.user.userId, args.friendUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    blockUser: async (_: any, args: { blockedUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.blockUser(context.user.userId, args.blockedUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    unblockUser: async (_: any, args: { blockedUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.unblockUser(context.user.userId, args.blockedUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    createClan: async (_: any, args: { name: string; description?: string; privacy?: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.createClan(context.user.userId, args.name, args.description || '', args.privacy || 'inviteOnly');
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    updateClanDetails: async (_: any, args: { clanId: string; name?: string; description?: string; photoURL?: string; privacy?: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.updateClanDetails(args.clanId, context.user.userId, {
          name: args.name,
          description: args.description,
          photoURL: args.photoURL,
          privacy: args.privacy,
        });
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    inviteToClan: async (_: any, args: { clanId: string; toUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.inviteToClan(args.clanId, context.user.userId, args.toUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    respondClanInvite: async (_: any, args: { clanId: string; action: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.respondClanInvite(args.clanId, context.user.userId, args.action);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    leaveClan: async (_: any, args: { clanId: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.leaveClan(args.clanId, context.user.userId);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    removeClanMember: async (_: any, args: { clanId: string; memberUid: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.removeClanMember(args.clanId, context.user.userId, args.memberUid);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    updateClanRole: async (_: any, args: { clanId: string; memberUid: string; newRole: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      try {
        return await communityService.updateClanRole(args.clanId, context.user.userId, args.memberUid, args.newRole);
      } catch (error: any) {
        throw new UserInputError(error.message);
      }
    },

    markNotificationRead: async (_: any, args: { notificationId: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.markNotificationRead(context.user.userId, args.notificationId);
    },

    markAllNotificationsRead: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.markAllNotificationsRead(context.user.userId);
    },

    updateRingStats: async (_: any, args: { stats: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const communityService = new CommunityService(context.prisma);
      return communityService.updateRingStats(context.user.userId, args.stats);
    },
  },
};

