# Running and Testing the API

## Prerequisites

1. **PostgreSQL Database** - Make sure PostgreSQL is installed and running
2. **Node.js** - Version 16 or higher
3. **Disk Space** - Ensure you have enough disk space (npm install failed due to low disk space)

## Step 1: Set Up Backend

```bash
cd backend

# Install dependencies (if you have disk space)
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your DATABASE_URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/health_fitness?schema=public"

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the server
npm run dev
```

The backend will start on `http://localhost:4000`

## Step 2: Test Backend API

### Option 1: GraphQL Playground
Visit `http://localhost:4000/graphql` in your browser (available in development mode)

### Option 2: Health Check
```bash
curl http://localhost:4000/health
```

### Option 3: Test Registration
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(email: \"test@example.com\", password: \"test123\", displayName: \"Test User\") { token user { id email displayName } } }"
  }'
```

## Step 3: Set Up Frontend

```bash
# From project root
npm install

# Create .env file in root
echo "EXPO_PUBLIC_API_URL=http://localhost:4000/graphql" > .env

# Start Expo
npm start
```

## Step 4: Test Frontend Connection

The frontend is now configured to use the GraphQL API. The Apollo Client will automatically connect to the backend.

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env matches your database
- Ensure database exists: `createdb health_fitness`

### Port Already in Use
- Change PORT in backend/.env
- Update EXPO_PUBLIC_API_URL in frontend .env

### CORS Issues
- Update CORS_ORIGIN in backend/.env to match your Expo dev server URL

