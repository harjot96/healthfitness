import { GraphQLScalarType } from 'graphql';
import { DateScalar, JSONScalar } from './scalars';
import { authResolvers } from './auth.resolver';
import { userResolvers } from './user.resolver';
import { healthResolvers } from './health.resolver';
import { communityResolvers } from './community.resolver';

export const resolvers: any = {
  Date: DateScalar,
  JSON: JSONScalar,
  Query: {
    ...authResolvers.Query,
    ...userResolvers.Query,
    ...healthResolvers.Query,
    ...communityResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...healthResolvers.Mutation,
    ...communityResolvers.Mutation,
  },
  User: {
    profile: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.id },
      }).profile();
    },
    privacy: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.id },
      }).privacy();
    },
  },
  DailyHealthData: {
    meals: async (parent: any, __: any, context: any) => {
      return context.prisma.dailyHealthData.findUnique({
        where: { id: parent.id },
      }).meals();
    },
    waterEntries: async (parent: any, __: any, context: any) => {
      return context.prisma.dailyHealthData.findUnique({
        where: { id: parent.id },
      }).waterEntries();
    },
    workouts: async (parent: any, __: any, context: any) => {
      return context.prisma.dailyHealthData.findUnique({
        where: { id: parent.id },
      }).workouts();
    },
    fastingSession: async (parent: any, __: any, context: any) => {
      return context.prisma.dailyHealthData.findUnique({
        where: { id: parent.id },
      }).fastingSession();
    },
  },
  Workout: {
    exercises: async (parent: any, __: any, context: any) => {
      return context.prisma.workout.findUnique({
        where: { id: parent.id },
      }).exercises();
    },
    locationPoints: async (parent: any, __: any, context: any) => {
      return context.prisma.workout.findUnique({
        where: { id: parent.id },
      }).locationPoints();
    },
  },
  Friend: {
    friend: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.friendUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
  },
  FriendRequest: {
    fromUser: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.fromUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
    toUser: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.toUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
  },
  Clan: {
    owner: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.ownerUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
    members: async (parent: any, __: any, context: any) => {
      return context.prisma.clan.findUnique({
        where: { id: parent.id },
      }).members();
    },
  },
  ClanMember: {
    user: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.uid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
    clan: async (parent: any, __: any, context: any) => {
      return context.prisma.clan.findUnique({
        where: { id: parent.clanId },
      });
    },
  },
  ClanInvite: {
    clan: async (parent: any, __: any, context: any) => {
      return context.prisma.clan.findUnique({
        where: { id: parent.clanId },
      });
    },
    fromUser: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.fromUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
    toUser: async (parent: any, __: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.toUid },
        include: {
          profile: true,
          privacy: true,
        },
      });
    },
  },
  Notification: {
    data: async (parent: any) => {
      try {
        return JSON.parse(parent.data || '{}');
      } catch {
        return {};
      }
    },
  },
};
