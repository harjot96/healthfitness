import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useCommunity } from '../../../context/CommunityContext';
import { UserCard } from '../../../components/community/UserCard';
import { FitnessRings } from '../../../components/community/FitnessRings';
import * as userSearchService from '../../../services/community/userSearch';
import * as friendsService from '../../../services/community/friends';
import * as ringStatsService from '../../../services/community/ringStats';
import { format } from 'date-fns';

export default function UserProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { friends, sentRequests, receivedRequests, refreshFriends } = useCommunity();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [ringStats, setRingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (!uid) return;

      try {
        const info = await userSearchService.getUserById(uid);
        setUserInfo(info);

        if (info) {
          // Load ring stats for today
          const today = format(new Date(), 'yyyyMMdd');
          const stats = await ringStatsService.getRingStats(user?.uid || '', uid, today);
          setRingStats(stats);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid, user]);

  const getFriendStatus = (): 'none' | 'friend' | 'sent' | 'received' | 'self' => {
    if (uid === user?.uid) return 'self';
    if (friends.some(f => f.friendUid === uid)) return 'friend';
    if (sentRequests.some(r => r.toUid === uid)) return 'sent';
    if (receivedRequests.some(r => r.fromUid === uid)) return 'received';
    return 'none';
  };

  const handleAddFriend = async () => {
    if (!uid) return;
    try {
      await friendsService.sendFriendRequest(uid);
      await refreshFriends();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async () => {
    if (!uid) return;
    try {
      await friendsService.respondFriendRequest(uid, 'accept');
      await refreshFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async () => {
    if (!uid) return;
    try {
      await friendsService.respondFriendRequest(uid, 'reject');
      await refreshFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const friendStatus = getFriendStatus();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        {userInfo.photoURL ? (
          <Image source={{ uri: userInfo.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {userInfo.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{userInfo.displayName}</Text>
        {userInfo.email && <Text style={styles.email}>{userInfo.email}</Text>}
      </View>

      {friendStatus !== 'self' && (
        <View style={styles.actions}>
          <UserCard
            uid={uid}
            displayName={userInfo.displayName}
            photoURL={userInfo.photoURL}
            email={userInfo.email}
            friendStatus={friendStatus}
            onAddFriend={handleAddFriend}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        </View>
      )}

      {ringStats && friendStatus !== 'none' && (
        <View style={styles.ringsSection}>
          <Text style={styles.sectionTitle}>Today's Fitness Rings</Text>
          <FitnessRings stats={ringStats} />
        </View>
      )}

      {!ringStats && friendStatus !== 'none' && friendStatus !== 'self' && (
        <View style={styles.noStats}>
          <Text style={styles.noStatsText}>No fitness data available</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
  },
  actions: {
    padding: 16,
  },
  ringsSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  noStats: {
    padding: 24,
    alignItems: 'center',
  },
  noStatsText: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});

