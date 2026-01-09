import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunity } from '../../context/CommunityContext';
import { useAuth } from '../../context/AuthContext';
import { ClanCard } from '../../components/community/ClanCard';
import { FriendRequestCard } from '../../components/community/FriendRequestCard';
import { NotificationItem } from '../../components/community/NotificationItem';

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    friends,
    receivedRequests,
    clans,
    clanInvites,
    notifications,
    unreadCount,
  } = useCommunity();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity
          onPress={() => router.push('/community/notifications')}
          style={styles.notificationButton}
        >
          <Ionicons name="notifications" size={24} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/community/friends')}
        >
          <Text style={styles.statNumber}>{friends.length}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/community/clans')}
        >
          <Text style={styles.statNumber}>{clans.length}</Text>
          <Text style={styles.statLabel}>Clans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/community/friend-requests')}
        >
          <Text style={styles.statNumber}>{receivedRequests.length}</Text>
          <Text style={styles.statLabel}>Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Friend Requests */}
      {receivedRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            <TouchableOpacity onPress={() => router.push('/community/friend-requests')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {receivedRequests.slice(0, 3).map((request) => (
            <FriendRequestCard
              key={`${request.fromUid}_to_${request.toUid}`}
              request={request}
              isReceived={true}
            />
          ))}
        </View>
      )}

      {/* Clans */}
      {clans.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Clans</Text>
            <TouchableOpacity onPress={() => router.push('/community/clans')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {clans.slice(0, 3).map((clan) => (
            <ClanCard
              key={clan.id}
              clan={clan}
              onPress={() => router.push(`/community/clan/${clan.id}`)}
            />
          ))}
        </View>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <TouchableOpacity onPress={() => router.push('/community/notifications')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {notifications.slice(0, 5).map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onPress={() => router.push('/community/notifications')}
            />
          ))}
        </View>
      )}

      {/* Browse All Users */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/community/all-users')}
        >
          <Ionicons name="people" size={24} color="#4CAF50" />
          <View style={styles.browseButtonContent}>
            <Text style={styles.browseButtonTitle}>Browse All Users</Text>
            <Text style={styles.browseButtonSubtitle}>Discover and connect with users</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {friends.length === 0 && clans.length === 0 && receivedRequests.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No community activity yet</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => router.push('/community/search')}
          >
            <Text style={styles.searchButtonText}>Search for Friends</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  browseButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  browseButtonSubtitle: {
    fontSize: 14,
    color: '#999',
  },
});

