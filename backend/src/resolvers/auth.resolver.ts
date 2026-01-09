import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { hashPassword, verifyPassword } from '../auth/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../auth/jwt';
import { UserService } from '../services/user.service';
import { PrismaClient } from '@prisma/client';

interface Context {
  prisma: PrismaClient;
  user?: TokenPayload;
  req: any;
}

export const authResolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new UserService(context.prisma);
      const user = await userService.findById(context.user.userId);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      return user;
    },
  },

  Mutation: {
    register: async (
      _: any,
      args: {
        email: string;
        password: string;
        displayName?: string;
        username?: string;
      },
      context: Context
    ) => {
      const { email, password, displayName, username } = args;

      if (!email || !password) {
        throw new UserInputError('Email and password are required');
      }

      if (password.length < 6) {
        throw new UserInputError('Password must be at least 6 characters');
      }

      const userService = new UserService(context.prisma);

      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        throw new UserInputError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const displayNameValue = displayName || email.split('@')[0];
      const usernameLower = username?.toLowerCase().trim() || email.split('@')[0].toLowerCase();

      const user = await userService.create({
        email,
        displayName: displayNameValue,
        passwordHash,
        usernameLower,
      });

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const token = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return {
        token,
        refreshToken,
        user,
      };
    },

    login: async (
      _: any,
      args: { email: string; password: string },
      context: Context
    ) => {
      const { email, password } = args;

      if (!email || !password) {
        throw new UserInputError('Email and password are required');
      }

      const userService = new UserService(context.prisma);

      // Find user
      const user = await userService.findByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Update last active
      await context.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const token = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return {
        token,
        refreshToken,
        user,
      };
    },

    refreshToken: async (
      _: any,
      args: { refreshToken: string },
      context: Context
    ) => {
      const { refreshToken } = args;

      if (!refreshToken) {
        throw new UserInputError('Refresh token is required');
      }

      try {
        const payload = verifyRefreshToken(refreshToken);
        const userService = new UserService(context.prisma);
        const user = await userService.findById(payload.userId);

        if (!user) {
          throw new AuthenticationError('User not found');
        }

        // Generate new tokens
        const tokenPayload: TokenPayload = {
          userId: user.id,
          email: user.email,
        };

        const newToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        return {
          token: newToken,
          refreshToken: newRefreshToken,
          user,
        };
      } catch (error) {
        throw new AuthenticationError('Invalid refresh token');
      }
    },

    updateProfile: async (
      _: any,
      args: { profile: any },
      context: Context
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new UserService(context.prisma);
      return userService.updateProfile(context.user.userId, args.profile);
    },

    updatePrivacy: async (
      _: any,
      args: { privacy: any },
      context: Context
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userService = new UserService(context.prisma);
      return userService.updatePrivacy(context.user.userId, args.privacy);
    },
  },
};

