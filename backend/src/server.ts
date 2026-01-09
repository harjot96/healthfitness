import { ApolloServer } from 'apollo-server-express';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers';
import { authMiddleware, AuthRequest } from './auth/middleware';

const prisma = new PrismaClient();

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, '../schema/schema.graphql'),
  'utf-8'
);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export async function createServer() {
  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      // Extract user from JWT token via middleware
      const authReq = req as AuthRequest;
      const user = authReq.user || null;
      return {
        prisma,
        user,
        req,
      };
    },
    introspection: process.env.NODE_ENV !== 'production',
  });

  return server;
}

