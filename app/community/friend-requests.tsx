import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useCommunity } from '../../context/CommunityContext';
import { FriendRequestCard } from '../../components/community/FriendRequestCard';
import * as friendsService from '../../services/community/friends';
import * as userSearchService from '../../services/community/userSearch';
import { useState, useEffect } from 'react';

export default function FriendRequestsScreen() {
  const { receivedRequests, sentRequests, refreshFriends } = useCommunity();
  const [receivedInfo, setReceivedInfo] = useState<any[]>([]);
  const [sentInfo, setSentInfo] = useState<any[]>([]);

  useEffect(() => {
    const loadReceivedInfo = async () => {
      const info = await Promise.all(
        receivedRequests.map(async (request) => {
          const userInfo = await userSearchService.getUserById(request.fromUid);
          return userInfo ? { request, userInfo } : null;
        })
      );
      setReceivedInfo(info.filter(Boolean));
    };

    const loadSentInfo = async () => {
      const info = await Promise.all(
        sentRequests.map(async (request) => {
          const userInfo = await userSearchService.getUserById(request.toUid);
          return userInfo ? { request, userInfo } : null;
        })
      );
      setSentInfo(info.filter(Boolean));
    };

    if (receivedRequests.length > 0) loadReceivedInfo();
    else setReceivedInfo([]);

    if (sentRequests.length > 0) loadSentInfo();
    else setSentInfo([]);
  }, [receivedRequests, sentRequests]);

  const handleAccept = async (fromUid: string) => {
    try {
      await friendsService.respondFriendRequest(fromUid, 'accept');
      await refreshFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleReject = async (fromUid: string) => {
    try {
      await friendsService.respondFriendRequest(fromUid, 'reject');
      await refreshFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleCancel = async (toUid: string) => {
    try {
      await friendsService.cancelFriendRequest(toUid);
      await refreshFriends();
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests</Text>
      </View>

      <ScrollView style={styles.list}>
        {receivedInfo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Received ({receivedInfo.length})</Text>
            {receivedInfo.map((item) => (
              <FriendRequestCard
                key={`${item.request.fromUid}_to_${item.request.toUid}`}
                request={item.request}
                userInfo={item.userInfo}
                isReceived={true}
                onAccept={() => handleAccept(item.request.fromUid)}
                onReject={() => handleReject(item.request.fromUid)}
              />
            ))}
          </View>
        )}

        {sentInfo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent ({sentInfo.length})</Text>
            {sentInfo.map((item) => (
              <FriendRequestCard
                key={`${item.request.fromUid}_to_${item.request.toUid}`}
                request={item.request}
                userInfo={item.userInfo}
                isReceived={false}
                onCancel={() => handleCancel(item.request.toUid)}
              />
            ))}
          </View>
        )}

        {receivedInfo.length === 0 && sentInfo.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No friend requests</Text>
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
  },
  list: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  },
});

