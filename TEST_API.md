# Testing the GraphQL API

## Backend Setup (Run First)

```bash
cd backend

# 1. Install dependencies (need disk space first)
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection

# 3. Set up database
npm run prisma:generate
npm run prisma:migrate

# 4. Start server
npm run dev
```

Server will run on: `http://localhost:4000/graphql`

## Test Queries

### 1. Health Check
```bash
curl http://localhost:4000/health
```

### 2. Register User
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(email: \"test@example.com\", password: \"test123\", displayName: \"Test User\") { token user { id email displayName } } }"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"test@example.com\", password: \"test123\") { token user { id email } } }"
  }'
```

### 4. Get Current User (requires token)
```bash
# Replace YOUR_TOKEN with token from login
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { me { id email displayName profile { age weight height } } }"
  }'
```

## Frontend Setup

```bash
# From project root
npm install

# Set API URL
echo "EXPO_PUBLIC_API_URL=http://localhost:4000/graphql" > .env

# Start Expo
npm start
```

## GraphQL Playground

Visit `http://localhost:4000/graphql` in your browser to use the interactive GraphQL Playground.

