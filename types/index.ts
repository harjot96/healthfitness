export interface User {
  uid: string;
  email: string;
  profile?: UserProfile;
}

export interface UserProfile {
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  gender: 'male' | 'female' | 'other';
}

export interface DailyHealthData {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  activeEnergyBurned?: number;
  dietaryEnergyConsumed?: number;
  heartRate?: number;
  restingHeartRate?: number;
  steps: number;
  meals: Meal[];
  fastingSession?: FastingSession;
  waterIntake: number; // in glasses (8oz each)
  waterEntries: WaterEntry[];
  workouts: Workout[];
}

export interface WaterEntry {
  id: string;
  glasses: number;
  timestamp: Date;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  timestamp: Date;
}

export interface MealSuggestion {
  id: string;
  type: Meal['type'];
  name: string;
  calories: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  updatedAt?: Date;
}

export interface FastingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  type: string;
  targetDuration?: number;
  eatingWindow?: {
    startHour: number;
    endHour: number;
    value: string;
  };
}

export interface HealthMetrics {
  steps: number;
  caloriesBurned: number;
  activeEnergyBurned?: number;
  dietaryEnergyConsumed?: number;
  heartRate?: number;
  restingHeartRate?: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';
  duration?: number; // in minutes
  sets?: number;
  reps?: number;
  weight?: number; // in kg
  caloriesBurned?: number;
  notes?: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  altitude?: number;
  speed?: number; // m/s
  accuracy?: number;
}

export interface Workout {
  id: string;
  name: string;
  type: 'cardio' | 'strength' | 'hiit' | 'yoga' | 'pilates' | 'running' | 'cycling' | 'walking' | 'swimming' | 'other';
  exercises: Exercise[];
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  totalCaloriesBurned: number;
  date: string;
  // Location tracking for running/walking/cycling
  locationTrack?: LocationPoint[];
  distance?: number; // in meters
  averageSpeed?: number; // m/s
  maxSpeed?: number; // m/s
}

// Community Types
export type RingsVisibility = 'public' | 'friends' | 'clan' | 'private';

export interface UserPrivacy {
  ringsVisibility: RingsVisibility;
  allowFriendRequests: boolean;
  allowClanInvites: boolean;
}

export interface UserStatsSummary {
  caloriesBurnedToday: number;
  stepsToday: number;
  workoutMinutesToday: number;
  ringsUpdatedAt: Date;
}

export interface FriendRequest {
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  friendUid: string;
  createdAt: Date;
  ringsShare: boolean;
}

export type ClanPrivacy = 'inviteOnly' | 'friendsOnly';

export type ClanRole = 'owner' | 'admin' | 'member';

export type ClanMemberStatus = 'active' | 'invited';

export interface Clan {
  id: string;
  name: string;
  description: string;
  photoURL: string;
  ownerUid: string;
  privacy: ClanPrivacy;
  createdAt: Date;
}

export interface ClanMember {
  uid: string;
  role: ClanRole;
  status: ClanMemberStatus;
  joinedAt: Date;
}

export interface ClanInvite {
  clanId: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export type NotificationType = 
  | 'FRIEND_REQUEST' 
  | 'FRIEND_ACCEPTED' 
  | 'FRIEND_REJECTED'
  | 'CLAN_INVITE'
  | 'CLAN_INVITE_ACCEPTED'
  | 'CLAN_INVITE_REJECTED'
  | 'CLAN_MEMBER_REMOVED';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    fromUid?: string;
    clanId?: string;
    friendRequestId?: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface RingStats {
  caloriesBurned: number;
  steps: number;
  workoutMinutes: number;
  goalCalories: number;
  goalSteps: number;
  goalMinutes: number;
  updatedAt: Date;
}

export interface BlockedUser {
  blockedUid: string;
  blockedAt: Date;
}
