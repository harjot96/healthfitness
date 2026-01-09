import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { UserCard } from '../../components/community/UserCard';
import {
  getAllUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  UserWithStatus,
} from '../../services/community/friends';
import { searchAllUsers } from '../../services/community/userSearch';

export default function AllUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadUsers = useCallback(async (refresh = false, searchTerm?: string) => {
    if (!user) return;

    try {
      if (refresh) {
        setRefreshing(true);
        setLastDoc(null);
        setUsers([]);
      } else {
        setLoading(true);
      }

      // If searching, use cloud function; otherwise use getAllUsers (has friend status)
      if (searchTerm || searchQuery) {
        try {
          const cloudResult = await searchAllUsers(
            searchTerm || searchQuery,
            50,
            refresh ? undefined : lastDoc?.id
          );

          // Convert to UserWithStatus format (friend status will be checked separately)
          const usersWithStatus: UserWithStatus[] = cloudResult.users.map(u => ({
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            usernameLower: u.usernameLower,
            isFriend: false,
            friendRequestStatus: 'none' as const,
          }));

          if (refresh) {
            setUsers(usersWithStatus);
          } else {
            setUsers(prev => [...prev, ...usersWithStatus]);
          }

          setLastDoc(cloudResult.lastDocId ? { id: cloudResult.lastDocId } : null);
          setHasMore(cloudResult.hasMore);
        } catch (cloudError) {
          console.warn('[AllUsers] Cloud function failed:', cloudError);
          // Fallback to getAllUsers
          const result = await getAllUsers(user.uid, 50, refresh ? null : lastDoc);
          
          if (refresh) {
            setUsers(result.users);
          } else {
            setUsers(prev => [...prev, ...result.users]);
          }

          setLastDoc(result.lastDoc);
          setHasMore(result.users.length === 50);
        }
      } else {
        // Use getAllUsers for full list with friend status
        const result = await getAllUsers(user.uid, 50, refresh ? null : lastDoc);
        
        if (refresh) {
          setUsers(result.users);
        } else {
          setUsers(prev => [...prev, ...result.users]);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.users.length === 50);
      }
    } catch (error) {
      console.error('[AllUsers] Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, lastDoc, searchQuery]);

  useEffect(() => {
    loadUsers(true);
  }, [user]);

  // Reload when search query changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        loadUsers(true, searchQuery);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleAddFriend = async (targetUid: string) => {
    if (!user) return;

    try {
      await sendFriendRequest(user.uid, targetUid);
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === targetUid
            ? {
                ...u,
                friendRequestStatus: 'pending',
                friendRequestId: `${user.uid}_${targetUid}`,
              }
            : u
        )
      );
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      console.error('[AllUsers] Error sending friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (fromUid: string, toUid: string) => {
    if (!user) return;

    try {
      await acceptFriendRequest(fromUid, toUid);
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === fromUid
            ? {
                ...u,
                isFriend: true,
                friendRequestStatus: 'accepted',
              }
            : u
        )
      );
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      console.error('[AllUsers] Error accepting friend request:', error);
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (fromUid: string, toUid: string) => {
    if (!user) return;

    try {
      await rejectFriendRequest(fromUid, toUid);
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === fromUid
            ? {
                ...u,
                friendRequestStatus: 'none',
                friendRequestId: undefined,
              }
            : u
        )
      );
    } catch (error: any) {
      console.error('[AllUsers] Error rejecting friend request:', error);
      Alert.alert('Error', error.message || 'Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (fromUid: string, toUid: string) => {
    if (!user) return;

    try {
      await cancelFriendRequest(fromUid, toUid);
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === toUid
            ? {
                ...u,
                friendRequestStatus: 'none',
                friendRequestId: undefined,
              }
            : u
        )
      );
    } catch (error: any) {
      console.error('[AllUsers] Error canceling friend request:', error);
      Alert.alert('Error', error.message || 'Failed to cancel friend request');
    }
  };

  const getFriendStatus = (userWithStatus: UserWithStatus): 'none' | 'friend' | 'sent' | 'received' | 'self' => {
    if (!user || userWithStatus.uid === user.uid) return 'self';
    if (userWithStatus.isFriend) return 'friend';
    if (userWithStatus.friendRequestStatus === 'pending') {
      // Check if we sent it or received it
      if (userWithStatus.friendRequestId?.startsWith(user.uid)) {
        return 'sent';
      }
      return 'received';
    }
    return 'none';
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.usernameLower?.toLowerCase().includes(query)
    );
  });

  const loadMore = () => {
    if (!loading && hasMore && !refreshing) {
      loadUsers(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>All Users</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />
          }
          onScrollEndDrag={loadMore}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found' : 'No users available'}
              </Text>
              {searchQuery && (
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              )}
            </View>
          ) : (
            <>
              {filteredUsers.map((userItem) => {
                const status = getFriendStatus(userItem);
                return (
                  <UserCard
                    key={userItem.uid}
                    uid={userItem.uid}
                    displayName={userItem.displayName}
                    photoURL={userItem.photoURL}
                    email={userItem.email}
                    friendStatus={status}
                    onPress={() => router.push(`/community/user-profile/${userItem.uid}`)}
                    onAddFriend={() => handleAddFriend(userItem.uid)}
                    onAcceptRequest={() =>
                      handleAcceptRequest(userItem.uid, user?.uid || '')
                    }
                    onRejectRequest={() =>
                      handleRejectRequest(userItem.uid, user?.uid || '')
                    }
                  />
                );
              })}
              {loading && users.length > 0 && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

