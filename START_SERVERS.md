# How to Start Both Backend and Frontend

## Current Status

✅ Backend code structure is complete
✅ Frontend Apollo Client is set up
⚠️  Dependencies need to be installed (disk space issue)

## Step 1: Free Up Disk Space

Your disk is 100% full. Free up space first:
- Delete unused files
- Clear npm cache: `npm cache clean --force`
- Remove old builds/caches

## Step 2: Start Backend Server

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Create .env file with database connection
cat > .env << 'EOF'
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/health_fitness?schema=public"
JWT_SECRET=change-this-to-a-random-secret-key
JWT_REFRESH_SECRET=change-this-to-another-random-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:19006
EOF

# Generate Prisma Client
npm run prisma:generate

# Run database migrations (creates tables)
npm run prisma:migrate

# Start the server
npm run dev
```

Backend will be available at: `http://localhost:4000/graphql`

## Step 3: Start Frontend

Open a NEW terminal window:

```bash
# From project root
cd /Users/harjot/health-fitness-app

# Install frontend dependencies
npm install

# Create .env file
echo "EXPO_PUBLIC_API_URL=http://localhost:4000/graphql" > .env

# Start Expo
npm start
```

## Step 4: Test the Connection

1. **Backend Health Check:**
   ```bash
   curl http://localhost:4000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **GraphQL Playground:**
   Open browser: `http://localhost:4000/graphql`
   
   Try this mutation:
   ```graphql
   mutation {
     register(email: "test@test.com", password: "test123", displayName: "Test") {
       token
       user {
         id
         email
       }
     }
   }
   ```

3. **Frontend:**
   - Expo will open in browser/device
   - App should connect to backend automatically
   - Try logging in/registering

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env is correct
- Check if port 4000 is available: `lsof -i :4000`

### Frontend can't connect
- Verify backend is running
- Check EXPO_PUBLIC_API_URL in .env matches backend URL
- Check CORS_ORIGIN in backend .env allows Expo origin

### Database errors
- Make sure PostgreSQL is installed and running
- Create database: `createdb health_fitness`
- Run migrations: `npm run prisma:migrate`

