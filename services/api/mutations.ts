import { gql } from '@apollo/client';

export const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $displayName: String, $username: String) {
    register(email: $email, password: $password, displayName: $displayName, username: $username) {
      token
      refreshToken
      user {
        id
        email
        displayName
        photoURL
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        email
        displayName
        photoURL
      }
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
      user {
        id
        email
        displayName
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($profile: UserProfileInput!) {
    updateProfile(profile: $profile) {
      id
      age
      weight
      height
      activityLevel
      gender
    }
  }
`;

export const UPDATE_PRIVACY = gql`
  mutation UpdatePrivacy($privacy: UserPrivacyInput!) {
    updatePrivacy(privacy: $privacy) {
      id
      ringsVisibility
      allowFriendRequests
      allowClanInvites
    }
  }
`;

export const SAVE_DAILY_HEALTH_DATA = gql`
  mutation SaveDailyHealthData($data: DailyHealthDataInput!) {
    saveDailyHealthData(data: $data) {
      id
      date
      caloriesConsumed
      caloriesBurned
      steps
      waterIntake
    }
  }
`;

export const ADD_MEAL = gql`
  mutation AddMeal($date: String!, $meal: MealInput!) {
    addMeal(date: $date, meal: $meal) {
      id
      type
      name
      calories
      carbs
      protein
      fat
      timestamp
    }
  }
`;

export const UPDATE_MEAL = gql`
  mutation UpdateMeal($id: ID!, $meal: MealInput!) {
    updateMeal(id: $id, meal: $meal) {
      id
      type
      name
      calories
      carbs
      protein
      fat
    }
  }
`;

export const DELETE_MEAL = gql`
  mutation DeleteMeal($id: ID!) {
    deleteMeal(id: $id)
  }
`;

export const ADD_WATER_ENTRY = gql`
  mutation AddWaterEntry($date: String!, $entry: WaterEntryInput!) {
    addWaterEntry(date: $date, entry: $entry) {
      id
      glasses
      timestamp
    }
  }
`;

export const ADD_WORKOUT = gql`
  mutation AddWorkout($date: String!, $workout: WorkoutInput!) {
    addWorkout(date: $date, workout: $workout) {
      id
      name
      type
      duration
      totalCaloriesBurned
    }
  }
`;

export const UPDATE_WORKOUT = gql`
  mutation UpdateWorkout($id: ID!, $workout: WorkoutInput!) {
    updateWorkout(id: $id, workout: $workout) {
      id
      name
      type
      duration
      totalCaloriesBurned
    }
  }
`;

export const DELETE_WORKOUT = gql`
  mutation DeleteWorkout($id: ID!) {
    deleteWorkout(id: $id)
  }
`;

export const SAVE_FASTING_SESSION = gql`
  mutation SaveFastingSession($date: String!, $session: FastingSessionInput!) {
    saveFastingSession(date: $date, session: $session) {
      id
      type
      startTime
      endTime
      duration
      targetDuration
    }
  }
`;

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($toUid: ID!) {
    sendFriendRequest(toUid: $toUid) {
      id
      fromUid
      toUid
      status
      createdAt
    }
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($fromUid: ID!) {
    acceptFriendRequest(fromUid: $fromUid) {
      id
      friendUid
      ringsShare
      friend {
        id
        displayName
        email
        photoURL
      }
    }
  }
`;

export const REJECT_FRIEND_REQUEST = gql`
  mutation RejectFriendRequest($fromUid: ID!) {
    rejectFriendRequest(fromUid: $fromUid)
  }
`;

export const CANCEL_FRIEND_REQUEST = gql`
  mutation CancelFriendRequest($toUid: ID!) {
    cancelFriendRequest(toUid: $toUid)
  }
`;

export const REMOVE_FRIEND = gql`
  mutation RemoveFriend($friendUid: ID!) {
    removeFriend(friendUid: $friendUid)
  }
`;

export const BLOCK_USER = gql`
  mutation BlockUser($blockedUid: ID!) {
    blockUser(blockedUid: $blockedUid)
  }
`;

export const UNBLOCK_USER = gql`
  mutation UnblockUser($blockedUid: ID!) {
    unblockUser(blockedUid: $blockedUid)
  }
`;

export const CREATE_CLAN = gql`
  mutation CreateClan($name: String!, $description: String, $privacy: String) {
    createClan(name: $name, description: $description, privacy: $privacy) {
      id
      name
      description
      privacy
      ownerUid
    }
  }
`;

export const UPDATE_CLAN_DETAILS = gql`
  mutation UpdateClanDetails($clanId: ID!, $name: String, $description: String, $photoURL: String, $privacy: String) {
    updateClanDetails(clanId: $clanId, name: $name, description: $description, photoURL: $photoURL, privacy: $privacy) {
      id
      name
      description
      photoURL
      privacy
    }
  }
`;

export const INVITE_TO_CLAN = gql`
  mutation InviteToClan($clanId: ID!, $toUid: ID!) {
    inviteToClan(clanId: $clanId, toUid: $toUid) {
      id
      clanId
      fromUid
      toUid
      status
      createdAt
    }
  }
`;

export const RESPOND_CLAN_INVITE = gql`
  mutation RespondClanInvite($clanId: ID!, $action: String!) {
    respondClanInvite(clanId: $clanId, action: $action)
  }
`;

export const LEAVE_CLAN = gql`
  mutation LeaveClan($clanId: ID!) {
    leaveClan(clanId: $clanId)
  }
`;

export const REMOVE_CLAN_MEMBER = gql`
  mutation RemoveClanMember($clanId: ID!, $memberUid: ID!) {
    removeClanMember(clanId: $clanId, memberUid: $memberUid)
  }
`;

export const UPDATE_CLAN_ROLE = gql`
  mutation UpdateClanRole($clanId: ID!, $memberUid: ID!, $newRole: String!) {
    updateClanRole(clanId: $clanId, memberUid: $memberUid, newRole: $newRole) {
      id
      role
      user {
        id
        displayName
      }
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      id
      read
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const UPDATE_RING_STATS = gql`
  mutation UpdateRingStats($stats: RingStatsInput!) {
    updateRingStats(stats: $stats) {
      id
      date
      caloriesBurned
      steps
      workoutMinutes
      goalCalories
      goalSteps
      goalMinutes
    }
  }
`;

