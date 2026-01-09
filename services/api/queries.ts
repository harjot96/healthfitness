import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      displayName
      photoURL
      usernameLower
      profile {
        id
        age
        weight
        height
        activityLevel
        gender
      }
      privacy {
        id
        ringsVisibility
        allowFriendRequests
        allowClanInvites
      }
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      displayName
      photoURL
      usernameLower
      profile {
        id
        age
        weight
        height
        activityLevel
        gender
      }
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($search: String, $limit: Int, $offset: Int) {
    users(search: $search, limit: $limit, offset: $offset) {
      id
      email
      displayName
      photoURL
      usernameLower
    }
  }
`;

export const GET_DAILY_HEALTH_DATA = gql`
  query GetDailyHealthData($date: String!) {
    dailyHealthData(date: $date) {
      id
      date
      caloriesConsumed
      caloriesBurned
      activeEnergyBurned
      dietaryEnergyConsumed
      heartRate
      restingHeartRate
      steps
      waterIntake
      meals {
        id
        type
        name
        calories
        carbs
        protein
        fat
        timestamp
      }
      waterEntries {
        id
        glasses
        timestamp
      }
      workouts {
        id
        name
        type
        startTime
        endTime
        duration
        totalCaloriesBurned
        distance
        averageSpeed
        maxSpeed
        exercises {
          id
          name
          category
          duration
          sets
          reps
          weight
          caloriesBurned
          notes
        }
        locationPoints {
          id
          latitude
          longitude
          timestamp
          altitude
          speed
          accuracy
        }
      }
      fastingSession {
        id
        type
        startTime
        endTime
        duration
        targetDuration
        eatingWindowStart
        eatingWindowEnd
      }
    }
  }
`;

export const GET_WEEKLY_HEALTH_DATA = gql`
  query GetWeeklyHealthData($startDate: String!) {
    weeklyHealthData(startDate: $startDate) {
      id
      date
      caloriesConsumed
      caloriesBurned
      steps
      waterIntake
      meals {
        id
        type
        name
        calories
      }
      workouts {
        id
        name
        type
        duration
        totalCaloriesBurned
      }
    }
  }
`;

export const GET_FRIENDS = gql`
  query GetFriends {
    friends {
      id
      friendUid
      ringsShare
      createdAt
      friend {
        id
        displayName
        email
        photoURL
      }
    }
  }
`;

export const GET_FRIEND_REQUESTS = gql`
  query GetFriendRequests {
    friendRequests {
      sent {
        id
        fromUid
        toUid
        status
        createdAt
        toUser {
          id
          displayName
          email
          photoURL
        }
      }
      received {
        id
        fromUid
        toUid
        status
        createdAt
        fromUser {
          id
          displayName
          email
          photoURL
        }
      }
    }
  }
`;

export const GET_CLANS = gql`
  query GetClans {
    clans {
      id
      name
      description
      photoURL
      ownerUid
      privacy
      createdAt
      owner {
        id
        displayName
        email
      }
      members {
        id
        uid
        role
        status
        user {
          id
          displayName
          email
        }
      }
    }
  }
`;

export const GET_CLAN = gql`
  query GetClan($id: ID!) {
    clan(id: $id) {
      id
      name
      description
      photoURL
      ownerUid
      privacy
      owner {
        id
        displayName
        email
      }
      members {
        id
        uid
        role
        status
        user {
          id
          displayName
          email
        }
      }
    }
  }
`;

export const GET_CLAN_INVITES = gql`
  query GetClanInvites {
    clanInvites {
      id
      clanId
      fromUid
      toUid
      status
      createdAt
      clan {
        id
        name
        description
      }
      fromUser {
        id
        displayName
        email
      }
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $offset: Int) {
    notifications(limit: $limit, offset: $offset) {
      id
      type
      title
      body
      data
      read
      createdAt
    }
  }
`;

export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const GET_RING_STATS = gql`
  query GetRingStats($date: String!) {
    ringStats(date: $date) {
      id
      date
      caloriesBurned
      steps
      workoutMinutes
      goalCalories
      goalSteps
      goalMinutes
      updatedAt
    }
  }
`;

