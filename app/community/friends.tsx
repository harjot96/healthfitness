import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCommunity } from '../../context/CommunityContext';
import { UserCard } from '../../components/community/UserCard';
import * as userSearchService from '../../services/community/userSearch';
import { useState, useEffect } from 'react';

export default function FriendsScreen() {
  const router = useRouter();
  const { friends, loadingFriends } = useCommunity();
  const [friendsInfo, setFriendsInfo] = useState<any[]>([]);

  useEffect(() => {
    const loadFriendsInfo = async () => {
      const info = await Promise.all(
        friends.map(async (friend) => {
          const userInfo = await userSearchService.getUserById(friend.friendUid);
          return userInfo ? { ...friend, ...userInfo } : null;
        })
      );
      setFriendsInfo(info.filter(Boolean));
    };

    if (friends.length > 0) {
      loadFriendsInfo();
    } else {
      setFriendsInfo([]);
    }
  }, [friends]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>{friends.length} friends</Text>
      </View>

      <ScrollView style={styles.list}>
        {friendsInfo.map((friend) => (
          <UserCard
            key={friend.friendUid}
            uid={friend.friendUid}
            displayName={friend.displayName}
            photoURL={friend.photoURL}
            email={friend.email}
            friendStatus="friend"
            onPress={() => router.push(`/community/user-profile/${friend.friendUid}`)}
          />
        ))}

        {friends.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Search for users to add friends</Text>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  list: {
    flex: 1,
    padding: 16,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

