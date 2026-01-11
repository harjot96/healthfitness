# Backend Integration Summary

This document summarizes the backend integration changes made to ensure proper communication between the frontend and backend.

## Overview

The application has been updated to properly integrate with the REST API backend. Previously, the frontend was configured to use GraphQL (Apollo Client), but the backend is a REST API. All services have been updated to use REST endpoints.

## Changes Made

### 1. REST API Client (`services/api/client.ts`)
- Created a new REST API client to replace the GraphQL Apollo Client
- Handles authentication tokens automatically
- Implements automatic token refresh on 401 errors
- Provides helper methods: `get()`, `post()`, `put()`, `delete()`
- Manages token storage in AsyncStorage

### 2. Auth Service (`services/api/auth.ts`)
- Updated to use REST endpoints:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/refresh` - Token refresh
  - `GET /api/auth/me` - Get current user
  - `PUT /api/auth/profile` - Update profile
  - `PUT /api/auth/privacy` - Update privacy settings

### 3. Health Service (`services/api/health.ts`)
- Updated to use REST endpoints:
  - `GET /api/health/daily/:date` - Get daily health data
  - `POST /api/health/daily` - Save daily health data
  - `POST /api/health/meals` - Add meal
  - `POST /api/health/water` - Add water entry
  - `POST /api/health/workouts` - Add workout
  - `POST /api/health/fasting` - Save fasting session
  - `PUT /api/community/ring-stats` - Update ring stats

### 4. Community Service (`services/api/community.ts`)
- Updated to use REST endpoints:
  - `GET /api/community/friends` - Get friends list
  - `GET /api/community/friend-requests` - Get friend requests
  - `POST /api/community/friend-requests` - Send friend request
  - `POST /api/community/friend-requests/:fromUid/accept` - Accept friend request
  - `POST /api/community/friend-requests/:fromUid/reject` - Reject friend request
  - `DELETE /api/community/friend-requests/:toUid` - Cancel friend request
  - `DELETE /api/community/friends/:friendUid` - Remove friend
  - `GET /api/community/clans` - Get clans
  - `POST /api/community/clans` - Create clan
  - `GET /api/community/clans/invites` - Get clan invites
  - `POST /api/community/clans/:id/invite` - Invite to clan
  - `GET /api/community/notifications` - Get notifications
  - `PUT /api/community/notifications/:id/read` - Mark notification as read

### 5. Socket.io Client (`services/socket/socketClient.ts`)
- Created a Socket.io client for real-time features
- Handles authentication with JWT tokens
- Manages reconnection logic
- Provides methods for emitting and listening to events

## Environment Configuration

The application uses the `EXPO_PUBLIC_API_URL` environment variable to configure the backend URL.

**Default:** `http://localhost:4000`

To configure:
1. Create a `.env` file in the root directory
2. Add: `EXPO_PUBLIC_API_URL=http://localhost:4000`

**Note:** The client automatically removes `/graphql` suffix if present (for backward compatibility).

## Backend Endpoints

### Base URL
- Development: `http://localhost:4000`
- Production: Set via `EXPO_PUBLIC_API_URL`

### API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management endpoints
- `/api/health/*` - Health data endpoints
- `/api/community/*` - Community features endpoints

### Socket.io
- WebSocket connection at the same base URL
- Path: `/socket.io`
- Authentication via JWT token in handshake

## Authentication Flow

1. User logs in via `POST /api/auth/login`
2. Backend returns `token` and `refreshToken`
3. Tokens are stored in AsyncStorage
4. All subsequent requests include `Authorization: Bearer <token>` header
5. On 401 errors, client automatically attempts token refresh
6. If refresh fails, user is logged out

## Error Handling

The API client provides consistent error handling:
- Network errors are caught and wrapped in `ApiError`
- HTTP errors include status code and error message
- Automatic token refresh on 401 errors
- User-friendly error messages

## Socket.io Integration

The Socket.io client:
- Connects automatically when user is authenticated
- Sends JWT token in handshake for authentication
- Handles reconnection automatically
- Provides event listeners for real-time updates

## Testing

To test the integration:

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   npm start
   ```

3. **Verify connection:**
   - Check backend logs for incoming requests
   - Check frontend console for API calls
   - Test authentication flow
   - Test health data operations
   - Test community features

## Dependencies

### Required Frontend Packages
- `@react-native-async-storage/async-storage` - Token storage
- `socket.io-client` - Real-time communication

### Backend Dependencies
- `express` - Web framework
- `socket.io` - WebSocket server
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `prisma` - Database ORM

## Migration Notes

### Removed Dependencies
- `@apollo/client` - No longer needed (GraphQL removed)
- `graphql` - No longer needed

**Note:** These packages are still in `package.json` but are not used. They can be removed in a future cleanup.

### Breaking Changes
- All GraphQL queries/mutations have been replaced with REST API calls
- Response format changed from GraphQL to REST API format
- Error handling updated to match REST API error responses

## Next Steps

1. Remove unused GraphQL dependencies (`@apollo/client`, `graphql`)
2. Test all API endpoints thoroughly
3. Implement Socket.io event handlers in frontend
4. Add error boundaries for better error handling
5. Add request/response logging for debugging
6. Set up environment-specific configurations (dev, staging, prod)
