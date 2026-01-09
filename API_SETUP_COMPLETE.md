# API Migration Complete - Setup Instructions

## ✅ What's Been Completed

1. **Backend Structure** - Complete Node.js/Express/GraphQL backend
2. **Database Schema** - Prisma schema with all tables
3. **GraphQL API** - Full schema with queries and mutations
4. **Authentication** - JWT-based auth system
5. **Resolvers** - All resolvers for auth, health, and community features
6. **Frontend Apollo Client** - GraphQL client configured
7. **API Services** - Queries and mutations defined

## ⚠️ What You Need to Do

### 1. Free Up Disk Space
Your disk is 100% full. You need to:
- Delete unused files
- Clear npm cache: `npm cache clean --force`
- Free at least 2-3 GB for node_modules

### 2. Install PostgreSQL
PostgreSQL is not in your PATH. Install it:
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Or download from: https://www.postgresql.org/download/
```

### 3. Set Up Backend

```bash
cd backend

# Create .env file
cat > .env << 'EOF'
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/health_fitness?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:19006
EOF

# Install dependencies
npm install

# Create database
createdb health_fitness

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start server
npm run dev
```

### 4. Set Up Frontend

```bash
# From project root
cd /Users/harjot/health-fitness-app

# Install dependencies
npm install

# Create .env
echo "EXPO_PUBLIC_API_URL=http://localhost:4000/graphql" > .env

# Start Expo
npm start
```

## Testing the API

### Backend Health Check
```bash
curl http://localhost:4000/health
```

### GraphQL Playground
Visit: `http://localhost:4000/graphql`

### Test Registration
```graphql
mutation {
  register(email: "test@test.com", password: "test123", displayName: "Test User") {
    token
    user {
      id
      email
      displayName
    }
  }
}
```

## File Structure Created

```
backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── server.ts             # Apollo Server setup
│   ├── auth/                 # JWT authentication
│   ├── resolvers/            # GraphQL resolvers
│   └── services/             # Business logic
├── prisma/
│   └── schema.prisma         # Database schema
└── schema/
    └── schema.graphql        # GraphQL schema

services/api/
├── client.ts                 # Apollo Client
├── queries.ts                # GraphQL queries
└── mutations.ts              # GraphQL mutations
```

## Next Steps

1. Free up disk space
2. Install PostgreSQL
3. Run backend setup commands
4. Run frontend setup commands
5. Test the API connection

All code is ready - just need dependencies installed!

