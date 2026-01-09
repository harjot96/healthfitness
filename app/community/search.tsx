import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as userSearchService from '../../services/community/userSearch';
import { UserCard } from '../../components/community/UserCard';
import { useCommunity } from '../../context/CommunityContext';
import { useAuth } from '../../context/AuthContext';
import * as friendsService from '../../services/community/friends';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { friends, sentRequests, receivedRequests, refreshFriends } = useCommunity();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'email'>('username');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults =
        searchType === 'username'
          ? await userSearchService.searchUsersByUsername(searchQuery)
          : await userSearchService.searchUsersByEmail(searchQuery);
      setResults(searchResults.filter(u => u.uid !== user?.uid));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFriendStatus = (uid: string): 'none' | 'friend' | 'sent' | 'received' | 'self' => {
    if (uid === user?.uid) return 'self';
    if (friends.some(f => f.friendUid === uid)) return 'friend';
    if (sentRequests.some(r => r.toUid === uid)) return 'sent';
    if (receivedRequests.some(r => r.fromUid === uid)) return 'received';
    return 'none';
  };

  const handleAddFriend = async (toUid: string) => {
    try {
      await friendsService.sendFriendRequest(toUid);
      await refreshFriends();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (fromUid: string) => {
    try {
      await friendsService.respondFriendRequest(fromUid, 'accept');
      await refreshFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (fromUid: string) => {
    try {
      await friendsService.respondFriendRequest(fromUid, 'reject');
      await refreshFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Users</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder={`Search by ${searchType}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggle, searchType === 'username' && styles.toggleActive]}
            onPress={() => setSearchType('username')}
          >
            <Text style={[styles.toggleText, searchType === 'username' && styles.toggleTextActive]}>
              Username
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, searchType === 'email' && styles.toggleActive]}
            onPress={() => setSearchType('email')}
          >
            <Text style={[styles.toggleText, searchType === 'email' && styles.toggleTextActive]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <ScrollView style={styles.results}>
          {results.map((userResult) => {
            const friendStatus = getFriendStatus(userResult.uid);
            return (
              <UserCard
                key={userResult.uid}
                uid={userResult.uid}
                displayName={userResult.displayName}
                photoURL={userResult.photoURL}
                email={userResult.email}
                friendStatus={friendStatus}
                onPress={() => router.push(`/community/user-profile/${userResult.uid}`)}
                onAddFriend={() => handleAddFriend(userResult.uid)}
                onAcceptRequest={() => handleAcceptRequest(userResult.uid)}
                onRejectRequest={() => handleRejectRequest(userResult.uid)}
              />
            );
          })}
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  results: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

